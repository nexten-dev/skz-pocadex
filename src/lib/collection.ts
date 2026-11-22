import { useCallback, useMemo } from 'react';
import type { CardStatus, Collection } from './types';
import { STATUS_INFO } from './status';
import { getProfile, normalizeProfile, setProfile, updateProfile, useProfile, mergeProfiles, type Profile } from './profile';

/**
 * Marcações da coleção. Ficam no arquivo pessoal (src/lib/profile.ts),
 * que é salvo no navegador e, com login, no Google Drive do usuário.
 */
export function useCollection() {
  const profile = useProfile();
  const collection = useMemo<Collection>(() => ({ version: 1, cards: profile.cards }), [profile.cards]);

  const setStatus = useCallback((ids: string[], status: CardStatus | null) => {
    updateProfile((p, now) => {
      for (const id of ids) {
        if (status === null) {
          if (p.cards[id]) p.removed[id] = now;
          delete p.cards[id];
        } else {
          p.cards[id] = { ...p.cards[id], s: status, t: now };
          delete p.removed[id];
        }
      }
    });
  }, []);

  const setQty = useCallback((id: string, q: number) => {
    updateProfile((p, now) => {
      if (p.cards[id]) p.cards[id] = { ...p.cards[id], q: Math.max(1, q), t: now };
    });
  }, []);

  /** Aplica a tabela de migração da base (card antigo → card novo). */
  const migrateIds = useCallback((map: Record<string, string> | undefined) => {
    if (!map) return;
    const p = getProfile();
    const hasOld = Object.keys(p.cards).some((k) => map[k]) || Object.keys(p.images).some((k) => map[k]);
    if (!hasOld) return;
    updateProfile((d) => {
      d.cards = migrateKeys(d.cards, map);
      d.images = migrateKeys(d.images, map);
    });
  }, []);

  return { collection, setStatus, setQty, migrateIds };
}

/** Baixa um backup com o arquivo pessoal inteiro. */
export function exportBackup() {
  const blob = new Blob(
    [JSON.stringify({ app: 'skz-pocadex', appVersion: __APP_VERSION__, exportedAt: new Date().toISOString(), ...getProfile() }, null, 2)],
    { type: 'application/json' },
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `skz-pocadex-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Lê um backup (de qualquer versão do app). */
export async function parseBackup(file: File): Promise<Profile> {
  const json = JSON.parse(await file.text());
  if (!json || typeof json.cards !== 'object') throw new Error('Arquivo de backup inválido');
  const p = normalizeProfile(json);
  // Backups antigos não têm horários: considera "agora" para valerem na mesclagem
  const now = Date.now();
  for (const e of Object.values(p.cards)) if (!e.t || e.t < 10) e.t = now;
  for (const i of Object.values(p.images)) if (!i.t || i.t < 10) i.t = now;
  return p;
}

/** Importa um backup: substitui (padrão) ou junta com o que já existe. */
export function importBackup(p: Profile, mode: 'replace' | 'merge') {
  setProfile(mode === 'merge' ? mergeProfiles(getProfile(), p) : p, { touch: true });
}

export const STATUS_LABEL = Object.fromEntries(
  Object.values(STATUS_INFO).map((s) => [s.id, s.label]),
) as Record<CardStatus, string>;

/**
 * Move valores de chaves antigas para as novas, segundo a tabela de migração.
 * Não sobrescreve uma chave nova que já exista. Devolve o mesmo objeto se nada mudar.
 */
export function migrateKeys<T>(record: Record<string, T>, map: Record<string, string>): Record<string, T> {
  let out: Record<string, T> | null = null;
  for (const [from, value] of Object.entries(record)) {
    const to = map[from];
    if (!to) continue;
    out ??= { ...record };
    delete out[from];
    if (!(to in out)) out[to] = value;
  }
  return out ?? record;
}
