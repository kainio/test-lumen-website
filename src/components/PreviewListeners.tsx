import React from 'react';

interface PreviewListenersProps {
    site: any;
    setSite: (site: any) => void;
    page: any;
    setPage: (page: any) => void;
    setOverrideLayoutId: (id: string | undefined) => void;
    setPreviewThemeMode: (mode: string | null) => void;
}

export const PreviewListeners: React.FC<PreviewListenersProps> = ({ site, setSite, page, setPage, setOverrideLayoutId, setPreviewThemeMode }) => {
    const siteRef = React.useRef(site);
    const pageRef = React.useRef(page);

    React.useEffect(() => {
        siteRef.current = site;
        pageRef.current = page;
    }, [site, page]);

    // Send PREVIEW_READY message to parent window on mount to clear the loading overlay
    React.useEffect(() => {
        if (window !== window.parent) {
            window.parent.postMessage({ type: 'PREVIEW_READY' }, '*');
        }
    }, []);

    // Handle postMessage updates (Live Preview)
    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Validate origin if needed, e.g. event.origin === 'http://localhost:4321'
            const { type, payload } = event.data;
            if (type === 'UPDATE_SITE_DATA') {
                const { site: newSite, page: newPage, theme: incomingTheme, layoutId } = payload;
                
                // Priority for theme: URL parameter (for persistent modes like wireframe) > incoming payload theme
                const urlParams = new URLSearchParams(window.location.search);
                const forcedTheme = urlParams.get('theme');
                const forcedMode = urlParams.get('mode');
                
                const effectiveMode = forcedMode || incomingTheme || (forcedTheme === 'dark' || forcedTheme === 'light' || forcedTheme === 'system' ? forcedTheme : null);

                if (newSite?.id) {
                    document.documentElement.setAttribute('data-concept-id', newSite.id);
                }

                if (effectiveMode) {
                    setPreviewThemeMode(effectiveMode);
                    try {
                        localStorage.setItem('lumegem-theme-mode', effectiveMode);
                    } catch (e) {}
                }

                // Handle layout override for layouts view mode
                setOverrideLayoutId(layoutId);

                // Only update state if data actually changed to prevent React re-renders of the tree
                if (newSite && JSON.stringify(newSite) !== JSON.stringify(siteRef.current)) {
                    siteRef.current = newSite; // Update ref immediately so next message compares correctly
                    setSite(newSite);
                }

                if (newPage && JSON.stringify(newPage) !== JSON.stringify(pageRef.current)) {
                    pageRef.current = newPage; // Update ref immediately
                    setPage(newPage);
                }
            } else if (type === 'SCROLL_TO_SECTION') {
                const { sectionId } = payload;
                const el = document.getElementById(sectionId);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [setSite, setPage, setOverrideLayoutId, setPreviewThemeMode]);

    // Handle click interception for internal navigation in Preview
    React.useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            // Only intercept if we are inside an iframe
            if (window === window.parent) return;

            const target = (e.target as HTMLElement).closest('a');
            if (!target) return;

            const href = target.getAttribute('href');
            if (!href) return;

            // Check if it's an internal link
            // Ignore hash links (let browser handle scrolling)
            if (href.startsWith('#')) return;

            // Check for external
            if (href.startsWith('http') && !href.startsWith(window.location.origin)) return;
            if (href.startsWith('mailto:') || href.startsWith('tel:')) return;
            if (target.target === '_blank') return; // Allow new tab

            e.preventDefault();

            // Normalize href to remove origin if present
            let path = href;
            if (path.startsWith(window.location.origin)) {
                path = path.substring(window.location.origin.length);
            }

            window.parent.postMessage({
                type: 'LINK_CLICK',
                href: path
            }, '*');
        };

        window.addEventListener('click', handleClick, true);
        return () => window.removeEventListener('click', handleClick, true);
    }, []);

    // WebSocket connection for real-time updates (replaces polling)
    React.useEffect(() => {
        let ws: WebSocket;
        let reconnectTimer: any;
        let reconnectDelay = 3000;

        const connect = () => {
            // Only connect in development mode, never in static builds or production
            if (import.meta.env.PROD || import.meta.env.PUBLIC_BUILD_MODE === 'static') return;
            // console.log('WS: Connecting to data stream...');
            
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const host = window.location.hostname;
            const wsUrl = import.meta.env.PUBLIC_WS_URL || `${protocol}://${host}:4322`;
            
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                // console.log('WS: Connected');
                reconnectDelay = 3000; // Reset delay on successful connection
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'UPDATE_SITE_DATA') {
                        const { payload } = data;
                        const newSite = payload.site;
                        const incomingTheme = payload.theme;
                        
                        // Priority for theme: URL parameter (for persistent modes like wireframe) > incoming payload theme
                        const urlParams = new URLSearchParams(window.location.search);
                        const forcedTheme = urlParams.get('theme');
                        const forcedMode = urlParams.get('mode');
                        
                        const effectiveMode = forcedMode || incomingTheme || (forcedTheme === 'dark' || forcedTheme === 'light' || forcedTheme === 'system' ? forcedTheme : null);

                        if (newSite?.id) {
                            document.documentElement.setAttribute('data-concept-id', newSite.id);
                        }

                        if (effectiveMode) {
                            setPreviewThemeMode(effectiveMode);
                            try {
                                localStorage.setItem('lumegem-theme-mode', effectiveMode);
                            } catch (e) {}
                        }

                        if (newSite && JSON.stringify(newSite) !== JSON.stringify(siteRef.current)) {
                            siteRef.current = newSite; // Update ref immediately
                            setSite(newSite);
                            // Update current page if needed
                            const newPage = newSite.pages?.find((p: any) => p.id === pageRef.current?.id);
                            if (newPage && JSON.stringify(newPage) !== JSON.stringify(pageRef.current)) {
                                pageRef.current = newPage;
                                setPage(newPage);
                            }
                        }
                    }
                } catch (err) {
                    console.error('WS: Message error', err);
                }
            };

            ws.onclose = () => {
                // console.log(`WS: Disconnected, reconnecting in ${reconnectDelay / 1000}s...`);
                reconnectTimer = setTimeout(connect, reconnectDelay);
                // Exponential backoff up to 30 seconds
                reconnectDelay = Math.min(reconnectDelay * 2, 30000);
            };

            ws.onerror = () => {
                // console.error('WS: Connection error');
                ws.close();
            };
        };

        connect();

        return () => {
            if (ws) ws.close();
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
    // Register WS once on mount; siteRef/pageRef keep values fresh without re-runs
    }, [setSite, setPage, setPreviewThemeMode]);

    return null;
};
