import type { CardIndex } from '../App';
import type { CardStatus, Collection, Database, Member, Photocard } from '../lib/types';
import { STATUS_LABEL } from '../lib/collection';

export interface ViewProps {
  db: Database;
  index: CardIndex;
  collection: Collection;
  setStatus: (ids: string[], status: CardStatus | null) => void;
  setQty: (id: string, q: number) => void;
}

export interface Counts {
  total: number;
  owned: number;
  transit: number;
  wish: number;
}

export function countCards(cards: Photocard[], c: Collection): Counts {
  const r: Counts = { total: cards.length, owned: 0, transit: 0, wish: 0 };
  for (const card of cards) {
    const s = c.cards[card.id]?.s;
    if (s) r[s]++;
  }
  return r;
}

export function Progress({ counts, compact }: { counts: Counts; compact?: boolean }) {
  const pct = (n: number) => (counts.total ? (n / counts.total) * 100 : 0);
  return (
    <div className={compact ? 'progress compact' : 'progress'}>
      <div className="bar" role="img" aria-label={`${counts.owned} de ${counts.total} photocards`}>
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
}: {
  card: Photocard;
  member?: Member;
  status?: CardStatus;
  qty?: number;
  onClick?: () => void;
  showRelease?: string;
}) {
  const m = member ?? GROUP;
  const initials = m.id === 'group' ? 'SKZ' : m.name.split(/[\s.]+/).map((p) => p[0]).join('').slice(0, 2);
  return (
    <button
      type="button"
      className={`pc ${status ?? 'none'}`}
      style={{ ['--mc' as string]: m.color }}
      onClick={onClick}
      title={`${m.name}${card.version ? ` · ${card.version}` : ''}${card.label ? ` · ${card.label}` : ''}${status ? ` — ${STATUS_LABEL[status]}` : ''}`}
    >
      <div className="pc-art">
        <span className="pc-initials">{initials}</span>
        {card.label && <span className="pc-num">{card.label}</span>}
        {status && <span className={`pc-badge ${status}`}>{status === 'owned' ? '✓' : status === 'transit' ? '✈' : '♥'}</span>}
        {qty && qty > 1 ? <span className="pc-qty">×{qty}</span> : null}
      </div>
      <div className="pc-meta">
        <span className="pc-name">{m.id === 'group' ? card.label || 'Grupo' : m.name}</span>
        <span className="pc-sub muted">{showRelease ?? card.version ?? card.setName}</span>
      </div>
    </button>
  );
}
