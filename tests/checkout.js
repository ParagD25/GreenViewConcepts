/* Loads the real checkout.html in jsdom and drives it end to end. */
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

async function boot(opts) {
  const o = opts || {};
  const html = fs.readFileSync(path.join(ROOT, "checkout.html"), "utf8")
    .replace(/<script src="[^"]+"><\/script>/g, "");

  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => console.log("    [page error] " + e.message));

  const dom = new JSDOM(html, {
    url: "https://example.com/checkout.html",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const w = dom.window;

  /* jsdom below v30 omits these; every real browser has them natively. */
  if (!w.TextEncoder) w.TextEncoder = TextEncoder;
  if (!w.TextDecoder) w.TextDecoder = TextDecoder;
  w.scrollTo = () => {};
  w.Element.prototype.scrollIntoView = () => {};
  w.CSS = w.CSS || {};
  w.CSS.escape = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => "\\" + c);

  const opened = [];
  w.open = (url) => { opened.push(url); return null; };

  const posted = [];

  w.fetch = async (url, init) => {
    const u = String(url);
    if (u.indexOf("script.google.com") !== -1) {
      posted.push({ url: u, init: init, body: init && init.body });
      if (o.inboxFails === "cors") throw new TypeError("Failed to fetch");
      if (o.inboxFails === "http") return { ok: false, status: 500, text: async () => "err" };
      return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true }) };
    }
    if (o.sheetFails) throw new Error("network down");
    if (u.indexOf("INDOORID") !== -1) return { ok: true, text: async () => H.gvizPayload(H.HEADERS, H.INDOOR_ROWS) };
    if (u.indexOf("POTSID") !== -1) return { ok: true, text: async () => H.gvizPayload(H.HEADERS, H.POT_ROWS) };
    throw new Error("unexpected " + u);
  };

  const addScript = (code) => {
    const el = w.document.createElement("script");
    el.textContent = code;
    w.document.head.appendChild(el);
  };

  /* Seed the cart before the page scripts run, as a returning
     customer's browser would have it. */
  if (o.cart) w.localStorage.setItem("gvc_cart_v2", JSON.stringify(o.cart));

  let pdfLoaded = true;
  try {
    addScript(fs.readFileSync(path.join(ROOT, "vendor/jspdf.umd.min.js"), "utf8"));
    if (!w.jspdf) pdfLoaded = false;
  } catch (e) { pdfLoaded = false; }

  ["catalog.js", "data.js", "cart.js", "checkout.js"].forEach(f =>
    addScript(fs.readFileSync(path.join(ROOT, f), "utf8")));

  addScript('SHOP.sheets.indoor.url = "https://docs.google.com/spreadsheets/d/INDOORID/edit";' +
            'SHOP.sheets.pots.url = "https://docs.google.com/spreadsheets/d/POTSID/edit";' +
            (o.inbox === false ? '' : 'SHOP.orderInboxUrl = "https://script.google.com/macros/s/TEST/exec";'));

  await new Promise(resolve => {
    if (w.document.readyState === "loading") {
      w.document.addEventListener("DOMContentLoaded", resolve, { once: true });
      setTimeout(resolve, 200);
    } else {
      w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
      resolve();
    }
  });
  await new Promise(r => setTimeout(r, 150));

  return { w, d: w.document, opened, posted, pdfLoaded };
}

