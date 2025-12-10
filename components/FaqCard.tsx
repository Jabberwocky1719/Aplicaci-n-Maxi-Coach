// Add default export for the FaqCard component.
import React, { useState } from 'react';
import { KnowledgeBaseEntry } from '../types';

interface FaqCardProps {
  faqs: { [key: string]: KnowledgeBaseEntry };
  onSuggest: (text: string, viewType: 'agent' | 'lead') => void;
  currentDictamen: string;
  viewType: 'agent' | 'lead';
}

function FaqCard({ faqs, onSuggest, currentDictamen, viewType }: FaqCardProps) {
  // Only maintain searchTerm for 'lead' view where search bar is still active
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFaqs = Object.keys(faqs)
    .filter((key) => {
      const entry = faqs[key];
      
      // For 'agent' view, search bar is removed, so searchTerm is not applied.
      // For 'lead' view, searchTerm is applied.
      const matchesSearch = viewType === 'lead' ? (
        searchTerm === '' ||
        key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))
      ) : true; 

      const matchesDictamen = viewType === 'lead' || currentDictamen === 'Todos' || !entry.dictamen || entry.dictamen.includes(currentDictamen);

      // Only show top-level FAQs for agent view, not sub-questions like "chocó-con-seguro"
      const isTopLevelAgentFaq = viewType === 'agent' && !key.includes('-');

      return matchesSearch && matchesDictamen && (viewType === 'lead' || isTopLevelAgentFaq);
    })
    .map((key) => ({ key, entry: faqs[key] }));

  return (
    <div className="faq-card card">
      <h3>{viewType === 'agent' ? 'Paso 2: Selecciona las preguntas críticas (Maxi-Coach)' : 'Pilares de Liderazgo (Falcon)'}</h3>
      {viewType === 'lead' && ( // Only show search bar for 'lead' view
        <input
          type="text"
          placeholder="Buscar pilar de liderazgo..." // Changed placeholder for Falcon view
          className="faq-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      )}
      <div className="faq-list">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map(({ key, entry }) => (
            <button key={key} className="faq-item" onClick={() => onSuggest(key, viewType)}>
              {key}
              {entry.dictamen && viewType === 'agent' && (
                <span className="faq-dictamen-tag">
                  ({entry.dictamen.join(', ')})
                </span>
              )}
            </button>
          ))
        ) : (
          <p className="no-faqs-message">No se encontraron preguntas para los filtros seleccionados.</p>
        )}
      </div>
    </div>
  );
}

export default FaqCard;