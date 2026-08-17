import type { CollectionEntry } from 'astro:content';

/**
 * Convert collection entries to the format expected by UI components
 */
export function contentEntriesToSectionItems(
    collection: string,
    entries: any[],
    conceptSlug: string,
    baseUrl: string = ''
): any[] {
    return entries.map((entry) => ({
        title: entry.data.title,
        description: entry.data.description,
        image: entry.data.image,
        url: resolveContentUrl(collection, conceptSlug, entry.id, baseUrl),
        badge: entry.data.category,
        date: entry.data.pubDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }),
        author: entry.data.author,
        tags: entry.data.tags,
    }));
}

/**
 * Resolve content item URL based on collection and concept slug
 */
/**
 * Strip the concept prefix from an ID (e.g., "default/post" -> "post", "fr/post" -> "post")
 */
export function stripConceptPrefix(id: string): string {
    if (!id.includes('/')) return id;
    return id.substring(id.indexOf('/') + 1);
}

/**
 * Resolve content item URL based on collection and concept slug
 */
export function resolveContentUrl(
    collection: string,
    conceptSlug: string,
    itemId: string,
    baseUrl: string = ''
): string {
    const cleanBase = baseUrl.replace(/\/$/, '');
    const cleanedId = stripConceptPrefix(itemId);

    if (conceptSlug === 'default' || !conceptSlug) {
        return `${cleanBase}/${collection}/${cleanedId}`;
    }

    return `${cleanBase}/${conceptSlug}/${collection}/${cleanedId}`;
}

/**
 * Resolve content list URL based on collection and concept slug
 */
export function resolveContentListUrl(collection: string, conceptSlug: string, baseUrl: string = ''): string {
    const cleanBase = baseUrl.replace(/\/$/, '');

    if (conceptSlug === 'default' || !conceptSlug) {
        return `${cleanBase}/${collection}`;
    }

    return `${cleanBase}/${conceptSlug}/${collection}`;
}

/**
 * Calculate reading time from content
 */
export function calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
}

/**
 * Filter entries by concept slug
 */
export function filterByConceptSlug(
    entries: any[],
    conceptSlug: string
): any[] {
    return entries.filter((entry) => entry.data.conceptSlug === conceptSlug);
}

/**
 * Sort entries by publication date (newest first)
 */
export function sortByDate(entries: any[]): any[] {
    return entries.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

/**
 * Get related items by category or tags
 */
export function getRelatedItems(
    currentEntry: any,
    allEntries: any[],
    limit: number = 3
): any[] {
    const related = allEntries
        .filter((entry) => {
            // Exclude the current item
            if (entry.id === currentEntry.id) return false;

            // Match by category
            if (entry.data.category === currentEntry.data.category) return true;

            // Match by tags
            if (currentEntry.data.tags && entry.data.tags) {
                return currentEntry.data.tags.some((tag: string) => entry.data.tags?.includes(tag));
            }

            return false;
        })
        .slice(0, limit);

    return related;
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Generate excerpt from content if description is short
 */
export function generateExcerpt(content: string, maxLength: number = 160): string {
    const plainText = content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ').trim();

    if (plainText.length <= maxLength) {
        return plainText;
    }

    return plainText.substring(0, maxLength).trim() + '...';
}
