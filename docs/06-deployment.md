# 06. 실행 · 배포 방법

## 1. 요구 환경
- Python 3.11+ (검증: 3.14.7) · Node.js 20+ (검증: 24.11) · sqlite3 CLI

## 2. 환경 변수 (backend/.env)

`cp backend/.env.example backend/.env` 후 값 입력. **`.env` 는 `.gitignore` 로 커밋 금지.**

| 키 | 기본값 | 설명 | 민감 |
|----|--------|------|:----:|
| `APP_ENV` | development | 실행 환경 표기 | |
| `DATABASE_URL` | `sqlite:///backend/app.db` | SQLAlchemy URL | |
| `AI_PROVIDER` | auto | `auto`(키 있으면 anthropic) / `anthropic` / `mock` | |
| `ANTHROPIC_API_KEY` | (없음) | Claude API 키 — **서버에서만 사용** | ✅ |
| `AI_MODEL` | claude-opus-5 | 사용 모델 | |
| `AI_EFFORT` | low | 응답 깊이(low~max). 챗은 지연 최소화 위해 low | |
| `AI_MAX_TOKENS` | 4096 | 응답 최대 토큰 | |
| `AI_TIMEOUT` | 15 | AI 호출 총 제한 시간(초) | |
| `CONTEXT_TURNS` | 5 | 함께 보낼 이전 Q/A 수 | |
| `MAX_MESSAGE_LENGTH` | 1000 | 질문 최대 글자수 | |
| `DEMO_MODE` | true | 응답 시뮬레이션 허용 (평가 시연용) | |
| `SESSION_TTL_HOURS` | 24 | 세션 유효 시간 | |
| `SESSION_COOKIE_SECURE` | false | **운영 HTTPS 에서 true** | |
| `ALLOWED_ORIGINS` | localhost:5173 | 허용 Origin (쉼표 구분) | |
| `DEMO_USERNAME` | tester | 시작 시 생성할 데모 계정 | |
| `DEMO_PASSWORD` | (없음) | 데모 계정 비밀번호. 비우면 생성 안 함 | ✅ |
| `ADMIN_USERNAME` | admin | 시작 시 생성(또는 승격)할 관리자 아이디 | |
| `ADMIN_PASSWORD` | (없음) | 관리자 비밀번호. 비우면 관리자 생성 안 함. **이미 존재하는 계정의 비밀번호는 바꾸지 않음** | ✅ |

`frontend/.env` (선택): `VITE_API_PROXY_TARGET=http://127.0.0.1:8000` — 개발 프록시 대상. **브라우저 번들에 비밀값을 넣지 않는다.**

## 3. 로컬 실행

```bash
# 1) 백엔드
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # DEMO_PASSWORD, ADMIN_PASSWORD, (선택) ANTHROPIC_API_KEY 입력
uvicorn app.main:app --reload --port 8000
#   → 시작 로그: demo_user_seeded username=tester / admin_user_seeded username=admin action=created
#                app_started ai_provider=mock|anthropic

# 2) 프론트 (새 터미널)
cd frontend
npm install
npm run dev                     # http://127.0.0.1:5173

# 3) 확인
curl http://127.0.0.1:5173/api/health    # {"status":"ok","db":"ok"}
# 브라우저: http://127.0.0.1:5173  일반 사용자(DEMO_USERNAME) / 관리자(ADMIN_USERNAME → "관리자" 탭)
```

## 4. 운영 배포 (Ubuntu VM + Nginx + systemd)

### 선택 이유
- **단일 VM**: SQLite 파일 DB·메모리 로그 버퍼를 쓰는 단일 프로세스 구조에 맞음. 비용 최소 (AWS Lightsail/EC2, GCP e2-micro, Oracle Free Tier 등)
- **Nginx**: React 정적 파일 서빙 + `/api` 리버스 프록시를 **같은 도메인**으로 → 세션 쿠키·CSRF 설정이 단순, CORS 불필요
- **systemd**: 프로세스 비정상 종료 시 자동 재시작(`Restart=always`), 부팅 시 자동 시작
- **certbot**: 무료 HTTPS → `Secure` 쿠키 사용 가능
- uvicorn `--workers 1`: SQLite 동시 쓰기와 메모리 링버퍼 일관성 유지 (PoC 규모 충분)

