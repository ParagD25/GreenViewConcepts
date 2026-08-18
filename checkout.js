/* ═══════════════════════════════════════════════════════════
   GREEN VIEW CONCEPTS — CHECKOUT
   Builds the order, draws the PDF, hands off to WhatsApp.
   ═══════════════════════════════════════════════════════════ */

let lastOrder = null;   // kept so the PDF and message can be re-opened

document.addEventListener("DOMContentLoaded", () => {
  render();
  wireForm();
  ensurePdfLibrary();
  document.addEventListener("cart:change", render);
});

/* The PDF library ships with the site (vendor/jspdf.umd.min.js). If that
   file is missing after an upload, fall back to the public copy. This runs
   at page load, never at submit time — waiting there would let the browser
   block the WhatsApp tab. */
function ensurePdfLibrary() {
  if (window.jspdf) return;
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  script.onerror = () => console.warn("jsPDF unavailable — orders will still send on WhatsApp");
  document.head.appendChild(script);
}

/* ═══ RENDER ═══════════════════════════════════════════════ */

function render() {
  const lines = GVC.cart.lines();
  const live = document.getElementById("checkout-live");
  const empty = document.getElementById("checkout-empty");
  const done = document.getElementById("order-done");

  if (done && !done.hidden) return;   // don't redraw behind the success panel

  const isEmpty = lines.length === 0;
  live.hidden = isEmpty;
  empty.hidden = !isEmpty;
  if (isEmpty) return;

  renderLines(lines);
  renderSummary(lines);
  renderSuggestions(lines);
}

function renderLines(lines) {
  const host = document.getElementById("checkout-lines");
  host.innerHTML = lines.map(line => `
    <div class="co-line">
      <div class="co-thumb" style="background:linear-gradient(135deg, ${line.bg}, ${line.bg}dd)">
        <span>${line.emoji}</span>
        <em class="co-thumb-tag">${line.tag}</em>
      </div>
      <div class="co-detail">
        <div class="co-name">${line.name}</div>
        <div class="co-unit">${GVC.money(line.price)} each</div>
        <button class="co-remove" data-remove="${line.id}">Remove</button>
      </div>
      <div class="qty-stepper" role="group" aria-label="Quantity for ${line.name}">
        <button class="qty-btn" data-dec="${line.id}" aria-label="Reduce quantity">−</button>
        <span class="qty-value">${line.qty}</span>
        <button class="qty-btn" data-inc="${line.id}" aria-label="Increase quantity">+</button>
      </div>
      <div class="co-total">${GVC.money(line.total)}</div>
    </div>`).join("");

  host.onclick = (e) => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    const del = e.target.closest("[data-remove]");
    if (inc) GVC.cart.add(inc.dataset.inc, 1);
    if (dec) GVC.cart.setQty(dec.dataset.dec, GVC.cart.qtyOf(dec.dataset.dec) - 1);
    if (del) {
      const id = del.dataset.remove;
      const product = GVC.product(id);
      const qty = GVC.cart.qtyOf(id);
      GVC.cart.remove(id);
      GVC.toast(`${product.name} removed`, "Undo", () => GVC.cart.add(id, qty));
    }
  };
}

function renderSummary(lines) {
  const count = GVC.cart.count();
  const subtotal = GVC.cart.subtotal();
  const delivery = currentFulfilment() === "delivery";

  document.getElementById("summary-rows").innerHTML = `
    <div class="sum-row"><span>${count} ${count === 1 ? "item" : "items"}</span><span>${GVC.money(subtotal)}</span></div>
    <div class="sum-row muted"><span>${delivery ? "Delivery in Indore" : "Pickup at nursery"}</span><span>${delivery ? "Confirmed on chat" : "No charge"}</span></div>
    <div class="sum-row total"><span>${delivery ? "Total before delivery" : "Order total"}</span><span>${GVC.money(subtotal)}</span></div>`;
}

