/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_DESCRIPTION: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  // Add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}