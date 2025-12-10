
// Add default export for the MessageBubble component.
import React, { useRef, useState } from 'react';
import { ChatMessage, KnowledgeBaseEntry, MessagePayload, Theme } from '../types';
import { themes } from '../constants'; // Import themes for type

interface MessageBubbleProps {
  message: ChatMessage;
  extractTextForSpeech: (payload: MessagePayload) => string;
  playGeminiAudio: (text: string, currentTheme: keyof typeof themes, buttonElement: HTMLElement) => Promise<void>;
  currentTheme: keyof typeof themes;
}

// Fix: Explicitly define MessageBubble as a React Functional Component (React.FC)
// This helps TypeScript correctly infer its JSX element type, resolving the error
// where the `key` prop (a special React prop) was incorrectly validated against MessageBubbleProps.
const MessageBubble: React.FC<MessageBubbleProps> = ({ message, extractTextForSpeech, playGeminiAudio, currentTheme }) => {
  const audioButtonRef = useRef<HTMLButtonElement>(null);
  const [isStrategyExpanded, setIsStrategyExpanded] = useState(false);
  const [isPhrasesExpanded, setIsPhrasesExpanded] = useState(false);
  const [isLeaderPlanExpanded, setIsLeaderPlanExpanded] = useState(false);
  const [isExpertNoteExpanded, setIsExpertNoteExpanded] = useState(false); // NEW: State for Expert Note expansion

  const renderPayload = (payload: MessagePayload) => {
    if (typeof payload === 'string') {
      return <div className="summary-section" dangerouslySetInnerHTML={{ __html: payload }}></div>;
    }

    switch (payload.type) {
      case 'direct':
        const data = payload.data as KnowledgeBaseEntry | string;
        if (typeof data === 'string') {
          return <div className="summary-section" dangerouslySetInnerHTML={{ __html: data }}></div>;
        } else {
          return (
            <>
              {data.summary && <div className="summary-section" dangerouslySetInnerHTML={{ __html: data.summary }}></div>}
              {data.objetivoClave && (
                <div className="key-objective">
                  <i className="fas fa-bullseye"></i> <strong>Objetivo Clave:</strong> {data.objetivoClave}
                </div>
              )}
              {/* NEW: Expert Note section - moved AFTER Objetivo Clave */}
              {data.expertNote && (
                <div className="strategy-content expert-note-section">
                  <div className="strategy-header">
                    <h4 className="strategy-title"><i className="fas fa-flask"></i> Nota del Experto:</h4>
                    <button
                      className="strategy-toggle"
                      onClick={() => setIsExpertNoteExpanded(!isExpertNoteExpanded)}
                      aria-expanded={isExpertNoteExpanded}
                    >
                      <i className={`fas fa-${isExpertNoteExpanded ? 'minus' : 'plus'}`}></i>
                    </button>
                  </div>
                  <div className={`strategy-body ${isExpertNoteExpanded ? 'expanded' : ''}`}>
                    <div dangerouslySetInnerHTML={{ __html: data.expertNote }}></div>
                  </div>
                </div>
              )}
              {data.detail && (
                <div className="detail-section">
                  {data.detail.strategy && (
                    <div className="strategy-content">
                      <div className="strategy-header">
                        <h4 className="strategy-title"><i className="fas fa-lightbulb"></i> Estrategia:</h4>
                        <button
                          className="strategy-toggle"
                          onClick={() => setIsStrategyExpanded(!isStrategyExpanded)}
                          aria-expanded={isStrategyExpanded}
                        >
                          <i className={`fas fa-${isStrategyExpanded ? 'minus' : 'plus'}`}></i>
                        </button>
                      </div>
                      <div className={`strategy-body ${isStrategyExpanded ? 'expanded' : ''}`}>
                        <p dangerouslySetInnerHTML={{ __html: data.detail.strategy }}></p>
                      </div>
                    </div>
                  )}
                  {data.detail.phrases && (
                    <div className="strategy-content">
                      <div className="strategy-header">
                        <h4 className="strategy-title"><i className="fas fa-comments"></i> Frases Clave:</h4>
                        <button
                          className="strategy-toggle"
                          onClick={() => setIsPhrasesExpanded(!isPhrasesExpanded)}
                          aria-expanded={isPhrasesExpanded}
                        >
                          <i className={`fas fa-${isPhrasesExpanded ? 'minus' : 'plus'}`}></i>
                        </button>
                      </div>
                      <div className={`strategy-body ${isPhrasesExpanded ? 'expanded' : ''}`}>
                        <p dangerouslySetInnerHTML={{ __html: data.detail.phrases }}></p>
                      </div>
                    </div>
                  )}
                  {data.detail.leaderPlan && (
                    <div className="strategy-content">
                      <div className="strategy-header">
                        <h4 className="strategy-title"><i className="fas fa-clipboard-list"></i> Plan de Monitoreo:</h4>
                        <button
                          className="strategy-toggle"
                          onClick={() => setIsLeaderPlanExpanded(!isLeaderPlanExpanded)}
                          aria-expanded={isLeaderPlanExpanded}
                        >
                          <i className={`fas fa-${isLeaderPlanExpanded ? 'minus' : 'plus'}`}></i>
                        </button>
                      </div>
                      <div className={`strategy-body ${isLeaderPlanExpanded ? 'expanded' : ''}`}>
                        <div dangerouslySetInnerHTML={{ __html: data.detail.leaderPlan }}></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          );
        }
      case 'suggestions':
        return (
          <div className="suggestions-payload">
            {/* Suggestions are typically handled by displaying buttons, not directly in bubble */}
            {/* This part might be empty or show a placeholder depending on your UI for suggestions */}
            <p>Sugerencias disponibles.</p>
          </div>
        );
      case 'interactiveSurvey':
        return (
          <div className="interactive-survey-payload">
            <p dangerouslySetInnerHTML={{ __html: payload.data.question }}></p>
            {/* Options are usually rendered as buttons in ChatInput or similar interactive area */}
          </div>
        );
      case 'fallback':
        return (
          <div className="fallback-payload">
            <p dangerouslySetInnerHTML={{ __html: payload.data.summary || 'Lo siento, no pude entender eso.' }}></p>
            {payload.data.detail && <p className="fallback-detail" dangerouslySetInnerHTML={{ __html: payload.data.detail }}></p>}
          </div>
        );
      default:
        return <p>Tipo de mensaje no reconocido.</p>;
    }
  };

  const textToSpeak = extractTextForSpeech(message.payload);

  return (
    <div className={`message-bubble ${message.sender}`}>
      <div className="message-content">
        {renderPayload(message.payload)}
      </div>
      {/* NEW: Separate footer for timestamp and audio button */}
      <div className="message-bubble-footer">
        <span className="message-timestamp">{message.timestamp}</span>
        {message.sender === 'assistant' && textToSpeak && (
          <button
            ref={audioButtonRef}
            className="audio-play-btn"
            onClick={() => audioButtonRef.current && playGeminiAudio(textToSpeak, currentTheme, audioButtonRef.current)}
            aria-label="Leer en voz alta"
          >
            <i className="fas fa-play-circle"></i>
          </button>
        )}
      </div>
    </div>
  );
}

export default MessageBubble;