import React, { useEffect, useCallback, useState } from 'react';
import { legalFrameworkResponse, leadKnowledgeBase } from '../constants';
import { KnowledgeBaseEntry, User } from '../types'; // Import User type


interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface GuideModalProps extends ModalProps {
    currentView: 'agent' | 'lead';
}

interface GeneratePlanModalProps extends ModalProps {
    sendMessageToChat: (message: string) => void;
}


// Helper to manage modal visibility via class 'active'
const useModalVisibility = (modalId: string, isOpen: boolean, onClose: () => void) => {
    useEffect(() => {
        const modalOverlay = document.getElementById(modalId);
        if (modalOverlay) {
            if (isOpen) {
                modalOverlay.classList.add('active');
                modalOverlay.setAttribute('aria-hidden', 'false');
            } else {
                modalOverlay.classList.remove('active');
                modalOverlay.setAttribute('aria-hidden', 'true');
            }

            // Handle clicking outside the modal to close it
            const handleOverlayClick = (event: MouseEvent) => {
                if (event.target === modalOverlay) {
                    onClose();
                }
            };
            modalOverlay.addEventListener('click', handleOverlayClick);

            return () => {
                modalOverlay.removeEventListener('click', handleOverlayClick);
            };
        }
    }, [isOpen, modalId, onClose]);
};

export function GuideModal({ isOpen, onClose, currentView }: GuideModalProps) {
    useModalVisibility('guide-modal-overlay', isOpen, onClose);

    const guideContent = currentView === 'agent' ? legalFrameworkResponse.maxiCoachGuide : legalFrameworkResponse.falconGuide;
    const modalTitle = currentView === 'agent' ? 'Guía de Uso Maxi-Coach' : 'Guía de Uso Falcon';

    return (
        <div id="guide-modal-overlay" className="modal-overlay" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="guide-modal-title">
            <div className="modal-content" id="guide-modal">
                <div className="modal-header">
                    <h2 id="guide-modal-title">{modalTitle}</h2>
                </div>
                <div className="modal-body" id="guide-modal-body">
                    <div dangerouslySetInnerHTML={{ __html: guideContent }}></div>
                </div>
                <div className="modal-footer">
                    <button className="modal-close-btn" onClick={onClose}>Entendido</button>
                </div>
            </div>
        </div>
    );
}

