// Add default export for the ChatWindow component.
import React from 'react';
import { ChatMessage, MessagePayload, Theme } from '../types';
import { themes } from '../constants'; // Import themes for type
import MessageBubble from './MessageBubble';

interface ChatWindowProps {
  messages: ChatMessage[];
  chatWindowRef: React.RefObject<HTMLDivElement>;
  isTyping: boolean;
  extractTextForSpeech: (payload: MessagePayload) => string;
  playGeminiAudio: (text: string, currentTheme: keyof typeof themes, buttonElement: HTMLElement) => Promise<void>; // Fix: Use keyof typeof themes
  currentTheme: keyof typeof themes; // Fix: Use keyof typeof themes
}

function ChatWindow({ messages, chatWindowRef, isTyping, extractTextForSpeech, playGeminiAudio, currentTheme }: ChatWindowProps) {
  return (
    <div className="chat-window" ref={chatWindowRef}>
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          extractTextForSpeech={extractTextForSpeech}
          playGeminiAudio={playGeminiAudio}
          currentTheme={currentTheme}
        />
      ))}
      {isTyping && (
        <div className="message-bubble assistant typing">
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWindow;