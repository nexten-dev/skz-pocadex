import { useMemo, useState } from 'react';
import { TemplateGrid } from '../components/TemplateStrip';
import { PhotoPicker } from '../components/PhotoPicker';
import type { ViewProps } from '../components/common';
import { updateProfile, useProfile, type CustomTemplate } from '../lib/profile';
import { useAllTemplates } from '../lib/templates';
import { suggestUrl } from '../lib/photo';

const MY_SECTION = 'Meus templates';

/** Página com todos os templates (da comunidade e os seus), organizados por seção. */
export function TemplatesView({ db }: ViewProps) {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<CustomTemplate | null>(null);
  const profile = useProfile();
  const items = useAllTemplates(db);
  const sections = useMemo(() => [...new Set([MY_SECTION, ...items.map((t) => t.path.join(' › '))])], [items]);

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const map = new Map<string, typeof items>();
    for (const t of items) {
      const key = t.path.join(' › ');
      if (term && !`${key} ${t.title} ${t.author ?? ''}`.toLowerCase().includes(term)) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map.entries()];
  }, [items, q]);

  const startNew = () => setEditing({ id: `t${Date.now().toString(36)}`, title: '', image: '', section: MY_SECTION, t: 0 });
  const edit = (id: string) => {
    const t = profile.templates[id];
    if (t) setEditing({ ...t });
  };

  return (
    <>
      <section className="hero">
        <div>
          <h1>Templates</h1>
          <p className="muted">
            Folhas com vários cards juntos, para consulta. Fonte principal:{' '}
            {db.templates ? (
              <a href={db.templates.source.url} target="_blank" rel="noreferrer">
                {db.templates.source.name}
              </a>
            ) : (
              'comunidade'
            )}
            . Você também pode adicionar os seus — eles ficam salvos na sua coleção.
          </p>
        </div>
        <div>
          <button className="btn primary" onClick={startNew}>
            + Adicionar template
          </button>
        </div>
      </section>
      <div className="toolbar">
        <input type="search" placeholder="Buscar (ex.: MAXIDENT, Felix, fanclub)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar templates" />
      </div>
      {groups.map(([key, list]) => (
        <section key={key} className="template-section">
          <h2>{key}</h2>
          <TemplateGrid db={db} items={list} layout="grid" onEdit={edit} />
        </section>
      ))}
      {groups.length === 0 && <p className="muted">Nada encontrado.</p>}

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal item-form" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setEditing(null)} aria-label="Fechar">
              ✕
            </button>
            <h2>{editing.t ? 'Editar template' : 'Novo template'}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editing.title.trim() || !editing.image) return;
                updateProfile((p, now) => {
                  p.templates[editing.id] = { ...editing, title: editing.title.trim(), t: now };
                });
                setEditing(null);
              }}
            >
              <label>
                Nome *
                <input required value={editing.title} placeholder="Ex.: KARMA — POBs de lojas" onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </label>
              <div className="item-form-photo">
                {editing.image && <img className="template-preview" src={editing.image} alt="" referrerPolicy="no-referrer" />}
                <PhotoPicker
                  maxSide={1600}
                  label={editing.image ? '🖼 Trocar imagem' : '🖼 Enviar imagem do aparelho'}
                  onPick={(url) => setEditing({ ...editing, image: url })}
                />
              </div>
              <p className="small muted">
                Dica: prefira colar o <strong>link</strong> da imagem (Reddit, Imgur, X…). Imagens enviadas do aparelho ocupam
                mais espaço e não podem ser sugeridas para todos.
              </p>
              <div className="row">
                <label>
                  Seção
                  <input list="template-sections" value={editing.section} onChange={(e) => setEditing({ ...editing, section: e.target.value })} />
                  <datalist id="template-sections">
                    {sections.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </label>
                <label>
                  Lançamento (opcional)
                  <select value={editing.releaseId ?? ''} onChange={(e) => setEditing({ ...editing, releaseId: e.target.value || undefined })}>
                    <option value="">—</option>
                    {[...db.releases].reverse().map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="row">
                <label>
                  Autor / crédito
                  <input value={editing.author ?? ''} placeholder="Ex.: u/fulana ou @fulana" onChange={(e) => setEditing({ ...editing, author: e.target.value })} />
                </label>
                <label>
                  Link do post (opcional)
                  <input type="url" value={editing.post ?? ''} placeholder="https://…" onChange={(e) => setEditing({ ...editing, post: e.target.value })} />
                </label>
              </div>
              <div className="row">
                <button className="btn primary" type="submit" disabled={!editing.image || !editing.title.trim()}>
                  Salvar
                </button>
                {editing.t > 0 && /^https?:/.test(editing.image) && (
                  <a
                    className="btn"
                    target="_blank"
                    rel="noreferrer"
                    href={suggestUrl(`Template: ${editing.title}`, [
                      `**Nome:** ${editing.title}`,
                      `**Seção:** ${editing.section}`,
                      editing.releaseId ? `**Lançamento:** ${editing.releaseId}` : '',
                      `**Imagem:** ${editing.image}`,
                      editing.author ? `**Autor:** ${editing.author}` : '',
                      editing.post ? `**Post:** ${editing.post}` : '',
                    ].filter(Boolean))}
                  >
                    Sugerir para todos
                  </a>
                )}
                {editing.t > 0 && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      if (confirm(`Apagar “${editing.title}”?`)) {
                        updateProfile((p, now) => {
                          p.templates[editing.id] = { ...editing, deleted: true, t: now };
                        });
                        setEditing(null);
                      }
                    }}
                  >
                    Apagar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
