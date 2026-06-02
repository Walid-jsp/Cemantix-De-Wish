import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "../api";
import { getStorageKey, saveToStorage, loadFromStorage } from "../utils";

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
  const messagesEndRef = useRef(null);
  const maxHints = 5;

  // Persist
  useEffect(() => {
    saveToStorage(getStorageKey("chat"), messages);
  }, [messages]);

  useEffect(() => {
    saveToStorage(getStorageKey("hints"), hintCount);
  }, [hintCount]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (hintCount >= maxHints) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        {
          role: "bot",
          content:
            "Tu as utilise tes 5 indices pour aujourd'hui. Reviens demain !",
        },
      ]);
      setInput("");
      return;
    }

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.content,
      }));

      const data = await sendChatMessage(
        text,
        guesses,
        hintCount + 1,
        conversationHistory
      );

      setMessages((prev) => [
        ...prev,
        { role: "bot", content: data.reply },
      ]);
      setHintCount((c) => c + 1);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "Oups, une erreur est survenue. Reessaie !",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hintsRemaining = maxHints - hintCount;

  return (
    <>
      {/* Toggle Button */}
      <button
        id="chat-toggle"
        className="chat-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Ouvrir le chat d'indices"
      >
        {isOpen ? "\u2715" : "\u2728"}
        {!isOpen && hintsRemaining > 0 && (
          <span className="badge">{hintsRemaining}</span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window" id="chat-window">
          <div className="chat-header">
            <span className="chat-header-title">Assistant Semantix+</span>
            <span className="chat-header-hints">
              {hintsRemaining > 0
                ? `${hintsRemaining} indice${hintsRemaining > 1 ? "s" : ""} restant${hintsRemaining > 1 ? "s" : ""}`
                : "Plus d'indices"}
            </span>
          </div>

          <div className="chat-messages" id="chat-messages">
            {messages.length === 0 && (
              <div
                className="chat-msg bot"
                style={{ alignSelf: "flex-start" }}
              >
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
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || gameOver}
            />
            <button
              id="chat-send"
              className="chat-send-btn"
              onClick={handleSend}
              disabled={loading || !input.trim() || gameOver}
            >
              Envoyer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
