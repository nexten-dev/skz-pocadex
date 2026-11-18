import { useMemo } from 'react';
import { countCards, memberMap, PhotocardTile, Progress, type ViewProps } from '../components/common';

export function StatsView({ db, index, collection, setStatus }: ViewProps) {
  const members = memberMap(db);
  const releaseTitle = new Map(db.releases.map((r) => [r.id, r.title]));
  const overall = countCards(index.all, collection);

  const perMember = useMemo(
    () =>
      db.members.map((m) => ({
        m,
        counts: countCards(
          index.all.filter((c) => c.memberId === m.id),
          collection,
        ),
      })),
    [db, index, collection],
  );

  const byStatus = (s: 'transit' | 'wish') =>
    index.all
      .filter((c) => collection.cards[c.id]?.s === s)
      .sort((a, b) => (collection.cards[b.id]?.t ?? 0) - (collection.cards[a.id]?.t ?? 0));

  const transit = byStatus('transit');
  const wish = byStatus('wish');

  return (
    <>
      <section className="hero">
        <div>
          <h1>Minha coleção</h1>
          <p className="muted">Resumo de todos os lançamentos</p>
        </div>
        <div className="hero-progress">
          <Progress counts={overall} />
        </div>
      </section>

      <div className="stat-tiles">
        <div className="tile">
          <span className="tile-num">{overall.owned}</span>
          <span className="muted small">Tenho</span>
        </div>
        <div className="tile">
          <span className="tile-num transit-c">{overall.transit}</span>
          <span className="muted small">A caminho</span>
        </div>
        <div className="tile">
          <span className="tile-num wish-c">{overall.wish}</span>
          <span className="muted small">Quero</span>
        </div>
        <div className="tile">
          <span className="tile-num">{overall.total - overall.owned}</span>
          <span className="muted small">Faltando</span>
        </div>
      </div>

      <h2>Por membro</h2>
      <div className="member-list">
        {perMember
          .filter((x) => x.counts.total > 0)
          .map(({ m, counts }) => (
            <div key={m.id} className="member-row" style={{ ['--mc' as string]: m.color }}>
              <span className="dot" />
              <span className="member-name">
                {m.name} <span className="muted small">{m.hangul}</span>
              </span>
              <Progress counts={counts} compact />
            </div>
          ))}
      </div>

      <div className="section-head">
        <h2>A caminho ({transit.length})</h2>
        {transit.length > 0 && (
          <button
            className="btn small"
            onClick={() => {
              if (confirm(`Marcar os ${transit.length} photocards a caminho como recebidos?`))
                setStatus(transit.map((c) => c.id), 'owned');
            }}
          >
            Chegou tudo ✓
          </button>
        )}
      </div>
      {transit.length === 0 ? (
        <p className="muted small">Nenhum photocard a caminho. Marque com “✈ A caminho” na página do álbum.</p>
      ) : (
        <>
          <p className="muted small">Toque num card quando ele chegar para movê-lo para “Tenho”.</p>
          <div className="pc-grid">
            {transit.map((c) => (
              <PhotocardTile
                key={c.id}
                card={c}
                member={members.get(c.memberId)}
                status="transit"
                showRelease={`${releaseTitle.get(c.releaseId)}${c.version ? ` · ${c.version}` : ''}`}
                onClick={() => setStatus([c.id], 'owned')}
              />
            ))}
          </div>
        </>
      )}

      <h2>Lista de desejos ({wish.length})</h2>
      {wish.length === 0 ? (
        <p className="muted small">Sua lista de desejos está vazia.</p>
      ) : (
        <div className="pc-grid">
          {wish.map((c) => (
            <PhotocardTile
              key={c.id}
              card={c}
              member={members.get(c.memberId)}
              status="wish"
              showRelease={`${releaseTitle.get(c.releaseId)}${c.version ? ` · ${c.version}` : ''}`}
              onClick={() => (window.location.hash = `#/release/${encodeURIComponent(c.releaseId)}`)}
            />
          ))}
        </div>
      )}
    </>
  );
}
