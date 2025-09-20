import os, json
from typing import AsyncGenerator
import httpx
import yaml
from pathlib import Path

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
MODEL = os.getenv("PRAYER_MODEL", "llama3.1:8b")
PROMPT_PATH = os.getenv("PRAYER_PROMPT_PATH", str(Path(__file__).parent / "prompts" / "prayer_prompt.yaml"))

def _load_prompt():
    with open(PROMPT_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data.get("system", ""), data.get("template", "{prayer}")

_SYSTEM, _TEMPLATE = _load_prompt()

def _user_msg(prayer: str) -> str:
    return _TEMPLATE.replace("{prayer}", prayer)

async def chat_once(prayer: str, *, temperature: float = 0.5, num_predict: int = 512) -> str:
    payload = {
        "model": MODEL,
        "stream": False,
        "messages": [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": _user_msg(prayer)},
        ],
        "options": {"num_predict": num_predict, "temperature": temperature},
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, read=120.0)) as client:
        r = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
        r.raise_for_status()
        data = r.json()
        return (data.get("message") or {}).get("content", "").strip()

async def chat_stream(prayer: str, *, temperature: float = 0.5, num_predict: int = 512) -> AsyncGenerator[str, None]:
    payload = {
        "model": MODEL,
        "stream": True,
        "messages": [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": _user_msg(prayer)},
        ],
        "options": {"num_predict": num_predict, "temperature": temperature},
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, read=120.0)) as client:
        async with client.stream("POST", f"{OLLAMA_URL}/api/chat", json=payload) as r:
            async for line in r.aiter_lines():
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                chunk = (obj.get("message") or {}).get("content", "")
                if chunk:
                    yield chunk
                if obj.get("done"):
                    break
