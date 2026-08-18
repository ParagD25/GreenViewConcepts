const carouselTimers = {};

const REVIEWS = [
  { name: "Soumya Jainwal", loc: "Indore", text: "Green view concept is one of the best nursery as it provides vast variety of indoor plants as well as outdoor plants,the owner is very responsive and has a vast knowledge of plants and also recommends the best plants for your homes,highly recommend to others.", rating: 5, ago: "4 months ago" },
  { name: "Nitish Paroha", loc: "Indore", text: "Absolutely loved my visit to Green View Concept Nursery. The plants are well-maintained, reasonably priced, and there's a great selection of indoor and outdoor varieties. The staff was knowledgeable and helped me pick the best plants for my home. A must-visit for gardening enthusiasts!", rating: 5, ago: "7 month ago" },
  { name: "Parag Durafe", loc: "Indore", text: "Has the best selection of healthy, vibrant indoor plants! The Owner is super helpful in guiding me to the perfect choices for my space. Highly recommend for anyone looking to brighten up their interiors!", rating: 5, ago: "5 months ago" },
  { name: "Manvi Jain", loc: "Indore", text: "Very beautiful nursery and so many amazing options for indoor plants. The owner is so good they personally suggest you the best option for your home. You can buy a plant to gift and it's a such a good option to replace bouquet. A plant will stay forever with whoever you gift it to.", rating: 5, ago: "2 years ago" },
  { name: "Rishal Gedham", loc: "Rau, Indore", text: "The owner is really sweet, humble and passionate and you can truly see the love and care she puts into it. The staff is incredibly knowledgeable and friendly, offering great advice on how to care for all my new green friends. I left with a basket full of beautiful flowers and plants, and I can't wait to come back for more! Highly recommend this gem for anyone looking to brighten up their garden or home with stunning plants and flowers!", rating: 5, ago: "1 year ago" },
  { name: "Nilesh Dudhe", loc: "Indore", text: "As a new destination for plants lover. A beautiful home of plants. very excellent location, plants varieties, quality, one more and important points rate,They have categories according to plant's usability and cost. Very well maintained, knowledgeable owner and staff which is clear all the question regarding plants, When you visit such a green place, your vibes automatically enhance.", rating: 5, ago: "7 years ago" },
  { name: "Riya Sharma", loc: "Indore", text: "The owner is very humble and personally suggest you the best plant for your space. The selection of plants is incredible, and the staff is so knowledgeable and helpful.", rating: 5, ago: "2 years ago" },
  { name: "Ankit Malani", loc: "Indore", text: "A nice and beautiful nursery, which makes the heart happy after seeing it. Very well maintained knowledgeable staff ; helpful polite ; The nursery has store were all accessories necessary for a good garden is required ! Prices are very reasonable ! Fancy home decor indoor plants are too good ! Good location & parking ! You should visit with family understand about plants nurturing ! I have decorate my new house with 50 to 60 plants and i fully satisfied. Thanks to Green View concept !", rating: 5, ago: "6 years ago" },
];

/* Current gallery state */
const view = { filter: "all", search: "", sort: "featured" };

/* ─── DOM READY ───────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initMobileMenu();
  initScrollAnimations();
  initGalleryControls();
  renderGallery();
  renderReviews(0);
  initSmoothScroll();
  initCartDrawer();
  initQuickView();
  initContactForm();
  initBackToTop();
  document.addEventListener("cart:change", () => {
    syncCardControls();
    renderCartDrawer();
    if (view.filter === "saved") renderGallery();
  });
});

/* ─── NAVBAR SCROLL ───────────────────────────────────────── */
function initNavbar() {
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 60);
  }, { passive: true });
}

/* ─── MOBILE MENU ─────────────────────────────────────────── */
function initMobileMenu() {
  const toggle = document.getElementById("mobile-toggle");
  const menu = document.getElementById("mobile-menu");
  toggle.addEventListener("click", () => {
    toggle.classList.toggle("open");
    menu.classList.toggle("open");
  });
  menu.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      toggle.classList.remove("open");
      menu.classList.remove("open");
    });
  });
}

