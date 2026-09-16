/// <reference types="vite/client" />

// 환경변수 타입 (docs/06-deployment.md §3). VITE_ 변수는 번들에 포함되므로 비밀값을 넣지 않는다.
interface ImportMetaEnv {
  /** 백엔드 Base URL — 예) http://localhost:8000 */
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
