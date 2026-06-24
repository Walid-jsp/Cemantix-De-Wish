/**
 * utils.js — Helpers UI + localStorage persistant.
 */

// ── Couleurs ──────────────────────────────────────────────────────────

/**
 * Retourne la couleur CSS correspondant à un score.
 */
export function getScoreColor(score, isTop1000 = true) {
  if (!isTop1000) {
    if (score >= 40) return "#94a3b8";
    if (score >= 20) return "#64748b";
    return "#475569";
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
  if (!isTop1000) return "linear-gradient(90deg, #334155, #64748b)";
  if (score === 1000) return "linear-gradient(90deg, #22c55e, #00ff88)";
  if (score >= 900)   return "linear-gradient(90deg, #84cc16, #22c55e)";
  if (score >= 500)   return "linear-gradient(90deg, #eab308, #84cc16)";
  if (score >= 100)   return "linear-gradient(90deg, #f97316, #eab308)";
  return "linear-gradient(90deg, #ef4444, #f97316)";
}

/**
 * Calcul de la largeur de la barre.
 */
export function getScoreWidth(score, isTop1000 = true) {
  if (!isTop1000) return `${Math.max(2, score)}%`;
  if (score === 1000) return "100%";
  return `${(score / 1000) * 100}%`;
}

// ── localStorage ───────────────────────────────────────────────────────

/**
 * Clé de stockage localStorage basée sur la date.
 */
export function getStorageKey(prefix) {
  const today = new Date().toISOString().slice(0, 10);
  return `cemantix_${prefix}_${today}`;
}

/**
 * Clé de stockage globale (pas liée à la date) pour les stats persistantes.
 */
export function getGlobalStorageKey(prefix) {
  return `cemantix_global_${prefix}`;
}

/**
 * Sauvegarde dans le localStorage.
 */
export function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("Impossible de sauvegarder dans localStorage :", e);
  }
}

/**
 * Lecture depuis le localStorage.
 */
export function loadFromStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

// ── Statistiques persistantes ──────────────────────────────────────────

const STATS_KEY = "cemantix_stats_v1";

const DEFAULT_STATS = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastWonDate: null,
  // Distribution des victoires par tranche de tentatives
  // Clés : "1-10", "11-30", "31-60", "61-100", "100+"
  distribution: { "1-10": 0, "11-30": 0, "31-60": 0, "61-100": 0, "100+": 0 },
};

export function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS, distribution: { ...DEFAULT_STATS.distribution } };
    const parsed = JSON.parse(raw);
    // Merge avec les valeurs par défaut pour robustesse
    return {
      ...DEFAULT_STATS,
      distribution: { ...DEFAULT_STATS.distribution },
      ...parsed,
      distribution: { ...DEFAULT_STATS.distribution, ...(parsed.distribution || {}) },
    };
  } catch {
    return { ...DEFAULT_STATS, distribution: { ...DEFAULT_STATS.distribution } };
  }
}

export function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn("Impossible de sauvegarder les stats :", e);
  }
}

/**
 * Met à jour les statistiques après une partie terminée.
 * @param {boolean} won       - Le joueur a-t-il gagné ?
 * @param {number}  attempts  - Nombre de tentatives (valide seulement si won=true)
 */
export function updateStats(won, attempts = 0) {
  const stats = loadStats();
  const today = new Date().toISOString().slice(0, 10);

  stats.gamesPlayed += 1;

  if (won) {
    stats.gamesWon += 1;

    // Calcul du streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (stats.lastWonDate === today) {
      // Déjà compté aujourd'hui, on ne met pas à jour le streak
    } else if (stats.lastWonDate === yesterdayStr) {
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }

    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.lastWonDate = today;

    // Distribution
    if (attempts <= 10)       stats.distribution["1-10"] += 1;
    else if (attempts <= 30)  stats.distribution["11-30"] += 1;
    else if (attempts <= 60)  stats.distribution["31-60"] += 1;
    else if (attempts <= 100) stats.distribution["61-100"] += 1;
    else                      stats.distribution["100+"] += 1;
  } else {
    // Perte → reset streak
    if (stats.lastWonDate !== today) {
      stats.currentStreak = 0;
    }
  }

  saveStats(stats);
  return stats;
}

// ── Partage ────────────────────────────────────────────────────────────

/**
 * Génère le texte de partage façon Wordle/Cemantix.
 */
export function generateShareText(guesses, found, secretWord, dayNumber) {
  const total = guesses.length;
  const result = found ? `Trouvé en ${total} essai${total > 1 ? "s" : ""}` : "Abandonné";

  // Compter les tranches
  const perfect = guesses.filter(g => g.found).length;
  const superHot = guesses.filter(g => g.is_top_1000 && g.score >= 900 && !g.found).length;
  const hot      = guesses.filter(g => g.is_top_1000 && g.score >= 600 && g.score < 900).length;
  const warm     = guesses.filter(g => g.is_top_1000 && g.score >= 200 && g.score < 600).length;
  const cool     = guesses.filter(g => g.is_top_1000 && g.score < 200).length;
  const cold     = guesses.filter(g => !g.is_top_1000).length;

  const lines = [
    `Cémantish #${dayNumber}`,
    result,
    "",
  ];

  if (perfect > 0) lines.push(`Mot trouvé`);
  if (superHot > 0) lines.push(`Tres chaud : ${superHot}`);
  if (hot > 0)      lines.push(`Chaud : ${hot}`);
  if (warm > 0)     lines.push(`Proche : ${warm}`);
  if (cool > 0)     lines.push(`Dans le top : ${cool}`);
  if (cold > 0)     lines.push(`Hors top : ${cold}`);

  return lines.join("\n");
}

/**
 * Retourne le numéro du jour depuis une date de référence.
 */
export function getDayNumber() {
  const ref = new Date("2026-01-01");
  const now = new Date();
  const diff = Math.floor((now - ref) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}
