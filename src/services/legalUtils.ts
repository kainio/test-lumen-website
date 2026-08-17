import type { CollectionEntry } from 'astro:content';
import * as contentUtils from './contentUtils';

/**
 * Convert legal collection entries to the format expected by UI components
 */
export function legalEntriesToSectionItems(
    entries: CollectionEntry<'legal'>[],
    conceptSlug: string,
    baseUrl: string = ''
): any[] {
    return contentUtils.contentEntriesToSectionItems('legal', entries, conceptSlug, baseUrl);
}

/**
 * Resolve legal page URL based on concept slug
 */
export function resolveLegalUrl(
    conceptSlug: string,
    postSlug: string,
    baseUrl: string = ''
): string {
    return contentUtils.resolveContentUrl('legal', conceptSlug, postSlug, baseUrl);
}

/**
 * Resolve legal list URL based on concept slug
 */
export function resolveLegalListUrl(conceptSlug: string, baseUrl: string = ''): string {
    return contentUtils.resolveContentListUrl('legal', conceptSlug, baseUrl);
}
