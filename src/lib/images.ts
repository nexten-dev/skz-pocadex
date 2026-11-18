import { useCallback, useEffect, useMemo, useState } from 'react';
import { slug } from './expand';
import type { CardImage, DbImage, MediaImage, Photocard, Release } from './types';

const CUSTOM_KEY = 'pocadex:customImages';
const CONCEPT_KEY = 'pocadex:conceptPhotos';

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

// Limpa o cache da busca antiga pelo navegador (versões ≤ 0.4.x).
try {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith('pocadex:wiki:') || k === 'pocadex:wikiImages') localStorage.removeItem(k);
  }
} catch {
  /* ignore */
}

/** Mostrar a foto de divulgação do membro no fundo dos cards sem imagem própria. */
export function isConceptEnabled(): boolean {
  return readJSON(CONCEPT_KEY, true);
}
export function setConceptEnabled(v: boolean) {
  writeJSON(CONCEPT_KEY, v);
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

function dbImage(release: Release, cardId: string): CardImage | null {
  const raw = release.images?.[cardId];
  if (!raw) return null;
  const img: DbImage = typeof raw === 'string' ? { url: raw } : raw;
  return { url: img.url, thumb: img.thumb ?? img.url, page: img.page, source: img.source, kind: 'db' };
}

function fromMedia(m: MediaImage, kind: CardImage['kind']): CardImage {
  return { url: m.url, thumb: m.thumb ?? m.url, page: m.page, source: m.source, kind };
}

/** Chave do grupo (set + versão) usada para achar a prévia da versão. */
export function groupKey(card: Pick<Photocard, 'setId' | 'version'>): string {
  return `${card.setId}|${card.version ? slug(card.version) : '_'}`;
}

/**
 * Resolve a imagem de cada card, nesta ordem de prioridade:
 * 1. escolhida pelo usuário  2. imagem do próprio card na base
 * 3. foto de divulgação do membro na era (se ativado)
 */
export function useReleaseImages(release: Release | undefined, cards: Photocard[], custom: CustomImages) {
  const concept = isConceptEnabled();
  return useMemo(() => {
    const images = new Map<string, CardImage>();
    const previews = release?.media?.previews ?? [];
    const previewByGroup = new Map<string, (typeof previews)[number]>();
    for (const p of previews) for (const k of p.keys ?? []) if (!previewByGroup.has(k)) previewByGroup.set(k, p);
    if (!release) return { images, previews, previewByGroup, memberPhotos: {} as Record<string, MediaImage> };
    const memberPhotos = release.media?.members ?? {};
    for (const card of cards) {
      const c = custom[card.id];
      if (c) {
        images.set(card.id, { url: c.url, thumb: c.url, page: c.page, source: c.source ?? 'Sua escolha', kind: 'custom' });
        continue;
      }
      const d = dbImage(release, card.id);
      if (d) {
        images.set(card.id, d);
        continue;
      }
      const m = memberPhotos[card.memberId];
      if (concept && m) images.set(card.id, fromMedia(m, 'concept'));
    }
    return { images, previews, previewByGroup, memberPhotos };
  }, [release, cards, custom, concept]);
}
