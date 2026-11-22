import { useMemo } from 'react';
import { useProfile } from './profile';
import type { Database, TemplateItem } from './types';

/** Templates da base + os adicionados pelo usuário (marcados com mine). */
export function useAllTemplates(db: Database): TemplateItem[] {
  const profile = useProfile();
  return useMemo(() => {
    const mine: TemplateItem[] = Object.values(profile.templates)
      .filter((t) => !t.deleted)
      .sort((a, b) => b.t - a.t)
      .map((t) => ({
        id: t.id,
        title: t.title,
        path: [t.section || 'Meus templates'],
        image: t.image,
        author: t.author,
        post: t.post,
        releaseId: t.releaseId,
        mine: true,
      }));
    return [...mine, ...(db.templates?.items ?? [])];
  }, [db, profile.templates]);
}
