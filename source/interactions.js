const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escapeHTML = (text = "") => String(text).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

const clampToViewport = (el, x, y, pad = 12) => {
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x;
  let top = y;
  if (left + w > vw - pad) left = vw - w - pad;
  if (top + h > vh - pad) top = vh - h - pad;
  if (left < pad) left = pad;
  if (top < pad) top = pad;
  return { left, top };
};

const dataAttrs = (data) => {
  if (!data) return "";
  return Object.entries(data)
    .map(([k, v]) => `data-${k}="${escapeHTML(v)}"`)
    .join(" ");
};

const POPUPS_ICONS = (() => {
  const svg = (attrs, content) => `<svg ${attrs}>${content}</svg>`;
  const base = (size) =>
    `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  return Object.freeze({
    close: (size = 16) => svg(base(size), `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`),
    heart: (size = 16, filled = false) =>
      svg(
        `width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`,
        `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>`
      ),
    playlistAdd: (size = 16) => svg(base(size), `<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>`),
    link: (size = 16) => svg(base(size), `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`),
    checkBadge: (size = 16) => svg(base(size), `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`),
    user: (size = 16) => svg(base(size), `<circle cx="12" cy="8" r="4"/><path d="M5.3 18.3C6.8 16.5 9.2 15 12 15s5.2 1.5 6.7 3.3"/>`),
    album: (size = 16) => svg(base(size), `<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/>`),
    play: (size = 16) => svg(`width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"`, `<path d="M6 3L16 10L6 17V3Z"/>`),
    eye: (size = 16) => svg(base(size), `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`),
    undo: (size = 16) => svg(base(size), `<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>`),
    info: (size = 16) => svg(base(size), `<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`),
    success: (size = 16) => svg(base(size), `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`),
    warning: (size = 16) => svg(base(size), `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`),
    error: (size = 16) => svg(base(size), `<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>`),
  });
})();

class PopupsBase {
  constructor(manager, options = {}) {
    this.manager = manager;
    this.options = options;
    this.type = "base";
    this.closable = true;
    this.el = null;
    this.isOpen = false;
    this.destroyed = false;
    this._exitTimer = null;
    this._outsideHandler = null;
  }

  render() {
    return document.createElement("div");
  }

  container() {
    return this.manager.container;
  }

  show() {
    if (this.destroyed || this.isOpen) return;
    const el = this.render();
    if (!el) return;
    this.el = el;
    this.container().appendChild(el);
    this.attachEvents();
    this.isOpen = true;
    this.manager.register(this);
    requestAnimationFrame(() => {
      if (this.el === el && !this.destroyed) el.classList.add("popups-open");
    });
    this.afterShow();
  }

  afterShow() {}

  hide() {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;
    this.runOnClose();
    this.exit();
  }

  exit() {
    if (this.el) this.el.classList.remove("popups-open");
    this._exitTimer = setTimeout(() => this.destroy(), 220);
  }

  runOnClose() {
    const cb = this.options.onClose;
    if (typeof cb !== "function") return;
    try {
      cb(this);
    } catch (err) {
      console.error(err);
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    clearTimeout(this._exitTimer);
    this._exitTimer = null;
    try {
      this.beforeDestroy();
    } catch (err) {
      console.error(err);
    }
    const onDestroy = this.options.onDestroy;
    if (typeof onDestroy === "function") {
      try {
        onDestroy(this);
      } catch (err) {
        console.error(err);
      }
    }
    this.detachEvents();
    this.detachOutsideClick();
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    this.manager.unregister(this);
    this.el = null;
  }

  attachOutsideClick(shouldClose = () => true) {
    const handler = (e) => {
      if (!this.el || this.destroyed) return;
      if (this.el.contains(e.target)) return;
      if (!shouldClose()) return;
      this.hide();
    };
    this._outsideHandler = handler;
    setTimeout(() => {
      if (this._outsideHandler === handler && !this.destroyed) {
        document.addEventListener("click", handler, true);
      }
    }, 0);
  }

  detachOutsideClick() {
    if (!this._outsideHandler) return;
    document.removeEventListener("click", this._outsideHandler, true);
    this._outsideHandler = null;
  }

  findItem(action) {
    const groups = Array.isArray(this.options.groups) ? this.options.groups : [];
    for (const group of groups) {
      if (!Array.isArray(group)) continue;
      for (const item of group) {
        if (String(item.action) === String(action)) return item;
      }
    }
    return null;
  }

  handleAction(action, sourceEl) {
    const item = this.findItem(action);
    const handler = this.options.onAction;
    if (typeof handler === "function") {
      handler(action, item, sourceEl);
    } else if (item && typeof item.onClick === "function") {
      item.onClick(action, item, sourceEl);
    }
    return item;
  }

  isPersistent(action) {
    const list = this.options.persistentActions;
    return Array.isArray(list) && list.includes(action);
  }

  beforeDestroy() {}
  attachEvents() {}
  detachEvents() {}
  reposition() {}
}

class PopupsModal extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "modal";
    this.closable = options.closable !== false;
    this._handled = false;
    this._previousFocus = null;
  }

  render() {
    const overlay = document.createElement("div");
    overlay.className = "popups-overlay";
    overlay.setAttribute("role", "presentation");

    const size = this.options.size || "md";
    const closable = this.closable;
    const actions = Array.isArray(this.options.actions) ? this.options.actions : [];

    const actionButtons = actions
      .map((action, idx) => {
        const name = action.action !== undefined ? action.action : String(idx);
        return `<button class="popups-btn popups-btn-${action.type || "secondary"}" data-action="${escapeHTML(name)}" type="button">${escapeHTML(action.label || "")}</button>`;
      })
      .join("");

    const closeBtn = closable
      ? `<button class="popups-close-btn" data-action="close" aria-label="Close">${POPUPS_ICONS.close(18)}</button>`
      : "";

    const header = this.options.title
      ? `<div class="popups-modal-header"><h3 class="popups-modal-title">${escapeHTML(this.options.title)}</h3>${closeBtn}</div>`
      : closable
        ? `<button class="popups-close-btn popups-close-float" data-action="close" aria-label="Close">${POPUPS_ICONS.close(18)}</button>`
        : "";

    overlay.innerHTML = `
      <div class="popups-modal popups-size-${size} popups-surface" role="dialog" aria-modal="true" tabindex="-1">
        ${header}
        <div class="popups-modal-body"></div>
        ${actionButtons ? `<div class="popups-modal-footer">${actionButtons}</div>` : ""}
      </div>
    `;

    const body = overlay.querySelector(".popups-modal-body");
    const content = this.options.content;
    if (content instanceof HTMLElement) body.appendChild(content);
    else if (content != null) body.innerHTML = String(content);

    return overlay;
  }

  afterShow() {
    this._previousFocus = document.activeElement;
    const modal = this.el && this.el.querySelector(".popups-modal");
    if (!modal) return;
    const focusTarget =
      modal.querySelector("[autofocus]") ||
      modal.querySelector("input, textarea, select, button:not(.popups-close-btn)");
    requestAnimationFrame(() => {
      if (this.destroyed) return;
      if (focusTarget && focusTarget.isConnected) focusTarget.focus();
      else modal.focus();
    });
  }

  attachEvents() {
    this._onItemClick = (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn || !this.el || !this.el.contains(btn)) return;
      e.stopPropagation();
      const action = btn.dataset.action;

      if (action === "close") {
        this.hide();
        return;
      }

      this._handled = true;
      this.handleAction(action, btn);

      if (!this.isPersistent(action)) this.hide();
    };

    this._onBackdropDown = (e) => {
      if (e.target !== this.el) return;
      e.preventDefault();
      this.bounce();
    };

    this.el.addEventListener("mousedown", this._onBackdropDown);
    this.el.addEventListener("click", this._onItemClick);
    this.attachOutsideClick(() => this.closable);
  }

  detachEvents() {
    if (!this.el) return;
    this.el.removeEventListener("mousedown", this._onBackdropDown);
    this.el.removeEventListener("click", this._onItemClick);
    if (this._previousFocus && this._previousFocus.isConnected) {
      try {
        this._previousFocus.focus();
      } catch (err) {
        void err;
      }
    }
    this._previousFocus = null;
  }

  runOnClose() {
    if (this._handled) return;
    super.runOnClose();
  }

  bounce() {
    const inner = this.el && this.el.querySelector(".popups-modal, .popups-dialog");
    if (!inner) return;
    inner.classList.remove("popups-bounce");
    void inner.offsetWidth;
    inner.classList.add("popups-bounce");
    setTimeout(() => inner.classList.remove("popups-bounce"), 300);
  }
}

