/* Loads the real index.html in jsdom with a mocked Google Sheet and
   drives the actual UI: categories, cards, cart, wishlist, pot dropdown. */
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");
const H = require("./harness");

const ROOT = path.join(__dirname, "..");

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; failures.push(name + (detail ? " → " + detail : "")); console.log("  ✗ " + name + (detail ? " → " + detail : "")); }
}
function section(t) { console.log("\n" + t); }

const INDOOR = H.INDOOR_ROWS;
const POTS = H.POT_ROWS;

async function boot(opts) {
  const o = opts || {};
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    if (/Could not load|Not implemented/.test(e.message)) return;
    console.log("    [page error] " + e.message);
    if (e.detail) console.log("    " + String(e.detail).split("\n").slice(0, 4).join("\n    "));
  });
  vc.on("error", (m) => console.log("    [console.error] " + m));

  /* Drop the <script src> tags — we inject the files ourselves below,
     after the fakes are in place. */
  const stripped = html.replace(/<script src="[^"]+"><\/script>/g, "");

  const dom = new JSDOM(stripped, {
    url: "https://example.com/index.html",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const w = dom.window;

  /* Things jsdom lacks */
  w.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; }
    observe(el) { this.cb([{ isIntersecting: true, target: el }], this); }
    unobserve() {} disconnect() {}
  };
  /* jsdom below v30 omits these; every real browser has them natively. */
  if (!w.TextEncoder) w.TextEncoder = TextEncoder;
  if (!w.TextDecoder) w.TextDecoder = TextDecoder;
  w.scrollTo = () => {};
  w.Element.prototype.scrollIntoView = () => {};
  w.CSS = w.CSS || {};
  w.CSS.escape = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => "\\" + c);
  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });

  w.fetch = async (url) => {
    const u = String(url);
    if (o.sheetFails) throw new Error("network down");
    if (u.indexOf("INDOORID") !== -1) {
      return { ok: true, text: async () => H.gvizPayload(H.HEADERS, o.indoorRows || INDOOR) };
    }
    if (u.indexOf("POTSID") !== -1) {
      return { ok: true, text: async () => H.gvizPayload(H.HEADERS, POTS) };
    }
    throw new Error("unexpected " + u);
  };

  /* Real <script> elements, in page order — this is what lets
     catalog.js's top-level consts be visible to the other files,
     exactly as separate script tags behave in a browser. */
  function addScript(code) {
    const el = w.document.createElement("script");
    el.textContent = code;
    w.document.head.appendChild(el);
  }

  ["catalog.js", "data.js", "cart.js", "script.js"].forEach(f =>
    addScript(fs.readFileSync(path.join(ROOT, f), "utf8")));

  /* Point at the mock sheets before DOMContentLoaded fires */
  addScript(
    'SHOP.sheets.indoor.url = "https://docs.google.com/spreadsheets/d/INDOORID/edit#gid=0";' +
    (o.pots === false ? "" : 'SHOP.sheets.pots.url = "https://docs.google.com/spreadsheets/d/POTSID/edit#gid=0";') +
    "window.__SHOP = SHOP; window.__CATALOG = CATALOG;"
  );

  /* jsdom fires DOMContentLoaded on its own, asynchronously, after the
     constructor returns. Dispatching our own as well would run every
     init twice — so wait for the real one. */
  await new Promise(resolve => {
    if (w.document.readyState === "loading") {
      w.document.addEventListener("DOMContentLoaded", resolve, { once: true });
      setTimeout(resolve, 200);                    // safety net
    } else {
      w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
      resolve();
    }
  });

  await new Promise(r => setTimeout(r, 150));      // let the sheet load settle
  return { dom, w, d: w.document };
}

const $ = (d, sel) => d.querySelector(sel);
const $$ = (d, sel) => Array.from(d.querySelectorAll(sel));
const click = (w, el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));

/* Press "show more" until the whole catalogue is on the page. */
function showAll(w, d) {
  for (let i = 0; i < 10 && $(d, "#load-more"); i++) click(w, $(d, "#load-more"));
}

