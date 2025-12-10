// Add default export for the Header component.
import React, { useState } from 'react';
import { User } from '../types';
import { themes } from '../constants'; // Import the themes object for its type

interface HeaderProps {
  currentUser: User; // currentUser is always present at checkpoint
  currentView: 'agent' | 'lead';
  setCurrentView: (view: 'agent' | 'lead') => void;
  handleLogout: () => void; // Renamed to handleResetApp conceptually
  currentTheme: keyof typeof themes;
  setCurrentTheme: (theme: keyof typeof themes) => void;
  setIsGuideModalOpen: (isOpen: boolean) => void;
  setIsPillarsModalOpen: (isOpen: boolean) => void;
  setIsGeneratePlanModalOpen: (isOpen: boolean) => void;
}

function Header({
  currentUser,
  currentView,
  setCurrentView,
  handleLogout, // Now functions as handleResetApp and logout
  currentTheme,
  setCurrentTheme,
  setIsGuideModalOpen,
  setIsPillarsModalOpen,
  setIsGeneratePlanModalOpen
}: HeaderProps) {
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  const toggleView = () => {
    setCurrentView(currentView === 'agent' ? 'lead' : 'agent');
  };

  const handleChangeTheme = (themeKey: keyof typeof themes) => {
    setCurrentTheme(themeKey);
    setShowThemeDropdown(false); // Close dropdown after selection
  };

  // Determine if the user has access to both Maxi-Coach and Falcon to show the toggle
  const hasBothAccess = currentUser.accessMaxiCoach && currentUser.accessFalcon;

  return (
    <header className="app-header">
      <div className="header-left">
        {hasBothAccess && (
          <button onClick={toggleView} className="view-toggle-button icon-only" aria-label={`Cambiar a ${currentView === 'agent' ? 'Falcon (Líder)' : 'Maxi-Coach (Agente)'}`}>
            <i className="fas fa-sync-alt"></i>
          </button>
        )}
      </div>

      <span className="app-title">
        {currentView === 'agent' ? <><i className="fas fa-motorcycle"></i> Maxi-Coach</> : <><i className="fas fa-user-tie"></i> Falcon</>}
      </span>
      
      <div className="header-right">
        <div className="theme-selector-container">
          <button 
            className="theme-palette-button icon-only" 
            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            aria-label="Seleccionar tema"
            aria-expanded={showThemeDropdown}
          >
            <i className="fas fa-palette"></i>
          </button>
          {showThemeDropdown && (
            <div className="theme-dropdown-menu">
              {Object.entries(themes).map(([key, theme]) => (
                <button 
                  key={key} 
                  className={`theme-dropdown-item ${currentTheme === key ? 'active' : ''}`}
                  onClick={() => handleChangeTheme(key as keyof typeof themes)}
                  aria-pressed={currentTheme === key}
                >
                  {theme.name}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Guide Modal button always visible if user has access to the current view */}
        {(currentUser.accessMaxiCoach && currentView === 'agent') || (currentUser.accessFalcon && currentView === 'lead') ? (
          <button onClick={() => setIsGuideModalOpen(true)} className="header-action-button icon-only" aria-label="Abrir guía rápida">
            <i className="fas fa-book"></i>
          </button>
        ) : null}
        {currentUser.accessFalcon && currentView === 'lead' && ( // Only show if user has Falcon access AND is in lead view
          <button onClick={() => setIsGeneratePlanModalOpen(true)} className="header-action-button icon-only" aria-label="Generar plan de acción">
            <i className="fas fa-rocket"></i>
          </button>
        )}
        <button onClick={handleLogout} className="logout-button icon-only" aria-label="Cerrar sesión y reiniciar"> {/* Changed label to reflect logout behavior */}
          <i className="fas fa-broom"></i> {/* Broom icon for clearing state and logging out */}
        </button>
      </div>
    </header>
  );
}

export default Header;