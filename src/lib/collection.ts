import { useCallback, useEffect, useState } from 'react';
import type { CardStatus, Collection } from './types';

const KEY = 'pocadex:collection';

function load(): Collection {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Collection;
      if (parsed && parsed.cards) return parsed;
    }
  } catch {
    /* ignore */
  }
  return { version: 1, cards: {} };
}

function save(c: Collection) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

export function useCollection() {
  const [collection, setCollection] = useState<Collection>(load);

  useEffect(() => save(collection), [collection]);

  // Mantém abas diferentes sincronizadas.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setCollection(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setStatus = useCallback((ids: string[], status: CardStatus | null) => {
    setCollection((prev) => {
      const cards = { ...prev.cards };
      const now = Date.now();
      for (const id of ids) {
        if (status === null) delete cards[id];
        else cards[id] = { ...cards[id], s: status, t: now };
      }
      return { ...prev, cards };
    });
  }, []);

  const setQty = useCallback((id: string, q: number) => {
    setCollection((prev) => {
      const entry = prev.cards[id];
      if (!entry) return prev;
      return { ...prev, cards: { ...prev.cards, [id]: { ...entry, q: Math.max(1, q), t: Date.now() } } };
    });
  }, []);

  const replace = useCallback((c: Collection) => setCollection(c), []);

  return { collection, setStatus, setQty, replace };
}

type CustomImages = Record<string, { url: string; page?: string; source?: string }>;

export function exportCollection(c: Collection, customImages: CustomImages = {}) {
  const blob = new Blob(
    [
      JSON.stringify(
        { app: 'skz-pocadex', appVersion: __APP_VERSION__, exportedAt: new Date().toISOString(), ...c, customImages },
        null,
        2,
      ),
    ],
    { type: 'application/json' },
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `skz-pocadex-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function parseBackup(file: File): Promise<{ collection: Collection; customImages: CustomImages | null }> {
  const json = JSON.parse(await file.text());
  if (!json || typeof json.cards !== 'object') throw new Error('Arquivo de backup inválido');
  const cards: Collection['cards'] = {};
  for (const [id, e] of Object.entries(json.cards as Record<string, { s?: string; q?: number; t?: number }>)) {
    if (e && (e.s === 'owned' || e.s === 'transit' || e.s === 'wish')) {
      cards[id] = { s: e.s, t: e.t ?? Date.now(), ...(e.q ? { q: e.q } : {}) };
    }
  }
  const customImages: CustomImages | null =
    json.customImages && typeof json.customImages === 'object' ? (json.customImages as CustomImages) : null;
  return { collection: { version: 1, cards }, customImages };
}

export const STATUS_LABEL: Record<CardStatus, string> = {
  owned: 'Tenho',
  transit: 'A caminho',
  wish: 'Quero',
};
