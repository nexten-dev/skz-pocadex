import { useEffect, useState } from 'react';
import { continueAsGuest, PROVIDERS, providerInfo, signIn, tryResume, useCloud, type ProviderId } from '../lib/cloud';

/** Tela inicial: entrar com Google (salva no Google Drive da pessoa) ou como visitante. */
export function LoginView({ onDone }: { onDone: () => void }) {
  const cloud = useCloud();
  const [busy, setBusy] = useState<ProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guestWarn, setGuestWarn] = useState(false);
  const [resumed, setResumed] = useState(false);
  const returning = cloud.session && cloud.session.mode !== 'guest' ? cloud.session : null;
  const returningInfo = providerInfo(returning?.mode);

  // Se o acesso ainda for válido nesta aba, entra sem janela
  useEffect(() => {
    if (returning) tryResume().then(setResumed).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = async (id: ProviderId) => {
    if (resumed && returning?.mode === id) return onDone();
    setBusy(id);
    setError(null);
    try {
      await signIn(id);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const configured = PROVIDERS.filter((p) => p.configured);

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-brand">
          <span className="logo">SKZ</span>
          <span>Pocadex</span>
        </div>
        <p className="muted">Organize sua coleção de photocards do Stray Kids.</p>

        {returning && returningInfo?.configured ? (
          <>
            <button className={`btn primary login-google provider-${returning.mode}`} onClick={() => go(returning.mode as ProviderId)} disabled={!!busy}>
              {busy ? 'Conectando…' : `Continuar como ${returning.email}`}
            </button>
            <p className="small muted">
              Conta {returningInfo.label} · {returningInfo.storageName}
              {resumed && ' · conectado ✓'}
            </p>
            {configured
              .filter((p) => p.id !== returning.mode)
              .map((p) => (
                <button key={p.id} className="btn" onClick={() => go(p.id)} disabled={!!busy}>
                  {busy === p.id ? 'Conectando…' : `Usar ${p.label} (${p.storageName})`}
                </button>
              ))}
          </>
        ) : configured.length ? (
          configured.map((p) => (
            <button key={p.id} className={`btn primary login-google provider-${p.id}`} onClick={() => go(p.id)} disabled={!!busy}>
              {busy === p.id ? 'Conectando…' : `${p.button} (${p.storageName})`}
            </button>
          ))
        ) : (
          <button className="btn login-google" disabled title="Login ainda não configurado">
            Entrar com Google (em breve)
          </button>
        )}
        <p className="small muted">
          Sua coleção, fotos e preferências ficam salvas no <strong>seu Google Drive</strong>, numa pasta privada do
          app, e aparecem em todos os seus aparelhos. O app não acessa nenhum outro arquivo seu.
        </p>
        {error && <p className="small login-error">{error}</p>}

        <hr />

        {!guestWarn ? (
          <button className="btn" onClick={() => setGuestWarn(true)}>
            {returning ? 'Usar sem sincronizar agora' : 'Entrar como visitante'}
          </button>
        ) : (
          <div className="guest-warning">
            <p className="small">
              <strong>⚠ {returning ? 'Sem sincronizar, nada vai para a nuvem agora.' : 'Como visitante, nada é salvo na nuvem.'}</strong>{' '}
              {returning
                ? 'O que você marcar fica neste navegador e será enviado quando você reconectar.'
                : 'Suas marcações ficam só neste navegador e podem ser perdidas se você limpar os dados do navegador, usar uma janela anônima ou trocar de aparelho.'}
            </p>
            <div className="row">
              <button
                className="btn primary"
                onClick={() => {
                  if (!returning) continueAsGuest();
                  onDone();
                }}
              >
                Entendi, continuar
              </button>
              <button className="btn" onClick={() => setGuestWarn(false)}>
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="small muted login-foot">Projeto de fã, sem afiliação com a JYP Entertainment · v{__APP_VERSION__}</p>
    </div>
  );
}
