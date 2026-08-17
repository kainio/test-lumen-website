
import React, { Suspense, lazy } from 'react';
// The package's main entry no longer eagerly registers every section renderer (so the
// builder's client bundle can code-split by family instead) — this SSR path renders
// synchronously and can't await a lazy import mid-render, so it opts back into eager
// registration explicitly.
import '@lumegem/lumegem-components/eager-registries';
import { SectionRenderer, CartProvider, CatalogProvider, CartDrawer, SiteProvider, resolveInternalUrl, registerBuiltInComponents, SiteMasks, buildStyleGuideCustomTheme } from '@lumegem/lumegem-components';
import type { AstryxThemeName, Page, SiteSection, SectionType, SitemapPage, ProductCategory } from '@lumegem/shared';
import { componentRegistry, loadStyleGuideFonts, resolveActiveThemeName } from '@lumegem/shared';
import { customComponents } from '@lumegem/custom-components';
import { Theme } from '@astryxdesign/core';
import type { ThemeMode } from '@astryxdesign/core/theme';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { butterTheme } from '@astryxdesign/theme-butter/built';
import { chocolateTheme } from '@astryxdesign/theme-chocolate/built';
import { gothicTheme } from '@astryxdesign/theme-gothic/built';
import { matchaTheme } from '@astryxdesign/theme-matcha/built';
import { stoneTheme } from '@astryxdesign/theme-stone/built';
import { y2kTheme } from '@astryxdesign/theme-y2k/built';

const builtThemes: Record<AstryxThemeName, any> = {
    neutral: neutralTheme,
    butter: butterTheme,
    chocolate: chocolateTheme,
    gothic: gothicTheme,
    matcha: matchaTheme,
    stone: stoneTheme,
    y2k: y2kTheme
};

// Props structure matches what we expect from Astro or Preview
interface SiteWrapperProps {
    page: any; // Using any for simplicity with JSON data structure, ideally strict types
    site: any;
    baseUrl?: string;
    children?: React.ReactNode;
    initialMode?: 'light' | 'dark' | 'system' | null;
}

// Lazily import development listeners only in non-production, non-static builds
const PreviewListeners = (!import.meta.env.PROD && import.meta.env.PUBLIC_BUILD_MODE !== 'static')
    ? lazy(() => import('./PreviewListeners').then(mod => ({ default: mod.PreviewListeners })))
    : () => null;