class PopupsDropdown extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "dropdown";
  }

  render() {
    const el = document.createElement("div");
    el.className = "song menu";
    el.setAttribute("role", "menu");
    el.setAttribute("data-popup", "dropdown");

    const header = this.options.header;
    const groups = Array.isArray(this.options.groups) ? this.options.groups : [];
    const extras = this.options.itemExtraData || (() => "");

    const parts = [];

    if (header) {
      parts.push(
        `<div class="header"><span class="title">${escapeHTML(header.title || "")}</span><span class="subtitle">${escapeHTML(header.subtitle || "")}</span></div><div class="divider"></div>`
      );
    }

    let groupIndex = 0;
    for (const group of groups) {
      if (!Array.isArray(group) || group.length === 0) continue;
      if (groupIndex > 0) parts.push('<div class="divider"></div>');
      groupIndex += 1;
      parts.push('<div class="group" role="group">');
      for (const item of group) {
        const extra = typeof extras === "function" ? extras(item.data) : extras;
        parts.push(
          `<button class="option" role="menuitem" data-action="${escapeHTML(item.action)}" ${item.style ? `style="${escapeHTML(item.style)}"` : ""} ${extra} type="button">${item.iconHTML ? `<span class="icon">${item.iconHTML}</span>` : ""}<span class="label">${escapeHTML(item.label || item.action)}</span></button>`
        );
      }
      parts.push("</div>");
    }

    el.innerHTML = parts.join("");
    return el;
  }

  afterShow() {
    const e = this.options.triggerEvent;
    if (e && typeof e.clientX === "number") this.positionAt(e.clientX, e.clientY);
    else if (this.options.rect) this.positionAt(this.options.rect.left, this.options.rect.bottom + 6);
    else if (typeof this.options.x === "number" && typeof this.options.y === "number") this.positionAt(this.options.x, this.options.y);
  }

  positionAt(x, y) {
    if (!this.el) return;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    requestAnimationFrame(() => {
      if (!this.el || this.destroyed) return;
      const { left, top } = clampToViewport(this.el, x, y, 12);
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
    });
  }

  attachEvents() {
    this._onItemClick = (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn || !this.el.contains(btn)) return;
      e.stopPropagation();
      const action = btn.dataset.action;
      this.handleAction(action, btn);
      if (!this.isPersistent(action)) this.hide();
    };
    this.el.addEventListener("click", this._onItemClick);
    this.attachOutsideClick();
  }

  detachEvents() {
    if (this.el) this.el.removeEventListener("click", this._onItemClick);
  }
}

class PopupsPopover extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "popover";
  }

  render() {
    const el = document.createElement("div");
    const size = this.options.size || "md";
    el.className = `popups-popover popups-popover-${size} popups-surface animate-popoverReveal`;
    el.setAttribute("data-popover", this.options.variant || "generic");
    el.innerHTML = `<div class="popups-popover-inner">${this.options.content || ""}</div>`;
    return el;
  }

  afterShow() {
    const e = this.options.triggerEvent;
    if (e && typeof e.clientX === "number") this.positionAt(e.clientX, e.clientY);
    else if (typeof this.options.x === "number" && typeof this.options.y === "number") this.positionAt(this.options.x, this.options.y);
  }

  positionAt(x, y) {
    if (!this.el) return;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    requestAnimationFrame(() => {
      if (!this.el || this.destroyed) return;
      const { left, top } = clampToViewport(this.el, x, y, 20);
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
    });
  }

  attachEvents() {
    this._onClick = (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn || !this.el.contains(btn)) return;
      e.stopPropagation();
      const action = btn.dataset.action;
      this.handleAction(action, btn);
      if (!this.isPersistent(action)) this.hide();
    };
    this.el.addEventListener("click", this._onClick);
    this.attachOutsideClick();
  }

  detachEvents() {
    if (this.el) this.el.removeEventListener("click", this._onClick);
  }

  exit() {
    if (this.el) this.el.style.animation = "popoverFadeOut 0.2s ease forwards";
    this._exitTimer = setTimeout(() => this.destroy(), 220);
  }
}

class PopupsTooltip extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "tooltip";
    this.target = options.target;
    this.text = options.text || "";
  }

  container() {
    return document.body;
  }

  render() {
    const el = document.createElement("div");
    el.className = "popups-tooltip";
    el.textContent = this.text;
    return el;
  }

  afterShow() {
    this.position();
  }

  position() {
    if (!this.target || !this.el || !this.target.isConnected) return;
    const rect = this.target.getBoundingClientRect();
    const tw = this.el.offsetWidth;
    const th = this.el.offsetHeight;
    const pad = 8;
    let top = rect.top - th - 6;
    let left = rect.left + rect.width / 2 - tw / 2;
    if (top < pad) top = rect.bottom + 6;
    if (left < pad) left = pad;
    if (left + tw > window.innerWidth - pad) left = window.innerWidth - tw - pad;
    this.el.style.top = `${top}px`;
    this.el.style.left = `${left}px`;
  }

  exit() {
    if (this.el) this.el.classList.remove("popups-open");
    this._exitTimer = setTimeout(() => this.destroy(), 160);
  }
}

class PopupsToast extends PopupsBase {
  constructor(manager, options) {
    super(manager, options);
    this.type = "toast";
    this.duration = Number(options.duration) || 5000;
    this.remaining = this.duration;
    this.paused = false;
    this.dragStartX = 0;
    this.dragging = false;
    this.raf = null;
    this.lastTick = 0;
  }

  container() {
    return this.manager.ensureToastContainer();
  }

  render() {
    const type = ["info", "success", "warning", "error"].includes(this.options.type)
      ? this.options.type
      : "info";

    const el = document.createElement("div");
    el.className = `popups-toast popups-toast-${type}`;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");

    const hasUndo = typeof this.options.onUndo === "function";

    el.innerHTML = `
      <div class="popups-toast-progress"><div class="popups-toast-progress-fill"></div></div>
      <button class="popups-toast-close" aria-label="Close">${POPUPS_ICONS.close(14)}</button>
      <div class="popups-toast-icon">${POPUPS_ICONS[type](18)}</div>
      <div class="popups-toast-body">
        ${this.options.title ? `<div class="popups-toast-title">${escapeHTML(this.options.title)}</div>` : ""}
        ${this.options.message ? `<div class="popups-toast-message">${escapeHTML(this.options.message)}</div>` : ""}
      </div>
      ${hasUndo ? `<button class="popups-toast-undo" aria-label="Undo">${POPUPS_ICONS.undo(14)}<span>Undo</span></button>` : ""}
    `;

    this.fill = el.querySelector(".popups-toast-progress-fill");
    return el;
  }

  show() {
    if (this.destroyed || this.isOpen) return;
    const el = this.render();
    const container = this.container();
    container.insertBefore(el, container.firstChild);
    this.el = el;
    this.attachEvents();
    this.isOpen = true;
    this.manager.register(this);
    requestAnimationFrame(() => {
      if (this.el === el && !this.destroyed) el.classList.add("popups-open");
    });
    this.lastTick = performance.now();
    this.tick();
  }

