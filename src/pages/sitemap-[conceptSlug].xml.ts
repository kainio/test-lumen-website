import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function getStaticPaths() {
    try {
        const dataDir = path.resolve(process.cwd(), "src/data/static");
        const manifestStr = await fs.readFile(path.join(dataDir, "manifest.json"), "utf-8");
        const manifest = JSON.parse(manifestStr);

        return manifest.concepts.map((concept: any) => {
            const conceptSlug = (concept.slug || '').replace(/^\/+|\/+$/g, '');
            return {
                params: { conceptSlug: conceptSlug || 'default' },
                props: { concept, dataFile: concept.dataFile }
            };
        });
    } catch (e) {
        console.error("Error generating sitemap paths:", e);
        return [];
    }
}

export const GET: APIRoute = async ({ props, site }) => {
    const { concept, dataFile } = props;
    const dataDir = path.resolve(process.cwd(), "src/data/static");
    const dataStr = await fs.readFile(path.join(dataDir, dataFile), 'utf-8');
    const siteData = JSON.parse(dataStr);

    const conceptSlug = (concept.slug || '').replace(/^\/+|\/+$/g, '');
    const siteUrl = site?.toString().replace(/\/$/, "") || 'https://example.com';
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");

    let urls = '';
    siteData.pages.forEach((page: any) => {
        let pSlug = (page.slug || '').replace(/^\/+|\/+$/g, '');
        if (pSlug === 'home') pSlug = '';

        let finalPath = '';
        if (conceptSlug && !concept.isDefault) {
            finalPath = pSlug ? `${conceptSlug}/${pSlug}` : conceptSlug;
        } else if (concept.isDefault && concept.slug) {
            // If it's default and has a slug, it's served at /slug/...
            finalPath = pSlug ? `${conceptSlug}/${pSlug}` : conceptSlug;
        } else {
            finalPath = pSlug;
        }

        const fullPath = [base, finalPath].filter(Boolean).join('/').replace(/\/+$/, '');
        const absoluteUrl = new URL(fullPath || '/', siteUrl).toString().replace(/\/$/, "") + "/";

        urls += `  <url>\n    <loc>${absoluteUrl}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n  </url>\n`;
    });

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}</urlset>`;

    return new Response(sitemapXml, {
        headers: {
            'Content-Type': 'application/xml'
        }
    });
};
