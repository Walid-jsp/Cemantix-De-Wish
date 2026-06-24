import { useState, useEffect, useRef, useCallback } from "react";
import { submitGuess } from "./api";
import { getStorageKey, saveToStorage, loadFromStorage, updateStats } from "./utils";
import GuessList from "./components/GuessList";
import VictoryScreen from "./components/VictoryScreen";
import ChatWidget from "./components/ChatWidget";
import StatsModal from "./components/StatsModal";
import { BrainIcon, TargetIcon, TrophyIcon, CalendarIcon, ChartIcon } from "./components/Icons";
import "./index.css";

// ── Indicateur de chaleur global ──────────────────────────────────────

function HeatIndicator({ bestScore }) {
  if (bestScore === 0) return null;

  const pct = Math.min(100, (bestScore / 1000) * 100);

  let level = "cold";
  let label = "Froid";
  if (bestScore >= 990)      { level = "perfect"; label = "Mot trouvé !"; }
  else if (bestScore >= 800) { level = "fire";    label = "En feu !"; }
  else if (bestScore >= 600) { level = "hot";     label = "Très chaud"; }
  else if (bestScore >= 300) { level = "warm";    label = "Chaud"; }
  else if (bestScore >= 100) { level = "cool";    label = "Tiède"; }

  return (
    <div className={`heat-indicator heat-${level}`}>
      <div className="heat-bar-track">
        <div
          className="heat-bar-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="heat-label">{label}</span>
    </div>
  );
}

// ── App principale ────────────────────────────────────────────────────

export default function App() {
  const [guesses, setGuesses] = useState(() =>
    loadFromStorage(getStorageKey("guesses"), [])
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState(() =>
    loadFromStorage(getStorageKey("found"), false)
  );
  const [secretWord, setSecretWord] = useState(() =>
    loadFromStorage(getStorageKey("secret"), "")
  );
  const [showVictory, setShowVictory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const inputRef = useRef(null);

  const gameOver = found;

  // Persist state
  useEffect(() => { saveToStorage(getStorageKey("guesses"), guesses); }, [guesses]);
  useEffect(() => { saveToStorage(getStorageKey("found"), found); }, [found]);
  useEffect(() => { saveToStorage(getStorageKey("secret"), secretWord); }, [secretWord]);

  // Focus on mount
  useEffect(() => {
    if (!gameOver) inputRef.current?.focus();
  }, [gameOver]);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const bestScore = guesses.length > 0
    ? Math.max(...guesses.map(g => g.score))
    : 0;

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

  const handleSubmit = async e => {
    e.preventDefault();
    const word = input.trim().toLowerCase();
    if (!word || loading || gameOver) return;

    // Doublon
    if (guesses.some(g => g.word === word)) {
      setError("Déjà essayé !");
      setTimeout(() => setError(""), 1800);
      focusInput();
      return;
    }

    setLoading(true);
    setError("");
    setInput("");

    try {
      const result = await submitGuess(word);
      setGuesses(prev => [...prev, result]);

      if (result.found) {
        setFound(true);
        setSecretWord(result.word);
        // Mise à jour des stats
        updateStats(true, guesses.length + 1);
        setTimeout(() => setShowVictory(true), 300);
      }
    } catch (err) {
      setError(err.message || "Erreur de connexion.");
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
      focusInput();
    }
  };

  return (
    <>
      <div className="app-wrapper">
        {/* ── Header ── */}
        <header className="game-header">
          <div className="header-top">
            <div className="game-logo">
              <div className="logo-icon">
                <BrainIcon size={20} />
              </div>
              <h1 className="game-title" id="game-title">Cémantish</h1>
            </div>
            <button
              className="stats-trigger-btn"
              onClick={() => setShowStats(true)}
              aria-label="Voir mes statistiques"
              title="Statistiques"
            >
              <ChartIcon size={20} />
            </button>
          </div>
          <p className="game-subtitle">
            Trouve le mot secret grâce à la similarité sémantique
          </p>
        </header>

        {/* ── Stats ── */}
        <div className="stats-row" id="stats-bar">
          <div className="stat-pill">
            <TargetIcon size={15} />
            <span className="val">{guesses.length}</span>
            <span>essais</span>
          </div>
          <div className="stat-pill">
            <TrophyIcon size={15} />
            <span className="val">{bestScore > 0 ? bestScore : "–"}</span>
            <span>meilleur</span>
          </div>
          <div className="stat-pill">
            <CalendarIcon size={15} />
            <span className="val">{today}</span>
          </div>
        </div>

        {/* ── Thermomètre ── */}
        <HeatIndicator bestScore={bestScore} />

        {/* ── Input ── */}
        {!gameOver && (
          <form
            className="input-zone"
            onSubmit={handleSubmit}
            id="input-form"
          >
            <input
              id="word-input"
              ref={inputRef}
              className="word-input"
              type="text"
              placeholder="Entre un mot…"
              value={input}
              onChange={e => setInput(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              id="submit-btn"
              className="submit-btn"
              type="submit"
              disabled={loading || !input.trim()}
              onMouseDown={e => e.preventDefault()}
            >
              {loading
                ? <span className="btn-spinner" />
                : "Deviner"}
            </button>
          </form>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="notice error" id="error-msg">{error}</div>
        )}

        {/* ── Guess list ── */}
        {guesses.length > 0 && (
          <div className="list-header">Tentatives</div>
        )}
        <GuessList guesses={guesses} />
      </div>

      {/* ── Victory ── */}
      {showVictory && (
        <VictoryScreen
          secretWord={secretWord}
          guessCount={guesses.length}
          guesses={guesses}
          onClose={() => setShowVictory(false)}
        />
      )}

      {/* ── Stats Modal ── */}
      {showStats && (
        <StatsModal
          guesses={guesses}
          found={found}
          onClose={() => setShowStats(false)}
        />
      )}

      {/* ── Chat ── */}
      <ChatWidget guesses={guesses} gameOver={gameOver} />
    </>
  );
}
