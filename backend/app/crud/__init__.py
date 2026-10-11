"""CRUD 계층 — DB 질의 전담. 라우터는 DB 를 직접 다루지 않는다 (04-database CRUD 계층 분리).

쓰기 함수는 기본으로 commit 한다. 여러 쓰기를 한 트랜잭션으로 묶을 때는 commit=False 로 호출하고
호출한 쪽에서 db.commit() 한다.
"""

# `from app import crud` 후 crud.user.get(...) 처럼 모듈 이름으로 호출할 수 있게 하위 모듈을 불러온다
from app.crud import chat_log, refresh_token, server_log, user

__all__ = ["user", "chat_log", "refresh_token", "server_log"]
