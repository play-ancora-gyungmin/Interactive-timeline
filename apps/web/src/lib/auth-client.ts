import { createAuthClient } from 'better-auth/react';

const fallbackAuthBaseUrl = 'http://localhost:4000';

const getAuthBaseURL = () => {
  const apiBaseURL = import.meta.env.VITE_API_BASE_URL;

  if (!apiBaseURL) {
    return fallbackAuthBaseUrl;
  }

  return apiBaseURL.replace(/\/api\/?$/, '');
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
});
