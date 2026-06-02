import { useState, useEffect, useRef, useCallback } from "react";
import { submitGuess, giveUp } from "./api";
import { getStorageKey, saveToStorage, loadFromStorage } from "./utils";
import GuessList from "./components/GuessList";
import VictoryScreen from "./components/VictoryScreen";
import ChatWidget from "./components/ChatWidget";
import "./index.css";

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
  const [givenUp, setGivenUp] = useState(() =>
    loadFromStorage(getStorageKey("givenup"), false)
  );
  const [showVictory, setShowVictory] = useState(false);
  const inputRef = useRef(null);

  const gameOver = found || givenUp;

  // Persist state
  useEffect(() => { saveToStorage(getStorageKey("guesses"), guesses); }, [guesses]);
  useEffect(() => { saveToStorage(getStorageKey("found"), found); }, [found]);
  useEffect(() => { saveToStorage(getStorageKey("secret"), secretWord); }, [secretWord]);
  useEffect(() => { saveToStorage(getStorageKey("givenup"), givenUp); }, [givenUp]);

  // Focus on mount
  useEffect(() => {
    if (!gameOver) inputRef.current?.focus();
  }, [gameOver]);

  const focusInput = useCallback(() => {
    // Délai minimal pour laisser React finir son re-render
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const bestScore = guesses.length > 0
    ? Math.max(...guesses.map((g) => g.score))
    : 0;

  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const word = input.trim().toLowerCase();
    if (!word || loading || gameOver) return;

    // Doublon
    if (guesses.some((g) => g.word === word)) {
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
      setGuesses((prev) => [...prev, result]);

      if (result.found) {
        setFound(true);
        setSecretWord(result.word);
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

  const handleGiveUp = async () => {
    if (gameOver) return;
    if (!window.confirm("Es-tu sûr de vouloir abandonner ? Le mot secret sera révélé.")) return;
    try {
      const data = await giveUp();
      setSecretWord(data.secret_word);
      setGivenUp(true);
    } catch {
      setError("Erreur de connexion.");
    }
  };

  return (
    <>
      <div className="app-wrapper">
        {/* ── Header ── */}
        <header className="game-header">
          <div className="game-logo">
            <div className="logo-icon">🧠</div>
            <h1 className="game-title" id="game-title">Cémantix De Wish</h1>
          </div>
          <p className="game-subtitle">
            Trouve le mot secret grâce à la similarité sémantique
          </p>
        </header>

        {/* ── Stats ── */}
        <div className="stats-row" id="stats-bar">
          <div className="stat-pill">
            <span>🎯</span>
            <span className="val">{guesses.length}</span>
            <span>essais</span>
          </div>
          <div className="stat-pill">
            <span>🏆</span>
            <span className="val">{bestScore}</span>
            <span>meilleur</span>
          </div>
          <div className="stat-pill">
            <span>📅</span>
            <span className="val">{today}</span>
          </div>
        </div>

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
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              // ⚠️ PAS de disabled={loading} → l'input ne perd jamais le focus
            />
            <button
              id="submit-btn"
              className="submit-btn"
              type="submit"
              disabled={loading || !input.trim()}
              // onMouseDown prevent focus steal from input
              onMouseDown={(e) => e.preventDefault()}
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

        {/* ── Give up ── */}
        {!gameOver && guesses.length >= 3 && (
          <button
            id="give-up-btn"
            className="give-up-btn"
            onClick={handleGiveUp}
          >
            Abandonner
          </button>
        )}

        {/* ── Reveal (give up) ── */}
        {givenUp && secretWord && (
          <div className="reveal-banner" id="reveal-banner">
            <div className="reveal-label">Le mot secret était</div>
            <div className="reveal-word">{secretWord}</div>
          </div>
        )}
      </div>

      {/* ── Victory ── */}
      {showVictory && (
        <VictoryScreen
          secretWord={secretWord}
          guessCount={guesses.length}
          onClose={() => setShowVictory(false)}
        />
      )}

      {/* ── Chat ── */}
      <ChatWidget guesses={guesses} gameOver={gameOver} />
    </>
  );
}
