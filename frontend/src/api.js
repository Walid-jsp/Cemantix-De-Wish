const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function fetchStatus() {
  const res = await fetch(`${API_BASE}/api/game/status`);
  if (!res.ok) throw new Error("Erreur serveur");
  return res.json();
}

export async function submitGuess(word) {
  const res = await fetch(`${API_BASE}/api/game/guess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word }),
  });
  if (res.status === 404) {
    const data = await res.json();
    throw new Error(data.detail || "Ce mot n'est pas dans le dictionnaire.");
  }
  if (!res.ok) throw new Error("Erreur serveur");
  return res.json();
}

export async function sendChatMessage(message, guesses, hintNumber, conversationHistory, personality = "coach", signal = null) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      guesses,
      hint_number: hintNumber,
      conversation_history: conversationHistory,
      personality,
    }),
    signal,  // permet d'annuler le fetch via AbortController
  });
  if (!res.ok) throw new Error("Erreur serveur");
  return res.json();
}
