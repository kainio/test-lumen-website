import type { CollectionEntry } from 'astro:content';
import * as contentUtils from './contentUtils';

/**
 * Convert blog collection entries to the format expected by Blog UI components
 */
export function blogEntriesToSectionItems(
    entries: CollectionEntry<'blog'>[],
    conceptSlug: string,
    baseUrl: string = ''
): any[] {
    return contentUtils.contentEntriesToSectionItems('blog', entries, conceptSlug, baseUrl);
}

/**
 * Resolve blog post URL based on concept slug
 */
export function resolveBlogPostUrl(
    conceptSlug: string,
    postSlug: string,
    baseUrl: string = ''
): string {
    return contentUtils.resolveContentUrl('blog', conceptSlug, postSlug, baseUrl);
}

/**
 * Resolve blog list URL based on concept slug
 */
export function resolveBlogListUrl(conceptSlug: string, baseUrl: string = ''): string {
    return contentUtils.resolveContentListUrl('blog', conceptSlug, baseUrl);
}

/**
 * Calculate reading time from content
 */
export function calculateReadingTime(content: string): number {
    return contentUtils.calculateReadingTime(content);
}

/**
 * Filter blog entries by concept slug
 */
export function filterByConceptSlug(
    entries: CollectionEntry<'blog'>[],
    conceptSlug: string
): CollectionEntry<'blog'>[] {
    return contentUtils.filterByConceptSlug(entries, conceptSlug);
}

/**
 * Sort blog entries by publication date (newest first)
 */
export function sortByDate(entries: CollectionEntry<'blog'>[]): CollectionEntry<'blog'>[] {
    return contentUtils.sortByDate(entries);
}

/**
 * Get related posts by category or tags
 */
export function getRelatedPosts(
    currentEntry: CollectionEntry<'blog'>,
    allEntries: CollectionEntry<'blog'>[],
    limit: number = 3
): CollectionEntry<'blog'>[] {
    return contentUtils.getRelatedItems(currentEntry, allEntries, limit);
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
    return contentUtils.formatDate(date);
}

/**
 * Generate excerpt from content if description is short
 */
export function generateExcerpt(content: string, maxLength: number = 160): string {
    return contentUtils.generateExcerpt(content, maxLength);
}
