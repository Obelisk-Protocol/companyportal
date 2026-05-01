/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** When `"true"`, SSO sign-in is enabled; otherwise the control stays disabled with messaging. */
  readonly VITE_ENABLE_SSO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
