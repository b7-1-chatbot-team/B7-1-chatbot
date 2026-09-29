/// <reference types="vite/client" />

// 환경변수 타입 (docs/06-deployment.md 3절). VITE_ 변수는 번들에 포함되므로 비밀값을 넣지 않는다.
interface ImportMetaEnv {
  /** 백엔드 Base URL — 예) http://localhost:8000 */
  readonly VITE_API_BASE_URL: string
  /**
   * 'true' 면 개발 서버에서 API 를 MSW 로 모킹한다 (백엔드 없이 화면 확인용).
   * 개발 모드에서만 동작하며 운영 빌드에서는 무시된다.
   */
  readonly VITE_ENABLE_MOCK?: string
  /** 관리자 화면 주소. 짐작하기 어려운 값을 쓰고 코드·문서에 적지 않는다. 없으면 관리자 라우트 미등록 */
  readonly VITE_ADMIN_PATH?: string
  /**
   * 배포된 프론트 주소 — 예) https://<frontend>.up.railway.app (끝에 / 없이).
   * canonical·og:url·sitemap.xml 에 쓴다. 없으면 셋 다 만들지 않는다 (주소를 모르고 쓸 수 없다)
   */
  readonly VITE_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
