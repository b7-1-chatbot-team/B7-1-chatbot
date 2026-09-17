import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
// test 설정을 포함하려면 vite 가 아니라 vitest 의 defineConfig 를 써야 한다
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
