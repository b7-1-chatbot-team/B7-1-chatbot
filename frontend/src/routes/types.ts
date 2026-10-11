import type { PATHS } from './paths'

/** 경로 키 — 'login' | 'signup' | 'chat' | 'logs' */
export type PathKey = keyof typeof PATHS

/** 경로 값 — '/login' | '/signup' | '/chat' | '/logs'
 * 관리자 주소는 환경변수로 정하므로 여기 없다 (paths.ts 의 ADMIN_PATH) */
export type Path = (typeof PATHS)[PathKey]
