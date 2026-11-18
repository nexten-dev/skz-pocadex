import { useEffect, useState } from 'react';
import type { CardImage, CardStatus, Member, Photocard, Release } from '../lib/types';
import type { ImageCandidate } from '../lib/wiki';
import { STATUS_LABEL } from '../lib/collection';
import { CATEGORY_BY_ID } from '../lib/categories';

interface Props {
  card: Photocard;
  release: Release;
  member?: Member;
  image?: CardImage;
  candidates: ImageCandidate[];
  status?: CardStatus;
  qty?: number;
  setNote?: string;
  onStatus: (s: CardStatus | null) => void;
  onQty: (q: number) => void;
  onImage: (img: { url: string; page?: string; source?: string } | null) => void;
  onClose: () => void;
}

const STATUSES: CardStatus[] = ['owned', 'transit', 'wish'];

export function CardDetail({ card, release, member, image, candidates, status, qty, setNote, onStatus, onQty, onImage, onClose }: Props) {
  const [picking, setPicking] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => setBroken(false), [image?.url]);

  const name = member?.name ?? (card.label || 'Grupo');
  const forMember = candidates.filter((c) => c.member === card.memberId);
  const others = candidates.filter((c) => c.member !== card.memberId);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${name} — ${release.title}`}
        onClick={(e) => e.stopPropagation()}
        style={{ ['--mc' as string]: member?.color ?? '#d4202f' }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
        <div className="modal-body">
          <div className={`detail-art fmt-${card.format}`}>
            {image && !broken ? (
              <img src={image.url} alt={`Photocard de ${name}`} referrerPolicy="no-referrer" onError={() => setBroken(true)} />
            ) : (
              <div className="detail-placeholder">
                <span>{name}</span>
                <small>{broken ? 'Não foi possível carregar a imagem' : 'Sem prévia disponível'}</small>
              </div>
            )}
          </div>

          <div className="detail-info">
            <h2>{name}</h2>
            <p className="muted">
              {release.title}
              {card.version ? ` · ${card.version}` : ''}
              <br />
              {card.setName}
              {card.label ? ` · ${card.label}` : ''}
            </p>
            {card.category !== 'photocard' && (
              <p className="small">
                <span className="tag">
                  {CATEGORY_BY_ID.get(card.category)?.icon} {CATEGORY_BY_ID.get(card.category)?.short}
                </span>{' '}
                {[card.itemType, card.store].filter(Boolean).join(' · ')}
              </p>
            )}
            {setNote && <p className="small muted">{setNote}</p>}

            <div className="status-buttons">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  className={`btn status-${s} ${status === s ? 'on' : ''}`}
                  onClick={() => onStatus(status === s ? null : s)}
                >
                  {s === 'owned' ? '✓' : s === 'transit' ? '✈' : '♥'} {STATUS_LABEL[s]}
                </button>
              ))}
            </div>

            {status === 'owned' && (
              <div className="qty">
                <span className="small muted">Quantidade</span>
                <button className="btn small" onClick={() => onQty((qty ?? 1) - 1)} disabled={(qty ?? 1) <= 1}>
                  −
                </button>
                <strong>{qty ?? 1}</strong>
                <button className="btn small" onClick={() => onQty((qty ?? 1) + 1)}>
                  +
                </button>
                {(qty ?? 1) > 1 && <span className="small muted">({(qty ?? 1) - 1} repetido(s) para troca)</span>}
              </div>
            )}

            <div className="image-info small">
              {image ? (
                <>
                  <strong>Prévia:</strong>{' '}
                  {image.kind === 'custom'
                    ? 'imagem escolhida por você'
                    : image.kind === 'db'
                      ? 'base de dados do app'
                      : image.confidence === 'exact'
                        ? `encontrada na ${image.source}`
                        : `aproximada (${image.source}) — mesmo membro e álbum, versão não confirmada`}
                  {image.page && (
                    <>
                      {' · '}
                      <a href={image.page} target="_blank" rel="noreferrer">
                        ver origem
                      </a>
                    </>
                  )}
                </>
              ) : (
                <span className="muted">Nenhuma prévia encontrada nas wikis para este card.</span>
              )}
            </div>

            <div className="row">
              <button className="btn small" onClick={() => setPicking((v) => !v)}>
                {picking ? 'Fechar seleção' : 'Escolher imagem'}
              </button>
              {image?.kind === 'custom' && (
                <button className="btn small" onClick={() => onImage(null)}>
                  Usar imagem padrão
                </button>
              )}
            </div>

            {picking && (
              <div className="picker">
                {candidates.length > 0 ? (
                  <>
                    <p className="small muted">
                      Imagens de photocards deste álbum encontradas nas wikis
                      {forMember.length ? ` (${forMember.length} de ${name})` : ''}:
                    </p>
                    <div className="picker-grid">
                      {[...forMember, ...others].map((c) => (
                        <button
                          key={c.url}
                          className={image?.url === c.url ? 'pick on' : 'pick'}
                          title={c.title}
                          onClick={() => {
                            onImage({ url: c.url, page: c.page, source: c.source });
                            setPicking(false);
                          }}
                        >
                          <img src={c.thumb} alt={c.title} loading="lazy" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="small muted">Nenhuma imagem deste álbum foi encontrada nas wikis.</p>
                )}
                <form
                  className="row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const url = customUrl.trim();
                    if (!/^https?:\/\//i.test(url)) return;
                    onImage({ url, source: 'Link adicionado por você' });
                    setCustomUrl('');
                    setPicking(false);
                  }}
                >
                  <input
                    type="url"
                    placeholder="Ou cole o link de uma imagem (https://…)"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                  />
                  <button className="btn small primary" type="submit">
                    Usar
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
