




const SPINNER_DELAY_MS = 180;
const SPINNER_MIN_MS = 320;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------
// TemplateLoader — fetches template files once, caches by id.
// ------------------------------------------------------------
class TemplateLoader {
  static _cache = new Map();
  static _pending = new Map();

  static load(url) {
    if (this._cache.has(url)) return Promise.resolve(this._cache.get(url));
    if (this._pending.has(url)) return this._pending.get(url);

    const promise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`[TemplateLoader] ${res.status} ${url}`);
        return res.text();
      })
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const map = new Map();
        doc.querySelectorAll('template[id]').forEach((tpl) => map.set(tpl.id, tpl));
        this._cache.set(url, map);
        this._pending.delete(url);
        return map;
      })
      .catch((err) => {
        this._pending.delete(url);
        throw err;
      });

    this._pending.set(url, promise);
    return promise;
  }

  static get(url, id) {
    const map = this._cache.get(url);
    if (!map) throw new Error(`[TemplateLoader] Not loaded: ${url}`);
    const tpl = map.get(id);
    if (!tpl) throw new Error(`[TemplateLoader] "${id}" not found in ${url}`);
    return tpl;
  }

  static build(url, id, data = {}) {
    const frag = this.get(url, id).content.cloneNode(true);
    interpolateTree(frag, data);
    return frag;
  }

  static buildEl(url, id, data = {}) {
    return this.build(url, id, data).firstElementChild;
  }
}

// ------------------------------------------------------------
// Interpolation
// ------------------------------------------------------------
function interpolateTree(root, data) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.nodeValue.includes('{{')) node.nodeValue = interpolate(node.nodeValue, data);
    } else {
      for (const attr of Array.from(node.attributes)) {
        if (attr.value.includes('{{')) attr.value = interpolate(attr.value, data);
      }
    }
  }
}

function interpolate(str, data) {
  return str.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const val = getPath(data, path);
    return val == null ? '' : String(val);
  });
}

function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

// ------------------------------------------------------------
// Spinner style — injected into <head> once, on first use.
// ------------------------------------------------------------
let _spinnerStyleInjected = false;

function ensureSpinnerStyle() {
  if (_spinnerStyleInjected || typeof document === 'undefined') return;
  _spinnerStyleInjected = true;

  const style = document.createElement('style');
  style.setAttribute('data-fragment-spinner', '');
  style.textContent = `
    [data-mount].fragment-loading { position: relative; }
    .fragment-spinner {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      pointer-events: none; z-index: 4;
      animation: fragment-spinner-fade 180ms ease-out;
    }
    .fragment-spinner-ring {
      width: 22px; height: 22px; border-radius: 50%;
      border: 2px solid currentColor; border-top-color: transparent;
      opacity: 0.45;
      animation: fragment-spinner-spin 700ms linear infinite;
    }
    @keyframes fragment-spinner-spin { to { transform: rotate(360deg); } }
    @keyframes fragment-spinner-fade { from { opacity: 0; } to { opacity: 1; } }
  `;
  document.head.appendChild(style);
}

// ------------------------------------------------------------
// Fragment
//   Owns: one mount element, one AbortController, one seq token.
//   - Aborting the controller kills every listener registered
//     with its signal (element- or document-level).
//   - The seq token discards stale async renders that resolve
//     after a newer refresh has started.
//   - Anti-flicker spinner: only visible if render exceeds
//     SPINNER_DELAY_MS, and stays up SPINNER_MIN_MS once shown.
// ------------------------------------------------------------
class Fragment {
  constructor({ name, mount, render, onBind }) {
    this.name = name;
    this.mount = mount;
    this.render = render;   // (data, signal) => Promise<Element> | Element
    this.onBind = onBind;   // (el, signal) => void

    this._abort = null;
    this._seq = 0;
    this._content = null;
    this._spinner = null;
    this._spinnerShownAt = 0;
  }

  async refresh(data) {
    const token = ++this._seq;

    // Kill prior listeners for THIS fragment only.
    if (this._abort) this._abort.abort();
    this._abort = new AbortController();
    const signal = this._abort.signal;

    // Only bother showing a spinner if we're actually in the document.
    const inDoc = document.contains(this.mount);
    let spinnerShown = false;
    let spinnerTimer = null;

    if (inDoc) {
      spinnerTimer = setTimeout(() => {
        if (token !== this._seq) return;
        spinnerShown = true;
        this._spinnerShownAt = Date.now();
        this._showSpinner();
      }, SPINNER_DELAY_MS);
    }

    let content;
    try {
      content = await this.render(data, signal);
    } catch (err) {
      if (spinnerTimer) clearTimeout(spinnerTimer);
      if (token === this._seq) this._hideSpinner();
      throw err;
    }

    if (spinnerTimer) clearTimeout(spinnerTimer);
    if (token !== this._seq) return;   // stale — drop.

    if (spinnerShown) {
      const remaining = SPINNER_MIN_MS - (Date.now() - this._spinnerShownAt);
      if (remaining > 0) await sleep(remaining);
      if (token !== this._seq) return; // stale again after the wait.
    }

    this._swap(content);
    this._hideSpinner();

    if (this.onBind) this.onBind(content, signal);
  }

  _showSpinner() {
    ensureSpinnerStyle();
    if (!this._spinner) {
      this._spinner = document.createElement('div');
      this._spinner.className = 'fragment-spinner';
      this._spinner.setAttribute('aria-hidden', 'true');
      const ring = document.createElement('div');
      ring.className = 'fragment-spinner-ring';
      this._spinner.appendChild(ring);
      this.mount.appendChild(this._spinner);
    }
    this.mount.classList.add('fragment-loading');
    this.mount.setAttribute('aria-busy', 'true');
  }

  _hideSpinner() {
    this.mount.classList.remove('fragment-loading');
    this.mount.removeAttribute('aria-busy');
    if (this._spinner) {
      this._spinner.remove();
      this._spinner = null;
    }
  }

  _swap(content) {
    if (this._content) this._content.remove();
    this.mount.appendChild(content);
    this._content = content;
  }

  destroy() {
    if (this._abort) this._abort.abort();
    this._abort = null;
    if (this._content) {
      this._content.remove();
      this._content = null;
    }
    this._hideSpinner();
  }
}


window.TemplateLoader = TemplateLoader;
window.Fragment = Fragment;
window.sleep = sleep;
