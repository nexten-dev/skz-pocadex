// Login com Google e sincronização do arquivo pessoal no Google Drive do usuário.
//
// - Usa o Google Identity Services (login no navegador, sem servidor nosso).
// - Guarda um único arquivo "pocadex.json" na pasta oculta do app no Drive
//   (appDataFolder): só o próprio app vê esse arquivo; ele não aparece na lista do Drive
//   e o app não tem acesso a nenhum outro arquivo da pessoa.
// - Mescla aparelho × nuvem por item (vale a alteração mais recente).
//
// Precisa de um "ID do cliente OAuth" do Google Cloud em VITE_GOOGLE_CLIENT_ID
// (no GitHub: variável do repositório GOOGLE_CLIENT_ID, usada no build do deploy).
import { useSyncExternalStore } from 'react';
import { getProfile, mergeProfiles, normalizeProfile, profileFingerprint, setProfile, subscribeProfile } from './profile';

export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata openid email profile';
const FILE_NAME = 'pocadex.json';
const SESSION_KEY = 'pocadex:session';

export type SessionMode = 'guest' | 'google';
export interface Session {
  mode: SessionMode;
  email?: string;
  name?: string;
  picture?: string;
}

export type CloudStatus = 'off' | 'reconnect' | 'syncing' | 'synced' | 'error';

interface CloudState {
  session: Session | null;
  status: CloudStatus;
  lastSync: number | null;
  error: string | null;
}

// ---------- estado observável ----------
let token: { value: string; expires: number } | null = null;
let fileId: string | null = null;
let cloud: CloudState = {
  session: readSession(),
  status: 'off',
  lastSync: null,
  error: null,
};
cloud.status = cloud.session?.mode === 'google' ? 'reconnect' : 'off';
const listeners = new Set<() => void>();
function set(patch: Partial<CloudState>) {
  cloud = { ...cloud, ...patch };
  for (const l of listeners) l();
}
export function useCloud(): CloudState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => cloud,
    () => cloud,
  );
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function writeSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  set({ session: s });
}

export function continueAsGuest() {
  writeSession({ mode: 'guest' });
  set({ status: 'off' });
}

export function signOut() {
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token.value, () => {});
  token = null;
  fileId = null;
  writeSession(null);
  set({ status: 'off', lastSync: null, error: null });
}

// ---------- Google Identity Services ----------
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(cfg: {
            client_id: string;
            scope: string;
            prompt?: string;
            hint?: string;
            callback: (r: { access_token?: string; expires_in?: number; error?: string }) => void;
            error_callback?: (e: { type: string; message?: string }) => void;
          }): { requestAccessToken(o?: { prompt?: string; hint?: string }): void };
          revoke(token: string, done: () => void): void;
        };
      };
    };
  }
}

let gisLoading: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gisLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Não foi possível carregar o login do Google (sem internet?).'));
    document.head.append(s);
  });
  return gisLoading;
}

/** Pede o acesso ao Google. Precisa ser chamado a partir de um toque/clique do usuário. */
async function requestToken(prompt: '' | 'consent' | 'select_account'): Promise<string> {
  if (!GOOGLE_CLIENT_ID) throw new Error('O login com Google ainda não foi configurado neste app.');
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new Error(r.error ?? 'Login cancelado.'));
        token = { value: r.access_token, expires: Date.now() + ((r.expires_in ?? 3600) - 60) * 1000 };
        resolve(r.access_token);
      },
      error_callback: (e) => reject(new Error(e.type === 'popup_closed' ? 'Janela de login fechada.' : e.message ?? e.type)),
    });
    client.requestAccessToken({ prompt, hint: cloud.session?.email });
  });
}

