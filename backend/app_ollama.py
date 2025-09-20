import os, asyncio
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import PlainTextResponse, StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from llm_client_chatgpt import chat_once, chat_stream

# ---- Config ----
PRAYER_API_KEYS = {k.strip() for k in os.getenv("PRAYER_API_KEYS", "dev-secret-key").split(",") if k.strip()}
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT", "4"))
ALLOW_ORIGINS = os.getenv("ALLOW_ORIGINS", "*")
ALLOW_HEADERS = ["Content-Type", "x-api-key"]

app = FastAPI(title="Prayer_LLM _Service", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOW_ORIGINS] if ALLOW_ORIGINS != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=ALLOW_HEADERS,
)

gate = asyncio.Semaphore(MAX_CONCURRENT)

def require_api_key(req: Request):
    api_key = req.headers.get("x-api-key")
    if not api_key or api_key not in PRAYER_API_KEYS:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/pray_text", response_class=PlainTextResponse)
async def pray_text(req: Request):
    require_api_key(req)
    body = await req.json()
    prayer = (body.get("prayer") or "").strip()
    if not prayer:
        raise HTTPException(status_code=422, detail="Missing 'prayer' in body")
    async with gate:
        text = await chat_once(prayer)
        if not text:
            raise HTTPException(status_code=502, detail="Empty model response")
        return PlainTextResponse(text, media_type="text/plain; charset=utf-8")

@app.post("/pray")
async def pray(req: Request):
    require_api_key(req)
    body = await req.json()
    prayer = (body.get("prayer") or "").strip()
    if not prayer:
        raise HTTPException(status_code=422, detail="Missing 'prayer' in body")

    async def gen():
        async with gate:
            async for chunk in chat_stream(prayer):
                yield chunk

    return StreamingResponse(gen(), media_type="text/plain; charset=utf-8")

# ---- Optional: serve static frontend ----
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    async def root():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
