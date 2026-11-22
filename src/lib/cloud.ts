// Login e sincronização do arquivo pessoal na nuvem da própria pessoa.
// Provedores: Google (Google Drive) e Microsoft (OneDrive). Cada pessoa usa um por vez.
//
// - Sem servidor nosso: o login acontece no navegador e o arquivo "pocadex.json"
//   fica numa pasta do app na nuvem da pessoa (o app não acessa outros arquivos).
// - Mescla aparelho × nuvem por item (vale a alteração mais recente).
import { useSyncExternalStore } from 'react';
import { getProfile, mergeProfiles, normalizeProfile, profileFingerprint, setProfile, subscribeProfile } from './profile';

export type ProviderId = 'google' | 'microsoft';
export type SessionMode = 'guest' | ProviderId;

export interface ProviderUser {
  email: string;
  name?: string;
  picture?: string;
}

/** O que cada nuvem precisa saber fazer. */
export interface CloudProvider {
  id: ProviderId;
  label: string;
  storageName: string;
  configured: boolean;
  /** Login com janela (chamar a partir de um toque/clique). */
  signIn(hint?: string): Promise<ProviderUser>;
  /** Renova o acesso sem janela, se possível. */
  resume(hint?: string): Promise<boolean>;
  read(hint?: string): Promise<unknown | null>;
  write(body: string, hint?: string): Promise<void>;
  signOut(hint?: string): Promise<void>;
}

/** Erro que significa "precisa entrar de novo" (não é falha de verdade). */
export class AuthRequired extends Error {}

export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
export const MICROSOFT_CLIENT_ID: string = import.meta.env.VITE_MICROSOFT_CLIENT_ID ?? '';

/** Lista para a interface (não carrega o código de nenhum provedor). */
export const PROVIDERS: { id: ProviderId; label: string; button: string; storageName: string; configured: boolean }[] = [
  { id: 'google', label: 'Google', button: 'Entrar com Google', storageName: 'Google Drive', configured: !!GOOGLE_CLIENT_ID },
  { id: 'microsoft', label: 'Microsoft', button: 'Entrar com Microsoft', storageName: 'OneDrive', configured: !!MICROSOFT_CLIENT_ID },
];
export const providerInfo = (id?: SessionMode | null) => PROVIDERS.find((p) => p.id === id);

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

const SESSION_KEY = 'pocadex:session';

// ---------- estado observável ----------
let ready = false; // há acesso válido ao provedor nesta abertura do app
let cloud: CloudState = { session: readSession(), status: 'off', lastSync: null, error: null };
cloud.status = cloud.session && cloud.session.mode !== 'guest' ? 'reconnect' : 'off';
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

// ---------- provedores ----------
let microsoft: Promise<CloudProvider> | null = null;
async function provider(id: ProviderId): Promise<CloudProvider> {
  if (id === 'google') return googleProvider;
  microsoft ??= import('./cloud-microsoft').then((m) => m.microsoftProvider as CloudProvider);
  return microsoft;
}
function isAuthError(e: unknown): boolean {
  return e instanceof AuthRequired || (e as Error)?.constructor?.name === 'AuthRequired';
}

export function continueAsGuest() {
  writeSession({ mode: 'guest' });
  ready = false;
  set({ status: 'off' });
}

export async function signOut() {
  const s = cloud.session;
  if (s && s.mode !== 'guest') await (await provider(s.mode)).signOut(s.email).catch(() => {});
  ready = false;
  writeSession(null);
  set({ status: 'off', lastSync: null, error: null });
}

/** Login (ou reconexão) — chame a partir de um botão. */
export async function signIn(id: ProviderId): Promise<void> {
  set({ status: 'syncing', error: null });
  try {
    const p = await provider(id);
    const sameAccount = cloud.session?.mode === id ? cloud.session.email : undefined;
    const user = await p.signIn(sameAccount);
    writeSession({ mode: id, ...user });
    ready = true;
    await syncNow();
  } catch (e) {
    set({ status: cloud.session && cloud.session.mode !== 'guest' ? 'reconnect' : 'off', error: (e as Error).message });
    throw e;
  }
}

/** Compatibilidade: login com Google. */
export const signInWithGoogle = () => signIn('google');

/** Reconecta a conta atual (botão "Reconectar"). */
export function reconnect(): Promise<void> {
  const s = cloud.session;
  return s && s.mode !== 'guest' ? signIn(s.mode) : Promise.resolve();
}

/** Tenta voltar a sincronizar sem janela (ex.: Microsoft renova o acesso sozinha). */
export async function tryResume(): Promise<boolean> {
  const s = cloud.session;
  if (!s || s.mode === 'guest') return false;
  const ok = await (await provider(s.mode)).resume(s.email).catch(() => false);
  if (ok) {
    ready = true;
    await syncNow();
  }
  return ok;
}

