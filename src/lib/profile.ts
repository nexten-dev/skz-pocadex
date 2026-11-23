// "Arquivo pessoal" do usuário: tudo o que é dele num documento só —
// marcações, fotos escolhidas, preferências, itens próprios e templates próprios.
// Fica no navegador (localStorage) e, com login, também no Google Drive dele.
//
// Cada alteração guarda o horário (t). Remoções viram "lápides" (removed) para
// que a mesclagem entre aparelhos não ressuscite algo apagado em outro lugar.
import { useSyncExternalStore } from 'react';
import { normalizeStatus } from './status';
import type { CardStatus, CollectionEntry, ItemCategory } from './types';

export interface ProfileImage {
  url: string; // endereço da imagem ou foto enviada (data:image/jpeg;base64,…)
  page?: string;
  source?: string;
  t: number;
}

export interface CustomItem {
  id: string;
  name: string;
  member?: string; // id do membro ou "group"
  kind?: string; // Photocard, Postcard, Merch…
  origin?: string; // de onde é (evento, loja, fanmade…)
  image?: string;
  notes?: string;
  /** Álbum ao qual o item pertence (oficial ou criado pelo usuário). */
  releaseId?: string;
  category?: ItemCategory;
  /** @deprecated status antigo — agora fica em cards["u:<id>"]. */
  s?: CardStatus | null;
  /** @deprecated quantidade antiga — agora fica em cards["u:<id>"]. */
  q?: number;
  t: number;
  deleted?: boolean;
}

/** ID do card de um item criado pelo usuário. */
export const itemCardId = (itemId: string) => `u:${itemId}`;

/** Álbum/lançamento criado pelo usuário. */
export interface CustomAlbum {
  id: string;
  title: string;
  type: string;
  market: 'KR' | 'JP' | 'TW';
  date: string;
  cover?: string;
  notes?: string;
  t: number;
  deleted?: boolean;
}

/** ID do lançamento de um álbum criado pelo usuário. */
export const albumReleaseId = (albumId: string) => `u:${albumId}`;

export interface CustomTemplate {
  id: string;
  title: string;
  image: string;
  section: string;
  releaseId?: string;
  author?: string;
  post?: string;
  t: number;
  deleted?: boolean;
}

/** Anotações de compra de um card (independem do status). */
export interface CardNote {
  /** CEG (compra em grupo). */
  ceg?: string;
  /** Dealer (quem vende/organiza). */
  dealer?: string;
  /** Item/SET comprado. */
  itemset?: string;
  /** Link da planilha da CEG. */
  sheet?: string;
  t: number;
}

export const NOTE_FIELDS = ['ceg', 'dealer', 'itemset', 'sheet'] as const;

export interface Prefs {
  /** Membros exibidos (null = todos). Inclui "group" para cards de grupo/unit. */
  members: string[] | null;
  categories: ItemCategory[];
  showConcept: boolean;
  t: number;
}

export interface Profile {
  version: 2;
  cards: Record<string, CollectionEntry>;
  removed: Record<string, number>;
  images: Record<string, ProfileImage>;
  imagesRemoved: Record<string, number>;
  prefs: Prefs;
  items: Record<string, CustomItem>;
  templates: Record<string, CustomTemplate>;
  /** Anotações de compra por card (CEG, dealer, item/set, planilha). */
  notes: Record<string, CardNote>;
  /** Álbuns criados pelo usuário. */
  albums: Record<string, CustomAlbum>;
  /** Última alteração local (qualquer campo). */
  updatedAt: number;
}

const KEY = 'pocadex:profile';
const DEFAULT_PREFS: Prefs = { members: null, categories: ['photocard'], showConcept: true, t: 0 };

export function emptyProfile(): Profile {
  return { version: 2, cards: {}, removed: {}, images: {}, imagesRemoved: {}, prefs: { ...DEFAULT_PREFS }, items: {}, templates: {}, notes: {}, albums: {}, updatedAt: 0 };
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Normaliza um documento (de qualquer versão) para o formato atual. */
export function normalizeProfile(raw: unknown): Profile {
  const p = emptyProfile();
  if (!raw || typeof raw !== 'object') return p;
  const r = raw as Partial<Profile> & { customImages?: Record<string, { url: string }> };
  for (const [id, e] of Object.entries(r.cards ?? {})) {
    const s = normalizeStatus((e as CollectionEntry)?.s);
    if (s) p.cards[id] = { s, t: (e as CollectionEntry).t ?? 1, ...((e as CollectionEntry).q ? { q: (e as CollectionEntry).q } : {}) };
  }
  Object.assign(p.removed, r.removed ?? {});
  for (const [id, img] of Object.entries(r.images ?? r.customImages ?? {})) {
    if (img?.url) p.images[id] = { t: 1, ...img } as ProfileImage;
  }
  Object.assign(p.imagesRemoved, r.imagesRemoved ?? {});
  if (r.prefs) p.prefs = { ...DEFAULT_PREFS, ...r.prefs };
  Object.assign(p.items, r.items ?? {});
  Object.assign(p.templates, r.templates ?? {});
  Object.assign(p.notes, r.notes ?? {});
  Object.assign(p.albums, r.albums ?? {});
  // Itens antigos guardavam o status no próprio item: passa para cards["u:<id>"]
  for (const item of Object.values(p.items)) {
    if (item.s && !p.cards[itemCardId(item.id)] && !p.removed[itemCardId(item.id)]) {
      p.cards[itemCardId(item.id)] = { s: item.s, t: item.t || 1, ...(item.q ? { q: item.q } : {}) };
    }
    if ('s' in item || 'q' in item) {
      p.items[item.id] = { ...item };
      delete p.items[item.id].s;
      delete p.items[item.id].q;
    }
  }
  p.updatedAt = r.updatedAt ?? 0;
  return p;
}

/** Primeira vez: junta os dados das versões anteriores (chaves separadas). */
function loadLegacy(): Profile {
  const p = emptyProfile();
  const col = readJSON<{ cards?: Record<string, CollectionEntry> }>('pocadex:collection');
  const imgs = readJSON<Record<string, { url: string; page?: string; source?: string }>>('pocadex:customImages');
  const cats = readJSON<ItemCategory[]>('pocadex:categories');
  const concept = readJSON<boolean>('pocadex:conceptPhotos');
  const merged = normalizeProfile({ cards: col?.cards ?? {}, customImages: imgs ?? {} });
  p.cards = merged.cards;
  p.images = merged.images;
  if (cats?.length) p.prefs.categories = cats;
  if (concept === false) p.prefs.showConcept = false;
  p.updatedAt = Object.keys(p.cards).length || Object.keys(p.images).length ? Date.now() : 0;
  return p;
}

let state: Profile = (() => {
  const saved = readJSON<unknown>(KEY);
  return saved ? normalizeProfile(saved) : loadLegacy();
})();
const listeners = new Set<() => void>();
let saveError: string | null = null;

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveError = null;
  } catch (e) {
    saveError =
      e instanceof DOMException && /quota/i.test(e.name + e.message)
        ? 'O espaço do navegador acabou (provavelmente por muitas fotos enviadas). Faça login para guardar na nuvem ou apague algumas fotos.'
        : 'Não foi possível salvar no navegador.';
  }
}
persist();

