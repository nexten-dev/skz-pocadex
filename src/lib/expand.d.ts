import type { Database, Photocard, Release } from './types';
export function slug(s: string): string;
export function releaseMembers(db: Database, r: Release): string[];
export function expandRelease(db: Database, r: Release): Photocard[];
