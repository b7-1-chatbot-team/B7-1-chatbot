import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

/**
 * 브라우저용 MSW 워커.
 *
 * Service Worker 로 네트워크를 가로채므로 `public/mockServiceWorker.js` 가 필요하다.
 * 이 파일은 msw 가 생성한 것이므로 직접 수정하지 않는다.
 *
 * 테스트는 `src/test/server.ts`(msw/node)를 쓴다. 가로채는 계층만 다르고,
 * 두 경우 모두 실제 axios 인스턴스와 인터셉터를 통과한 뒤 응답을 받는다.
 */
export const worker = setupWorker(...handlers)
