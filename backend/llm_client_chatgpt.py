import os
import yaml
from pathlib import Path
from typing import AsyncGenerator, Tuple, Optional

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

# ---------- Robust .env loading (NO GUESSWORK) ----------
BACKEND_DIR = Path(__file__).parent
ENV_FILE = BACKEND_DIR / ".env"  # /Users/software/development/prayer_llm_app/backend/.env
load_dotenv(ENV_FILE, override=False)  # load exactly this path; don't rely on CWD

# ---------- Config ----------
MODEL = os.getenv("PRAYER_MODEL", "gpt-4o-mini")
PROMPT_PATH = os.getenv("PRAYER_PROMPT_PATH", str(BACKEND_DIR / "prompts" / "prayer_prompt.yaml"))
TEMPERATURE = float(os.getenv("PRAYER_TEMPERATURE", "0.7"))
MAX_TOKENS = int(os.getenv("PRAYER_MAX_TOKENS", "1000"))

# Lazy singleton so import never crashes
_LLM: Optional[ChatOpenAI] = None

def _load_prompt() -> Tuple[str, str]:
    """
    YAML keys:
      system: "..."
      user: "..."
    """
    p = Path(PROMPT_PATH)
    if p.exists():
        try:
            with p.open("r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
        except Exception:
            data = {}
    else:
        data = {}
    system = data.get("system") or (
        "You are a compassionate, benevolent guide who answers prayers. "
        "If the prayer is kind and reasonable, offer clear, practical steps. "
        "If harmful or impossible, gently decline with empathy and guidance."
    )
    user = data.get("user") or "A user submits the following prayer:"
    return system.strip(), user.strip()

def _get_llm() -> ChatOpenAI:
    global _LLM
    if _LLM is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                f"OPENAI_API_KEY not found in {ENV_FILE}. "
                "Add it there as OPENAI_API_KEY=sk-..."
            )
        # Optional: support org/project if your account requires it
        org_id = os.getenv("OPENAI_ORG_ID")
        project = os.getenv("OPENAI_PROJECT")
        base_url = os.getenv("OPENAI_BASE_URL")  # usually not needed

        kwargs = dict(
            model=MODEL,
            api_key=api_key,
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS,
            presence_penalty=0.6,
            frequency_penalty=0.0,
            streaming=True,
            timeout=60,
        )
        if org_id:
            kwargs["organization"] = org_id  # langchain_openai forwards it
        if base_url:
            kwargs["base_url"] = base_url     # custom proxy/base if used
        if project:
            # langchain_openai uses the official OpenAI client under the hood; setting env works:
            os.environ["OPENAI_PROJECT"] = project

        _LLM = ChatOpenAI(**kwargs)
    return _LLM

# ---------- Public async API (app.py imports these) ----------
async def chat_once(prayer: str) -> str:
    system_prompt, user_prompt = _load_prompt()
    msgs = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"{user_prompt}\n\n{prayer}".strip()},
    ]
    resp = await _get_llm().ainvoke(msgs)
    return resp.content or ""

async def chat_stream(prayer: str) -> AsyncGenerator[str, None]:
    system_prompt, user_prompt = _load_prompt()
    msgs = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"{user_prompt}\n\n{prayer}".strip()},
    ]
    async for chunk in _get_llm().astream(msgs):
        if getattr(chunk, "content", None):
            yield chunk.content