  hide(direction = null) {
    if (!this.isOpen || this.destroyed) return;
    this.isOpen = false;
    cancelAnimationFrame(this.raf);
    this.raf = null;

    if (direction === "left") this.el.classList.add("popups-toast-out-left");
    else if (direction === "right") this.el.classList.add("popups-toast-out-right");
    else this.el.classList.add("popups-toast-fade-out");

    if (typeof this.options.onClose === "function") {
      setTimeout(() => {
        if (this.destroyed) return;
        try {
          this.options.onClose(this);
        } catch (err) {
          console.error(err);
        }
      }, 250);
    }

    setTimeout(() => {
      this.destroy();
    }, 350);
  }

  attachEvents() {
    const closeBtn = this.el.querySelector(".popups-toast-close");
    const undoBtn = this.el.querySelector(".popups-toast-undo");

    this.onCloseClick = () => this.hide();
    if (closeBtn) closeBtn.addEventListener("click", this.onCloseClick);

    if (undoBtn) {
      this.onUndoClick = (e) => {
        e.stopPropagation();
        if (typeof this.options.onUndo === "function") this.options.onUndo(this);
        this.hide();
      };
      undoBtn.addEventListener("click", this.onUndoClick);
    }

    this.onEnter = () => {
      this.paused = true;
    };
    this.onLeave = () => {
      this.paused = false;
      this.lastTick = performance.now();
    };
    this.el.addEventListener("mouseenter", this.onEnter);
    this.el.addEventListener("mouseleave", this.onLeave);

    this.onPointerDown = (e) => {
      if (e.target.closest(".popups-toast-close, .popups-toast-undo")) return;
      this.dragging = true;
      this.dragStartX = e.clientX;
      this.el.classList.add("popups-toast-dragging");
      this.el.style.transition = "none";
      if (e.target.setPointerCapture) {
        try {
          e.target.setPointerCapture(e.pointerId);
        } catch (err) {
          void err;
        }
      }
    };

    this.onPointerMove = (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.dragStartX;
      this.el.style.transform = `translate3d(${dx}px, 0, 0)`;
    };

    this.onPointerUp = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      const dx = e.clientX - this.dragStartX;
      this.el.classList.remove("popups-toast-dragging");
      this.el.style.transition = "";
      this.el.style.transform = "";

      if (dx > 100) this.hide("right");
      else if (dx < -100) this.hide("left");
    };

    this.el.addEventListener("pointerdown", this.onPointerDown);
    this.el.addEventListener("pointermove", this.onPointerMove);
    this.el.addEventListener("pointerup", this.onPointerUp);
    this.el.addEventListener("pointercancel", this.onPointerUp);
  }

  detachEvents() {
    if (!this.el) return;
    const closeBtn = this.el.querySelector(".popups-toast-close");
    const undoBtn = this.el.querySelector(".popups-toast-undo");
    if (closeBtn) closeBtn.removeEventListener("click", this.onCloseClick);
    if (undoBtn) undoBtn.removeEventListener("click", this.onUndoClick);
    this.el.removeEventListener("mouseenter", this.onEnter);
    this.el.removeEventListener("mouseleave", this.onLeave);
    this.el.removeEventListener("pointerdown", this.onPointerDown);
    this.el.removeEventListener("pointermove", this.onPointerMove);
    this.el.removeEventListener("pointerup", this.onPointerUp);
    this.el.removeEventListener("pointercancel", this.onPointerUp);
  }

  tick() {
    if (this.destroyed || !this.isOpen) return;
    const now = performance.now();

    if (!this.paused) {
      const dt = now - this.lastTick;
      this.remaining -= dt;
      const pct = Math.max(0, (this.remaining / this.duration) * 100);
      if (this.fill) this.fill.style.width = `${pct}%`;
      if (this.remaining <= 0) {
        this.hide();
        return;
      }
    }

    this.lastTick = now;
    this.raf = requestAnimationFrame(() => this.tick());
  }
}

class PopupsManager {
  constructor({ ui = null, container = document.body } = {}) {
    this.ui = ui;
    this.container =
      typeof container === "string" ? document.querySelector(container) : container;
    if (!this.container) this.container = document.body;

    this.active = new Set();
    this.stack = [];
    this.destroyed = false;
    this.notificationHistory = [];
    this.tooltipSelector = "[data-tooltip]";
    this._toastContainer = null;

    this.keyHandler = (e) => this.onKeyDown(e);
    this.resizeHandler = () => this.repositionPopups();
    this.tooltipEnterHandler = (e) => this.onTooltipEnter(e);
    this.tooltipLeaveHandler = (e) => this.onTooltipLeave(e);

    document.addEventListener("keydown", this.keyHandler, true);
    window.addEventListener("resize", this.resizeHandler);
    document.addEventListener("mouseover", this.tooltipEnterHandler, true);
    document.addEventListener("mouseout", this.tooltipLeaveHandler, true);

    this.ensureToastContainer();
  }

  static escapeText(text = "") {
    return escapeHTML(text);
  }

  static escapeAttr(text = "") {
    return escapeHTML(text);
  }

  static get icons() {
    return POPUPS_ICONS;
  }

  register(popup) {
    if (this.destroyed) return;
    this.active.add(popup);
    this.stack.push(popup);
  }

  unregister(popup) {
    this.active.delete(popup);
    const idx = this.stack.indexOf(popup);
    if (idx >= 0) this.stack.splice(idx, 1);
  }

  closeType(type, { includeToasts = false } = {}) {
    const snapshot = [...this.stack].reverse();
    for (const popup of snapshot) {
      if (!popup.isOpen) continue;
      if (popup.type !== type) continue;
      if (!includeToasts && popup.type === "toast") continue;
      popup.hide();
    }
  }

  closeAll({ includeToasts = false } = {}) {
    const snapshot = [...this.stack].reverse();
    for (const popup of snapshot) {
      if (!popup.isOpen) continue;
      if (!includeToasts && popup.type === "toast") continue;
      popup.hide();
    }
  }

  cleanup() {
    this.closeAll();
  }

  destroy() {
    if (this.destroyed) return;
    this.closeAll({ includeToasts: true });
    this.destroyed = true;
    document.removeEventListener("keydown", this.keyHandler, true);
    window.removeEventListener("resize", this.resizeHandler);
    document.removeEventListener("mouseover", this.tooltipEnterHandler, true);
    document.removeEventListener("mouseout", this.tooltipLeaveHandler, true);
    if (this._toastContainer && this._toastContainer.parentNode) {
      this._toastContainer.parentNode.removeChild(this._toastContainer);
    }
    this._toastContainer = null;
  }

