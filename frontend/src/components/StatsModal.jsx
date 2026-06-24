import { TrophyIcon, ChartIcon, CloseIcon, ShareIcon } from "./Icons";
import { loadStats, generateShareText, getDayNumber } from "../utils";
import { useState } from "react";

export default function StatsModal({ guesses, found, onClose }) {
  const stats = loadStats();
  const [copied, setCopied] = useState(false);

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  const dist = stats.distribution;
  const maxVal = Math.max(...Object.values(dist), 1);

  const distLabels = {
    "1-10":   "1–10",
    "11-30":  "11–30",
    "31-60":  "31–60",
    "61-100": "61–100",
    "100+":   "100+",
  };

  const handleShare = async () => {
    const dayNumber = getDayNumber();
    const text = generateShareText(guesses, found, null, dayNumber);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback pour les navigateurs sans clipboard API
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="stats-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <ChartIcon size={22} className="modal-title-icon" />
            <h2 className="modal-title">Mes Statistiques</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Métriques */}
        <div className="stats-metrics">
          <div className="metric-card">
            <span className="metric-value">{stats.gamesPlayed}</span>
            <span className="metric-label">Parties</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">{winRate}%</span>
            <span className="metric-label">Victoires</span>
          </div>
          <div className="metric-card">
            <div className="metric-streak-icon">
              <TrophyIcon size={18} />
            </div>
            <span className="metric-value">{stats.currentStreak}</span>
            <span className="metric-label">Série actuelle</span>
          </div>
          <div className="metric-card">
            <span className="metric-value">{stats.maxStreak}</span>
            <span className="metric-label">Série max</span>
          </div>
        </div>

        {/* Distribution */}
        <div className="dist-section">
          <h3 className="dist-title">Distribution des victoires</h3>
          <div className="dist-bars">
            {Object.entries(dist).map(([key, val]) => (
              <div key={key} className="dist-row">
                <span className="dist-label">{distLabels[key]}</span>
                <div className="dist-bar-track">
                  <div
                    className="dist-bar-fill"
                    style={{ width: `${Math.max(4, (val / maxVal) * 100)}%` }}
                  />
                  <span className="dist-bar-val">{val}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bouton Partager */}
        {(found || guesses.length > 0) && (
          <button className="share-btn" onClick={handleShare}>
            <ShareIcon size={18} />
            {copied ? "Copié !" : "Partager mon score"}
          </button>
        )}
      </div>
    </div>
  );
}
