import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CardImage, DbImage, Photocard, Release } from './types';
import { findReleaseImages, matchImages, type ImageCandidate } from './wiki';

const CUSTOM_KEY = 'pocadex:customImages';
const WIKI_CACHE_PREFIX = 'pocadex:wiki:';
const WIKI_ENABLED_KEY = 'pocadex:wikiImages';
const WIKI_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias
const WIKI_CACHE_VERSION = 1;

type CustomImages = Record<string, { url: string; page?: string; source?: string }>;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function isWikiEnabled(): boolean {
  return readJSON(WIKI_ENABLED_KEY, true);
}
export function setWikiEnabled(v: boolean) {
  writeJSON(WIKI_ENABLED_KEY, v);
}
export function clearWikiCache() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(WIKI_CACHE_PREFIX)) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/** Imagens escolhidas pelo próprio usuário (ficam só neste aparelho e vão no backup). */
export function useCustomImages() {
  const [custom, setCustom] = useState<CustomImages>(() => readJSON(CUSTOM_KEY, {}));
  useEffect(() => writeJSON(CUSTOM_KEY, custom), [custom]);
  const setImage = useCallback((cardId: string, img: CustomImages[string] | null) => {
    setCustom((prev) => {
      const next = { ...prev };
      if (img) next[cardId] = img;
      else delete next[cardId];
      return next;
    });
  }, []);
  return { custom, setImage, replaceAll: setCustom };
}

export function readCustomImages(): CustomImages {
  return readJSON(CUSTOM_KEY, {});
}

function dbImage(release: Release, cardId: string): CardImage | null {
  const raw = release.images?.[cardId];
  if (!raw) return null;
  const img: DbImage = typeof raw === 'string' ? { url: raw } : raw;
  return { url: img.url, thumb: img.thumb ?? img.url, page: img.page, source: img.source, kind: 'db' };
}

interface WikiCache {
  v: number;
  t: number;
  candidates: ImageCandidate[];
}

/**
 * Resolve a imagem de cada card do lançamento, nesta ordem de prioridade:
 * 1. escolhida pelo usuário  2. base de dados do app  3. busca automática nas wikis
 */
export function useReleaseImages(release: Release | undefined, cards: Photocard[], memberIds: string[], custom: CustomImages) {
  const [candidates, setCandidates] = useState<ImageCandidate[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error' | 'off'>('idle');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!release) return;
    if (!isWikiEnabled()) {
      setState('off');
      setCandidates([]);
      return;
    }
    const key = WIKI_CACHE_PREFIX + release.id;
    const cached = readJSON<WikiCache | null>(key, null);
    if (cached && cached.v === WIKI_CACHE_VERSION && Date.now() - cached.t < WIKI_TTL && reloadKey === 0) {
      setCandidates(cached.candidates);
      setState('done');
      return;
    }
    let cancelled = false;
    setState('loading');
    findReleaseImages(release, memberIds)
      .then((list) => {
        if (cancelled) return;
        writeJSON(key, { v: WIKI_CACHE_VERSION, t: Date.now(), candidates: list } satisfies WikiCache);
        setCandidates(list);
        setState('done');
      })
      .catch(() => {
        if (cancelled) return;
        if (cached) setCandidates(cached.candidates);
        setState('error');
      });
    return () => {
      cancelled = true;
    };
    // memberIds é derivado do release; evitar refetch a cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [release?.id, reloadKey]);

  const wikiMatches = useMemo(() => matchImages(cards, candidates), [cards, candidates]);

  const images = useMemo(() => {
    const map = new Map<string, CardImage>();
    if (!release) return map;
    for (const card of cards) {
      const c = custom[card.id];
      if (c) {
        map.set(card.id, { url: c.url, thumb: c.url, page: c.page, source: c.source ?? 'Sua escolha', kind: 'custom' });
        continue;
      }
      const d = dbImage(release, card.id);
      if (d) {
        map.set(card.id, d);
        continue;
      }
      const w = wikiMatches.get(card.id);
      if (w) map.set(card.id, { url: w.url, thumb: w.thumb, page: w.page, source: w.source, kind: 'wiki', confidence: w.confidence });
    }
    return map;
  }, [release, cards, custom, wikiMatches]);

  return { images, candidates, state, reload: () => setReloadKey((k) => k + 1) };
}
