import { useCallback, useEffect, useMemo, useState } from 'react';
import { slug } from './expand';
import { migrateKeys } from './collection';
import type { CardImage, Database, DbImage, MediaImage, Photocard, Release } from './types';

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
  const migrateIds = useCallback((map: Record<string, string> | undefined) => {
    if (!map) return;
    setCustom((prev) => migrateKeys(prev, map));
  }, []);
  return { custom, setImage, replaceAll: setCustom, migrateIds };
}

type Hosts = Pick<Database, 'imageHosts' | 'imageProxy'>;

/**
 * Expande "prefixo:caminho" usando db.imageHosts (URLs completas passam direto).
 * Para miniaturas sem tamanho próprio no servidor, usa db.imageProxy (redimensiona).
 */
export function resolveImage(value: string, hosts: Hosts | undefined, size: 'thumb' | 'full', width = 360): string {
  const m = value.match(/^([a-z0-9]+):(?!\/\/)(.+)$/i);
  const host = m ? hosts?.imageHosts?.[m[1]] : undefined;
  const url = m && host ? encodeURI(host.base + m[2]) : value;
  if (host?.[size]) return url + host[size];
  if (size === 'thumb' && hosts?.imageProxy && /^https?:\/\//.test(url)) {
    return hosts.imageProxy.replace('{url}', encodeURIComponent(url)).replace('{w}', String(width));
  }
  return url;
}

function dbImage(release: Release, cardId: string, hosts?: Hosts): CardImage | null {
  const raw = release.images?.[cardId];
  if (!raw) return null;
  const img: DbImage = typeof raw === 'string' ? { url: raw } : raw;
  return {
    url: resolveImage(img.url, hosts, 'full'),
    thumb: resolveImage(img.thumb ?? img.url, hosts, 'thumb'),
    page: img.page ?? release.source?.url,
    source: img.source ?? release.source?.name,
    kind: 'db',
  };
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
export function useReleaseImages(release: Release | undefined, cards: Photocard[], custom: CustomImages, hosts?: Hosts) {
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
      const d = dbImage(release, card.id, hosts);
      if (d) {
        images.set(card.id, d);
        continue;
      }
      const m = memberPhotos[card.memberId];
      if (concept && m) images.set(card.id, fromMedia(m, 'concept'));
    }
    return { images, previews, previewByGroup, memberPhotos };
  }, [release, cards, custom, concept, hosts]);
}
