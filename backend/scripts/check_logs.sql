-- DB 확인용 SQL (04-database §DB 확인 방법)
-- 실행: sqlite3 data/app.db < scripts/check_logs.sql      (backend/ 에서)
.headers on
.mode column

.print '== 사용자별 대화 수 (성공/실패) =='
SELECT u.id, u.email, u.nickname, u.role,
       COALESCE(SUM(c.status = 'success'), 0) AS success,
       COALESCE(SUM(c.status = 'error'), 0)   AS error
FROM users u LEFT JOIN chat_logs c ON c.user_id = u.id
GROUP BY u.id ORDER BY u.id;

.print ''
.print '== 최근 대화 20건 =='
SELECT c.id, u.email, c.created_at, c.status, c.error_code, c.latency_ms, c.request_id,
       substr(c.question, 1, 40) AS question
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
SELECT COUNT(*) AS total,
       COALESCE(SUM(expires_at > datetime('now')), 0) AS valid,
       COALESCE(SUM(expires_at <= datetime('now')), 0) AS expired
FROM refresh_tokens;
