'use strict';

/* ============================================================
   Gallery Pro — application logic
   ============================================================ */

const STYLE_ORDER = ['solid', 'regular', 'light', 'thin', 'duotone',
    'sharp-solid', 'sharp-regular', 'sharp-light', 'sharp-thin', 'sharp-duotone-solid', 'brands'];

const STYLE_DISPLAY_PRIORITY = ['solid', 'regular', 'light', 'thin', 'duotone',
    'sharp-solid', 'sharp-regular', 'sharp-light', 'sharp-thin', 'brands'];

const ITEMS_PER_PAGE = 120;

const state = {
    allIcons: [],
    filteredIcons: [],
    view: { type: 'style', value: 'all' },
    searchQuery: '',
    page: 0,
    isLoading: false,
    selectedIcon: null,
    preview: { style: null, size: 48, bg: 'adaptive' },
    favorites: new Set(),
    spriteCache: new Map()
};

const dom = {};

[
    'icon-grid', 'search-input', 'clear-search', 'results-count', 'style-filters',
    'gallery-scroll-container', 'loading-trigger', 'no-results', 'empty-title', 'empty-sub',
    'offcanvas-bottom', 'offcanvas-backdrop', 'offcanvas-close', 'offcanvas-title',
    'offcanvas-unicode', 'offcanvas-id', 'offcanvas-svg', 'svg-code-block', 'copy-svg-btn',
    'style-variations', 'toast', 'toast-text', 'mobile-menu-toggle', 'mobile-menu-close',
    'sidebar', 'sidebar-scrim', 'theme-toggle', 'favorites-filter', 'favorites-count',
    'lib-meta', 'sheet-fav', 'preview-stage', 'size-range', 'size-val', 'bg-seg',
    'dl-svg', 'dl-png'
].forEach(id => { dom[toCamel(id)] = document.getElementById(id); });

function toCamel(id) {
    return id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
}

/* ---------- boot ---------- */

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    loadFavorites();
    renderSkeletons();

    try {
        const response = await fetch('./metadata/icons.json');
        if (!response.ok) throw new Error('Failed to load icons.json');
        const rawData = await response.json();

        state.allIcons = Object.keys(rawData).map(key => ({
            id: key,
            label: rawData[key].label,
            unicode: String(rawData[key].unicode || ''),
            styles: [...rawData[key].styles],
            searchTerms: rawData[key].search ? rawData[key].search.terms : []
        })).sort((a, b) => a.id.localeCompare(b.id));

        buildStyleNav();
        updateLibMeta();
        updateFavoritesCount();
        setupEventListeners();
        setupIntersectionObserver();
        applyFilters();
    } catch (error) {
        console.error(error);
        dom.iconGrid.innerHTML = '';
        showEmpty('Library not found', 'Could not load metadata/icons.json — make sure the metadata and sprites folders sit next to index.html.');
    }
}

function renderSkeletons() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 24; i++) {
        const sk = document.createElement('div');
        sk.className = 'skeleton-card';
        frag.appendChild(sk);
    }
    dom.iconGrid.appendChild(frag);
}

/* ---------- sidebar nav (built from data) ---------- */

function buildStyleNav() {
    const counts = new Map();
    let total = 0;
    state.allIcons.forEach(icon => {
        total++;
        icon.styles.forEach(s => counts.set(s, (counts.get(s) || 0) + 1));
    });

    const present = STYLE_ORDER.filter(s => counts.has(s));
    Object.keys(Object.fromEntries(counts)).forEach(s => {
        if (!present.includes(s)) present.push(s);
    });

    const frag = document.createDocumentFragment();
    frag.appendChild(makeNavItem('all', 'All icons', total, true));
    present.forEach(style => {
        frag.appendChild(makeNavItem(style, style.replace(/-/g, ' '), counts.get(style), false));
    });

    dom.styleFilters.innerHTML = '';
    dom.styleFilters.appendChild(frag);
}

function makeNavItem(value, label, count, isAll) {
    const li = document.createElement('li');
    li.className = 'nav-item' + (isAll ? ' active' : '');
    li.dataset.style = value;
    li.setAttribute('role', 'button');
    li.tabIndex = 0;

    const iconWrap = document.createElement('span');
    iconWrap.className = 'nav-icon';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 448 512');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    const sprite = isAll ? 'solid' : (value === 'brands' ? 'solid' : value);
    const glyph = isAll ? 'grip' : (value === 'brands' ? 'font-awesome' : 'circle');
    use.setAttribute('href', `./sprites/${sprite}.svg#${glyph}`);
    svg.appendChild(use);
    iconWrap.appendChild(svg);

    const text = document.createElement('span');
    text.className = 'nav-text';
    text.textContent = label;
    if (!isAll) text.style.textTransform = 'capitalize';

    const badge = document.createElement('span');
    badge.className = 'nav-count';
    badge.textContent = count.toLocaleString();

    li.append(iconWrap, text, badge);
    return li;
}

