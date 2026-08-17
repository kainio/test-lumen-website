
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
/**
 * Resolves which astryx theme a concept renders with, mirroring `resolveStyleGuide` in
 * @lumegem/shared. Kept local because this script is run by tsx before the workspace
 * packages are built; the previous copy had drifted and still merged the retired
 * themeLight/themeDark/customThemeLight/customCss fields.
 */
function resolveStyleGuide(project: any, concept: any, visited = new Set<string>()): any {
    if (concept.styleGuideSource?.type === 'concept' && concept.styleGuideSource.conceptId && visited.has(concept.styleGuideSource.conceptId)) {
        return concept.styleGuide;
    }
    if (visited.size > 10) return concept.styleGuide;

    if (concept.styleGuideSource?.type === 'project') {
        return {
            ...concept.styleGuide,
            themeName: project.settings?.themeName || concept.styleGuide?.themeName,
        };
    }

    if (concept.styleGuideSource?.type === 'concept' && concept.styleGuideSource.conceptId) {
        visited.add(concept.id);
        const sourceConcept = project.concepts.find((c: any) => c.id === concept.styleGuideSource?.conceptId);
        if (sourceConcept) {
            return resolveStyleGuide(project, sourceConcept, visited);
        }
    }
    return concept.styleGuide;
}

// --- Types from @lumegem/shared (simplified for script) ---
interface Project {
    title: string;
    icon: string;
    settings?: any;
    sitemap: any[];
    concepts: any[];
    defaultConceptId: string;
    activeConceptId: string;
}

import { getWorkspaceRoot, getDataDir } from '@lumegem/shared/node/paths';
import { getFontUrl, getStyleGuideFonts } from '@lumegem/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = getWorkspaceRoot();

let BUILDER_DATA_PATH = '';
let STATIC_DATA_DIR = '';
let SITE_DIR = '';
let PUBLIC_DIR = '';
let projectDataDir = '';

async function loadEnv(dir: string) {
    for (const file of ['.env', '.env.local']) {
        try {
            const content = await fs.readFile(path.join(dir, file), 'utf-8');
            for (const line of content.split('\n')) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const idx = trimmed.indexOf('=');
                if (idx > 0) {
                    const key = trimmed.slice(0, idx).trim();
                    let val = trimmed.slice(idx + 1).trim();
                    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
                    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
                    process.env[key] = val;
                }
            }
        } catch {}
    }
}

