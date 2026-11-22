// Provedor Microsoft (OneDrive) para a sincronização do arquivo pessoal.
// Carregado sob demanda (import dinâmico) para não pesar para quem usa Google.
//
// - Login com MSAL (Microsoft Authentication Library), em janela popup, sem servidor.
// - Arquivo "pocadex.json" na pasta do app no OneDrive ("Aplicativos/SKZ Pocadex"),
//   com a permissão Files.ReadWrite.AppFolder: o app só acessa essa pasta.
// - A MSAL renova o acesso sozinha (sem pedir login) enquanto a sessão da Microsoft valer.
import {
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
  type IPublicClientApplication,
} from '@azure/msal-browser';
import { AuthRequired, MICROSOFT_CLIENT_ID, type CloudProvider, type ProviderUser } from './cloud';
const SCOPES = ['Files.ReadWrite.AppFolder'];
const GRAPH = 'https://graph.microsoft.com/v1.0/me/drive/special/approot';
const FILE = 'pocadex.json';

let app: IPublicClientApplication | null = null;
async function msal(): Promise<IPublicClientApplication> {
  if (app) return app;
  const redirectUri = new URL('auth-redirect.html', window.location.href.split('#')[0]).href;
  const pca = new PublicClientApplication({
    auth: {
      clientId: MICROSOFT_CLIENT_ID,
      authority: 'https://login.microsoftonline.com/common', // contas pessoais e de trabalho/escola
      redirectUri,
      postLogoutRedirectUri: redirectUri,
    },
    cache: { cacheLocation: 'localStorage' },
  });
  await pca.initialize();
  app = pca;
  return pca;
}

function account(pca: IPublicClientApplication, hint?: string): AccountInfo | null {
  const all = pca.getAllAccounts();
  return all.find((a) => a.username === hint) ?? all[0] ?? null;
}

async function token(hint?: string, interactive = false): Promise<string> {
  const pca = await msal();
  const acc = account(pca, hint);
  if (acc && !interactive) {
    try {
      const r = await pca.acquireTokenSilent({ scopes: SCOPES, account: acc });
      return r.accessToken;
    } catch (e) {
      if (!(e instanceof InteractionRequiredAuthError)) throw e;
      throw new AuthRequired('Sessão da Microsoft expirou.');
    }
  }
  if (!interactive) throw new AuthRequired('É preciso entrar com a Microsoft.');
  const r = await pca.acquireTokenPopup({ scopes: SCOPES, loginHint: hint, prompt: hint ? undefined : 'select_account' });
  if (r.account) pca.setActiveAccount(r.account);
  return r.accessToken;
}

async function graph(path: string, init: RequestInit = {}, hint?: string): Promise<Response> {
  const t = await token(hint);
  const res = await fetch(path.startsWith('http') ? path : `${GRAPH}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${t}` },
  });
  if (res.status === 401) throw new AuthRequired('Sessão da Microsoft expirou.');
  return res;
}

async function graphError(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  const code = body?.error?.code ?? '';
  if (/accessDenied|Forbidden/i.test(code) || res.status === 403)
    return new Error('O OneDrive recusou o acesso à pasta do app. Entre de novo e aceite a permissão de arquivos.');
  return new Error(`OneDrive respondeu ${res.status}${body?.error?.message ? `: ${body.error.message}` : ''}`);
}

export const microsoftProvider: CloudProvider = {
  id: 'microsoft',
  label: 'Microsoft (OneDrive)',
  storageName: 'OneDrive',
  configured: !!MICROSOFT_CLIENT_ID,

  async signIn(hint?: string): Promise<ProviderUser> {
    if (!MICROSOFT_CLIENT_ID) throw new Error('O login com Microsoft ainda não foi configurado neste app.');
    await token(hint, true);
    const acc = account(await msal(), hint);
    if (!acc) throw new Error('Login cancelado.');
    return { email: acc.username, name: acc.name };
  },

  /** Tenta renovar o acesso sem abrir janela (funciona enquanto a sessão da Microsoft valer). */
  async resume(hint?: string): Promise<boolean> {
    if (!MICROSOFT_CLIENT_ID) return false;
    try {
      await token(hint);
      return true;
    } catch {
      return false;
    }
  },

  async read(hint?: string): Promise<unknown | null> {
    const res = await graph(`:/${FILE}:/content`, {}, hint);
    if (res.status === 404) return null;
    if (!res.ok) throw await graphError(res);
    return res.json();
  },

  async write(body: string, hint?: string): Promise<void> {
    const size = new Blob([body]).size;
    if (size < 3.5 * 1024 * 1024) {
      const res = await graph(`:/${FILE}:/content`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body }, hint);
      if (!res.ok) throw await graphError(res);
      return;
    }
    // Arquivo grande (muitas fotos): sessão de upload
    const s = await graph(`:/${FILE}:/createUploadSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } }),
    }, hint);
    if (!s.ok) throw await graphError(s);
    const { uploadUrl } = (await s.json()) as { uploadUrl: string };
    const bytes = new TextEncoder().encode(body);
    const CHUNK = 320 * 1024 * 30; // múltiplo de 320 KiB, como o OneDrive exige
    for (let start = 0; start < bytes.length; start += CHUNK) {
      const end = Math.min(start + CHUNK, bytes.length);
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Range': `bytes ${start}-${end - 1}/${bytes.length}` },
        body: bytes.slice(start, end),
      });
      if (!res.ok && res.status !== 202) throw await graphError(res);
    }
  },

  async signOut(hint?: string): Promise<void> {
    if (!MICROSOFT_CLIENT_ID) return;
    const pca = await msal();
    const acc = account(pca, hint);
    if (acc) await pca.clearCache({ account: acc }).catch(() => {});
  },
};
