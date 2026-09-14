import os
import requests
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel

load_dotenv()

app = FastAPI()

COPA_API_KEY = os.getenv("COPA_API_KEY")


class ChatRequest(BaseModel):
    message: str


@app.get("/")
def home():
    return {"message": "AI Chatbot Server"}


@app.post("/chat")
def chat(request: ChatRequest):
    response = requests.post(
        "https://copa.codyssey.kr/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {COPA_API_KEY}"
        },
        json={
            "model": "gpt-5-mini",
            "messages": [
                {
                    "role": "user",
                    "content": request.message
                }
            ],
        },
        timeout=30,
    )

    return response.json()
