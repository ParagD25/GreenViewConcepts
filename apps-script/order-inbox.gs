/**
 * GREEN VIEW CONCEPTS — ORDER INBOX
 *
 * Receives every order from the website, emails you the PDF, files a
 * copy in Drive, and logs a row in a spreadsheet. Free, no server.
 *
 * ─────────────────────────────────────────────────────────────
 * SETTING IT UP (about five minutes, once)
 * ─────────────────────────────────────────────────────────────
 *
 *  1. Go to script.google.com and press "New project".
 *  2. Delete whatever is in the editor and paste this whole file in.
 *  3. Change EMAIL_TO below to the address that should receive orders.
 *  4. Press "Deploy" → "New deployment".
 *       - Click the gear next to "Select type" and pick "Web app"
 *       - Description:      Order inbox
 *       - Execute as:       Me
 *       - Who has access:   Anyone            ← this matters
 *     Press Deploy. Google will ask you to authorise it; approve.
 *  5. Copy the "Web app" URL it gives you. It looks like
 *       https://script.google.com/macros/s/AKfy..../exec
 *  6. Paste it into catalog.js as orderInboxUrl.
 *
 * "Who has access: Anyone" sounds alarming but only means the website
 * may post to it. Nobody can read your orders through it — this script
 * never returns any.
 *
 * ─────────────────────────────────────────────────────────────
 * CHECKING IT WORKS
 * ─────────────────────────────────────────────────────────────
 * Open the Web app URL in a browser. You should see "Order inbox is
 * running." Then place a test order on the site — the email should
 * arrive within a few seconds.
 *
 * If you change anything here, press Deploy → Manage deployments →
 * pencil icon → Version: New version → Deploy. Without a new version
 * the site keeps hitting the old code.
 */

// ─── Settings ────────────────────────────────────────────────

/** Where order emails go. Several addresses: separate with commas. */
var EMAIL_TO = "greenviewconceptsnursery@gmail.com";

/** Drive folder for the PDFs. Leave "" to file them at the top level. */
var DRIVE_FOLDER_NAME = "Green View Concepts Nursery Orders";

/** Set to false if you'd rather not keep a spreadsheet log. */
var LOG_TO_SHEET = true;

/** Name of the spreadsheet the log goes in. Created automatically. */
var LOG_SHEET_NAME = "Green View Concepts Nursery Orders Log";

// ─── Handlers ────────────────────────────────────────────────

function doGet() {
  return ContentService
    .createTextOutput("Order inbox is running.")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return reply({ ok: false, error: "empty request" });
    }

    var order = JSON.parse(e.postData.contents);
    var pdf = savePdf(order);

    sendEmail(order, pdf);
    if (LOG_TO_SHEET) logRow(order, pdf);

    return reply({ ok: true, orderId: order.orderId });
  } catch (err) {
    /* Email yourself the failure so an order is never lost silently. */
    try {
      MailApp.sendEmail(EMAIL_TO, "Green View — order FAILED to process",
        "An order came in but couldn't be handled.\n\n" + err + "\n\n" +
        (e && e.postData ? e.postData.contents.slice(0, 3000) : "(no body)"));
    } catch (e2) { /* nothing more we can do */ }

    return reply({ ok: false, error: String(err) });
  }
}

// ─── Pieces ──────────────────────────────────────────────────

function reply(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function savePdf(order) {
  if (!order.pdfBase64) return null;

  var bytes = Utilities.base64Decode(order.pdfBase64);
  var blob = Utilities.newBlob(bytes, "application/pdf",
    order.filename || (order.orderId + ".pdf"));

  var folder = DriveApp.getRootFolder();
  if (DRIVE_FOLDER_NAME) {
    var found = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    folder = found.hasNext() ? found.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME);
  }

  var file = folder.createFile(blob);
  return { blob: blob, url: file.getUrl() };
}

/* The site sends `total` (items plus gift extras). Older payloads
   only had `subtotal`, so fall back rather than showing nothing. */
function orderTotal(order) {
  if (order.total != null) return order.total;
  return (order.subtotal || 0) + (order.extrasTotal || 0);
}