function emit() {
  for (const l of listeners) l();
}

/** Aplica uma alteração ao arquivo pessoal (sempre marca o horário). */
export function updateProfile(fn: (draft: Profile, now: number) => void) {
  const draft: Profile = structuredClone(state);
  const now = Date.now();
  fn(draft, now);
  draft.updatedAt = now;
  state = draft;
  persist();
  emit();
}

/** Substitui o arquivo inteiro (mesclagem com a nuvem, importação de backup). */
export function setProfile(next: Profile, { touch = false } = {}) {
  state = touch ? { ...next, updatedAt: Date.now() } : next;
  persist();
  emit();
}

export function getProfile(): Profile {
  return state;
}

export function getSaveError(): string | null {
  return saveError;
}

export function subscribeProfile(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Outras abas do mesmo navegador
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY && e.newValue) {
      try {
        state = normalizeProfile(JSON.parse(e.newValue));
        emit();
      } catch {
        /* ignore */
      }
    }
  });
}

export function useProfile(): Profile {
  return useSyncExternalStore(subscribeProfile, getProfile, getProfile);
}

// ---------- Mesclagem (aparelho × nuvem) ----------

function mergeTimed<T extends { t: number }>(
  a: Record<string, T>,
  aRemoved: Record<string, number>,
  b: Record<string, T>,
  bRemoved: Record<string, number>,
) {
  const items: Record<string, T> = {};
  const removed: Record<string, number> = {};
  const ids = new Set([...Object.keys(a), ...Object.keys(b), ...Object.keys(aRemoved), ...Object.keys(bRemoved)]);
  for (const id of ids) {
    const live = [a[id], b[id]].filter(Boolean).sort((x, y) => y.t - x.t)[0];
    const dead = Math.max(aRemoved[id] ?? 0, bRemoved[id] ?? 0);
    if (live && live.t >= dead) items[id] = live;
    else if (dead) removed[id] = dead;
  }
  return { items, removed };
}

function mergeById<T extends { t: number }>(a: Record<string, T>, b: Record<string, T>) {
  const out: Record<string, T> = { ...a };
  for (const [id, v] of Object.entries(b)) if (!out[id] || v.t > out[id].t) out[id] = v;
  return out;
}

/** Junta dois arquivos pessoais: para cada item vale a alteração mais recente. */
export function mergeProfiles(a: Profile, b: Profile): Profile {
  const cards = mergeTimed(a.cards, a.removed, b.cards, b.removed);
  const images = mergeTimed(a.images, a.imagesRemoved, b.images, b.imagesRemoved);
  return {
    version: 2,
    cards: cards.items,
    removed: cards.removed,
    images: images.items,
    imagesRemoved: images.removed,
    prefs: (b.prefs?.t ?? 0) > (a.prefs?.t ?? 0) ? b.prefs : a.prefs,
    items: mergeById(a.items, b.items),
    templates: mergeById(a.templates, b.templates),
    notes: mergeById(a.notes ?? {}, b.notes ?? {}),
    albums: mergeById(a.albums ?? {}, b.albums ?? {}),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  };
}

/** Conteúdo comparável (sem updatedAt) para saber se dois arquivos diferem. */
export function profileFingerprint(p: Profile): string {
  const { updatedAt: _u, ...rest } = p;
  void _u;
  return JSON.stringify(rest);
}

/** Salva as anotações de compra de um card (campos vazios são removidos). */
export function setCardNote(cardId: string, note: Partial<Record<(typeof NOTE_FIELDS)[number], string>>) {
  const clean: Partial<CardNote> = {};
  for (const f of NOTE_FIELDS) {
    const v = note[f]?.trim();
    if (v) clean[f] = v;
  }
  const prev = state.notes[cardId];
  if (NOTE_FIELDS.every((f) => (prev?.[f] ?? undefined) === clean[f])) return;
  updateProfile((p, now) => {
    p.notes[cardId] = { ...clean, t: now };
  });
}
