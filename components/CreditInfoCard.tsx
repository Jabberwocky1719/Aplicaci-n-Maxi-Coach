// Add default export for the CreditInfoCard component.
import React from 'react';

interface CreditInfoCardProps {
  currentDictamen: string;
  setCurrentDictamen: (dictamen: string) => void;
  currentGestionType: string;
  setCurrentGestionType: (type: string) => void;
  currentMoraBucket: string;
  setCurrentMoraBucket: (bucket: string) => void;
}

function CreditInfoCard({
  currentDictamen,
  setCurrentDictamen,
  currentGestionType,
  setCurrentGestionType,
  currentMoraBucket,
  setCurrentMoraBucket,
}: CreditInfoCardProps) {
  const dictamenOptions = [
    'Todos', 'Promesa de pago', 'Negativa de pago', 'Sin contacto', 'Siniestro',
    'Moto recuperada', 'Cambio de domicilio', 'Contacto con tercero', 'Prestanombre',
    'Defunción', 'Jurídico'
  ];
  const gestionTypeOptions = ['Telefónica', 'Campo'];
  const moraBucketOptions = ['1 a 15', '15 a 30', '30+'];

  return (
    <div className="credit-info-card card">
      <h3>Paso 1: Selecciona los datos del caso</h3>
      <div className="input-group">
        <label htmlFor="dictamen">Dictamen Principal:</label>
        <select
          id="dictamen"
          value={currentDictamen}
          onChange={(e) => setCurrentDictamen(e.target.value)}
        >
          {dictamenOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      <div className="input-group">
        <label htmlFor="gestion-type">Tipo de Gestión:</label>
        <select
          id="gestion-type"
          value={currentGestionType}
          onChange={(e) => setCurrentGestionType(e.target.value)}
        >
          {gestionTypeOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      <div className="input-group">
        <label htmlFor="mora-bucket">Días de Mora:</label>
        <select
          id="mora-bucket"
          value={currentMoraBucket}
          onChange={(e) => setCurrentMoraBucket(e.target.value)}
        >
          {moraBucketOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default CreditInfoCard;