function sendEmail(order, pdf) {
  var c = order.customer || {};
  var money = function (n) { return "Rs." + Number(n || 0).toLocaleString("en-IN"); };

  var extraRows = (order.extras || []).map(function (x) {
    return '<tr><td colspan="3" style="padding:4px 10px;text-align:right;color:#555">' +
      escapeHtml(x.label) + "</td>" +
      '<td style="padding:4px 10px;text-align:right;color:#555">' +
      (x.price > 0 ? money(x.price) : "Free") + "</td></tr>";
  }).join("");

  var rows = (order.items || []).map(function (i) {
    return "<tr>" +
      '<td style="padding:6px 10px;border-bottom:1px solid #eee">' + escapeHtml(i.name) + "</td>" +
      '<td style="padding:6px 10px;border-bottom:1px solid #eee;color:#777">' + escapeHtml(i.code || "") + "</td>" +
      '<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">' + i.qty + "</td>" +
      '<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">' + money(i.total) + "</td>" +
      "</tr>";
  }).join("");

  var html =
    '<div style="font-family:Arial,sans-serif;color:#222;max-width:640px">' +
    '<h2 style="color:#2d5a27;margin:0 0 4px">New order — ' + escapeHtml(order.orderId) + "</h2>" +
    '<p style="color:#777;margin:0 0 18px">' + escapeHtml(order.placedAt || "") + "</p>" +

    "<p><strong>" + escapeHtml(c.name || "") + "</strong><br>" +
    "WhatsApp: " + escapeHtml(c.phone || "") + "<br>" +
    (c.email ? "Email: " + escapeHtml(c.email) + "<br>" : "") +
    (c.fulfilment ? "Method: " + escapeHtml(c.fulfilment) + "<br>" : "") +
    (c.address ? "Address: " + escapeHtml(c.address) + "<br>" : "") +
    "</p>" +

    '<table style="border-collapse:collapse;width:100%;font-size:14px">' +
    '<tr style="background:#f3ede3">' +
    '<th style="padding:8px 10px;text-align:left">Item</th>' +
    '<th style="padding:8px 10px;text-align:left">Code</th>' +
    '<th style="padding:8px 10px">Qty</th>' +
    '<th style="padding:8px 10px;text-align:right">Total</th></tr>' +
    rows +
    '<tr><td colspan="3" style="padding:10px 10px 4px;text-align:right">Subtotal</td>' +
    '<td style="padding:10px 10px 4px;text-align:right">' + money(order.subtotal) + "</td></tr>" +
    extraRows +
    '<tr style="background:#f3ede3"><td colspan="3" style="padding:10px;text-align:right"><strong>Order total</strong></td>' +
    '<td style="padding:10px;text-align:right"><strong>' + money(orderTotal(order)) + "</strong></td></tr>" +
    "</table>" +

    (order.notes ? "<p><strong>Notes:</strong> " + escapeHtml(order.notes) + "</p>" : "") +
    (order.giftMessage ? "<p><strong>Gift message:</strong> " + escapeHtml(order.giftMessage) + "</p>" : "") +
    (pdf ? '<p><a href="' + pdf.url + '">Order sheet in Drive</a></p>' : "") +
    "</div>";

  var options = { htmlBody: html, name: "Green View Concepts" };
  if (pdf) options.attachments = [pdf.blob];
  if (c.email) options.replyTo = c.email;

  MailApp.sendEmail(EMAIL_TO,
    "New order " + order.orderId + " — " + (c.name || "customer") + " — Rs." + orderTotal(order),
    order.message || "",
    options);
}

/* Column order for the log. Change it and the header row is rebuilt
   on the next order. */
var LOG_HEADERS = [
  "Placed at", "Order ID", "Name", "WhatsApp", "Email",
  "Method", "Address", "Items", "Qty", "Subtotal",
  "Gift extras", "Extras total", "Order total",
  "Notes", "Gift message", "PDF",
];

function logRow(order, pdf) {
  var files = DriveApp.getFilesByName(LOG_SHEET_NAME);
  var sheet;

  if (files.hasNext()) {
    sheet = SpreadsheetApp.open(files.next()).getSheets()[0];
    ensureHeaders(sheet);
  } else {
    var created = SpreadsheetApp.create(LOG_SHEET_NAME);
    sheet = created.getSheets()[0];
    sheet.appendRow(LOG_HEADERS);
    sheet.setFrozenRows(1);
  }

  var c = order.customer || {};
  var items = (order.items || []).map(function (i) {
    return i.qty + " × " + i.name + " [" + (i.code || "") + "]" +
      (i.pairedWith ? " (for " + i.pairedWith + ")" : "");
  }).join("\n");

  var extras = (order.extras || []).map(function (x) {
    return x.label + (x.price > 0 ? " (Rs." + x.price + ")" : " (free)");
  }).join("\n");

  sheet.appendRow([
    order.placedAt || new Date(), order.orderId,
    c.name || "", c.phone || "", c.email || "",
    c.fulfilment || "", c.address || "",
    items, order.count || "", order.subtotal || "",
    extras, order.extrasTotal || 0, orderTotal(order),
    order.notes || "", order.giftMessage || "",
    pdf ? pdf.url : "",
  ]);
}

/* An older log won't have the gift columns. Rewrite the header row so
   new orders line up. Rows written before the change keep their old
   shape — clear them out if the mix bothers you. */
function ensureHeaders(sheet) {
  var width = Math.max(sheet.getLastColumn(), LOG_HEADERS.length);
  var current = sheet.getRange(1, 1, 1, width).getValues()[0];

  var same = LOG_HEADERS.every(function (h, i) { return current[i] === h; });
  if (same) return;

  sheet.getRange(1, 1, 1, LOG_HEADERS.length).setValues([LOG_HEADERS]);
  sheet.setFrozenRows(1);
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