function updateLibMeta() {
    dom.libMeta.textContent = `${state.allIcons.length.toLocaleString()} icons · SVG sprites`;
}

/* ---------- filtering + rendering ---------- */

function applyFilters() {
    state.page = 0;
    dom.iconGrid.innerHTML = '';
    dom.galleryScrollContainer.scrollTop = 0;

    const query = state.searchQuery.toLowerCase().trim();

    let pool = state.allIcons;

    if (state.view.type === 'style' && state.view.value !== 'all') {
        pool = pool.filter(icon => icon.styles.includes(state.view.value));
    } else if (state.view.type === 'favorites') {
        pool = pool.filter(icon => state.favorites.has(icon.id));
    }

    if (query) {
        const scored = [];
        for (const icon of pool) {
            const score = scoreIcon(icon, query);
            if (score > 0) scored.push([score, icon]);
        }
        scored.sort((a, b) => b[0] - a[0] || a[1].id.localeCompare(b[1].id));
        pool = scored.map(([, icon]) => icon);
    }

    state.filteredIcons = pool;
    updateResultsCount();

    if (pool.length === 0) {
        if (state.view.type === 'favorites' && !query) {
            showEmpty('No favorites yet', 'Tap the heart on any icon and it will live here.');
        } else {
            showEmpty('No icons found', 'Try a different search term or switch styles.');
        }
        dom.loadingTrigger.classList.remove('active');
    } else {
        dom.noResults.classList.remove('visible');
        renderIconBatch();
    }
}

function scoreIcon(icon, query) {
    if (icon.id === query) return 100;
    if (icon.id.startsWith(query)) return 80;
    if (icon.id.includes(query)) return 60;
    const label = icon.label.toLowerCase();
    if (label.startsWith(query)) return 50;
    if (label.includes(query)) return 40;
    for (const term of icon.searchTerms) {
        const t = term.toLowerCase();
        if (t === query) return 30;
        if (t.startsWith(query)) return 20;
        if (t.includes(query)) return 10;
    }
    return 0;
}

function displayStyle(icon) {
    if (state.view.type === 'style' && state.view.value !== 'all' && icon.styles.includes(state.view.value)) {
        return state.view.value;
    }
    for (const s of STYLE_DISPLAY_PRIORITY) {
        if (icon.styles.includes(s)) return s;
    }
    return icon.styles[0];
}

function renderIconBatch() {
    if (state.isLoading) return;
    state.isLoading = true;

    const start = state.page * ITEMS_PER_PAGE;
    const batch = state.filteredIcons.slice(start, start + ITEMS_PER_PAGE);

    if (batch.length === 0) {
        dom.loadingTrigger.classList.remove('active');
        state.isLoading = false;
        return;
    }

    const frag = document.createDocumentFragment();

    batch.forEach((icon, i) => {
        frag.appendChild(buildCard(icon, i));
    });

    dom.iconGrid.appendChild(frag);

    state.page++;
    state.isLoading = false;

    const done = start + batch.length >= state.filteredIcons.length;
    dom.loadingTrigger.classList.toggle('active', !done);
}

function buildCard(icon, index) {
    const style = displayStyle(icon);

    const card = document.createElement('div');
    card.className = 'icon-card';
    card.dataset.id = icon.id;
    card.setAttribute('role', 'listitem');
    card.tabIndex = 0;
    card.style.setProperty('--i', Math.min(index % 24, 24));
    card.setAttribute('aria-label', icon.label);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('card-icon');
    svg.setAttribute('viewBox', '0 0 512 512');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `./sprites/${style}.svg#${icon.id}`);
    svg.appendChild(use);

    const name = document.createElement('span');
    name.className = 'icon-card-name';
    name.textContent = icon.id;

    const fav = document.createElement('button');
    fav.className = 'card-fav' + (state.favorites.has(icon.id) ? ' is-fav' : '');
    fav.setAttribute('aria-label', 'Toggle favorite');
    fav.innerHTML =
        '<svg class="fav-outline" viewBox="0 0 512 512"><use href="./sprites/regular.svg#heart"></use></svg>' +
        '<svg class="fav-filled" viewBox="0 0 512 512"><use href="./sprites/solid.svg#heart"></use></svg>';
    fav.addEventListener('click', e => {
        e.stopPropagation();
        toggleFavorite(icon.id, fav);
    });

    card.append(fav, svg, name);

    card.addEventListener('click', () => openSheet(icon));
    card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openSheet(icon);
        }
    });

    return card;
}

