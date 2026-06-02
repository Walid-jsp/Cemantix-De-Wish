"""
game.py — Moteur de similarité sémantique pour Sémantix+.

Utilise les embeddings FastText français pré-calculés (cc.fr.300).
Ces embeddings sont entraînés sur Wikipedia + Common Crawl français
et sont conçus pour la comparaison de mots individuels.

Le rang d'un mot = combien de mots du vocabulaire sont plus similaires
au mot secret. Score = 1000 - rang (Top 1000 = score > 0).
"""

import json
import os
import numpy as np

# ── État global ──────────────────────────────────────────────────────

_vocab_embeddings: np.ndarray | None = None
_vocab: list[str] = []
_vocab_index: dict[str, int] = {}   # lookup O(1)

# Cache pour le mot du jour afin d'éviter de recalculer les similarités
_daily_cache = {
    "secret": "",
    "similarities": None,
    "secret_emb": None,
}


def load_model():
    """Charge les embeddings pré-calculés au démarrage de FastAPI."""
    global _vocab_embeddings, _vocab, _vocab_index

    if not os.path.exists("vocab.json") or not os.path.exists("embeddings.npy"):
        raise FileNotFoundError(
            "Le dictionnaire pré-calculé est introuvable. "
            "Lancez build_vocab.py d'abord."
        )

    if not _vocab:
        print("[...] Chargement de vocab.json...")
        with open("vocab.json", "r", encoding="utf-8") as f:
            _vocab = json.load(f)
        # Index pour lookup O(1)
        _vocab_index = {word: i for i, word in enumerate(_vocab)}

        print("[...] Chargement des embeddings FastText pré-calculés...")
        raw_embs = np.load("embeddings.npy")
        # Normalisation (cos_sim == dot_product avec vecteurs unitaires)
        norms = np.linalg.norm(raw_embs, axis=1, keepdims=True)
        norms[norms == 0] = 1
        _vocab_embeddings = (raw_embs / norms).astype(np.float32)
        print(f"[OK] {len(_vocab)} mots chargés (embeddings FastText {raw_embs.shape[1]}D).")


def get_model():
    """Compatibilité avec main.py (retourne None, non utilisé)."""
    return None


def _get_embedding(word: str) -> np.ndarray | None:
    """
    Retourne l'embedding normalisé d'un mot depuis le vocabulaire pré-calculé.
    Retourne None si le mot est inconnu.
    """
    idx = _vocab_index.get(word)
    if idx is not None:
        return _vocab_embeddings[idx]
    return None


# ── Calcul du score et du rang ───────────────────────────────────────

def _update_daily_cache(secret: str):
    """Calcule et met en cache les similarités de tout le vocabulaire avec le mot secret."""
    global _daily_cache
    if _daily_cache["secret"] == secret:
        return

    secret_emb = _get_embedding(secret)
    if secret_emb is None:
        raise ValueError(f"Le mot secret '{secret}' n'est pas dans le vocabulaire.")

    # Produit scalaire = cosinus avec vecteurs normalisés
    similarities = np.dot(_vocab_embeddings, secret_emb)

    _daily_cache["secret"] = secret
    _daily_cache["secret_emb"] = secret_emb
    _daily_cache["similarities"] = similarities


def compute_score(guess: str, secret: str) -> dict:
    """
    Calcule le score d'un mot en fonction de son rang dans le vocabulaire.

    - Rang 1    → score 999  (2ᵉ mot le plus proche après le secret lui-même)
    - Rang 999  → score 1    (dernier du Top 1000)
    - Rang 1000 → hors Top, score = similarité en % (0–100)
    """
    clean_guess = guess.strip().lower()
    clean_secret = secret.strip().lower()

    # Égalité stricte
    if clean_guess == clean_secret:
        return {"word": clean_guess, "score": 1000, "is_top_1000": True, "found": True}

    _update_daily_cache(clean_secret)

    guess_emb = _get_embedding(clean_guess)

    if guess_emb is None:
        # Mot inconnu du vocabulaire FastText
        return {
            "word": clean_guess,
            "score": 0.0,
            "is_top_1000": False,
            "found": False,
            "unknown": True,
        }

    # Similarité cosinus entre le mot proposé et le mot secret
    similarity = float(np.dot(guess_emb, _daily_cache["secret_emb"]))

    # Rang = nombre de mots du vocab strictement plus similaires (petite marge flottante)
    rank = int(np.sum(_daily_cache["similarities"] > (similarity + 1e-5)))

    if rank < 1000:
        score = 1000 - rank
        is_top_1000 = True
    else:
        # Hors Top 1000 : similarité brute en % (0–100)
        score = round(max(0.0, similarity) * 100, 2)
        is_top_1000 = False

    return {"word": clean_guess, "score": score, "is_top_1000": is_top_1000, "found": False}
