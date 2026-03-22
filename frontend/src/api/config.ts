/**
 * API Configuration
 * The base URL for the backend API can be configured via environment variables.
 * Deployment or environment-specific values should be set in .env files.
 */

// In Vite, environment variables must start with VITE_
// Default to http://localhost:9000 to match backend main.py default port.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000';

export const getApiUrl = (path: string) => {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
};