function updateResultsCount() {
    const n = state.filteredIcons.length;
    dom.resultsCount.textContent = `${n.toLocaleString()} icon${n !== 1 ? 's' : ''}`;
}

function showEmpty(title, sub) {
    dom.emptyTitle.textContent = title;
    dom.emptySub.textContent = sub;
    dom.noResults.classList.add('visible');
}

/* ---------- infinite scroll ---------- */

function setupIntersectionObserver() {
    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && !state.isLoading) renderIconBatch();
    }, { root: dom.galleryScrollContainer, rootMargin: '160px', threshold: 0.1 });

    observer.observe(dom.loadingTrigger);
}

/* ---------- favorites ---------- */

function loadFavorites() {
    try {
        const raw = localStorage.getItem('gp-favs');
        if (raw) state.favorites = new Set(JSON.parse(raw));
    } catch (e) { /* private mode etc. */ }
}

function saveFavorites() {
    try {
        localStorage.setItem('gp-favs', JSON.stringify([...state.favorites]));
    } catch (e) { /* ignore */ }
}

function toggleFavorite(id, sourceEl) {
    const nowFav = !state.favorites.has(id);
    if (nowFav) state.favorites.add(id);
    else state.favorites.delete(id);
    saveFavorites();
    updateFavoritesCount();

    document.querySelectorAll(`.icon-card[data-id="${cssEscape(id)}"] .card-fav`).forEach(el => {
        el.classList.toggle('is-fav', nowFav);
    });

    if (state.selectedIcon && state.selectedIcon.id === id) {
        dom.sheetFav.classList.toggle('is-fav', nowFav);
    }

    if (sourceEl) {
        sourceEl.classList.remove('is-fav');
        void sourceEl.offsetWidth; /* restart pop animation */
        sourceEl.classList.toggle('is-fav', nowFav);
    }

    showToast(nowFav ? 'Added to favorites' : 'Removed from favorites');

    if (state.view.type === 'favorites' && !nowFav) applyFilters();
}

function cssEscape(s) {
    return (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/"/g, '\\"');
}

function updateFavoritesCount() {
    dom.favoritesCount.textContent = state.favorites.size > 0 ? state.favorites.size.toLocaleString() : '';
}

/* ---------- detail sheet ---------- */

function openSheet(icon) {
    state.selectedIcon = icon;
    state.preview.style = displayStyle(icon);

    dom.offcanvasTitle.textContent = icon.label;
    dom.offcanvasId.textContent = icon.id;
    dom.offcanvasUnicode.textContent = icon.unicode ? icon.unicode.padStart(4, '0') : '—';
    dom.sheetFav.classList.toggle('is-fav', state.favorites.has(icon.id));

    renderPreview();
    renderStyleVariations(icon);
    refreshCodeBlock();

    dom.offcanvasBackdrop.classList.add('active');
    dom.offcanvasBottom.classList.add('active');
    document.body.style.overflow = 'hidden';
    dom.offcanvasClose.focus({ preventScroll: true });
}

function closeSheet() {
    dom.offcanvasBackdrop.classList.remove('active');
    dom.offcanvasBottom.classList.remove('active');
    document.body.style.overflow = '';
    state.selectedIcon = null;
}

function renderPreview() {
    const icon = state.selectedIcon;
    if (!icon) return;

    dom.offcanvasSvg.innerHTML = '';
    dom.offcanvasSvg.setAttribute('viewBox', '0 0 512 512');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `./sprites/${state.preview.style}.svg#${icon.id}`);
    dom.offcanvasSvg.appendChild(use);

    dom.previewStage.dataset.bg = state.preview.bg;
    dom.previewStage.style.setProperty('--preview-size', state.preview.size + 'px');
}

function renderStyleVariations(icon) {
    dom.styleVariations.innerHTML = '';

    const styles = [...icon.styles].sort((a, b) => STYLE_ORDER.indexOf(a) - STYLE_ORDER.indexOf(b));

    styles.forEach(style => {
        const btn = document.createElement('button');
        btn.className = 'style-variant-btn' + (style === state.preview.style ? ' active' : '');

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 512 512');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', `./sprites/${style}.svg#${icon.id}`);
        svg.appendChild(use);

        const label = document.createElement('span');
        label.textContent = style.replace(/-/g, ' ');

        btn.append(svg, label);
        btn.addEventListener('click', () => {
            state.preview.style = style;
            dom.styleVariations.querySelectorAll('.style-variant-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderPreview();
            refreshCodeBlock();
        });

        dom.styleVariations.appendChild(btn);
    });
}

