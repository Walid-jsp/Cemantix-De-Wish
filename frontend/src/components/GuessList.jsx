import { FlameIcon, SparkIcon, LightbulbIcon, SnowflakeIcon, TrophyIcon } from "./Icons";

/**
 * Retourne la couleur et le gradient selon le score (Top 1000) ou la similarité brute (hors top).
 */
function getScoreStyle(score, isTop1000) {
  if (!isTop1000) {
    return {
      barColor: "var(--cold)",
      scoreColor: "var(--text-muted)",
      barWidth: `${Math.max(2, score)}%`,
      rowAccent: "var(--cold)",
    };
  }

  if (score >= 990) return { barColor: "var(--perfect)", scoreColor: "var(--perfect)", barWidth: "100%", rowAccent: "var(--perfect)" };
  if (score >= 800) return { barColor: "var(--hot-5)", scoreColor: "var(--hot-5)", barWidth: `${(score / 1000) * 100}%`, rowAccent: "var(--hot-5)" };
  if (score >= 600) return { barColor: "var(--hot-4)", scoreColor: "var(--hot-4)", barWidth: `${(score / 1000) * 100}%`, rowAccent: "var(--hot-4)" };
  if (score >= 400) return { barColor: "var(--hot-3)", scoreColor: "var(--hot-3)", barWidth: `${(score / 1000) * 100}%`, rowAccent: "var(--hot-3)" };
  if (score >= 200) return { barColor: "var(--hot-2)", scoreColor: "var(--hot-2)", barWidth: `${(score / 1000) * 100}%`, rowAccent: "var(--hot-2)" };
  return { barColor: "var(--hot-1)", scoreColor: "var(--hot-1)", barWidth: `${(score / 1000) * 100}%`, rowAccent: "var(--hot-1)" };
}

function RankIcon({ guess }) {
  if (!guess.is_top_1000) return <SnowflakeIcon size={16} className="rank-svg cold" />;
  if (guess.score === 1000) return <TrophyIcon size={16} className="rank-svg perfect" />;
  if (guess.score >= 900) return <FlameIcon size={16} className="rank-svg super-hot" />;
  if (guess.score >= 600) return <SparkIcon size={16} className="rank-svg hot" />;
  return <LightbulbIcon size={16} className="rank-svg warm" />;
}

export default function GuessList({ guesses }) {
  // Tri : Top 1000 d'abord (score décroissant), puis hors-top (score décroissant)
  const sorted = [...guesses].sort((a, b) => {
    if (a.is_top_1000 && !b.is_top_1000) return -1;
    if (!a.is_top_1000 && b.is_top_1000) return 1;
    return b.score - a.score;
  });

  if (sorted.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon-svg">
          <SparkIcon size={36} className="empty-spark" />
        </div>
        <p>Tape ton premier mot pour commencer !</p>
      </div>
    );
  }

  return (
    <div className="guess-list" id="guess-list">
      {sorted.map((guess, index) => {
        const realRank = guess.is_top_1000 ? 1000 - guess.score : null;
        const { barColor, scoreColor, barWidth, rowAccent } = getScoreStyle(guess.score, guess.is_top_1000);

        const rankLabel = guess.is_top_1000 && guess.score < 1000
          ? `#${realRank}`
          : null;

        // Classes d'animation selon la température
        const tempClass = !guess.is_top_1000
          ? "temp-cold"
          : guess.score >= 900
          ? "temp-fire"
          : guess.score >= 600
          ? "temp-hot"
          : "temp-warm";

        return (
          <div
            key={`${guess.word}-${guess.score}`}
            className={`guess-row ${tempClass}${guess.found ? " found" : ""}`}
            id={`guess-${index}`}
            style={{ "--row-accent": rowAccent }}
          >
            {/* Rank */}
            <div className="guess-rank">
              <RankIcon guess={guess} />
              {rankLabel && <span className="rank-num">{rankLabel}</span>}
            </div>

            {/* Word */}
            <span className="guess-word">{guess.word}</span>

            {/* Score */}
            <div className="guess-right">
              <div className="guess-bar-track">
                <div
                  className="guess-bar-fill"
                  style={{
                    width: barWidth,
                    "--bar-color": barColor,
                    background: barColor,
                  }}
                />
              </div>
              <span
                className="guess-score-val"
                style={{ "--score-color": scoreColor, color: scoreColor }}
              >
                {guess.is_top_1000
                  ? guess.score
                  : `${guess.score}%`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
