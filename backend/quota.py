"""
quota.py — Compteur journalier des appels à l'API Gemini.

Maintient un compteur en mémoire (remis à zéro automatiquement chaque jour).
Si le quota quotidien est atteint, les appels à Gemini sont bloqués
et une réponse de secours est retournée au joueur.

Quota gratuit Gemini 2.0 Flash : 1 500 requêtes / jour.
On prend une marge de sécurité et on limite à 1 400.
"""

from datetime import date

# ── Configuration ────────────────────────────────────────────────────

# Limite journalière (en dessous du free tier de 1500 req/jour)
DAILY_LIMIT = 1400

# ── État en mémoire ──────────────────────────────────────────────────

_state = {
    "date": None,      # Date du comptage (format YYYY-MM-DD)
    "count": 0,        # Nombre d'appels effectués aujourd'hui
}


def _reset_if_new_day():
    """Remet le compteur à zéro si on a changé de jour."""
    today = date.today().isoformat()
    if _state["date"] != today:
        _state["date"] = today
        _state["count"] = 0


def can_call_gemini() -> bool:
    """Retourne True si on peut encore appeler Gemini aujourd'hui."""
    _reset_if_new_day()
    return _state["count"] < DAILY_LIMIT


def increment_counter():
    """Incrémente le compteur après un appel réussi à Gemini."""
    _reset_if_new_day()
    _state["count"] += 1


def get_status() -> dict:
    """Retourne l'état actuel du quota (pour le endpoint de monitoring)."""
    _reset_if_new_day()
    return {
        "date": _state["date"],
        "calls_today": _state["count"],
        "daily_limit": DAILY_LIMIT,
        "calls_remaining": max(0, DAILY_LIMIT - _state["count"]),
        "quota_reached": _state["count"] >= DAILY_LIMIT,
    }