/* ---------- sprite extraction (for copy + download) ---------- */

async function getSpriteDoc(style) {
    if (state.spriteCache.has(style)) return state.spriteCache.get(style);
    const res = await fetch(`./sprites/${style}.svg`);
    if (!res.ok) throw new Error(`Missing sprite: ${style}`);
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    state.spriteCache.set(style, doc);
    return doc;
}

async function standaloneSvg(icon, style) {
    const doc = await getSpriteDoc(style);
    const symbol = doc.getElementById(icon.id);
    if (!symbol) throw new Error('Icon not in sprite');
    const viewBox = symbol.getAttribute('viewBox') || '0 0 512 512';
    const inner = symbol.innerHTML
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/ xmlns="[^"]*"/g, '')
        .trim();
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`;
}

async function refreshCodeBlock() {
    const icon = state.selectedIcon;
    if (!icon) return;
    try {
        const svg = await standaloneSvg(icon, state.preview.style);
        dom.svgCodeBlock.textContent = svg;
    } catch (e) {
        dom.svgCodeBlock.textContent =
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n  <use href="./sprites/${state.preview.style}.svg#${icon.id}"></use>\n</svg>`;
    }
}

/* ---------- clipboard ---------- */

function copyText(text, message) {
    const done = () => showToast(message || 'Copied to clipboard');
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done).catch(() => legacyCopy(text, done));
    } else {
        legacyCopy(text, done);
    }
}

function legacyCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { console.error(e); }
    ta.remove();
}

async function handleQuickCopy(kind) {
    const icon = state.selectedIcon;
    if (!icon) return;
    const style = state.preview.style;

    switch (kind) {
        case 'name':
            copyText(icon.id, 'Icon name copied');
            break;
        case 'class':
            copyText(`fa-${style} fa-${icon.id}`, 'CSS class copied');
            break;
        case 'unicode':
            copyText(`\\${icon.unicode.padStart(4, '0')}`, 'Unicode copied');
            break;
        case 'datauri': {
            try {
                const svg = await standaloneSvg(icon, style);
                copyText(`data:image/svg+xml,${encodeURIComponent(svg)}`, 'Data URI copied');
            } catch (e) { showToast('Could not build data URI'); }
            break;
        }
    }
}

