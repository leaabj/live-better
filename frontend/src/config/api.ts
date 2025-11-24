/**
 * API Configuration
 * Centralizes API URL configuration for different environments
 */

// Get API URL from environment variable or use defaults based on mode
const getApiUrl = (): string => {
  // Check for explicit environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Use production URL in production mode
  if (import.meta.env.PROD) {
    return 'https://livebetter-backend-c7akfpgjbhfmchc9.westeurope-01.azurewebsites.net';
  }

  // Default to localhost for development
  return 'http://localhost:3000';
};

export const API_URL = getApiUrl();

// Helper function to create full API endpoint URLs
export const getApiEndpoint = (path: string): string => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
};