  onKeyDown(e) {
    if (e.key !== "Escape") return;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const popup = this.stack[i];
      if (!popup.isOpen) continue;
      if (popup.type === "toast") continue;
      if (popup.closable === false) continue;
      e.preventDefault();
      popup.hide();
      break;
    }
  }

  repositionPopups() {
    for (const popup of this.active) {
      if (!popup.isOpen) continue;
      try {
        popup.reposition();
      } catch (err) {
        console.error(err);
      }
    }
  }

  ensureToastContainer() {
    if (this._toastContainer && this._toastContainer.isConnected) return this._toastContainer;

    let el = document.getElementById("popups-toast-container");
    if (!el) {
      el = document.createElement("div");
      el.id = "popups-toast-container";
      el.className = "popups-toast-container";
      document.body.appendChild(el);
    }
    el.addEventListener("mouseenter", () => el.classList.add("popups-stack-expanded"));
    el.addEventListener("mouseleave", () => el.classList.remove("popups-stack-expanded"));

    this._toastContainer = el;
    return el;
  }

  modal(options) {
    const popup = new PopupsModal(this, options);
    popup.show();
    return popup;
  }

  dialog(options) {
    const {
      title = "",
      message = "",
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      dangerous = false,
      onConfirm,
      onCancel,
      size = "sm",
    } = options;

    return this.modal({
      title,
      size,
      closable: false,
      content: `<p class="popups-dialog-message">${escapeHTML(message)}</p>`,
      actions: [
        { label: cancelLabel, action: "cancel", type: "secondary" },
        { label: confirmLabel, action: "confirm", type: dangerous ? "danger" : "primary" },
      ],
      onAction: (action) => {
        if (action === "confirm") {
          if (typeof onConfirm === "function") onConfirm();
        } else if (typeof onCancel === "function") {
          onCancel();
        }
      },
      onClose: () => {
        if (typeof onCancel === "function") onCancel();
      },
    });
  }

  dropdown(options) {
    const popup = new PopupsDropdown(this, options);
    popup.show();
    return popup;
  }

  popover(options) {
    const popup = new PopupsPopover(this, options);
    popup.show();
    return popup;
  }

  tooltip(target, text) {
    const options = target instanceof HTMLElement ? { target, text } : target;
    const popup = new PopupsTooltip(this, options);
    popup.show();
    return popup;
  }

  enableTooltips(selector = "[data-tooltip]") {
    this.tooltipSelector = selector;
  }

  onTooltipEnter(e) {
    const path = e.composedPath ? e.composedPath() : null;
    const root = path && path[0] instanceof Element ? path[0] : e.target;
    if (!(root instanceof Element)) return;
    const target = root.closest(this.tooltipSelector);
    if (!target) return;
    if (target._popupsTooltip) return;

    const related = e.relatedTarget;
    if (related instanceof Node && target.contains(related)) return;

    const text = target.dataset.tooltip;
    if (!text || !text.trim()) return;

    const tip = new PopupsTooltip(this, { target, text });
    target._popupsTooltip = tip;

    target._popupsTooltipTimer = setTimeout(() => {
      target._popupsTooltipTimer = null;
      if (target._popupsTooltip === tip && target.isConnected) tip.show();
    }, 250);
  }

  onTooltipLeave(e) {
    const path = e.composedPath ? e.composedPath() : null;
    const root = path && path[0] instanceof Element ? path[0] : e.target;
    if (!(root instanceof Element)) return;
    const target = root.closest(this.tooltipSelector);
    if (!target) return;

    const related = e.relatedTarget;
    if (related instanceof Node && target.contains(related)) return;

    const tip = target._popupsTooltip;
    if (!tip) return;

    if (target._popupsTooltipTimer) {
      clearTimeout(target._popupsTooltipTimer);
      target._popupsTooltipTimer = null;
    }
    tip.hide();
    target._popupsTooltip = null;
  }

  toast(options) {
    this.notificationHistory.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: options.type || "info",
      title: options.title || "",
      message: options.message || "",
      timestamp: Date.now(),
    });
    if (this.notificationHistory.length > 50) this.notificationHistory.length = 50;

    const popup = new PopupsToast(this, options);
    popup.show();
    return popup;
  }

  showNotificationPanel(anchorEl) {
    if (!anchorEl || !this.notificationHistory.length) return null;

    const pageSize = 8;
    let visibleCount = pageSize;

    const buildList = (notifications) => {
      if (!notifications.length) return `<div class="notifications-empty">No notifications yet</div>`;
      return notifications
        .map((n) => {
          const icon = POPUPS_ICONS[n.type] ? POPUPS_ICONS[n.type](16) : POPUPS_ICONS.info(16);
          return `
            <div class="notification-item notification-${escapeHTML(n.type)}">
              <span class="notification-icon">${icon}</span>
              <div class="notification-content">
                ${n.title ? `<div class="notification-title">${escapeHTML(n.title)}</div>` : ""}
                <div class="notification-message">${escapeHTML(n.message)}</div>
              </div>
              <div class="notification-time">${new Date(n.timestamp).toLocaleTimeString()}</div>
            </div>
          `;
        })
        .join("");
    };

    const renderContent = (notifications, showMore) => `
      <div class="notifications-popover-wrapper">
        <div class="notifications-header"><h3>Notifications</h3></div>
        <div class="notifications-list">${buildList(notifications)}</div>
        ${showMore ? `<div class="notifications-load-more"><button class="load-more-btn" data-action="load-more">Load earlier</button><div class="load-more-spinner" style="display:none;"><span class="spinner"></span>Loading…</div></div>` : ""}
      </div>
    `;

    const initialSlice = this.notificationHistory.slice(0, pageSize);
    const hasMore = this.notificationHistory.length > pageSize;

    let loadTimer = null;

    const popover = this.popover({
      content: renderContent(initialSlice, hasMore),
      persistentActions: ["load-more"],
      onClose: () => {
        if (loadTimer) {
          clearTimeout(loadTimer);
          loadTimer = null;
        }
      },
      onAction: (action) => {
        if (action !== "load-more") return;
        const el = popover.el;
        if (!el) return;

        const loadMoreBtn = el.querySelector(".load-more-btn");
        const spinner = el.querySelector(".load-more-spinner");
        if (!loadMoreBtn || !spinner) return;

        loadMoreBtn.style.display = "none";
        spinner.style.display = "flex";

        loadTimer = setTimeout(() => {
          loadTimer = null;
          if (popover.destroyed || !popover.el) return;

          visibleCount += pageSize;
          const slice = this.notificationHistory.slice(0, visibleCount);
          const stillHasMore = this.notificationHistory.length > visibleCount;

          const listEl = popover.el.querySelector(".notifications-list");
          if (listEl) listEl.innerHTML = buildList(slice);

          const section = popover.el.querySelector(".notifications-load-more");
          if (section) {
            if (stillHasMore) {
              section.innerHTML = `<button class="load-more-btn" data-action="load-more">Load earlier</button><div class="load-more-spinner" style="display:none;"><span class="spinner"></span>Loading…</div>`;
            } else {
              section.remove();
            }
          }
        }, 1500);
      },
    });

    const rect = anchorEl.getBoundingClientRect();
    const offsetLeft = 7 * parseFloat(getComputedStyle(document.documentElement).fontSize || "16");
    let left = rect.left + rect.width / 2 - offsetLeft;

    const popoverWidth = popover.el ? popover.el.offsetWidth : 0;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - 12 - popoverWidth;
    }
    if (left < 12) left = 12;

    if (popover.el) {
      popover.el.style.left = `${left}px`;
      popover.el.style.top = `${rect.bottom + 8}px`;
    }

    return popover;
  }

  showSongMenu(songId, event) {
    const state = this.ui && this.ui.state;
    const song = state && typeof state.getSongById === "function" ? state.getSongById(songId) : null;
    if (!song) return null;

    this.closeType("dropdown");

    const favorites = this.ui && this.ui.favorites;
    const getIsFav = () =>
      Boolean(
        favorites &&
          typeof favorites.isSong === "function" &&
          favorites.isSong(songId)
      );

    const isCached =
      window.offlineCache &&
      typeof window.offlineCache.isCached === "function" &&
      window.offlineCache.isCached(song);

    const isFav = getIsFav();

    const dropdown = this.dropdown({
      triggerEvent: event,
      header: { title: song.title, subtitle: song.artist || "" },
      persistentActions: ["add-fav"],
      groups: [
        [
          {
            action: "add-fav",
            label: isFav ? "Remove from Favorites" : "Add to Favorites",
            iconHTML: POPUPS_ICONS.heart(16, isFav),
            style: isFav ? "color:rgb(var(--colorPink))" : "",
          },
          {
            action: "add-playlist",
            label: "Add to Playlist",
            iconHTML: POPUPS_ICONS.playlistAdd(16),
          },
        ],
        [
          { action: "copy-link", label: "Copy link", iconHTML: POPUPS_ICONS.link(16) },
          {
            action: "offline-toggle",
            label: isCached ? "Remove offline copy" : "Cache for offline",
            iconHTML: POPUPS_ICONS.checkBadge(16),
          },
        ],
        [
          {
            action: "view-artist",
            label: "View Artist",
            iconHTML: POPUPS_ICONS.user(16),
            data: { artistId: song.artistId },
          },
          {
            action: "view-album",
            label: "View Album",
            iconHTML: POPUPS_ICONS.album(16),
            data: { artistId: song.artistId, albumId: song.albumId },
          },
        ],
      ],
      itemExtraData: dataAttrs,
      onAction: (action) => {
        if (action === "add-fav") {
          if (favorites && typeof favorites.toggleSong === "function") favorites.toggleSong(song);
        } else if (action === "add-playlist") {
          if (window.favoritesPlaylists && typeof window.favoritesPlaylists.addToPlaylistModal === "function") {
            window.favoritesPlaylists.addToPlaylistModal(song);
          }
        } else if (action === "view-artist") {
          if (this.ui && typeof this.ui.navigate === "function") this.ui.navigate("artist", song.artistId);
        } else if (action === "view-album") {
          if (this.ui && typeof this.ui.navigate === "function") {
            this.ui.navigate("artist", song.artistId, song.albumId);
          }
        } else if (action === "copy-link") {
          const url = `${window.location.origin}/artist/${song.artistId}/album/${song.albumId}?song=${song.id}`;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard
              .writeText(url)
              .then(() => this.toast({ message: "Link copied to clipboard" }))
              .catch(() => void 0);
          }
        } else if (action === "offline-toggle") {
          if (!window.offlineCache) return;
          const cached = window.offlineCache.isCached && window.offlineCache.isCached(song);
          if (cached) {
            if (window.offlineCache.removeSong) window.offlineCache.removeSong(song);
          } else if (window.offlineCache.cacheSong) {
            window.offlineCache.cacheSong(song);
          }
        }
      },
    });

    const updateFavoriteOption = () => {
      if (!dropdown.el || dropdown.destroyed) return;
      const favoriteButton = dropdown.el.querySelector('[data-action="add-fav"]');
      if (!favoriteButton) return;

      const isFavorite = getIsFav();
      const label = favoriteButton.querySelector(".label");
      const icon = favoriteButton.querySelector(".icon");

      if (label) label.textContent = isFavorite ? "Remove from Favorites" : "Add to Favorites";
      if (icon) icon.innerHTML = POPUPS_ICONS.heart(16, isFavorite);

      favoriteButton.style.color = isFavorite ? "rgb(var(--colorPink))" : "";
      favoriteButton.setAttribute("aria-pressed", String(isFavorite));
    };

    const onFavoritesChanged = (e) => {
      const detail = e.detail || {};
      if (String(detail.type) === "song" && String(detail.id) === String(songId)) {
        updateFavoriteOption();
      }
    };

    window.addEventListener("mybeats:favorites-changed", onFavoritesChanged);

    dropdown.options.onDestroy = () => {
      window.removeEventListener("mybeats:favorites-changed", onFavoritesChanged);
    };

    updateFavoriteOption();
    return dropdown;
  }

  showArtistPopover(artistId, event) {
    const state = this.ui && this.ui.state;
    const artist =
      state && typeof state.getArtistById === "function" ? state.getArtistById(artistId) : null;
    if (!artist) return null;

    const albums = Array.isArray(artist.albums) ? artist.albums.length : 0;
    const listeners = artist.monthlyListeners || "24.5K";
    const topPlays = artist.topSong && artist.topSong.plays ? artist.topSong.plays : "12.3K";

    const content = `
      <div class="popover-gradient-border"></div>
      <div class="popover-content">
        <div class="popover-header">
          <div class="popover-avatar-wrapper">
            <img src="${escapeHTML(artist.imageUrl)}" class="popover-avatar" alt="${escapeHTML(artist.artist)}">
            <div class="popover-avatar-glow"></div>
          </div>
          <div class="popover-title-section">
            <h3 class="popover-artist-name">${escapeHTML(artist.artist)}</h3>
            <span class="popover-genre-badge">${escapeHTML(artist.genre || "Artist")}</span>
          </div>
        </div>
        <div class="popover-stats">
          <div class="popover-stat"><span class="popover-stat-value">${albums}</span><span class="popover-stat-label">Albums</span></div>
          <div class="popover-stat-divider"></div>
          <div class="popover-stat"><span class="popover-stat-value">${escapeHTML(listeners)}</span><span class="popover-stat-label">Listeners</span></div>
          <div class="popover-stat-divider"></div>
          <div class="popover-stat"><span class="popover-stat-value">${escapeHTML(topPlays)}</span><span class="popover-stat-label">Plays</span></div>
        </div>
        <div class="popups-popover-actions">
          <button class="popups-action-btn popups-action-primary" data-action="go-artist">${POPUPS_ICONS.eye(18)}<span>View Profile</span></button>
          <button class="popups-action-btn popups-action-secondary" data-action="play-top">${POPUPS_ICONS.play(18)}<span>Play Top Hit</span></button>
        </div>
        <div class="popover-footer">
          <div class="popover-waveform"><span></span><span></span><span></span><span></span><span></span></div>
          <span class="popover-tip">Click outside to close</span>
        </div>
      </div>
    `;

    return this.popover({
      triggerEvent: event,
      variant: "artist",
      size: "artist",
      content,
      onAction: (action) => {
        if (action === "go-artist") {
          if (this.ui && typeof this.ui.navigate === "function") this.ui.navigate("artist", artistId);
        } else if (action === "play-top") {
          if (artist.albums && artist.albums.length) {
            const queue = Utils.albumQueue(state, artist.id, artist.albums[0].id);
            if (queue && queue.length && this.ui && this.ui.audioPlayer) {
              this.ui.audioPlayer.playSong(queue[0], queue, true, "album");
            }
          }
        }
      },
    });
  }
}

