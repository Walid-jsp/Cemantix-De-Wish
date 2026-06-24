# 🧠 Cémantish

> Un jeu de devinette quotidien basé sur la **similarité sémantique** — trouve le mot secret grâce à l'IA.

Inspiré du jeu [Cémantix](https://cemantix.certitudes.org/), cette version personnalisée utilise les embeddings **FastText français** de Facebook pour mesurer la proximité sémantique entre les mots.

---

## 🎮 Comment jouer

1. **Tape un mot** dans la barre de recherche et clique sur **Deviner**
2. Le jeu te dit à quel point ton mot est proche du mot secret (score de 0 à 1000)
3. **Top 1000** 🔥 → ton mot est parmi les 1000 mots les plus proches du secret
4. **Hors Top** ❄️ → ton mot est trop éloigné (affichage en pourcentage brut)
5. Un nouveau mot secret est disponible chaque jour
6. Tu peux demander des **indices** au chatbot IA (5 par jour max)

### Système de score

| Score | Signification |
|-------|--------------|
| **1000** | C'est le mot secret ! 🏆 |
| **900–999** | Extrêmement proche 🔥 |
| **600–899** | Très proche ✨ |
| **200–599** | Proche 💡 |
| **1–199** | Dans le Top 1000 mais encore loin |
| **xx%** | Hors Top 1000 ❄️ |

---

## 🏗️ Architecture

```
Cémantish/
├── backend/                  # API Python (FastAPI)
│   ├── main.py               # Endpoints HTTP
│   ├── game.py               # Moteur de similarité sémantique
│   ├── words.py              # Sélection du mot du jour
│   ├── chatbot.py            # Indice via Gemini (Google AI)
│   ├── build_vocab.py        # Script de génération des embeddings
│   ├── vocab.json            # 30 000 mots français (généré)
│   ├── embeddings.npy        # Matrice 30 000 × 300 FastText (générée)
│   ├── requirements.txt
│   └── .env                  # Clé API Gemini (non committé)
└── frontend/                 # Interface React (Vite)
    ├── src/
    │   ├── App.jsx           # Composant principal
    │   ├── api.js            # Appels HTTP
    │   ├── utils.js          # Helpers (localStorage, etc.)
    │   ├── index.css         # Styles (design system complet)
    │   └── components/
    │       ├── GuessList.jsx      # Liste des tentatives
    │       ├── VictoryScreen.jsx  # Écran de victoire + confettis
    │       └── ChatWidget.jsx     # Interface du chatbot
    └── index.html
```

---

## ⚙️ Comment ça marche — techniquement

### 1. Les embeddings FastText

Chaque mot est représenté par un **vecteur de 300 dimensions** généré par le modèle FastText `cc.fr.300` de Facebook, entraîné sur Wikipedia + Common Crawl français.

Des mots sémantiquement proches ont des vecteurs proches dans cet espace vectoriel :

```
"poche"    → [0.42, -0.11,  0.83, ..., 0.12]
"pochette" → [0.43, -0.10,  0.81, ..., 0.11]  ← très proche
"requin"   → [-0.33,  0.62, -0.21, ..., 0.54] ← très différent
```

### 2. La similarité cosinus

La proximité entre deux mots est mesurée par l'**angle** entre leurs vecteurs :

```
similarité = cos(angle) = (A · B) / (|A| × |B|)
```

- `cos(0°) = 1.0` → mots identiques
- `cos(petit angle) ≈ 0.95+` → mots très proches
- `cos(90°) = 0.0` → mots sans rapport

### 3. Le rang et le score

```python
# On compare le mot soumis aux 30 000 mots du vocabulaire
rank = nombre de mots plus similaires au secret que mon mot
score = 1000 - rank    # si rank < 1000 → Top 1000
```

### 4. Le mot du jour (déterministe)

```python
date_str = "2026-06-02"
hash_hex = SHA256(date_str)
index = int(hash_hex, 16) % 3000    # parmi les 3000 mots les plus fréquents
mot_secret = vocab[index]
```

Tout le monde obtient **le même mot** pour la même date, sans base de données.

### 5. Cache journalier

Au premier essai de la journée, le serveur pré-calcule les similarités des 30 000 mots avec le secret (via une seule multiplication matricielle NumPy). Les essais suivants sont quasi-instantanés.

---

## 🚀 Installation et lancement

### Prérequis

- **Python 3.11+**
- **Node.js 18+**
- Une clé API **Google Gemini** (pour le chatbot d'indices)

---

### 1. Backend

```bash
cd backend

# Créer et activer l'environnement virtuel
python -m venv venv
.\venv\Scripts\activate     # Windows
# source venv/bin/activate  # macOS / Linux

# Installer les dépendances
pip install -r requirements.txt
```

#### Configurer la clé API Gemini

Crée un fichier `.env` dans `backend/` :

```env
GEMINI_API_KEY=ta_cle_api_ici
```

> Obtiens ta clé sur [Google AI Studio](https://aistudio.google.com/app/apikey)

#### Générer le vocabulaire (à faire une seule fois)

Cette étape télécharge le modèle FastText français (~1.2 Go) et génère les fichiers `vocab.json` et `embeddings.npy`.

```bash
# Télécharger les vecteurs FastText français
# (~1.2 Go, à placer dans backend/)
# https://fasttext.cc/docs/en/crawl-vectors.html → cc.fr.300.vec.gz

# Puis générer les embeddings
python build_vocab.py
```

> ⚠️ `cc.fr.300.vec.gz` et les fichiers générés (`vocab.json`, `embeddings.npy`) ne sont pas inclus dans le dépôt car trop volumineux. Tu dois les générer une fois en local.

#### Lancer le serveur

```bash
python -m uvicorn main:app --reload --port 8000
```

Le backend sera disponible sur `http://localhost:8000`.  
Documentation API interactive : `http://localhost:8000/docs`

---

### 2. Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

L'interface sera disponible sur `http://localhost:5173` (ou 5174 si le port est occupé).

---

## 🔌 API Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/game/status` | Date du jour et statut du jeu |
| `POST` | `/api/game/guess` | Soumettre un mot → retourne score et rang |
| `POST` | `/api/game/give-up` | Abandonner et révéler le mot secret |
| `GET` | `/api/game/hint-count` | Nombre d'indices restants |
| `POST` | `/api/chat` | Demander un indice au chatbot Gemini |

### Exemple — soumettre un mot

**Requête :**
```json
POST /api/game/guess
{ "word": "pochette" }
```

**Réponse :**
```json
{
  "word": "pochette",
  "score": 996,
  "is_top_1000": true,
  "found": false
}
```

---

## 🛠️ Stack technique

### Backend
| Outil | Rôle |
|-------|------|
| **FastAPI** | Framework API REST asynchrone |
| **Uvicorn** | Serveur ASGI |
| **NumPy** | Calcul vectoriel (similarité cosinus) |
| **Gensim** | Chargement des modèles FastText |
| **Google Gemini** | LLM pour le chatbot d'indices |
| **Lexique383** | Base de données lexicale française (fréquences) |
| **FastText cc.fr.300** | Embeddings de mots français (Facebook AI) |

### Frontend
| Outil | Rôle |
|-------|------|
| **React 18** | UI déclarative |
| **Vite** | Build tool + dev server |
| **Canvas Confetti** | Confettis sur la victoire |
| **Outfit (Google Fonts)** | Typographie |
| **Vanilla CSS** | Styles (pas de framework CSS) |

---

## 📁 Fichiers non inclus dans le repo

Ces fichiers sont trop volumineux ou sensibles pour être versionnés :

| Fichier | Taille | Raison |
|---------|--------|--------|
| `backend/cc.fr.300.vec.gz` | ~1.2 Go | Modèle FastText |
| `backend/vocab.json` | ~400 Ko | Généré par `build_vocab.py` |
| `backend/embeddings.npy` | ~35 Mo | Généré par `build_vocab.py` |
| `backend/.env` | — | Clé API secrète |

Ajoute-les à ton `.gitignore` :

```gitignore
backend/.env
backend/vocab.json
backend/embeddings.npy
backend/cc.fr.300.vec.gz
backend/cc.fr.300.bin
backend/__pycache__/
backend/venv/
frontend/node_modules/
```

---

## 🎨 Design

- **Thème** : Dark mode (fond navy profond `#080810`)
- **Accent** : Violet / Indigo (`#8b5cf6`)
- **Police** : [Outfit](https://fonts.google.com/specimen/Outfit) (Google Fonts)
- **Couleurs de score** : Rouge → Orange → Jaune → Lime → Teal → Cyan (selon la proximité)
- **Animations** : Entrée des lignes, barres de progression, spinner de chargement

---

## 🗺️ Roadmap (idées futures)

- [ ] Persistance des parties dans `localStorage` (reprendre après rechargement)
- [ ] Statistiques personnelles (streak, moyenne d'essais)
- [ ] Partage du résultat (copier score + tentatives)
- [ ] Mode multijoueur (même mot, qui trouve en moins d'essais)
- [ ] Support mobile amélioré
- [ ] Leaderboard quotidien

---

## 📄 Licence

Projet personnel — inspiré de Cémantish.  
Les embeddings FastText sont distribués sous licence [CC-BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
