// ---- Base de dados (formato do arquivo public/data/photocards.json) ----

export interface Member {
  id: string;
  name: string;
  hangul: string;
  color: string;
  /** Membro que não faz mais parte do grupo (ex.: Woojin). */
  former?: boolean;
}

export type ReleaseType =
  | 'mini'
  | 'full'
  | 'repackage'
  | 'special'
  | 'mixtape'
  | 'single'
  | 'compilation';

export type Market = 'KR' | 'JP';

/**
 * Categoria do item colecionável.
 * photocard = photocards que vêm dentro do álbum (padrão)
 * pob       = benefícios de pré-venda/loja (Target, Soundwave, JYP Shop…)
 * luckydraw = lucky draws / sorteios de lojas
 * popup     = itens de pop-up stores oficiais
 * inclusion = outros itens do álbum (postcards, pôsteres, ID photo, film…)
 * event     = fanmeeting, turnê, fanclub e afins
 */
export type ItemCategory = 'photocard' | 'pob' | 'luckydraw' | 'popup' | 'inclusion' | 'event';

/** Formato do item, para a proporção da miniatura. */
export type ItemFormat = 'card' | 'wide' | 'tall' | 'square';

/**
 * Um "set" é um grupo de photocards que compartilham as mesmas regras.
 * Ex.: "Standard" com versões A/B/C e 2 photocards por membro em cada versão.
 * A lista de cards é gerada a partir das regras, com IDs estáveis.
 */
export interface PhotocardSet {
  id: string;
  name: string;
  /** Versões do álbum que contêm este set. Vazio = set único. */
  versions?: string[];
  /** Quantos photocards diferentes existem por membro, em cada versão. */
  perMember?: number;
  /** Cards extras que não seguem a regra por membro (ex.: foto de grupo, unit). */
  extras?: { id: string; label: string; members?: string[] }[];
  /** Restringe o set a certos membros (padrão: membros do lançamento). */
  members?: string[];
  /** Descrição de como os cards vêm (ex.: "1 aleatório por álbum"). */
  note?: string;
  /** Categoria (padrão: photocard). */
  category?: ItemCategory;
  /** Tipo do item quando não é photocard (ex.: "Postcard", "Mini pôster"). */
  itemType?: string;
  /** Loja/evento de origem (ex.: "Soundwave", "Pop-up Seul"). */
  store?: string;
  format?: ItemFormat;
}

export interface Release {
  id: string;
  title: string;
  /** Título alternativo / original (ex.: GO生 → GO LIVE). */
  altTitle?: string;
  subtitle?: string;
  type: ReleaseType;
  market: Market;
  date: string; // YYYY-MM-DD
  /** Membros que participaram (padrão: membros ativos atuais). */
  members?: string[];
  /** Versões físicas do álbum. */
  albumVersions?: string[];
  sets: PhotocardSet[];
  /** true quando a lista de cards foi conferida com fontes oficiais/templates. */
  verified?: boolean;
  notes?: string;
  /** Imagens de prévia por ID de card (URL ou objeto com origem). */
  images?: Record<string, string | DbImage>;
}

export interface DbImage {
  url: string;
  thumb?: string;
  /** Página de origem (ex.: página do arquivo na wiki). */
  page?: string;
  source?: string;
}

export interface Database {
  schemaVersion: number;
  dataVersion: string;
  updatedAt: string;
  sources?: { name: string; url: string }[];
  members: Member[];
  releases: Release[];
}

// ---- Gerado no app ----

export interface Photocard {
  id: string;
  releaseId: string;
  setId: string;
  setName: string;
  version: string | null;
  memberId: string; // id do membro ou "group"
  label: string;
  index: number;
  category: ItemCategory;
  itemType?: string;
  store?: string;
  format: ItemFormat;
}

export interface CardImage {
  url: string;
  thumb: string;
  page?: string;
  source?: string;
  /** custom = escolhida pelo usuário, db = da base oficial do app, wiki = encontrada automaticamente */
  kind: 'custom' | 'db' | 'wiki';
  /** Para kind=wiki: exact = membro+versão batem; member = só o membro (aproximada). */
  confidence?: 'exact' | 'member';
}

// ---- Coleção do usuário (localStorage) ----

export type CardStatus = 'owned' | 'transit' | 'wish';

export interface CollectionEntry {
  s: CardStatus;
  /** Quantidade (útil para repetidos/trocas). */
  q?: number;
  t: number; // timestamp da última alteração
}

export interface Collection {
  version: 1;
  cards: Record<string, CollectionEntry>;
}
