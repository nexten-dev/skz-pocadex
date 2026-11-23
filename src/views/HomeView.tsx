import { useMemo, useState } from 'react';
import { AlbumForm } from '../components/AlbumForm';
import { countCards, memberMap, PhotocardTile, Progress, type ViewProps } from '../components/common';
import { useProfile } from '../lib/profile';
import { formatDate, TYPE_LABEL } from '../lib/data';
import { CategoryBar } from '../components/CategoryBar';
import { ReleaseCover } from '../components/ReleaseCover';

type MarketFilter = 'all' | 'KR' | 'JP' | 'TW';

export function HomeView({ db, index, collection, toggleCategory }: ViewProps) {
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [cegFilter, setCegFilter] = useState('');
  const [dealerFilter, setDealerFilter] = useState('');
  const notes = useProfile().notes;
  const members = memberMap(db);
  const releaseTitle = new Map(db.releases.map((r) => [r.id, r.title]));
  const distinct = (key: 'ceg' | 'dealer') =>
    [...new Set(Object.entries(notes).filter(([id]) => index.byId.has(id)).map(([, n]) => n[key]).filter((v): v is string => !!v))].sort((a, b) =>
      a.localeCompare(b),
    );
  const cegs = distinct('ceg');
  const dealers = distinct('dealer');
  const filtering = !!(cegFilter || dealerFilter);
  /** Cards cuja compra bate com os filtros de CEG/Dealer. */
  const matches = useMemo(
    () =>
      filtering
        ? Object.entries(notes)
            .filter(([, n]) => (!cegFilter || n.ceg === cegFilter) && (!dealerFilter || n.dealer === dealerFilter))
            .map(([id]) => index.byId.get(id))
            .filter((c): c is NonNullable<typeof c> => !!c)
        : [],
    [notes, cegFilter, dealerFilter, filtering, index],
  );
  const matchReleases = new Set(matches.map((c) => c.releaseId));
  const [market, setMarket] = useState<MarketFilter>('all');
  const [sort, setSort] = useState<'new' | 'old'>('new');

  const allItems = useMemo(() => [...index.byReleaseAll.values()].flat(), [index]);
  const overall = useMemo(() => countCards(index.all, collection), [index, collection]);

  const releases = useMemo(() => {
    const term = q.trim().toLowerCase();
    return db.releases
      .filter((r) => market === 'all' || r.market === market)
      .filter((r) => !filtering || matchReleases.has(r.id))
      .filter(
        (r) =>
          !term ||
          r.title.toLowerCase().includes(term) ||
          (r.altTitle ?? '').toLowerCase().includes(term) ||
          r.date.startsWith(term),
      )
      .sort((a, b) => (sort === 'new' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, q, market, sort, filtering, matches]);

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
          <button className="btn new-album" onClick={() => setCreating(true)}>
            + Novo álbum
          </button>
        </div>
      </section>
      {creating && (
        <AlbumForm
          onClose={(id) => {
            setCreating(false);
            if (id) window.location.hash = `#/release/${encodeURIComponent(id)}`;
          }}
        />
      )}

      <CategoryBar items={allItems} visible={index.visible} onToggle={toggleCategory} />

      {(cegs.length > 0 || dealers.length > 0) && (
        <div className="toolbar purchase-filter">
          <span className="small muted">🧾 Compras:</span>
          <select value={cegFilter} onChange={(e) => setCegFilter(e.target.value)} aria-label="Filtrar por CEG">
            <option value="">Todas as CEGs</option>
            {cegs.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select value={dealerFilter} onChange={(e) => setDealerFilter(e.target.value)} aria-label="Filtrar por Dealer">
            <option value="">Todas as dealers</option>
            {dealers.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          {filtering && (
            <button
              className="btn small"
              onClick={() => {
                setCegFilter('');
                setDealerFilter('');
              }}
            >
              Limpar filtro
            </button>
          )}
        </div>
      )}

      {filtering && (
        <section className="pc-group purchase-results">
          <header>
            <div>
              <h2>
                {matches.length} {matches.length === 1 ? 'item' : 'itens'}
                {cegFilter && ` · CEG: ${cegFilter}`}
                {dealerFilter && ` · Dealer: ${dealerFilter}`}
              </h2>
              <p className="small muted">Toque num item para abrir o álbum dele.</p>
            </div>
          </header>
          <div className="pc-grid">
            {matches.map((c) => (
              <PhotocardTile
                key={c.id}
                card={c}
                member={members.get(c.memberId)}
                status={collection.cards[c.id]?.s}
                showRelease={[releaseTitle.get(c.releaseId), notes[c.id]?.itemset].filter(Boolean).join(' · ')}
                onClick={() => (window.location.hash = `#/release/${encodeURIComponent(c.releaseId)}`)}
              />
            ))}
          </div>
        </section>
      )}

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
                {r.mine && <span className="tag mine">seu</span>}
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
