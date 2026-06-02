"""
words.py — Liste de mots et sélection déterministe du mot quotidien.

Utilise le dictionnaire complet généré par build_vocab.py.
La sélection se fait parmi les 3000 premiers mots (les plus fréquents)
pour s'assurer que le mot à deviner est connu de tous.
"""

import os
import json
import hashlib
from datetime import date

_vocab = None

def get_vocab() -> list[str]:
    """Charge le vocabulaire généré s'il n'est pas déjà chargé."""
    global _vocab
    if _vocab is None:
        try:
            with open("vocab.json", "r", encoding="utf-8") as f:
                _vocab = json.load(f)
        except Exception:
            # Fallback de secours si le dictionnaire n'est pas encore construit
            _vocab = ["pendule", "maison", "soleil", "voiture", "jardin"]
    return _vocab

def get_daily_word(target_date: date | None = None) -> str:
    """
    Renvoie le mot secret du jour de manière déterministe.
    Sélectionne parmi les 3000 mots les plus fréquents.
    """
    if target_date is None:
        target_date = date.today()

    vocab = get_vocab()
    # On se restreint aux 3000 premiers mots (les plus fréquents) pour éviter un mot trop obscur
    pool_size = min(3000, len(vocab))
    
    date_str = target_date.isoformat()  # format AAAA-MM-JJ
    hash_hex = hashlib.sha256(date_str.encode("utf-8")).hexdigest()
    index = int(hash_hex, 16) % pool_size
    
    return vocab[index]