/** Login (ou reconexão) com o Google — chame a partir de um botão. */
export async function signInWithGoogle(): Promise<void> {
  set({ status: 'syncing', error: null });
  try {
    const reconnect = cloud.session?.mode === 'google' && !!cloud.session.email;
    await requestToken(reconnect ? '' : 'select_account');
    const info = await api<{ email: string; name?: string; picture?: string }>('https://www.googleapis.com/oauth2/v3/userinfo');
    writeSession({ mode: 'google', email: info.email, name: info.name, picture: info.picture });
    await syncNow();
  } catch (e) {
    set({ status: cloud.session?.mode === 'google' ? 'reconnect' : 'off', error: (e as Error).message });
    throw e;
  }
}

// ---------- Google Drive (pasta do app) ----------
class AuthError extends Error {}

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  if (!token || Date.now() > token.expires) throw new AuthError('Sessão do Google expirou.');
  const res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token.value}` } });
  if (res.status === 401) {
    token = null;
    throw new AuthError('Sessão do Google expirou.');
  }
  if (!res.ok) {
    // 403 costuma ser configuração (Drive API desativada) ou permissão não concedida no login
    const body = (await res.json().catch(() => null)) as { error?: { message?: string; errors?: { reason?: string }[] } } | null;
    const reason = body?.error?.errors?.[0]?.reason ?? '';
    if (/accessNotConfigured|SERVICE_DISABLED/i.test(reason + (body?.error?.message ?? '')))
      throw new Error('A Google Drive API não está ativada no projeto do Google Cloud.');
    if (/insufficient/i.test(reason + (body?.error?.message ?? ''))) {
      token = null;
      throw new Error('O acesso à pasta do app no Drive não foi permitido. Entre de novo e marque a permissão do Google Drive.');
    }
    throw new Error(`Google Drive respondeu ${res.status}${body?.error?.message ? `: ${body.error.message}` : ''}`);
  }
  const type = res.headers.get('content-type') ?? '';
  return (type.includes('json') ? res.json() : res.text()) as Promise<T>;
}

async function findFile(): Promise<string | null> {
  if (fileId) return fileId;
  const q = encodeURIComponent(`name='${FILE_NAME}'`);
  const r = await api<{ files: { id: string }[] }>(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id)&pageSize=1`,
  );
  fileId = r.files[0]?.id ?? null;
  return fileId;
}

async function download(id: string): Promise<unknown> {
  const text = await api<string | object>(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
  return typeof text === 'string' ? JSON.parse(text) : text;
}

async function upload(body: string): Promise<void> {
  const id = await findFile();
  if (id) {
    await api(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    return;
  }
  const boundary = 'pocadex' + Math.random().toString(36).slice(2);
  const meta = JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'], mimeType: 'application/json' });
  const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
  const r = await api<{ id: string }>('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: multipart,
  });
  fileId = r.id;
}

let running: Promise<void> | null = null;
/** Baixa da nuvem, mescla com o aparelho e envia o resultado. */
export function syncNow(): Promise<void> {
  if (cloud.session?.mode !== 'google') return Promise.resolve();
  running ??= (async () => {
    set({ status: 'syncing', error: null });
    try {
      const id = await findFile();
      const local = getProfile();
      const remote = id ? normalizeProfile(await download(id)) : null;
      const merged = remote ? mergeProfiles(local, remote) : local;
      if (profileFingerprint(merged) !== profileFingerprint(local)) setProfile(merged);
      if (!remote || profileFingerprint(merged) !== profileFingerprint(remote)) {
        await upload(JSON.stringify({ app: 'skz-pocadex', savedAt: new Date().toISOString(), ...merged }));
      }
      set({ status: 'synced', lastSync: Date.now() });
    } catch (e) {
      if (e instanceof AuthError) set({ status: 'reconnect', error: null });
      else set({ status: 'error', error: (e as Error).message });
    } finally {
      running = null;
    }
  })();
  return running;
}

// Envia alterações alguns segundos depois de cada mudança (agrupa toques seguidos)
let timer: ReturnType<typeof setTimeout> | null = null;
subscribeProfile(() => {
  if (cloud.session?.mode !== 'google' || !token) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), 3000);
});
// Ao voltar para o app, busca o que mudou em outros aparelhos
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && token) void syncNow();
  });
}