async function downloadGoogleFont(fontName: string, destBaseDir: string, baseUrl: string): Promise<{ css: string; files: string[] }> {
    const safeName = fontName.replace(/\s+/g, '-').toLowerCase();
    const fontDir = path.join(destBaseDir, 'fonts', safeName);
    await fs.mkdir(fontDir, { recursive: true });

    const fontUrl = getFontUrl(fontName);

    console.log(`   ⬇️ Downloading font: ${fontName}`);

    const response = await fetch(fontUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch font CSS for ${fontName}: ${response.statusText}`);
    }

    let css = await response.text();
    const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(m => m[1]);
    const localFiles: string[] = [];

    const basePrefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    for (const url of urls) {
        const fileName = path.basename(url);
        const filePath = path.join(fontDir, fileName);

        // Download if not already exists
        try {
            await fs.access(filePath);
        } catch {
            const fontRes = await fetch(url);
            if (fontRes.ok) {
                const buffer = await fontRes.arrayBuffer();
                await fs.writeFile(filePath, Buffer.from(buffer));
            }
        }

        const relativePath = `${basePrefix}fonts/${safeName}/${fileName}`;
        // Replace the URL, handling potential quotes
        css = css.split(url).join(relativePath);
        localFiles.push(relativePath);
    }

    return { css, files: localFiles };
}

// Helper to resolve URL with concept slug and base URL
function resolveUrl(href: string, conceptSlug: string, baseUrl: string) {
    if (!href) return href;

    // 1. Handle localhost/builder uploads and assets
    if (href.includes('/uploads/') || href.includes('/masks/')) {
        // Match both absolute localhost URLs and relative paths
        const match = href.match(/https?:\/\/[^\/]+\/(uploads|masks)\/(.+)/) || href.match(/\/(uploads|masks)\/(.+)/);
        if (match) {
            const type = match[1];
            const relativePath = match[2];
            const basePrefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
            return `${basePrefix}${type}/${relativePath}`;
        }
    }

    // 2. Skip other external/special URLs or emojis (no dots, no slashes)
    if (href.includes('://') || href.startsWith('data:') || href.startsWith('#') || (!href.includes('.') && !href.includes('/'))) return href;

    // 3. Handle internal page/concept navigation
    let cleanPath = href.startsWith('/') ? href.slice(1) : href;
    if (cleanPath === 'home' || cleanPath === '') cleanPath = '';

    let finalPath = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    if (conceptSlug) {
        finalPath += `${conceptSlug.replace(/^\/+|\/+$/g, '')}/`;
    }
    finalPath += cleanPath;
    return finalPath;
}

function transformLinks(obj: any, conceptSlug: string, baseUrl: string): any {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => transformLinks(item, conceptSlug, baseUrl));
    }

    const newObj: any = {};
    for (const key in obj) {
        let value = obj[key];

        if (typeof value === 'string') {
            // Transform URLs for known keys OR any string that looks like a local upload
            const isUrlKey = ['href', 'url', 'image', 'avatar_or_icon', 'ogImage', 'icon', 'maskImage', 'clipPath'].includes(key);
            const isLocalAssetUrl = value.includes('/uploads/') || value.includes('/masks/');

            if (isUrlKey || isLocalAssetUrl) {
                newObj[key] = resolveUrl(value, conceptSlug, baseUrl);
            } else {
                newObj[key] = value;
            }
        } else if (typeof value === 'object') {
            newObj[key] = transformLinks(value, conceptSlug, baseUrl);
        } else {
            newObj[key] = value;
        }
    }
    return newObj;
}

// Recursive helper to flatten sitemap and compute absolute paths
const flattenSitemap = (entries: any[], concept: any, project: any, parentPath: string = ''): any[] => {
    let flattened: any[] = [];
    entries.forEach(entry => {
        let currentSlug = concept.pageConfigs[entry.id]?.slug !== undefined ? concept.pageConfigs[entry.id].slug : entry.slug;
        if (currentSlug === '/') currentSlug = '';
        const cleanSlug = currentSlug.replace(/^\/+|\/+$/g, '');
        const fullPath = [parentPath, cleanSlug].filter(Boolean).join('/');
        const resolvedPath = fullPath || '/';

        flattened.push({
            ...entry,
            slug: resolvedPath,
            sections: concept.pageConfigs[entry.id]?.sections || [],
            layoutId: concept.pageConfigs[entry.id]?.layoutId,
            seo: {
                ...(entry.seo || {}),
                ...(concept.pageConfigs[entry.id]?.seo || {})
            }
        });

        if (entry.children && entry.children.length > 0) {
            flattened = flattened.concat(flattenSitemap(entry.children, concept, project, resolvedPath === '/' ? '' : resolvedPath));
        }
    });
    return flattened;
};

async function build() {
    console.log('🚀 Starting Static Site Build CLI...');

    // Load local env files in current directory
    await loadEnv(process.cwd());

    const projectId = process.argv[2] || process.env.PROJECT_ID || 'default';
    projectDataDir = projectId === 'default'
        ? getDataDir()
        : path.join(PROJECT_ROOT, 'projects/data', projectId);

    BUILDER_DATA_PATH = path.join(projectDataDir, 'project.json');
    SITE_DIR = projectId === 'default'
        ? path.join(PROJECT_ROOT, 'apps/site')
        : path.join(PROJECT_ROOT, 'projects/sites', projectId);

    // Load project-specific env files from the site directory
    await loadEnv(SITE_DIR);

    STATIC_DATA_DIR = path.join(SITE_DIR, 'src/data/static');
    PUBLIC_DIR = path.join(SITE_DIR, 'public');

    try {
        // 1. Read Project Data
        console.log(`📂 Reading project data from ${BUILDER_DATA_PATH}...`);
        let dataStr: string;
        try {
            dataStr = await fs.readFile(BUILDER_DATA_PATH, 'utf-8');
        } catch {
            console.log('ℹ️ project.json not found in data/, checking sample file...');
            const samplePath = path.join(getDataDir(), 'project.json.sample');
            dataStr = await fs.readFile(samplePath, 'utf-8');
        }
        const project = JSON.parse(dataStr) as Project;

        // 2. Prepare Static Data Directory
        await fs.mkdir(STATIC_DATA_DIR, { recursive: true });

        // 3. Copy Uploads from Builder
        const BUILDER_PUBLIC_DIR = path.join(PROJECT_ROOT, 'apps/builder/public');
        const BUILDER_UPLOADS_DIR = path.join(BUILDER_PUBLIC_DIR, 'uploads');
        const SITE_UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

        try {
            await fs.access(BUILDER_UPLOADS_DIR);
            console.log('📂 Copying uploads from builder...');
            await fs.mkdir(SITE_UPLOADS_DIR, { recursive: true });
            await fs.cp(BUILDER_UPLOADS_DIR, SITE_UPLOADS_DIR, { recursive: true });
        } catch (e) {
            console.log('ℹ️ No uploads found in builder.');
        }

        // 4. Prepare data for each concept
        const conceptsToBuild = project.concepts.filter(c => c.isMountable || c.id === project.defaultConceptId || c.id === project.activeConceptId);

        const manifest: any = {
            title: project.title,
            concepts: []
        };

        const downloadedFontsCache = new Map<string, string>();
        let allFontsCss = '';
        let hasSelfHostedAny = false;
        const conceptNotFoundRedirectRules: string[] = [];
        let defaultNotFoundRedirectRule: string | undefined;

        for (const conceptSummary of project.concepts) {
            const conceptId = conceptSummary.id;
            const conceptPath = path.join(projectDataDir, 'concepts', `${conceptId}.json`);
            let concept = conceptSummary;
            try {
                const conceptDataStr = await fs.readFile(conceptPath, 'utf-8');
                concept = JSON.parse(conceptDataStr);
            } catch (err) {
                console.warn(`⚠️ Could not load full concept file for ${conceptId}, falling back to index summary:`, err);
            }

            const isDefault = concept.id === project.defaultConceptId || (!project.defaultConceptId && concept.id === project.activeConceptId);

            console.log(`📝 Processing concept: ${concept.name} (${concept.slug || 'root'})`);

            const conceptSlug = isDefault ? '' : (concept.slug || '');
            const baseUrl = process.env.BASE_URL || '/';

            const styleGuide = resolveStyleGuide(project, concept);

            // Resolve Ecommerce Settings
            const ecommerce = concept.ecommerceSource?.type === 'project'
                ? (project.settings?.ecommerce || concept.ecommerce)
                : (concept.ecommerce || project.settings?.ecommerce);

            let localFontsCss = '';

            // Self-hosting now covers the fonts the concept's astryx theme declares. The
            // theme CSS names its families but ships no @font-face, so they still have to
            // be fetched — from Google at runtime, or vendored here for offline builds.
            const shouldSelfHost = process.env.SELF_HOST_FONTS === 'true';

            if (shouldSelfHost) {
                hasSelfHostedAny = true;
                const fonts = getStyleGuideFonts(styleGuide);
                for (const font of fonts) {
                    if (downloadedFontsCache.has(font)) {
                        localFontsCss += downloadedFontsCache.get(font);
                    } else {
                        const result = await downloadGoogleFont(font, PUBLIC_DIR, baseUrl);
                        downloadedFontsCache.set(font, result.css);
                        localFontsCss += result.css;
                        allFontsCss += result.css;
                    }
                }
            }

            let siteData = {
                title: project.title,
                icon: project.icon,
                pages: flattenSitemap(project.sitemap, concept, project),
                layouts: concept.layouts,
                styleGuide,
                settings: {
                    ...project.settings,
                    ecommerce
                },
                mountableConcepts: project.concepts
                    .filter(c => c.isMountable && c.slug)
                    .map(c => ({ id: c.id, name: c.name, slug: c.slug! })),
                concepts: project.concepts.map(c => ({ id: c.id, name: c.name, slug: c.slug })),
                defaultConceptId: project.defaultConceptId,
                activeConceptSlug: conceptSlug,
                // `SiteProvider` reads these off the root and layers the concept's own values on
                // top (gated on `socialSource`/`formValidationSource`) — without `activeConcept`
                // here, that gating always resolves to "no concept override" on the live site.
                activeConcept: concept,
                socialSettings: project.settings?.social,
                formValidation: project.settings?.formValidation,
                isRtl: concept.isRtl,
                language: concept.language,
                localFontsCss: '', // Don't bloat JSON, fonts are in fonts.css
                hasSelfHostedFonts: shouldSelfHost
            };

            // Transform all links in siteData to be absolute (including baseUrl and conceptSlug)
            siteData = transformLinks(siteData, conceptSlug, baseUrl);

            const hasNotFoundPage = siteData.pages.some((page: any) => {
                const pageSlug = (page.slug || '').replace(/^\/+|\/+$/g, '');
                return page.id === '404' || pageSlug === '404-page';
            });

            if (hasNotFoundPage) {
                const mountedSlug = (concept.slug || '').replace(/^\/+|\/+$/g, '');
                if (mountedSlug) {
                    conceptNotFoundRedirectRules.push(`/${mountedSlug}/* /${mountedSlug}/404-page 302`);
                }
                if (isDefault) {
                    defaultNotFoundRedirectRule = `/* /404-page 302`;
                }
            }

            const fileName = isDefault ? 'default.json' : `concept-${concept.slug || concept.id}.json`;
            await fs.writeFile(path.join(STATIC_DATA_DIR, fileName), JSON.stringify(siteData, null, 2));

            manifest.concepts.push({
                id: concept.id,
                slug: concept.slug,
                isDefault,
                dataFile: fileName
            });
        }

        if (hasSelfHostedAny) {
            await fs.writeFile(path.join(PUBLIC_DIR, 'fonts.css'), allFontsCss);
            console.log('📝 Generated public/fonts.css');
        }

        await fs.writeFile(path.join(STATIC_DATA_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
        console.log('✅ Static data prepared.');

        // 4. Run Astro Build
        console.log('🏗️  Running Astro build...');
        execSync('npm run build:static', {
            cwd: SITE_DIR,
            stdio: 'inherit',
            env: {
                ...process.env,
                BUILD_MODE: 'static',
                BASE_URL: process.env.BASE_URL,
                SITE_URL: process.env.SITE_URL
            }
        });

        // 5. Add .nojekyll to dist (for GitHub Pages to include _astro folder)
        const distPath = path.join(SITE_DIR, 'dist');
        await fs.writeFile(path.join(distPath, '.nojekyll'), '');
        console.log('📄 Added .nojekyll to dist folder.');

        const notFoundRedirectRules = [
            ...conceptNotFoundRedirectRules,
            ...(defaultNotFoundRedirectRule ? [defaultNotFoundRedirectRule] : []),
        ];

        if (notFoundRedirectRules.length > 0) {
            const redirects = [
                '# Concept-aware 404 fallbacks for static hosts that support _redirects.',
                ...notFoundRedirectRules,
                '',
            ].join('\n');
            await fs.writeFile(path.join(distPath, '_redirects'), redirects);
            console.log('📄 Generated _redirects for concept-specific 404 fallbacks.');
        }

        console.log(`✨ Build complete! Output is in ${path.relative(PROJECT_ROOT, distPath)}`);

        // 6. Generate robots.txt
        console.log('🤖 Generating robots.txt...');
        const siteUrl = (process.env.SITE_URL || 'https://example.com').replace(/\/$/, "");
        const base = (process.env.BASE_URL || '/').replace(/\/$/, "");
        const fullBaseUrl = [siteUrl, base].filter(Boolean).join('');

        let robotsTxt = `User-agent: *\nAllow: /\n\n`;

        // Point to concept-specific sitemaps
        for (const concept of manifest.concepts) {
            const conceptSlug = (concept.slug || '').replace(/^\/+|\/+$/g, '') || 'default';
            const sitemapUrl = `${fullBaseUrl}/sitemap-${conceptSlug}.xml`;
            robotsTxt += `Sitemap: ${sitemapUrl}\n`;
        }

        // Also keep the default one generated by @astrojs/sitemap if it exists
        robotsTxt += `Sitemap: ${fullBaseUrl}/sitemap-index.xml\n`;

        await fs.writeFile(path.join(distPath, 'robots.txt'), robotsTxt);
        console.log('📄 Generated robots.txt');

    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

build();
