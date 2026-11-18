import type { CardStatus, TransitStatus } from './types';

/** Grupo visual do status (define cor e contagem no progresso). */
export type StatusTone = 'owned' | 'transit' | 'wish' | 'notwant';

export interface StatusInfo {
  id: CardStatus;
  label: string;
  icon: string;
  tone: StatusTone;
  /** Posição na sequência de compra (1–7), só para etapas "a caminho". */
  step?: number;
  description?: string;
}

/** Etapas de uma compra até o card chegar em casa, na ordem. */
export const TRANSIT_STEPS: StatusInfo[] = [
  { id: 'bought', label: 'Comprado', icon: '🛒', tone: 'transit', step: 1, description: 'Compra feita (loja, GO ou vendedor)' },
  { id: 'secured', label: 'Garantido', icon: '🔒', tone: 'transit', step: 2, description: 'Card garantido / confirmado pelo vendedor ou GOM' },
  { id: 'proxy', label: 'Enviado para Proxy', icon: '📮', tone: 'transit', step: 3, description: 'A caminho do redirecionador / proxy' },
  { id: 'intl', label: 'Frete Inter', icon: '✈️', tone: 'transit', step: 4, description: 'Em frete internacional' },
  { id: 'tax', label: 'Taxa RF', icon: '💰', tone: 'transit', step: 5, description: 'Na Receita Federal / taxa de importação' },
  { id: 'homeready', label: 'Dispo Frete Casa', icon: '🏠', tone: 'transit', step: 6, description: 'Disponível para envio até sua casa' },
  { id: 'shipped', label: 'Enviado', icon: '🚚', tone: 'transit', step: 7, description: 'Enviado para você — quase chegando!' },
];

export const STATUSES: StatusInfo[] = [
  { id: 'owned', label: 'Tenho', icon: '✓', tone: 'owned' },
  ...TRANSIT_STEPS,
  { id: 'wish', label: 'Quero', icon: '♥', tone: 'wish' },
  { id: 'notwant', label: 'Não quero', icon: '🚫', tone: 'notwant', description: 'Não conta no progresso nem em “faltando”' },
];

export const STATUS_INFO = Object.fromEntries(STATUSES.map((s) => [s.id, s])) as Record<CardStatus, StatusInfo>;

export const TRANSIT_IDS = TRANSIT_STEPS.map((s) => s.id) as TransitStatus[];

export function isTransit(s: CardStatus | undefined | null): s is TransitStatus {
  return !!s && STATUS_INFO[s]?.tone === 'transit';
}

/** Próxima etapa da compra; depois de "Enviado" vem "Tenho". */
export function nextStatus(s: TransitStatus): CardStatus {
  const i = TRANSIT_IDS.indexOf(s);
  return i >= 0 && i < TRANSIT_IDS.length - 1 ? TRANSIT_IDS[i + 1] : 'owned';
}

/** Aceita status de versões antigas do app (ex.: "transit" → "Comprado"). */
export function normalizeStatus(raw: unknown): CardStatus | null {
  if (raw === 'transit') return 'bought';
  return typeof raw === 'string' && raw in STATUS_INFO ? (raw as CardStatus) : null;
}

export function statusLabel(s: CardStatus): string {
  return STATUS_INFO[s]?.label ?? s;
}
