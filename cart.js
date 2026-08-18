

(function () {
  const CART_KEY = "gvc_cart_v2";
  const SAVED_KEY = "gvc_saved_v1";

  /* ─── Storage that never throws ───────────────────────────
     Private windows can block localStorage. If that happens we
     fall back to memory so the cart still works for the session. */
  let memory = { [CART_KEY]: "[]", [SAVED_KEY]: "[]" };
  let storageWorks = true;
  try {
    localStorage.setItem("gvc_test", "1");
    localStorage.removeItem("gvc_test");
  } catch (e) {
    storageWorks = false;
  }

  function read(key) {
    try {
      const raw = storageWorks ? localStorage.getItem(key) : memory[key];
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function write(key, value) {
    const raw = JSON.stringify(value);
    try {
      if (storageWorks) localStorage.setItem(key, raw);
      else memory[key] = raw;
    } catch (e) {
      memory[key] = raw;
    }
  }

  /* ─── Money ─────────────────────────────────────────────── */
  function money(n) {
    return "₹" + Number(n || 0).toLocaleString("en-IN");
  }

  /* PDFs use the standard Helvetica font, which has no ₹ glyph —
     it would print as a broken box. "Rs." is used there instead. */
  function moneyPlain(n) {
    return "Rs. " + Number(n || 0).toLocaleString("en-IN");
  }

  function product(id) {
    return CATALOG.find((p) => p.id === id) || null;
  }

  /* ─── Cart ──────────────────────────────────────────────── */
  const cart = {
    raw() {
      // Drop anything whose product no longer exists in the catalog
      return read(CART_KEY).filter((line) => product(line.id));
    },

    /* Cart lines joined with product details, ready to render */
    lines() {
      return cart.raw().map((line) => {
        const p = product(line.id);
        return {
          id: p.id,
          name: p.name,
          emoji: p.emoji,
          bg: p.bg,
          tag: p.tag,
          price: p.price,
          qty: line.qty,
          total: p.price * line.qty,
        };
      });
    },

    count() {
      return cart.raw().reduce((sum, l) => sum + l.qty, 0);
    },

    subtotal() {
      return cart.lines().reduce((sum, l) => sum + l.total, 0);
    },

    qtyOf(id) {
      const line = cart.raw().find((l) => l.id === id);
      return line ? line.qty : 0;
    },

    add(id, qty) {
      const step = qty || 1;
      const items = cart.raw();
      const existing = items.find((l) => l.id === id);
      if (existing) existing.qty = Math.min(existing.qty + step, 99);
      else items.push({ id: id, qty: Math.min(step, 99) });
      write(CART_KEY, items);
      announce();
    },

    setQty(id, qty) {
      const next = Math.max(0, Math.min(Number(qty) || 0, 99));
      let items = cart.raw();
      if (next === 0) items = items.filter((l) => l.id !== id);
      else {
        const existing = items.find((l) => l.id === id);
        if (existing) existing.qty = next;
        else items.push({ id: id, qty: next });
      }
      write(CART_KEY, items);
      announce();
    },

    remove(id) {
      write(CART_KEY, cart.raw().filter((l) => l.id !== id));
      announce();
    },

    clear() {
      write(CART_KEY, []);
      announce();
    },
  };

  /* ─── Saved for later (the heart on each card) ───────────── */
  const saved = {
    all() {
      return read(SAVED_KEY).filter((id) => product(id));
    },
    has(id) {
      return saved.all().indexOf(id) !== -1;
    },
    toggle(id) {
      const list = saved.all();
      const at = list.indexOf(id);
      if (at === -1) list.push(id);
      else list.splice(at, 1);
      write(SAVED_KEY, list);
      announce();
      return saved.has(id);
    },
  };

  /* ─── Change broadcast ──────────────────────────────────── */
  function announce() {
    updateBadges();
    document.dispatchEvent(new CustomEvent("cart:change"));
  }

  function updateBadges() {
    const n = cart.count();
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = n;
      el.classList.toggle("is-empty", n === 0);
    });
    document.querySelectorAll("[data-cart-total]").forEach((el) => {
      el.textContent = money(cart.subtotal());
    });
  }

  /* Another tab changed the cart — keep this one in sync */
  window.addEventListener("storage", (e) => {
    if (e.key === CART_KEY || e.key === SAVED_KEY) announce();
  });

  /* ─── Toast ─────────────────────────────────────────────── */
  let toastTimer;
  function toast(message, actionLabel, onAction) {
    let host = document.getElementById("toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "toast-host";
      host.className = "toast-host";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }

    host.innerHTML = "";
    const box = document.createElement("div");
    box.className = "toast";

    const text = document.createElement("span");
    text.className = "toast-text";
    text.textContent = message;
    box.appendChild(text);

    if (actionLabel && onAction) {
      const btn = document.createElement("button");
      btn.className = "toast-action";
      btn.textContent = actionLabel;
      btn.addEventListener("click", () => {
        onAction();
        box.classList.remove("show");
      });
      box.appendChild(btn);
    }

    host.appendChild(box);
    requestAnimationFrame(() => box.classList.add("show"));

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove("show"), 3600);
  }

  /* ─── Public ────────────────────────────────────────────── */
  window.GVC = { cart, saved, money, moneyPlain, product, toast, updateBadges };

  document.addEventListener("DOMContentLoaded", updateBadges);
})();
