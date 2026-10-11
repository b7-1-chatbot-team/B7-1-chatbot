-- DB 확인용 SQL (04-database DB 확인 방법)
-- 평가자·팀원이 API 없이 SQLite 파일을 직접 열어 저장 상태를 확인할 때 사용한다.
-- 실행: sqlite3 data/app.db < scripts/check_logs.sql      (backend/ 에서)
-- 결과에 컬럼 이름을 표시하고 표 형태로 정렬해서 출력 (sqlite3 CLI 설정)
.headers on
.mode column

.print '== 사용자별 대화 수 (성공/실패) =='
SELECT u.id, u.email, u.nickname, u.role,
       -- SQLite 는 비교식이 1/0 이라 SUM 으로 개수를 센다. 대화가 없으면 NULL → COALESCE 로 0
       COALESCE(SUM(c.status = 'success'), 0) AS success,
       COALESCE(SUM(c.status = 'error'), 0)   AS error
-- LEFT JOIN: 대화가 없는 사용자도 목록에 포함
FROM users u LEFT JOIN chat_logs c ON c.user_id = u.id
GROUP BY u.id ORDER BY u.id;

.print ''
.print '== 최근 대화 20건 =='
SELECT c.id, u.email, c.created_at, c.status, c.error_code, c.latency_ms, c.request_id,
       substr(c.question, 1, 40) AS question  -- 긴 질문은 40자까지만 표시
FROM chat_logs c JOIN users u ON u.id = c.user_id
ORDER BY c.id DESC LIMIT 20;

.print ''
.print '== 최근 AI 실패 요청의 흐름 (server_logs) =='
-- 특정 요청을 보려면 아래 서브쿼리 대신 request_id 를 직접 넣는다: WHERE request_id = '351990af2cf2'
SELECT created_at, level, event, user_id, detail FROM server_logs
WHERE request_id = (SELECT request_id FROM chat_logs WHERE status = 'error' ORDER BY id DESC LIMIT 1)
ORDER BY id;

.print ''
.print '== 비밀번호 평문 저장 여부 (bcrypt prefix $2b$, 길이 60) =='
SELECT email, substr(hashed_password, 1, 4) AS hash_prefix, length(hashed_password) AS len FROM users;

.print ''
.print '== refresh token (해시만 저장, 유효/만료 건수) =='
-- datetime('now') 는 UTC 기준이라 DB 에 UTC 로 저장한 expires_at 과 바로 비교할 수 있다
SELECT COUNT(*) AS total,
       COALESCE(SUM(expires_at > datetime('now')), 0) AS valid,
       COALESCE(SUM(expires_at <= datetime('now')), 0) AS expired
FROM refresh_tokens;
