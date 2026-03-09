import { createAuthClient } from 'better-auth/react';

const getAuthBaseURL = () => {
  const apiBaseURL = import.meta.env.VITE_API_BASE_URL;

  if (!apiBaseURL) {
    return 'http://localhost:3000';
  }

  return apiBaseURL.replace(/\/api\/?$/, '');
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
});