function renderSuggestions(lines) {
  const inCart = lines.map(l => l.id);
  const cartCats = lines.flatMap(l => GVC.product(l.id).cats);
  const hasPlant = cartCats.some(c => c === "indoor" || c === "succulent");
  const hasPot = cartCats.includes("pots");

  const want = hasPlant && !hasPot ? "pots" : hasPot ? "indoor" : "trays";
  const pool = CATALOG.filter(p => p.inStock && !inCart.includes(p.id));
  const picks = pool.filter(p => p.cats.includes(want)).slice(0, 3);
  while (picks.length < 3) {
    const filler = pool.find(p => !picks.includes(p));
    if (!filler) break;
    picks.push(filler);
  }

  const block = document.getElementById("suggest-block");
  const row = document.getElementById("suggest-row");
  if (picks.length === 0) { block.hidden = true; return; }
  block.hidden = false;

  row.innerHTML = picks.map(p => `
    <div class="suggest-card">
      <div class="suggest-thumb" style="background:linear-gradient(135deg, ${p.bg}, ${p.bg}dd)">${p.emoji}</div>
      <div class="suggest-name">${p.name}</div>
      <div class="suggest-price">${GVC.money(p.price)}</div>
      <button class="btn-add small" data-add="${p.id}">Add</button>
    </div>`).join("");

  row.onclick = (e) => {
    const add = e.target.closest("[data-add]");
    if (!add) return;
    GVC.cart.add(add.dataset.add, 1);
    GVC.toast(`${GVC.product(add.dataset.add).name} added`);
  };
}

/* ═══ FORM ═════════════════════════════════════════════════ */

function currentFulfilment() {
  const picked = document.querySelector('input[name="fulfilment"]:checked');
  return picked ? picked.value : "pickup";
}

function wireForm() {
  document.getElementById("delivery-note-text").textContent = SHOP.deliveryNote;

  document.querySelectorAll('input[name="fulfilment"]').forEach(radio => {
    radio.addEventListener("change", () => {
      document.getElementById("address-field").hidden = currentFulfilment() !== "delivery";
      renderSummary(GVC.cart.lines());
    });
  });

  document.getElementById("is-gift").addEventListener("change", (e) => {
    document.getElementById("gift-field").hidden = !e.target.checked;
  });

  const phone = document.getElementById("cust-phone");
  phone.addEventListener("input", () => {
    phone.value = phone.value.replace(/\D/g, "").slice(0, 10);
  });

  [["cust-name", "err-name"], ["cust-phone", "err-phone"],
   ["cust-email", "err-email"], ["cust-address", "err-address"]]
    .forEach(([inputId, errorId]) => {
      const input = document.getElementById(inputId);
      input.addEventListener("input", () => {
        if (document.getElementById(errorId).classList.contains("show")) showError(errorId, "");
      });
    });

  document.getElementById("place-order").addEventListener("click", placeOrder);

  document.getElementById("redownload").addEventListener("click", () => {
    if (!lastOrder) return;
    try {
      buildPdf(lastOrder).save(lastOrder.filename);
      lastOrder.pdfSaved = true;
      showDone(lastOrder);
      GVC.toast("PDF saved to your device");
    } catch (err) {
      console.error("PDF failed:", err);
      GVC.toast("Still can't build the PDF — send the WhatsApp message instead");
    }
  });

  document.getElementById("reopen-whatsapp").addEventListener("click", () => {
    if (!lastOrder) return;
    window.open(whatsappUrl(lastOrder), "_blank", "noopener");
  });

  document.getElementById("copy-order").addEventListener("click", async () => {
    if (!lastOrder) return;
    try {
      await navigator.clipboard.writeText(orderText(lastOrder));
      GVC.toast("Order text copied");
    } catch (e) {
      GVC.toast("Couldn't copy — open WhatsApp instead");
    }
  });

  document.getElementById("clear-cart").addEventListener("click", () => {
    GVC.cart.clear();
    window.location.href = "index.html";
  });
}

function showError(id, message) {
  const el = document.getElementById(id);
  el.textContent = message || "";
  el.classList.toggle("show", !!message);
  const input = el.closest(".field").querySelector("input, textarea");
  if (input) input.classList.toggle("invalid", !!message);
}

