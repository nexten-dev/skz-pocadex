import type { Database } from './types';

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

// Expansão das regras em photocards (compartilhada com os scripts)
export { expandRelease, releaseMembers, slug } from './expand';

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
