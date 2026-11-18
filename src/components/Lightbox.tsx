import { useEffect } from 'react';

/** Mostra uma imagem grande, com legenda e link para a origem. */
export function Lightbox({
  url,
  caption,
  page,
  source,
  onClose,
}: {
  url: string;
  caption?: string;
  page?: string;
  source?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop lightbox" onClick={onClose}>
      <figure onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
        <img src={url} alt={caption ?? ''} referrerPolicy="no-referrer" />
        <figcaption className="small">
          {caption}
          {page && (
            <>
              {' · '}
              <a href={page} target="_blank" rel="noreferrer">
                ver na {source ?? 'origem'}
              </a>
            </>
          )}
        </figcaption>
      </figure>
    </div>
  );
}
