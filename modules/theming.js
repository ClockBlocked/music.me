



(function bootstrapUserThemeAndAccent() {
  const FALLBACK_THEME = 'dark';
  const FALLBACK_ACCENT = 'coral';
  const VALID_THEMES = new Set(['dark', 'onedark', 'mocha', 'tokoyonight', 'moon', 'light', 'bloom']);

  function safeReadLocalStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeWriteLocalStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_) {}
  }

  function normalizeTheme(value) {
    return VALID_THEMES.has(value) ? value : FALLBACK_THEME;
  }

  function resolveStoredTheme() {
    const direct = safeReadLocalStorage('theme');
    if (direct) return normalizeTheme(direct);

    const prefsRaw = safeReadLocalStorage('prefs');
    if (prefsRaw) {
      try {
        const parsed = JSON.parse(prefsRaw);
        if (parsed && typeof parsed === 'object' && typeof parsed.theme === 'string') {
          return normalizeTheme(parsed.theme);
        }
      } catch (_) {}
    }

    return FALLBACK_THEME;
  }

  function resolveStoredAccent() {
    const direct = safeReadLocalStorage('accent');
    if (direct) return direct;

    const prefsRaw = safeReadLocalStorage('prefs');
    if (prefsRaw) {
      try {
        const parsed = JSON.parse(prefsRaw);
        if (parsed && typeof parsed === 'object' && typeof parsed.accent === 'string') {
          return parsed.accent;
        }
      } catch (_) {}
    }

    return FALLBACK_ACCENT;
  }

  const theme = resolveStoredTheme();
  const accent = resolveStoredAccent();

  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-accent', accent);

  safeWriteLocalStorage('theme', theme);
  safeWriteLocalStorage('accent', accent);

  if (!window.Prefs) window.Prefs = {};

  if (typeof window.Prefs.get !== 'function') {
    window.Prefs.get = function getPref(key) {
      const direct = safeReadLocalStorage(key);
      if (direct !== null) {
        if (direct === 'true') return true;
        if (direct === 'false') return false;
        return direct;
      }

      const prefsRaw = safeReadLocalStorage('prefs');
      if (!prefsRaw) return null;

      try {
        const parsed = JSON.parse(prefsRaw);
        if (!parsed || typeof parsed !== 'object') return null;
        return Object.prototype.hasOwnProperty.call(parsed, key) ? parsed[key] : null;
      } catch (_) {
        return null;
      }
    };
  }

  if (typeof window.Prefs.set !== 'function') {
    window.Prefs.set = function setPref(key, value) {
      const normalizedValue = typeof value === 'boolean' ? String(value) : value;
      safeWriteLocalStorage(key, normalizedValue);

      const prefsRaw = safeReadLocalStorage('prefs');
      let nextPrefs = {};
      if (prefsRaw) {
        try {
          const parsed = JSON.parse(prefsRaw);
          if (parsed && typeof parsed === 'object') nextPrefs = parsed;
        } catch (_) {}
      }

      nextPrefs[key] = value;
      safeWriteLocalStorage('prefs', JSON.stringify(nextPrefs));
    };
  }

  if (typeof window.Prefs.applyTheme !== 'function') {
    window.Prefs.applyTheme = function applyTheme(themeKey) {
      const nextTheme = normalizeTheme(themeKey);
      document.documentElement.setAttribute('data-theme', nextTheme);
      window.Prefs.set('theme', nextTheme);
    };
  }

  if (typeof window.Prefs.applyAccent !== 'function') {
    window.Prefs.applyAccent = function applyAccent(accentKey) {
      const nextAccent = accentKey || FALLBACK_ACCENT;
      document.documentElement.setAttribute('data-accent', nextAccent);
      window.Prefs.set('accent', nextAccent);
    };
  }

  if (typeof window.Prefs.initTheme !== 'function') {
    window.Prefs.initTheme = function initTheme() {
      const savedTheme = window.Prefs.get('theme');
      window.Prefs.applyTheme(savedTheme || FALLBACK_THEME);
    };
  }

  if (typeof window.Prefs.initAccent !== 'function') {
    window.Prefs.initAccent = function initAccent() {
      const savedAccent = window.Prefs.get('accent');
      window.Prefs.applyAccent(savedAccent || FALLBACK_ACCENT);
    };
  }

  if (typeof window.Prefs.init !== 'function') {
    window.Prefs.init = function initPrefs() {
      window.Prefs.initTheme();
      window.Prefs.initAccent();
    };
  }
})();