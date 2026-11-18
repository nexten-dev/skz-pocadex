import type { CardIndex } from '../App';
import { useState } from 'react';
import type { CardImage, CardStatus, Collection, Database, ItemCategory, Member, Photocard } from '../lib/types';
import { CATEGORY_BY_ID } from '../lib/categories';
import { STATUS_INFO } from '../lib/status';

export interface ViewProps {
  db: Database;
  index: CardIndex;
  collection: Collection;
  setStatus: (ids: string[], status: CardStatus | null) => void;
  setQty: (id: string, q: number) => void;
  customImages: Record<string, { url: string; page?: string; source?: string }>;
  setCustomImage: (cardId: string, img: { url: string; page?: string; source?: string } | null) => void;
  toggleCategory: (c: ItemCategory) => void;
  setVisibleCategories: (c: ItemCategory[]) => void;
}

export interface Counts {
  /** Total que conta para o progresso (exclui “Não quero”). */
  total: number;
  owned: number;
  transit: number;
  wish: number;
  notwant: number;
}

export function countCards(cards: Photocard[], c: Collection): Counts {
  const r: Counts = { total: 0, owned: 0, transit: 0, wish: 0, notwant: 0 };
  for (const card of cards) {
    const s = c.cards[card.id]?.s;
    const tone = s ? STATUS_INFO[s]?.tone : undefined;
    if (tone) r[tone]++;
    if (tone !== 'notwant') r.total++;
  }
  return r;
}

export function Progress({ counts, compact }: { counts: Counts; compact?: boolean }) {
  const pct = (n: number) => (counts.total ? (n / counts.total) * 100 : 0);
  return (
    <div className={compact ? 'progress compact' : 'progress'}>
      <div className="bar" role="img" aria-label={`${counts.owned} de ${counts.total} itens`}>
        <span className="seg owned" style={{ width: `${pct(counts.owned)}%` }} />
        <span className="seg transit" style={{ width: `${pct(counts.transit)}%` }} />
      </div>
      <div className="progress-label small">
        <strong>
          {counts.owned}/{counts.total}
        </strong>
        <span className="muted"> · {Math.round(pct(counts.owned))}%</span>
        {counts.transit > 0 && <span className="pill transit">{counts.transit} a caminho</span>}
        {!compact && counts.wish > 0 && <span className="pill wish">{counts.wish} quero</span>}
        {!compact && counts.notwant > 0 && <span className="pill notwant">{counts.notwant} não quero</span>}
      </div>
    </div>
  );
}

export function memberMap(db: Database): Map<string, Member> {
  return new Map(db.members.map((m) => [m.id, m]));
}

const GROUP: Member = { id: 'group', name: 'Stray Kids', hangul: '스트레이 키즈', color: '#d4202f' };

export function PhotocardTile({
  card,
  member,
  status,
  qty,
  onClick,
  showRelease,
  image,
}: {
  image?: CardImage;
  card: Photocard;
  member?: Member;
  status?: CardStatus;
  qty?: number;
  onClick?: () => void;
  showRelease?: string;
}) {
  const m = member ?? GROUP;
  const [broken, setBroken] = useState<string | null>(null);
  const img = image && broken !== image.thumb ? image : undefined;
  const initials = m.id === 'group' ? 'SKZ' : m.name.split(/[\s.]+/).map((p) => p[0]).join('').slice(0, 2);
  return (
    <button
      type="button"
      className={`pc ${status ? STATUS_INFO[status].tone : 'none'} fmt-${card.format}`}
      style={{ ['--mc' as string]: m.color }}
      onClick={onClick}
      title={`${m.name}${card.version ? ` · ${card.version}` : ''}${card.label ? ` · ${card.label}` : ''}${status ? ` — ${STATUS_INFO[status].label}` : ''}`}
    >
      <div className={img ? 'pc-art has-img' : 'pc-art'}>
        {img ? (
          <img
            src={img.thumb}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setBroken(img.thumb)}
          />
        ) : (
          <span className="pc-initials">
            {card.category !== 'photocard' && <span className="pc-icon">{CATEGORY_BY_ID.get(card.category)?.icon}</span>}
            {initials}
          </span>
        )}
        {card.category !== 'photocard' && (card.itemType || card.store) && (
          <span className="pc-type">{card.itemType ?? CATEGORY_BY_ID.get(card.category)?.short}</span>
        )}
        {img?.kind === 'concept' && (
          <span className="pc-approx" title="Foto de divulgação do membro nesta era — não é a foto do photocard">
            📷
          </span>
        )}
        {card.label && <span className="pc-num">{card.label}</span>}
        {status && (
          <span className={`pc-badge ${STATUS_INFO[status].tone}`} title={STATUS_INFO[status].label}>
            {STATUS_INFO[status].icon}
          </span>
        )}
        {status && STATUS_INFO[status].step && <span className="pc-step">{STATUS_INFO[status].label}</span>}
        {qty && qty > 1 ? <span className="pc-qty">×{qty}</span> : null}
      </div>
      <div className="pc-meta">
        <span className="pc-name">{m.id === 'group' ? card.label || 'Grupo' : m.name}</span>
        <span className="pc-sub muted">{showRelease ?? card.version ?? card.store ?? card.setName}</span>
      </div>
    </button>
  );
}
