import type { Database, Photocard, Release } from './types';

export const SUPPORTED_SCHEMA = 1;
const CACHE_KEY = 'pocadex:db';
const URL_KEY = 'pocadex:dataUrl';

export const DEFAULT_DATA_URL: string =
  import.meta.env.VITE_DATA_URL || `${import.meta.env.BASE_URL}data/photocards.json`;

export function getDataUrl(): string {
  try {
    return localStorage.getItem(URL_KEY) || DEFAULT_DATA_URL;
  } catch {
    return DEFAULT_DATA_URL;
  }
}

export function setDataUrl(url: string | null) {
  try {
    if (url && url !== DEFAULT_DATA_URL) localStorage.setItem(URL_KEY, url);
    else localStorage.removeItem(URL_KEY);
  } catch {
    /* ignore */
  }
}

function readCache(): Database | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Database) : null;
  } catch {
    return null;
  }
}

function writeCache(db: Database) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

export function validateDatabase(x: unknown): x is Database {
  if (!x || typeof x !== 'object') return false;
  const db = x as Database;
  return (
    typeof db.schemaVersion === 'number' &&
    db.schemaVersion <= SUPPORTED_SCHEMA &&
    typeof db.dataVersion === 'string' &&
    Array.isArray(db.members) &&
    Array.isArray(db.releases)
  );
}

export type SyncResult =
  | { db: Database; status: 'updated'; from: string | null }
  | { db: Database; status: 'current' }
  | { db: Database; status: 'offline'; error: string }
  | { db: null; status: 'error'; error: string };

/**
 * Busca a versão mais recente da base toda vez que o app abre.
 * Se falhar (offline), usa a cópia salva no navegador.
 */
export async function syncDatabase(): Promise<SyncResult> {
  const cached = readCache();
  try {
    const url = getDataUrl();
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${sep}t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: unknown = await res.json();
    if (!validateDatabase(json)) throw new Error('Formato da base de dados inválido');
    writeCache(json);
    if (!cached || cached.dataVersion !== json.dataVersion) {
      return { db: json, status: 'updated', from: cached?.dataVersion ?? null };
    }
    return { db: json, status: 'current' };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    if (cached) return { db: cached, status: 'offline', error };
    return { db: null, status: 'error', error };
  }
}

// ---------- Expansão das regras em photocards ----------

const DEFAULT_PER_MEMBER = 1;

export function releaseMembers(db: Database, r: Release): string[] {
  return r.members ?? db.members.filter((m) => !m.former).map((m) => m.id);
}

export function expandRelease(db: Database, r: Release): Photocard[] {
  const cards: Photocard[] = [];
  const members = releaseMembers(db, r);
  for (const set of r.sets) {
    const versions: (string | null)[] = set.versions?.length ? set.versions : [null];
    const setMembers = set.members ?? members;
    const per = set.perMember ?? DEFAULT_PER_MEMBER;
    for (const version of versions) {
      const vKey = version ? slug(version) : '_';
      for (const memberId of setMembers) {
        for (let i = 1; i <= per; i++) {
          cards.push({
            id: `${r.id}:${set.id}:${vKey}:${memberId}:${i}`,
            releaseId: r.id,
            setId: set.id,
            setName: set.name,
            version,
            memberId,
            label: per > 1 ? `#${i}` : '',
            index: i,
          });
        }
      }
      for (const extra of set.extras ?? []) {
        cards.push({
          id: `${r.id}:${set.id}:${vKey}:x-${extra.id}:1`,
          releaseId: r.id,
          setId: set.id,
          setName: set.name,
          version,
          memberId: extra.members?.length === 1 ? extra.members[0] : 'group',
          label: extra.label,
          index: 1,
        });
      }
    }
  }
  return cards;
}

export function slug(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9぀-ヿ一-鿿가-힯]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const TYPE_LABEL: Record<string, string> = {
  mini: 'Mini álbum',
  full: 'Álbum completo',
  repackage: 'Repackage',
  special: 'Especial',
  mixtape: 'Mixtape',
  single: 'Single',
  compilation: 'Coletânea',
};

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
