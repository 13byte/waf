/**
 * OAuth Configuration
 * Centralized OAuth settings and feature flags
 */

export const oauthConfig = {
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    enabled: !!import.meta.env.VITE_GOOGLE_CLIENT_ID,
  }
};

// Helper to check if any OAuth provider is enabled
export const isOAuthEnabled = () => {
  return oauthConfig.google.enabled;
};

// Helper to get enabled OAuth providers
export const getEnabledProviders = () => {
  const providers = [];
  if (oauthConfig.google.enabled) {
    providers.push('google');
  }
  return providers;
};