/* ─── SMOOTH SCROLL ───────────────────────────────────────── */
function initSmoothScroll() {
  document.querySelectorAll("[data-scroll-to]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.getElementById(el.dataset.scrollTo);
      if (target) target.scrollIntoView({ behavior: "smooth" });
    });
  });
}

/* ─── INTERSECTION OBSERVER ───────────────────────────────── */
function initScrollAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".fade-up").forEach(el => obs.observe(el));
}

function reobserveFadeUps(container) {
  requestAnimationFrame(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    container.querySelectorAll(".fade-up").forEach(el => obs.observe(el));
  });
}

/* ─── BACK TO TOP ─────────────────────────────────────────── */
function initBackToTop() {
  const btn = document.getElementById("to-top");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.classList.toggle("show", window.scrollY > 700);
  }, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ═══════════════════════════════════════════════════════════
   GOOGLE DRIVE — Fetch photos from a shared folder
   ═══════════════════════════════════════════════════════════ */

async function fetchDriveImages(folderId) {
  if (!SHOP.googleApiKey || !folderId) return [];

  const url = `https://www.googleapis.com/drive/v3/files?` +
    `q='${folderId}'+in+parents+and+mimeType+contains+'image/'` +
    `&key=${SHOP.googleApiKey}` +
    `&fields=files(id,name,mimeType)` +
    `&pageSize=20` +
    `&orderBy=name`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
    const data = await res.json();
    return (data.files || []).map(file => ({
      id: file.id,
      name: file.name,
      url: `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
    }));
  } catch (err) {
    console.warn(`Failed to load images for folder ${folderId}:`, err.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════
   CAROUSEL
   ═══════════════════════════════════════════════════════════ */

function createCarouselHTML(product, index, images) {
  const hasImages = images && images.length > 0;
  const bgStyle = `background: linear-gradient(135deg, ${product.bg}, ${product.bg}dd)`;

  if (!hasImages) {
    return `
      <div class="carousel" style="${bgStyle}">
        <div class="carousel-slides">
          <div class="carousel-slide active">
            <span class="carousel-emoji">${product.emoji}</span>
          </div>
        </div>
        <div class="plant-card-tag">${product.tag}</div>
      </div>`;
  }

  const slides = images.map((img, i) =>
    `<div class="carousel-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
      <img src="${img.url}" alt="${product.name} - Photo ${i + 1}" loading="lazy">
    </div>`
  ).join("");

  const dots = images.length > 1 ? `
    <div class="carousel-dots">
      ${images.map((_, i) => `<button class="carousel-dot ${i === 0 ? 'active' : ''}" data-slide="${i}" aria-label="Photo ${i + 1}"></button>`).join("")}
    </div>` : "";

  const arrows = images.length > 1 ? `
    <button class="carousel-arrow prev" data-dir="-1" aria-label="Previous photo">‹</button>
    <button class="carousel-arrow next" data-dir="1" aria-label="Next photo">›</button>` : "";

  const count = images.length > 1
    ? `<div class="carousel-count">📷 ${images.length}</div>` : "";

  return `
    <div class="carousel" data-carousel="${index}" data-total="${images.length}" style="${bgStyle}">
      <div class="carousel-slides">${slides}</div>
      <div class="plant-card-tag">${product.tag}</div>
      ${count}${dots}${arrows}
    </div>`;
}

function createLoadingCarousel(product) {
  return `
    <div class="carousel" style="background: linear-gradient(135deg, ${product.bg}, ${product.bg}dd)">
      <div class="carousel-loading">
        <div class="carousel-spinner"></div>
        <div class="carousel-loading-text">Loading photos…</div>
      </div>
      <div class="plant-card-tag">${product.tag}</div>
    </div>`;
}

function initCarousel(cardEl, carouselIndex) {
  const carousel = cardEl.querySelector(`[data-carousel="${carouselIndex}"]`);
  if (!carousel) return;

  const total = parseInt(carousel.dataset.total);
  if (total <= 1) return;

  let current = 0;

  function goToSlide(n) {
    const slides = carousel.querySelectorAll(".carousel-slide");
    const dots = carousel.querySelectorAll(".carousel-dot");
    current = ((n % total) + total) % total;
    slides.forEach((s, i) => s.classList.toggle("active", i === current));
    dots.forEach((d, i) => d.classList.toggle("active", i === current));
  }

  carouselTimers[carouselIndex] = setInterval(() => goToSlide(current + 1), SLIDE_INTERVAL);

  carousel.addEventListener("mouseenter", () => clearInterval(carouselTimers[carouselIndex]));
  carousel.addEventListener("mouseleave", () => {
    carouselTimers[carouselIndex] = setInterval(() => goToSlide(current + 1), SLIDE_INTERVAL);
  });

  carousel.querySelectorAll(".carousel-dot").forEach(dot => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      goToSlide(parseInt(dot.dataset.slide));
    });
  });

  carousel.querySelectorAll(".carousel-arrow").forEach(arrow => {
    arrow.addEventListener("click", (e) => {
      e.stopPropagation();
      goToSlide(current + parseInt(arrow.dataset.dir));
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   GALLERY
   ═══════════════════════════════════════════════════════════ */

function visibleProducts() {
  let list = CATALOG.slice();

  if (view.filter === "saved") list = list.filter(p => GVC.saved.has(p.id));
  else if (view.filter !== "all") list = list.filter(p => p.cats.includes(view.filter));

  const q = view.search.trim().toLowerCase();
  if (q) {
    list = list.filter(p =>
      (p.name + " " + p.desc + " " + p.tag + " " + p.cats.join(" ")).toLowerCase().includes(q)
    );
  }

  if (view.sort === "price-low") list.sort((a, b) => a.price - b.price);
  else if (view.sort === "price-high") list.sort((a, b) => b.price - a.price);
  else if (view.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));

  return list;
}

function cardControlsHTML(product) {
  if (!product.inStock) return `<span class="card-soldout">Sold out</span>`;
  const qty = GVC.cart.qtyOf(product.id);
  if (qty === 0) {
    return `<button class="btn-add" data-add="${product.id}">Add to cart</button>`;
  }
  return `
    <div class="qty-stepper" role="group" aria-label="Quantity for ${product.name}">
      <button class="qty-btn" data-dec="${product.id}" aria-label="Reduce quantity">−</button>
      <span class="qty-value" data-qty="${product.id}">${qty}</span>
      <button class="qty-btn" data-inc="${product.id}" aria-label="Increase quantity">+</button>
    </div>`;
}

async function renderGallery() {
  Object.values(carouselTimers).forEach(clearInterval);

  const grid = document.getElementById("gallery-grid");
  const products = visibleProducts();
  const countEl = document.getElementById("gallery-count");

  if (countEl) {
    countEl.textContent = products.length === 1
      ? "1 item" : `${products.length} items`;
  }

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="gallery-empty">
        <div class="gallery-empty-icon">🌱</div>
        <h3 class="serif">Nothing matches that yet</h3>
        <p>${view.filter === "saved"
          ? "Tap the heart on any plant to save it here for later."
          : "Try a different word, or clear the filters to see everything."}</p>
        <button class="btn-outline btn-sm" id="gallery-reset">Show everything</button>
      </div>`;
    const reset = document.getElementById("gallery-reset");
    if (reset) reset.addEventListener("click", () => {
      view.filter = "all"; view.search = "";
      const search = document.getElementById("gallery-search");
      if (search) search.value = "";
      document.querySelectorAll(".gallery-tag").forEach(b =>
        b.classList.toggle("active", b.dataset.filter === "all"));
      renderGallery();
    });
    return;
  }

  const apiReady = SHOP.googleApiKey && SHOP.googleApiKey.length > 10;

  grid.innerHTML = products.map((product, i) => {
    const showLoader = apiReady && product.folderId;
    const carouselHTML = showLoader
      ? createLoadingCarousel(product)
      : createCarouselHTML(product, i, []);
    const isSaved = GVC.saved.has(product.id);

    return `
      <article class="plant-card fade-up" style="transition-delay:${Math.min(i, 8) * 0.05}s" data-id="${product.id}">
        <button class="card-save ${isSaved ? "saved" : ""}" data-save="${product.id}"
                aria-label="${isSaved ? "Remove from saved" : "Save for later"}"
                title="${isSaved ? "Remove from saved" : "Save for later"}">${isSaved ? "♥" : "♡"}</button>
        <div class="card-media" data-view="${product.id}" role="button" tabindex="0"
             aria-label="See details for ${product.name}">
          ${carouselHTML}
          <span class="card-media-hint">View details</span>
        </div>
        <div class="plant-card-body">
          <h3 class="plant-card-name">${product.name}</h3>
          <p class="plant-card-desc">${product.desc}</p>
          <div class="plant-card-footer">
            <span class="plant-card-price">${GVC.money(product.price)}</span>
            <div class="card-actions" data-actions="${product.id}">${cardControlsHTML(product)}</div>
          </div>
        </div>
      </article>`;
  }).join("");

  reobserveFadeUps(grid);

  if (apiReady) {
    const cards = grid.querySelectorAll(".plant-card");
    await Promise.allSettled(products.map(async (product, i) => {
      if (!product.folderId) return;
      const images = await fetchDriveImages(product.folderId);
      const card = cards[i];
      if (!card || images.length === 0) return;
      const oldCarousel = card.querySelector(".carousel");
      const temp = document.createElement("div");
      temp.innerHTML = createCarouselHTML(product, i, images);
      oldCarousel.replaceWith(temp.firstElementChild);
      initCarousel(card, i);
    }));
  }
}

/* Update only the buttons — never re-render the grid on a cart change,
   that would restart every photo slideshow mid-slide. */
function syncCardControls() {
  document.querySelectorAll("[data-actions]").forEach(box => {
    const product = GVC.product(box.dataset.actions);
    if (product) box.innerHTML = cardControlsHTML(product);
  });
  const modal = document.getElementById("quick-view");
  if (modal && modal.classList.contains("open")) {
    const box = modal.querySelector("[data-actions]");
    const product = box && GVC.product(box.dataset.actions);
    if (product) box.innerHTML = cardControlsHTML(product);
  }
}

function initGalleryControls() {
  document.querySelectorAll(".gallery-tag").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".gallery-tag").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      view.filter = btn.dataset.filter;
      renderGallery();
    });
  });

  const search = document.getElementById("gallery-search");
  if (search) {
    let debounce;
    search.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { view.search = search.value; renderGallery(); }, 180);
    });
  }

  const sort = document.getElementById("gallery-sort");
  if (sort) sort.addEventListener("change", () => { view.sort = sort.value; renderGallery(); });

  /* One delegated listener for every card button */
  const grid = document.getElementById("gallery-grid");
  grid.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    const save = e.target.closest("[data-save]");
    const media = e.target.closest("[data-view]");

    if (add) { addToCart(add.dataset.add); return; }
    if (inc) { GVC.cart.add(inc.dataset.inc, 1); return; }
    if (dec) { GVC.cart.setQty(dec.dataset.dec, GVC.cart.qtyOf(dec.dataset.dec) - 1); return; }
    if (save) {
      const nowSaved = GVC.saved.toggle(save.dataset.save);
      save.classList.toggle("saved", nowSaved);
      save.textContent = nowSaved ? "♥" : "♡";
      GVC.toast(nowSaved ? "Saved for later" : "Removed from saved");
      return;
    }
    if (media && !e.target.closest(".carousel-dot") && !e.target.closest(".carousel-arrow")) {
      openQuickView(media.dataset.view);
    }
  });

  grid.addEventListener("keydown", (e) => {
    const media = e.target.closest("[data-view]");
    if (media && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openQuickView(media.dataset.view);
    }
  });
}

