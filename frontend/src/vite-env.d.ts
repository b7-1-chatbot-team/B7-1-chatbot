/// <reference types="vite/client" />

// 환경변수 타입 (docs/06-deployment.md §3). VITE_ 변수는 번들에 포함되므로 비밀값을 넣지 않는다.
interface ImportMetaEnv {
  /** 백엔드 Base URL — 예) http://localhost:8000 */
  readonly VITE_API_BASE_URL: string
  /**
   * 'true' 면 개발 서버에서 API 를 MSW 로 모킹한다 (백엔드 없이 화면 확인용).
   * 개발 모드에서만 동작하며 운영 빌드에서는 무시된다.
   */
  readonly VITE_ENABLE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