function validate() {
  const name = document.getElementById("cust-name").value.trim();
  const phone = document.getElementById("cust-phone").value.trim();
  const email = document.getElementById("cust-email").value.trim();
  const address = document.getElementById("cust-address").value.trim();
  const delivery = currentFulfilment() === "delivery";
  let firstBad = null;

  showError("err-name", ""); showError("err-phone", "");
  showError("err-email", ""); showError("err-address", "");

  if (name.length < 2) {
    showError("err-name", "Enter the name we should ask for.");
    firstBad = firstBad || "cust-name";
  }
  if (!/^[6-9]\d{9}$/.test(phone)) {
    showError("err-phone", "Enter a 10-digit Indian mobile number.");
    firstBad = firstBad || "cust-phone";
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    showError("err-email", "Check the email address, or leave it blank.");
    firstBad = firstBad || "cust-email";
  }
  if (delivery && address.length < 12) {
    showError("err-address", "Add the full address with a landmark.");
    firstBad = firstBad || "cust-address";
  }

  if (firstBad) {
    const el = document.getElementById(firstBad);
    el.focus();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    return null;
  }

  return { name, phone, email, address, delivery };
}

function orderId() {
  const d = new Date();
  const stamp = String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const rand = String(Math.floor(1 + Math.random() * 99));
  return `GVC-${stamp}-${rand}`;
}

function placeOrder() {
  const lines = GVC.cart.lines();
  if (lines.length === 0) { GVC.toast("Your cart is empty"); return; }

  const customer = validate();
  if (!customer) return;

  const id = orderId();
  const order = {
    id: id,
    filename: `${id}.pdf`,
    placedAt: new Date(),
    customer: customer,
    lines: lines,
    count: GVC.cart.count(),
    subtotal: GVC.cart.subtotal(),
    notes: document.getElementById("order-notes").value.trim(),
    isGift: document.getElementById("is-gift").checked,
    giftMessage: document.getElementById("gift-message").value.trim(),
  };

  /* 1 — PDF onto the customer's device */
  let pdfDoc = null;
  try {
    pdfDoc = buildPdf(order);
    pdfDoc.save(order.filename);
    order.pdfSaved = true;
  } catch (err) {
    console.error("PDF failed:", err);
    order.pdfSaved = false;
    GVC.toast("The PDF didn't generate — your order can still go on WhatsApp");
  }

  /* 2 — WhatsApp, opened from the click so it isn't blocked */
  window.open(whatsappUrl(order), "_blank", "noopener");

  /* 3 — Optional: hand the whole thing to a backend, if one is set up */
  if (SHOP.orderWebhookUrl && pdfDoc) {
    try {
      fetch(SHOP.orderWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          placedAt: order.placedAt.toISOString(),
          customer: order.customer,
          items: order.lines.map(l => ({ name: l.name, qty: l.qty, price: l.price, total: l.total })),
          subtotal: order.subtotal,
          notes: order.notes,
          giftMessage: order.isGift ? order.giftMessage : "",
          pdfBase64: pdfDoc.output("datauristring").split(",")[1],
        }),
      }).catch(err => console.warn("Webhook failed:", err));
    } catch (err) {
      console.warn("Webhook failed:", err);
    }
  }

  lastOrder = order;
  showDone(order);
}