let running: Promise<void> | null = null;
/** Baixa da nuvem, mescla com o aparelho e envia o resultado. */
export function syncNow(): Promise<void> {
  const s = cloud.session;
  if (!s || s.mode === 'guest') return Promise.resolve();
  const mode: ProviderId = s.mode;
  running ??= (async () => {
    set({ status: 'syncing', error: null });
    try {
      const p = await provider(mode);
      const local = getProfile();
      const raw = await p.read(s.email);
      const remote = raw ? normalizeProfile(raw) : null;
      const merged = remote ? mergeProfiles(local, remote) : local;
      if (profileFingerprint(merged) !== profileFingerprint(local)) setProfile(merged);
      if (!remote || profileFingerprint(merged) !== profileFingerprint(remote)) {
        await p.write(JSON.stringify({ app: 'skz-pocadex', savedAt: new Date().toISOString(), ...merged }), s.email);
      }
      ready = true;
      set({ status: 'synced', lastSync: Date.now() });
    } catch (e) {
      if (isAuthError(e)) {
        ready = false;
        set({ status: 'reconnect', error: null });
      } else set({ status: 'error', error: (e as Error).message });
    } finally {
      running = null;
    }
  })();
  return running;
}

// Envia alterações alguns segundos depois de cada mudança (agrupa toques seguidos)
let timer: ReturnType<typeof setTimeout> | null = null;
subscribeProfile(() => {
  if (!cloud.session || cloud.session.mode === 'guest' || !ready) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), 3000);
});
// Ao voltar para o app, busca o que mudou em outros aparelhos
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ready) void syncNow();
  });
}

// =====================================================================
// Provedor Google (Google Drive, pasta oculta do app "appDataFolder")
// =====================================================================
const G_SCOPES = 'https://www.googleapis.com/auth/drive.appdata openid email profile';
const G_FILE = 'pocadex.json';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(cfg: {
            client_id: string;
            scope: string;
            callback: (r: { access_token?: string; expires_in?: number; error?: string }) => void;
            error_callback?: (e: { type: string; message?: string }) => void;
          }): { requestAccessToken(o?: { prompt?: string; hint?: string }): void };
          revoke(token: string, done: () => void): void;
        };
      };
    };
  }
}

let gToken: { value: string; expires: number } | null = null;
let gFileId: string | null = null;
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

async function gRequestToken(prompt: '' | 'select_account', hint?: string): Promise<string> {
  if (!GOOGLE_CLIENT_ID) throw new Error('O login com Google ainda não foi configurado neste app.');
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: G_SCOPES,
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new Error(r.error ?? 'Login cancelado.'));
        gToken = { value: r.access_token, expires: Date.now() + ((r.expires_in ?? 3600) - 60) * 1000 };
        resolve(r.access_token);
      },
      error_callback: (e) => reject(new Error(e.type === 'popup_closed' ? 'Janela de login fechada.' : e.message ?? e.type)),
    });
    client.requestAccessToken({ prompt, hint });
  });
}

async function gApi<T>(url: string, init: RequestInit = {}): Promise<T> {
  if (!gToken || Date.now() > gToken.expires) throw new AuthRequired('Sessão do Google expirou.');
  const res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${gToken.value}` } });
  if (res.status === 401) {
    gToken = null;
    throw new AuthRequired('Sessão do Google expirou.');
  }
  if (!res.ok) {
    // 403 costuma ser configuração (Drive API desativada) ou permissão não concedida no login
    const body = (await res.json().catch(() => null)) as { error?: { message?: string; errors?: { reason?: string }[] } } | null;
    const reason = (body?.error?.errors?.[0]?.reason ?? '') + (body?.error?.message ?? '');
    if (/accessNotConfigured|SERVICE_DISABLED/i.test(reason)) throw new Error('A Google Drive API não está ativada no projeto do Google Cloud.');
    if (/insufficient/i.test(reason)) {
      gToken = null;
      throw new Error('O acesso à pasta do app no Drive não foi permitido. Entre de novo e marque a permissão do Google Drive.');
    }
    throw new Error(`Google Drive respondeu ${res.status}${body?.error?.message ? `: ${body.error.message}` : ''}`);
  }
  const type = res.headers.get('content-type') ?? '';
  return (type.includes('json') ? res.json() : res.text()) as Promise<T>;
}

async function gFindFile(): Promise<string | null> {
  if (gFileId) return gFileId;
  const q = encodeURIComponent(`name='${G_FILE}'`);
  const r = await gApi<{ files: { id: string }[] }>(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id)&pageSize=1`);
  gFileId = r.files[0]?.id ?? null;
  return gFileId;
}

const googleProvider: CloudProvider = {
  id: 'google',
  label: 'Google (Google Drive)',
  storageName: 'Google Drive',
  configured: !!GOOGLE_CLIENT_ID,
  async signIn(hint) {
    await gRequestToken(hint ? '' : 'select_account', hint);
    gFileId = null;
    return gApi<ProviderUser>('https://www.googleapis.com/oauth2/v3/userinfo');
  },
  async resume() {
    // O Google não renova o acesso sem janela num app sem servidor
    return !!gToken && Date.now() < gToken.expires;
  },
  async read() {
    const id = await gFindFile();
    if (!id) return null;
    const text = await gApi<string | object>(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
    return typeof text === 'string' ? JSON.parse(text) : text;
  },
  async write(body) {
    const id = await gFindFile();
    if (id) {
      await gApi(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      return;
    }
    const boundary = 'pocadex' + Math.random().toString(36).slice(2);
    const meta = JSON.stringify({ name: G_FILE, parents: ['appDataFolder'], mimeType: 'application/json' });
    const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
    const r = await gApi<{ id: string }>('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipart,
    });
    gFileId = r.id;
  },
  async signOut() {
    if (gToken && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(gToken.value, () => {});
    gToken = null;
    gFileId = null;
  },
};
