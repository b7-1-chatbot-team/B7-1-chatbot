# 10. Pull Request 가이드

> 브랜치 전략·커밋 컨벤션: [docs/09-team.md §2](09-team.md#2-브랜치-전략--커밋-컨벤션)
> 모든 병합은 PR 로만 한다 (mission §4-7 "PR 기반 Merge 기록", §6 "브랜치/PR 기록이 저장소에 남아야 한다").
> 아래 본문 템플릿은 `.github/pull_request_template.md` 에도 등록되어 PR 생성 시 자동으로 채워진다.

## 1. PR 규칙

### 1-1. 제목
커밋 컨벤션과 같은 형식: `<type>: <변경 요약> #<이슈번호>` — 이슈 번호는 **`#1` 형식(앞자리 0 없음) 확정**
```
feat: 로그인 기능 추가 #1
fix: 한글 입력 중 Enter 중복 전송 수정 #14
hotfix: 운영 세션 쿠키 Secure 누락 수정 #21
docs: v1.0 기본 문서 추가
```

### 1-2. 대상(base) 브랜치
| 작업 브랜치 | base | 비고 |
|-------------|------|------|
| `feature/*` `refactor/*` `fix/*` `docs/*` `chore/*` `test/*` | `develop` | 일반 작업 |
| `hotfix/*` | `main` | 머지 후 **`main → develop` 반영 PR 필수** |
| `develop` (릴리스) | `main` | 평가·배포 시점, 태그 `v1.0.0` |

### 1-3. 크기와 범위
- **1 PR = 1 기능/1 목적**. 변경 400줄 이하 권장 (문서·lock 파일 제외)
- 다른 기능 수정이 섞이면 PR 을 나눈다
- 작업 중 공유는 **Draft PR** 로 열고, 준비되면 Ready for review

### 1-4. 리뷰와 머지
| 항목 | 규칙 |
|------|------|
| 리뷰어 | 최소 **1명 승인** 필수 (순환: 성원모 → 박성현 → 이성준 → 성원모) |
| 리뷰 기한 | 요청 후 24시간 이내 1차 코멘트 |
| 머지 조건 | 승인 1 + 테스트 통과 + 충돌 없음 + 체크리스트 완료 |
| 머지 주체 | **PR 작성자**가 승인 후 직접 머지 |
| 머지 방식 | **Create a merge commit (확정)** — Squash·Rebase 금지 → 개인 커밋과 머지 기록이 모두 남아야 함 (mission §4-7). 저장소 설정에서 merge commit 만 허용 |
| 머지 후 | 작업 브랜치 삭제 (PR 기록은 GitHub 에 남음), 연결 이슈 자동 종료 확인 |

### 1-5. 리뷰 코멘트 머리말
| 머리말 | 의미 |
|--------|------|
| `[필수]` | 머지 전 반드시 수정 |
| `[제안]` | 더 나은 방법 제안, 작성자 판단 |
| `[질문]` | 의도 확인 |
| `[칭찬]` | 좋은 코드 공유 |

---

## 2. PR 본문 템플릿

> 원본 가이드의 섹션 구성을 유지하고 **관련 요구사항 · 변경 유형 · 스크린샷 · 체크리스트** 를 보완했다.

````markdown
## 작업 내용

ex) 기능 명세 리스트(features.md B3, F2)에 있는 회원가입 API 와 화면을 구현한 PR 입니다.

---

## 관련 Issue

close #

<!-- 이슈가 없으면 "없음". close/fixes #번호 를 쓰면 머지 시 이슈가 자동으로 닫힌다 -->

---

## 관련 요구사항

- mission: ex) §4-2 회원가입 및 로그인
- features.md: ex) B3, F2

---

## 변경 유형

- [ ] feat: 새 기능
- [ ] fix / hotfix: 버그 수정
- [ ] refactor: 구조 개선 · UI/CSS 디자인 변경 · 파일 이름 변경/삭제
- [ ] docs: 문서
- [ ] test: 테스트
- [ ] chore / style: 설정·빌드 / 코드 포맷

---

## 주요 변경 사항

ex)
- `POST /api/auth/signup` 추가 (중복 아이디 409)
- 회원가입 화면 및 클라이언트 입력 검증 추가

---

## 스크린샷 (UI 변경 시)

<!-- 변경 전/후 캡처 또는 GIF. UI 변경이 없으면 "없음" -->

---

## 테스트

ex) - 로컬 환경에서 정상 실행 확인하였습니다. / 기존 기능에 사이드 이펙트 없음을 확인했습니다.

---

## 확인 방법

```bash
ex)
cd backend && .venv/bin/python -m pytest -q
cd frontend && npm run lint && npm run build
```

확인 결과:
ex) oxlint 경고 없이 통과 / 테스트 42개 통과

---

## API 변경 사항

없음

<!-- 있으면 Method·Path·요청/응답 변경점 요약 + docs/03-api.md 수정 여부 -->

