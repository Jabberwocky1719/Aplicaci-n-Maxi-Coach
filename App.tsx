import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { localUsers, themes, themeVoiceProfiles, agentKnowledgeBase, leadKnowledgeBase, legalFrameworkResponse } from './constants';
import { User, Theme, VoiceProfile, ChatMessage, MessagePayload, KnowledgeBase, KnowledgeBaseEntry, DirectMessagePayload, FallbackPayload, InteractiveSurveyPayload, InteractiveKnowledgeBaseEntry, AgentKnowledgeBaseFallback, LeadKnowledgeBaseFallback } from './types';

// Import all React components
import Header from './components/Header';
import CreditInfoCard from './components/CreditInfoCard';
import FaqCard from './components/FaqCard';
import ChatWindow from './components/ChatWindow';
import MessageBubble from './components/MessageBubble';
import ChatInput from './components/ChatInput';
import { GuideModal, PillarsModal, GeneratePlanModal } from './components/Modals';
import Login from './components/Login'; // Import the new Login component


// Utility functions for audio decoding
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null); // NEW: State to hold the logged-in user
  const [currentTheme, setCurrentTheme] = useState<keyof typeof themes>('basico');
  const [currentView, setCurrentView] = useState<'agent' | 'lead'>('agent'); // 'agent' for Maxi-Coach, 'lead' for Falcon
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  // State for Agent View dynamic selections
  const [currentDictamen, setCurrentDictamen] = useState<string>('Promesa de pago');
  const [currentGestionType, setCurrentGestionType] = useState<string>('Telefónica');
  const [currentMoraBucket, setCurrentMoraBucket] = useState<string>('1 a 15');
  const [agentFallbackIndex, setAgentFallbackIndex] = useState<number>(0);
  const [lastFaqTopic, setLastFaqTopic] = useState<string | null>(null);

  // Modals state
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isPillarsModalOpen, setIsPillarsModalOpen] = useState<boolean>(false);
  const [isGeneratePlanModalOpen, setIsGeneratePlanModalOpen] = useState<boolean>(false);

  // Gemini TTS specific Audio Context and sources
  const audioOutputContextRef = useRef<AudioContext | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isPlayingAudioRef: React.MutableRefObject<boolean> = useRef<boolean>(false);


  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Effect to apply theme to body
  useEffect(() => {
    document.body.dataset.theme = currentTheme;
    localStorage.setItem('maxiCoachTheme', currentTheme);
  }, [currentTheme]);

  // --- Chat & Response Logic ---
  const addMessage = useCallback((payload: MessagePayload, sender: 'user' | 'assistant') => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      payload,
    };
    setChatMessages((prevMessages) => [...prevMessages, newMessage]);
  }, []);

  // Effect to load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('maxiCoachTheme');
    if (savedTheme && themes[savedTheme as keyof typeof themes]) {
        setCurrentTheme(savedTheme as keyof typeof themes);
    }
  }, []); // Empty dependency array means this runs once on mount


  // Initial message when user logs in or switches view
  useEffect(() => {
    if (currentUser) {
      setChatMessages([]); // Clear chat history on login or view switch
      setLastFaqTopic(null);
      setAgentFallbackIndex(0);
      setCurrentDictamen('Promesa de pago');
      setCurrentGestionType('Telefónica');
      setCurrentMoraBucket('1 a 15');
      if (currentView === 'agent') {
        addMessage({ type: 'direct', data: agentKnowledgeBase.initial }, 'assistant');
      } else {
        addMessage({ type: 'direct', data: leadKnowledgeBase.initial }, 'assistant');
      }
    }
  }, [currentUser, currentView, addMessage]); // Depend on currentUser and currentView


  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);


  // --- Audio Utility Functions ---
  const stopAllAudio = useCallback(() => {
    if (isPlayingAudioRef.current) {
        speechSynthesis.cancel(); // Stop browser speech synthesis (though not used now, good practice)
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
        isPlayingAudioRef.current = false;
        // Reset all play buttons in UI
        document.querySelectorAll('.audio-play-btn.playing').forEach(btn => {
            btn.classList.remove('playing');
            btn.innerHTML = '<i class="fas fa-play-circle"></i>';
            btn.setAttribute('aria-label', 'Leer en voz alta');
        });
    }
  }, []);

  const playGeminiAudio = useCallback(async (textToSpeak: string, currentTheme: keyof typeof themes, buttonElement: HTMLElement) => {
    // Stop any audio if a new one is requested to play
    if (isPlayingAudioRef.current) {
        stopAllAudio();
        // If the same button was clicked to stop, then return
        if (buttonElement.classList.contains('playing')) {
            return;
        }
    }
    
    buttonElement.classList.add('playing');
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Show loading spinner
    buttonElement.setAttribute('aria-label', 'Generando audio...');
    isPlayingAudioRef.current = true;

    try {
        // Always create a new GoogleGenAI instance right before an API call to ensure it uses the most up-to-date API key.
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' }); // Ensure API key is present
        const voiceProfile = themeVoiceProfiles[currentTheme];
        const voiceName = voiceProfile?.voiceName || 'Zephyr';

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: textToSpeak }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            if (!audioOutputContextRef.current) {
                audioOutputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                audioOutputContextRef.current,
                24000,
                1,
            );
            const source = audioOutputContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioOutputContextRef.current.destination);
            source.addEventListener('ended', () => {
                buttonElement.classList.remove('playing');
                buttonElement.innerHTML = '<i class="fas fa-play-circle"></i>';
                buttonElement.setAttribute('aria-label', 'Leer en voz alta');
                audioSourcesRef.current.delete(source);
                if (audioSourcesRef.current.size === 0) {
                    isPlayingAudioRef.current = false;
                }
            });
            source.start(audioOutputContextRef.current.currentTime);
            audioSourcesRef.current.add(source);

            buttonElement.innerHTML = '<i class="fas fa-stop-circle"></i>'; // Change to stop icon after starting playback
            buttonElement.setAttribute('aria-label', 'Detener lectura');
        } else {
            console.error("No audio data received from Gemini TTS.");
            buttonElement.classList.remove('playing');
            buttonElement.innerHTML = '<i class="fas fa-play-circle"></i>';
            buttonElement.setAttribute('aria-label', 'Leer en voz alta');
            isPlayingAudioRef.current = false;
        }

    } catch (error) {
        console.error("Error generating or playing audio from Gemini:", error);
        buttonElement.classList.remove('playing');
        buttonElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error'; // Indicate error
        buttonElement.setAttribute('aria-label', 'Error al generar audio');
        isPlayingAudioRef.current = false;
        setTimeout(() => { // Revert icon after a short delay
            buttonElement.innerHTML = '<i class="fas fa-play-circle"></i>';
            buttonElement.setAttribute('aria-label', 'Leer en voz alta');
        }, 2000);
    }
  }, [stopAllAudio]);


  // --- App Reset Handler (now functions as clear chat / reset app state) ---
  const handleResetApp = useCallback(() => {
    setChatMessages([]);
    setLastFaqTopic(null); // Reset chat context
    setAgentFallbackIndex(0); // Reset fallback index
    setCurrentDictamen('Promesa de pago'); // Reset agent view selectors
    setCurrentGestionType('Telefónica');
    setCurrentMoraBucket('1 a 15'); // Reset agent view selectors to default
    // Do NOT add initial message here, it's handled by useEffect on currentUser/currentView
    stopAllAudio(); // Stop any active audio playback
    if (audioOutputContextRef.current) {
        audioOutputContextRef.current.close().then(() => {
            audioOutputContextRef.current = null;
        });
    }
    setCurrentUser(null); // NEW: Log out the user
  }, [stopAllAudio]);


  const extractTextForSpeech = useCallback((payload: MessagePayload): string => {
    if (typeof payload === 'string') {
        return payload;
    }
    // Handle DirectMessagePayload type
    if (payload.type === 'direct' && typeof payload.data === 'string') {
        return payload.data;
    }
    if (payload.type === 'direct' && typeof payload.data === 'object' && payload.data.summary) {
      let text = '';
      if (payload.data.expertNote) { // Include expert note if present
        text += `${payload.data.expertNote.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()}. `;
      }
      text += payload.data.summary;
      if (payload.data.objetivoClave) {
        text += `. Objetivo Clave: ${payload.data.objetivoClave}`;
      }
      if (payload.data.detail?.strategy) {
        text += `. Estrategia Detallada: ${payload.data.detail.strategy}`;
      }
      if (payload.data.detail?.phrases) {
        text += `. Frases a utilizar: ${payload.data.detail.phrases.replace(/<br>/g, '. ')}`;
      }
      if (payload.data.detail?.leaderPlan) {
        text += `. Plan de Monitoreo: ${payload.data.detail.leaderPlan.replace(/<br>/g, '. ').replace(/<ul>/g, '. ').replace(/<li>/g, '').replace(/<\/li>/g, '').replace(/<\/ul>/g, '')}`;
      }
      // Clean HTML tags and excessive whitespace
      return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
    // Handle InteractiveSurveyPayload type
    if (payload.type === 'interactiveSurvey' && payload.data?.question) {
        let text = payload.data.question;
        // If there are options, include them in the speech text
        if (payload.data.options && payload.data.options.length > 0) {
            text += " Las opciones son: " + payload.data.options.map(opt => opt.text).join(", ");
        }
        return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
    // Handle FallbackPayload type
    if (payload.type === 'fallback' && payload.data?.summary) {
        return payload.data.summary.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
    return ''; // Default fallback
  }, []);


  const enhanceResponseWithMoraSeverity = useCallback((payload: KnowledgeBaseEntry): KnowledgeBaseEntry => {
    let enhancedPayload = JSON.parse(JSON.stringify(payload));
    // Check if summary exists before trying to enhance
    if (!enhancedPayload.summary) return enhancedPayload;

    let severityNote = '';
    let objectivePrefix = '';

    // Determine the expert note based on mora bucket and specific strategies
    switch (currentMoraBucket) {
        case '1 a 15':
            severityNote = `<p><i class="fas fa-user-circle"></i> <b>Nota del Experto (Mora 1-15 días):</b> Cliente de riesgo bajo a medio. Enfócate en <b>garantizar contacto, escuchar objeciones y convencer al deudor</b>. La estrategia es preventiva y cordial, buscando reactivar el compromiso.</p>`;
            objectivePrefix = `PREVENCIÓN Y CONTACTO. `;
            break;
        case '15 a 30':
            severityNote = `<p><i class="fas fa-exclamation-circle"></i> <b>Nota del Experto (Mora 15-30 días):</b> Cliente de riesgo medio a alto. Aplica <b>presión efectiva, recordatorios de consecuencias y, si es necesario, inicia skip tracing</b> si no hay contacto. La estrategia es firme pero busca el acuerdo.</p>`;
            objectivePrefix = `PRESIÓN Y SKIP TRACING. `;
            break;
        case '30+':
            severityNote = `<p><i class="fas fa-exclamation-triangle"></i> <b>Nota del Experto (Mora 30+ días):</b> Cliente de riesgo máximo. Las estrategias deben ser <b>intensas y enfocadas en la recuperación del activo</b>. Utiliza todas las palancas de presión y prepara la escalada a jurídico.</p>`;
            objectivePrefix = `RECUPERACIÓN INTENSA. `;
            break;
        default:
            severityNote = '';
            objectivePrefix = '';
            break;
    }

    // Assign the expert note to its dedicated property
    enhancedPayload.expertNote = severityNote;

    // Adjust objective based on mora severity
    if (enhancedPayload.objetivoClave) {
        enhancedPayload.objetivoClave = objectivePrefix + enhancedPayload.objetivoClave;
    }

    // NEW LOGIC: Apply mora-specific strategy and phrases if available for this FAQ
    if (enhancedPayload.moraSpecificDetail && enhancedPayload.moraSpecificDetail[currentMoraBucket]) {
        const specificDetail = enhancedPayload.moraSpecificDetail[currentMoraBucket];
        enhancedPayload.detail = { // Overwrite or create detail with mora-specific content
            ...enhancedPayload.detail, // Keep other generic detail properties if any
            strategy: specificDetail.strategy,
            phrases: specificDetail.phrases,
        };
    } else if (enhancedPayload.moraSpecificDetail) {
        // If there's moraSpecificDetail but no match for currentMoraBucket,
        // it means it's a non-default mora or an unhandled case, fall back to generic detail
        // For now, it will use the existing `detail` if `moraSpecificDetail` doesn't have a match
    }

    return enhancedPayload;
  }, [currentMoraBucket]);


  // Main function to handle sending messages and getting responses
  const sendMessage = useCallback(async (text: string, isSuggestion: boolean = false) => {
    if (!text.trim()) return;

    // Remove any previous audio prompts
    stopAllAudio();
    
    // Add user message to chat
    addMessage(text, 'user');
    setIsTyping(true); // Set typing indicator to true

    // Add a delay to simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay

    let responsePayload: MessagePayload = '';

    // AGENT VIEW LOGIC (Maxi-Coach)
    if (currentView === 'agent') {
      const kb = agentKnowledgeBase;
      const agentFallback = kb.fallback as AgentKnowledgeBaseFallback;
      const cleanText = text.toLowerCase().trim();

      // Handle specific interactive survey triggers
      if (lastFaqTopic === "¿Qué hago si el cliente chocó o le robaron la moto?") {
        const interactiveFaqEntry = kb.faqs[lastFaqTopic] as InteractiveKnowledgeBaseEntry; // Cast to ensure data is present
        if (cleanText.includes('sí') || cleanText.includes('seguro')) {
          responsePayload = { type: 'direct', data: enhanceResponseWithMoraSeverity(kb.faqs["chocó-con-seguro"]) };
          setLastFaqTopic(null); // Reset after handling sub-question
        } else if (cleanText.includes('no') || cleanText.includes('sin seguro')) {
          responsePayload = { type: 'direct', data: enhanceResponseWithMoraSeverity(kb.faqs["chocó-sin-seguro"]) };
          setLastFaqTopic(null); // Reset after handling sub-question
        } else {
          // If response is not a clear yes/no for the survey
          responsePayload = {
            type: 'interactiveSurvey', // Ensure correct type for re-prompting survey
            data: {
              question: interactiveFaqEntry.data.question, // Re-use the original survey question
              options: interactiveFaqEntry.data.options,
            }
          };
          addMessage({
            type: 'fallback',
            data: {
              summary: "Por favor, responde con 'Sí, tiene seguro' o 'No, no tiene seguro' para que pueda darte la mejor guía.",
            }
          }, 'assistant');
        }
      } else {
        // --- Scoring-based FAQ matching for Agent View ---
        let bestMatch: KnowledgeBaseEntry | undefined;
        let bestScore = 0;
        let bestMatchQuestion: string | undefined;

        for (const faqQuestion in kb.faqs) {
            const entry = kb.faqs[faqQuestion];
            // Only consider top-level FAQs for keyword matching, not sub-questions
            if (faqQuestion.includes('-')) continue;

            const keywords = entry.keywords || [];
            let currentScore = 0;

            // Score based on keyword matches
            keywords.forEach(keyword => {
                if (cleanText.includes(keyword.toLowerCase())) {
                    currentScore++;
                }
            });

            // Boost score if dictamen matches currentDictamen
            if (entry.dictamen && (currentDictamen === 'Todos' || entry.dictamen.includes(currentDictamen))) {
                currentScore += 0.5; // A small boost for dictamen relevance
            }

            // If a direct question match, give a high boost
            if (faqQuestion.toLowerCase() === cleanText) {
                currentScore += 10; // High boost for exact match
            }

            if (currentScore > bestScore) {
                bestScore = currentScore;
                bestMatch = entry;
                bestMatchQuestion = faqQuestion;
            }
        }
        
        if (bestMatch && bestScore > 0) { // Only use if a significant score is achieved
            if (bestMatch.type === 'interactiveSurvey') {
                responsePayload = { type: 'interactiveSurvey', data: (bestMatch as InteractiveKnowledgeBaseEntry).data };
                setLastFaqTopic(bestMatchQuestion || null); // Set context for interactive survey
            } else {
                responsePayload = { type: 'direct', data: enhanceResponseWithMoraSeverity(bestMatch) };
                setLastFaqTopic(null); // Clear context for direct answers
            }
        } else if (cleanText.includes('marco legal') || cleanText.includes('regulatorio')) {
          responsePayload = { type: 'direct', data: legalFrameworkResponse.maxiCoachGuide }; // Use specific guide
        }
        else {
            // General fallback for agent view if no good match
            const fallbackOption = agentFallback.generalOffTopic?.[agentFallbackIndex];
            responsePayload = {
                type: 'fallback',
                data: {
                    summary: fallbackOption || "No tengo una guía específica para eso, pero puedo ayudarte con estrategias de cobranza. ¿Hay algo más en lo que pueda asistirte?",
                }
            };
            setAgentFallbackIndex((prevIndex) => (prevIndex + 1) % (agentFallback.generalOffTopic?.length || 1));
            setLastFaqTopic(null);
        }
      }
    }
    // LEAD VIEW LOGIC (Falcon)
    else if (currentView === 'lead') {
      const kb = leadKnowledgeBase;
      const leadFallback = kb.fallback as LeadKnowledgeBaseFallback;
      const cleanText = text.toLowerCase().trim();

      // --- Scoring-based FAQ matching for Lead View ---
      let bestMatch: KnowledgeBaseEntry | undefined;
      let bestScore = 0;

      for (const faqQuestion in kb.faqs) {
          const entry = kb.faqs[faqQuestion];
          const keywords = entry.keywords || [];
          let currentScore = 0;

          // Score based on keyword matches
          keywords.forEach(keyword => {
              if (cleanText.includes(keyword.toLowerCase())) {
                  currentScore++;
              }
          });

          // If a direct question match, give a high boost
          if (faqQuestion.toLowerCase() === cleanText) {
              currentScore += 10; // High boost for exact match
          }

          if (currentScore > bestScore) {
              bestScore = currentScore;
              bestMatch = entry;
          }
      }

      if (bestMatch && bestScore > 0) { // Only use if a significant score is achieved
        responsePayload = { type: 'direct', data: bestMatch };
      } else if (cleanText.includes('marco legal') || cleanText.includes('regulatorio') || cleanText.includes('guía de uso')) {
        responsePayload = { type: 'direct', data: legalFrameworkResponse.falconGuide }; // Use specific guide
      } else {
        responsePayload = {
          type: 'fallback',
          data: {
            summary: leadFallback.summary,
            detail: leadFallback.detail,
          },
        };
      }
    }

    addMessage(responsePayload, 'assistant');
    setIsTyping(false); // Set typing indicator to false after response
  }, [addMessage, currentView, lastFaqTopic, enhanceResponseWithMoraSeverity, agentFallbackIndex, stopAllAudio, currentDictamen, currentMoraBucket]);


  const handleSuggestFaq = useCallback((faqQuestion: string, viewType: 'agent' | 'lead') => {
    // This directly calls sendMessage with the FAQ question
    sendMessage(faqQuestion, true);
  }, [sendMessage]);

  if (!currentUser) {
    return <Login onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="app-container">
      <Header
        currentUser={currentUser} // Pass the actual logged-in user
        currentView={currentView}
        setCurrentView={(view) => {
            setCurrentView(view);
            // Initial message is handled by useEffect on currentUser/currentView
        }}
        handleLogout={handleResetApp} // Use handleResetApp for "clear chat" and logout
        currentTheme={currentTheme}
        setCurrentTheme={setCurrentTheme}
        setIsGuideModalOpen={setIsGuideModalOpen}
        setIsPillarsModalOpen={setIsPillarsModalOpen}
        setIsGeneratePlanModalOpen={setIsGeneratePlanModalOpen}
      />
      {/* top-panel-wrapper is now a direct child of app-container */}
      <div className={`top-panel-wrapper ${currentView === 'lead' ? 'lead-view-layout' : ''}`}>
        {currentView === 'agent' && (
          <CreditInfoCard
            currentDictamen={currentDictamen}
            setCurrentDictamen={setCurrentDictamen}
            currentGestionType={currentGestionType}
            setCurrentGestionType={setCurrentGestionType}
            currentMoraBucket={currentMoraBucket}
            setCurrentMoraBucket={setCurrentMoraBucket}
          />
        )}
        <FaqCard
          faqs={currentView === 'agent' ? agentKnowledgeBase.faqs : leadKnowledgeBase.faqs}
          onSuggest={handleSuggestFaq}
          currentDictamen={currentDictamen}
          viewType={currentView}
        />
      </div>
      {/* ChatWindow is now a direct child of app-container */}
      <ChatWindow
        messages={chatMessages}
        chatWindowRef={chatWindowRef}
        isTyping={isTyping}
        extractTextForSpeech={extractTextForSpeech}
        playGeminiAudio={playGeminiAudio}
        currentTheme={currentTheme}
      />
      <ChatInput onSendMessage={sendMessage} isTyping={isTyping} />

      {/* Modals */}
      <GuideModal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} currentView={currentView} />
      <PillarsModal isOpen={isPillarsModalOpen} onClose={() => setIsPillarsModalOpen(false)} />
      <GeneratePlanModal isOpen={isGeneratePlanModalOpen} onClose={() => setIsGeneratePlanModalOpen(false)} sendMessageToChat={sendMessage} />
    </div>
  );
}

export default App;