import { useState } from 'react';
import { PhotoPicker } from './PhotoPicker';
import { TYPE_LABEL } from '../lib/data';
import { albumReleaseId, updateProfile, type CustomAlbum } from '../lib/profile';

/** Formulário para criar/editar um álbum próprio (fica no arquivo pessoal). */
export function AlbumForm({ album, onClose }: { album?: CustomAlbum; onClose: (savedReleaseId?: string) => void }) {
  const [a, setA] = useState<CustomAlbum>(
    album ?? { id: `a${Date.now().toString(36)}`, title: '', type: 'special', market: 'KR', date: new Date().toISOString().slice(0, 10), t: 0 },
  );

  return (
    <div className="modal-backdrop" onClick={() => onClose()}>
      <div className="modal item-form" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={() => onClose()} aria-label="Fechar">
          ✕
        </button>
        <h2>{album ? 'Editar álbum' : 'Novo álbum'}</h2>
        <p className="small muted">
          Crie um álbum/lançamento que ainda não está no app (ou um agrupamento seu, ex.: “Fanmades”). Depois, em Meus itens,
          ligue itens a ele.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!a.title.trim()) return;
            updateProfile((p, now) => {
              p.albums[a.id] = { ...a, title: a.title.trim(), t: now };
            });
            onClose(albumReleaseId(a.id));
          }}
        >
          <label>
            Nome *
            <input required value={a.title} placeholder="Ex.: Fanmeeting SKZ 2026" onChange={(e) => setA({ ...a, title: e.target.value })} />
          </label>
          <div className="row">
            <label>
              Tipo
              <select value={a.type} onChange={(e) => setA({ ...a, type: e.target.value })}>
                {Object.entries(TYPE_LABEL).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Mercado
              <select value={a.market} onChange={(e) => setA({ ...a, market: e.target.value as CustomAlbum['market'] })}>
                <option value="KR">Coreia</option>
                <option value="JP">Japão</option>
                <option value="TW">Taiwan</option>
              </select>
            </label>
            <label>
              Data
              <input type="date" value={a.date} onChange={(e) => setA({ ...a, date: e.target.value })} />
            </label>
          </div>
          <label>
            Observações
            <textarea rows={2} value={a.notes ?? ''} onChange={(e) => setA({ ...a, notes: e.target.value })} />
          </label>
          <div className="item-form-photo">
            {a.cover && <img src={a.cover} alt="" referrerPolicy="no-referrer" className="album-cover-preview" />}
            <PhotoPicker maxSide={600} label={a.cover ? '🖼 Trocar capa' : '🖼 Adicionar capa'} onPick={(url) => setA({ ...a, cover: url })} />
          </div>
          <div className="row">
            <button className="btn primary" type="submit">
              Salvar
            </button>
            {album && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  if (!confirm(`Apagar o álbum “${album.title}”? Os itens ligados a ele continuam em Meus itens, sem álbum.`)) return;
                  updateProfile((p, now) => {
                    p.albums[album.id] = { ...album, deleted: true, t: now };
                    for (const item of Object.values(p.items)) {
                      if (item.releaseId === albumReleaseId(album.id)) p.items[item.id] = { ...item, releaseId: undefined, t: now };
                    }
                  });
                  onClose();
                  window.location.hash = '#/';
                }}
              >
                Apagar álbum
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
