/* ═══════════════════════════════════════════════════════════
   GREEN VIEW CONCEPTS NURSERY — JavaScript
   Google Drive Photo Integration + Auto-Sliding Carousel
   ═══════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   ⚙️  CONFIGURATION — EDIT THIS SECTION
   ─────────────────────────────────────────────────────────── */

// 🔑 STEP 1: Paste your Google API key here
// Get it free: https://console.cloud.google.com → APIs → Credentials → Create API Key
// Then enable "Google Drive API" in the API Library
const GOOGLE_API_KEY = ""; // e.g. "AIzaSyB1234567890abcdefg"

// 🌿 STEP 2: For each plant, paste the Google Drive FOLDER ID
// How to get it: Open the Drive folder → copy the ID from the URL
// Example URL: https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ
// The folder ID is: 1aBcDeFgHiJkLmNoPqRsTuVwXyZ
// ⚠️ IMPORTANT: Make sure each folder is shared as "Anyone with the link can view"

const BESTSELLERS = [
  { name: "Monstera Deliciosa", tag: "Air Purifier", price: "₹899", desc: "The iconic split-leaf beauty",       bg: "#2d5a27", cat: "indoor",            folderId: "" },
  { name: "Echeveria Elegans",  tag: "Bestseller",   price: "₹299", desc: "Mexican snowball rosette",           bg: "#6b8e5e", cat: "succulent",          folderId: "" },
  { name: "Snake Plant",        tag: "Low Light",     price: "₹449", desc: "Virtually indestructible classic",   bg: "#3a6b35", cat: "indoor",             folderId: "" },
  { name: "Jade Plant",         tag: "Lucky Charm",   price: "₹349", desc: "Symbol of prosperity & growth",     bg: "#4a7c3f", cat: "succulent",          folderId: "" },
  { name: "Fiddle Leaf Fig",    tag: "Trending",      price: "₹1,249", desc: "Statement piece for any room",    bg: "#2e6e29", cat: "indoor trending",    folderId: "" },
  { name: "Haworthia Zebra",    tag: "Rare Find",     price: "₹399", desc: "Striking zebra-striped succulent",  bg: "#5a8b4e", cat: "succulent trending", folderId: "" },
  { name: "Peace Lily",         tag: "Elegant",       price: "₹599", desc: "Graceful white blooms year-round",  bg: "#3d7a37", cat: "indoor",             folderId: "" },
  { name: "Aloe Vera",          tag: "Medicinal",     price: "₹249", desc: "Nature's healing wonder",           bg: "#4f8a43", cat: "succulent",          folderId: "" },
  { name: "String of Pearls",   tag: "Unique",        price: "₹499", desc: "Cascading succulent beauty",        bg: "#367032", cat: "succulent trending",  folderId: "" },
  { name: "Rubber Plant",       tag: "Statement",     price: "₹799", desc: "Bold burgundy glossy leaves",       bg: "#2a5d24", cat: "indoor",             folderId: "" },
  { name: "ZZ Plant",           tag: "Hardy",         price: "₹549", desc: "Thrives on neglect, shines always", bg: "#4d7e41", cat: "indoor",             folderId: "" },
  { name: "Crassula Ovata",     tag: "Compact",       price: "₹279", desc: "Miniature tree-like succulent",     bg: "#5d9051", cat: "succulent trending",  folderId: "" },
];

// Auto-slide interval in milliseconds (4000 = 4 seconds)
const SLIDE_INTERVAL = 4000;

/* ─────────────────────────────────────────────────────────────
   END OF CONFIGURATION
   ─────────────────────────────────────────────────────────── */

const PLANT_EMOJIS = ["🌿", "🪴", "🌵", "🌱", "🍃", "🌳", "🌺", "🌻", "🪻", "🌴", "🪷", "🌾"];

