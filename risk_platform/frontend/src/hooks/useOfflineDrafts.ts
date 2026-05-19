import { useState } from "react";
import type { FriendlyForm } from "../api";

const STORAGE_KEY = "creditrisk_drafts";

interface Draft {
  key: string;
  form: FriendlyForm;
  savedAt: string;
}

function loadDrafts(): Draft[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useOfflineDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>(loadDrafts);

  const saveDraft = (form: FriendlyForm) => {
    const draft: Draft = {
      key: Date.now().toString(),
      form,
      savedAt: new Date().toLocaleString(),
    };
    const updated = [draft, ...loadDrafts()].slice(0, 10); // keep max 10
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setDrafts(updated);
    return draft.key;
  };

  const deleteDraft = (key: string) => {
    const updated = loadDrafts().filter((d) => d.key !== key);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setDrafts(updated);
  };

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDrafts([]);
  };

  return { drafts, saveDraft, deleteDraft, clearAll };
}