### 최초 설치
```bash
# 0) 서버 준비 (보안그룹/방화벽: 22, 80, 443 오픈)
sudo apt update && sudo apt install -y python3-venv nginx sqlite3 git rsync
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
sudo useradd -r -m -d /opt/chatlog chatlog

# 1) 코드
sudo -u chatlog git clone <REPO_URL> /opt/chatlog
cd /opt/chatlog/backend
sudo -u chatlog python3 -m venv .venv
sudo -u chatlog .venv/bin/pip install -r requirements.txt
sudo -u chatlog cp .env.example .env && sudo chmod 600 .env
sudo -u chatlog nano .env
#   APP_ENV=production
#   ANTHROPIC_API_KEY=...        DEMO_PASSWORD=...        ADMIN_PASSWORD=... (평가용 관리자, 강한 비밀번호)
#   SESSION_COOKIE_SECURE=true   ALLOWED_ORIGINS=https://<도메인>
#   DEMO_MODE=true  (평가 기간 시연용. 종료 후 false)

# 2) 프론트 빌드
cd /opt/chatlog/frontend && sudo -u chatlog npm ci && sudo -u chatlog npm run build
sudo mkdir -p /var/www/chatlog && sudo rsync -a --delete dist/ /var/www/chatlog/

# 3) systemd
sudo cp /opt/chatlog/deploy/systemd/chatlog.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now chatlog
sudo systemctl status chatlog

# 4) Nginx
sudo cp /opt/chatlog/deploy/nginx/chatlog.conf /etc/nginx/sites-available/chatlog.conf
sudo sed -i 's/chatlog.example.com/<도메인>/' /etc/nginx/sites-available/chatlog.conf
sudo ln -s /etc/nginx/sites-available/chatlog.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 5) HTTPS
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <도메인>
```

### 재배포
```bash
ssh <server> 'sudo -u chatlog bash /opt/chatlog/deploy/deploy.sh'
```
(`git pull` → pip → **pytest 통과 확인** → npm build → 정적 파일 교체 → 서비스 재시작 → health 확인)

### 운영 확인 명령
```bash
sudo systemctl status chatlog
sudo journalctl -u chatlog -n 50
tail -f /opt/chatlog/backend/logs/app.log
grep ai_call_failed /opt/chatlog/backend/logs/app.log
sqlite3 /opt/chatlog/backend/app.db < /opt/chatlog/backend/scripts/check_logs.sql
```

### 외부 접속 검증 (평가 전 필수)
```bash
# 서버 밖(다른 네트워크, 휴대폰 핫스팟 등)에서
curl -i https://<도메인>/api/health
BASE=https://<도메인> DEMO_PASSWORD=<값> ADMIN_PASSWORD=<값> bash backend/scripts/e2e_flow.sh
```

## 5. 트러블슈팅
| 증상 | 원인 / 해결 |
|------|-------------|
| 로그인 후에도 계속 401 | HTTP 로 접속 중인데 `SESSION_COOKIE_SECURE=true` → HTTPS 로 접속하거나 개발에서는 false |
| POST 가 403 FORBIDDEN_ORIGIN | `ALLOWED_ORIGINS` 에 실제 접속 도메인 누락, 또는 Nginx 에서 Host 전달 누락. **`$host` 는 포트를 제거**하므로 비표준 포트(예: 8443)에서는 `proxy_set_header Host $http_host` 사용 (검증 N06) |
| 64KB 넘는 요청이 413 | 의도된 제한 (`client_max_body_size 64k`) |
| `/chat` 새로고침 시 404 | Nginx `try_files ... /index.html` 누락 |
| 관리자 탭이 안 보임 | `ADMIN_PASSWORD` 비어 있음 → 로그 `admin_user_seeded` 없음. 설정 후 재시작 |
| 관리자 로그인 실패 | 계정이 이미 있으면 `.env` 비밀번호로 갱신되지 않음 (시드는 생성·승격만) |
| 항상 mock 응답 | `ANTHROPIC_API_KEY` 비어 있음 (`app_started ai_provider=mock` 로그로 확인) |
| 모든 질문이 AI_ERROR | 로그 `detail=auth_failed`(키 오류) / `rate_limited` / `status_5xx` 확인 |
| 502 Bad Gateway | uvicorn 중지 → `systemctl status chatlog`, `journalctl -u chatlog` |
