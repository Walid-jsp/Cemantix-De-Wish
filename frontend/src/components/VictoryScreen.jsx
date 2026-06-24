import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { TrophyIcon, ShareIcon, CheckIcon } from "./Icons";
import { generateShareText, getDayNumber } from "../utils";

export default function VictoryScreen({ secretWord, guessCount, guesses, onClose }) {
  const [copied, setCopied] = useState(false);

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

  const handleShare = async () => {
    const dayNumber = getDayNumber();
    const text = generateShareText(guesses || [], true, secretWord, dayNumber);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="victory-overlay" id="victory-screen" onClick={onClose}>
      <div className="victory-card" onClick={e => e.stopPropagation()}>
        <div className="victory-icon-wrap">
          <TrophyIcon size={48} className="victory-trophy" />
        </div>
        <h2 className="victory-title">Bravo !</h2>
        <div className="victory-word">{secretWord}</div>
        <p className="victory-stats">
          Trouvé en <strong>{guessCount}</strong> tentative{guessCount > 1 ? "s" : ""}
        </p>
        <div className="victory-actions">
          <button className="share-btn" onClick={handleShare}>
            {copied ? <CheckIcon size={18} /> : <ShareIcon size={18} />}
            {copied ? "Copié !" : "Partager"}
          </button>
          <button
            className="victory-close-btn"
            id="victory-close"
            onClick={onClose}
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
}
