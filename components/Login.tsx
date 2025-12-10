// components/Login.tsx
import React, { useState } from 'react';
import { User } from '../types';
import { localUsers } from '../constants';
import { getUserPassword, saveUserPassword } from '../utils';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPasswordChangeForm, setShowPasswordChangeForm] = useState(false);
  const [currentUserToChangePassword, setCurrentUserToChangePassword] = useState<User | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const user = localUsers.find((u) => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      setError('Usuario no encontrado.');
      return;
    }

    const storedPassword = getUserPassword(user.username);

    // Scenario 1: User enters default password "Pass1234" to trigger password change
    if (password === 'Pass1234') {
      setCurrentUserToChangePassword(user);
      setShowPasswordChangeForm(true);
      setPassword(''); // Clear password field
      setNewPassword('');
      setConfirmNewPassword('');
    }
    // Scenario 2: User enters a custom password which matches the stored one
    else if (storedPassword && password === storedPassword) {
      onLoginSuccess(user);
    }
    // Scenario 3: User has no custom password stored locally, but enters the default password from constants.ts
    // This allows users like 'Jack' (Artemisa17*) to log in initially if they haven't set a custom one.
    else if (!storedPassword && password === user.password) {
      onLoginSuccess(user);
    }
    // Scenario 4: User tries to log in with an incorrect password
    else {
      setError('Contraseña incorrecta.');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmNewPassword) {
      setError('Las nuevas contraseñas no coinciden.');
      return;
    }

    if (newPassword.length < 4) { // Basic validation
      setError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (currentUserToChangePassword) {
      saveUserPassword(currentUserToChangePassword.username, newPassword);
      onLoginSuccess(currentUserToChangePassword);
      setShowPasswordChangeForm(false);
      setCurrentUserToChangePassword(null);
      setUsername(''); // Clear username field after successful login
    }
  };

  if (showPasswordChangeForm) {
    return (
      <div className="login-container">
        <div className="login-card password-change-card">
          <h2 className="login-title"><i className="fas fa-key"></i> Establecer Nueva Contraseña</h2>
          <p className="login-description">
            Bienvenido, {currentUserToChangePassword?.username}. Por favor, establece una nueva contraseña para tu cuenta.
            Esta contraseña se guardará en tu dispositivo.
          </p>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label htmlFor="new-password">Nueva Contraseña:</label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={4}
                aria-label="Nueva Contraseña"
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirm-new-password">Confirmar Nueva Contraseña:</label>
              <input
                type="password"
                id="confirm-new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                minLength={4}
                aria-label="Confirmar Nueva Contraseña"
              />
            </div>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button type="submit" className="login-button">
              Guardar y Entrar
            </button>
            <button type="button" className="login-button secondary" onClick={() => setShowPasswordChangeForm(false)}>
              Cancelar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title"><i className="fas fa-motorcycle"></i> Maxi-Coach Cobratodo</h1>
        <p className="login-description">
          Tu asistente inteligente para cobranza en campo. Inicia sesión para acceder.
        </p>
        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Usuario:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tu usuario"
              required
              aria-label="Nombre de usuario"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              required
              aria-label="Contraseña"
            />
          </div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button type="submit" className="login-button">
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;