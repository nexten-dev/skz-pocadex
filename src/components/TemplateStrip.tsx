import { useState } from 'react';
import { resolveImage } from '../lib/images';
import type { Database, TemplateItem } from '../lib/types';
import { Lightbox } from './Lightbox';

/** Legenda de crédito de um template. */
export function templateCredit(t: TemplateItem): string {
  return [t.title, t.author ? `por ${t.author}` : null, t.upTo ? `atualizado até ${t.upTo}` : t.status].filter(Boolean).join(' · ');
}

/** Miniaturas de templates com zoom; usado na página do álbum e na página Templates. */
export function TemplateGrid({ db, items, layout = 'row' }: { db: Database; items: TemplateItem[]; layout?: 'row' | 'grid' }) {
  const [zoom, setZoom] = useState<TemplateItem | null>(null);
  return (
    <>
      <div className={layout === 'row' ? 'preview-row' : 'template-grid'}>
        {items.map((t) =>
          t.image ? (
            <button key={t.id} className="preview-thumb template-thumb" title={templateCredit(t)} onClick={() => setZoom(t)}>
              <img
                src={resolveImage(t.image, db, 'thumb', 480)}
                alt={t.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.dataset.fallback !== '1' && t.image) {
                    img.dataset.fallback = '1';
                    img.src = t.image;
                  }
                }}
              />
              <span>{t.title}</span>
              {t.author && <small>{t.author}</small>}
            </button>
          ) : (
            <a key={t.id} className="preview-thumb template-thumb template-link" href={t.link} target="_blank" rel="noreferrer">
              <span className="template-link-icon">🔗</span>
              <span>{t.title}</span>
              {t.author && <small>{t.author}</small>}
            </a>
          ),
        )}
      </div>
      {zoom?.image && (
        <Lightbox url={zoom.image} caption={templateCredit(zoom)} page={zoom.post} linkLabel="ver post original no Reddit" onClose={() => setZoom(null)} />
      )}
    </>
  );
}