const REVIEWS = [
  { name: "Soumya Jainwal",  loc: "Indore",    text: "Green view concept is one of the best nursery as it provides vast variety of indoor plants as well as outdoor plants,the owner is very responsive and has a vast knowledge of plants and also recommends the best plants for your homes,highly recommend to others.", rating: 5, ago: "4 months ago" },
  { name: "Nitish Paroha",   loc: "Indore",  text: "Absolutely loved my visit to Green View Concept Nursery. The plants are well-maintained, reasonably priced, and there's a great selection of indoor and outdoor varieties. The staff was knowledgeable and helped me pick the best plants for my home. A must-visit for gardening enthusiasts!", rating: 5, ago: "7 month ago" },
  { name: "Parag Durafe",   loc: "Indore",  text: "Has the best selection of healthy, vibrant indoor plants! The Owner is super helpful in guiding me to the perfect choices for my space. Highly recommend for anyone looking to brighten up their interiors!", rating: 5, ago: "5 months ago" },
  { name: "Manvi Jain",   loc: "Indore",  text: "Very beautiful nursery and so many amazing options for indoor plants. The owner is so good they personally suggest you the best option for your home. You can buy a plant to gift and it’s a such a good option to replace bouquet. A plant will stay forever with whoever you gift it to.", rating: 5, ago: "2 years ago" },
  { name: "Rishal Gedham",    loc: "Rau, Indore", text: "The owner is really sweet, humble and passionate and you can truly see the love and care she puts into it. The staff is incredibly knowledgeable and friendly, offering great advice on how to care for all my new green friends. I left with a basket full of beautiful flowers and plants, and I can’t wait to come back for more! Highly recommend this gem for anyone looking to brighten up their garden or home with stunning plants and flowers!", rating: 5, ago: "1 year ago" },
  { name: "Nilesh Dudhe",  loc: "Indore", text: "As a new destination for plants lover. A beautiful home of plants. very excellent location, plants varieties, quality, one more and important points rate,They have categories according to plant's usability and cost. Very well maintained, knowledgeable owner and staff which is clear all the question regarding plants, When you visit such a green place, your vibes automatically enhance.", rating: 5, ago: "7 years ago" },
  { name: "Riya Sharma",    loc: "Indore", text: "The owner is very humble and personally suggest you the best plant for your space. The selection of plants is incredible, and the staff is so knowledgeable and helpful.", rating: 5, ago: "2 year sago" },
  { name: "Ankit Malani",  loc: "Indore", text: "A nice and beautiful nursery, which makes the heart happy after seeing it. Very well maintained knowledgeable staff ; helpful polite ; The nursery has store were all accessories necessary for a good garden is required ! Prices are very reasonable ! Fancy home decor indoor plants are too good ! Good location & parking ! You should visit with family understand about plants nurturing ! I have decorate my new house with 50 to 60 plants and i fully satisfied. Thanks to Green View concept !", rating: 5, ago: "6 years ago" },

];

// Store carousel intervals so we can clean them up
const carouselTimers = {};

/* ─── DOM READY ───────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  initMobileMenu();
  initScrollAnimations();
  renderGallery("All");
  initGalleryFilters();
  renderReviews(0);
  initSmoothScroll();
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

/* ═══════════════════════════════════════════════════════════
   GOOGLE DRIVE API — Fetch Images from Folder
   ═══════════════════════════════════════════════════════════ */

