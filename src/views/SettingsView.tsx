import { useRef, useState } from 'react';
import type { ViewProps } from '../components/common';
import { exportBackup, importBackup, parseBackup } from '../lib/collection';
import { GOOGLE_CLIENT_ID, signInWithGoogle, signOut, syncNow, useCloud } from '../lib/cloud';
import { useVisibleMembers } from '../lib/categories';
import { useProfile } from '../lib/profile';
import { DEFAULT_DATA_URL, getDataUrl, setDataUrl, type SyncResult } from '../lib/data';
import { setConceptEnabled } from '../lib/images';
import { CATEGORIES } from '../lib/categories';
import { usePwa } from '../lib/pwa';

export function SettingsView({
  db,
  index,
  collection,
  customImages,
  setVisibleCategories,
  sync,
  onSync,
  onToast,
}: ViewProps & { sync: SyncResult; onSync: () => void; onToast: (msg: string) => void }) {
  const cloud = useCloud();
  const profile = useProfile();
  const { members: visibleMembers, setMembers } = useVisibleMembers();
  const memberOptions = [...db.members.map((m) => ({ id: m.id, name: m.former ? `${m.name} (ex-membro)` : m.name })), { id: 'group', name: 'Grupo / units' }];
  const shownMembers = visibleMembers ?? memberOptions.map((m) => m.id);
  const toggleMember = (id: string) => {
    const next = shownMembers.includes(id) ? shownMembers.filter((m) => m !== id) : [...shownMembers, id];
    setMembers(next.length === memberOptions.length ? null : next.length ? next : shownMembers);
  };
  const photosKb = Math.round(
    Object.values(profile.images).reduce((n, i) => n + (i.url.startsWith('data:') ? i.url.length * 0.75 : 0), 0) / 1024,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(getDataUrl());
  const pwa = usePwa();
  const concept = profile.prefs.showConcept;
  const marked = Object.keys(collection.cards).length;
  const orphans = Object.keys(collection.cards).filter((id) => !index.byId.has(id)).length;

  return (
    <>
      <h1>Configurações</h1>

      <section className="panel">
        <h2>Conta e sincronização</h2>
        {cloud.session?.mode === 'google' ? (
          <>
            <p className="small">
              <span className={`cloud-dot ${cloud.status}`} />
              Conectado como <strong>{cloud.session.email}</strong>.{' '}
              {cloud.status === 'synced' && cloud.lastSync && `Sincronizado às ${new Date(cloud.lastSync).toLocaleTimeString('pt-BR')}.`}
              {cloud.status === 'syncing' && 'Sincronizando…'}
              {cloud.status === 'reconnect' && 'Sincronização pausada — reconecte para continuar.'}
              {cloud.status === 'error' && `Erro: ${cloud.error}`}
            </p>
            <p className="small muted">
              Sua coleção, fotos, preferências, itens e templates ficam no seu Google Drive (pasta privada do app) e em todos os
              aparelhos em que você entrar.
            </p>
            <div className="row">
              {cloud.status === 'reconnect' ? (
                <button className="btn primary" onClick={() => signInWithGoogle().catch(() => {})}>
                  Reconectar
                </button>
              ) : (
                <button className="btn primary" onClick={() => syncNow()}>
                  Sincronizar agora
                </button>
              )}
              <button
                className="btn"
                onClick={() => {
                  if (confirm('Sair da conta? Seus dados continuam no Google Drive e neste aparelho.')) signOut();
                }}
              >
                Sair
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="small">
              Você está como <strong>visitante</strong>: nada é salvo na nuvem. As marcações ficam só neste navegador.
            </p>
            {GOOGLE_CLIENT_ID ? (
              <button className="btn primary" onClick={() => signInWithGoogle().then(() => onToast('Conectado ao Google Drive')).catch(() => {})}>
                Entrar com Google
              </button>
            ) : (
              <p className="small muted">O login com Google ainda não foi configurado neste app.</p>
            )}
          </>
        )}
      </section>

      <section className="panel">
        <h2>Membros</h2>
        <p className="muted small">Escolha de quais membros os cards aparecem no app, no progresso e na sua coleção.</p>
        <div className="member-toggles">
          {memberOptions.map((m) => {
            const color = db.members.find((x) => x.id === m.id)?.color ?? 'var(--accent)';
            const on = shownMembers.includes(m.id);
            return (
              <button
                key={m.id}
                className={on ? 'chip on' : 'chip'}
                style={{ ['--mc' as string]: color }}
                aria-pressed={on}
                onClick={() => toggleMember(m.id)}
              >
                {on ? '✓ ' : ''}
                {m.name}
              </button>
            );
          })}
        </div>
        <div className="row" style={{ marginTop: '0.6rem' }}>
          <button className="btn small" onClick={() => setMembers(null)}>
            Mostrar todos
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Base de dados</h2>
        <dl className="kv">
          <dt>Versão da base</dt>
          <dd>{db.dataVersion}</dd>
          <dt>Atualizada em</dt>
          <dd>{db.updatedAt}</dd>
          <dt>Status</dt>
          <dd>
            {sync.status === 'offline'
              ? `Offline (${sync.error}) — usando cópia local`
              : 'Sincronizada ao abrir o app'}
          </dd>
          <dt>Versão do app</dt>
          <dd>{__APP_VERSION__}</dd>
        </dl>
        <button className="btn primary" onClick={onSync}>
          Verificar atualizações agora
        </button>
        <details className="small">
          <summary>Fonte da base (avançado)</summary>
          <p className="muted">
            O app baixa esta URL toda vez que é aberto. Use outra URL para testar uma base alternativa.
          </p>
          <div className="row">
            <input value={url} onChange={(e) => setUrl(e.target.value)} aria-label="URL da base" />
            <button
              className="btn"
              onClick={() => {
                setDataUrl(url.trim() || null);
                onSync();
              }}
            >
              Salvar
            </button>
            <button
              className="btn"
              onClick={() => {
                setDataUrl(null);
                setUrl(DEFAULT_DATA_URL);
                onSync();
              }}
            >
              Padrão
            </button>
          </div>
        </details>
        {db.sources && (
          <>
            <h3>Fontes</h3>
            <ul className="small">
              {db.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="panel">
        <h2>Instalar no celular ou computador</h2>
        {pwa.standalone ? (
          <p className="small">✓ Você está usando o app instalado. Ele abre em tela cheia e funciona sem internet.</p>
        ) : (
          <>
            <p className="muted small">
              Instale o Pocadex para abrir pelo ícone na tela inicial, em tela cheia e mesmo sem internet.
            </p>
            {pwa.canInstall && (
              <button className="btn primary" onClick={pwa.promptInstall}>
                Instalar app
              </button>
            )}
            {pwa.platform === 'ios' && (
              <ol className="small install-steps">
                <li>Abra esta página no <strong>Safari</strong>.</li>
                <li>
                  Toque em <strong>Compartilhar</strong> (quadrado com seta para cima).
                </li>
                <li>
                  Escolha <strong>“Adicionar à Tela de Início”</strong> e confirme.
                </li>
              </ol>
            )}
            {pwa.platform === 'android' && !pwa.canInstall && (
              <ol className="small install-steps">
                <li>Abra esta página no <strong>Chrome</strong>.</li>
                <li>
                  Toque no menu <strong>⋮</strong> e escolha <strong>“Instalar app”</strong> ou{' '}
                  <strong>“Adicionar à tela inicial”</strong>.
                </li>
              </ol>
            )}
            {pwa.platform === 'desktop' && !pwa.canInstall && (
              <p className="small muted">
                No Chrome ou Edge, use o ícone de instalação na barra de endereço. No celular, abra o mesmo endereço
                deste site e siga as instruções que aparecem aqui.
              </p>
            )}
          </>
        )}
      </section>

      <section className="panel">
        <h2>O que mostrar</h2>
        <p className="muted small">
          Escolha quais tipos de itens aparecem nos álbuns, no progresso e na sua coleção. Itens ocultos continuam com
          suas marcações salvas.
        </p>
        <div className="cat-list">
          {CATEGORIES.map((c) => {
            const total = [...index.byReleaseAll.values()].flat().filter((x) => x.category === c.id).length;
            const on = index.visible.includes(c.id);
            return (
              <label key={c.id} className="toggle cat-option">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setVisibleCategories(on ? index.visible.filter((v) => v !== c.id) : [...index.visible, c.id])
                  }
                />
                <span>
                  {c.icon} <strong>{c.label}</strong> <span className="muted small">({total})</span>
                  <br />
                  <span className="muted small">{c.description}</span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="row" style={{ marginTop: '0.8rem' }}>
          <button className="btn small" onClick={() => setVisibleCategories(['photocard'])}>
            Só photocards
          </button>
          <button className="btn small" onClick={() => setVisibleCategories(CATEGORIES.map((c) => c.id))}>
            Mostrar tudo
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Imagens</h2>
        <p className="muted small">
          As imagens vêm da Stray Kids Wiki e são atualizadas toda semana na base do app. As wikis não têm fotos
          individuais dos photocards; o app mostra a <strong>prévia oficial de cada versão</strong> do álbum e, nos cards,
          a <strong>foto de divulgação do membro</strong> naquela era (marcada com 📷). Você pode trocar a imagem de
          qualquer card no modo “🔍 Ver”. {Object.keys(customImages).length} fotos escolhidas ou enviadas por você
          {photosKb > 0 && ` (${photosKb} KB de fotos enviadas do aparelho)`}.
        </p>
        <label className="toggle">
          <input
            type="checkbox"
            checked={concept}
            onChange={(e) => {
              setConceptEnabled(e.target.checked);
            }}
          />
          Mostrar as fotos de divulgação dos membros nos cards
        </label>
      </section>

      <section className="panel">
        <h2>Backup da coleção</h2>
        <p className="muted small">
          {cloud.session?.mode === 'google'
            ? 'Sua coleção já fica salva no Google Drive. O backup é uma cópia extra em arquivo.'
            : 'Como visitante, sua coleção fica só neste navegador. Exporte um backup de vez em quando para não perder nada.'}{' '}
          ({marked} itens marcados, {Object.values(profile.items).filter((i) => !i.deleted).length} itens próprios,{' '}
          {Object.values(profile.templates).filter((t) => !t.deleted).length} templates seus.)
          {orphans > 0 && ` ${orphans} marcações se referem a cards que não existem mais na base atual e foram mantidas.`}
        </p>
        <div className="row">
          <button className="btn primary" onClick={() => exportBackup()}>
            Exportar backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Importar backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                const backup = await parseBackup(f);
                const n = Object.keys(backup.cards).length;
                if (confirm(`Juntar as ${n} marcações do backup com a sua coleção atual?\n\nOK = juntar (mantém o mais recente de cada card)\nCancelar = escolher substituir`)) {
                  importBackup(backup, 'merge');
                  onToast('Backup juntado à sua coleção');
                } else if (confirm(`Substituir TODA a coleção atual pelo backup (${n} marcações)?`)) {
                  importBackup(backup, 'replace');
                  onToast('Coleção substituída pelo backup');
                }
              } catch (err) {
                alert(err instanceof Error ? err.message : 'Erro ao importar');
              }
            }}
          />
        </div>
      </section>
    </>
  );
}
