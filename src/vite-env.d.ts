/// <reference types="vite/client" />
declare const __APP_VERSION__: string;
interface ImportMetaEnv {
  readonly VITE_DATA_URL?: string;
}
interface ImportMetaEnv {
  /** ID do cliente OAuth do Google (login + Google Drive). */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** ID do aplicativo da Microsoft (login + OneDrive). */
  readonly VITE_MICROSOFT_CLIENT_ID?: string;
}
