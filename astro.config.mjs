import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import partytown from '@astrojs/partytown';
import fs from 'node:fs';
import path from 'node:path';
import EventEmitter from 'node:events';

// Increase listeners limit globally for this process
EventEmitter.defaultMaxListeners = 20;

import stylex from '@stylexjs/unplugin';

// Google Analytics GDPR Compliant configuration settings
const GOOGLE_ANALYTICS = {
    enabled: process.env.PUBLIC_GA_ENABLED !== 'false', // Default true, but toggleable here
    measurementId: process.env.PUBLIC_GA_MEASUREMENT_ID || '', // Measurement ID, e.g. 'G-XXXXXXXXXX'
};

// Plausible Analytics (Cookie-less) configuration settings
const PLAUSIBLE = {
    enabled: process.env.PUBLIC_PLAUSIBLE_ENABLED !== 'false', // Default true, but toggleable here
    domain: process.env.PUBLIC_PLAUSIBLE_DOMAIN || '', // Domain name, e.g. 'example.com'
    src: process.env.PUBLIC_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js', // Tracker script URL
};

const isStatic = process.env.BUILD_MODE === 'static';
const buildTarget = process.env.BUILD_TARGET || (isStatic ? 'static' : 'node');

const getAdapter = () => {
    if (isStatic) return undefined;
    return node({ mode: 'standalone' });
};

export default defineConfig({
    site: process.env.SITE_URL || 'https://example.com',
    base: process.env.BASE_URL || '/',
    devToolbar: {
        enabled: false,
    },
    //trailingSlash: 'always',

    integrations: [
        react(),
        mdx(),
        sitemap({
            filter: (page) => {
                // Determine if this is a static build where we should filter
                if (process.env.BUILD_MODE !== 'static') return true;

                try {
                    // Load manifest to find non-default concept slugs
                    const manifestPath = path.resolve('./src/data/static/manifest.json');

                    if (!fs.existsSync(manifestPath)) return true;

                    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                    const defaultConcept = manifest.concepts.find(c => c.isDefault);
                    const otherConceptSlugs = manifest.concepts
                        .filter(c => !c.isDefault && c.slug)
                        .map(c => c.slug.replace(/^\/+|\/+$/g, ''));

                    const url = new URL(page);
                    // Standardize pathname access across environments
                    const siteUrl = process.env.SITE_URL || 'https://example.com';
                    const base = (process.env.BASE_URL || '/').replace(/\/$/, "");

                    let relativePath = url.pathname;
                    if (base && relativePath.startsWith(base)) {
                        relativePath = relativePath.slice(base.length);
                    }
                    const cleanPath = relativePath.replace(/^\/+|\/+$/g, '');

                    // Exclude any pages that start with a non-default concept slug
                    return !otherConceptSlugs.some(slug => cleanPath === slug || cleanPath.startsWith(slug + '/'));
                } catch (e) {
                    console.warn('Sitemap filter error:', e);
                    return true;
                }
            }
        }),
        (process.env.NODE_ENV === 'production' || process.env.BUILD_MODE === 'static')
            ? partytown({
                config: {
                    forward: ['dataLayer.push', 'gtag'],
                },
            })
            : null,
    ].filter(Boolean),
    adapter: getAdapter(),
    vite: {
        ssr: {
            noExternal: [
                '@astryxdesign/core',
                '@astryxdesign/theme-neutral',
                '@astryxdesign/theme-butter',
                '@astryxdesign/theme-chocolate',
                '@astryxdesign/theme-gothic',
                '@astryxdesign/theme-matcha',
                '@astryxdesign/theme-stone',
                '@astryxdesign/theme-y2k'
            ]
        },
        plugins: [
            tailwindcss(),
            stylex.vite({
                useCSSLayers: true,
                dev: process.env.NODE_ENV === 'development',
                runtimeInjection: false,
            }),
        ],
        define: {
            'GOOGLE_ANALYTICS_CONFIG': JSON.stringify(GOOGLE_ANALYTICS),
            'PLAUSIBLE_CONFIG': JSON.stringify(PLAUSIBLE),
            'import.meta.env.PUBLIC_BUILD_MODE': JSON.stringify(process.env.BUILD_MODE || ''),
        },
        server: {
            watch: {
                ignored: ['**/src/data/**/*.json']
            }
        }
    },
    output: (isStatic || buildTarget === 'static') ? 'static' : 'server',
});

