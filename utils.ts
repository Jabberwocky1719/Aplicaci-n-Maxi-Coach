// utils.ts
export const STORAGE_PREFIX = 'maxiCoach_password_';

/**
 * Saves a user's password to local storage.
 * @param username The username of the user.
 * @param password The password to save.
 */
export function saveUserPassword(username: string, passwordHash: string): void {
  localStorage.setItem(STORAGE_PREFIX + username, passwordHash);
}

/**
 * Retrieves a user's password from local storage.
 * @param username The username of the user.
 * @returns The password string, or null if not found.
 */
export function getUserPassword(username: string): string | null {
  return localStorage.getItem(STORAGE_PREFIX + username);
}

/**
 * Removes a user's password from local storage.
 * @param username The username of the user.
 */
export function removeUserPassword(username: string): void {
  localStorage.removeItem(STORAGE_PREFIX + username);
}

// You can add a simple hash function here if you want to store hashed passwords
// rather than plain text. For this challenge, we'll keep it simple as requested.
// A more robust solution would involve proper hashing (e.g., bcrypt).
// For example:
// export function hashPassword(password: string): string {
//   // In a real app, use a secure hashing library
//   return btoa(password); // Base64 encoding for basic obfuscation
// }
//
// export function verifyPassword(inputPassword: string, storedHash: string): boolean {
//   return btoa(inputPassword) === storedHash;
// }
