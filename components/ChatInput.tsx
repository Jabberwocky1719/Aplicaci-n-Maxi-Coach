// Add default export for the ChatInput component.
import React, { useState } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isTyping: boolean;
}

function ChatInput({ onSendMessage, isTyping }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isTyping) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={isTyping ? "Maxi-Coach está pensando..." : "Escribe tu pregunta o comentario..."}
        disabled={isTyping}
      />
      <button type="submit" disabled={isTyping}>
        <i className="fas fa-paper-plane"></i>
      </button>
    </form>
  );
}

export default ChatInput;