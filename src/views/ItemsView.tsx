import { useMemo, useState } from 'react';
import type { ViewProps } from '../components/common';
import { PhotoPicker } from '../components/PhotoPicker';
import { updateProfile, useProfile, type CustomItem } from '../lib/profile';
import { STATUSES, STATUS_INFO } from '../lib/status';
import type { CardStatus } from '../lib/types';

const KINDS = ['Photocard', 'Polaroid', 'Postcard', 'Sticker', 'Pôster', 'Merch', 'Fanmade', 'Outro'];

function newId() {
  return `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Itens próprios (não oficiais ou fora da base), salvos no arquivo pessoal. */
export function ItemsView({ db }: ViewProps) {
  const profile = useProfile();
  const [editing, setEditing] = useState<CustomItem | null>(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'none' | CardStatus>('all');
  const members = db.members;
  const memberName = (id?: string) => (id === 'group' ? 'Grupo / unit' : members.find((m) => m.id === id)?.name ?? '');

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    return Object.values(profile.items)
      .filter((i) => !i.deleted)
      .filter((i) => statusFilter === 'all' || (statusFilter === 'none' ? !i.s : i.s === statusFilter))
      .filter((i) => !term || `${i.name} ${i.kind ?? ''} ${i.origin ?? ''} ${memberName(i.member)} ${i.notes ?? ''}`.toLowerCase().includes(term))
      .sort((a, b) => b.t - a.t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.items, q, statusFilter]);

  const save = (item: CustomItem) =>
    updateProfile((p, now) => {
      p.items[item.id] = { ...item, t: now };
    });

  const setStatus = (item: CustomItem, s: CardStatus | null) => save({ ...item, s });

  return (
    <>
      <section className="hero">
        <div>
          <h1>Meus itens</h1>
          <p className="muted">
            Itens que não estão na base oficial do app — fanmade, brindes, itens de eventos, trocas… Ficam salvos na sua
            coleção{profile ? '' : ''} e usam os mesmos status (Tenho, etapas a caminho, Quero, Não quero).
          </p>
        </div>
        <div>
          <button className="btn primary" onClick={() => setEditing({ id: newId(), name: '', kind: 'Photocard', t: 0 })}>
            + Adicionar item
          </button>
        </div>
      </section>

      <div className="toolbar">
        <input type="search" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar itens" />
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
          {items.map((item) => (
            <article key={item.id} className={`item-card ${item.s ? STATUS_INFO[item.s].tone : 'none'}`}>
              <button className="item-photo" onClick={() => setEditing(item)} title="Editar">
                {item.image ? <img src={item.image} alt={item.name} loading="lazy" referrerPolicy="no-referrer" /> : <span>📦</span>}
                {item.s && <span className={`pc-badge ${STATUS_INFO[item.s].tone}`}>{STATUS_INFO[item.s].icon}</span>}
              </button>
              <div className="item-body">
                <strong>{item.name}</strong>
                <span className="small muted">{[item.kind, memberName(item.member), item.origin].filter(Boolean).join(' · ')}</span>
                <select
                  value={item.s ?? ''}
                  onChange={(e) => setStatus(item, (e.target.value || null) as CardStatus | null)}
                  aria-label={`Status de ${item.name}`}
                >
                  <option value="">Sem marcação</option>
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal item-form" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setEditing(null)} aria-label="Fechar">
              ✕
            </button>
            <h2>{editing.t ? 'Editar item' : 'Novo item'}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editing.name.trim()) return;
                save({ ...editing, name: editing.name.trim() });
                setEditing(null);
              }}
            >
              <label>
                Nome *
                <input
                  required
                  value={editing.name}
                  placeholder="Ex.: Photocard do fansign de Osaka"
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </label>
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
                <input
                  value={editing.origin ?? ''}
                  placeholder="Ex.: evento, loja, troca, fanmade de @fulana"
                  onChange={(e) => setEditing({ ...editing, origin: e.target.value })}
                />
              </label>
              <label>
                Status
                <select value={editing.s ?? ''} onChange={(e) => setEditing({ ...editing, s: (e.target.value || null) as CardStatus | null })}>
                  <option value="">Sem marcação</option>
                  {STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Observações
                <textarea rows={2} value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </label>
              <div className="item-form-photo">
                {editing.image && <img src={editing.image} alt="" referrerPolicy="no-referrer" />}
                <PhotoPicker onPick={(url) => setEditing({ ...editing, image: url })} label={editing.image ? '📷 Trocar foto' : '📷 Adicionar foto'} />
              </div>
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
                        setEditing(null);
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