export const SiteWrapper: React.FC<SiteWrapperProps> = ({ page: initialPage, site: initialSite, baseUrl, children, initialMode }) => {
    const [site, setSite] = React.useState(initialSite);
    const [page, setPage] = React.useState(initialPage);
    const [overrideLayoutId, setOverrideLayoutId] = React.useState<string | undefined>(undefined);
    const [previewThemeMode, setPreviewThemeMode] = React.useState<string | null>(null);
    const [clientUrlMode, setClientUrlMode] = React.useState<'light' | 'dark' | 'system' | null>(null);

    const [themeMode, setThemeMode] = React.useState<'light' | 'dark' | 'system'>(() => {
        return (initialMode as 'light' | 'dark' | 'system') || 'system';
    });

    // Hydration-safe client initialization: read URL overrides and stored preferences after mount
    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('theme')) {
            setClientUrlMode('light');
            return;
        }

        const forcedMode = urlParams.get('mode');
        if (forcedMode === 'light' || forcedMode === 'dark' || forcedMode === 'system') {
            setClientUrlMode(forcedMode as 'light' | 'dark' | 'system');
            return;
        }

        const painted = document.documentElement.dataset.theme;
        if (painted === 'light' || painted === 'dark') {
            setThemeMode(painted);
            return;
        }

        const stored = localStorage.getItem('lumegem-theme-mode') as 'light' | 'dark' | 'system';
        if (stored) {
            setThemeMode(stored);
        }
    }, []);

    // Sync themeMode with local storage / custom events
    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleThemeChanged = (e: any) => {
            if (e.detail && e.detail.mode) {
                setThemeMode(e.detail.mode);
            }
        };

        window.addEventListener('lumegem-theme-changed' as any, handleThemeChanged);
        return () => window.removeEventListener('lumegem-theme-changed' as any, handleThemeChanged);
    }, []);

    /**
     * One astryx theme per concept, covering both modes. Legacy data — DaisyUI theme names,
     * separate themeLightName/themeDarkName — coerces to the default.
     */
    const activeThemeName = React.useMemo(
        () => resolveActiveThemeName(site?.styleGuide),
        [site]
    );

    /**
     * A theme uploaded to the concept is stored as its `defineTheme()` input rather than as
     * an installed package, so it is built from that input. `<Theme>` then generates and
     * injects its CSS, the same path astryx takes for any unbuilt theme — which is also what
     * makes the builder's live theme swaps work, since those arrive by postMessage after the
     * server already rendered a different theme's stylesheet.
     */
    const activeThemeObject = React.useMemo(
        () =>
            buildStyleGuideCustomTheme(site?.styleGuide) ??
            builtThemes[activeThemeName as AstryxThemeName] ??
            builtThemes.neutral,
        [site?.styleGuide, activeThemeName]
    );

    /**
     * The mode handed to astryx. `system` is passed straight through — astryx leaves
     * `data-theme` off and lets `color-scheme: light dark` follow the OS, so there is no
     * need to resolve the media query ourselves.
     */
    const resolvedMode = (previewThemeMode || clientUrlMode || themeMode) as ThemeMode;

    // Initialize Registry on mount for the site application
    React.useEffect(() => {
        registerBuiltInComponents();
        // Register local custom components
        customComponents.install(componentRegistry);
    }, []);

    /**
     * Direction only. Light/dark is astryx's job: the root <Theme mode> below syncs
     * `data-theme` onto <html>, and reset.css maps that to `color-scheme` so every
     * light-dark() token flips. No `.dark` class, no injected font/radius overrides —
     * those used to land as !important rules on body, h1-h6, .prose, .leading-* and
     * .rounded-*, overriding the very theme they were previewing.
     */
    React.useLayoutEffect(() => {
        if (site?.isRtl) {
            document.documentElement.setAttribute('dir', 'rtl');
        } else {
            document.documentElement.removeAttribute('dir');
        }
    }, [site?.isRtl]);

    // Astryx themes name their font families but ship no @font-face, so fetch them.
    React.useEffect(() => {
        if ((site as any)?.localFontsCss || (site as any)?.hasSelfHostedFonts) return;
        loadStyleGuideFonts(site?.styleGuide);
    }, [site?.styleGuide, (site as any)?.localFontsCss, (site as any)?.hasSelfHostedFonts]);

    // SEO Meta Tags Update
    React.useEffect(() => {
        const pageSeo = page?.seo || {};
        const siteTitle = site?.title || "LumeGem";
        const pageName = page?.name || "Page";

        // Update Title
        document.title = (pageSeo.title || pageName) + " - " + siteTitle;

        // Update Meta Tags helper
        const updateMeta = (name: string, content: string | undefined) => {
            let element = document.querySelector(`meta[name="${name}"]`);
            if (content) {
                if (!element) {
                    element = document.createElement('meta');
                    element.setAttribute('name', name);
                    document.head.appendChild(element);
                }
                element.setAttribute('content', content);
            } else if (element) {
                element.remove();
            }
        };

        const updateOgMeta = (property: string, content: string | undefined) => {
            let element = document.querySelector(`meta[property="${property}"]`);
            if (content) {
                if (!element) {
                    element = document.createElement('meta');
                    element.setAttribute('property', property);
                    document.head.appendChild(element);
                }
                element.setAttribute('content', content);
            } else if (element) {
                element.remove();
            }
        };

        updateMeta('description', pageSeo.description);
        updateOgMeta('og:description', pageSeo.description);
        updateMeta('keywords', pageSeo.keywords);
        updateOgMeta('og:title', pageSeo.title || pageName);
        updateOgMeta('og:image', pageSeo.ogImage);
    }, [page, site?.title]);

    // Live refresh and preview listeners are now handled by PreviewListeners component
    // which is only loaded and rendered in development mode.

    const targetLayoutId = overrideLayoutId || page.layoutId;
    const layout = site.layouts?.find((l: any) => l.id === targetLayoutId) || site.layouts?.[0];

    // API returns sections directly on the page object.
    // PostMessage updates might send pageConfigs.
    // We prefer the direct sections if available and non-empty, otherwise check pageConfigs.
    const pageSections = page.sections && page.sections.length > 0
        ? page.sections
        : (site.pageConfigs?.[page.id]?.sections || []);

    const renderSections = () => {
        const content = children ? <>{children}</> : pageSections.map((s: any) => <SectionRenderer key={s.id} section={s} />);

        if (!layout) return content;

        const layoutSections: any[] = layout.sections || [];

        /*
         * A layout only positions the page's own content where its `layout_content` marker
         * sits. If the resolved layout has no such marker — it is empty, or we fell back to
         * `layouts[0]` because `page.layoutId` matched nothing — then mapping its sections
         * would render the page with its content silently dropped. Render the content
         * instead; a mismatched or empty layout must not black-hole the page.
         */
        const hasContentSlot = layoutSections.some((s: any) => s.type === 'layout_content');
        if (!hasContentSlot) {
            if (layoutSections.length === 0) return content;
            return (
                <>
                    {layoutSections.map((section: any) => (
                        <SectionRenderer key={section.id} section={section} />
                    ))}
                    {content}
                </>
            );
        }

        return layoutSections.map((section: any) => {
            if (section.type === 'layout_content') {
                return (
                    <React.Fragment key={section.id}>
                        {content}
                    </React.Fragment>
                );
            }
            return <SectionRenderer key={section.id} section={section} />;
        });
    };

    const effectiveEcommerce = React.useMemo(() => {
        if (!site) return null;
        const concept = site.activeConcept;
        if (!concept) return site.settings?.ecommerce;

        const source = concept.ecommerceSource?.type || 'own';
        if (source === 'project') {
            return site.settings?.ecommerce || concept.ecommerce;
        }
        return concept.ecommerce || site.settings?.ecommerce;
    }, [site]);

    return (
        <Suspense fallback={<div>Loading...</div>}>
            {(!import.meta.env.PROD && import.meta.env.PUBLIC_BUILD_MODE !== 'static') && (
                <PreviewListeners
                    site={site}
                    setSite={setSite}
                    page={page}
                    setPage={setPage}
                    setOverrideLayoutId={setOverrideLayoutId}
                    setPreviewThemeMode={setPreviewThemeMode}
                />
            )}

            <Theme theme={activeThemeObject} mode={resolvedMode}>
                <SiteProvider siteData={site} baseUrl={baseUrl} currentPageSlug={page.slug}>
                    <CartProvider
                        currency={effectiveEcommerce?.currency || '$'}
                        currencyPosition={effectiveEcommerce?.currencyPosition || 'left'}
                        checkoutUrl={
                            effectiveEcommerce?.checkoutPageId
                                ? resolveInternalUrl(site.pages?.find((p: any) => p.id === effectiveEcommerce.checkoutPageId)?.slug || '/checkout', site, baseUrl || '/')
                                : resolveInternalUrl('/checkout', site, baseUrl || '/')
                        }
                        whatsappNumber={effectiveEcommerce?.whatsappNumber}
                        labels={effectiveEcommerce?.labels}
                        language={site?.language}
                    >
                        <CatalogProvider
                            products={(effectiveEcommerce?.products || []).map((p: any) => {
                                const categoryId = p.categoryId || (effectiveEcommerce?.categories || []).find((c: any) => c.name === p.category)?.id;
                                let url = p.url;
                                if (p.pageId) {
                                    const page = site.pages?.find((pg: any) => pg.id === p.pageId);
                                    if (page) {
                                        url = resolveInternalUrl(page.slug, site, baseUrl || '/');
                                    }
                                }
                                return {
                                    ...p,
                                    categoryId,
                                    url
                                };
                            })}
                            currency={effectiveEcommerce?.currency || '$'}
                            currencyPosition={effectiveEcommerce?.currencyPosition || 'left'}
                            displayRatingScore={effectiveEcommerce?.displayRatingScore ?? true}
                            displayRatingCount={effectiveEcommerce?.displayRatingCount ?? true}
                            categories={effectiveEcommerce?.categories?.map((c: ProductCategory) => {
                                if (c.pageId) {
                                    const page = site.pages?.find((p: any) => p.id === c.pageId);
                                    if (page) {
                                        return { ...c, url: resolveInternalUrl(page.slug, site, baseUrl || '/') };
                                    }
                                }
                                return c;
                            }) || []}
                        >
                            <Layout
                                height="auto"
                                data-astryx-theme={activeThemeName}
                                content={
                                    <LayoutContent>
                                        {renderSections()}
                                        <CartDrawer />
                                        <SiteMasks sections={pageSections} />
                                    </LayoutContent>
                                }
                            />
                        </CatalogProvider>
                    </CartProvider>
                </SiteProvider>
            </Theme>
        </Suspense>
    );
};
