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
| `npm run typecheck` | 타입 검사만 (`tsc -b`) |
| `npm run lint` | oxlint |
| `npm run preview` | 빌드 결과 미리보기 |

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
├── api/         # axios 인스턴스 · 인터셉터 · API 호출 함수
│   └── types.ts # API 요청·응답 타입 (docs/03-api.md 와 1:1)
├── components/  # 공용 컴포넌트 + *.module.css
├── contexts/    # AuthContext 등 전역 상태
├── pages/       # 라우트 단위 화면
├── routes/      # 라우팅
│   ├── paths.ts # 경로 상수 PATHS
│   ├── types.ts # 경로 관련 타입
│   └── index.tsx# 라우트 정의 (경로 - 페이지 연결)
├── App.tsx      # 앱 껍데기 (라우트는 routes 에서 가져옴)
└── main.tsx     # 진입점
```

**타입·인터페이스 규칙**

타입은 상수·구현 파일과 섞지 않고 **타입 파일로 분리**한다. 두는 위치는 사용 범위로 정한다.

| 사용 범위 | 위치 | 예 |
|-----------|------|----|
| **여러 페이지·컴포넌트가 공유** | `src/types/` | `src/types/user.ts`, `src/types/chat.ts` |
| **한 영역에서만 사용** | 그 폴더의 `types.ts` | `src/routes/types.ts`, `src/api/types.ts` |
| 한 컴포넌트에서만 쓰는 props | 그 컴포넌트 파일 안 | `function LogCard({ ... }: Props)` |

- 처음에는 좁은 범위(해당 폴더 `types.ts`)에 두고, 다른 영역에서도 쓰게 되면 `src/types/` 로 옮긴다
- 타입 전용 import 는 `import type { ... }` 로 쓴다 (`verbatimModuleSyntax` 적용)

스타일은 **CSS Modules**(`*.module.css`)를 사용하고, 색·폰트 등 공통 값은 `index.css` 의 CSS 변수로 관리합니다.
