import { CATEGORIES } from '../lib/categories';
import type { ItemCategory, Photocard } from '../lib/types';

/**
 * Chips para escolher quais categorias de itens aparecem.
 * Mostra só as categorias que existem em `items`, com a quantidade de cada uma.
 */
export function CategoryBar({
  items,
  visible,
  onToggle,
}: {
  items: Photocard[];
  visible: ItemCategory[];
  onToggle: (c: ItemCategory) => void;
}) {
  const counts = new Map<ItemCategory, number>();
  for (const it of items) counts.set(it.category, (counts.get(it.category) ?? 0) + 1);
  const present = CATEGORIES.filter((c) => counts.has(c.id));
  if (present.length <= 1 && visible.length <= 1) return null;
  const hidden = present.filter((c) => !visible.includes(c.id)).reduce((n, c) => n + (counts.get(c.id) ?? 0), 0);

  return (
    <div className="category-bar">
      <span className="small muted">Mostrar:</span>
      {present.map((c) => {
        const on = visible.includes(c.id);
        return (
          <button
            key={c.id}
            className={on ? 'cat-chip on' : 'cat-chip'}
            aria-pressed={on}
            title={c.description}
            onClick={() => onToggle(c.id)}
          >
            <span aria-hidden>{on ? '✓' : '+'}</span> {c.icon} {c.short} <span className="cat-count">{counts.get(c.id)}</span>
          </button>
        );
      })}
      {hidden > 0 && <span className="small muted">{hidden} itens extras ocultos</span>}
    </div>
  );
}
