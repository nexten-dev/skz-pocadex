import type { Photocard, Release } from './types';

export interface WikiSource {
  id: string;
  name: string;
  api: string;
}

export interface ImageCandidate {
  title: string;
  thumb: string;
  url: string;
  page?: string;
  source: string;
  member: string | null;
}

export interface MatchedImage extends ImageCandidate {
  confidence: 'exact' | 'member';
}

export const WIKI_SOURCES: WikiSource[];
export const MEMBER_ALIASES: Record<string, string[]>;
export function norm(s: string): string;
export function detectMember(title: string, memberIds: string[]): string | null;
export function isPhotocard(title: string): boolean;
export function findReleaseImages(
  release: Pick<Release, 'title' | 'altTitle'>,
  memberIds: string[],
  fetchImpl?: typeof fetch,
  sources?: WikiSource[],
): Promise<ImageCandidate[]>;
export function matchImages(cards: Photocard[], candidates: ImageCandidate[]): Map<string, MatchedImage>;
