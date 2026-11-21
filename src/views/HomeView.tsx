import { useMemo, useState } from 'react';
import { countCards, Progress, type ViewProps } from '../components/common';
import { formatDate, TYPE_LABEL } from '../lib/data';
import { CategoryBar } from '../components/CategoryBar';
import { ReleaseCover } from '../components/ReleaseCover';

type MarketFilter = 'all' | 'KR' | 'JP' | 'TW';

export function HomeView({ db, index, collection, toggleCategory }: ViewProps) {
  const [q, setQ] = useState('');
  const [market, setMarket] = useState<MarketFilter>('all');
  const [sort, setSort] = useState<'new' | 'old'>('new');

  const allItems = useMemo(() => [...index.byReleaseAll.values()].flat(), [index]);
  const overall = useMemo(() => countCards(index.all, collection), [index, collection]);

  const releases = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.releases
      .filter((r) => market === 'all' || r.market === market)
      .filter(
        (r) =>
          !term ||
          r.title.toLowerCase().includes(term) ||
          (r.altTitle ?? '').toLowerCase().includes(term) ||
          r.date.startsWith(term),
      )
      .sort((a, b) => (sort === 'new' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
  }, [db, q, market, sort]);

  return (
    <>
      <section className="hero">
        <div>
          <h1>Minha coleção de photocards</h1>
          <p className="muted">
            {db.releases.length} lançamentos · {overall.total} itens nas categorias selecionadas
          </p>
        </div>
        <div className="hero-progress">
          <Progress counts={overall} />
        </div>
      </section>

      <CategoryBar items={allItems} visible={index.visible} onToggle={toggleCategory} />

      <div className="toolbar">
        <input
          type="search"
          placeholder="Buscar álbum ou ano…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar"
        />
        <div className="seg-control" role="group" aria-label="Mercado">
          {(['all', 'KR', 'JP', 'TW'] as MarketFilter[])
            .filter((m) => m === 'all' || db.releases.some((r) => r.market === m))
            .map((m) => (
            <button key={m} className={market === m ? 'on' : ''} onClick={() => setMarket(m)}>
              {m === 'all' ? 'Todos' : m === 'KR' ? 'Coreia' : m === 'JP' ? 'Japão' : 'Taiwan'}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as 'new' | 'old')} aria-label="Ordenar">
          <option value="new">Mais recentes</option>
          <option value="old">Mais antigos</option>
        </select>
      </div>

      <div className="release-grid">
        {releases.map((r) => {
          const counts = countCards(index.byRelease.get(r.id) ?? [], collection);
          const complete = counts.total > 0 && counts.owned === counts.total;
          return (
            <a key={r.id} href={`#/release/${encodeURIComponent(r.id)}`} className={`release-card ${complete ? 'complete' : ''}`}>
              <ReleaseCover db={db} release={r} />
              <div className="release-head">
                <span className={`tag ${r.market}`}>{r.market}</span>
                <span className="tag">{TYPE_LABEL[r.type] ?? r.type}</span>
                {!r.verified && (
                  <span className="tag warn" title="Lista ainda não conferida com fontes oficiais">
                    prévia
                  </span>
                )}
                {complete && <span className="tag ok">completo ★</span>}
              </div>
              <h3>{r.title}</h3>
              <p className="muted small">
                {r.altTitle ? `${r.altTitle} · ` : ''}
                {formatDate(r.date)}
              </p>
              <Progress counts={counts} compact />
            </a>
          );
        })}
        {releases.length === 0 && <p className="muted">Nenhum lançamento encontrado.</p>}
      </div>
    </>
  );
}
