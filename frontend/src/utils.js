/**
 * Retourne la couleur CSS correspondant à un score (Top 1000 = chaud, hors top = froid).
 */
export function getScoreColor(score, isTop1000 = true) {
  if (!isTop1000) {
    if (score >= 40) return "#94a3b8"; // slate-400
    if (score >= 20) return "#64748b"; // slate-500
    return "#475569"; // slate-600
  }

  if (score === 1000) return "var(--score-perfect)";
  if (score >= 900) return "var(--score-green)";
  if (score >= 500) return "var(--score-lime)";
  if (score >= 100) return "var(--score-yellow)";
  return "var(--score-orange)";
}

/**
 * Retourne un dégradé CSS pour la barre de progression.
 */
export function getScoreGradient(score, isTop1000 = true) {
  if (!isTop1000) {
    return "linear-gradient(90deg, #334155, #64748b)";
  }

  if (score === 1000)
    return "linear-gradient(90deg, #22c55e, #00ff88)";
  if (score >= 900)
    return "linear-gradient(90deg, #84cc16, #22c55e)";
  if (score >= 500)
    return "linear-gradient(90deg, #eab308, #84cc16)";
  if (score >= 100)
    return "linear-gradient(90deg, #f97316, #eab308)";
  return "linear-gradient(90deg, #ef4444, #f97316)";
}

/**
 * Calcul de la largeur de la barre.
 */
export function getScoreWidth(score, isTop1000 = true) {
  if (!isTop1000) {
    // Hors Top 1000, le score est un pourcentage direct de similarité
    return `${Math.max(2, score)}%`;
  }
  
  if (score === 1000) return "100%";
  return `${(score / 1000) * 100}%`;
}

/**
 * Clé de stockage localStorage basée sur la date.
 */
export function getStorageKey(prefix) {
  const today = new Date().toISOString().slice(0, 10);
  return `semantixplus_${prefix}_${today}`;
}

/**
 * Sauvegarde dans le localStorage (Désactivé pour le mode test).
 */
export function saveToStorage(key, data) {
  // Mode test : on n'enregistre rien pour pouvoir rafraîchir et recommencer
  return;
}

/**
 * Lecture depuis le localStorage (Désactivé pour le mode test).
 */
export function loadFromStorage(key, fallback = null) {
  // Mode test : on retourne toujours la valeur par défaut pour repartir de zéro
  return fallback;
}
