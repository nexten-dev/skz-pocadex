import { useMemo, useState } from 'react';
import { countCards, memberMap, PhotocardTile, Progress, type ViewProps } from '../components/common';
import { STATUS_LABEL } from '../lib/collection';
import { formatDate, releaseMembers, TYPE_LABEL } from '../lib/data';
import type { CardStatus, Photocard } from '../lib/types';
import { useReleaseImages } from '../lib/images';
import { CardDetail } from '../components/CardDetail';

type Mode = CardStatus | 'clear' | 'view';
type StatusFilter = 'all' | 'missing' | CardStatus;

const MODES: { id: Mode; label: string }[] = [
  { id: 'owned', label: '✓ Tenho' },
  { id: 'transit', label: '✈ A caminho' },
  { id: 'wish', label: '♥ Quero' },
  { id: 'clear', label: '✕ Limpar' },
  { id: 'view', label: '🔍 Ver' },
];

export function ReleaseView({
  db,
  index,
  collection,
  setStatus,
  setQty,
  customImages,
  setCustomImage,
  releaseId,
}: ViewProps & { releaseId: string }) {
  const release = db.releases.find((r) => r.id === releaseId);
  const [mode, setMode] = useState<Mode>('owned');
  const [member, setMember] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [openCard, setOpenCard] = useState<string | null>(null);
  const members = memberMap(db);

  const cards = index.byRelease.get(releaseId) ?? [];
  const memberIds = useMemo(() => (release ? releaseMembers(db, release) : []), [db, release]);
  const { images, candidates, state: imgState, reload } = useReleaseImages(release, cards, memberIds, customImages);
  const counts = useMemo(() => countCards(cards, collection), [cards, collection]);

  const visible = useMemo(
    () =>
      cards.filter((c) => {
        if (member !== 'all' && c.memberId !== member) return false;
        const s = collection.cards[c.id]?.s;
        if (statusFilter === 'all') return true;
        if (statusFilter === 'missing') return s !== 'owned';
        return s === statusFilter;
      }),
    [cards, member, statusFilter, collection],
  );

  // Agrupa por set + versão
  const groups = useMemo(() => {
    const map = new Map<string, { title: string; note?: string; cards: Photocard[] }>();
    for (const c of visible) {
      const key = `${c.setId}|${c.version ?? ''}`;
      if (!map.has(key)) {
        const set = release?.sets.find((s) => s.id === c.setId);
        map.set(key, {
          title: c.version ? `${c.setName} · ${c.version}` : c.setName,
          note: set?.note,
          cards: [],
        });
      }
      map.get(key)!.cards.push(c);
    }
    return [...map.values()];
  }, [visible, release]);

  if (!release) {
    return (
      <div className="center">
        <p>Lançamento não encontrado.</p>
        <a className="btn" href="#/">
          Voltar
        </a>
      </div>
    );
  }

  const apply = (c: Photocard) => {
    if (mode === 'view') return setOpenCard(c.id);
    const current = collection.cards[c.id]?.s;
    if (mode === 'clear' || current === mode) setStatus([c.id], null);
    else setStatus([c.id], mode);
  };

  const applyAll = (list: Photocard[]) => {
    if (mode === 'view') return;
    const target = mode === 'clear' ? null : mode;
    const label = target ? STATUS_LABEL[target] : 'sem marcação';
    if (confirm(`Marcar ${list.length} photocards como "${label}"?`)) setStatus(list.map((c) => c.id), target);
  };

  const relMembers = memberIds;
  const detailCard = openCard ? index.byId.get(openCard) : undefined;
  const imgCount = images.size;

  return (
    <>
      <a href="#/" className="back">
        ← Lançamentos
      </a>
      <section className="hero">
        <div>
          <div className="release-head">
            <span className={`tag ${release.market}`}>{release.market}</span>
            <span className="tag">{TYPE_LABEL[release.type] ?? release.type}</span>
            {!release.verified && <span className="tag warn">prévia — ajude a conferir</span>}
          </div>
          <h1>{release.title}</h1>
          <p className="muted">
            {[release.altTitle, release.subtitle, formatDate(release.date)].filter(Boolean).join(' · ')}
          </p>
          {release.albumVersions && (
            <p className="small muted">Versões do álbum: {release.albumVersions.join(', ')}</p>
          )}
          {release.notes && <p className="small">{release.notes}</p>}
          <p className="small muted img-status">
            {imgState === 'loading' && 'Procurando prévias nas wikis…'}
            {imgState === 'done' &&
              (imgCount > 0
                ? `${imgCount} de ${cards.length} cards com prévia. Use “🔍 Ver” para ver em tamanho grande ou trocar a imagem.`
                : 'Nenhuma prévia encontrada nas wikis para este álbum.')}
            {imgState === 'error' && 'Não foi possível consultar as wikis agora.'}
            {imgState === 'off' && 'Busca de prévias nas wikis desativada (Configurações).'}{' '}
            {(imgState === 'done' || imgState === 'error') && (
              <button className="linklike" onClick={reload}>
                buscar de novo
              </button>
            )}
          </p>
        </div>
        <div className="hero-progress">
          <Progress counts={counts} />
        </div>
      </section>

      <div className="sticky-tools">
        <div className="seg-control mode" role="group" aria-label="Ao tocar num card, marcar como">
          {MODES.map((m) => (
            <button key={m.id} className={`${mode === m.id ? 'on' : ''} m-${m.id}`} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="chips">
          <button className={member === 'all' ? 'chip on' : 'chip'} onClick={() => setMember('all')}>
            Todos
          </button>
          {[...relMembers, ...(cards.some((c) => c.memberId === 'group') ? ['group'] : [])].map((id) => {
            const m = members.get(id);
            return (
              <button
                key={id}
                className={member === id ? 'chip on' : 'chip'}
                style={{ ['--mc' as string]: m?.color ?? '#d4202f' }}
                onClick={() => setMember(id)}
              >
                {m?.name ?? 'Grupo/Unit'}
              </button>
            );
          })}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          aria-label="Filtrar por status"
        >
          <option value="all">Mostrar todos</option>
          <option value="missing">Faltando</option>
          <option value="owned">Tenho</option>
          <option value="transit">A caminho</option>
          <option value="wish">Quero</option>
        </select>
      </div>

      {groups.map((g) => {
        const gc = countCards(g.cards, collection);
        return (
          <section key={g.title} className="pc-group">
            <header>
              <div>
                <h2>{g.title}</h2>
                {g.note && <p className="small muted">{g.note}</p>}
              </div>
              <div className="group-actions">
                <span className="small muted">
                  {gc.owned}/{gc.total}
                </span>
                <button className="btn small" onClick={() => applyAll(g.cards)}>
                  Marcar todos
                </button>
              </div>
            </header>
            <div className="pc-grid">
              {g.cards.map((c) => (
                <PhotocardTile
                  key={c.id}
                  card={c}
                  member={members.get(c.memberId)}
                  status={collection.cards[c.id]?.s}
                  qty={collection.cards[c.id]?.q}
                  image={images.get(c.id)}
                  onClick={() => apply(c)}
                />
              ))}
            </div>
          </section>
        );
      })}
      {groups.length === 0 && <p className="center muted">Nenhum photocard com esses filtros.</p>}
      {detailCard && (
        <CardDetail
          card={detailCard}
          release={release}
          member={members.get(detailCard.memberId)}
          image={images.get(detailCard.id)}
          candidates={candidates}
          status={collection.cards[detailCard.id]?.s}
          qty={collection.cards[detailCard.id]?.q}
          setNote={release.sets.find((x) => x.id === detailCard.setId)?.note}
          onStatus={(st) => setStatus([detailCard.id], st)}
          onQty={(q) => setQty(detailCard.id, q)}
          onImage={(img) => setCustomImage(detailCard.id, img)}
          onClose={() => setOpenCard(null)}
        />
      )}
    </>
  );
}
