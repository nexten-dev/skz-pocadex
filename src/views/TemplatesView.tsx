import { useMemo, useState } from 'react';
import { TemplateGrid } from '../components/TemplateStrip';
import type { ViewProps } from '../components/common';

/** Página com todos os templates da comunidade, organizados como na wiki de origem. */
export function TemplatesView({ db }: ViewProps) {
  const [q, setQ] = useState('');
  const items = db.templates?.items ?? [];
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

  if (!db.templates) return <p className="center muted">Nenhum template na base ainda.</p>;
  return (
    <>
      <section className="hero">
        <div>
          <h1>Templates</h1>
          <p className="muted">
            Folhas com vários cards juntos, feitas pela comunidade, para consulta. Fonte:{' '}
            <a href={db.templates.source.url} target="_blank" rel="noreferrer">
              {db.templates.source.name}
            </a>
            . Toque numa imagem para ampliar e ver o post original com o crédito do autor.
          </p>
        </div>
      </section>
      <div className="toolbar">
        <input type="search" placeholder="Buscar (ex.: MAXIDENT, Felix, fanclub)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar templates" />
      </div>
      {groups.map(([key, list]) => (
        <section key={key} className="template-section">
          <h2>{key}</h2>
          <TemplateGrid db={db} items={list} layout="grid" />
        </section>
      ))}
      {groups.length === 0 && <p className="muted">Nada encontrado.</p>}
    </>
  );
}
