import type { MediaImage, PhotocardSet, Release, ReleaseMedia } from './types';

export interface WikiSource {
  id: string;
  name: string;
  api: string;
  wiki: string;
}

export const WIKI_SOURCES: WikiSource[];
export const MEMBER_ALIASES: Record<string, string[]>;
export function norm(s: string): string;
export function hasWord(text: string, word: string): boolean;
export function detectMember(title: string, memberIds: string[]): string | null;
export function previewLabel(title: string): string;
export function previewKeys(previewTitle: string, sets: PhotocardSet[], slug: (s: string) => string): string[];
export function collectReleaseMedia(
  release: Pick<Release, 'title' | 'altTitle' | 'wikiPage'>,
  memberIds: string[],
  fetchImpl?: typeof fetch,
  sources?: WikiSource[],
): Promise<(Omit<ReleaseMedia, 'previews'> & { previews: (MediaImage & { label: string })[] }) | null>;