class FavoritesService {
  constructor(state, { onChange } = {}) {
    this.state = state;
    this._onChange = onChange || (() => {});
  }

  _key(type) {
    switch (type) {
      case "song":
        return "favoriteSongs";
      case "artist":
        return "favoriteArtists";
      case "album":
        return "favoriteAlbums";
      case "playlist":
        return "favoritePlaylists";
      default:
        return null;
    }
  }

  _list(type, create = false) {
    const key = this._key(type);
    if (!key) return null;
    if (!Array.isArray(this.state[key])) {
      if (!create) return [];
      this.state[key] = [];
    }
    return this.state[key];
  }

  is(type, id) {
    const list = this._list(type);
    if (!list) return false;
    const sid = String(id);
    return list.some((x) => String(x) === sid);
  }

  toggle(type, id) {
    const list = this._list(type, true);
    if (!list) return false;
    const sid = String(id);
    const idx = list.findIndex((x) => String(x) === sid);
    let added;
    if (idx >= 0) {
      list.splice(idx, 1);
      added = false;
    } else {
      list.push(sid);
      added = true;
    }
    if (typeof this.state.persist === "function") this.state.persist();
    this._onChange(type, sid, added);
    return added;
  }

  set(type, id, value) {
    if (this.is(type, id) === Boolean(value)) return Boolean(value);
    return this.toggle(type, id);
  }
}

class PlaylistsService {
  constructor(state, { onChange } = {}) {
    this.state = state;
    this._onChange = onChange || (() => {});
  }

  all() {
    return Array.isArray(this.state.playlists) ? this.state.playlists : [];
  }

  get(id) {
    const sid = String(id);
    return this.all().find((p) => String(p.id) === sid) || null;
  }

  _commit(event, playlist) {
    if (typeof this.state.persist === "function") this.state.persist();
    this._onChange(event, playlist);
  }