const $ = (d, s) => d.querySelector(s);
const $$ = (d, s) => Array.from(d.querySelectorAll(s));
const click = (w, el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
const type = (w, el, v) => { el.value = v; el.dispatchEvent(new w.Event("input", { bubbles: true })); };

const CART = [
  { id: "AGL-101", qty: 2, snap: { name: "Aglaonema Anjuman · 3 Inch", emoji: "🌿", bg: "#2d5a27", tag: "3 Inch", price: 200 } },
  { id: "ZAM-105", qty: 1, snap: { name: "Green ZZ Plant · 10 Inch", emoji: "🌱", bg: "#4d7e41", tag: "10 Inch", price: 1200 } },
];

(async function () {

  section("1. The cart draws with live prices");
  {
    const { w, d } = await boot({ cart: CART });
    check("empty state hidden", $(d, "#checkout-empty").hidden);
    check("both items listed", $$(d, ".co-line").length === 2);
    check("names carry the pot size", /Aglaonema Anjuman · 3 Inch/.test($(d, "#checkout-lines").textContent));
    check("subtotal is right", /₹1,600/.test($(d, "#summary-rows").textContent),
      $(d, "#summary-rows").textContent.replace(/\s+/g, " ").trim());
    check("cart badge matches", w.GVC.cart.count() === 3);
  }

  section("2. Prices follow the sheet, not the saved copy");
  {
    /* Customer saved this at ₹99 a while ago; the sheet now says ₹200 */
    const stale = [{ id: "AGL-101", qty: 1, snap: { name: "Aglaonema Anjuman · 3 Inch", emoji: "🌿", bg: "#2d5a27", tag: "3 Inch", price: 99 } }];
    const { w, d } = await boot({ cart: stale });
    check("live sheet price wins over the stored one", w.GVC.cart.lines()[0].price === 200,
      String(w.GVC.cart.lines()[0].price));
    check("summary shows the current price", /₹200/.test($(d, "#summary-rows").textContent));
  }

  section("3. Out-of-stock items are flagged, not silently dropped");
  {
    const cart = [{ id: "MON-102", qty: 1, snap: { name: "Golden Money Plant · 5 Inch", emoji: "🍀", bg: "#3a6b35", tag: "5 Inch", price: 150 } }];
    const { d } = await boot({ cart });
    check("the item is still in the order", $$(d, ".co-line").length === 1);
    check("it is flagged as out of stock", !!$(d, ".co-flag"), "no flag");
    check("the flag explains what happens", /WhatsApp/.test($(d, ".co-flag").textContent));
  }

  section("4. Pot suggestions on the checkout page");
  {
    const { w, d } = await boot({ cart: CART });
    check("suggestion block shown", !$(d, "#suggest-block").hidden);

    const cards = $$(d, ".suggest-card");
    check("up to three pots suggested", cards.length > 0 && cards.length <= 3, "got " + cards.length);
    check("each says which plant it fits", $$(d, ".suggest-fit").length === cards.length);
    check("the fit line names a plant in the cart",
      /Aglaonema Anjuman|Green ZZ Plant/.test($(d, ".suggest-fit").textContent),
      $(d, ".suggest-fit").textContent);
    check("only pots are suggested",
      cards.every(c => /Pot|Planter/i.test($(c, ".suggest-name").textContent)),
      cards.map(c => $(c, ".suggest-name").textContent).join(" | "));

    const before = w.GVC.cart.count();
    click(w, $(cards[0], "[data-add]"));
    check("a suggested pot can be added", w.GVC.cart.count() === before + 1);
  }

  section("5. The form still validates");
  {
    const { w, d } = await boot({ cart: CART });

    click(w, $(d, "#place-order"));
    check("blank name is caught", $(d, "#err-name").classList.contains("show"));
    check("blank phone is caught", $(d, "#err-phone").classList.contains("show"));
    check("nothing was sent", !$(d, "#order-done").hidden === false);

    type(w, $(d, "#cust-name"), "Meera Sharma");
    type(w, $(d, "#cust-phone"), "12345");
    click(w, $(d, "#place-order"));
    check("a bad mobile number is caught", $(d, "#err-phone").classList.contains("show"));

    type(w, $(d, "#cust-phone"), "9876543210");
    type(w, $(d, "#cust-email"), "not-an-email");
    click(w, $(d, "#place-order"));
    check("a bad email is caught", $(d, "#err-email").classList.contains("show"));

    /* Delivery needs an address */
    type(w, $(d, "#cust-email"), "");
    const deliveryRadio = $$(d, 'input[name="fulfilment"]').find(r => r.value === "delivery");
    deliveryRadio.checked = true;
    deliveryRadio.dispatchEvent(new w.Event("change", { bubbles: true }));
    check("address field appears for delivery", !$(d, "#address-field").hidden);
    click(w, $(d, "#place-order"));
    check("a missing address is caught", $(d, "#err-address").classList.contains("show"));
  }

  section("6. Placing an order");
  {
    const { w, d, opened, pdfLoaded } = await boot({ cart: CART });
    check("the PDF library loaded", pdfLoaded && !!w.jspdf, "jspdf missing");

    let savedAs = null;
    if (w.jspdf) {
      const RealDoc = w.jspdf.jsPDF;
      w.jspdf.jsPDF = function (...a) {
        const doc = new RealDoc(...a);
        const realSave = doc.save.bind(doc);
        doc.save = (name) => { savedAs = name; return realSave(name); };
        return doc;
      };
      Object.assign(w.jspdf.jsPDF, RealDoc);
      w.jspdf.jsPDF.prototype = RealDoc.prototype;
    }

    type(w, $(d, "#cust-name"), "Meera Sharma");
    type(w, $(d, "#cust-phone"), "9876543210");
    type(w, $(d, "#order-notes"), "Please pack the ZZ plant carefully");
    $(d, "#is-gift").checked = true;
    $(d, "#is-gift").dispatchEvent(new w.Event("change", { bubbles: true }));
    type(w, $(d, "#gift-message"), "Happy housewarming!");

    click(w, $(d, "#place-order"));

    check("the success panel is shown", !$(d, "#order-done").hidden);
    check("an order id was issued", /^GVC-\d{6}-\d+$/.test($(d, "#done-order-id").textContent),
      $(d, "#done-order-id").textContent);
    check("the PDF is NOT force-saved when the nursery got it",
      !savedAs, "it downloaded anyway: " + savedAs);

    check("WhatsApp was opened", opened.length === 1, JSON.stringify(opened));
    const msg = decodeURIComponent(opened[0]);
    check("it goes to the shop's number", msg.indexOf("wa.me/919617765000") !== -1);
    check("the message lists both items",
      msg.indexOf("Aglaonema Anjuman · 3 Inch") !== -1 && msg.indexOf("Green ZZ Plant · 10 Inch") !== -1,
      msg.slice(0, 200));
    check("quantities and line totals are in the message",
      msg.indexOf("2 × Rs.200 = Rs.400") !== -1, msg.slice(msg.indexOf("Items"), msg.indexOf("Items") + 160));
    check("the order total is in the message", msg.indexOf("Rs.1,600") !== -1);
    check("the customer's details are in the message",
      msg.indexOf("Meera Sharma") !== -1 && msg.indexOf("+91 9876543210") !== -1);
    check("the notes are in the message", msg.indexOf("pack the ZZ plant carefully") !== -1);
    check("the gift message is in there", msg.indexOf("Happy housewarming!") !== -1);
    check("plant codes reach the nursery",
      msg.indexOf("[AGL-101]") !== -1 && msg.indexOf("[ZAM-105]") !== -1,
      msg.slice(msg.indexOf("Items"), msg.indexOf("Items") + 180));

    /* Re-open and re-download still work */
    click(w, $(d, "#reopen-whatsapp"));
    check("WhatsApp can be reopened", opened.length === 2);
    savedAs = null;
    click(w, $(d, "#redownload"));
    check("the PDF can be downloaded again", !!savedAs);
  }

  section("7. An empty cart");
  {
    const { d } = await boot({ cart: [] });
    check("empty state shown", !$(d, "#checkout-empty").hidden);
    check("the form is hidden", $(d, "#checkout-live").hidden);
    check("there's a way back to the shop", !!$(d, '#checkout-empty a[href*="index.html"]'));
  }

  section("8. Checkout survives the sheet being down");
  {
    const { w, d, opened } = await boot({ cart: CART, sheetFails: true });
    check("items still listed from the saved copy", $$(d, ".co-line").length === 2);
    check("saved prices are used", w.GVC.cart.subtotal() === 1600, String(w.GVC.cart.subtotal()));
    check("names still readable", /Aglaonema Anjuman/.test($(d, "#checkout-lines").textContent));

    type(w, $(d, "#cust-name"), "Meera Sharma");
    type(w, $(d, "#cust-phone"), "9876543210");
    click(w, $(d, "#place-order"));
    check("an order can still be placed", !$(d, "#order-done").hidden);
    check("WhatsApp still opens", opened.length === 1);
  }

  section("9. The PDF reaches the nursery on its own");
  {
    const { w, d, posted, opened } = await boot({ cart: CART });
    type(w, $(d, "#cust-name"), "Meera Sharma");
    type(w, $(d, "#cust-phone"), "9876543210");
    type(w, $(d, "#order-notes"), "Pack the ZZ plant carefully");
    click(w, $(d, "#place-order"));
    await new Promise(r => setTimeout(r, 60));

    check("the order was posted to the inbox", posted.length === 1, JSON.stringify(posted.map(p => p.url)));

    const sent = JSON.parse(posted[0].body);
    check("the PDF travels with it", typeof sent.pdfBase64 === "string" && sent.pdfBase64.length > 1000,
      "base64 length " + (sent.pdfBase64 || "").length);
    check("it really is a PDF",
      Buffer.from(sent.pdfBase64, "base64").slice(0, 5).toString() === "%PDF-",
      Buffer.from(sent.pdfBase64 || "", "base64").slice(0, 8).toString());
    check("the customer's details go too",
      sent.customer.name === "Meera Sharma" && sent.customer.phone === "9876543210");
    check("every item goes, with codes",
      sent.items.length === 2 && sent.items[0].code === "AGL-101", JSON.stringify(sent.items[0]));
    check("the total goes", sent.subtotal === 1600);
    check("the notes go", /Pack the ZZ plant/.test(sent.notes));
    check("a readable copy of the message goes too", /Aglaonema/.test(sent.message));

    check("no preflight — sent as a simple request",
      /text\/plain/.test(posted[0].init.headers["Content-Type"]), JSON.stringify(posted[0].init.headers));

    check("the customer is told it arrived",
      /reached the nursery/i.test($(d, "#delivery-title").textContent),
      $(d, "#delivery-title").textContent);
    check("they can still grab a copy if they want", !$(d, "#redownload").hidden);
    check("WhatsApp still opens for them", opened.length === 1);
  }

  section("10. When automatic delivery fails");
  {
    /* Server error — the PDF must land on the customer's device */
    const a = await boot({ cart: CART, inboxFails: "http" });
    let savedAs = null;
    const RealDoc = a.w.jspdf.jsPDF;
    a.w.jspdf.jsPDF = function (...args) {
      const doc = new RealDoc(...args);
      const realSave = doc.save.bind(doc);
      doc.save = (n) => { savedAs = n; return realSave(n); };
      return doc;
    };
    Object.assign(a.w.jspdf.jsPDF, RealDoc);
    a.w.jspdf.jsPDF.prototype = RealDoc.prototype;

    type(a.w, $(a.d, "#cust-name"), "Meera Sharma");
    type(a.w, $(a.d, "#cust-phone"), "9876543210");
    click(a.w, $(a.d, "#place-order"));
    await new Promise(r => setTimeout(r, 60));

    check("the order still goes through", !$(a.d, "#order-done").hidden);
    check("the PDF falls back to a download", !!savedAs, "nothing was saved");
    check("the customer is asked to attach it",
      /attach/i.test($(a.d, "#delivery-note").textContent), $(a.d, "#delivery-note").textContent);
    check("WhatsApp still opens", a.opened.length === 1);

    /* Blocked by CORS — retried fire-and-forget, PDF saved anyway */
    const b = await boot({ cart: CART, inboxFails: "cors" });
    type(b.w, $(b.d, "#cust-name"), "Meera Sharma");
    type(b.w, $(b.d, "#cust-phone"), "9876543210");
    click(b.w, $(b.d, "#place-order"));
    await new Promise(r => setTimeout(r, 60));
    check("a blocked reply triggers a second, no-cors attempt",
      b.posted.length === 2 && b.posted[1].init.mode === "no-cors",
      JSON.stringify(b.posted.map(p => (p.init || {}).mode)));
    check("and the order still completes", !$(b.d, "#order-done").hidden);

    /* No inbox configured — behaves like before */
    const c = await boot({ cart: CART, inbox: false });
    let cSaved = null;
    const RD = c.w.jspdf.jsPDF;
    c.w.jspdf.jsPDF = function (...args) {
      const doc = new RD(...args);
      const rs = doc.save.bind(doc);
      doc.save = (n) => { cSaved = n; return rs(n); };
      return doc;
    };
    Object.assign(c.w.jspdf.jsPDF, RD);
    c.w.jspdf.jsPDF.prototype = RD.prototype;

    type(c.w, $(c.d, "#cust-name"), "Meera Sharma");
    type(c.w, $(c.d, "#cust-phone"), "9876543210");
    click(c.w, $(c.d, "#place-order"));
    await new Promise(r => setTimeout(r, 60));
    check("nothing is posted when no inbox is set", c.posted.length === 0);
    check("the PDF downloads as it used to", !!cSaved, "nothing saved");
    check("wording doesn't blame anyone",
      /saved/i.test($(c.d, "#delivery-title").textContent), $(c.d, "#delivery-title").textContent);
  }

  section("11. Gift extras");
  {
    const { w, d } = await boot({ cart: CART });

    check("extras are hidden until it's a gift", $(d, "#gift-extras").hidden);
    const cards = $$(d, ".gift-extra");
    check("all three extras are offered", cards.length === 3, "got " + cards.length);
    check("box packing shows its price", /Gift box packing/.test(cards[0].textContent) && /₹50/.test(cards[0].textContent),
      cards[0].textContent.replace(/\s+/g, " ").trim());
    check("gift bag shows its price", /Gift bag/.test(cards[1].textContent) && /₹25/.test(cards[1].textContent));
    check("the tag is free", /Custom message tag/.test(cards[2].textContent) && /Free/.test(cards[2].textContent));

    const giftBox = $(d, "#is-gift");
    giftBox.checked = true;
    giftBox.dispatchEvent(new w.Event("change", { bubbles: true }));
    check("ticking gift reveals the extras", !$(d, "#gift-extras").hidden);
    check("the message field waits for the tag", $(d, "#gift-field").hidden);

    /* Multi-select */
    const boxInput = $(cards[0], "input");
    boxInput.checked = true;
    boxInput.dispatchEvent(new w.Event("change", { bubbles: true }));
    check("choosing box packing adds ₹50", /₹1,650/.test($(d, "#summary-rows").textContent),
      $(d, "#summary-rows").textContent.replace(/\s+/g, " ").trim());
    check("the chosen card is marked", $$(d, ".gift-extra")[0].classList.contains("chosen"));

    const bagInput = $($$(d, ".gift-extra")[1], "input");
    bagInput.checked = true;
    bagInput.dispatchEvent(new w.Event("change", { bubbles: true }));
    check("more than one can be chosen at once", /₹1,675/.test($(d, "#summary-rows").textContent),
      $(d, "#summary-rows").textContent.replace(/\s+/g, " ").trim());
    check("each extra gets its own summary line",
      /Gift box packing/.test($(d, "#summary-rows").textContent) && /Gift bag/.test($(d, "#summary-rows").textContent));

    const tagInput = $($$(d, ".gift-extra")[2], "input");
    tagInput.checked = true;
    tagInput.dispatchEvent(new w.Event("change", { bubbles: true }));
    check("the tag reveals the message field", !$(d, "#gift-field").hidden);
    check("a free extra doesn't change the total", /₹1,675/.test($(d, "#summary-rows").textContent));

    /* Unticking the master clears everything */
    giftBox.checked = false;
    giftBox.dispatchEvent(new w.Event("change", { bubbles: true }));
    check("unticking gift hides the extras", $(d, "#gift-extras").hidden);
    check("and the total drops back", /₹1,600/.test($(d, "#summary-rows").textContent),
      $(d, "#summary-rows").textContent.replace(/\s+/g, " ").trim());
    check("no extra stays selected", !$$(d, ".gift-extra").some(c => c.classList.contains("chosen")));
  }

  section("12. Gift extras reach the order");
  {
    const { w, d, posted, opened } = await boot({ cart: CART });

    const giftBox = $(d, "#is-gift");
    giftBox.checked = true;
    giftBox.dispatchEvent(new w.Event("change", { bubbles: true }));
    ["box", "tag"].forEach(id => {
      const input = $($$(d, ".gift-extra").find(c => c.dataset.extra === id), "input");
      input.checked = true;
      input.dispatchEvent(new w.Event("change", { bubbles: true }));
    });
    type(w, $(d, "#gift-message"), "Happy housewarming, Meera!");
    type(w, $(d, "#cust-name"), "Meera Sharma");
    type(w, $(d, "#cust-phone"), "9876543210");
    click(w, $(d, "#place-order"));
    await new Promise(r => setTimeout(r, 60));

    const sent = JSON.parse(posted[0].body);
    check("the extras go to the nursery", sent.extras.length === 2, JSON.stringify(sent.extras));
    check("with their prices", sent.extrasTotal === 50, String(sent.extrasTotal));
    check("the total includes them", sent.total === 1650, String(sent.total));
    check("the items subtotal is separate", sent.subtotal === 1600);

    const msg = decodeURIComponent(opened[0]);
    check("WhatsApp lists the extras", /Gift box packing/.test(msg) && /Custom message tag/.test(msg),
      msg.slice(msg.indexOf("Gift"), msg.indexOf("Gift") + 160));
    check("WhatsApp shows the corrected total", /Rs.1,650/.test(msg));
    check("the tag message is in the message", /Happy housewarming/.test(msg));
    check("it really is a PDF",
      Buffer.from(sent.pdfBase64, "base64").slice(0, 5).toString() === "%PDF-");
  }

  section("13. Which pot goes with which plant");
  {
    const paired = [
      { id: "AGL-101", qty: 1, snap: { name: "Aglaonema Anjuman · 3 Inch", emoji: "🌿", bg: "#2d5a27", tag: "3 Inch", price: 200 } },
      { id: "POT-203", qty: 1, snap: { name: "Ivory Stoneware Pot · 4 Inch", emoji: "🏺", bg: "#8a9a80", tag: "4 Inch", price: 349 },
        meta: { forPlant: "AGL-101", forPlantName: "Aglaonema Anjuman · 3 Inch" } },
    ];
    const { w, d, posted } = await boot({ cart: paired });

    check("the pairing shows on the checkout line", !!$(d, ".co-pair"), "no pairing line");
    check("it names the plant", /Aglaonema Anjuman/.test($(d, ".co-pair").textContent),
      $(d, ".co-pair").textContent);
    check("only the pot carries a pairing", $$(d, ".co-pair").length === 1);

    type(w, $(d, "#cust-name"), "Meera Sharma");
    type(w, $(d, "#cust-phone"), "9876543210");
    click(w, $(d, "#place-order"));
    await new Promise(r => setTimeout(r, 60));

    const sent = JSON.parse(posted[0].body);
    const pot = sent.items.find(i => i.code === "POT-203");
    check("the pairing reaches the nursery", pot && pot.pairedWith === "Aglaonema Anjuman · 3 Inch",
      JSON.stringify(pot));
  }

  console.log("\n" + "─".repeat(56));
  console.log(pass + " passed, " + fail + " failed");
  if (fail) { console.log("\nFailures:"); failures.forEach(f => console.log("  • " + f)); process.exit(1); }
})().catch(err => { console.error("\nCRASH:", err); process.exit(1); });
