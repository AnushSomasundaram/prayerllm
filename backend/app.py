import os
import asyncio
from typing import AsyncGenerator

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv
load_dotenv() 

# Import from SAME directory
from llm_client_chatgpt import chat_once, chat_stream

PRAYER_API_KEYS = {k.strip() for k in os.getenv("PRAYER_API_KEYS", "").split(",") if k.strip()}
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT", "4"))
ALLOW_ORIGINS = os.getenv("ALLOW_ORIGINS", "*")

app = FastAPI(title="Prayer LLM Service", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOW_ORIGINS] if ALLOW_ORIGINS != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Content-Type", "x-api-key"],
)

gate = asyncio.Semaphore(MAX_CONCURRENT)

def _require_api_key(req: Request):
    key = (req.headers.get("x-api-key") or "").strip()
    if not key or key not in PRAYER_API_KEYS:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

@app.get("/")
def root():
    return {"ok": True, "service": "prayer-llm", "version": "2.1.0"}

# app.py
from fastapi import FastAPI

app = FastAPI(title="Prayer LLM Service", version="1.1.0")

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.get("/health")
def health():
    return {"ok": True}

# Helpful diagnostic to prove env + model are visible (does NOT leak secrets)
@app.get("/_diag")
def diag():
    from pathlib import Path
    return {
        "cwd": str(Path.cwd()),
        "env_file_checked": str(Path(__file__).parent / ".env"),
        "has_openai_key": bool(os.getenv("OPENAI_API_KEY")),
        "model": os.getenv("PRAYER_MODEL"),
        "prompt_path": os.getenv("PRAYER_PROMPT_PATH"),
        "allow_origins": ALLOW_ORIGINS,
        "max_concurrent": MAX_CONCURRENT,
    }

@app.post("/pray_text")
async def pray_text(req: Request):
    _require_api_key(req)
    data = await req.json()
    prayer = (data.get("prayer") or "").strip()
    if not prayer:
        raise HTTPException(status_code=400, detail="Missing 'prayer'")
    async with gate:
        text = await chat_once(prayer)
        return JSONResponse({"text": text})

@app.post("/pray")
async def pray(req: Request):
    _require_api_key(req)
    data = await req.json()
    prayer = (data.get("prayer") or "").strip()
    if not prayer:
        raise HTTPException(status_code=400, detail="Missing 'prayer'")

    async def streamer() -> AsyncGenerator[bytes, None]:
        async with gate:
            async for piece in chat_stream(prayer):
                yield piece.encode("utf-8")

    return StreamingResponse(streamer(), media_type="text/plain")