/**
 * Utility to strip unused pages' sections from the siteData object before
 * sending it to the client. This significantly reduces the serialized JSON payload
 * and optimizes hydration performance for projects with many pages.
 */
export function optimizeSiteDataForPage(siteData: any, activePageId: string): any {
    if (!siteData) return siteData;

    // Shallow copy root
    const optimized = { ...siteData };

    // 1. Strip sections from all pages in siteData.pages except the active page
    if (optimized.pages) {
        optimized.pages = optimized.pages.map((p: any) => {
            if (p.id === activePageId) {
                return p; // Keep active page sections
            }
            // Strip sections, keep routing/slug metadata
            const { sections, ...rest } = p;
            return rest;
        });
    }

    // 2. Strip sections from sitemap configurations/concepts except active page
    if (optimized.concepts) {
        optimized.concepts = optimized.concepts.map((concept: any) => {
            const optConcept = { ...concept };
            if (optConcept.pageConfigs) {
                const optPageConfigs: Record<string, any> = {};
                for (const pageId in optConcept.pageConfigs) {
                    if (pageId === activePageId) {
                        optPageConfigs[pageId] = optConcept.pageConfigs[pageId];
                    } else {
                        // Strip sections, keep layoutId, seo, slug
                        const { sections, ...rest } = optConcept.pageConfigs[pageId];
                        optPageConfigs[pageId] = rest;
                    }
                }
                optConcept.pageConfigs = optPageConfigs;
            }
            return optConcept;
        });
    }

    // 3. Strip sections from activeConcept if present
    if (optimized.activeConcept) {
        const optConcept = { ...optimized.activeConcept };
        if (optConcept.pageConfigs) {
            const optPageConfigs: Record<string, any> = {};
            for (const pageId in optConcept.pageConfigs) {
                if (pageId === activePageId) {
                    optPageConfigs[pageId] = optConcept.pageConfigs[pageId];
                } else {
                    const { sections, ...rest } = optConcept.pageConfigs[pageId];
                    optPageConfigs[pageId] = rest;
                }
            }
            optConcept.pageConfigs = optPageConfigs;
        }
        optimized.activeConcept = optConcept;
    }

    return optimized;
}