  create({ name, description = "", tags = [] } = {}) {
    const playlist = {
      id: Utils.newId("pl"),
      name: name || "Unnamed Playlist",
      description,
      tags: Array.isArray(tags) ? tags : [],
      songs: [],
    };
    if (!Array.isArray(this.state.playlists)) this.state.playlists = [];
    this.state.playlists.push(playlist);
    this._commit("create", playlist);
    return playlist;
  }

  rename(id, newName) {
    const playlist = this.get(id);
    const trimmed = String(newName || "").trim();
    if (!playlist || !trimmed) return false;
    playlist.name = trimmed;
    this._commit("update", playlist);
    return true;
  }

  updateDesc(id, description) {
    const playlist = this.get(id);
    if (!playlist) return false;
    playlist.description = description;
    this._commit("update", playlist);
    return true;
  }

  updateTags(id, tags) {
    const playlist = this.get(id);
    if (!playlist) return false;
    playlist.tags = Array.isArray(tags) ? tags : [];
    this._commit("update", playlist);
    return true;
  }

  remove(id) {
    const playlist = this.get(id);
    if (!playlist) return null;
    const sid = String(id);
    this.state.playlists = this.all().filter((p) => String(p.id) !== sid);
    this._commit("remove", playlist);
    return playlist;
  }

  reorder(id, newOrder) {
    const playlist = this.get(id);
    if (!playlist || !Array.isArray(newOrder)) return false;
    playlist.songs = newOrder.map((sid) => String(sid));
    this._commit("update", playlist);
    return true;
  }

  addSong(playlistId, songId) {
    const playlist = this.get(playlistId);
    const sid = String(songId);
    if (!playlist || playlist.songs.some((x) => String(x) === sid)) return false;
    playlist.songs.push(sid);
    this._commit("update", playlist);
    return true;
  }

  removeSong(playlistId, songId) {
    const playlist = this.get(playlistId);
    if (!playlist) return false;
    const sid = String(songId);
    const before = [...playlist.songs];
    playlist.songs = playlist.songs.filter((x) => String(x) !== sid);
    this._commit("update", playlist);
    return { before, playlist };
  }
}

class PlaylistsUI {
  constructor({ state, playlists, ui, popups, toast, navigate }) {
    this.state = state;
    this.playlists = playlists;
    this._ui = ui;
    this._popups = popups;
    this._toast = toast;
    this._navigate = navigate;
  }

  coverPreview(playlist, size = 40) {
    const songs = playlist.songs
      .map((sid) => this.state.getSongById(sid))
      .filter(Boolean)
      .slice(0, 4);

    if (!songs.length) {
      return `<div class="popups-cover-empty" style="width:${size}px;height:${size}px">${this.playlistIcon(Math.round(size * 0.5))}</div>`;
    }
    if (songs.length === 1) {
      return `<img src="${escapeHTML(songs[0].coverUrl)}" width="${size}" height="${size}" class="popups-cover-img">`;
    }

    const quarters = Array.from({ length: 4 })
      .map((_, i) =>
        songs[i]
          ? `<img src="${escapeHTML(songs[i].coverUrl)}" class="popups-cover-quarter">`
          : `<div class="popups-cover-quarter popups-cover-quarter-empty"></div>`
      )
      .join("");

    return `<div class="popups-cover-mosaic" style="width:${size}px;height:${size}px">${quarters}</div>`;
  }

  playlistIcon(size = 24) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l10 9-10 9-10-9 10-9z"/></svg>`;
  }

  openModal() {
    const popups = this._popups();
    if (!popups) return null;

    const list = this.playlists.all();

    const content = document.createElement("div");
    content.className = "popups-playlist-list";

    content.innerHTML = list.length
      ? list
          .map(
            (playlist) => `
              <div class="popups-playlist-row" data-action="view" data-id="${escapeHTML(playlist.id)}">
                <div class="popups-playlist-cover">${this.coverPreview(playlist, 40)}</div>
                <div class="popups-playlist-info">
                  <p class="popups-playlist-name">${escapeHTML(playlist.name)}</p>
                  <p class="popups-playlist-meta">${playlist.songs.length} songs</p>
                </div>
                <div class="popups-playlist-actions">
                  <button class="popups-icon-btn" data-action="edit" data-id="${escapeHTML(playlist.id)}" title="Edit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="popups-icon-btn popups-danger" data-action="delete" data-id="${escapeHTML(playlist.id)}" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            `
          )
          .join("")
      : `<p class="popups-empty">No playlists yet.</p>`;

    const modal = popups.modal({
      title: "Your Playlists",
      size: "md",
      content,
      closable: true,
      actions: [{ label: "Create New Playlist", action: "create", type: "primary" }],
      onAction: (action) => {
        if (action === "create") this.createNewPlaylist();
      },
    });

    content.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      e.stopPropagation();

      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === "view") {
        modal.hide();
        const ui = this._ui();
        if (ui) ui.navigate("playlists");
        const playlist = this.playlists.get(id);
        this.state.selectedPlaylistName = playlist ? playlist.name : null;
        if (ui) ui.render();
      } else if (action === "edit") {
        modal.hide();
        this.editPlaylist(id);
      } else if (action === "delete") {
        modal.hide();
        this.confirmDelete(id);
      }
    });

    return modal;
  }

  confirmDelete(id) {
    const popups = this._popups();
    const playlist = this.playlists.get(id);
    if (!popups || !playlist) return;

    popups.dialog({
      title: "Delete Playlist?",
      message: `Are you sure you want to delete "${playlist.name}"? This cannot be undone.`,
      dangerous: true,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: () => {
        const removed = this.playlists.remove(id);
        if (removed) this._toast({ type: "success", message: `Playlist "${removed.name}" deleted` });

        if (this.state.selectedPlaylistName === playlist.name) {
          this.state.selectedPlaylistName = null;
          this.state.selectedPlaylistId = null;
        }
        const ui = this._ui();
        if (ui) ui.render();
      },
    });
  }

  createNewPlaylist() {
    const popups = this._popups();
    if (!popups) return null;

    const wrap = document.createElement("div");
    wrap.className = "popups-form";
    wrap.innerHTML = `
      <div class="popups-field">
        <label for="new-pl-name">Playlist name</label>
        <input type="text" id="new-pl-name" class="popups-input" placeholder="e.g. Late Night Drive" autocomplete="off" maxlength="80">
      </div>
      <div class="popups-field">
        <label for="new-pl-desc">Description <span>(optional)</span></label>
        <textarea id="new-pl-desc" class="popups-textarea" rows="2" placeholder="What's this playlist about?" maxlength="240"></textarea>
      </div>
      <div class="popups-field">
        <label>Tags <span>(optional, press Enter)</span></label>
        <div class="popups-tag-input-wrap"><input type="text" id="new-pl-tags" class="popups-input" placeholder="e.g. Chill, Workout, Focus" maxlength="20"></div>
        <div class="popups-tag-list" id="new-pl-tag-list"></div>
      </div>
    `;

    const tagInput = wrap.querySelector("#new-pl-tags");
    const tagList = wrap.querySelector("#new-pl-tag-list");
    const nameInput = wrap.querySelector("#new-pl-name");
    const tags = [];

    const renderTags = () => {
      tagList.innerHTML = tags
        .map(
          (t) => `
            <span class="popups-tag-chip" data-tag="${escapeHTML(t)}">
              ${escapeHTML(t)}
              <button type="button" class="popups-tag-remove" data-tag="${escapeHTML(t)}">×</button>
            </span>
          `
        )
        .join("");
    };

    tagInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const raw = tagInput.value.trim();
      if (!raw) return;
      const vals = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      vals.forEach((value) => {
        if (!tags.includes(value) && tags.length < 8) tags.push(value);
      });
      tagInput.value = "";
      renderTags();
    });

    tagList.addEventListener("click", (e) => {
      const btn = e.target.closest(".popups-tag-remove");
      if (!btn) return;
      const tag = btn.dataset.tag;
      const i = tags.indexOf(tag);
      if (i >= 0) tags.splice(i, 1);
      renderTags();
    });

    return popups.modal({
      title: "Create Playlist",
      size: "sm",
      content: wrap,
      closable: true,
      actions: [
        { label: "Cancel", action: "cancel", type: "secondary" },
        { label: "Create", action: "create", type: "primary" },
      ],
      onAction: (action, _item, popup) => {
        if (action !== "create") return;
        const name = nameInput.value.trim();
        if (!name) {
          this._toast({ type: "warning", message: "Please enter a playlist name" });
          return;
        }
        const description = wrap.querySelector("#new-pl-desc").value.trim();
        this.playlists.create({ name, description, tags: [...tags] });
        this._toast({ type: "success", message: `Playlist "${name}" created` });
        const ui = this._ui();
        if (ui) ui.render();
        if (popup) popup.hide();
      },
    });
  }

  editPlaylist(id) {
    const ui = this._ui();
    if (!ui) return;
    this.state.editingPlaylistId = id;
    const playlist = this.playlists.get(id);
    this.state.selectedPlaylistName = playlist ? playlist.name : null;
    if (typeof this._navigate === "function") {
      this._navigate("editPlaylist", { id });
    } else {
      ui.navigate("editPlaylist");
    }
  }

  addToPlaylistModal(song) {
    const popups = this._popups();
    if (!popups) return null;

    const list = this.playlists.all();

    if (!list.length) {
      return popups.modal({
        title: "Add to Playlist",
        size: "sm",
        content: `<p class="popups-empty">You don't have any playlists yet.</p>`,
        actions: [{ label: "Create Playlist", action: "create", type: "primary" }],
        onAction: (action) => {
          if (action === "create") this.createNewPlaylist();
        },
      });
    }

    const content = document.createElement("div");
    content.className = "popups-add-to-playlist";

    const songHeader = song
      ? `
        <div class="popups-song-context">
          <img src="${escapeHTML(song.coverUrl || Config.DEFAULT_COVER)}" class="popups-song-context-thumb" alt="">
          <div class="popups-song-context-info">
            <p class="popups-song-context-title">${escapeHTML(song.title)}</p>
            <p class="popups-song-context-sub">${escapeHTML(song.artist || "")}</p>
          </div>
        </div>
      `
      : "";

    const rows = list
      .map((playlist) => {
        const alreadyIn = song && playlist.songs.some((sid) => String(sid) === String(song.id));
        return `
          <button class="popups-playlist-row" data-action="add" data-id="${escapeHTML(playlist.id)}">
            <div class="popups-playlist-cover">${this.coverPreview(playlist, 44)}</div>
            <div class="popups-playlist-info">
              <p class="popups-playlist-name">${escapeHTML(playlist.name)}</p>
              <p class="popups-playlist-meta">${playlist.songs.length} songs</p>
            </div>
            ${alreadyIn ? `<span class="popups-in-list-badge">In playlist</span>` : ""}
          </button>
        `;
      })
      .join("");

    content.innerHTML = songHeader + `<div class="popups-playlist-list">${rows}</div>`;

    const modal = popups.modal({
      title: song ? `Add to Playlist` : "Select Playlist",
      size: "sm",
      content,
      closable: true,
      actions: [{ label: "Create New", action: "create", type: "secondary" }],
      onAction: (action) => {
        if (action === "create") {
          modal.hide();
          this.createNewPlaylist();
        }
      },
    });

    content.addEventListener("click", (e) => {
      const btn = e.target.closest('[data-action="add"]');
      if (!btn) return;
      e.stopPropagation();

      const plId = btn.dataset.id;
      const playlist = this.playlists.get(plId);
      if (!playlist || !song) return;

      if (playlist.songs.some((sid) => String(sid) === String(song.id))) {
        this._toast({
          type: "warning",
          message: `"${song.title}" is already in ${playlist.name}`,
        });
        return;
      }

      const added = this.playlists.addSong(plId, song.id);
      if (added) {
        this._toast({ message: `Added "${song.title}" to ${playlist.name}` });
      }
      modal.hide();
    });

    return modal;
  }
}

