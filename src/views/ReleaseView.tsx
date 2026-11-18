import { useMemo, useState } from 'react';
import { countCards, memberMap, PhotocardTile, Progress, type ViewProps } from '../components/common';
import { isTransit, STATUS_INFO, TRANSIT_STEPS } from '../lib/status';
import { formatDate, releaseMembers, TYPE_LABEL } from '../lib/data';
import type { CardStatus, Photocard, TransitStatus } from '../lib/types';
import { groupKey, useReleaseImages } from '../lib/images';
import { Lightbox } from '../components/Lightbox';
import type { MediaImage } from '../lib/types';
import { CardDetail } from '../components/CardDetail';
import { CategoryBar } from '../components/CategoryBar';
import { CATEGORY_BY_ID, CATEGORY_ORDER } from '../lib/categories';

type Mode = 'owned' | 'transit' | 'wish' | 'notwant' | 'clear' | 'view';
type StatusFilter = 'all' | 'missing' | 'transit' | CardStatus;

const MODES: { id: Mode; label: string }[] = [
  { id: 'owned', label: '✓ Tenho' },
  { id: 'transit', label: '🚚 A caminho' },
  { id: 'wish', label: '♥ Quero' },
  { id: 'notwant', label: '🚫 Não quero' },
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
  toggleCategory,
  releaseId,
}: ViewProps & { releaseId: string }) {
  const release = db.releases.find((r) => r.id === releaseId);
  const [mode, setMode] = useState<Mode>('owned');
  const [step, setStep] = useState<TransitStatus>('bought');
  /** Status aplicado ao tocar num card no modo atual. */
  const target: CardStatus | null = mode === 'transit' ? step : mode === 'clear' || mode === 'view' ? null : mode;
  const [member, setMember] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [openCard, setOpenCard] = useState<string | null>(null);
  const members = memberMap(db);

  const cards = index.byRelease.get(releaseId) ?? [];
  const memberIds = useMemo(() => (release ? releaseMembers(db, release) : []), [db, release]);
  const { images, previews, previewByGroup, memberPhotos } = useReleaseImages(release, cards, customImages);
  const [zoom, setZoom] = useState<(MediaImage & { caption?: string }) | null>(null);
  const counts = useMemo(() => countCards(cards, collection), [cards, collection]);

  const visible = useMemo(
    () =>
      cards.filter((c) => {
        if (member !== 'all' && c.memberId !== member) return false;
        const s = collection.cards[c.id]?.s;
        if (statusFilter === 'all') return true;
        if (statusFilter === 'missing') return s !== 'owned' && s !== 'notwant';
        if (statusFilter === 'transit') return isTransit(s);
        return s === statusFilter;
      }),
    [cards, member, statusFilter, collection],
  );

  // Agrupa por set + versão, com as categorias na ordem padrão (photocards primeiro)
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { key: string; title: string; icon?: string; note?: string; order: number; cards: Photocard[] }
    >();
    for (const c of visible) {
      const key = `${c.setId}|${c.version ?? ''}`;
      if (!map.has(key)) {
        const set = release?.sets.find((s) => s.id === c.setId);
        const cat = CATEGORY_BY_ID.get(c.category);
        map.set(key, {
          key: groupKey(c),
          title: [c.setName, c.version].filter(Boolean).join(' · '),
          icon: c.category !== 'photocard' ? cat?.icon : undefined,
          note: [c.category !== 'photocard' ? cat?.short : null, c.itemType, set?.note].filter(Boolean).join(' · '),
          order: CATEGORY_ORDER.get(c.category) ?? 99,
          cards: [],
        });
      }
      map.get(key)!.cards.push(c);
    }
    return [...map.values()].sort((a, b) => a.order - b.order);
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
    if (target === null || current === target) setStatus([c.id], null);
    else setStatus([c.id], target);
  };

  const applyAll = (list: Photocard[]) => {
    if (mode === 'view') return;
    const label = target ? STATUS_INFO[target].label : 'sem marcação';
    if (confirm(`Marcar ${list.length} itens como "${label}"?`)) setStatus(list.map((c) => c.id), target);
  };

  const relMembers = memberIds;
  const detailCard = openCard ? index.byId.get(openCard) : undefined;
  const candidates = [
    ...Object.entries(memberPhotos).map(([id, m]) => ({ ...m, label: `Divulgação · ${members.get(id)?.name ?? id}`, memberId: id })),
    ...previews.map((p) => ({ ...p, label: `Prévia da versão · ${p.label}`, memberId: undefined as string | undefined })),
  ];

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
          {previews.length > 0 ? (
            <div className="preview-strip">
              <span className="small muted">Conteúdo de cada versão (prévia oficial):</span>
              <div className="preview-row">
                {previews.map((p) => (
                  <button
                    key={p.url}
                    className="preview-thumb"
                    title={p.label}
                    onClick={() => setZoom({ ...p, caption: `${release.title} — ${p.label}` })}
                  >
                    <img src={p.thumb ?? p.url} alt={p.label} loading="lazy" referrerPolicy="no-referrer" />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <p className="small muted img-status">
            {release.media
              ? Object.keys(memberPhotos).length > 0
                ? 'Os cards mostram a foto de divulgação de cada membro nesta era (📷). As wikis não têm fotos dos photocards; para usar a foto real, toque em “🔍 Ver” → “Escolher imagem”.'
                : 'As wikis não têm fotos dos photocards deste lançamento. Você pode adicionar a sua em “🔍 Ver” → “Escolher imagem”.'
              : 'Ainda não há imagens da wiki para este lançamento.'}
            {release.media?.gallery && (
              <>
                {' '}
                <a href={release.media.gallery} target="_blank" rel="noreferrer">
                  Ver galeria na wiki
                </a>
              </>
            )}
          </p>
        </div>
        <div className="hero-progress">
          <Progress counts={counts} />
        </div>
      </section>

      <CategoryBar items={index.byReleaseAll.get(release.id) ?? []} visible={index.visible} onToggle={toggleCategory} />

      <div className="sticky-tools">
        <div className="seg-control mode" role="group" aria-label="Ao tocar num card, marcar como">
          {MODES.map((m) => (
            <button key={m.id} className={`${mode === m.id ? 'on' : ''} m-${m.id}`} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        {mode === 'transit' && (
          <label className="step-picker">
            <span className="small muted">Etapa:</span>
            <select value={step} onChange={(e) => setStep(e.target.value as TransitStatus)} aria-label="Etapa da compra">
              {TRANSIT_STEPS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.step}. {t.icon} {t.label}
                </option>
              ))}
            </select>
          </label>
        )}
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
          <option value="transit">A caminho (todas as etapas)</option>
          <optgroup label="Etapas">
            {TRANSIT_STEPS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.step}. {t.label}
              </option>
            ))}
          </optgroup>
          <option value="wish">Quero</option>
          <option value="notwant">Não quero</option>
        </select>
      </div>

      {groups.map((g) => {
        const gc = countCards(g.cards, collection);
        return (
          <section key={g.title} className="pc-group">
            <header>
              <div>
                <h2>
                  {g.icon && <span aria-hidden>{g.icon} </span>}
                  {g.title}
                </h2>
                {g.note && <p className="small muted">{g.note}</p>}
              </div>
              {previewByGroup.get(g.key) && (
                <button
                  className="group-preview"
                  title={`Prévia oficial: ${previewByGroup.get(g.key)!.label}`}
                  onClick={() => {
                    const p = previewByGroup.get(g.key)!;
                    setZoom({ ...p, caption: `${release.title} — ${p.label}` });
                  }}
                >
                  <img
                    src={previewByGroup.get(g.key)!.thumb ?? previewByGroup.get(g.key)!.url}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </button>
              )}
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
      {groups.length === 0 && (
        <p className="center muted">
          {cards.length === 0
            ? 'Nenhum item das categorias selecionadas neste lançamento. Use “Mostrar” acima para incluir outras categorias.'
            : 'Nenhum item com esses filtros.'}
        </p>
      )}
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
      {zoom && (
        <Lightbox url={zoom.url} caption={zoom.caption} page={zoom.page} source={zoom.source} onClose={() => setZoom(null)} />
      )}
    </>
  );
}
