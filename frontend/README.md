# Chatlog Frontend

React + TypeScript + Vite 기반 프론트엔드입니다. 전체 문서는 저장소 `docs/` 를 참고하세요.

| 문서 | 내용 |
|------|------|
| [../docs/05-ui-ux.md](../docs/05-ui-ux.md) | 화면 설계 · 라우팅 · 디자인 토큰 · API 호출 공통 모듈 |
| [../docs/03-api.md](../docs/03-api.md) | API 명세 (응답 봉투 `{code, data}`, 결과 코드) |
| [../docs/06-deployment.md](../docs/06-deployment.md) | 실행 · 환경변수 · 배포 |
| [../docs/features.md](../docs/features.md) | 기능 목록 (프론트 F1~F14) |

## 실행

```bash
nvm use                                        # Node 24 (.nvmrc)
npm install
cp .env.development.example .env.development   # 로컬 백엔드 주소
npm run dev                                    # http://localhost:5173
```

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 (development 모드) |
| `npm run build` | 타입 검사 + production 모드 빌드 → `dist` |
| `npm run build:dev` | 타입 검사 + development 모드 빌드 |
| `npm run test` | 단위 테스트 1회 실행 (`vitest run`) |
| `npm run test:watch` | 단위 테스트 감시 모드 |
| `npm run typecheck` | 타입 검사만 (`tsc -b`) |
| `npm run lint` | oxlint |
| `npm run preview` | 빌드 결과 미리보기 |

## 테스트

**Vitest** + **MSW**(네트워크 모킹) + **happy-dom**(DOM·localStorage 환경) 구성입니다.

| 파일 | 역할 |
|------|------|
| `src/test/server.ts` | MSW 가짜 서버. 기본 핸들러 없이, 각 테스트가 `server.use(...)` 로 필요한 응답만 등록 |
| `src/test/setup.ts` | 서버 기동·정리, 테스트마다 핸들러와 `localStorage` 초기화 |
| `src/test/environment.test.ts` | 테스트 환경 자체 점검 (실패 시 개별 테스트가 아니라 설정을 먼저 확인) |

- 테스트 파일은 `src/**/*.test.ts(x)` 로 두어 **검증 대상 옆에** 둡니다
- `describe`·`it`·`expect` 는 전역으로 두지 않고 `vitest` 에서 직접 import 합니다
- 등록하지 않은 요청은 **오류로 처리**합니다. 실제 네트워크로 나가 테스트가 조용히 통과하는 것을 막기 위해서입니다
- 네트워크 계층에서 가로채는 MSW 를 쓰는 이유는, axios 어댑터를 바꿔치기하는 방식과 달리 **인터셉터를 실제로 통과**시킨 뒤 검증할 수 있기 때문입니다

## 환경변수

`VITE_` 접두어 변수만 번들에 포함되며, **번들은 브라우저에서 그대로 보이므로 비밀값을 넣지 않습니다.**

| 키 | 설명 |
|----|------|
| `VITE_API_BASE_URL` | 백엔드 Base URL (axios `baseURL`) |

모드별로 읽는 파일이 다릅니다 — `npm run dev`·`build:dev` 는 `.env.development`, `npm run build` 는 `.env.production`.
실제 `.env.*` 파일은 커밋하지 않고, 저장소에는 `*.example` 만 둡니다.

## 구조

```
src/
├── api/             # 통신 계층
│   ├── instance.ts  # axios.create + 인터셉터 등록만 (호출 함수는 두지 않는다)
│   ├── interceptors/# attachToken · normalize · refresh(single-flight)
│   ├── auth.ts      # 엔드포인트 함수 (chat.ts, logs.ts 동일)
│   ├── ApiError.ts  # code · 안내 문구 · 재시도용 config
│   ├── types.ts     # API 요청·응답 타입 (docs/03-api.md 와 1:1)
│   └── axios.d.ts   # _retried 플래그 모듈 확장
├── utils/           # tokenStorage.ts — 토큰 읽기·쓰기·삭제 + 변경 구독
├── hooks/           # useAccessToken(토큰 구독) · useAuth(인증 상태 소비)
├── store/           # authContext.ts · AuthProvider.tsx · types.ts (AuthStatus)
├── components/      # 공용 컴포넌트 + *.module.css
├── pages/           # 라우트 단위 화면
├── styles/          # 전역 CSS
│   ├── reset.css    # 브라우저 기본값 정리 (Josh Comeau Custom CSS Reset 기반)
│   └── global.css   # :root 토큰 + 프로젝트 공통 기본값
├── routes/          # 라우팅
│   ├── paths.ts     # 경로 상수 PATHS
│   ├── types.ts     # 경로 관련 타입
│   ├── guards.tsx   # RequireAuth · RequireAdmin · GuestOnly
│   └── index.tsx    # 라우트 정의 (경로 - 페이지 연결)
├── test/            # server.ts(MSW) · setup.ts — 테스트는 *.test.ts 로 대상 옆에
├── App.tsx          # 앱 껍데기 (라우트는 routes 에서 가져옴)
└── main.tsx         # 진입점 (BrowserRouter → AuthProvider → App)
```

**`api/` 는 `store/` 를 import 하지 않습니다.** 인터셉터가 `AuthContext` 를 직접 부르면 `AuthContext → api/auth → instance → interceptors → AuthContext` 순환 참조가 됩니다. 재발급이 최종 실패하면 `clearTokens()` 만 호출하고, 토큰 변경 구독을 통해 인증 상태가 정리됩니다 (`docs/12-decisions.md` §17).

**import 경로 규칙**

`src` 를 가리키는 alias `@/` 를 사용한다. `../../` 로 거슬러 올라가지 않는다.

```ts
import { getAccessToken } from '@/utils/tokenStorage'   // O
import { getAccessToken } from '../../utils/tokenStorage' // X
```

같은 폴더 안의 파일은 `./paths` 처럼 상대 경로를 그대로 쓴다.
alias 설정은 **`tsconfig.app.json` 의 `paths`(타입 검사)와 `vite.config.ts` 의 `resolve.alias`(번들) 두 곳**에 있으며, 항상 같이 수정한다.

**타입·인터페이스 규칙**

타입은 상수·구현 파일과 섞지 않고 **타입 파일로 분리**한다. 두는 위치는 사용 범위로 정한다.

| 사용 범위 | 위치 | 예 |
|-----------|------|----|
| **여러 페이지·컴포넌트가 공유** | `src/types/` | `src/types/user.ts`, `src/types/chat.ts` |
| **한 영역에서만 사용** | 그 폴더의 `types.ts` | `src/routes/types.ts`, `src/api/types.ts` |
| 한 컴포넌트에서만 쓰는 props | 그 컴포넌트 파일 안 | `function LogCard({ ... }: Props)` |

- 처음에는 좁은 범위(해당 폴더 `types.ts`)에 두고, 다른 영역에서도 쓰게 되면 `src/types/` 로 옮긴다
- 타입 전용 import 는 `import type { ... }` 로 쓴다 (`verbatimModuleSyntax` 적용)

스타일은 **CSS Modules**(`*.module.css`)를 사용하고, 색·폰트 등 공통 값은 `styles/global.css` 의 `:root` CSS 변수로 관리합니다.
전역 CSS 는 `styles/` 의 두 파일뿐이며, `main.tsx` 에서 `reset.css` → `global.css` 순서로 로드합니다.
디자인 토큰은 기능 구현을 끝낸 뒤 스타일링 단계에서 채웁니다 (`docs/05-ui-ux.md` §1).
