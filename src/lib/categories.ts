import { useCallback } from 'react';
import { updateProfile, useProfile } from './profile';
import type { ItemCategory } from './types';

export const CATEGORIES: { id: ItemCategory; label: string; short: string; icon: string; description: string }[] = [
  { id: 'photocard', label: 'Photocards do álbum', short: 'Photocards', icon: '🃏', description: 'Photocards que vêm dentro dos álbuns' },
  { id: 'inclusion', label: 'Outros itens do álbum', short: 'Itens do álbum', icon: '📦', description: 'Postcards, pôsteres, ID photos, films, stickers…' },
  { id: 'pob', label: 'Benefícios de loja (POB)', short: 'POB', icon: '🛍️', description: 'Brindes de pré-venda e exclusivos de lojas' },
  { id: 'luckydraw', label: 'Lucky draws', short: 'Lucky draw', icon: '🍀', description: 'Sorteios de lojas e eventos de vídeo-call/fansign' },
  { id: 'popup', label: 'Pop-up stores', short: 'Pop-up', icon: '🏪', description: 'Itens das pop-up stores oficiais' },
  { id: 'event', label: 'Eventos e merch', short: 'Eventos', icon: '🎤', description: 'Fanmeeting, turnê, fanclub e merch oficial' },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
export const CATEGORY_ORDER = new Map(CATEGORIES.map((c, i) => [c.id, i]));

const DEFAULT: ItemCategory[] = ['photocard'];

/** Categorias exibidas no app (preferência do arquivo pessoal). Padrão: só photocards. */
export function useVisibleCategories() {
  const visible = useProfile().prefs.categories;

  const setVisible = useCallback((next: ItemCategory[]) => {
    const list = next.length ? CATEGORIES.map((c) => c.id).filter((id) => next.includes(id)) : DEFAULT;
    updateProfile((p, now) => {
      p.prefs = { ...p.prefs, categories: list, t: now };
    });
  }, []);

  const toggle = useCallback(
    (id: ItemCategory) => setVisible(visible.includes(id) ? visible.filter((c) => c !== id) : [...visible, id]),
    [visible, setVisible],
  );

  return { visible, setVisible, toggle };
}

/** Membros exibidos (null = todos; "group" = cards de grupo/unit). */
export function useVisibleMembers() {
  const members = useProfile().prefs.members;
  const setMembers = useCallback((next: string[] | null) => {
    updateProfile((p, now) => {
      p.prefs = { ...p.prefs, members: next, t: now };
    });
  }, []);
  return { members, setMembers };
}
