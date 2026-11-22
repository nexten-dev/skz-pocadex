import { useState } from 'react';
import { continueAsGuest, GOOGLE_CLIENT_ID, signInWithGoogle, useCloud } from '../lib/cloud';

/** Tela inicial: entrar com Google (salva no Drive) ou continuar como visitante. */
export function LoginView({ onDone }: { onDone: () => void }) {
  const cloud = useCloud();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestWarn, setGuestWarn] = useState(false);
  const returning = cloud.session?.mode === 'google' ? cloud.session : null;

  const google = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-brand">
          <span className="logo">SKZ</span>
          <span>Pocadex</span>
        </div>
        <p className="muted">Organize sua coleção de photocards do Stray Kids.</p>

        {GOOGLE_CLIENT_ID ? (
          <button className="btn primary login-google" onClick={google} disabled={busy}>
            {busy ? 'Conectando…' : returning ? `Continuar como ${returning.email}` : 'Entrar com Google'}
          </button>
        ) : (
          <button className="btn login-google" disabled title="Login ainda não configurado">
            Entrar com Google (em breve)
          </button>
        )}
        <p className="small muted">
          Sua coleção, fotos e preferências ficam salvas no <strong>seu Google Drive</strong>, numa pasta privada do app, e
          aparecem em todos os seus aparelhos. O app não vê nenhum outro arquivo seu.
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
              <strong>⚠ Como visitante, nada é salvo na nuvem.</strong> Suas marcações ficam só neste navegador e podem ser
              perdidas se você limpar os dados do navegador, usar uma janela anônima ou trocar de aparelho.
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
