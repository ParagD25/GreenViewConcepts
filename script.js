/* ═══════════════════════════════════════════════════════════
   GREEN VIEW CONCEPTS — HOME PAGE
   Gallery, categories, slideshows, cart drawer, quick view.
   Product data arrives from Google Sheets via data.js.
   ═══════════════════════════════════════════════════════════ */

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
   const view = {
     main: "all",        // all | indoor | outdoor | pots | saved
     category: null,     // AGL, MON… or null for "everything in this tab"
     search: "",
     sort: "featured",
     page: 1,
   };
   
   /* Cards whose photos we've already gone looking for */
   const hydrated = Object.create(null);
   let mediaObserver = null;
   
   /* ─── DOM READY ───────────────────────────────────────────── */
   document.addEventListener("DOMContentLoaded", () => {
     initNavbar();
     initMobileMenu();
     initScrollAnimations();
     initGalleryControls();
     renderReviews(0);
     initSmoothScroll();
     initCartDrawer();
     initQuickView();
     initContactForm();
     initBackToTop();
   
     document.addEventListener("catalog:images", renderStatusNote);
   
     document.addEventListener("cart:change", () => {
       syncCardControls();
       renderCartDrawer();
       if (view.main === "saved") renderGallery();
     });
   
     /* Show something immediately, then swap in the live sheet data. */
     showGalleryLoading();
     GVCData.load()
       .catch(err => console.warn("Catalog load failed:", err))
       .then(() => {
         renderMainTabs();
         renderSubCategories();
         renderGallery();
         renderStatusNote();
         GVC.updateBadges();
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
      PHOTOS
      ═══════════════════════════════════════════════════════════ */
   
   function escapeAttr(value) {
     return String(value == null ? "" : value)
       .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
       .replace(/</g, "&lt;").replace(/>/g, "&gt;");
   }
   
   /* Shown until real photos exist. Never leaves an empty box. */
   function placeholderHTML(product) {
     const src = GVCData.placeholder();
     const bg = `background: linear-gradient(135deg, ${product.bg}, ${product.bg}dd)`;
     const img = src
       ? `<img class="carousel-placeholder" src="${escapeAttr(src)}" alt="${escapeAttr(product.name)}"
            loading="lazy" onerror="this.remove()">`
       : "";
     return `
       <div class="carousel" style="${bg}">
         <div class="carousel-slides">
           <div class="carousel-slide active">
             ${img}
             <span class="carousel-emoji">${product.emoji}</span>
           </div>
         </div>
         ${product.tag ? `<div class="plant-card-tag">${escapeAttr(product.tag)}</div>` : ""}
       </div>`;
   }
   
   function carouselHTML(product, images) {
     if (!images || !images.length) return placeholderHTML(product);
   
     const bg = `background: linear-gradient(135deg, ${product.bg}, ${product.bg}dd)`;
   
     const slides = images.map((img, i) =>
       `<div class="carousel-slide ${i === 0 ? "active" : ""}" data-index="${i}">
          <img src="${escapeAttr(img.url)}" alt="${escapeAttr(product.name)} — photo ${i + 1}"
               loading="lazy" referrerpolicy="no-referrer">
        </div>`).join("");
   
     const dots = images.length > 1
       ? `<div class="carousel-dots">${images.map((_, i) =>
           `<button class="carousel-dot ${i === 0 ? "active" : ""}" data-slide="${i}" aria-label="Photo ${i + 1}"></button>`
         ).join("")}</div>` : "";
   
     const arrows = images.length > 1
       ? `<button class="carousel-arrow prev" data-dir="-1" aria-label="Previous photo">‹</button>
          <button class="carousel-arrow next" data-dir="1" aria-label="Next photo">›</button>` : "";
   
     const count = images.length > 1 ? `<div class="carousel-count">📷 ${images.length}</div>` : "";
   
     return `
       <div class="carousel" data-carousel="${escapeAttr(product.id)}" data-total="${images.length}" style="${bg}">
         <div class="carousel-slides">${slides}</div>
         ${product.tag ? `<div class="plant-card-tag">${escapeAttr(product.tag)}</div>` : ""}
         ${count}${dots}${arrows}
       </div>`;
   }
   
   function initCarousel(carousel) {
     if (!carousel) return;
     const id = carousel.dataset.carousel;
     const total = parseInt(carousel.dataset.total, 10);
     if (!total || total <= 1) return;
   
     let current = 0;
     const slides = carousel.querySelectorAll(".carousel-slide");
     const dots = carousel.querySelectorAll(".carousel-dot");
   
     function goToSlide(n) {
       current = ((n % total) + total) % total;
       slides.forEach((s, i) => s.classList.toggle("active", i === current));
       dots.forEach((d, i) => d.classList.toggle("active", i === current));
     }
   
     function play() { carouselTimers[id] = setInterval(() => goToSlide(current + 1), SLIDE_INTERVAL); }
     function pause() { clearInterval(carouselTimers[id]); }
   
     play();
     carousel.addEventListener("mouseenter", pause);
     carousel.addEventListener("mouseleave", play);
   
     dots.forEach(dot => dot.addEventListener("click", (e) => {
       e.stopPropagation(); pause(); goToSlide(parseInt(dot.dataset.slide, 10)); play();
     }));
   
     carousel.querySelectorAll(".carousel-arrow").forEach(arrow => {
       arrow.addEventListener("click", (e) => {
         e.stopPropagation(); pause(); goToSlide(current + parseInt(arrow.dataset.dir, 10)); play();
       });
     });
   }
   
   function clearCarousels() {
     Object.keys(carouselTimers).forEach(k => clearInterval(carouselTimers[k]));
   }
   
   /* Photos load only when a card scrolls into view, so a long
      catalog doesn't fire eighty requests at once. */
   function observeMedia(grid) {
     if (mediaObserver) mediaObserver.disconnect();
   
     mediaObserver = new IntersectionObserver((entries) => {
       entries.forEach(entry => {
         if (!entry.isIntersecting) return;
         mediaObserver.unobserve(entry.target);
         hydrateCardMedia(entry.target);
       });
     }, { rootMargin: "300px 0px" });
   
     grid.querySelectorAll(".plant-card").forEach(card => mediaObserver.observe(card));
   }
   
   async function hydrateCardMedia(card) {
     const id = card.dataset.id;
     const product = GVC.product(id);
     if (!product || hydrated[id]) return;
     hydrated[id] = true;
   
     if (!product.imageUrl) return;                   // placeholder is already correct
   
     let images = [];
     try {
       images = await GVCData.images(product);
     } catch (err) {
       console.warn("Photos unavailable for " + id + ":", err.message);
       return;                                        // keep the placeholder, break nothing
     }
     if (!images.length || !card.isConnected) return;
   
     const holder = card.querySelector(".carousel");
     if (!holder) return;
   
     const temp = document.createElement("div");
     temp.innerHTML = carouselHTML(product, images);
     const fresh = temp.firstElementChild;
     holder.replaceWith(fresh);
     initCarousel(fresh);
   }
   
   /* ═══════════════════════════════════════════════════════════
      CATEGORY NAVIGATION
      ═══════════════════════════════════════════════════════════ */
   
   /* Row 1 — All / Indoor Plants / Outdoor Plants / Pots / Saved */
   function renderMainTabs() {
     const host = document.getElementById("gallery-filters");
     if (!host) return;
   
     const mains = GVCData.mainCategories();
     const tabs = [{ key: "all", label: "All", emoji: "✦" }].concat(mains);
   
     host.innerHTML = tabs.map(t => `
       <button class="gallery-tag ${view.main === t.key ? "active" : ""}" data-main="${escapeAttr(t.key)}">
         ${t.label}${t.count ? ` <em class="tag-count">${t.count}</em>` : ""}
       </button>`).join("") +
       `<button class="gallery-tag ${view.main === "saved" ? "active" : ""}" data-main="saved">♥ Saved</button>`;
   }
   
   /* Row 2 — the plant categories, as big tiles. They stand in for the
      old Specialities section, so they carry the same look. Once you drill
      into one they collapse and the breadcrumb takes over. */
   function renderSubCategories() {
     const host = document.getElementById("gallery-subcats");
     if (!host) return;
   
     if (view.main === "saved" || view.category) {
       host.innerHTML = ""; host.hidden = true; return;
     }
   
     const cats = GVCData.categories(view.main);
     if (cats.length < 2) { host.innerHTML = ""; host.hidden = true; return; }
   
     host.hidden = false;
     host.innerHTML = cats.map((c, i) => `
       <button class="cat-card fade-up stagger-${(i % 4) + 1}" data-cat="${escapeAttr(c.key)}">
         <div class="cat-card-icon">${c.emoji}</div>
         <h3 class="cat-card-title serif">${escapeAttr(c.label)}</h3>
         <div class="cat-card-count">${c.count}</div>
         <p class="cat-card-desc">${escapeAttr(c.desc || "Tap to see everything in this range")}</p>
       </button>`).join("");
   
     reobserveFadeUps(host);
   }
   
   /* ═══════════════════════════════════════════════════════════
      GALLERY
      ═══════════════════════════════════════════════════════════ */
   
   function visibleProducts() {
     let list = CATALOG.slice();
   
     if (view.main === "saved") list = list.filter(p => GVC.saved.has(p.id));
     else if (view.main !== "all") list = list.filter(p => p.main === view.main);
   
     if (view.category) list = list.filter(p => p.category === view.category);
   
     const q = view.search.trim().toLowerCase();
     if (q) {
       /* Match on the plant's own words — its note, not the category
          blurb it inherits, or searching "bamboo" would return every
          Dracaena rather than the bamboo ones. */
       list = list.filter(p =>
         (p.name + " " + p.note + " " + p.size + " " + p.code + " " + p.categoryLabel)
           .toLowerCase().includes(q));
     }
   
     if (view.sort === "price-low") list.sort((a, b) => (a.price || 0) - (b.price || 0));
     else if (view.sort === "price-high") list.sort((a, b) => (b.price || 0) - (a.price || 0));
     else if (view.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
   
     /* Whatever the sort, anything sold out drops to the bottom. */
     list.sort((a, b) => (a.inStock === b.inStock) ? 0 : (a.inStock ? -1 : 1));
     return list;
   }
   
   function cardControlsHTML(product) {
     if (!product.inStock) return `<span class="card-soldout">Out of stock</span>`;
   
     if (!product.hasPrice) {
       return `<a class="btn-add" target="_blank" rel="noopener noreferrer"
                 href="https://wa.me/${SHOP.whatsappNumber}?text=${encodeURIComponent("Hi! What's the price of " + product.fullName + " (" + product.code + ")?")}">Ask price</a>`;
     }
   
     const qty = GVC.cart.qtyOf(product.id);
     if (qty === 0) return `<button class="btn-add" data-add="${escapeAttr(product.id)}">Add to cart</button>`;
   
     return `
       <div class="qty-stepper" role="group" aria-label="Quantity for ${escapeAttr(product.name)}">
         <button class="qty-btn" data-dec="${escapeAttr(product.id)}" aria-label="Reduce quantity">−</button>
         <span class="qty-value" data-qty="${escapeAttr(product.id)}">${qty}</span>
         <button class="qty-btn" data-inc="${escapeAttr(product.id)}" aria-label="Increase quantity">+</button>
       </div>`;
   }
   
   function priceHTML(product) {
     return product.hasPrice
       ? `<span class="plant-card-price">${GVC.money(product.price)}</span>`
       : `<span class="plant-card-price muted">Price on request</span>`;
   }
   
   function showGalleryLoading() {
     const grid = document.getElementById("gallery-grid");
     if (!grid) return;
     grid.innerHTML = Array.from({ length: 6 }).map(() => `
       <article class="plant-card skeleton">
         <div class="skeleton-media"></div>
         <div class="plant-card-body">
           <div class="skeleton-line wide"></div>
           <div class="skeleton-line"></div>
           <div class="skeleton-line short"></div>
         </div>
       </article>`).join("");
   }
   
   /* The heading changes with wherever you are, so the section always
      names what's underneath it. */
   function renderGalleryHeading(total) {
     const eyebrow = document.getElementById("gallery-eyebrow");
     const title = document.getElementById("gallery-title");
     const blurb = document.getElementById("gallery-blurb");
     if (!title) return;
   
     let brow = "Gallery", head = "Our <em>Bestsellers</em>",
         text = "Hand-picked favourites loved by our customers. Each plant is nurtured with care and ready to thrive in your home.";
   
     if (view.main === "saved") {
       brow = "Your list";
       head = "Saved <em>for later</em>";
       text = "The plants you've hearted. They stay here on this device until you're ready.";
     } else if (view.category) {
       const cat = CATEGORY_MAP[view.category];
       const label = (cat && cat.label) || view.category;
       const parts = label.split(" ");
       brow = "Category";
       head = parts.length > 1
         ? escapeAttr(parts.slice(0, -1).join(" ")) + " <em>" + escapeAttr(parts[parts.length - 1]) + "</em>"
         : "<em>" + escapeAttr(label) + "</em>";
       text = (cat && cat.desc) ? cat.desc + ` — ${total} to choose from.` : `${total} to choose from.`;
     } else if (view.main !== "all") {
       const main = (SHOP.sheets[view.main] && SHOP.sheets[view.main].label) || view.main;
       const parts = main.split(" ");
       brow = "Range";
       head = parts.length > 1
         ? escapeAttr(parts.slice(0, -1).join(" ")) + " <em>" + escapeAttr(parts[parts.length - 1]) + "</em>"
         : "<em>" + escapeAttr(main) + "</em>";
       text = `Everything we grow in this range — ${total} in stock right now. Pick a category below to narrow it down.`;
     }
   
     if (eyebrow) eyebrow.textContent = brow;
     title.innerHTML = head;
     if (blurb) blurb.textContent = text;
   }
   
   function renderGallery() {
     clearCarousels();
   
     const grid = document.getElementById("gallery-grid");
     if (!grid) return;
   
     const all = visibleProducts();
     const pageSize = SHOP.pageSize || 12;
     const shown = all.slice(0, view.page * pageSize);
   
     const countEl = document.getElementById("gallery-count");
     if (countEl) countEl.textContent = all.length === 1 ? "1 item" : `${all.length} items`;
   
     renderGalleryHeading(all.length);
     renderCrumb(all.length);
   
     if (!all.length) {
       grid.innerHTML = `
         <div class="gallery-empty">
           <div class="gallery-empty-icon">🌱</div>
           <h3 class="serif">Nothing matches that yet</h3>
           <p>${view.main === "saved"
             ? "Tap the heart on any plant to save it here for later."
             : "Try a different word, or clear the filters to see everything."}</p>
           <button class="btn-outline btn-sm" id="gallery-reset">Show everything</button>
         </div>`;
       const reset = document.getElementById("gallery-reset");
       if (reset) reset.addEventListener("click", resetFilters);
       renderMoreButton(0, 0);
       return;
     }
   
     grid.innerHTML = shown.map((product, i) => {
       const isSaved = GVC.saved.has(product.id);
       const pots = GVCData.suggestPots(product);
   
       return `
         <article class="plant-card fade-up ${product.inStock ? "" : "is-out"}"
                  style="transition-delay:${Math.min(i % pageSize, 8) * 0.05}s" data-id="${escapeAttr(product.id)}">
           <button class="card-save ${isSaved ? "saved" : ""}" data-save="${escapeAttr(product.id)}"
                   aria-label="${isSaved ? "Remove from saved" : "Save for later"}"
                   title="${isSaved ? "Remove from saved" : "Save for later"}">${isSaved ? "♥" : "♡"}</button>
   
           <div class="card-media" data-view="${escapeAttr(product.id)}" role="button" tabindex="0"
                aria-label="See details for ${escapeAttr(product.name)}">
             ${placeholderHTML(product)}
             ${product.inStock ? "" : `<div class="stock-banner">Out of stock</div>`}
             <span class="card-media-hint">View details</span>
           </div>
   
           <div class="plant-card-body">
             <h3 class="plant-card-name">${escapeAttr(product.name)}</h3>
             <p class="plant-card-desc">${escapeAttr(product.desc || product.categoryLabel)}</p>
             <div class="card-meta">
               <span class="card-code">${escapeAttr(product.code)}</span>
               ${product.size ? `<span class="card-size">${escapeAttr(product.size)}</span>` : ""}
             </div>
             <div class="plant-card-footer">
               ${priceHTML(product)}
               <div class="card-actions" data-actions="${escapeAttr(product.id)}">${cardControlsHTML(product)}</div>
             </div>
             ${pots.length ? potSuggestHTML(product, pots) : ""}
           </div>
         </article>`;
     }).join("");
   
     reobserveFadeUps(grid);
     observeMedia(grid);
     renderMoreButton(shown.length, all.length);
   }
   
   function renderCrumb(total) {
     const crumb = document.getElementById("gallery-crumb");
     if (!crumb) return;
   
     if (!view.category) { crumb.hidden = true; crumb.innerHTML = ""; return; }
   
     const cat = CATEGORY_MAP[view.category];
     const label = (cat && cat.label) || view.category;
     crumb.hidden = false;
     crumb.innerHTML = `
       <button class="crumb-back" id="crumb-back">← All categories</button>
       <span class="crumb-here">${escapeAttr(label)} <em>${total}</em></span>`;
   
     const back = document.getElementById("crumb-back");
     if (back) back.addEventListener("click", () => {
       view.category = null; view.page = 1;
       renderSubCategories(); renderGallery();
     });
   }
   
   function renderMoreButton(shownCount, total) {
     const host = document.getElementById("gallery-more");
     if (!host) return;
   
     if (shownCount >= total) { host.innerHTML = ""; host.hidden = true; return; }
     host.hidden = false;
     const remaining = total - shownCount;
     host.innerHTML = `<button class="btn-outline btn-sm" id="load-more">Show ${remaining} more</button>`;
     document.getElementById("load-more").addEventListener("click", () => {
       view.page++;
       renderGallery();
     });
   }
   
   function resetFilters() {
     view.main = "all"; view.category = null; view.search = ""; view.page = 1;
     const search = document.getElementById("gallery-search");
     if (search) search.value = "";
     renderMainTabs();
     renderSubCategories();
     renderGallery();
   }
   
   /* A quiet line under the toolbar when we're not on live data.
      Deliberately low-key — the shop still works. */
   function renderStatusNote() {
     const host = document.getElementById("gallery-status");
     if (!host) return;
   
     const s = GVCData.state;
     const notes = [];
   
     if (s.status === "fallback" && !s.sheetsTried) {
       notes.push("Showing a sample range. Connect your Google Sheet in <code>catalog.js</code> to go live.");
     } else if (s.status === "fallback") {
       notes.push("We couldn't reach the price list just now, so this is a short sample. Please WhatsApp us to confirm anything.");
     } else if (s.status === "cached") {
       notes.push("Showing recently saved prices — we couldn't reach the live list just now.");
     }
   
     /* Setup problems are worth spelling out — they're for you, not the
        customer, and they only appear while something is misconfigured. */
     s.errors.forEach(e => notes.push(escapeAttr(e)));
     s.imageProblems.forEach(e => notes.push(escapeAttr(e)));
   
     if (notes.length > 1) notes.push("Run <code>GVCData.diagnose()</code> in the browser console for the full picture.");
   
     if (!notes.length) { host.hidden = true; host.innerHTML = ""; return; }
     host.hidden = false;
     host.innerHTML = notes.map(n =>
       `<div class="status-line"><span class="status-dot"></span><span>${n}</span></div>`).join("");
   }
   
   /* Update only the buttons — never re-render the grid on a cart
      change, that would restart every photo slideshow mid-slide. */
   function syncCardControls() {
     document.querySelectorAll("[data-actions]").forEach(box => {
       const product = GVC.product(box.dataset.actions);
       if (product) box.innerHTML = cardControlsHTML(product);
     });
     document.querySelectorAll("[data-pot-actions]").forEach(box => {
       const pot = GVC.product(box.dataset.potActions);
       if (pot) box.innerHTML = potButtonHTML(pot);
     });
     const modal = document.getElementById("quick-view");
     if (modal && modal.classList.contains("open")) {
       const box = modal.querySelector("[data-actions]");
       const product = box && GVC.product(box.dataset.actions);
       if (product) box.innerHTML = cardControlsHTML(product);
     }
   }
   
   function initGalleryControls() {
     const filters = document.getElementById("gallery-filters");
     if (filters) filters.addEventListener("click", (e) => {
       const btn = e.target.closest("[data-main]");
       if (!btn) return;
       view.main = btn.dataset.main;
       view.category = null;
       view.page = 1;
       renderMainTabs();
       renderSubCategories();
       renderGallery();
     });
   
     const subs = document.getElementById("gallery-subcats");
     if (subs) subs.addEventListener("click", (e) => {
       const btn = e.target.closest("[data-cat]");
       if (!btn) return;
       view.category = btn.dataset.cat || null;
       view.page = 1;
       renderSubCategories();
       renderGallery();
       const header = document.getElementById("gallery-header");
       if (header) header.scrollIntoView({ behavior: "smooth", block: "start" });
     });
   
     const search = document.getElementById("gallery-search");
     if (search) {
       let debounce;
       search.addEventListener("input", () => {
         clearTimeout(debounce);
         debounce = setTimeout(() => { view.search = search.value; view.page = 1; renderGallery(); }, 180);
       });
     }
   
     const sort = document.getElementById("gallery-sort");
     if (sort) sort.addEventListener("change", () => { view.sort = sort.value; view.page = 1; renderGallery(); });
   
     /* One delegated listener for every card button */
     const grid = document.getElementById("gallery-grid");
     grid.addEventListener("click", (e) => {
       const add = e.target.closest("[data-add]");
       const inc = e.target.closest("[data-inc]");
       const dec = e.target.closest("[data-dec]");
       const save = e.target.closest("[data-save]");
       const potAdd = e.target.closest("[data-pot-add]");
       const potClose = e.target.closest("[data-pot-close]");
       const potOpen = e.target.closest("[data-pot-open]");
       const media = e.target.closest("[data-view]");
   
       if (potAdd) { addSelectedPot(potAdd); return; }
       if (potClose) { closePotSuggest(potClose.closest(".pot-suggest")); return; }
       if (potOpen) { togglePotSuggest(potOpen.dataset.potOpen); return; }
   
       if (add && add.tagName === "BUTTON") {
         addToCart(add.dataset.add);
         openPotSuggest(add.dataset.add);
         return;
       }
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
     GVC.toast(`${product.fullName || product.name} added`, "View cart", openCartDrawer);
   }
   
   /* ═══════════════════════════════════════════════════════════
      POT SUGGESTIONS
      ═══════════════════════════════════════════════════════════
      Pick a plant and the site offers pots that actually fit it —
      sized from the plant's own pot size in the sheet.
      ═══════════════════════════════════════════════════════════ */
   
   /* Pots are shown as real cards with a photograph, not a dropdown —
      people buy a pot on how it looks. */
   function potSuggestHTML(product, pots) {
     const sizeWord = product.size ? escapeAttr(product.size) : "nursery";
   
     const cards = pots.map(pot => `
       <div class="pot-card" data-pot-card="${escapeAttr(pot.id)}">
         <div class="pot-card-media" style="background:linear-gradient(135deg, ${pot.bg}, ${pot.bg}dd)">
           ${potThumbHTML(pot)}
         </div>
         <div class="pot-card-name">${escapeAttr(pot.name)}</div>
         <div class="pot-card-meta">${escapeAttr(pot.size || "")}${pot.hasPrice ? " · " + GVC.money(pot.price) : ""}</div>
         <div class="pot-card-actions" data-pot-actions="${escapeAttr(pot.id)}">${potButtonHTML(pot)}</div>
       </div>`).join("");
   
     return `
       <div class="pot-suggest" data-pot-for="${escapeAttr(product.id)}" hidden>
         <div class="pot-suggest-head">
           <span class="pot-suggest-title">🪴 Pots that fit this plant</span>
           <button class="pot-suggest-close" data-pot-close aria-label="Hide pot suggestions">✕</button>
         </div>
         <p class="pot-suggest-note">Sized for a ${sizeWord} plant.</p>
         <div class="pot-card-row">${cards}</div>
       </div>`;
   }
   
   /* An added pot must look added — a plain "Add" that does nothing
      visible makes people press it twice. */
   function potButtonHTML(pot) {
     const qty = GVC.cart.qtyOf(pot.id);
     if (qty === 0) return `<button class="btn-add small" data-pot-add="${escapeAttr(pot.id)}">Add</button>`;
     return `
       <div class="pot-added">
         <span class="pot-added-tick">✓ In cart</span>
         <div class="qty-stepper tiny">
           <button class="qty-btn" data-dec="${escapeAttr(pot.id)}" aria-label="Reduce quantity">−</button>
           <span class="qty-value">${qty}</span>
           <button class="qty-btn" data-inc="${escapeAttr(pot.id)}" aria-label="Increase quantity">+</button>
         </div>
       </div>`;
   }
   
   /* Placeholder now, real photo as soon as the pot's Image_URL resolves. */
   function potThumbHTML(pot) {
     const src = GVCData.placeholder();
     return (src
       ? `<img class="pot-card-photo" src="${escapeAttr(src)}" alt="${escapeAttr(pot.name)}"
            loading="lazy" onerror="this.remove()">`
       : "") + `<span class="pot-card-emoji">${pot.emoji}</span>`;
   }
   
   /* Swaps in the pot's own photograph wherever that pot is shown. */
   async function hydratePotPhotos(root) {
     const cards = Array.from((root || document).querySelectorAll("[data-pot-card]"));
     const seen = Object.create(null);
   
     for (const card of cards) {
       const id = card.dataset.potCard;
       if (seen[id]) continue;
       seen[id] = true;
   
       const pot = GVC.product(id) || (GVCData.suggestPots({ main: "x", sizeInches: null }) || []).find(p => p.id === id);
       if (!pot || !pot.imageUrl) continue;
   
       let images = [];
       try { images = await GVCData.images(pot); }
       catch (err) { continue; }
       if (!images.length) continue;
   
       document.querySelectorAll(`[data-pot-card="${CSS.escape(id)}"] .pot-card-media`).forEach(media => {
         media.innerHTML = `<img class="pot-card-photo" src="${escapeAttr(images[0].url)}"
           alt="${escapeAttr(pot.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`;
       });
     }
   }
   
   function openPotSuggest(plantId) {
     const panel = document.querySelector(`[data-pot-for="${CSS.escape(plantId)}"]`);
     if (!panel || panel.dataset.dismissed === "1") return;
     panel.hidden = false;
     requestAnimationFrame(() => panel.classList.add("open"));
     hydratePotPhotos(panel);
   }
   
   function togglePotSuggest(plantId) {
     const panel = document.querySelector(`[data-pot-for="${CSS.escape(plantId)}"]`);
     if (!panel) return;
     if (panel.hidden) { panel.dataset.dismissed = "0"; openPotSuggest(plantId); }
     else closePotSuggest(panel);
   }
   
   function closePotSuggest(panel) {
     if (!panel) return;
     panel.dataset.dismissed = "1";
     panel.classList.remove("open");
     setTimeout(() => { panel.hidden = true; }, 220);
   }
   
   function addSelectedPot(button) {
     const id = button.dataset.potAdd;
     const pot = GVC.product(id);
     if (!pot) return;
   
     /* Remember the plant it was suggested for, so the order can say
        which pot goes with which plant. */
     const panel = button.closest(".pot-suggest");
     const modal = button.closest("#quick-view");
     const plantId = panel ? panel.dataset.potFor
       : (modal && modal.querySelector("[data-actions]") ? modal.querySelector("[data-actions]").dataset.actions : "");
     const plant = plantId ? GVC.product(plantId) : null;
   
     GVC.cart.add(pot.id, 1, plant ? { forPlant: plant.id, forPlantName: plant.fullName || plant.name } : undefined);
     GVC.toast(`${pot.name} added for your ${plant ? plant.name : "plant"}`, "View cart", openCartDrawer);
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
       const potAdd = e.target.closest("[data-modal-pot]");
   
       if (add && add.tagName === "BUTTON") addToCart(add.dataset.add);
       if (inc) GVC.cart.add(inc.dataset.inc, 1);
       if (dec) GVC.cart.setQty(dec.dataset.dec, GVC.cart.qtyOf(dec.dataset.dec) - 1);
       if (potAdd) {
         addSelectedPot({
           dataset: { potAdd: potAdd.dataset.modalPot },
           closest: (sel) => (sel === "#quick-view" ? modal : null),
         });
       }
     });
   
     document.addEventListener("keydown", (e) => {
       if (e.key === "Escape") closeQuickView();
     });
   }
   
   async function openQuickView(id) {
     const product = GVC.product(id);
     const modal = document.getElementById("quick-view");
     if (!product || !modal) return;
   
     const pots = GVCData.suggestPots(product);
     const src = GVCData.placeholder();
   
     modal.querySelector(".modal-body").innerHTML = `
       <div class="modal-media" data-modal-media style="background:linear-gradient(135deg, ${product.bg}, ${product.bg}dd)">
         ${src ? `<img class="modal-photo" src="${escapeAttr(src)}" alt="${escapeAttr(product.name)}" onerror="this.remove()">` : ""}
         <span class="modal-emoji">${product.emoji}</span>
         ${product.tag ? `<span class="modal-tag">${escapeAttr(product.tag)}</span>` : ""}
         ${product.inStock ? "" : `<div class="stock-banner">Out of stock</div>`}
       </div>
       <div class="modal-info">
         <h3 class="modal-name serif">${escapeAttr(product.name)}</h3>
         <p class="modal-desc">${escapeAttr(product.desc || product.categoryLabel)}</p>
         <div class="modal-price">${product.hasPrice ? GVC.money(product.price) : "Price on request"}</div>
         <dl class="spec-list">
           ${product.specs.map(s => `
             <div class="spec-row">
               <dt>${escapeAttr(s.label)}</dt>
               <dd>${escapeAttr(s.value)}</dd>
             </div>`).join("")}
         </dl>
         <div class="modal-actions" data-actions="${escapeAttr(product.id)}">${cardControlsHTML(product)}</div>
   
         ${pots.length ? `
         <div class="modal-pots">
           <h4 class="block-title">Pots that fit this plant</h4>
           <p class="modal-pots-note">Sized for a ${escapeAttr(product.size || "nursery")} plant — pick one and it joins your cart.</p>
           <div class="modal-pot-row">
             ${pots.map(p => `
               <div class="modal-pot-card" data-pot-card="${escapeAttr(p.id)}">
                 <div class="modal-pot-thumb pot-card-media" style="background:linear-gradient(135deg, ${p.bg}, ${p.bg}dd)">
                   ${potThumbHTML(p)}
                 </div>
                 <div class="modal-pot-name">${escapeAttr(p.name)}</div>
                 <div class="modal-pot-meta">${escapeAttr(p.size || "")}${p.hasPrice ? " · " + GVC.money(p.price) : ""}</div>
                 <div class="pot-card-actions" data-pot-actions="${escapeAttr(p.id)}">${potButtonHTML(p).replace(/data-pot-add=/g, "data-modal-pot=")}</div>
               </div>`).join("")}
           </div>
         </div>` : ""}
   
         <p class="modal-note">Every order includes a complete care guide. Questions about this one? WhatsApp us before you order.</p>
       </div>`;
   
     modal.classList.add("open");
     document.body.classList.add("no-scroll");
     hydratePotPhotos(modal);
     const closeBtn = modal.querySelector(".modal-close");
     if (closeBtn) closeBtn.focus();
   
     /* Swap the placeholder for real photos if this plant has any */
     if (product.imageUrl) {
       try {
         const images = await GVCData.images(product);
         if (images.length && modal.classList.contains("open")) {
           const media = modal.querySelector("[data-modal-media]");
           if (media && media.dataset.for !== product.id) {
             media.innerHTML = carouselHTML(product, images) +
               (product.inStock ? "" : `<div class="stock-banner">Out of stock</div>`);
             media.dataset.for = product.id;
             initCarousel(media.querySelector(".carousel"));
           }
         }
       } catch (err) {
         console.warn("Quick view photos failed:", err.message);
       }
     }
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
         const id = del.dataset.remove;
         const line = GVC.cart.lines().find(l => l.id === id);
         const qty = GVC.cart.qtyOf(id);
         GVC.cart.remove(id);
         GVC.toast(`${line ? line.name : "Item"} removed`, "Undo", () => GVC.cart.add(id, qty));
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
       <div class="cart-line ${line.unavailable ? "is-out" : ""}">
         <div class="cart-line-thumb" style="background:linear-gradient(135deg, ${line.bg}, ${line.bg}dd)">${line.emoji}</div>
         <div class="cart-line-info">
           <div class="cart-line-name">${escapeAttr(line.name)}</div>
           <div class="cart-line-unit">${GVC.money(line.price)} each</div>
           ${line.pairedWith ? `<div class="cart-line-pair">Goes with ${escapeAttr(line.pairedWith)}</div>` : ""}
           ${line.unavailable ? `<div class="cart-line-flag">Out of stock — we'll confirm on WhatsApp</div>` : ""}
           <div class="qty-stepper small">
             <button class="qty-btn" data-dec="${escapeAttr(line.id)}" aria-label="Reduce quantity">−</button>
             <span class="qty-value">${line.qty}</span>
             <button class="qty-btn" data-inc="${escapeAttr(line.id)}" aria-label="Increase quantity">+</button>
           </div>
         </div>
         <div class="cart-line-right">
           <div class="cart-line-total">${GVC.money(line.total)}</div>
           <button class="cart-line-remove" data-remove="${escapeAttr(line.id)}">Remove</button>
         </div>
       </div>`).join("");
   
     foot.innerHTML = `
       <div class="cart-subtotal">
         <span>Subtotal · ${count} ${count === 1 ? "item" : "items"}</span>
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
   