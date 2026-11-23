// Junta ao catálogo oficial o que o usuário criou: álbuns próprios e itens (Meus itens)
// ligados a álbuns. Nada disso vai para a base oficial — fica no arquivo pessoal.
import { albumReleaseId, itemCardId, type CustomAlbum, type CustomItem } from './profile';
import type { Database, Photocard, Release, ReleaseType } from './types';

/** Catálogo com os álbuns criados pelo usuário acrescentados. */
export function withCustomAlbums(db: Database, albums: Record<string, CustomAlbum>): Database {
  const mine: Release[] = Object.values(albums)
    .filter((a) => !a.deleted)
    .map((a) => ({
      id: albumReleaseId(a.id),
      title: a.title,
      type: a.type as ReleaseType,
      market: a.market,
      date: a.date || new Date(a.t).toISOString().slice(0, 10),
      sets: [],
      verified: true,
      mine: true,
      notes: a.notes,
      ...(a.cover ? { cover: { url: a.cover, source: 'Sua imagem' } } : {}),
    }));
  return mine.length ? { ...db, releases: [...db.releases, ...mine] } : db;
}

/** Itens criados pelo usuário que estão ligados a um álbum, como cards. */
export function customCards(items: Record<string, CustomItem>, releaseIds: Set<string>): Photocard[] {
  return Object.values(items)
    .filter((i) => !i.deleted && i.releaseId && releaseIds.has(i.releaseId))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((i) => {
      const category = i.category ?? 'misc';
      return {
        id: itemCardId(i.id),
        releaseId: i.releaseId!,
        setId: `mine-${category}`,
        setName: 'Meus itens',
        version: null,
        memberId: i.member ?? 'group',
        label: '',
        index: 1,
        category,
        ...(i.kind ? { itemType: i.kind } : {}),
        ...(i.origin ? { store: i.origin } : {}),
        format: 'card' as const,
        custom: true,
        title: i.name,
        ...(i.image ? { image: i.image } : {}),
      };
    });
}
