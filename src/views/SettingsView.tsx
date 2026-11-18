import { useRef, useState } from 'react';
import type { ViewProps } from '../components/common';
import { exportCollection, parseBackup } from '../lib/collection';
import { DEFAULT_DATA_URL, getDataUrl, setDataUrl, type SyncResult } from '../lib/data';
import type { Collection } from '../lib/types';

export function SettingsView({
  db,
  index,
  collection,
  sync,
  onSync,
  onReplace,
}: ViewProps & { sync: SyncResult; onSync: () => void; onReplace: (c: Collection) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(getDataUrl());
  const marked = Object.keys(collection.cards).length;
  const orphans = Object.keys(collection.cards).filter((id) => !index.byId.has(id)).length;

  return (
    <>
      <h1>Configurações</h1>

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
        <h2>Backup da coleção</h2>
        <p className="muted small">
          Sua coleção fica salva apenas neste navegador ({marked} photocards marcados). Exporte um backup para levar
          para outro aparelho.
          {orphans > 0 && ` ${orphans} marcações se referem a cards que não existem mais na base atual e foram mantidas.`}
        </p>
        <div className="row">
          <button className="btn primary" onClick={() => exportCollection(collection)}>
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
                const c = await parseBackup(f);
                if (confirm(`Substituir a coleção atual por ${Object.keys(c.cards).length} marcações do backup?`))
                  onReplace(c);
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
