import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // 타입 검사용 설정은 tsconfig.app.json 의 paths 에 있다. 둘을 항상 같이 수정한다.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
