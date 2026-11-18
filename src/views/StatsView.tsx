import { useMemo, useState } from 'react';
import { countCards, memberMap, PhotocardTile, Progress, type ViewProps } from '../components/common';
import { CATEGORIES } from '../lib/categories';
import { isTransit, nextStatus, STATUS_INFO, TRANSIT_STEPS } from '../lib/status';
import type { Photocard, TransitStatus } from '../lib/types';

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

  const recent = (a: Photocard, b: Photocard) => (collection.cards[b.id]?.t ?? 0) - (collection.cards[a.id]?.t ?? 0);
  const transit = index.all.filter((c) => isTransit(collection.cards[c.id]?.s)).sort(recent);
  const wish = index.all.filter((c) => collection.cards[c.id]?.s === 'wish').sort(recent);
  const byStep = new Map<TransitStatus, Photocard[]>(TRANSIT_STEPS.map((t) => [t.id as TransitStatus, []]));
  for (const c of transit) byStep.get(collection.cards[c.id].s as TransitStatus)?.push(c);
  const [stepFilter, setStepFilter] = useState<TransitStatus | 'all'>('all');
  const label = (c: Photocard) => `${releaseTitle.get(c.releaseId)}${c.version ? ` · ${c.version}` : ''}`;

  return (
    <>
      <section className="hero">
        <div>
          <h1>Minha coleção</h1>
          <p className="muted">
            Resumo de todos os lançamentos · <a href="#/settings">escolher o que mostrar</a>
          </p>
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
        <div className="tile">
          <span className="tile-num notwant-c">{overall.notwant}</span>
          <span className="muted small">Não quero</span>
        </div>
      </div>

      {index.visible.length > 1 && (
        <>
          <h2>Por categoria</h2>
          <div className="member-list">
            {CATEGORIES.filter((c) => index.visible.includes(c.id)).map((c) => {
              const counts = countCards(
                index.all.filter((x) => x.category === c.id),
                collection,
              );
              if (!counts.total) return null;
              return (
                <div key={c.id} className="member-row" style={{ ['--mc' as string]: 'var(--accent)' }}>
                  <span aria-hidden>{c.icon}</span>
                  <span className="member-name">{c.short}</span>
                  <Progress counts={counts} compact />
                </div>
              );
            })}
          </div>
        </>
      )}

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
      </div>
      {transit.length === 0 ? (
        <p className="muted small">
          Nenhum item a caminho. Na página do álbum, use “🚚 A caminho” e escolha a etapa da compra.
        </p>
      ) : (
        <>
          <div className="pipeline" role="group" aria-label="Etapas da compra">
            <button className={stepFilter === 'all' ? 'pipe-step on' : 'pipe-step'} onClick={() => setStepFilter('all')}>
              <span className="pipe-icon">📦</span>
              <span className="pipe-label">Todas</span>
              <span className="pipe-count">{transit.length}</span>
            </button>
            {TRANSIT_STEPS.map((t) => {
              const n = byStep.get(t.id as TransitStatus)?.length ?? 0;
              return (
                <button
                  key={t.id}
                  className={`pipe-step ${stepFilter === t.id ? 'on' : ''} ${n ? '' : 'empty'}`}
                  onClick={() => setStepFilter(t.id as TransitStatus)}
                  title={t.description}
                >
                  <span className="pipe-icon">{t.icon}</span>
                  <span className="pipe-label">
                    {t.step}. {t.label}
                  </span>
                  <span className="pipe-count">{n}</span>
                </button>
              );
            })}
          </div>
          <p className="muted small">
            Toque num card para avançar para a próxima etapa. Depois de “Enviado”, ele vai para “Tenho”.
          </p>
          {TRANSIT_STEPS.filter((t) => stepFilter === 'all' || stepFilter === t.id).map((t) => {
            const list = byStep.get(t.id as TransitStatus) ?? [];
            if (!list.length) return null;
            const next = nextStatus(t.id as TransitStatus);
            return (
              <section key={t.id} className="pc-group">
                <header>
                  <div>
                    <h2>
                      {t.icon} {t.step}. {t.label} ({list.length})
                    </h2>
                    <p className="small muted">{t.description}</p>
                  </div>
                  <div className="group-actions">
                    <button
                      className="btn small"
                      onClick={() => {
                        if (confirm(`Mover ${list.length} itens de “${t.label}” para “${STATUS_INFO[next].label}”?`))
                          setStatus(list.map((c) => c.id), next);
                      }}
                    >
                      Todos → {STATUS_INFO[next].label}
                    </button>
                  </div>
                </header>
                <div className="pc-grid">
                  {list.map((c) => (
                    <PhotocardTile
                      key={c.id}
                      card={c}
                      member={members.get(c.memberId)}
                      status={t.id as TransitStatus}
                      showRelease={label(c)}
                      onClick={() => setStatus([c.id], next)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
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
              showRelease={label(c)}
              onClick={() => (window.location.hash = `#/release/${encodeURIComponent(c.releaseId)}`)}
            />
          ))}
        </div>
      )}
    </>
  );
}