---

## 체크리스트

- [ ] PR 제목이 커밋 컨벤션(`type: 요약 #이슈`)을 따른다
- [ ] base 브랜치가 올바르다 (일반 → `develop`, hotfix → `main`)
- [ ] 백엔드 테스트 / 프론트 lint·build 를 통과했다
- [ ] API 키·비밀번호 등 민감정보, `.env` 파일이 포함되지 않았다
- [ ] 관련 문서(README, docs/*)를 갱신했거나 갱신이 필요 없다
- [ ] 불필요한 로그·주석·디버그 코드가 없다

---

## Reviewer 참고 사항

ex) 신규 기능(회원가입) 추가이며 `feature/sign-up -> develop` 머지 PR 입니다.
````

---

## 3. 작성 예시

**제목**: `feat: 관리자 사용자별 대화 조회 화면 추가 #23`
**브랜치**: `feature/admin-page` → `develop`

````markdown
## 작업 내용

기능 명세 리스트 F10(관리자 화면)을 구현한 PR 입니다. 관리자가 사용자 목록에서 사용자를 선택해 대화 기록을 조회합니다.

---

## 관련 Issue

close #23

---

## 관련 요구사항

- mission: §2-2 관리자/내부 로그 확인 화면, §4-4 관리자 조회 API/화면
- features.md: F10

---

## 변경 유형

- [x] feat: 새 기능
- [x] refactor: 동작 변경 없는 구조 개선

---

## 주요 변경 사항

- `pages/AdminPage.jsx` 추가 (통계, 사용자 검색, 사용자별 대화, 상태 필터, `?user=` URL 유지)
- `components/LogCard.jsx` 로 대화 카드 공용화 (LogsPage 리팩토링)
- `App.jsx` `RequireAdmin` 가드, 헤더에 관리자 전용 탭

---

## 스크린샷 (UI 변경 시)

docs/screenshots/08-admin.png, docs/screenshots/09-admin-mobile.png

---

## 테스트

- 로컬 환경에서 관리자/일반 사용자 계정으로 정상 동작 확인
- 내 대화 로그 화면에 사이드 이펙트 없음 확인 (LogCard 공용화)

---

## 확인 방법

```bash
cd frontend && npm run lint && npm run build
BASE=http://127.0.0.1:5173 DEMO_PASSWORD=… ADMIN_PASSWORD=… e2e/.venv/bin/python -m pytest e2e -k "b24 or b25 or b26"
```

확인 결과:
빌드 성공 / UI 테스트 9개 통과 (3개 브라우저)

---

## API 변경 사항

없음 (백엔드 관리자 API 는 #22 에서 머지됨)

---

## 체크리스트

- [x] PR 제목이 커밋 컨벤션(`type: 요약 #이슈`)을 따른다
- [x] base 브랜치가 올바르다 (일반 → `develop`, hotfix → `main`)
- [x] 백엔드 테스트 / 프론트 lint·build 를 통과했다
- [x] API 키·비밀번호 등 민감정보, `.env` 파일이 포함되지 않았다
- [x] 관련 문서(README, docs/*)를 갱신했거나 갱신이 필요 없다
- [x] 불필요한 로그·주석·디버그 코드가 없다

---

## Reviewer 참고 사항

신규 기능(관리자 화면) 추가이며 `feature/admin-page -> develop` 머지 PR 입니다.
권한 검사는 서버 `require_admin` 이 최종이며, 프론트 가드는 화면 이동용입니다.
````

---

## 4. 원본 가이드 대비 보완 사항

| 보완 | 이유 |
|------|------|
| PR 제목 규칙 | 커밋 컨벤션과 통일 → 머지 커밋·PR 목록만 봐도 변경 종류 파악 |
| base 브랜치 표 · hotfix 역반영 | hotfix 가 develop 에 빠지면 다음 릴리스에서 버그가 되살아남 |
| 관련 Issue `close #번호` | 머지 시 이슈 자동 종료, 이슈 ↔ PR 연결 이력 |
| 관련 요구사항 | 평가 항목(mission)과 PR 을 직접 연결 → 역할 요약·체크리스트 작성 근거 |
| 변경 유형 체크 | 리뷰어가 검토 관점(기능/리팩토링/문서)을 바로 파악 |
| 스크린샷 | UI 리뷰는 코드보다 화면이 빠름 |
| 체크리스트 | 민감정보 커밋(mission §6)·테스트 누락을 머지 전에 차단 |
| 머지 방식 = Merge commit | Squash 시 개인 커밋이 1개로 합쳐져 **팀원별 커밋 10회**(mission §4-7) 집계에 불리 |
| 리뷰 코멘트 머리말 | 필수 수정과 제안을 구분해 리뷰 왕복 감소 |
| 예시 `테스트 31개` → 실제 명령 | 현재 프로젝트 명령(pytest, oxlint)으로 교체 |
