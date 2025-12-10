import { Modality } from "@google/genai";

export interface User {
  username: string;
  password?: string; // Make password optional as it might be stored locally
  role: 'Agente' | 'Lider' | 'Admin';
  accessMaxiCoach: boolean;
  accessFalcon: boolean;
}

export interface Theme {
  name: string;
  color: string;
}

export interface VoiceProfile {
  voiceName: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  payload: MessagePayload;
}

export type MessagePayload = DirectMessagePayload | SuggestionsPayload | InteractiveSurveyPayload | FallbackPayload | string;

export interface DirectMessagePayload {
  type: 'direct';
  data: KnowledgeBaseEntry | string;
}

export interface SuggestionsPayload {
  type: 'suggestions';
  data: { question: string }[];
}

export interface InteractiveSurveyPayload {
  type: 'interactiveSurvey';
  data: {
    question: string;
    options: { text: string; trigger: string }[];
  };
}

export interface FallbackPayload {
  type: 'fallback';
  data: {
    summary: string;
    detail?: string | null;
  };
}

// Define a type for the 'type' string literals from the object payloads
export type MessagePayloadTypeLiteral = DirectMessagePayload['type'] | SuggestionsPayload['type'] | InteractiveSurveyPayload['type'] | FallbackPayload['type'];

// Base interface for common properties
export interface BaseKnowledgeBaseEntry {
  summary: string;
  objetivoClave?: string;
  detail?: {
    strategy?: string;
    phrases?: string;
    leaderPlan?: string;
  };
  keywords?: string[];
  dictamen?: string[]; // Only for agent view FAQs
  expertNote?: string; // NEW: Propiedad para la Nota del Experto
  moraSpecificDetail?: { // NEW: For content that changes based on mora bucket
    [key: string]: { // key would be '1 a 15', '15 a 30', '30+'
      strategy: string;
      phrases: string;
    }
  };
}

// For regular knowledge base entries (without interactive surveys)
export interface RegularKnowledgeBaseEntry extends BaseKnowledgeBaseEntry {
  // Fix: Use MessagePayloadTypeLiteral to correctly infer 'type' property
  type?: Exclude<MessagePayloadTypeLiteral, 'interactiveSurvey'>; // Exclude 'interactiveSurvey'
  data?: never; // Explicitly state no 'data' property for non-interactive types
}

// For interactive survey knowledge base entries
export interface InteractiveKnowledgeBaseEntry extends BaseKnowledgeBaseEntry {
  type: 'interactiveSurvey'; // `type` is required and specific for interactive surveys
  data: { // `data` is required and specific for interactive surveys
    question: string;
    options: { text: string; trigger: string }[];
  };
}

// KnowledgeBaseEntry is a discriminated union
export type KnowledgeBaseEntry = RegularKnowledgeBaseEntry | InteractiveKnowledgeBaseEntry;

export interface AgentKnowledgeBaseFallback {
  generalOffTopic?: string[]; // For agent
  collectionGuidance?: string[]; // For agent
}

export interface LeadKnowledgeBaseFallback {
  summary: string; // For lead, summary is always required
  detail?: string | null; // For lead
}

export interface KnowledgeBase {
  initial: string;
  fallback: AgentKnowledgeBaseFallback | LeadKnowledgeBaseFallback; // Use discriminated union for fallback
  faqs: {
    [key: string]: KnowledgeBaseEntry;
  };
}

export interface CreditInfoCardProps {
  currentDictamen: string;
  setCurrentDictamen: (dictamen: string) => void;
  currentGestionType: string;
  setCurrentGestionType: (type: string) => void;
  currentMoraBucket: string;
  setCurrentMoraBucket: (bucket: string) => void;
}

export interface FaqCardProps {
  faqs: { [key: string]: KnowledgeBaseEntry };
  onSuggest: (text: string, viewType: 'agent' | 'lead') => void;
  currentDictamen: string;
  viewType: 'agent' | 'lead';
}

export interface ChatState {
  currentView: 'agent' | 'lead';
  currentDictamen: string;
  currentGestionType: string;
  currentMoraBucket: string;
  lastFaqTopic: string | null;
  agentFallbackIndex: number;
}