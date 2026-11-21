import { useState } from 'react';
import { resolveImage } from '../lib/images';
import type { Database, Release } from '../lib/types';

/**
 * Capa do lançamento: capa digital da wiki → capa do SKZPD → quadro com o título.
 * Se uma imagem não abrir, tenta a próxima.
 */
export function ReleaseCover({ db, release, size = 320 }: { db: Database; release: Release; size?: number }) {
  const candidates = [
    release.media?.cover?.thumb,
    release.media?.cover?.url,
    release.cover ? resolveImage(release.cover.url, db, 'thumb', size) : undefined,
    release.cover ? resolveImage(release.cover.url, db, 'full') : undefined,
  ].filter((u): u is string => !!u);
  const [failed, setFailed] = useState(0);
  const src = candidates[failed];

  if (!src) {
    return (
      <div className="release-cover placeholder" aria-hidden>
        <span>{release.title}</span>
      </div>
    );
  }
  return (
    <div className="release-cover">
      <img
        src={src}
        alt={`Capa de ${release.title}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed((n) => n + 1)}
      />
    </div>
  );
}
