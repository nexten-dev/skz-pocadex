import { useEffect, useMemo, useState } from 'react';
import type { ViewProps } from '../components/common';
import { PhotoPicker } from '../components/PhotoPicker';
import { itemCardId, updateProfile, useProfile, type CustomItem } from '../lib/profile';
import { STATUSES, STATUS_INFO } from '../lib/status';
import { CATEGORIES, CATEGORY_BY_ID } from '../lib/categories';
import type { CardStatus, ItemCategory } from '../lib/types';

const KINDS = ['Photocard', 'Polaroid', 'Postcard', 'Sticker', 'Pôster', 'Merch', 'Fanmade', 'Outro'];

function newId() {
  return `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Itens próprios (não oficiais ou fora da base), salvos no arquivo pessoal. */
export function ItemsView({ db, collection, setStatus }: ViewProps) {
  const profile = useProfile();
  const [editing, setEditing] = useState<CustomItem | null>(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'none' | CardStatus>('all');
  const [albumFilter, setAlbumFilter] = useState<'all' | 'none' | string>('all');
  const members = db.members;
  const memberName = (id?: string) => (id === 'group' ? 'Grupo / unit' : members.find((m) => m.id === id)?.name ?? '');
  const releases = useMemo(() => [...db.releases].sort((a, b) => b.date.localeCompare(a.date)), [db]);
  const releaseTitle = (id?: string) => releases.find((r) => r.id === id)?.title;
  const statusOf = (i: CustomItem) => collection.cards[itemCardId(i.id)]?.s ?? null;

  // Link "editar item" vindo da página do álbum: #/itens?editar=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('editar');
    if (id && profile.items[id] && !profile.items[id].deleted) setEditing({ ...profile.items[id] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    return Object.values(profile.items)
      .filter((i) => !i.deleted)
      .filter((i) => {
        const s = collection.cards[itemCardId(i.id)]?.s;
        return statusFilter === 'all' || (statusFilter === 'none' ? !s : s === statusFilter);
      })
      .filter((i) => albumFilter === 'all' || (albumFilter === 'none' ? !i.releaseId : i.releaseId === albumFilter))
      .filter(
        (i) =>
          !term ||
          `${i.name} ${i.kind ?? ''} ${i.origin ?? ''} ${memberName(i.member)} ${i.notes ?? ''} ${releaseTitle(i.releaseId) ?? ''}`
            .toLowerCase()
            .includes(term),
      )
      .sort((a, b) => b.t - a.t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.items, collection.cards, q, statusFilter, albumFilter]);

  const usedAlbums = [...new Set(Object.values(profile.items).filter((i) => !i.deleted && i.releaseId).map((i) => i.releaseId!))];

  const save = (item: CustomItem) =>
    updateProfile((p, now) => {
      p.items[item.id] = { ...item, t: now };
    });

  const close = () => {
    setEditing(null);
    if (window.location.hash.includes('?')) history.replaceState(null, '', '#/itens');
  };

  const statusSelect = (value: CardStatus | null, onChange: (s: CardStatus | null) => void, label: string) => (
    <select value={value ?? ''} onChange={(e) => onChange((e.target.value || null) as CardStatus | null)} aria-label={label}>
      <option value="">Sem marcação</option>
      {STATUSES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.icon} {s.label}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <section className="hero">
        <div>
          <h1>Meus itens</h1>
          <p className="muted">
            Itens que não estão na base oficial — fanmade, brindes, itens de eventos, trocas… Ligue o item a um álbum para ele
            aparecer na página do álbum, com status, etapas de compra e dados da CEG como qualquer card.
          </p>
        </div>
        <div>
          <button className="btn primary" onClick={() => setEditing({ id: newId(), name: '', kind: 'Photocard', category: 'misc', t: 0 })}>
            + Adicionar item
          </button>
        </div>
      </section>

      <div className="toolbar">
        <input type="search" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar itens" />
        <select value={albumFilter} onChange={(e) => setAlbumFilter(e.target.value)} aria-label="Filtrar por álbum">
          <option value="all">Todos os álbuns</option>
          <option value="none">Sem álbum</option>
          {usedAlbums.map((id) => (
            <option key={id} value={id}>
              {releaseTitle(id) ?? id}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} aria-label="Filtrar por status">
          <option value="all">Todos os status</option>
          <option value="none">Sem marcação</option>
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.icon} {s.label}
            </option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <p className="center muted">
          {Object.values(profile.items).some((i) => !i.deleted) ? 'Nada encontrado com esses filtros.' : 'Você ainda não adicionou itens. Toque em “+ Adicionar item”.'}
        </p>
      ) : (
        <div className="items-grid">
          {items.map((item) => {
            const s = statusOf(item);
            return (
              <article key={item.id} className={`item-card ${s ? STATUS_INFO[s].tone : 'none'}`}>
                <button className="item-photo" onClick={() => setEditing({ ...item })} title="Editar">
                  {item.image ? <img src={item.image} alt={item.name} loading="lazy" referrerPolicy="no-referrer" /> : <span>📦</span>}
                  {s && <span className={`pc-badge ${STATUS_INFO[s].tone}`}>{STATUS_INFO[s].icon}</span>}
                </button>
                <div className="item-body">
                  <strong>{item.name}</strong>
                  <span className="small muted">
                    {[item.kind, memberName(item.member), CATEGORY_BY_ID.get(item.category ?? 'misc')?.short].filter(Boolean).join(' · ')}
                  </span>
                  {item.releaseId ? (
                    <a className="small" href={`#/release/${encodeURIComponent(item.releaseId)}`}>
                      💿 {releaseTitle(item.releaseId) ?? 'álbum'}
                    </a>
                  ) : (
                    <span className="small muted">Sem álbum</span>
                  )}
                  {statusSelect(s, (v) => setStatus([itemCardId(item.id)], v), `Status de ${item.name}`)}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={close}>
          <div className="modal item-form" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={close} aria-label="Fechar">
              ✕
            </button>
            <h2>{editing.t ? 'Editar item' : 'Novo item'}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editing.name.trim()) return;
                save({ ...editing, name: editing.name.trim() });
                close();
              }}
            >
              <label>
                Nome *
                <input required value={editing.name} placeholder="Ex.: Photocard do fansign de Osaka" onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </label>
              <div className="row">
                <label>
                  Álbum / lançamento
                  <select value={editing.releaseId ?? ''} onChange={(e) => setEditing({ ...editing, releaseId: e.target.value || undefined })}>
                    <option value="">— sem álbum —</option>
                    {releases.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.mine ? '⭐ ' : ''}
                        {r.title} ({r.date.slice(0, 4)})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Categoria
                  <select value={editing.category ?? 'misc'} onChange={(e) => setEditing({ ...editing, category: e.target.value as ItemCategory })}>
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.short}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="row">
                <label>
                  Membro
                  <select value={editing.member ?? ''} onChange={(e) => setEditing({ ...editing, member: e.target.value || undefined })}>
                    <option value="">—</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                    <option value="group">Grupo / unit</option>
                  </select>
                </label>
                <label>
                  Tipo
                  <select value={editing.kind ?? ''} onChange={(e) => setEditing({ ...editing, kind: e.target.value })}>
                    {KINDS.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                De onde é
                <input value={editing.origin ?? ''} placeholder="Ex.: evento, loja, troca, fanmade de @fulana" onChange={(e) => setEditing({ ...editing, origin: e.target.value })} />
              </label>
              <label>
                Status
                {statusSelect(collection.cards[itemCardId(editing.id)]?.s ?? null, (v) => setStatus([itemCardId(editing.id)], v), 'Status')}
              </label>
              <label>
                Observações
                <textarea rows={2} value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </label>
              <div className="item-form-photo">
                {editing.image && <img src={editing.image} alt="" referrerPolicy="no-referrer" />}
                <PhotoPicker onPick={(url) => setEditing({ ...editing, image: url })} label={editing.image ? '📷 Trocar foto' : '📷 Adicionar foto'} />
              </div>
              <p className="small muted">Dados da compra (CEG, dealer, planilha) ficam no card: abra o álbum, toque em “🔍 Ver” e no item.</p>
              <div className="row">
                <button className="btn primary" type="submit">
                  Salvar
                </button>
                {editing.t > 0 && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      if (confirm(`Apagar “${editing.name}”?`)) {
                        save({ ...editing, deleted: true });
                        close();
                      }
                    }}
                  >
                    Apagar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