async function fetchDriveImages(folderId) {
  if (!GOOGLE_API_KEY || !folderId) return [];

  const url = `https://www.googleapis.com/drive/v3/files?` +
    `q='${folderId}'+in+parents+and+mimeType+contains+'image/'` +
    `&key=${GOOGLE_API_KEY}` +
    `&fields=files(id,name,mimeType)` +
    `&pageSize=20` +
    `&orderBy=name`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
    const data = await res.json();

    // Convert each file to a direct viewable thumbnail URL
    return (data.files || []).map(file => ({
      id: file.id,
      name: file.name,
      // This URL serves images up to 1600px wide — perfect for web
      url: `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
    }));
  } catch (err) {
    console.warn(`Failed to load images for folder ${folderId}:`, err.message);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════
   CAROUSEL — Auto-Sliding Image Carousel per Plant Card
   ═══════════════════════════════════════════════════════════ */

function createCarouselHTML(plant, index, images) {
  const hasImages = images && images.length > 0;
  const bgStyle = `background: linear-gradient(135deg, ${plant.bg}, ${plant.bg}dd)`;

  if (!hasImages) {
    // Emoji fallback when no Drive images
    return `
      <div class="carousel" style="${bgStyle}">
        <div class="carousel-slides">
          <div class="carousel-slide active">
            <span class="carousel-emoji">${PLANT_EMOJIS[index % PLANT_EMOJIS.length]}</span>
          </div>
        </div>
        <div class="plant-card-tag">${plant.tag}</div>
      </div>`;
  }

  const slides = images.map((img, i) =>
    `<div class="carousel-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
      <img src="${img.url}" alt="${plant.name} - Photo ${i + 1}" loading="lazy">
    </div>`
  ).join("");

  const dots = images.length > 1 ? `
    <div class="carousel-dots">
      ${images.map((_, i) => `<button class="carousel-dot ${i === 0 ? 'active' : ''}" data-slide="${i}"></button>`).join("")}
    </div>` : "";

  const arrows = images.length > 1 ? `
    <button class="carousel-arrow prev" data-dir="-1">‹</button>
    <button class="carousel-arrow next" data-dir="1">›</button>` : "";

  const count = images.length > 1
    ? `<div class="carousel-count">📷 ${images.length}</div>` : "";

  return `
    <div class="carousel" data-carousel="${index}" data-total="${images.length}" style="${bgStyle}">
      <div class="carousel-slides">${slides}</div>
      <div class="plant-card-tag">${plant.tag}</div>
      ${count}${dots}${arrows}
    </div>`;
}

function createLoadingCarousel(plant) {
  return `
    <div class="carousel" style="background: linear-gradient(135deg, ${plant.bg}, ${plant.bg}dd)">
      <div class="carousel-loading">
        <div class="carousel-spinner"></div>
        <div class="carousel-loading-text">Loading photos…</div>
      </div>
      <div class="plant-card-tag">${plant.tag}</div>
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
    current = ((n % total) + total) % total; // wrap around

    slides.forEach((s, i) => s.classList.toggle("active", i === current));
    dots.forEach((d, i) => d.classList.toggle("active", i === current));
  }

  // Auto-slide
  const timerId = setInterval(() => goToSlide(current + 1), SLIDE_INTERVAL);
  carouselTimers[carouselIndex] = timerId;

  // Pause on hover, resume on leave
  carousel.addEventListener("mouseenter", () => clearInterval(carouselTimers[carouselIndex]));
  carousel.addEventListener("mouseleave", () => {
    carouselTimers[carouselIndex] = setInterval(() => goToSlide(current + 1), SLIDE_INTERVAL);
  });

  // Dot clicks
  carousel.querySelectorAll(".carousel-dot").forEach(dot => {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      goToSlide(parseInt(dot.dataset.slide));
    });
  });

  // Arrow clicks
  carousel.querySelectorAll(".carousel-arrow").forEach(arrow => {
    arrow.addEventListener("click", (e) => {
      e.stopPropagation();
      goToSlide(current + parseInt(arrow.dataset.dir));
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   GALLERY — Render Plant Cards with Drive Integration
   ═══════════════════════════════════════════════════════════ */

async function renderGallery(filter) {
  // Clean up old carousel timers
  Object.values(carouselTimers).forEach(clearInterval);

  const grid = document.getElementById("gallery-grid");
  let plants = BESTSELLERS;

  if (filter === "Indoor Plants") plants = BESTSELLERS.filter(p => p.cat.includes("indoor"));
  else if (filter === "Succulents") plants = BESTSELLERS.filter(p => p.cat.includes("succulent"));
  else if (filter === "Trending") plants = BESTSELLERS.filter(p => p.cat.includes("trending"));

  const apiReady = GOOGLE_API_KEY && GOOGLE_API_KEY.length > 10;
  const hasAnyFolders = plants.some(p => p.folderId);

  // Show setup banner if API key is missing
  const existingBanner = document.querySelector(".setup-banner");
  if (existingBanner) existingBanner.remove();

  // if (!apiReady) {
  //   const banner = document.createElement("div");
  //   banner.className = "setup-banner";
  //   banner.innerHTML = `
  //     <div class="setup-banner-title">📸 How to Add Your Own Plant Photos</div>
  //     <div class="setup-banner-text">
  //       <strong>3 easy steps:</strong><br>
  //       1. Get a free Google API key from <code>console.cloud.google.com</code> and enable "Google Drive API"<br>
  //       2. Create a Google Drive folder per plant, add photos, and share it as <code>Anyone with the link</code><br>
  //       3. Paste the API key and folder IDs in <code>script.js</code> → the photos auto-load as a slideshow!
  //     </div>`;
  //   grid.parentNode.insertBefore(banner, grid);
  // }

  // PHASE 1: Render cards immediately (with loading spinners or emoji fallback)
  grid.innerHTML = plants.map((plant, i) => {
    const showLoader = apiReady && plant.folderId;
    const carouselHTML = showLoader
      ? createLoadingCarousel(plant)
      : createCarouselHTML(plant, i, []);

    return `
      <div class="plant-card fade-up" style="transition-delay: ${i * 0.06}s" data-plant-index="${i}">
        ${carouselHTML}
        <div class="plant-card-body">
          <h3 class="plant-card-name">${plant.name}</h3>
          <p class="plant-card-desc">${plant.desc}</p>
          <div class="plant-card-footer">
            <span class="plant-card-price">${plant.price}</span>
            <span class="plant-card-soon">Coming Soon</span>
          </div>
        </div>
      </div>`;
  }).join("");

  reobserveFadeUps(grid);

  // PHASE 2: Fetch Drive images in background and replace loading spinners
  if (apiReady && hasAnyFolders) {
    const cards = grid.querySelectorAll(".plant-card");
    const fetchPromises = plants.map(async (plant, i) => {
      if (!plant.folderId) return;

      const images = await fetchDriveImages(plant.folderId);
      const card = cards[i];
      if (!card) return;

      // Replace the loading carousel with the real one
      const oldCarousel = card.querySelector(".carousel");
      const temp = document.createElement("div");
      temp.innerHTML = createCarouselHTML(plant, i, images);
      const newCarousel = temp.firstElementChild;
      oldCarousel.replaceWith(newCarousel);

      // Initialize auto-slide
      initCarousel(card, i);
    });

    // Fire all fetches in parallel
    await Promise.allSettled(fetchPromises);
  }
}

function initGalleryFilters() {
  document.querySelectorAll(".gallery-tag").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".gallery-tag").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderGallery(btn.dataset.filter);
    });
  });
}

/* ═══════════════════════════════════════════════════════════
   REVIEWS — Pagination
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
    dot.addEventListener("click", () => renderReviews(i));
    dotsContainer.appendChild(dot);
  }

  reobserveFadeUps(grid);
}
