# 0) Make sure Ollama is running and model is pulled
ollama serve
ollama pull llama3.1:8b

# 1) Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