(async function () {

  /* ═══════════════════════════════════════════════════════ */
  section("1. The page builds itself from the sheet");
  {
    const { w, d } = await boot();

    const tabs = $$(d, "#gallery-filters .gallery-tag");
    check("main tabs rendered", tabs.length === 4, tabs.map(t => t.textContent.trim()).join(" | "));
    check("tabs are All / Indoor Plants / Pots / Saved",
      /All/.test(tabs[0].textContent) && /Indoor Plants/.test(tabs[1].textContent) &&
      /Pots/.test(tabs[2].textContent) && /Saved/.test(tabs[3].textContent),
      tabs.map(t => t.textContent.trim()).join(" | "));

    const tiles = $$(d, "#gallery-subcats .cat-card");
    check("categories render as big tiles inside the bestsellers section",
      tiles.length === 11, "got " + tiles.length);
    check("first tile is Aglaonema", /Aglaonema/.test(tiles[0].textContent), tiles[0].textContent.trim());
    check("tiles show live counts", /6/.test(tiles[0].textContent));
    check("the old Specialities section is gone", !$(d, "#categories-grid"));
    check("heading starts as Bestsellers", /Bestsellers/.test($(d, "#gallery-title").textContent));

    const cards = $$(d, "#gallery-grid .plant-card");
    check("first page of products rendered", cards.length === 12, "got " + cards.length);
    check("count shows the full total", /30 items/.test($(d, "#gallery-count").textContent),
      $(d, "#gallery-count").textContent);
    check('"show more" button appears', !!$(d, "#load-more"), "missing");

    click(w, $(d, "#load-more"));
    check("show more reveals the rest", $$(d, "#gallery-grid .plant-card").length === 24,
      String($$(d, "#gallery-grid .plant-card").length));
  }

  /* ═══════════════════════════════════════════════════════ */
  section("2. A card shows what the sheet says");
  {
    const { d } = await boot();
    const card = $(d, '.plant-card[data-id="AGL-101"]');
    check("card exists for AGL-101", !!card);
    check("name shown", /Aglaonema Anjuman/.test($(card, ".plant-card-name").textContent));
    check("price shown with rupee sign", $(card, ".plant-card-price").textContent.trim() === "₹200",
      $(card, ".plant-card-price").textContent);
    check("plant code shown", $(card, ".card-code").textContent.trim() === "AGL-101");
    check("pot size shown", $(card, ".card-size").textContent.trim() === "3 Inch");
    check("placeholder image used while photos are pending",
      !!$(card, "img.carousel-placeholder"), "no placeholder img");
    check("placeholder points at the static file",
      /assets\/placeholder-plant\.svg/.test($(card, "img.carousel-placeholder").getAttribute("src")));
    check("add to cart button present", !!$(card, "[data-add]"));
  }

  /* ═══════════════════════════════════════════════════════ */
  section("3. Out-of-stock banner");
  {
    const { w, d } = await boot();
    showAll(w, d);                                   // sold-out items sort last

    const out = $(d, '.plant-card[data-id="MON-102"]');
    check("out-of-stock card is marked", out && out.classList.contains("is-out"));
    check("banner is on the photo", out && !!$(out, ".stock-banner"));
    check("banner reads Out of stock", out && $(out, ".stock-banner").textContent.trim() === "Out of stock");
    check("no add button for it", out && !$(out, "[data-add]"));
    check('shows "Out of stock" instead', out && /Out of stock/.test($(out, ".card-soldout").textContent));

    const inStock = $(d, '.plant-card[data-id="MON-101"]');
    check("in-stock card has no banner", inStock && !$(inStock, ".stock-banner"));

    const fresh = await boot();
    const firstPage = $$(fresh.d, "#gallery-grid .plant-card").map(c => c.dataset.id);
    check("sold-out items are pushed to the end",
      firstPage.indexOf("MON-102") === -1, "MON-102 on first page");
  }

  /* ═══════════════════════════════════════════════════════ */
  section("4. Clicking a category drills down");
  {
    const { w, d } = await boot();

    const aglTile = $$(d, "#gallery-subcats .cat-card").find(c => /Aglaonema/.test(c.textContent));
    click(w, aglTile);

    const cards = $$(d, "#gallery-grid .plant-card");
    check("only Aglaonema shown", cards.length === 6 && cards.every(c => /^AGL/.test(c.dataset.id)),
      cards.map(c => c.dataset.id).join(","));
    check("breadcrumb appears", !$(d, "#gallery-crumb").hidden);
    check("breadcrumb names the category", /Aglaonema/.test($(d, ".crumb-here").textContent));
    check("heading becomes the category name", /Aglaonema/.test($(d, "#gallery-title").textContent),
      $(d, "#gallery-title").textContent);
    check("tiles collapse once you drill in", $(d, "#gallery-subcats").hidden);

    click(w, $(d, "#crumb-back"));
    check("back returns to everything", $$(d, "#gallery-grid .plant-card").length === 12);
    check("breadcrumb hidden again", $(d, "#gallery-crumb").hidden);
    check("tiles come back", !$(d, "#gallery-subcats").hidden);
    check("heading resets to Bestsellers", /Bestsellers/.test($(d, "#gallery-title").textContent));

    /* Any tile is a way in */
    const { w: w2, d: d2 } = await boot();
    const tile = $$(d2, "#gallery-subcats .cat-card").find(t => /Money Plants/.test(t.textContent));
    click(w2, tile);
    const monCards = $$(d2, "#gallery-grid .plant-card");
    check("front-page tile filters the gallery",
      monCards.length === 4 && monCards.every(c => /^MON/.test(c.dataset.id)),
      monCards.map(c => c.dataset.id).join(","));
  }

  /* ═══════════════════════════════════════════════════════ */
  section("5. Main tabs");
  {
    const { w, d } = await boot();
    const potsTab = $$(d, "#gallery-filters .gallery-tag").find(t => /^Pots/.test(t.textContent.trim()));
    click(w, potsTab);
    const cards = $$(d, "#gallery-grid .plant-card");
    check("Pots tab shows only pots",
      cards.length === 7 && cards.every(c => /^(POT|TER|HNG)/.test(c.dataset.id)),
      cards.map(c => c.dataset.id).join(","));
    check("tiles switch to pot types",
      $$(d, "#gallery-subcats .cat-card").some(c => /Terracotta/.test(c.textContent)));
    check("heading names the range", /Pots/.test($(d, "#gallery-title").textContent),
      $(d, "#gallery-title").textContent);

    const indoorTab = $$(d, "#gallery-filters .gallery-tag").find(t => /Indoor/.test(t.textContent));
    click(w, indoorTab);
    check("Indoor tab shows only plants",
      $$(d, "#gallery-grid .plant-card").every(c => !/^(POT|TER|HNG)/.test(c.dataset.id)));
  }

  /* ═══════════════════════════════════════════════════════ */
  section("6. Cart still works");
  {
    const { w, d } = await boot();
    const card = $(d, '.plant-card[data-id="AGL-101"]');

    click(w, $(card, "[data-add]"));
    check("adding puts 1 in the cart", w.GVC.cart.count() === 1);
    check("badge updated", $(d, "[data-cart-count]").textContent === "1");
    check("button becomes a stepper", !!$(card, "[data-inc]"));

    click(w, $(card, "[data-inc]"));
    check("plus increases quantity", w.GVC.cart.qtyOf("AGL-101") === 2);
    click(w, $(card, "[data-dec]"));
    check("minus decreases quantity", w.GVC.cart.qtyOf("AGL-101") === 1);

    const line = w.GVC.cart.lines()[0];
    check("cart line uses the full name with size", line.name === "Aglaonema Anjuman · 3 Inch", line.name);
    check("cart line carries the live price", line.price === 200 && line.total === 200);
    check("subtotal correct", w.GVC.cart.subtotal() === 200);

    click(w, $(d, "[data-open-cart]"));
    check("drawer opens", $(d, "#cart-drawer").classList.contains("open"));
    check("drawer lists the item", /Aglaonema Anjuman/.test($(d, "#cart-body").textContent));
    check("drawer shows the checkout link", !!$(d, ".cart-checkout"));
  }

  /* ═══════════════════════════════════════════════════════ */
  section("7. Wishlist still works");
  {
    const { w, d } = await boot();
    const card = $(d, '.plant-card[data-id="AGL-102"]');

    click(w, $(card, "[data-save]"));
    check("heart fills in", $(card, "[data-save]").classList.contains("saved"));
    check("saved to storage", w.GVC.saved.has("AGL-102"));

    const savedTab = $$(d, "#gallery-filters .gallery-tag").find(t => /Saved/.test(t.textContent));
    click(w, savedTab);
    const cards = $$(d, "#gallery-grid .plant-card");
    check("Saved tab shows just that plant",
      cards.length === 1 && cards[0].dataset.id === "AGL-102",
      cards.map(c => c.dataset.id).join(","));

    click(w, $(cards[0], "[data-save]"));
    check("un-hearting empties the tab", !w.GVC.saved.has("AGL-102"));
  }

  /* ═══════════════════════════════════════════════════════ */
  section("8. Pot suggestions when a plant is picked");
  {
    const { w, d } = await boot();
    showAll(w, d);
    const card = $(d, '.plant-card[data-id="ZAM-105"]');   // 10 inch ZZ plant

    const panel = $(card, ".pot-suggest");
    check("suggestion panel exists on the card", !!panel);
    check("panel starts hidden", panel.hidden === true);

    click(w, $(card, "[data-add]"));
    check("panel opens automatically after adding the plant", panel.hidden === false);

    const cards = $$(panel, ".pot-card");
    check("3–4 pots offered", cards.length >= 3 && cards.length <= 4, "got " + cards.length);
    check("no dropdown any more", !$(panel, ".pot-select"));
    check("each pot shows a picture", $$(panel, ".pot-card-media img").length === cards.length,
      $$(panel, ".pot-card-media img").length + " of " + cards.length);
    check("pictures fall back to the placeholder until real photos exist",
      /placeholder-plant/.test($(panel, ".pot-card-media img").getAttribute("src")));
    check("each pot shows its name, size and price",
      /Terracotta Ribbed Pot/.test(cards[0].textContent) && /8 Inch/.test(cards[0].textContent) &&
      /₹699/.test(cards[0].textContent), cards[0].textContent.replace(/\s+/g, " ").trim());
    check("panel explains the fit", /10 Inch/.test($(panel, ".pot-suggest-note").textContent),
      $(panel, ".pot-suggest-note").textContent);

    click(w, $(cards[0], "[data-pot-add]"));
    check("adding a pot puts it in the cart", w.GVC.cart.qtyOf("TER-201") === 1);
    check("cart now has plant + pot", w.GVC.cart.count() === 2);

    /* Sizing: same size, or one inch either way */
    const { w: w2, d: d2 } = await boot();
    showAll(w2, d2);
    const small = $(d2, '.plant-card[data-id="SCC-101"]');   // 2 inch echeveria
    click(w2, $(small, "[data-add]"));
    const smallPots = $$($(small, ".pot-suggest"), ".pot-card");
    const sizes = smallPots.map(c => $(c, ".pot-card-meta").textContent.trim());
    check("a 2 inch plant is offered 3 inch pots first", /3 Inch/.test(sizes[0]), sizes.join(" | "));
    check("nothing wildly oversized is suggested",
      !sizes.some(t => /(7|8|10) Inch/.test(t)), sizes.join(" | "));

    const panel2 = $(small, ".pot-suggest");
    click(w2, $(panel2, "[data-pot-close]"));
    check("closing the panel marks it dismissed", panel2.dataset.dismissed === "1");
  }

  section("9. Quick view");
  {
    const { w, d } = await boot();
    showAll(w, d);
    const card = $(d, '.plant-card[data-id="AGL-113"]');
    click(w, $(card, ".card-media"));

    const modal = $(d, "#quick-view");
    check("quick view opens", modal.classList.contains("open"));
    check("shows the name", /Aglaonema White Legacy/.test($(d, ".modal-name").textContent));
    check("shows the price", /₹750/.test($(d, ".modal-price").textContent));
    check("shows the pot size in specs", /5 Inch/.test($(d, ".spec-list").textContent));
    check("shows the plant code", /AGL-113/.test($(d, ".spec-list").textContent));
    check("shows the category", /Aglaonema/.test($(d, ".spec-list").textContent));
    const specs = $$(d, ".spec-row dt").map(t => t.textContent.trim());
    check("care notes are gone",
      !specs.some(l => /Light|Water|Care level|Pet friendly/.test(l)), specs.join(", "));
    check("availability row is gone", !specs.some(l => /Availability/.test(l)), specs.join(", "));
    check("only the facts remain",
      JSON.stringify(specs) === JSON.stringify(["Pot size", "Category", "Plant code"]), specs.join(", "));

    const potCards = $$(d, ".modal-pot-card");
    check("pot suggestions shown in the pop-up", potCards.length >= 3, "got " + potCards.length);
    check("pop-up pots show pictures too", $$(d, ".modal-pot-card .pot-card-media img").length > 0);
    click(w, $(potCards[0], "[data-modal-pot]"));
    check("pot can be added from the pop-up", w.GVC.cart.count() === 1);

    click(w, $(d, "[data-close-modal]"));
    check("quick view closes", !modal.classList.contains("open"));
  }

  /* ═══════════════════════════════════════════════════════ */
  section("10. Search and sort");
  {
    const { w, d } = await boot();
    const search = $(d, "#gallery-search");
    search.value = "spiral";
    search.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 250));
    let found = $$(d, "#gallery-grid .plant-card");
    check("search finds by name", found.length === 1 && found[0].dataset.id === "DRA-103",
      found.map(c => c.dataset.id).join(","));

    search.value = "bamboo";
    search.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 250));
    found = $$(d, "#gallery-grid .plant-card");
    check("search also matches a category name", found.every(c => /^DRA/.test(c.dataset.id)) && found.length === 4,
      found.map(c => c.dataset.id).join(","));

    search.value = "anjuman";
    search.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 250));
    check("search does not spill across categories",
      $$(d, "#gallery-grid .plant-card").every(c => /^AGL/.test(c.dataset.id)));

    search.value = "AGL-111";
    search.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 250));
    check("search finds by plant code",
      $$(d, "#gallery-grid .plant-card").length === 1, String($$(d, "#gallery-grid .plant-card").length));

    search.value = "";
    search.dispatchEvent(new w.Event("input", { bubbles: true }));
    await new Promise(r => setTimeout(r, 250));

    const sort = $(d, "#gallery-sort");
    sort.value = "price-low";
    sort.dispatchEvent(new w.Event("change", { bubbles: true }));
    const prices = $$(d, "#gallery-grid .plant-card")
      .map(c => Number($(c, ".plant-card-price").textContent.replace(/[^\d]/g, "")));
    check("price sort ascending", prices.every((p, i) => i === 0 || prices[i - 1] <= p), prices.join(","));
  }

  /* ═══════════════════════════════════════════════════════ */
  section("11. The site survives a failed sheet");
  {
    const { w, d } = await boot({ sheetFails: true });

    const cards = $$(d, "#gallery-grid .plant-card");
    check("products still render", cards.length > 0, "got " + cards.length);
    check("categories still render", $$(d, "#gallery-subcats .cat-card").length > 0);
    check("a notice is shown", !$(d, "#gallery-status").hidden);
    check("the notice is reassuring, not alarming",
      /WhatsApp|saved/i.test($(d, "#gallery-status").textContent),
      $(d, "#gallery-status").textContent.trim());

    /* And the shop still works */
    click(w, $(cards[0], "[data-add]"));
    check("you can still add to the cart", w.GVC.cart.count() === 1);
    click(w, $(d, "[data-open-cart]"));
    check("the cart drawer still opens", $(d, "#cart-drawer").classList.contains("open"));
  }

  /* ═══════════════════════════════════════════════════════ */
  section("12. Pots sheet not connected yet");
  {
    const { w, d } = await boot({ pots: false });
    showAll(w, d);
    const tabs = $$(d, "#gallery-filters .gallery-tag");
    check("Pots tab is hidden until that sheet exists",
      !tabs.some(t => /^Pots/.test(t.textContent.trim())),
      tabs.map(t => t.textContent.trim()).join(" | "));

    const card = $(d, '.plant-card[data-id="AGL-101"]');
    click(w, $(card, "[data-add]"));
    const potCards = $$($(card, ".pot-suggest"), ".pot-card");
    check("pot suggestions still work from the built-in list", potCards.length >= 3, "got " + potCards.length);
  }

  /* ═══════════════════════════════════════════════════════ */
  section("13. Cart survives the sheet going down mid-session");
  {
    const { w } = await boot();
    w.GVC.cart.add("AGL-101", 2);
    const before = w.GVC.cart.lines()[0];

    /* Simulate the next visit with no sheet at all */
    w.eval("CATALOG.length = 0;");
    const after = w.GVC.cart.lines()[0];

    check("cart line does not vanish", !!after);
    check("name remembered", after && after.name === before.name, after && after.name);
    check("price remembered", after && after.price === 200);
    check("total still correct", after && after.total === 400);
    check("count still correct", w.GVC.cart.count() === 2);
  }

  /* ═══════════════════════════════════════════════════════ */
  section("14. Page and breadcrumb layout");
  {
    const { w, d } = await boot();

    const order = $$(d, "section[id]").map(s => s.id).filter(Boolean);
    check("Our Story sits above the reviews",
      order.indexOf("about") < order.indexOf("reviews") && order.indexOf("about") > order.indexOf("gallery"),
      order.join(" → "));

    const nav = $$(d, ".navbar-links .nav-btn").map(b => b.textContent.trim());
    check("navbar follows the page order",
      JSON.stringify(nav) === JSON.stringify(["Home", "Gallery", "About", "Reviews", "Contact"]),
      nav.join(" | "));

    const mobileNav = $$(d, "#mobile-menu .nav-btn").map(b => b.textContent.trim())
      .filter(t => !/Checkout/.test(t));
    check("mobile menu matches",
      JSON.stringify(mobileNav) === JSON.stringify(["Home", "Gallery", "About", "Reviews", "Contact"]),
      mobileNav.join(" | "));

    /* Breadcrumb: back on one side, category on the other */
    const tile = $$(d, "#gallery-subcats .cat-card").find(t => /Aglaonema/.test(t.textContent));
    click(w, tile);
    const crumb = $(d, "#gallery-crumb");
    check("breadcrumb has both ends", !!$(crumb, ".crumb-back") && !!$(crumb, ".crumb-here"));
    check("the category is the last thing in the row",
      crumb.lastElementChild.classList.contains("crumb-here"),
      crumb.lastElementChild.className);
  }

  /* ═══════════════════════════════════════════════════════ */
  section("15. Adding a pot looks like it worked");
  {
    const { w, d } = await boot();
    showAll(w, d);
    const card = $(d, '.plant-card[data-id="SCC-101"]');
    click(w, $(card, "[data-add]"));

    const panel = $(card, ".pot-suggest");
    const potCard = $$(panel, ".pot-card")[0];
    const potId = potCard.dataset.potCard;

    check("it starts as a plain Add button", !!$(potCard, "[data-pot-add]"));
    click(w, $(potCard, "[data-pot-add]"));

    /* The same pot is suggested under several plants, so look only
       inside this plant's own panel. */
    const inPanel = (sel) => $(panel, `[data-pot-card="${potId}"] ${sel}`);

    check("the pot is in the cart", w.GVC.cart.qtyOf(potId) === 1);
    check("the button is replaced, not left saying Add", !inPanel("[data-pot-add]"));
    check("it says so plainly", /In cart/i.test($(panel, `[data-pot-card="${potId}"]`).textContent));
    check("and shows the quantity with a stepper", !!inPanel("[data-inc]") && !!inPanel("[data-dec]"));

    click(w, inPanel("[data-inc]"));
    check("the stepper works", w.GVC.cart.qtyOf(potId) === 2);
    check("the count on screen keeps up", inPanel(".qty-value").textContent === "2");

    check("every copy of that pot on the page updates too",
      $$(d, `[data-pot-card="${potId}"]`).every(c => /In cart/i.test(c.textContent)),
      "some still show Add");

    click(w, inPanel("[data-dec]"));
    click(w, inPanel("[data-dec]"));
    check("removing it brings Add back", !!inPanel("[data-pot-add]"));

    /* The pairing is remembered */
    click(w, inPanel("[data-pot-add]"));
    const line = w.GVC.cart.lines().find(l => l.id === potId);
    check("the cart remembers which plant it was for",
      line && /Echeveria/.test(line.pairedWith), line && line.pairedWith);

    click(w, $(d, "[data-open-cart]"));
    check("the cart drawer says so", /Goes with/.test($(d, "#cart-body").textContent),
      $(d, "#cart-body").textContent.slice(0, 160));
  }

  /* ═══════════════════════════════════════════════════════ */
  section("16. Marquee and map");
  {
    const { d } = await boot();

    const blocks = $$(d, "section[id], .marquee-section");
    const names = blocks.map(b => b.id || "marquee");
    check("the marquee sits above Our Story",
      names.indexOf("marquee") < names.indexOf("about") &&
      names.indexOf("marquee") > names.indexOf("gallery"), names.join(" → "));

    const frame = $(d, ".map-embed iframe");
    check("the map is embedded", !!frame);
    check("it points at the nursery", /Green\+View\+Concepts/.test(frame.getAttribute("src")),
      frame && frame.getAttribute("src"));
    check("it loads lazily", frame.getAttribute("loading") === "lazy");
    check("there's a directions link", !!$(d, ".map-link"));
    check("the address is still written out",
      /9FB Scheme No 94/.test($(d, ".contact-detail-value").textContent));
  }

  /* ═══════════════════════════════════════════════════════ */
  section("17. Social links");
  {
    const { d } = await boot();

    const hrefs = $$(d, ".contact-socials-grid a").map(a => a.getAttribute("href"));
    check("three socials in the contact block", hrefs.length === 3, hrefs.join(" | "));
    check("Instagram, WhatsApp and email only",
      hrefs.some(h => /instagram\.com/.test(h)) &&
      hrefs.some(h => /wa\.me/.test(h)) &&
      hrefs.some(h => /^mailto:/.test(h)), hrefs.join(" | "));
    check("no leftover networks",
      !hrefs.some(h => /facebook|youtube|pinterest|x\.com|twitter/i.test(h)), hrefs.join(" | "));
    check("real icons, not emoji", $$(d, ".contact-socials-grid a svg").length === 3);

    const all = $$(d, "a[href^='https://wa.me'], a[href^='mailto:']").map(a => a.getAttribute("href"));
    check("every WhatsApp link uses the shop's number",
      all.filter(h => /wa\.me/.test(h)).every(h => h.indexOf("919617765000") !== -1),
      all.join(" | "));
    check("email links point at the shop inbox",
      all.filter(h => /mailto/.test(h)).every(h => /greenviewconceptsnursery@gmail\.com/.test(h)));

    const footer = $$(d, ".footer-socials a").map(a => a.getAttribute("href"));
    check("footer carries the same three", footer.length === 3, footer.join(" | "));
    check("the handles are clickable", $$(d, ".footer-social-handles a").length === 3);

    const links = $$(d, ".footer-link").map(b => b.dataset.scrollTo);
    check("no footer link points at a section that was removed",
      links.every(t => !!d.getElementById(t)), links.join(" | "));
  }

  console.log("\n" + "─".repeat(56));
  console.log(pass + " passed, " + fail + " failed");
  if (fail) { console.log("\nFailures:"); failures.forEach(f => console.log("  • " + f)); process.exit(1); }
})().catch(err => { console.error("\nCRASH:", err); process.exit(1); });
