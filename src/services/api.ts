export const BUILDER_API_URL = import.meta.env.BUILDER_API_URL || 'http://localhost:4321/api';
export const PROJECT_ID = import.meta.env.PROJECT_ID || 'default';
export const CONCEPT_ID = import.meta.env.CONCEPT_ID || 'default';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * This app's SSR reads its data over the network from the builder's own dev server (a
 * separate process/app). On a cold `npm run dev`, both apps typically start around the same
 * time, and the builder's API route needs its own first-request JIT compile — a request that
 * lands in that window fails with ECONNRESET/"fetch failed", not a clean HTTP error. The
 * caller (`[...slug].astro`) treats a failed fetch as "page not found" and redirects to a
 * 404, so an unretried transient failure here surfaces as the wrong page entirely, not just
 * a slow one. Retried with a short backoff since the target is virtually always reachable a
 * moment later.
 */
async function fetchWithRetry(url: string, attempts = 4, delayMs = 400): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt++) {
        if (attempt > 0) await sleep(delayMs * attempt);
        try {
            return await fetch(url);
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}

export async function fetchSiteData(conceptIdOverride?: string, projectIdOverride?: string) {
    const conceptId = conceptIdOverride || CONCEPT_ID;
    const projectId = projectIdOverride || PROJECT_ID;

    if (import.meta.env.BUILD_MODE === 'static' || process.env.BUILD_MODE === 'static') {
        try {
            const fs = await import('node:fs/promises');
            const path = await import('node:path');
            const staticDir = path.join(process.cwd(), 'src/data/static');
            let fileName = 'default.json';
            
            if (conceptId && conceptId !== 'default' && conceptId !== 'active') {
                try {
                    const manifestStr = await fs.readFile(path.join(staticDir, 'manifest.json'), 'utf-8');
                    const manifest = JSON.parse(manifestStr);
                    const slugOverride = conceptId.startsWith('slug:') ? conceptId.slice(5) : undefined;
                    const matching = manifest.concepts.find((c: any) => {
                        if (slugOverride) {
                            return c.slug?.replace(/^\/+|\/+$/g, '') === slugOverride.replace(/^\/+|\/+$/g, '');
                        }
                        return c.id === conceptId;
                    });
                    if (matching) {
                        fileName = matching.dataFile;
                    } else {
                        fileName = `concept-${conceptId}.json`;
                    }
                } catch {
                    fileName = `concept-${conceptId}.json`;
                }
            }
            
            const filePath = path.join(staticDir, fileName);
            const dataStr = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(dataStr);
        } catch (e) {
            console.warn("Local static data file not found, falling back to API fetch", e);
        }
    }

    const response = await fetchWithRetry(`${BUILDER_API_URL}/projects/${projectId}/concept/${conceptId}/site`);
    if (!response.ok) {
        throw new Error(`Failed to fetch site data: ${response.statusText}`);
    }
    return await response.json();
}


export async function fetchPage(slug: string, conceptIdOverride?: string, projectIdOverride?: string) {
    let siteData;
    let targetSlug = slug.startsWith('/') ? slug : `/${slug}`;
    let currentConceptId = conceptIdOverride;
    const projectId = projectIdOverride || PROJECT_ID;

    // 1. Fetch default site data to get list of mountable concepts
    // We need this to identify if the URL has a concept prefix regardless of overrides
    const defaultSiteData = await fetchSiteData(undefined, projectId);

    // 2. Check if the slug starts with a mountable concept slug
    if (defaultSiteData.mountableConcepts && defaultSiteData.mountableConcepts.length > 0) {
        // Remove leading slash for splitting
        const cleanSlug = targetSlug.replace(/^\//, '');
        const firstSegment = cleanSlug.split('/')[0];

        // Match against known concept slugs (excluding empty slug representing default runtime)
        let matchingConcept = defaultSiteData.mountableConcepts.find((c: any) => c.slug === firstSegment && c.slug !== '');

        if (!matchingConcept && defaultSiteData.concepts) {
            matchingConcept = defaultSiteData.concepts.find((c: any) => c.slug === firstSegment);
        }

        if (matchingConcept) {
            // It's a localized path.
            // If we don't have an override, use this concept.
            if (!currentConceptId) {
                currentConceptId = matchingConcept.id;
            }

            const prefix = `/${firstSegment}`;
            if (targetSlug.startsWith(prefix)) {
                targetSlug = targetSlug.substring(prefix.length) || '/';
            }
        }
    }

    // 3. Fetch the actual site data for the resolved concept (or default)
    if (currentConceptId && currentConceptId !== 'default' && currentConceptId !== 'active') {
        try {
            siteData = await fetchSiteData(currentConceptId, projectId);
        } catch (e) {
            console.error("Failed to fetch concept data, falling back to default", e);
            siteData = defaultSiteData;
        }
    } else {
        siteData = defaultSiteData;
    }

    // 4. Find the page in the resolved site data
    let page = siteData.pages.find((p: any) => {
        const pSlug = (p.slug || '').startsWith('/') ? p.slug : `/${p.slug || ''}`;
        return pSlug === targetSlug || (targetSlug === '/' && (p.slug === 'home' || p.slug === '' || p.slug === '/home'));
    });

    // Robust fallback for root path: if requesting '/' and no page matches, use the first 'page' type entry
    if (!page && targetSlug === '/') {
        page = siteData.pages.find((p: any) => p.type === 'page');
    }

    return { page, site: siteData };
}
