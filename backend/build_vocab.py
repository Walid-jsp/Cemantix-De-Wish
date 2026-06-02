"""
build_vocab.py — Génère vocab.json et embeddings.npy à partir de FastText français.

Utilise les embeddings FastText de Facebook (cc.fr.300) entraînés sur
Wikipedia + Common Crawl français. Ces embeddings sont conçus pour la
comparaison de mots individuels, comme dans le jeu Cémantix original.

Deux options :
  - cc.fr.300.vec.gz (~2.6 Go) : vecteurs texte, on lit uniquement les mots nécessaires
  - cc.fr.300.bin    (~4.2 Go) : modèle complet avec gensim (permet les OOV)

Le .vec.gz est recommandé car on peut lire seulement ce dont on a besoin.
Téléchargez depuis : https://fasttext.cc/docs/en/crawl-vectors.html
  curl -L "https://dl.fbaipublicfiles.com/fasttext/vectors-crawl/cc.fr.300.vec.gz" -o cc.fr.300.vec.gz
"""

import os
import json
import re
import gzip
import numpy as np

# ── Paramètres ────────────────────────────────────────────────────────

VOCAB_SIZE = 30000      # Nombre de mots dans le dictionnaire de rang
FASTTEXT_VEC_GZ = "cc.fr.300.vec.gz"  # Format texte gzippé
FASTTEXT_VEC    = "cc.fr.300.vec"     # Format texte décompressé
FASTTEXT_BIN    = "cc.fr.300.bin"     # Format binaire (gensim)

# ── Chargement des vecteurs ───────────────────────────────────────────

def load_vectors_from_vec(filepath, target_words: set) -> dict:
    """
    Lit un fichier .vec ou .vec.gz et extrait uniquement les vecteurs
    des mots présents dans target_words. Économise beaucoup de RAM.
    """
    vectors = {}
    opener = gzip.open if filepath.endswith(".gz") else open

    print(f"[...] Lecture de {filepath} (lecture streaming, peut prendre quelques minutes)...")
    with opener(filepath, "rt", encoding="utf-8") as f:
        # Première ligne : nb_mots dimension
        header = f.readline()
        parts = header.strip().split()
        nb_words, dim = int(parts[0]), int(parts[1])
        print(f"      {nb_words:,} mots, {dim} dimensions")

        count = 0
        for line in f:
            try:
                tokens = line.rstrip().split(" ")
                word = tokens[0]
                if word in target_words:
                    vec = np.array(tokens[1:], dtype=np.float32)
                    vectors[word] = vec
                    count += 1
                    if count % 1000 == 0:
                        print(f"\r      {count}/{len(target_words)} mots trouvés...", end="", flush=True)
                    if count == len(target_words):
                        break  # On a tout trouvé
            except Exception:
                continue
    print(f"\r      [OK] {len(vectors)}/{len(target_words)} mots extraits.          ")
    return vectors


def load_vectors_from_bin(filepath, target_words: set) -> dict:
    """Charge le modèle .bin gensim et extrait les vecteurs."""
    print(f"[...] Chargement du modèle binaire {filepath}...")
    from gensim.models.fasttext import load_facebook_model
    model = load_facebook_model(filepath)
    wv = model.wv
    vectors = {}
    for word in target_words:
        vectors[word] = wv[word].astype(np.float32)
    return vectors


# ── Construction du vocabulaire ──────────────────────────────────────

def build_vocab():
    # ── Étape 1 : Télécharger Lexique383 ────────────────────────────
    print("[...] Téléchargement de Lexique383 pour la liste de fréquence...")
    import requests
    URL = "http://www.lexique.org/databases/Lexique383/Lexique383.tsv"
    response = requests.get(URL, headers={"User-Agent": "Mozilla/5.0"})
    response.raise_for_status()

    text = response.content.decode("utf-8")
    lines = text.splitlines()
    print(f"[OK] {len(lines)} lignes brutes.")

    # ── Étape 2 : Filtrer les lemmes ────────────────────────────────
    pattern = re.compile(r"^[a-zàâäéèêëïîôöùûüç\-]+$")
    lemmas_freq = {}

    for i, line in enumerate(lines):
        if i == 0:
            continue
        parts = line.split("\t")
        if len(parts) < 8:
            continue
        ortho = parts[0].strip().lower()
        lemme = parts[2].strip().lower()
        cgram = parts[3].strip().upper()
        try:
            freq = float(parts[7]) if parts[7] else 0.0
        except ValueError:
            freq = 0.0

        if ortho == lemme and len(lemme) >= 3 and pattern.match(lemme):
            if cgram in ["NOM", "VER", "ADJ"]:
                lemmas_freq[lemme] = max(lemmas_freq.get(lemme, 0.0), freq)

    sorted_lemmas = sorted(lemmas_freq.items(), key=lambda x: x[1], reverse=True)
    candidate_words = [w for w, _ in sorted_lemmas]
    target_set = set(candidate_words[:VOCAB_SIZE * 2])  # marge pour les absences
    print(f"[OK] {len(candidate_words)} candidats, {len(target_set)} mots cibles pour FastText.")

    # ── Étape 3 : Charger les vecteurs ──────────────────────────────
    if os.path.exists(FASTTEXT_VEC_GZ):
        vectors = load_vectors_from_vec(FASTTEXT_VEC_GZ, target_set)
    elif os.path.exists(FASTTEXT_VEC):
        vectors = load_vectors_from_vec(FASTTEXT_VEC, target_set)
    elif os.path.exists(FASTTEXT_BIN):
        vectors = load_vectors_from_bin(FASTTEXT_BIN, target_set)
    else:
        raise FileNotFoundError(
            "Aucun fichier FastText trouvé !\n"
            "Téléchargez cc.fr.300.vec.gz depuis : https://fasttext.cc/docs/en/crawl-vectors.html\n"
            f"  -> Attendu : {os.path.abspath(FASTTEXT_VEC_GZ)}"
        )

    # ── Étape 4 : Construire le vocab final ──────────────────────────
    vocab_words = []
    embeddings = []

    for word in candidate_words:
        if len(vocab_words) >= VOCAB_SIZE:
            break
        if word in vectors:
            vocab_words.append(word)
            embeddings.append(vectors[word])

    print(f"[OK] {len(vocab_words)} mots retenus pour le dictionnaire.")

    if len(vocab_words) < 5000:
        print(f"[WARN] Seulement {len(vocab_words)} mots trouvés dans FastText.")
        print("       Le fichier FastText est peut-être incomplet ou corrompu.")

    # ── Étape 5 : Sauvegarde ────────────────────────────────────────
    print("[...] Sauvegarde...")
    with open("vocab.json", "w", encoding="utf-8") as f:
        json.dump(vocab_words, f, ensure_ascii=False)

    np.save("embeddings.npy", np.array(embeddings, dtype=np.float32))
    print("[OK] `vocab.json` et `embeddings.npy` générés avec FastText.")
    print(f"     {len(vocab_words)} mots dans le dictionnaire.")


if __name__ == "__main__":
    build_vocab()