class HeartButton {
  constructor(el, type, id, manager) {
    this.el = el;
    this.type = type;
    this.id = String(id);
    this.manager = manager;
    this.isHovering = false;
    this.phase = null;
    this.timer = null;

    this.onEnter = () => {
      this.isHovering = true;
      this.render();
    };

    this.onLeave = () => {
      this.isHovering = false;
      this.render();
    };

    this.onClick = (e) => this.handleClick(e);

    el.addEventListener("mouseenter", this.onEnter);
    el.addEventListener("mouseleave", this.onLeave);
    el.addEventListener("click", this.onClick);
    el.classList.add("heart-bound");

    this.render();
  }

  get liked() {
    return this.manager.favorites.is(this.type, this.id);
  }

  getIcon() {
    if (this.phase === "error" || this.phase === "confirm") {
      return POPUPS_ICONS.heart(20, true);
    }
    if (this.liked) {
      return this.isHovering ? POPUPS_ICONS.heart(20, true) : POPUPS_ICONS.heart(18, true);
    }
    return this.isHovering ? POPUPS_ICONS.heart(20, false) : POPUPS_ICONS.heart(18, false);
  }

  render() {
    if (!this.el.isConnected) {
      this.destroy();
      return;
    }

    this.el.innerHTML = this.getIcon();
    const liked = this.liked;
    this.el.classList.toggle("favorited", liked);
    this.el.classList.toggle("is-favorite", liked);
    this.el.classList.toggle("heart-busy", this.phase !== null);
    this.el.setAttribute("aria-pressed", String(liked));
    this.el.setAttribute("title", liked ? "Remove from favorites" : "Add to favorites");
  }

  handleClick(e) {
    e.stopPropagation();
    e.preventDefault();

    if (this.phase === "confirm" || this.phase === "error") return;

    const wasLiked = this.liked;

    try {
      this.manager.favorites.set(this.type, this.id, !wasLiked);
      if (wasLiked) {
        this.phase = null;
        this.render();
      } else {
        this.phase = "confirm";
        this.render();
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.phase = null;
          this.render();
        }, 3000);
      }
    } catch (err) {
      void err;
      this.phase = "error";
      this.render();
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.phase = null;
        this.render();
      }, 4000);
    }
  }

  sync() {
    if (this.phase === "confirm" || this.phase === "error") return;
    this.render();
  }

  destroy() {
    clearTimeout(this.timer);
    this.timer = null;
    this.el.removeEventListener("mouseenter", this.onEnter);
    this.el.removeEventListener("mouseleave", this.onLeave);
    this.el.removeEventListener("click", this.onClick);
    this.el.classList.remove("heart-bound");
    this.manager.instances.delete(this.el);
  }
}