function showDone(order) {
  document.getElementById("checkout-head").hidden = true;
  document.getElementById("checkout-live").hidden = true;
  document.getElementById("checkout-empty").hidden = true;
  const done = document.getElementById("order-done");
  done.hidden = false;
  document.getElementById("done-order-id").textContent = order.id;

  const step = document.getElementById("pdf-step");
  if (order.pdfSaved) {
    step.querySelector("strong").textContent = "Your PDF has been saved";
    step.querySelector("p").innerHTML =
      `Check your Downloads folder — <span>${order.filename}</span>. Keep it for your records.`;
    document.getElementById("redownload").textContent = "Download the PDF again";
  } else {
    step.querySelector("strong").textContent = "The PDF didn't generate";
    step.querySelector("p").textContent =
      "Nothing is lost — the WhatsApp message below carries every item, the total and your details. You can try the PDF again, or just send the message.";
    document.getElementById("redownload").textContent = "Try the PDF again";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ═══ WHATSAPP MESSAGE ═════════════════════════════════════ */

function orderText(order) {
  const c = order.customer;
  const rupee = (n) => "Rs." + Number(n).toLocaleString("en-IN");

  let items = order.lines.map((l, i) =>
    `${i + 1}. ${l.name} — ${l.qty} × ${rupee(l.price)} = ${rupee(l.total)}`).join("\n");

  /* Very long carts get trimmed so the link still opens on every phone */
  if (items.length > 1100) {
    const shown = order.lines.slice(0, 12).map((l, i) =>
      `${i + 1}. ${l.name} — ${l.qty} × ${rupee(l.price)} = ${rupee(l.total)}`).join("\n");
    items = shown + `\n…and ${order.lines.length - 12} more — full list is in the attached PDF.`;
  }

  const parts = [
    "*New order — Green View Concepts*",
    `Order ID: ${order.id}`,
    "",
    "*Customer*",
    `Name: ${c.name}`,
    `WhatsApp: +91 ${c.phone}`,
  ];
  if (c.email) parts.push(`Email: ${c.email}`);
  parts.push(c.delivery ? "Fulfilment: Home delivery in Indore" : "Fulfilment: Pickup at the nursery");
  if (c.delivery) parts.push(`Address: ${c.address}`);

  parts.push("", "*Items*", items, "");
  parts.push(`Items: ${order.count}`);
  parts.push(`*Order total: ${rupee(order.subtotal)}*`);
  if (c.delivery) parts.push("_Delivery charge to be confirmed_");

  if (order.notes) parts.push("", `Notes: ${order.notes}`);
  if (order.isGift) parts.push("", `🎁 Gift order${order.giftMessage ? ` — card message: "${order.giftMessage}"` : ""}`);

  parts.push("", `PDF order summary: ${order.filename} (attaching from my device)`);

  return parts.join("\n");
}

function whatsappUrl(order) {
  return `https://wa.me/${SHOP.whatsappNumber}?text=${encodeURIComponent(orderText(order))}`;
}

/* ═══ PDF ══════════════════════════════════════════════════ */

/* Helvetica can only print Latin-1. Anything else (emoji, Devanagari,
   the ₹ sign) would come out as boxes, so it is stripped here — the
   WhatsApp message still carries the customer's text exactly as typed. */
function safe(value) {
  return String(value == null ? "" : value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u20B9/g, "Rs.")
    .replace(/[^\x20-\xFF\n]/g, "")
    .trim();
}

function buildPdf(order) {
  if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("jsPDF not loaded");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 42;
  const RIGHT = W - M;

  const FOREST = [45, 90, 39];
  const FOREST_DEEP = [26, 61, 22];
  const SAGE = [122, 158, 111];
  const CREAM = [249, 246, 240];
  const SAND = [232, 224, 210];
  const INK = [42, 42, 40];
  const INK_SOFT = [92, 92, 88];

  const rupee = (n) => "Rs. " + Number(n).toLocaleString("en-IN");

  /* ─── Header band ─── */
  doc.setFillColor.apply(doc, FOREST);
  doc.rect(0, 0, W, 96, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(19);
  doc.text("GREEN VIEW CONCEPTS", M, 42);
  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.setTextColor(206, 224, 200);
  doc.text("PLANT NURSERY   ·   INDORE   ·   EST. 2018", M, 57);
  doc.text("Near Bangali Square, Ring Road, Indore 452016   ·   +91 96177 65000", M, 74);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("ORDER SUMMARY", RIGHT, 42, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9.5);
  doc.text(order.id, RIGHT, 58, { align: "right" });
  doc.setFontSize(8.5);
  doc.setTextColor(206, 224, 200);
  doc.text(formatDate(order.placedAt), RIGHT, 74, { align: "right" });

  /* ─── Disclaimer strip ─── */
  doc.setFillColor.apply(doc, CREAM);
  doc.rect(0, 96, W, 24, "F");
  doc.setTextColor.apply(doc, INK_SOFT);
  doc.setFont("helvetica", "normal").setFontSize(8.2);
  doc.text("This is an order summary, not a tax invoice. The final amount and delivery charge are confirmed on WhatsApp before dispatch.", M, 111);

  let y = 152;

  /* ─── Customer panel ─── */
  const c = order.customer;
  const rows = [
    ["Name", safe(c.name)],
    ["WhatsApp", "+91 " + c.phone],
  ];
  if (c.email) rows.push(["Email", safe(c.email)]);
  rows.push(["Fulfilment", c.delivery ? "Home delivery in Indore" : "Pickup at the nursery"]);

  let addressLines = [];
  if (c.delivery) {
    addressLines = doc.splitTextToSize(safe(c.address), 300);
  }

  const panelH = 20 + rows.length * 17 + (addressLines.length ? addressLines.length * 12 : 0);

  sectionLabel("CUSTOMER DETAILS", y);
  y += 14;

  doc.setFillColor.apply(doc, CREAM);
  doc.setDrawColor.apply(doc, SAND);
  doc.setLineWidth(0.8);
  doc.rect(M, y, RIGHT - M, panelH, "FD");

  let ry = y + 24;
  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold").setFontSize(8);
    doc.setTextColor.apply(doc, SAGE);
    doc.text(label.toUpperCase(), M + 16, ry);
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.setTextColor.apply(doc, INK);
    doc.text(value, M + 108, ry);
    ry += 17;
  });

  if (addressLines.length) {
    doc.setFont("helvetica", "bold").setFontSize(8);
    doc.setTextColor.apply(doc, SAGE);
    doc.text("ADDRESS", M + 16, ry);
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.setTextColor.apply(doc, INK);
    addressLines.forEach((line, i) => doc.text(line, M + 108, ry + i * 12));
  }

  y += panelH + 26;

  /* ─── Items table ─── */
  const colNum = M + 14;
  const colItem = M + 36;
  const colUnit = 428;
  const colQty = 468;
  const colAmt = RIGHT - 12;
  const itemWidth = 250;

  sectionLabel("ITEMS ORDERED", y);
  y += 14;

  drawTableHead();

  order.lines.forEach((line, i) => {
    const nameLines = doc.splitTextToSize(safe(line.name), itemWidth);
    const rowH = Math.max(30, 16 + nameLines.length * 12 + 8);

    if (y + rowH > H - 150) {
      doc.addPage();
      y = 60;
      drawTableHead();
    }

    if (i % 2 === 1) {
      doc.setFillColor.apply(doc, CREAM);
      doc.rect(M, y, RIGHT - M, rowH, "F");
    }

    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.setTextColor.apply(doc, SAGE);
    doc.text(String(i + 1).padStart(2, "0"), colNum, y + 20);

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.setTextColor.apply(doc, INK);
    nameLines.forEach((l, n) => doc.text(l, colItem, y + 19 + n * 12));

    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.setTextColor.apply(doc, INK_SOFT);
    doc.text(safe(line.tag), colItem, y + 19 + nameLines.length * 12);

    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.setTextColor.apply(doc, INK);
    doc.text(rupee(line.price), colUnit, y + 20, { align: "right" });
    doc.text(String(line.qty), colQty, y + 20, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(rupee(line.total), colAmt, y + 20, { align: "right" });

    doc.setDrawColor.apply(doc, SAND);
    doc.setLineWidth(0.5);
    doc.line(M, y + rowH, RIGHT, y + rowH);

    y += rowH;
  });

  /* ─── Totals ─── */
  y += 18;
  if (y > H - 190) { doc.addPage(); y = 60; }

  const boxX = 300;
  const boxW = RIGHT - boxX;

  totalRow("Items", `${order.count} ${order.count === 1 ? "unit" : "units"}`, false);
  totalRow("Subtotal", rupee(order.subtotal), false);
  totalRow("Delivery", c.delivery ? "Confirmed on WhatsApp" : "Pickup - no charge", false);

  y += 6;
  doc.setFillColor.apply(doc, FOREST);
  doc.rect(boxX, y, boxW, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(9.5);
  doc.text(c.delivery ? "TOTAL BEFORE DELIVERY" : "ORDER TOTAL", boxX + 14, y + 21);
  doc.setFontSize(13);
  doc.text(rupee(order.subtotal), RIGHT - 14, y + 22, { align: "right" });
  y += 34;

  /* ─── Notes ─── */
  const noteBits = [];
  if (order.isGift) {
    noteBits.push("Gift order" + (order.giftMessage ? ' - card message: "' + safe(order.giftMessage) + '"' : ""));
  }
  if (order.notes) noteBits.push(safe(order.notes));

  if (noteBits.length) {
    const wrappedBits = noteBits.map(bit => doc.splitTextToSize(bit, RIGHT - M - 32));
    const noteH = 20 + wrappedBits.reduce((sum, w) => sum + w.length * 14, 0) + (wrappedBits.length - 1) * 6;

    y += 26;
    if (y + noteH > H - 90) { doc.addPage(); y = 60; }
    sectionLabel("NOTES FROM THE CUSTOMER", y);
    y += 12;

    doc.setFillColor.apply(doc, CREAM);
    doc.setDrawColor.apply(doc, SAND);
    doc.setLineWidth(0.8);
    doc.rect(M, y, RIGHT - M, noteH, "FD");

    let ny = y + 22;
    doc.setFont("helvetica", "normal").setFontSize(10);
    doc.setTextColor.apply(doc, INK);
    wrappedBits.forEach(wrapped => {
      wrapped.forEach(l => { doc.text(l, M + 16, ny); ny += 14; });
      ny += 6;
    });
    y += noteH;
  }

  /* ─── What happens next ─── */
  y += 30;
  if (y > H - 140) { doc.addPage(); y = 60; }
  sectionLabel("WHAT HAPPENS NEXT", y);
  y += 16;
  doc.setFont("helvetica", "normal").setFontSize(9.5);
  doc.setTextColor.apply(doc, INK_SOFT);
  [
    "1.  The nursery confirms availability and the final amount on WhatsApp.",
    c.delivery
      ? "2.  Delivery charge is shared for your area, then a slot is fixed with you."
      : "2.  Your plants are kept aside and ready for pickup, 10 AM to 9 PM.",
    "3.  Payment is made on pickup or on delivery - cash or UPI.",
    "4.  A printed care card comes with every plant.",
  ].forEach(l => { doc.text(l, M + 2, y); y += 15; });

  stampFooters();
  return doc;

  /* ─── helpers ─── */

  function sectionLabel(text, atY) {
    doc.setFont("helvetica", "bold").setFontSize(8.5);
    doc.setTextColor.apply(doc, SAGE);
    doc.text(text, M, atY);
    doc.setDrawColor.apply(doc, SAND);
    doc.setLineWidth(0.8);
    const textW = doc.getTextWidth(text);
    doc.line(M + textW + 12, atY - 3, RIGHT, atY - 3);
  }

  function drawTableHead() {
    doc.setFillColor.apply(doc, FOREST_DEEP);
    doc.rect(M, y, RIGHT - M, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold").setFontSize(8);
    doc.text("#", colNum, y + 15);
    doc.text("ITEM", colItem, y + 15);
    doc.text("UNIT PRICE", colUnit, y + 15, { align: "right" });
    doc.text("QTY", colQty, y + 15, { align: "center" });
    doc.text("AMOUNT", colAmt, y + 15, { align: "right" });
    y += 24;
  }

  function totalRow(label, value, bold) {
    doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(9.5);
    doc.setTextColor.apply(doc, INK_SOFT);
    doc.text(label, boxX + 14, y + 14);
    doc.setTextColor.apply(doc, INK);
    doc.text(value, RIGHT - 14, y + 14, { align: "right" });
    y += 20;
  }

  function stampFooters() {
    const pages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setDrawColor.apply(doc, SAND);
      doc.setLineWidth(0.8);
      doc.line(M, H - 58, RIGHT, H - 58);
      doc.setFont("helvetica", "normal").setFontSize(8);
      doc.setTextColor.apply(doc, INK_SOFT);
      doc.text("Green View Concepts Nursery  ·  greenviewconcepts@gmail.com  ·  Open 10 AM - 9 PM, all week", M, H - 40);
      doc.text(`Page ${p} of ${pages}`, RIGHT, H - 40, { align: "right" });
    }
  }
}

function formatDate(date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hh = date.getHours();
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${h12}:${mm} ${ampm}`;
}