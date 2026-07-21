import { useEffect, useState, useCallback } from "react";
import type { DetectionResult } from "./detect.functions";
import type { StoredScan } from "./scans.functions";
import {
  listScans,
  saveScan as saveScanServer,
  deleteScan as deleteScanServer,
  clearScans as clearScansServer,
} from "./scans.functions";
import { supabase } from "@/integrations/supabase/client";

const KEY = "safeinbox_history_v1";
const MAX = 200;

export type HistoryEntry = StoredScan;

function loadLocal(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveLocal(list: HistoryEntry[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  window.dispatchEvent(new Event("safeinbox:history"));
}

export async function saveHistoryEntry(result: DetectionResult): Promise<HistoryEntry> {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    const saved = await saveScanServer({
      data: {
        kind: result.kind,
        input: result.input,
        prediction: result.prediction,
        risk_level: result.risk_level,
        risk_score: result.risk_score,
        confidence: result.confidence,
        keywords: result.keywords,
        features: result.features,
        recommendation: result.recommendation,
        reasoning: result.reasoning,
        model: result.model,
        analyzed_at: result.analyzed_at,
        url_flags: result.url_flags ?? [],
      },
    });
    window.dispatchEvent(new Event("safeinbox:history"));
    return saved;
  }
  const entry: HistoryEntry = { ...result, id: crypto.randomUUID() };
  saveLocal([entry, ...loadLocal()]);
  return entry;
}

export async function deleteHistoryEntry(id: string) {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await deleteScanServer({ data: { id } });
    window.dispatchEvent(new Event("safeinbox:history"));
    return;
  }
  saveLocal(loadLocal().filter((e) => e.id !== id));
}

export async function clearHistory() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await clearScansServer();
    window.dispatchEvent(new Event("safeinbox:history"));
    return;
  }
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("safeinbox:history"));
}

export function useScanHistory() {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      setSignedIn(true);
      try {
        const remote = await listScans();
        setItems(remote);
      } catch {
        setItems([]);
      }
    } else {
      setSignedIn(false);
      setItems(loadLocal());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const onEvt = () => void refresh();
    window.addEventListener("safeinbox:history", onEvt);
    window.addEventListener("storage", onEvt);
    const { data: sub } = supabase.auth.onAuthStateChange(() => void refresh());
    return () => {
      window.removeEventListener("safeinbox:history", onEvt);
      window.removeEventListener("storage", onEvt);
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  return { items, loading, signedIn, refresh };
}
