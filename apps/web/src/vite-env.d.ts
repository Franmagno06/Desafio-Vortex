/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * Tipos do ambiente do Vite.
 *
 * As duas últimas referências ensinam o TypeScript sobre os módulos
 * **virtuais** do vite-plugin-pwa (`virtual:pwa-register/react`). Eles não
 * existem em disco — são gerados pelo plugin em tempo de build — então sem
 * estas linhas o `tsc` acusaria "Cannot find module".
 */

interface ImportMetaEnv {
  /** URL base da API. Em produção aponta para a Render. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
