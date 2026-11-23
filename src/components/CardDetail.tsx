import { useEffect, useState } from 'react';
import type { CardImage, CardStatus, Member, Photocard, Release } from '../lib/types';
import { isTransit, nextStatus, STATUS_INFO, TRANSIT_STEPS } from '../lib/status';
import { CATEGORY_BY_ID } from '../lib/categories';
import { PhotoPicker } from './PhotoPicker';
import { PurchaseFields } from './PurchaseFields';
import { suggestUrl } from '../lib/photo';

interface Props {
  card: Photocard;
  release: Release;
  member?: Member;
  image?: CardImage;
  /** Imagens do lançamento que o usuário pode escolher (fotos de divulgação e prévias). */
  candidates: { url: string; thumb?: string; page?: string; source?: string; title?: string; label: string; memberId?: string }[];
  status?: CardStatus;
  qty?: number;
  setNote?: string;
  onStatus: (s: CardStatus | null) => void;
  onQty: (q: number) => void;
  onImage: (img: { url: string; page?: string; source?: string } | null) => void;
  onClose: () => void;
}

const MAIN: CardStatus[] = ['owned', 'wish', 'notwant'];

export function CardDetail({ card, release, member, image, candidates, status, qty, setNote, onStatus, onQty, onImage, onClose }: Props) {
  const [picking, setPicking] = useState(false);
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

  const name = card.custom ? card.title ?? 'Meu item' : member?.name ?? (card.label || 'Grupo');

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
            {card.custom && (
              <p className="small">
                ⭐ Item seu{member ? ` · ${member.name}` : ''}
                {card.itemType ? ` · ${card.itemType}` : ''} ·{' '}
                <a href={`#/itens?editar=${encodeURIComponent(card.id.slice(2))}`} onClick={onClose}>
                  editar item
                </a>
              </p>
            )}

            <div className="status-buttons">
              {MAIN.map((s) => (
                <button
                  key={s}
                  className={`btn status-${STATUS_INFO[s].tone} ${status === s ? 'on' : ''}`}
                  onClick={() => onStatus(status === s ? null : s)}
                >
                  {STATUS_INFO[s].icon} {STATUS_INFO[s].label}
                </button>
              ))}
            </div>

            <div className="transit-box">
              <div className="transit-head">
                <span className="small">
                  <strong>🚚 A caminho</strong>
                  {isTransit(status) && <span className="muted"> · etapa {STATUS_INFO[status].step} de 7</span>}
                </span>
                {isTransit(status) && (
                  <button className="btn small primary" onClick={() => onStatus(nextStatus(status))}>
                    Avançar → {STATUS_INFO[nextStatus(status)].label}
                  </button>
                )}
              </div>
              <ol className="stepper">
                {TRANSIT_STEPS.map((t) => {
                  const cur = isTransit(status) ? STATUS_INFO[status].step ?? 0 : 0;
                  const state = t.step! < cur ? 'done' : t.step === cur ? 'current' : '';
                  return (
                    <li key={t.id}>
                      <button
                        className={`step ${state}`}
                        title={t.description}
                        onClick={() => onStatus(status === t.id ? null : t.id)}
                      >
                        <span className="step-icon">{state === 'done' ? '✓' : t.icon}</span>
                        <span className="step-label">{t.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            <PurchaseFields cardId={card.id} />

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
                  <strong>Imagem:</strong>{' '}
                  {image.kind === 'custom'
                    ? 'escolhida por você'
                    : image.kind === 'db'
                      ? `foto do photocard (${image.source ?? 'base do app'})`
                      : `📷 foto de divulgação de ${name} nesta era (${image.source ?? 'wiki'}) — não é a foto do photocard`}
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
                <span className="muted">Sem imagem para este item. As wikis não têm fotos dos photocards.</span>
              )}
            </div>

            <section className="photo-section">
              <h3>📷 Foto do card</h3>
              {image?.kind === 'custom' ? (
                <p className="small muted">Você está usando a sua foto neste card.</p>
              ) : image?.kind === 'db' ? (
                <p className="small muted">Já existe uma foto. Se quiser, troque pela sua (ex.: foto do seu card).</p>
              ) : (
                <p className="small">
                  <strong>Este card ainda não tem foto.</strong> Envie uma do seu celular ou cole um link — ela fica salva na
                  sua coleção.
                </p>
              )}
              <PhotoPicker onPick={(url) => onImage({ url, source: url.startsWith('data:') ? 'Foto enviada por você' : 'Link adicionado por você' })} />
              <div className="row">
                {image?.kind === 'custom' && (
                  <button className="btn small" onClick={() => onImage(null)}>
                    Remover minha foto
                  </button>
                )}
                {candidates.length > 0 && (
                  <button className="btn small" onClick={() => setPicking((v) => !v)}>
                    {picking ? 'Fechar imagens da wiki' : 'Escolher entre imagens da wiki'}
                  </button>
                )}
                {image?.kind === 'custom' && /^https?:/.test(image.url) && (
                  <a
                    className="btn small"
                    target="_blank"
                    rel="noreferrer"
                    href={suggestUrl(`Foto do card: ${release.title} · ${card.setName}${card.version ? ' · ' + card.version : ''} · ${name}`, [
                      `**Card:** \`${card.id}\``,
                      `**Lançamento:** ${release.title}`,
                      `**Grupo:** ${card.setName}${card.version ? ' · ' + card.version : ''}`,
                      `**Membro:** ${name}`,
                      `**Imagem:** ${image.url}`,
                    ])}
                  >
                    Sugerir esta foto para todos
                  </a>
                )}
              </div>
              {picking && (
                <div className="picker">
                  <div className="picker-grid">
                    {[...candidates.filter((c) => c.memberId === card.memberId), ...candidates.filter((c) => c.memberId !== card.memberId)].map((c) => (
                      <button
                        key={c.url}
                        className={image?.url === c.url ? 'pick on' : 'pick'}
                        title={c.label}
                        onClick={() => {
                          onImage({ url: c.url, page: c.page, source: c.source });
                          setPicking(false);
                        }}
                      >
                        <img src={c.thumb ?? c.url} alt={c.label} loading="lazy" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
