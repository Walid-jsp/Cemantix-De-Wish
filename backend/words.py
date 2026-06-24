"""
words.py — Liste de mots et sélection déterministe du mot quotidien.

Utilise le dictionnaire complet généré par build_vocab.py.
La sélection se fait parmi les 8000 premiers mots (les plus fréquents)
pour offrir plus de variété tout en garantissant des mots connus.
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
            # On cherche vocab.json dans le même dossier que ce script (backend)
            vocab_path = os.path.join(os.path.dirname(__file__), "vocab.json")
            with open(vocab_path, "r", encoding="utf-8") as f:
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
    # On se restreint aux 8000 premiers mots (les plus fréquents) pour offrir plus de variété
    # tout en évitant les termes trop rares ou obscurs
    pool_size = min(8000, len(vocab))
    
    date_str = target_date.isoformat()  # format AAAA-MM-JJ
    hash_hex = hashlib.sha256(date_str.encode("utf-8")).hexdigest()
    index = int(hash_hex, 16) % pool_size
    
    return vocab[index]

if __name__ == "__main__":
    import sys
    from datetime import datetime

    if len(sys.argv) > 1:
        # Permet de passer une date en argument, ex: python words.py 2026-06-25
        try:
            target = datetime.strptime(sys.argv[1], "%Y-%m-%d").date()
            print(f"Le mot secret pour le {target.isoformat()} est : \033[1;32m{get_daily_word(target)}\033[0m")
        except ValueError:
            print("Format de date invalide. Utilisez AAAA-MM-JJ.")
    else:
        print(f"Le mot secret d'aujourd'hui est : \033[1;32m{get_daily_word()}\033[0m")
