"""
main.py — Point d'entrée FastAPI pour Cémantix De Wish.

Endpoints :
    GET  /api/game/status     → Statut du jeu (date, trouvé ou non)
    POST /api/game/guess       → Soumettre un mot
    GET  /api/game/hint-count  → Nombre d'indices restants (géré côté client)
    POST /api/chat             → Demander un indice au chatbot
"""

from contextlib import asynccontextmanager
from datetime import date
import os
from dotenv import load_dotenv

# Charger les variables d'environnement depuis le fichier .env
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from game import load_model, compute_score
from words import get_daily_word
from chatbot import get_hint
from quota import get_status as get_quota_status

# ── Rate Limiting ────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ── Lifecycle : chargement du modèle au démarrage ───────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Charge les embeddings FastText au démarrage."""
    print("[...] Chargement des embeddings FastText...")
    load_model()
    print("[OK] Embeddings chargés avec succès.")
    yield
    print("[STOP] Arrêt du serveur.")


app = FastAPI(
    title="Sémantix+ API",
    description="API backend pour le jeu de devinette sémantique quotidien.",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────────────

# En production, définir ALLOWED_ORIGINS dans les variables d'environnement
# Ex: ALLOWED_ORIGINS=https://cemantix-de-wish.vercel.app,https://mon-domaine.com
_default_origins = "http://localhost:5173,http://localhost:3000,https://cemantix-de-wish.vercel.app,https://cemantish.vercel.app"
_origins = os.environ.get("ALLOWED_ORIGINS", _default_origins).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Modèles de requêtes / réponses ──────────────────────────────────

class GuessRequest(BaseModel):
    word: str


class GuessResponse(BaseModel):
    word: str
    score: float
    is_top_1000: bool
    found: bool


class ChatRequest(BaseModel):
    message: str
    guesses: list[dict] = []
    hint_number: int = 1
    conversation_history: list[dict] = []
    personality: str = "coach"  # "coach" | "sphinx" | "professor"


class ChatResponse(BaseModel):
    reply: str


class StatusResponse(BaseModel):
    date: str
    game_active: bool


# ── Endpoints ────────────────────────────────────────────────────────

@app.get("/api/game/status", response_model=StatusResponse)
async def game_status():
    """Renvoie la date du jour et indique que le jeu est actif."""
    today = date.today().isoformat()
    return StatusResponse(date=today, game_active=True)


@app.post("/api/game/guess", response_model=GuessResponse)
@limiter.limit("60/minute")
async def game_guess(req: GuessRequest, request: Request):
    """
    Soumet un mot et renvoie le score de similarité sémantique.
    """
    word = req.word.strip()
    if not word:
        raise HTTPException(status_code=400, detail="Le mot ne peut pas être vide.")

    if len(word) > 50:
        raise HTTPException(status_code=400, detail="Le mot est trop long (50 caractères max).")

    secret = get_daily_word()
    result = compute_score(word, secret)

    # Mot inconnu du vocabulaire FastText
    if result.get("unknown"):
        raise HTTPException(
            status_code=404,
            detail=f"Le mot '{word}' n'est pas dans le dictionnaire du jeu."
        )

    return GuessResponse(
        word=result["word"],
        score=result["score"],
        is_top_1000=result["is_top_1000"],
        found=result["found"],
    )


@app.get("/api/game/hint-count")
async def hint_count():
    """
    Renvoie la limite d'indices par jour.
    Le comptage effectif se fait côté client (localStorage).
    """
    return {"max_hints": 3}


@app.get("/api/quota/status")
async def quota_status():
    """
    Retourne l'état du quota journalier Gemini.
    Utile pour le monitoring et le débogage.
    """
    return get_quota_status()


@app.post("/api/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
def chat(req: ChatRequest, request: Request):
    """
    Envoie un message au chatbot Gemini et renvoie la réponse.
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Le message ne peut pas être vide.")

    if req.hint_number > 3:
        return ChatResponse(
            reply="Tu as utilisé tes 3 indices pour aujourd'hui. Reviens demain pour de nouveaux indices !"
        )

    secret = get_daily_word()

    try:
        reply = get_hint(
            secret_word=secret,
            player_message=req.message,
            guesses=req.guesses,
            hint_number=req.hint_number,
            conversation_history=req.conversation_history,
            personality=req.personality,
        )
    except Exception as e:
        print(f"Erreur chatbot : {e}")
        raise HTTPException(
            status_code=500,
            detail="Erreur lors de la communication avec le chatbot.",
        )

    return ChatResponse(reply=reply)
