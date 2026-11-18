import { useRef, useState } from 'react';
import type { ViewProps } from '../components/common';
import { exportCollection, parseBackup } from '../lib/collection';
import { DEFAULT_DATA_URL, getDataUrl, setDataUrl, type SyncResult } from '../lib/data';
import type { Collection } from '../lib/types';
import { clearWikiCache, isWikiEnabled, setWikiEnabled } from '../lib/images';
import { WIKI_SOURCES } from '../lib/wiki';
import { CATEGORIES } from '../lib/categories';

export function SettingsView({
  db,
  index,
  collection,
  customImages,
  setVisibleCategories,
  sync,
  onSync,
  onReplace,
}: ViewProps & { sync: SyncResult; onSync: () => void; onReplace: (c: Collection, imgs: Record<string, { url: string; page?: string; source?: string }> | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(getDataUrl());
  const [wiki, setWiki] = useState(isWikiEnabled());
  const [cleared, setCleared] = useState(false);
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
        <h2>Prévias dos photocards</h2>
        <p className="muted small">
          Ao abrir um álbum, o app procura imagens de photocards nas wikis ({WIKI_SOURCES.map((s) => s.name).join(', ')}) e
          guarda o resultado por 7 dias. Imagens marcadas com ≈ são aproximadas (mesmo membro e álbum, versão não
          confirmada). Você pode trocar qualquer imagem no modo “🔍 Ver”. {Object.keys(customImages).length} imagens
          escolhidas por você.
        </p>
        <label className="toggle">
          <input
            type="checkbox"
            checked={wiki}
            onChange={(e) => {
              setWikiEnabled(e.target.checked);
              setWiki(e.target.checked);
            }}
          />
          Buscar prévias automaticamente nas wikis
        </label>
        <div className="row" style={{ marginTop: '0.8rem' }}>
          <button
            className="btn"
            onClick={() => {
              clearWikiCache();
              setCleared(true);
            }}
          >
            {cleared ? 'Cache limpo ✓' : 'Limpar cache de imagens'}
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Backup da coleção</h2>
        <p className="muted small">
          Sua coleção fica salva apenas neste navegador ({marked} photocards marcados). Exporte um backup para levar
          para outro aparelho.
          {orphans > 0 && ` ${orphans} marcações se referem a cards que não existem mais na base atual e foram mantidas.`}
        </p>
        <div className="row">
          <button className="btn primary" onClick={() => exportCollection(collection, customImages)}>
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
                const { collection: c, customImages: imgs } = await parseBackup(f);
                if (confirm(`Substituir a coleção atual por ${Object.keys(c.cards).length} marcações do backup?`))
                  onReplace(c, imgs);
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
