import type { PATHS } from './paths'

/** 경로 키 — 'login' | 'signup' | 'chat' | 'logs' | 'admin' */
export type PathKey = keyof typeof PATHS

/** 경로 값 — '/login' | '/signup' | '/chat' | '/logs' | '/admin' */
export type Path = (typeof PATHS)[PathKey]
