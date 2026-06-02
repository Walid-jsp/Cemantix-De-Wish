import { useEffect } from "react";
import confetti from "canvas-confetti";

export default function VictoryScreen({ secretWord, guessCount, onClose }) {
  useEffect(() => {
    const duration = 3500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.65 },
        colors: ["#8b5cf6", "#a78bfa", "#00d2ff", "#1dd1a1", "#ffd32a"],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.65 },
        colors: ["#8b5cf6", "#a78bfa", "#00d2ff", "#1dd1a1", "#ffd32a"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <div className="victory-overlay" id="victory-screen" onClick={onClose}>
      <div className="victory-card" onClick={(e) => e.stopPropagation()}>
        <span className="victory-emoji">🎉</span>
        <h2 className="victory-title">Bravo !</h2>
        <div className="victory-word">{secretWord}</div>
        <p className="victory-stats">
          Trouvé en <strong>{guessCount}</strong> tentative{guessCount > 1 ? "s" : ""}
        </p>
        <button
          className="victory-close-btn"
          id="victory-close"
          onClick={onClose}
        >
          Continuer →
        </button>
      </div>
    </div>
  );
}
