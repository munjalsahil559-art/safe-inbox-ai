import type { DetectionResult } from "./detect.functions";

const KEY = "safeinbox_history_v1";
const MAX = 200;

export type HistoryEntry = DetectionResult & { id: string };

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(result: DetectionResult): HistoryEntry {
  const entry: HistoryEntry = {
    ...result,
    id: crypto.randomUUID(),
  };
  const list = [entry, ...loadHistory()].slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("safeinbox:history"));
  return entry;
}

export function deleteHistoryEntry(id: string) {
  const list = loadHistory().filter((e) => e.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("safeinbox:history"));
}

export function clearHistory() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("safeinbox:history"));
}