function addToCart(id) {
  const product = GVC.product(id);
  if (!product) return;
  GVC.cart.add(id, 1);
  GVC.toast(`${product.name} added`, "View cart", openCartDrawer);
}

/* ═══════════════════════════════════════════════════════════
   QUICK VIEW
   ═══════════════════════════════════════════════════════════ */

function initQuickView() {
  const modal = document.getElementById("quick-view");
  if (!modal) return;

  modal.addEventListener("click", (e) => {
    if (e.target.matches("[data-close-modal]")) closeQuickView();
    const add = e.target.closest("[data-add]");
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    if (add) addToCart(add.dataset.add);
    if (inc) GVC.cart.add(inc.dataset.inc, 1);
    if (dec) GVC.cart.setQty(dec.dataset.dec, GVC.cart.qtyOf(dec.dataset.dec) - 1);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeQuickView();
  });
}

function openQuickView(id) {
  const product = GVC.product(id);
  const modal = document.getElementById("quick-view");
  if (!product || !modal) return;

  modal.querySelector(".modal-body").innerHTML = `
    <div class="modal-media" style="background:linear-gradient(135deg, ${product.bg}, ${product.bg}dd)">
      <span class="modal-emoji">${product.emoji}</span>
      <span class="modal-tag">${product.tag}</span>
    </div>
    <div class="modal-info">
      <h3 class="modal-name serif">${product.name}</h3>
      <p class="modal-desc">${product.desc}</p>
      <div class="modal-price">${GVC.money(product.price)}</div>
      <dl class="spec-list">
        ${product.specs.map(s => `
          <div class="spec-row">
            <dt>${s.label}</dt>
            <dd>${s.value}</dd>
          </div>`).join("")}
      </dl>
      <div class="modal-actions" data-actions="${product.id}">${cardControlsHTML(product)}</div>
      <p class="modal-note">Every order includes a printed care card. Questions about this one? WhatsApp us before you order.</p>
    </div>`;

  modal.classList.add("open");
  document.body.classList.add("no-scroll");
  const closeBtn = modal.querySelector(".modal-close");
  if (closeBtn) closeBtn.focus();
}