/* ---------- downloads ---------- */

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function downloadSvg() {
    const icon = state.selectedIcon;
    if (!icon) return;
    try {
        const svg = await standaloneSvg(icon, state.preview.style);
        downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${icon.id}-${state.preview.style}.svg`);
        showToast('SVG downloaded');
    } catch (e) {
        showToast('Download failed');
    }
}

async function downloadPng() {
    const icon = state.selectedIcon;
    if (!icon) return;
    try {
        const raw = await standaloneSvg(icon, state.preview.style);
        const sized = raw.replace('<svg ', '<svg width="512" height="512" fill="black" ');
        const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            canvas.getContext('2d').drawImage(img, 0, 0, 512, 512);
            URL.revokeObjectURL(url);
            canvas.toBlob(blob => {
                if (blob) {
                    downloadBlob(blob, `${icon.id}-${state.preview.style}.png`);
                    showToast('PNG downloaded');
                } else {
                    showToast('PNG export failed');
                }
            }, 'image/png');
        };
        img.onerror = () => { URL.revokeObjectURL(url); showToast('PNG export failed'); };
        img.src = url;
    } catch (e) {
        showToast('Download failed');
    }
}

/* ---------- toast ---------- */

let toastTimer = null;
function showToast(message) {
    dom.toastText.textContent = message;
    dom.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 2200);
}

/* ---------- theme ---------- */

function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('gp-theme', next); } catch (e) { /* ignore */ }
}

/* ---------- misc helpers ---------- */

function debounce(fn, delay) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), delay);
    };
}

function setView(view, navEl) {
    state.view = view;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (navEl) navEl.classList.add('active');
    applyFilters();
    closeSidebarMobile();
}

function closeSidebarMobile() {
    dom.sidebar.classList.remove('open');
    dom.sidebarScrim.classList.remove('active');
}

function updateRangeFill() {
    const min = Number(dom.sizeRange.min), max = Number(dom.sizeRange.max);
    const pct = ((state.preview.size - min) / (max - min)) * 100;
    dom.sizeRange.style.setProperty('--fill', pct + '%');
}

/* ---------- events ---------- */

function setupEventListeners() {
    dom.searchInput.addEventListener('input', debounce(e => {
        state.searchQuery = e.target.value;
        dom.clearSearch.classList.toggle('visible', state.searchQuery.length > 0);
        applyFilters();
    }, 200));

    dom.clearSearch.addEventListener('click', () => {
        dom.searchInput.value = '';
        state.searchQuery = '';
        dom.clearSearch.classList.remove('visible');
        applyFilters();
        dom.searchInput.focus();
    });

    dom.styleFilters.addEventListener('click', e => {
        const item = e.target.closest('.nav-item');
        if (!item) return;
        setView({ type: 'style', value: item.dataset.style }, item);
    });

    const activateFavorites = () => setView({ type: 'favorites' }, dom.favoritesFilter);
    dom.favoritesFilter.addEventListener('click', activateFavorites);
    dom.favoritesFilter.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activateFavorites(); }
    });

    dom.themeToggle.addEventListener('click', toggleTheme);

    dom.mobileMenuToggle.addEventListener('click', () => {
        dom.sidebar.classList.add('open');
        dom.sidebarScrim.classList.add('active');
    });
    dom.mobileMenuClose.addEventListener('click', closeSidebarMobile);
    dom.sidebarScrim.addEventListener('click', closeSidebarMobile);

    dom.offcanvasClose.addEventListener('click', closeSheet);
    dom.offcanvasBackdrop.addEventListener('click', closeSheet);

    dom.copySvgBtn.addEventListener('click', async () => {
        const icon = state.selectedIcon;
        if (!icon) return;
        try {
            copyText(await standaloneSvg(icon, state.preview.style), 'SVG copied to clipboard');
        } catch (e) {
            copyText(dom.svgCodeBlock.textContent, 'SVG copied to clipboard');
        }
    });

    dom.offcanvasId.addEventListener('click', () => handleQuickCopy('name'));
    dom.offcanvasUnicode.addEventListener('click', () => handleQuickCopy('unicode'));

    document.querySelectorAll('.qc').forEach(btn => {
        btn.addEventListener('click', () => handleQuickCopy(btn.dataset.copy));
    });

    dom.dlSvg.addEventListener('click', downloadSvg);
    dom.dlPng.addEventListener('click', downloadPng);

    dom.sheetFav.addEventListener('click', () => {
        if (state.selectedIcon) toggleFavorite(state.selectedIcon.id, dom.sheetFav);
    });

    dom.sizeRange.addEventListener('input', () => {
        state.preview.size = Number(dom.sizeRange.value);
        dom.sizeVal.textContent = state.preview.size;
        updateRangeFill();
        if (state.selectedIcon) {
            dom.previewStage.style.setProperty('--preview-size', state.preview.size + 'px');
        }
    });
    updateRangeFill();

    dom.bgSeg.addEventListener('click', e => {
        const btn = e.target.closest('button[data-bg]');
        if (!btn) return;
        state.preview.bg = btn.dataset.bg;
        dom.bgSeg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
        dom.previewStage.dataset.bg = state.preview.bg;
    });

    document.addEventListener('keydown', handleGlobalKeys);
}

/* ---------- keyboard ---------- */

function handleGlobalKeys(e) {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;

    if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        dom.searchInput.focus();
        dom.searchInput.select();
        return;
    }

    if (e.key === 'Escape') {
        if (dom.offcanvasBottom.classList.contains('active')) {
            closeSheet();
        } else if (dom.sidebar.classList.contains('open')) {
            closeSidebarMobile();
        } else if (typing && dom.searchInput.value) {
            dom.searchInput.value = '';
            state.searchQuery = '';
            dom.clearSearch.classList.remove('visible');
            applyFilters();
        } else if (typing) {
            dom.searchInput.blur();
        }
        return;
    }

    if (typing) return;

    const gridKeys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
    if (gridKeys.includes(e.key) && document.activeElement &&
        document.activeElement.classList.contains('icon-card')) {
        e.preventDefault();
        moveCardFocus(e.key);
    }
}

function moveCardFocus(key) {
    const cards = [...dom.iconGrid.querySelectorAll('.icon-card')];
    const current = cards.indexOf(document.activeElement);
    if (current === -1) return;

    const cols = Math.max(1, Math.round(
        dom.iconGrid.offsetWidth / (cards[0].offsetWidth + 12)
    ));

    let next = current;
    if (key === 'ArrowRight') next = current + 1;
    if (key === 'ArrowLeft') next = current - 1;
    if (key === 'ArrowDown') next = current + cols;
    if (key === 'ArrowUp') next = current - cols;

    next = Math.max(0, Math.min(cards.length - 1, next));
    cards[next].focus();
}
