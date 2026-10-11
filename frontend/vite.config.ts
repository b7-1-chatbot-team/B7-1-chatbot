import { rm } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import type { Plugin } from 'vite'
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

/** 검색에 내보낼 공개 화면. 로그인해야 보이는 화면·관리자는 넣지 않는다 (routes/paths.ts 와 맞춘다) */
const PUBLIC_PATHS = ['/login', '/signup']

/**
 * 빌드 때 robots.txt 와 sitemap.xml 을 만든다 (docs/05-ui-ux.md 8절 SEO).
 *
 * - robots.txt 는 모두 허용한다. 로그인 필요 화면·관리자·404 는 각 화면의 noindex 로 막는다.
 *   **관리자 주소를 Disallow 로 적지 않는다** — robots.txt 는 누구나 읽을 수 있어 주소가 드러난다
 * - sitemap.xml 은 절대 주소가 필요해 VITE_SITE_URL 이 있을 때만 만든다
 * public/ 에 고정 파일로 두지 않는 이유: 배포 주소를 빌드 환경변수로 받아야 한다
 */
function seoFiles(siteUrl: string | undefined): Plugin {
  const base = siteUrl?.replace(/\/$/, '')
  return {
    name: 'seo-files',
    apply: 'build',
    generateBundle() {
      const robots = ['User-agent: *', 'Allow: /', ...(base ? ['', `Sitemap: ${base}/sitemap.xml`] : [])]
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `${robots.join('\n')}\n` })

      if (!base) return
      const today = new Date().toISOString().slice(0, 10)
      const urls = PUBLIC_PATHS.map((path) => `  <url><loc>${base}${path}</loc><lastmod>${today}</lastmod></url>`)
      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        '</urlset>',
      ]
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `${sitemap.join('\n')}\n` })
    },
  }
}

/** 링크 미리보기 이미지 (public/og-image.png). 크기를 바꾸면 OG_IMAGE_SIZE 도 함께 바꾼다 */
const OG_IMAGE_PATH = '/og-image.png'
const OG_IMAGE_SIZE = { width: 1200, height: 630 }

/**
 * 빌드 때 index.html 에 og:url·og:image 를 넣는다 (docs/05-ui-ux.md 9절 SEO).
 *
 * 카카오톡·슬랙 등의 미리보기 로봇은 JavaScript 를 실행하지 않고 절대 주소만 읽는다.
 * usePageMeta 가 화면에서 넣는 og:url 은 로봇에게 보이지 않으므로 정적 HTML 에 넣는다.
 * 주소를 모르면 쓸 수 없어 VITE_SITE_URL 이 있을 때만 넣는다 (sitemap.xml 과 같은 규칙)
 */
function openGraph(siteUrl: string | undefined): Plugin {
  const base = siteUrl?.replace(/\/$/, '')
  return {
    name: 'open-graph',
    transformIndexHtml() {
      if (!base) return []
      const meta = (property: string, content: string) => ({
        tag: 'meta',
        attrs: { property, content },
        injectTo: 'head' as const,
      })
      return [
        meta('og:url', `${base}/`),
        meta('og:image', `${base}${OG_IMAGE_PATH}`),
        meta('og:image:type', 'image/png'),
        meta('og:image:width', String(OG_IMAGE_SIZE.width)),
        meta('og:image:height', String(OG_IMAGE_SIZE.height)),
        meta('og:image:alt', 'Chatlog — AI 챗봇과 대화하고 내 대화 기록을 다시 보는 서비스'),
      ]
    },
  }
}

const siteUrl = (mode: string) => loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), stripMockWorker(mode), seoFiles(siteUrl(mode)), openGraph(siteUrl(mode))],
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
    // 테스트 전용 관리자 주소. 실제 값은 .env 에만 둔다
    // 테스트 전용 배포 주소 — canonical·og:url 확인용
    env: { VITE_ADMIN_PATH: '/test-admin-console', VITE_SITE_URL: 'https://chatlog.test' },
  },
}))