function closeQuickView() {
  const modal = document.getElementById("quick-view");
  if (!modal || !modal.classList.contains("open")) return;
  modal.classList.remove("open");
  if (!document.getElementById("cart-drawer").classList.contains("open")) {
    document.body.classList.remove("no-scroll");
  }
}

/* ═══════════════════════════════════════════════════════════
   CART DRAWER
   ═══════════════════════════════════════════════════════════ */

function initCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  if (!drawer) return;

  document.querySelectorAll("[data-open-cart]").forEach(btn =>
    btn.addEventListener("click", openCartDrawer));

  drawer.addEventListener("click", (e) => {
    if (e.target.matches("[data-close-cart]")) { closeCartDrawer(); return; }
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    const del = e.target.closest("[data-remove]");
    if (inc) GVC.cart.add(inc.dataset.inc, 1);
    if (dec) GVC.cart.setQty(dec.dataset.dec, GVC.cart.qtyOf(dec.dataset.dec) - 1);
    if (del) {
      const product = GVC.product(del.dataset.remove);
      const qty = GVC.cart.qtyOf(del.dataset.remove);
      GVC.cart.remove(del.dataset.remove);
      GVC.toast(`${product.name} removed`, "Undo", () => GVC.cart.add(product.id, qty));
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCartDrawer();
  });

  renderCartDrawer();
}

function openCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  renderCartDrawer();
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closeCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  if (!drawer || !drawer.classList.contains("open")) return;
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}

function renderCartDrawer() {
  const body = document.getElementById("cart-body");
  const foot = document.getElementById("cart-foot");
  if (!body) return;

  const lines = GVC.cart.lines();
  const count = GVC.cart.count();
  const heading = document.getElementById("cart-head-title");
  if (heading) {
    heading.textContent = count === 0
      ? "Nothing here yet"
      : `${count} ${count === 1 ? "item" : "items"} picked`;
  }

  if (lines.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🪴</div>
        <h4 class="serif">Your cart is empty</h4>
        <p>Browse the bestsellers and add whatever catches your eye — you can change quantities before you send the order.</p>
        <button class="btn-forest btn-sm" data-close-cart>Browse plants</button>
      </div>`;
    foot.innerHTML = "";
    return;
  }

  body.innerHTML = lines.map(line => `
    <div class="cart-line">
      <div class="cart-line-thumb" style="background:linear-gradient(135deg, ${line.bg}, ${line.bg}dd)">${line.emoji}</div>
      <div class="cart-line-info">
        <div class="cart-line-name">${line.name}</div>
        <div class="cart-line-unit">${GVC.money(line.price)} each</div>
        <div class="qty-stepper small">
          <button class="qty-btn" data-dec="${line.id}" aria-label="Reduce quantity">−</button>
          <span class="qty-value">${line.qty}</span>
          <button class="qty-btn" data-inc="${line.id}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="cart-line-right">
        <div class="cart-line-total">${GVC.money(line.total)}</div>
        <button class="cart-line-remove" data-remove="${line.id}">Remove</button>
      </div>
    </div>`).join("");

  foot.innerHTML = `
    <div class="cart-subtotal">
      <span>Subtotal · ${GVC.cart.count()} ${GVC.cart.count() === 1 ? "item" : "items"}</span>
      <strong>${GVC.money(GVC.cart.subtotal())}</strong>
    </div>
    <p class="cart-foot-note">${SHOP.deliveryNote}</p>
    <a class="btn-forest cart-checkout" href="checkout.html">Review &amp; checkout →</a>
    <button class="cart-keep" data-close-cart>Keep shopping</button>`;
}

/* ═══════════════════════════════════════════════════════════
   CONTACT FORM → WHATSAPP
   ═══════════════════════════════════════════════════════════ */

function initContactForm() {
  const btn = document.getElementById("contact-send");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const name = document.getElementById("contact-name").value.trim();
    const email = document.getElementById("contact-email").value.trim();
    const phone = document.getElementById("contact-phone").value.trim();
    const message = document.getElementById("contact-message").value.trim();

    if (!name) { GVC.toast("Add your name so we know who's writing"); return; }
    if (!message) { GVC.toast("Tell us what you're looking for"); return; }

    const text =
      `*Enquiry from the website*%0A%0A` +
      `Name: ${encodeURIComponent(name)}%0A` +
      (phone ? `Phone: ${encodeURIComponent(phone)}%0A` : "") +
      (email ? `Email: ${encodeURIComponent(email)}%0A` : "") +
      `%0A${encodeURIComponent(message)}`;

    window.open(`https://wa.me/${SHOP.whatsappNumber}?text=${text}`, "_blank", "noopener");
    GVC.toast("WhatsApp is opening with your message");
  });
}

