# backend/app.py
import os
import json
import asyncio
import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

# ----- Config -----
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
MODEL = os.getenv("PRAYER_MODEL", "llama3.1:8b")
PRAYER_API_KEYS = {
    k.strip() for k in os.getenv("PRAYER_API_KEYS", "dev-secret-key").split(",")
    if k.strip()
}
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT", "4"))  # throttle concurrent requests

# Enable CORS if you plan to host frontend separately (e.g., Vercel/Netlify)
ALLOW_ORIGINS = os.getenv("ALLOW_ORIGINS", "*")
ALLOW_HEADERS = ["Content-Type", "x-api-key"]

# Divine prompt template
PROMPT_TEMPLATE = """You are a benevolent and all-powerful deity who listens to the prayers of mortals.
You have the ability to grant wishes, offer blessings, and guide people toward what is possible.
Your role is to respond with compassion, wisdom, and authority — as a god who can truly grant or deny requests.

A mortal prays:
"{prayer}"

Your sacred duties:
- If the prayer is kind, reasonable, and aligned with good intentions:
    • Grant the wish.
    • Provide a clear, step-by-step plan or path the mortal can follow to achieve it.
    • Speak with encouragement and divine reassurance.
- If the prayer is harmful, selfish, impossible, or rooted in ill will:
    • Gently deny the request.
    • Offer a compassionate explanation for why it cannot be granted.
    • Redirect the mortal toward a wiser, positive path.

Respond in a divine yet warm tone, as though your words are blessings.
End your answer with a short closing phrase, like "Go forth with my blessing."

Answer:
"""

app = FastAPI(title="Prayer LLM Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOW_ORIGINS] if ALLOW_ORIGINS != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=ALLOW_HEADERS,
)

# Throttle concurrent calls to avoid overloading your box
gate = asyncio.Semaphore(MAX_CONCURRENT)

# ---- Auth helper ----
def require_api_key(req: Request):
    api_key = req.headers.get("x-api-key")
    if not api_key or api_key not in PRAYER_API_KEYS:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

# ---- Streaming with Ollama ----
async def stream_ollama_answer(prayer: str):
    payload = {
        "model": MODEL,
        "stream": True,
        "messages": [
            {"role": "system", "content": "You are a prayer-answering deity."},
            {"role": "user", "content": PROMPT_TEMPLATE.format(prayer=prayer)},
        ],
        "options": {
            "num_predict": 512,
            "temperature": 0.5,
        },
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, read=120.0)) as client:
        async with client.stream("POST", f"{OLLAMA_URL}/api/chat", json=payload) as r:
            async for line in r.aiter_lines():
                if not line:
                    continue
                # Each line is JSON like: {"message":{"content":"..."}, "done": false}
                try:
                    data = json.loads(line)
                    chunk = data.get("message", {}).get("content", "")
                    if chunk:
                        # Yield raw text so the browser can render it progressively
                        yield chunk
                    if data.get("done"):
                        break
                except json.JSONDecodeError:
                    # Ignore partial lines
                    continue

@app.get("/health")
async def health():
    return {"ok": True, "model": MODEL}

@app.post("/pray")
async def pray(req: Request):
    require_api_key(req)
    body = await req.json()
    prayer = (body.get("prayer") or "").strip()
    if not prayer:
        raise HTTPException(status_code=422, detail="Missing 'prayer' in body")

    async with gate:
        return StreamingResponse(
            stream_ollama_answer(prayer),
            media_type="text/plain; charset=utf-8",
        )

# ---- (Optional) Serve the frontend from / ----
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    async def root():
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        return FileResponse(index_path)
