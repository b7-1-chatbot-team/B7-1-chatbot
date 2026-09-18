import { rm } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
// test 설정을 포함하려면 vite 가 아니라 vitest 의 defineConfig 를 써야 한다
import { defineConfig } from 'vitest/config'

/**
 * 운영 빌드에서 MSW Service Worker 파일을 산출물에서 제거한다.
 *
 * public/ 의 파일은 Vite 가 내용과 무관하게 dist 로 복사한다. 앱 코드가 운영에서
 * 워커를 등록하지 않으므로 동작하지는 않지만, 모킹 워커를 배포물에 함께 내보낼 이유가 없다.
 * development 모드 빌드(build:dev)에서는 남겨 둔다 — 개발 서버에 올려 확인할 때 필요하다.
 */
function stripMockWorker(mode: string) {
  return {
    name: 'strip-mock-worker',
    apply: 'build' as const,
    async closeBundle() {
      if (mode !== 'production') return
      await rm(fileURLToPath(new URL('./dist/mockServiceWorker.js', import.meta.url)), {
        force: true,
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), stripMockWorker(mode)],
  resolve: {
    // 타입 검사용 설정은 tsconfig.app.json 의 paths 에 있다. 둘을 항상 같이 수정한다.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // localStorage·window 가 필요하다 (Node 기본 환경에는 없다)
    environment: 'happy-dom',
    // MSW 서버 기동·정리를 모든 테스트 파일에 공통 적용
    setupFiles: ['./src/test/setup.ts'],
    // describe·it 등을 전역으로 두지 않고 vitest 에서 명시적으로 import 한다
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
}))
