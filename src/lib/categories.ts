import { useCallback, useEffect, useState } from 'react';
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

const KEY = 'pocadex:categories';
const EVENT = 'pocadex:categories-changed';
const DEFAULT: ItemCategory[] = ['photocard'];

function read(): ItemCategory[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const list = (JSON.parse(raw) as string[]).filter((c): c is ItemCategory => CATEGORY_BY_ID.has(c as ItemCategory));
      if (list.length) return list;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT;
}

/** Categorias exibidas no app. Padrão: só photocards. */
export function useVisibleCategories() {
  const [visible, setVisibleState] = useState<ItemCategory[]>(read);

  useEffect(() => {
    const sync = () => setVisibleState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setVisible = useCallback((next: ItemCategory[]) => {
    const list = next.length ? CATEGORIES.map((c) => c.id).filter((id) => next.includes(id)) : DEFAULT;
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
    setVisibleState(list);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const toggle = useCallback(
    (id: ItemCategory) => setVisible(visible.includes(id) ? visible.filter((c) => c !== id) : [...visible, id]),
    [visible, setVisible],
  );

  return { visible, setVisible, toggle };
}