export function PillarsModal({ isOpen, onClose }: ModalProps) {
    useModalVisibility('pillars-modal-overlay', isOpen, onClose);

    // Fix: Correctly destructure `key` from the `Object.entries` callback arguments
    const pillars = Object.entries(leadKnowledgeBase.faqs)
        .filter(([key, faqEntry]) => {
            const entry = faqEntry as KnowledgeBaseEntry;
            // Filter out specific entries that are not "pillars" or are too detailed for initial list
            // Keeping only top-level pillars for this modal
            const pillarKeywords = ["coaching", "feedback", "motivar", "malas prácticas", "tiempo", "estrella"];
            return entry.keywords?.some(keyword => pillarKeywords.includes(keyword)) && !key.includes('-');
        })
        .map(([key, faqEntry]) => ({
            title: key,
            summary: (faqEntry as KnowledgeBaseEntry).summary,
        }));

    return (
        <div id="pillars-modal-overlay" className="modal-overlay" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="pillars-modal-title">
            <div className="modal-content" id="pillars-modal">
                <div className="modal-header">
                    <h2 id="pillars-modal-title">Pilares de Liderazgo</h2>
                </div>
                <div className="modal-body">
                    <ul id="modal-pillars-list-container">
                        {pillars.map((pillar, index) => (
                            <li key={index} aria-label={`Pilar: ${pillar.title}`}>
                                <i className="fas fa-hand-sparkles"></i>
                                <strong>{pillar.title}:</strong> {pillar.summary}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="modal-footer">
                    <button className="modal-close-btn" onClick={onClose}>Regresar</button>
                </div>
            </div>
        </div>
    );
}

export function GeneratePlanModal({ isOpen, onClose, sendMessageToChat }: GeneratePlanModalProps) {
    useModalVisibility('generate-plan-modal-overlay', isOpen, onClose);

    const [gestorName, setGestorName] = useState('');
    const [creditosAsignados, setCreditosAsignados] = useState(0);
    const [creditosGestionados, setCreditosGestionados] = useState(0);
    const [creditosPrioridad, setCreditosPrioridad] = useState(0);
    const [creditosSinGestion, setCreditosSinGestion] = useState(0); // NEW: State for "Créditos sin Gestión"
    const [gestorDesempeno, setGestorDesempeno] = useState('Alto Rendimiento');

    const handleGeneratePlan = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const planPrompt = `Genera un plan de acción para el gestor ${gestorName} con el siguiente perfil: 
        Créditos Asignados: ${creditosAsignados}, 
        Créditos Gestionados: ${creditosGestionados}, 
        Créditos Prioridad: ${creditosPrioridad},
        Créditos sin Gestión: ${creditosSinGestion}, 
        Desempeño: ${gestorDesempeno}.`;
        
        sendMessageToChat(planPrompt);
        onClose(); // Close modal after sending message
    }, [gestorName, creditosAsignados, creditosGestionados, creditosPrioridad, creditosSinGestion, gestorDesempeno, sendMessageToChat, onClose]); // Added creditosSinGestion to dependencies

    // Reset form fields when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setGestorName('');
            setCreditosAsignados(0);
            setCreditosGestionados(0);
            setCreditosPrioridad(0);
            setCreditosSinGestion(0); // NEW: Reset creditosSinGestion
            setGestorDesempeno('Alto Rendimiento');
        }
    }, [isOpen]);

    return (
        <div id="generate-plan-modal-overlay" className="modal-overlay" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="generate-plan-modal-title">
            <div className="modal-content" id="generate-plan-modal">
                <div className="modal-header">
                    <h2 id="generate-plan-modal-title">Generar Plan de Acción</h2>
                </div>
                <div className="modal-body">
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Ingresa los datos de tu gestor para obtener un plan personalizado.</p>
                    <form id="generate-plan-form" onSubmit={handleGeneratePlan}>
                        <div className="form-group span-2">
                            <label htmlFor="gestor-name-input">Nombre del Gestor:</label>
                            <input type="text" id="gestor-name-input" placeholder="Ej. Ana García" required value={gestorName} onChange={(e) => setGestorName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="creditos-asignados-input">Créditos Asignados:</label>
                            <input type="number" id="creditos-asignados-input" min="0" required value={creditosAsignados} onChange={(e) => setCreditosAsignados(parseInt(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="creditos-gestionados-input">Créditos Gestionados:</label>
                            <input type="number" id="creditos-gestionados-input" min="0" required value={creditosGestionados} onChange={(e) => setCreditosGestionados(parseInt(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="creditos-prioridad-input">Créditos Prioridad:</label>
                            <input type="number" id="creditos-prioridad-input" min="0" required value={creditosPrioridad} onChange={(e) => setCreditosPrioridad(parseInt(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="creditos-sin-gestion-input">Créditos sin Gestión:</label>
                            <input type="number" id="creditos-sin-gestion-input" min="0" required value={creditosSinGestion} onChange={(e) => setCreditosSinGestion(parseInt(e.target.value))} />
                        </div>
                        <div className="form-group span-2">
                            <label htmlFor="gestor-desempeno-select">Desempeño del Gestor:</label>
                            <select id="gestor-desempeno-select" aria-label="Describir desempeño del gestor" required value={gestorDesempeno} onChange={(e) => setGestorDesempeno(e.target.value)}>
                                <option value="Alto Rendimiento">Alto Rendimiento</option>
                                <option value="En Desarrollo">En Desarrollo</option>
                                <option value="Baja Motivación">Baja Motivación</option>
                                <option value="Actitud Negativa">Actitud Negativa</option>
                                <option value="Novato">Novato</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div className="modal-footer">
                    <button type="button" className="modal-close-btn" onClick={onClose}>Cancelar</button>
                    <button type="submit" form="generate-plan-form" id="generate-plan-btn-modal">Generar Plan</button>
                </div>
            </div>
        </div>
    );
}