/* ═══════════════════════════════════════════════════════════
   REVIEWS
   ═══════════════════════════════════════════════════════════ */

let currentReviewPage = 0;
const REVIEWS_PER_PAGE = 3;
const totalReviewPages = Math.ceil(REVIEWS.length / REVIEWS_PER_PAGE);

function renderReviews(page) {
  currentReviewPage = page;
  const grid = document.getElementById("reviews-grid");
  const start = page * REVIEWS_PER_PAGE;
  const shown = REVIEWS.slice(start, start + REVIEWS_PER_PAGE);

  grid.innerHTML = shown.map((r, i) => `
    <div class="review-card fade-up" style="transition-delay: ${i * 0.12}s">
      <div class="review-stars">${"★".repeat(r.rating).split("").map(s => `<span>${s}</span>`).join("")}</div>
      <p class="review-text">"${r.text}"</p>
      <div class="review-author">
        <div class="review-avatar">${r.name[0]}</div>
        <div>
          <div class="review-name">${r.name}</div>
          <div class="review-meta">${r.loc} • ${r.ago}</div>
        </div>
      </div>
    </div>
  `).join("");

  const dotsContainer = document.getElementById("reviews-pagination");
  dotsContainer.innerHTML = "";
  for (let i = 0; i < totalReviewPages; i++) {
    const dot = document.createElement("button");
    dot.className = `reviews-dot ${i === page ? "active" : ""}`;
    dot.setAttribute("aria-label", `Reviews page ${i + 1}`);
    dot.addEventListener("click", () => renderReviews(i));
    dotsContainer.appendChild(dot);
  }

  reobserveFadeUps(grid);
}
