import { useState, useRef, useEffect, useCallback } from "react";
import { sendChatMessage } from "../api";
import { getStorageKey, saveToStorage, loadFromStorage } from "../utils";
import { CloseIcon, SendIcon, CoachIcon, SphinxIcon, ProfessorIcon } from "./Icons";

const PERSONALITIES = [
  { id: "coach",     label: "Coach",     Icon: CoachIcon,     desc: "Ultra-motivé" },
  { id: "sphinx",    label: "Sphinx",    Icon: SphinxIcon,    desc: "Énigmatique" },
  { id: "professor", label: "Prof",      Icon: ProfessorIcon, desc: "Grognon" },
];

export default function ChatWidget({ guesses, gameOver }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() =>
    loadFromStorage(getStorageKey("chat"), [])
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hintCount, setHintCount] = useState(() =>
    loadFromStorage(getStorageKey("hints"), 0)
  );
  const [personality, setPersonality] = useState(() =>
    loadFromStorage(getStorageKey("personality"), "coach")
  );
  const [showPersonalities, setShowPersonalities] = useState(false);
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);   // pour annuler le fetch en cours si besoin
  const maxHints = 3;

  // Persist
  useEffect(() => {
    saveToStorage(getStorageKey("chat"), messages);
  }, [messages]);

  useEffect(() => {
    saveToStorage(getStorageKey("hints"), hintCount);
  }, [hintCount]);

  useEffect(() => {
    saveToStorage(getStorageKey("personality"), personality);
  }, [personality]);

  // Vider l'historique quand la personnalité change
  // (évite d'envoyer un historique incohérent à Gemini avec un nouveau system prompt)
  const handleChangePersonality = useCallback((id) => {
    if (abortRef.current) {
      abortRef.current.abort();   // annuler un éventuel fetch en cours
      abortRef.current = null;
    }
    setLoading(false);
    setPersonality(id);
    setMessages([]);              // historique remis à zéro
    setShowPersonalities(false);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (hintCount >= maxHints) {
      setMessages(prev => [
        ...prev,
        { role: "user", content: text },
        { role: "bot", content: "Tu as utilisé tes 3 indices pour aujourd'hui. Reviens demain !" },
      ]);
      setInput("");
      return;
    }

    const userMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Timeout de 90 secondes (Render free tier : cold start + chargement embeddings)
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.content,
      }));

      const data = await sendChatMessage(
        text,
        guesses,
        hintCount + 1,
        conversationHistory,
        personality,
        controller.signal   // passe le signal d'abort au fetch
      );

      setMessages(prev => [...prev, { role: "bot", content: data.reply }]);
      setHintCount(c => c + 1);
    } catch (err) {
      const msg = err?.name === "AbortError"
        ? "La réponse a pris trop de temps. Réessaie !"
        : "Oups, une erreur est survenue. Réessaie !";
      setMessages(prev => [...prev, { role: "bot", content: msg }]);
    } finally {
      clearTimeout(timeoutId);
      abortRef.current = null;
      setLoading(false);
    }
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hintsRemaining = maxHints - hintCount;
  const currentPersonality = PERSONALITIES.find(p => p.id === personality) || PERSONALITIES[0];
  const CurrentIcon = currentPersonality.Icon;

  return (
    <>
      {/* Toggle Button */}
      <button
        id="chat-toggle"
        className="chat-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Ouvrir le chat d'indices"
      >
        {isOpen
          ? <CloseIcon size={22} />
          : <CurrentIcon size={22} />
        }
        {!isOpen && hintsRemaining > 0 && (
          <span className="badge">{hintsRemaining}</span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window" id="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-left">
              <CurrentIcon size={18} className="chat-header-persona-icon" />
              <span className="chat-header-title">
                Assistant · {currentPersonality.label}
              </span>
            </div>
            <div className="chat-header-right">
              <span className="chat-header-hints">
                {hintsRemaining > 0
                  ? `${hintsRemaining} indice${hintsRemaining > 1 ? "s" : ""}`
                  : "Épuisés"}
              </span>
              <button
                className="chat-persona-toggle"
                onClick={() => setShowPersonalities(v => !v)}
                title="Changer de personnalité"
              >
                Personnalité
              </button>
            </div>
          </div>

          {/* Sélecteur de personnalités */}
          {showPersonalities && (
            <div className="personality-picker">
              {PERSONALITIES.map(p => {
                const PIcon = p.Icon;
                return (
                  <button
                    key={p.id}
                    className={`persona-btn ${personality === p.id ? "active" : ""}`}
                    onClick={() => handleChangePersonality(p.id)}
                  >
                    <PIcon size={18} />
                    <span className="persona-name">{p.label}</span>
                    <span className="persona-desc">{p.desc}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Messages */}
          <div className="chat-messages" id="chat-messages">
            {messages.length === 0 && (
              <div className="chat-msg bot" style={{ alignSelf: "flex-start" }}>
                Salut ! Je suis ton assistant. Pose-moi une question et je te
                donnerai un indice sur le mot du jour.
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role === "user" ? "user" : "bot"}`}>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="chat-msg bot">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <input
              id="chat-input"
              className="chat-input"
              type="text"
              placeholder={
                hintsRemaining > 0
                  ? "Demande un indice..."
                  : "Plus d'indices aujourd'hui"
              }
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || gameOver}
            />
            <button
              id="chat-send"
              className="chat-send-btn"
              onClick={handleSend}
              disabled={loading || !input.trim() || gameOver}
            >
              <SendIcon size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