class HeartButtonManager {
  constructor(favoritesPlaylists, state) {
    this.favorites = favoritesPlaylists;
    this.state = state;
    this.instances = new Map();

    this._onFavoritesChanged = (e) => {
      const { type, id } = e.detail || {};
      if (type && id != null) this.syncEntity(type, String(id));
      else this.syncAll();
    };

    window.addEventListener("mybeats:favorites-changed", this._onFavoritesChanged);

    this.observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) this.bindAll(node);
        }
      }
    });

    const start = () => this.observer.observe(document.body, { childList: true, subtree: true });
    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start, { once: true });
  }

  static describe(el) {
    const d = el.dataset || {};
    if (d.heartType && d.heartId) return { type: d.heartType, id: d.heartId };
    if (d.favSong) return { type: "song", id: d.favSong };
    if (d.artistHeart) return { type: "artist", id: d.artistHeart };
    if (d.heartPlaylist) return { type: "playlist", id: d.heartPlaylist };
    if (d.action === "toggle-favorite-album" && d.albumId) return { type: "album", id: d.albumId };
    return null;
  }

  static get SELECTOR() {
    return [
      "[data-heart-type][data-heart-id]",
      "[data-fav-song]",
      "[data-artist-heart]",
      "[data-heart-playlist]",
      '[data-action="toggle-favorite-album"][data-album-id]',
    ].join(",");
  }

  bindAll(root = document) {
    if (root instanceof HTMLElement && root.matches && root.matches(HeartButtonManager.SELECTOR)) {
      this.bindOne(root);
    }
    if (!root.querySelectorAll) return;
    root.querySelectorAll(HeartButtonManager.SELECTOR).forEach((el) => this.bindOne(el));
  }

  bindOne(el) {
    const info = HeartButtonManager.describe(el);
    if (!info || info.id == null || info.id === "") return;

    const existing = this.instances.get(el);
    if (existing) {
      if (existing.type === info.type && existing.id === String(info.id)) {
        existing.sync();
        return;
      }
      existing.destroy();
    }

    this.instances.set(el, new HeartButton(el, info.type, info.id, this));
  }

  syncEntity(type, id) {
    for (const hb of this.instances.values()) {
      if (hb.type === type && hb.id === id) hb.sync();
    }
  }

  syncAll() {
    for (const hb of this.instances.values()) hb.sync();
  }

  toggle(type, id) {
    return this.favorites.toggle(type, id);
  }

  notify(type, id) {
    window.dispatchEvent(
      new CustomEvent("mybeats:favorites-changed", { detail: { type, id: String(id) } })
    );
  }

  prune() {
    for (const hb of [...this.instances.values()]) {
      if (!hb.el.isConnected) hb.destroy();
    }
  }

  destroy() {
    this.observer.disconnect();
    window.removeEventListener("mybeats:favorites-changed", this._onFavoritesChanged);
    for (const hb of [...this.instances.values()]) hb.destroy();
    this.instances.clear();
  }

  set(type, id, value) {
    return this.favorites.set(type, id, value);
  }
}

class FavoritesPlaylistsManager {
  constructor(state) {
    this.state = state;

    this.favorites = new FavoritesService(state, {
      onChange: (type, id) => this._dispatchChange(type, id),
    });

    this.playlists = new PlaylistsService(state, {
      onChange: () => {},
    });

    this.playlistsUI = new PlaylistsUI({
      state,
      playlists: this.playlists,
      ui: () => this.ui,
      popups: () => this.popups,
      toast: (opts) => this.toast(opts),
      navigate: (page, params) => this.ui && this.ui.navigate(page, params),
    });
  }

  get popups() {
    return window.popups || null;
  }

  get ui() {
    return window.uiManager || null;
  }

  toast(options) {
    const popups = this.popups;
    if (!popups) return;
    popups.toast({
      type: options.type || "info",
      message: options.message,
      duration: 6000,
      onUndo: options.onUndo,
    });
  }

  _dispatchChange(type, id) {
    window.dispatchEvent(
      new CustomEvent("mybeats:favorites-changed", { detail: { type, id: String(id) } })
    );
  }

  _rerender() {
    const ui = this.ui;
    if (ui) ui.render();
  }

  _updatePlayer() {
    const ui = this.ui;
    if (ui && this.state.isDrawerOpen) ui.updateFullPlayer();
  }

  _toggleWithToast(type, id, name, { render = true } = {}) {
    const wasFavorite = this.favorites.is(type, id);
    const added = this.favorites.toggle(type, id);
    const verb = added ? "Added" : "Removed";
    const prep = added ? "to" : "from";
    const noun = type === "song" ? "favorites" : `favorite ${type}s`;

    this.toast({
      message: `${verb} ${name} ${prep} ${noun}`.replace(/\s+/g, " ").trim(),
      onUndo: () => {
        if (this.favorites.is(type, id) !== wasFavorite) {
          this.favorites.toggle(type, id);
          this._rerender();
          this._updatePlayer();
        }
      },
    });

    if (render) this._rerender();
    this._updatePlayer();
    return added;
  }

  isSong(id) {
    return this.favorites.is("song", id);
  }

  toggleSong(song) {
    if (!song) return false;
    return this._toggleWithToast("song", song.id, `"${song.title}"`);
  }

  isArtist(id) {
    return this.favorites.is("artist", id);
  }

  toggleArtist(id) {
    const artist = this.state.getArtistById ? this.state.getArtistById(id) : null;
    const name = artist && artist.artist ? artist.artist : "Artist";
    return this._toggleWithToast("artist", id, name);
  }

  isAlbum(id) {
    return this.favorites.is("album", id);
  }

  toggleAlbum(id) {
    const album = this.state.getAlbumById ? this.state.getAlbumById(id) : null;
    const name = album && album.album ? album.album : "Album";
    return this._toggleWithToast("album", id, name);
  }

  isPlaylist(id) {
    return this.favorites.is("playlist", id);
  }

  togglePlaylist(id) {
    const playlist = this.playlists.get(id);
    const name = playlist ? playlist.name : "Playlist";
    return this._toggleWithToast("playlist", id, name, { render: false });
  }

  getPlaylist(id) {
    return this.playlists.get(id);
  }

  createPlaylist(options) {
    return this.playlists.create(options);
  }

  renamePlaylist(id, name) {
    return this.playlists.rename(id, name);
  }

  updateDesc(id, description) {
    return this.playlists.updateDesc(id, description);
  }

  updateTags(id, tags) {
    return this.playlists.updateTags(id, tags);
  }

  deletePlaylist(id) {
    return this.playlists.remove(id);
  }

  reorderSongs(id, newOrder) {
    return this.playlists.reorder(id, newOrder);
  }

  addSongToPlaylist(playlistId, songId) {
    const added = this.playlists.addSong(playlistId, songId);
    if (!added) return false;

    const playlist = this.playlists.get(playlistId);
    const song = this.state.getSongById(songId);
    if (playlist && song) {
      this.toast({
        message: `Added "${song.title}" to ${playlist.name}`,
        onUndo: () => {
          const res = this.playlists.removeSong(playlistId, songId);
          if (res) this._rerender();
        },
      });
    }
    return true;
  }

  removeSongFromPlaylist(playlistId, songId) {
    const result = this.playlists.removeSong(playlistId, songId);
    if (!result) return false;

    const { before, playlist } = result;
    const song = this.state.getSongById(songId);

    if (song) {
      this.toast({
        message: `Removed "${song.title}" from ${playlist.name}`,
        onUndo: () => {
          this.playlists.reorder(playlistId, before);
          if (
            this.ui?.state?.currentPage === "editPlaylist" &&
            this.ui.state.editingPlaylistId === playlistId
          ) {
            this._rerender();
          }
        },
      });
    }
    return true;
  }

  openModal() {
    return this.playlistsUI.openModal();
  }

  createNewPlaylist() {
    return this.playlistsUI.createNewPlaylist();
  }

  editPlaylist(id) {
    return this.playlistsUI.editPlaylist(id);
  }

  addToPlaylistModal(song) {
    return this.playlistsUI.addToPlaylistModal(song);
  }

  confirmDelete(id) {
    return this.playlistsUI.confirmDelete(id);
  }
}

window.PopupsManager = PopupsManager;
window.PopupsBase = PopupsBase;
window.PopupsModal = PopupsModal;
window.PopupsDropdown = PopupsDropdown;
window.PopupsPopover = PopupsPopover;
window.PopupsTooltip = PopupsTooltip;
window.PopupsToast = PopupsToast;
window.HeartButton = HeartButton;
window.HeartButtonManager = HeartButtonManager;
window.FavoritesPlaylistsManager = FavoritesPlaylistsManager;