/* ═══════════════════════════════════════════════════════════
   GREEN VIEW CONCEPTS — DATA LAYER
   Reads your Google Sheets, turns the rows into products, and
   keeps the site standing if anything goes wrong on the way.

   You should never need to edit this file. Everything you can
   change lives in catalog.js.
   ═══════════════════════════════════════════════════════════ */

   window.GVCData = (function () {
    "use strict";
  
    const CACHE_KEY = "gvc_catalog_v1";
    const DRIVE_KEY = "gvc_drive_v1";
    const DRIVE_TTL = 24 * 60 * 60 * 1000;   // re-check folder photos once a day
    const TIMEOUT = 12000;
  
    /* Where the catalog currently came from. The gallery reads this
       to decide whether to show the "showing saved prices" note. */
    const state = {
      status: "idle",        // idle | loading | live | cached | fallback
      errors: [],            // human-readable, one per sheet that failed
      imageProblems: [],     // one per distinct photo problem
      sheetReports: [],      // per-sheet outcome, for diagnose()
      updatedAt: null,
      sheetsTried: 0,
      sheetsOk: 0,
    };
  
    const seenImageProblems = Object.create(null);
  
    /* Records a photo problem once, however many plants hit it. */
    function noteImageProblem(key, message) {
      if (seenImageProblems[key]) return;
      seenImageProblems[key] = true;
      state.imageProblems.push(message);
      document.dispatchEvent(new CustomEvent("catalog:images"));
    }
  
    /* ─── Tiny storage helpers that never throw ───────────────── */
  
    function cacheRead(key) {
      try { return JSON.parse(localStorage.getItem(key) || "null"); }
      catch (e) { return null; }
    }
  
    function cacheWrite(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch (e) { /* private window, or storage full — not fatal */ }
    }
  
    /* ─── Fetch with a timeout, so a hung request can't freeze
           the page forever ─────────────────────────────────────── */
  
    async function getText(url) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT);
      try {
        const res = await fetch(url, { signal: controller.signal, credentials: "omit" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        return await res.text();
      } finally {
        clearTimeout(timer);
      }
    }
  
    /* Like getText, but hands back the body even when the request
       failed — Google explains the real reason in there. */
    async function getResponse(url) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT);
      try {
        const res = await fetch(url, { signal: controller.signal, credentials: "omit" });
        const body = await res.text();
        return { ok: res.ok, status: res.status, body: body };
      } finally {
        clearTimeout(timer);
      }
    }
  
    /* ═══════════════════════════════════════════════════════════
       READING A GOOGLE SHEET
       ═══════════════════════════════════════════════════════════ */
  
    /* Pull the long document id out of whatever link was pasted. */
    function sheetIdFrom(url) {
      const s = String(url || "");
      const published = s.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
      if (published) return { id: published[1], published: true };
      const normal = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (normal) return { id: normal[1], published: false };
      // Someone pasted just the id
      if (/^[a-zA-Z0-9-_]{20,}$/.test(s.trim())) return { id: s.trim(), published: false };
      return null;
    }
  
    function gidFrom(url) {
      const m = String(url || "").match(/[#&?]gid=(\d+)/);
      if (m) return m[1];
      if (SHOP.sheetTabGid) return String(SHOP.sheetTabGid);
      return "";
    }
  
    /* Google hands back JSON wrapped in a JavaScript call. Unwrap it. */
    function unwrapGviz(text) {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("Unexpected response from Google");
      return JSON.parse(text.slice(start, end + 1));
    }
  
    function gvizToTable(payload) {
      const table = payload && payload.table;
      if (!table || !Array.isArray(table.cols)) throw new Error("Sheet has no readable columns");
  
      let headers = table.cols.map(c => String((c && (c.label || c.id)) || "").trim());
      let rows = (table.rows || []).map(r =>
        (r && r.c ? r.c : []).map(cell => {
          if (cell == null) return "";
          if (cell.v === null || cell.v === undefined) return "";
          return cell.v;                       // booleans and numbers survive intact
        })
      );
  
      /* If the header row wasn't detected, the first data row is it. */
      const looksBlank = headers.every(h => !h || /^[A-Z]$/.test(h));
      if (looksBlank && rows.length) {
        headers = rows[0].map(v => String(v || "").trim());
        rows = rows.slice(1);
      }
      return { headers, rows };
    }
  
    /* A CSV parser that copes with quoted fields, commas and
       line breaks inside cells. */
    function parseCsv(text) {
      const rows = [];
      let row = [], field = "", inQuotes = false;
  
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
          if (ch === '"') {
            if (text[i + 1] === '"') { field += '"'; i++; }
            else inQuotes = false;
          } else field += ch;
        } else if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          row.push(field); field = "";
        } else if (ch === "\n") {
          row.push(field); rows.push(row); row = []; field = "";
        } else if (ch !== "\r") {
          field += ch;
        }
      }
      row.push(field);
      if (row.length > 1 || row[0] !== "") rows.push(row);
  
      if (!rows.length) throw new Error("The sheet came back empty");
      return { headers: rows[0].map(h => String(h).trim()), rows: rows.slice(1) };
    }
  
    /* Try the ways of reading a sheet, in order of least setup needed. */
    async function readSheet(url) {
      const looksLikeCsv = /output=csv|format=csv/i.test(url);
      if (looksLikeCsv) return parseCsv(await getText(url));
  
      const doc = sheetIdFrom(url);
      if (!doc) throw new Error("That doesn't look like a Google Sheets link");
      const gid = gidFrom(url);
  
      /* Preferred: works as soon as the sheet is shared with
         "Anyone with the link". No publishing needed. */
      if (!doc.published) {
        const gviz = "https://docs.google.com/spreadsheets/d/" + doc.id +
          "/gviz/tq?tqx=out:json&headers=1" + (gid ? "&gid=" + gid : "");
        try {
          return gvizToTable(unwrapGviz(await getText(gviz)));
        } catch (err) {
          /* fall through to the published-CSV attempt below */
          console.warn("Sheet read (gviz) failed, trying CSV:", err.message);
        }
      }
  
      /* Fallback: File → Share → Publish to web → CSV */
      const base = doc.published
        ? "https://docs.google.com/spreadsheets/d/e/" + doc.id + "/pub"
        : "https://docs.google.com/spreadsheets/d/" + doc.id + "/export";
      const csv = doc.published
        ? base + "?" + (gid ? "gid=" + gid + "&" : "") + "single=true&output=csv"
        : base + "?format=csv" + (gid ? "&gid=" + gid : "");
      return parseCsv(await getText(csv));
    }
  
    /* ═══════════════════════════════════════════════════════════
       TURNING ROWS INTO PRODUCTS
       ═══════════════════════════════════════════════════════════ */
  
    /* "Product_ID", "product id", "PRODUCT-ID" all become "productid",
       so the sheet's exact spelling and spacing stop mattering. */
    function slugHeader(h) {
      return String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    }
  
    const FIELD_ALIASES = {
      id:    ["productid", "product", "code", "productcode", "plantcode", "sku", "id"],
      name:  ["productname", "plantname", "name", "item", "itemname", "title"],
      size:  ["potsize", "size", "pot", "potsizes", "height"],
      price: ["price", "rate", "mrp", "amount", "cost", "sellingprice"],
      image: ["imageurl", "imageurls", "image", "images", "photo", "photos", "driveurl", "drivelink", "folder", "folderurl", "link"],
      stock: ["outofstock", "outofstocks", "soldout", "oos", "stockout", "unavailable"],
      note:  ["note", "notes", "description", "desc", "details", "remark", "remarks", "about"],
    };
  
    function columnIndex(headers) {
      const slugs = headers.map(slugHeader);
      const map = {};
      Object.keys(FIELD_ALIASES).forEach(field => {
        map[field] = -1;
        for (const alias of FIELD_ALIASES[field]) {
          const at = slugs.indexOf(alias);
          if (at !== -1) { map[field] = at; break; }
        }
      });
      return map;
    }
  
    /* A ticked checkbox arrives as true, "TRUE", "Yes", "1"… */
    function isTicked(value) {
      if (value === true) return true;
      if (value === false || value == null) return false;
      const s = String(value).trim().toLowerCase();
      if (!s) return false;
      return ["true", "yes", "y", "1", "x", "✓", "✔", "checked", "out", "out of stock", "sold out", "soldout"].indexOf(s) !== -1;
    }
  
    /* "₹1,200", "1200/-", "Rs. 1200" all become 1200. */
    function toPrice(value) {
      if (typeof value === "number" && isFinite(value)) return value;
      const cleaned = String(value == null ? "" : value)
        .replace(/[₹,\s]/g, "")
        .replace(/rs\.?/i, "")
        .replace(/\/-$/, "");
      const n = parseFloat(cleaned);
      return isFinite(n) && n >= 0 ? n : null;
    }
  
    /* "5-8 Inch" → 6.5in · "30 cm" → 11.8in · "Hanging" → hanging */
    function parseSize(raw) {
      const label = String(raw == null ? "" : raw).trim();
      const hanging = /hang/i.test(label);
      if (!label) return { label: "", inches: null, hanging: false };
  
      const isCm = /\bcm\b|centimet/i.test(label);
      const isFeet = /\bft\b|\bfeet\b|\bfoot\b/i.test(label);
      const numbers = (label.match(/\d+(\.\d+)?/g) || []).map(Number).filter(n => n > 0);
  
      let inches = null;
      if (numbers.length) {
        const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        inches = isCm ? avg / 2.54 : isFeet ? avg * 12 : avg;
      }
      return { label, inches, hanging };
    }
  
    function categoryOf(code) {
      const letters = (String(code).match(/^[A-Za-z]+/) || [""])[0].toUpperCase();
      const key = letters.slice(0, 3) || "GEN";
      const known = CATEGORY_MAP[key];
      if (known) return Object.assign({ key: key }, known);
      /* Unknown code — invent something reasonable rather than hiding
         the plants. "TUL-101" becomes a "TUL" category. */
      return {
        key: key,
        label: key.charAt(0) + key.slice(1).toLowerCase(),
        emoji: "🪴",
        bg: "#4a7c3f",
        desc: "",
      };
    }
  
    function buildProduct(cells, cols, mainKey) {
      const cell = (field) => cols[field] === -1 ? "" : cells[cols[field]];
  
      const code = String(cell("id") || "").trim().toUpperCase();
      const name = String(cell("name") || "").trim();
      if (!code || !name) return null;                 // blank row — skip quietly
  
      const size = parseSize(cell("size"));
      const price = toPrice(cell("price"));
      const cat = categoryOf(code);
      const note = String(cell("note") || "").trim();
      const outOfStock = isTicked(cell("stock"));
  
      const fullName = size.label ? name + " · " + size.label : name;
  
      return {
        /* identity */
        id: code,
        code: code,
        main: mainKey,
        category: cat.key,
        categoryLabel: cat.label,
        cats: [mainKey, cat.key.toLowerCase()],
  
        /* what the customer reads */
        name: name,
        fullName: fullName,
        size: size.label,
        sizeInches: size.inches,
        hanging: size.hanging,
        price: price,
        hasPrice: price !== null && price > 0,
        note: note,
        desc: note || cat.desc || "",
        tag: size.label || cat.label,
  
        /* look */
        emoji: cat.emoji,
        bg: cat.bg,
  
        /* state */
        inStock: !outOfStock,
        imageUrl: String(cell("image") || "").trim(),
        images: null,                                   // filled in on demand
  
        specs: buildSpecs({ code, size, cat, note, outOfStock, mainKey }),
      };
    }
  
    function buildSpecs(info) {
      const rows = [];
      if (info.size.label) {
        rows.push({ label: info.mainKey === "pots" ? "Size" : "Pot size", value: info.size.label });
      }
      rows.push({ label: "Category", value: info.cat.label });
      rows.push({ label: "Plant code", value: info.code });
      if (info.note) rows.push({ label: "Note", value: info.note });
      return rows;
    }
  
    /* ═══════════════════════════════════════════════════════════
       LOADING EVERYTHING
       ═══════════════════════════════════════════════════════════ */
  
    function fallbackProducts() {
      return FALLBACK_CATALOG.map(item => {
        const size = parseSize(item.size);
        const cat = categoryOf(item.id);
        return {
          id: item.id, code: item.id, main: item.main,
          category: cat.key, categoryLabel: cat.label,
          cats: [item.main, cat.key.toLowerCase()],
          name: item.name,
          fullName: size.label ? item.name + " · " + size.label : item.name,
          size: size.label, sizeInches: size.inches, hanging: size.hanging,
          price: item.price, hasPrice: true,
          note: item.note || "", desc: item.note || cat.desc || "",
          tag: size.label || cat.label,
          emoji: cat.emoji, bg: cat.bg,
          inStock: item.inStock !== false,
          imageUrl: "", images: null,
          specs: buildSpecs({ code: item.id, size, cat, note: item.note || "", outOfStock: false, mainKey: item.main }),
        };
      });
    }
  
    /* Swap the catalog's contents without replacing the array itself,
       so every file already holding a reference stays pointed at it. */
    function setCatalog(products) {
      CATALOG.length = 0;
      products.forEach(p => CATALOG.push(p));
    }
  
    function configuredSheets() {
      const out = [];
      Object.keys(SHOP.sheets || {}).forEach(key => {
        const cfg = SHOP.sheets[key];
        if (cfg && String(cfg.url || "").trim()) out.push({ key: key, cfg: cfg });
      });
      return out;
    }
  
    async function loadOneSheet(key, cfg) {
      const table = await readSheet(cfg.url.trim());
      const cols = columnIndex(table.headers);
  
      if (cols.id === -1 || cols.name === -1) {
        throw new Error('Could not find the "Product_ID" and "Product_Name" columns');
      }
  
      const products = [];
      table.rows.forEach(cells => {
        try {
          const p = buildProduct(cells, cols, key);
          if (p) products.push(p);
        } catch (e) { /* one bad row must never sink the sheet */ }
      });
  
      if (!products.length) throw new Error("No usable rows found");
      return products;
    }
  
    /* Never throws. Always leaves CATALOG holding something sensible. */
    async function load() {
      state.status = "loading";
      state.errors = [];
      state.sheetReports = [];
  
      const sheets = configuredSheets();
      state.sheetsTried = sheets.length;
      state.sheetsOk = 0;
  
      /* Nothing connected yet — run on the built-in list. */
      if (!sheets.length) {
        setCatalog(fallbackProducts());
        state.status = "fallback";
        state.errors.push("No Google Sheet is connected yet — showing the built-in sample list.");
        return state;
      }
  
      /* Two categories pointing at the same tab is the commonest setup
         slip: all three sheets live in one spreadsheet, and the same
         link gets pasted three times. Everything after the first would
         load as duplicates and silently disappear. */
      const targets = Object.create(null);
      sheets.forEach(s => {
        const doc = sheetIdFrom(s.cfg.url);
        if (!doc) return;
        const key = doc.id + "#" + (gidFrom(s.cfg.url) || "first-tab");
        (targets[key] = targets[key] || []).push(s.cfg.label || s.key);
      });
      Object.keys(targets).forEach(k => {
        if (targets[k].length > 1) {
          state.errors.push(
            targets[k].join(" and ") + " point at the same sheet tab. " +
            "If they're tabs in one spreadsheet, open each tab and copy the link " +
            "from the address bar — the gid number at the end must differ.");
        }
      });
  
      /* Paint instantly from the last good copy, then refresh. */
      const cached = cacheRead(CACHE_KEY);
      if (!CATALOG.length && cached && Array.isArray(cached.products) && cached.products.length) {
        setCatalog(cached.products);
        state.status = "cached";
        state.updatedAt = cached.at || null;
      }
  
      const results = await Promise.allSettled(
        sheets.map(s => loadOneSheet(s.key, s.cfg))
      );
  
      const merged = [];
      const seen = Object.create(null);
  
      results.forEach((result, i) => {
        const label = sheets[i].cfg.label || sheets[i].key;
        if (result.status === "fulfilled") {
          let kept = 0, dupes = 0;
          result.value.forEach(p => {
            if (seen[p.id]) { dupes++; return; }
            seen[p.id] = true;
            merged.push(p);
            kept++;
          });
          state.sheetsOk++;
          state.sheetReports.push({ sheet: label, ok: true, rows: result.value.length, kept: kept, duplicates: dupes });
  
          if (kept === 0) {
            state.errors.push(label + ': every row shares a Product_ID with another sheet, so nothing was added. Give this sheet its own codes.');
          } else if (dupes) {
            console.warn("[Green View] " + label + ": " + dupes + " row(s) skipped — their Product_ID already existed.");
          }
        } else {
          const why = (result.reason && result.reason.message) || "could not be read";
          state.errors.push(label + ": " + why);
          state.sheetReports.push({ sheet: label, ok: false, reason: why });
          console.warn("[Green View] Sheet failed — " + label + ":", result.reason);
        }
      });
  
      if (merged.length) {
        setCatalog(merged);
        state.status = state.errors.length ? "live" : "live";
        state.updatedAt = Date.now();
        cacheWrite(CACHE_KEY, { at: state.updatedAt, products: merged });
      } else if (cached && Array.isArray(cached.products) && cached.products.length) {
        setCatalog(cached.products);
        state.status = "cached";
        state.updatedAt = cached.at || null;
      } else {
        setCatalog(fallbackProducts());
        state.status = "fallback";
      }
  
      document.dispatchEvent(new CustomEvent("catalog:change"));
      return state;
    }
  
    /* ═══════════════════════════════════════════════════════════
       PHOTOS
       ═══════════════════════════════════════════════════════════
       Image_URL can hold a Drive folder, a single Drive file, a
       plain image address, or several separated by commas.
       ═══════════════════════════════════════════════════════════ */
  
    function driveThumb(fileId) {
      return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1000";
    }
  
    function classifyUrl(url) {
      const s = String(url || "").trim();
      if (!s) return null;
  
      const folder = s.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      if (folder) return { kind: "folder", id: folder[1] };
  
      const file = s.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      if (file) return { kind: "file", id: file[1] };
  
      const openId = s.match(/[?&]id=([a-zA-Z0-9-_]+)/);
      if (openId && /drive\.google|googleusercontent/.test(s)) return { kind: "file", id: openId[1] };
  
      if (/^https?:\/\//i.test(s)) return { kind: "direct", url: s };
      if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return { kind: "folder", id: s };  // bare folder id
      return null;
    }
  
    /* Turns Google's error body into something a human can act on. */
    function explainDriveError(status, body) {
      let reason = "";
      try {
        const parsed = JSON.parse(body);
        reason = (parsed.error && (parsed.error.status || (parsed.error.errors && parsed.error.errors[0] && parsed.error.errors[0].reason))) || "";
      } catch (e) { /* not JSON */ }
  
      const r = String(reason).toLowerCase();
      if (/accessnotconfigured|service_disabled/.test(r) || /has not been used|is disabled/i.test(body)) {
        return 'the Google Drive API is not switched on for this key — enable "Google Drive API" in your Google Cloud project';
      }
      if (/keyinvalid|badrequest/.test(r) || status === 400) {
        return "the API key looks wrong, or it is restricted to a different website";
      }
      if (status === 403) {
        return "the key was rejected — check its website restriction matches this domain, and that it allows the Drive API";
      }
      if (status === 404) {
        return "that folder id was not found";
      }
      return "Google replied with HTTP " + status;
    }
  
    async function listDriveFolder(folderId) {
      if (!SHOP.googleApiKey || SHOP.googleApiKey.length < 10) {
        noteImageProblem("no-key",
          "Photos are in a Drive folder, but no Google API key is set in catalog.js. " +
          "Listing what's inside a folder needs one — single image links work without it.");
        return [];
      }
  
      const store = cacheRead(DRIVE_KEY) || {};
      const hit = store[folderId];
      if (hit && Date.now() - hit.at < DRIVE_TTL) return hit.files || [];
  
      const url = "https://www.googleapis.com/drive/v3/files" +
        "?q=" + encodeURIComponent("'" + folderId + "' in parents and mimeType contains 'image/' and trashed = false") +
        "&key=" + encodeURIComponent(SHOP.googleApiKey) +
        "&fields=files(id,name)&pageSize=20&orderBy=name";
  
      try {
        const res = await getResponse(url);
  
        if (!res.ok) {
          const why = explainDriveError(res.status, res.body);
          noteImageProblem("api-" + res.status, "Couldn't read the photo folder: " + why + ".");
          console.warn("[Green View] Drive folder " + folderId + " — " + why);
          return (hit && hit.files) || [];
        }
  
        const data = JSON.parse(res.body);
        const files = (data.files || []).map(f => ({ url: driveThumb(f.id), alt: f.name }));
  
        if (!files.length) {
          noteImageProblem("empty-" + folderId,
            "The photo folder opened but held no images. Check the folder is shared as " +
            '"Anyone with the link", and that the files are photos.');
          console.warn("[Green View] Drive folder " + folderId + " returned no images. " +
            "Usually this means the folder isn't shared publicly.");
        }
  
        store[folderId] = { at: Date.now(), files: files };
        cacheWrite(DRIVE_KEY, store);
        return files;
      } catch (err) {
        noteImageProblem("net", "Couldn't reach Google Drive for the photos.");
        console.warn("[Green View] Drive request failed for " + folderId + ":", err.message);
        return (hit && hit.files) || [];
      }
    }
  
    /* Resolves to an array of {url, alt}. Empty means "use the
       placeholder" — which is exactly what happens before any
       photo links are added to the sheet. */
    const inFlight = Object.create(null);
  
    async function images(product) {
      if (product.images) return product.images;
  
      /* Several cards can ask for the same photos at the same moment —
         a pot suggested under a dozen plants, say. One request each. */
      if (inFlight[product.id]) return inFlight[product.id];
      inFlight[product.id] = resolveImages(product);
      try { return await inFlight[product.id]; }
      finally { delete inFlight[product.id]; }
    }
  
    async function resolveImages(product) {
  
      const parts = String(product.imageUrl || "")
        .split(/[\s,;\n]+/).map(s => s.trim()).filter(Boolean);
  
      const out = [];
      for (const part of parts) {
        const info = classifyUrl(part);
        if (!info) continue;
        if (info.kind === "direct") out.push({ url: info.url, alt: product.name });
        else if (info.kind === "file") out.push({ url: driveThumb(info.id), alt: product.name });
        else if (info.kind === "folder") {
          const files = await listDriveFolder(info.id);
          files.forEach(f => out.push(f));
        }
      }
  
      product.images = out;
      return out;
    }
  
    /* ═══════════════════════════════════════════════════════════
       POT SUGGESTIONS
       ═══════════════════════════════════════════════════════════ */
  
    function potPool() {
      const live = CATALOG.filter(p => p.main === "pots");
      if (live.length) return live;
      /* The Pots sheet isn't connected yet — offer the built-in
         samples so the feature still works for customers today. */
      return fallbackProducts().filter(p => p.main === "pots");
    }
  
    /* Pots that would actually fit this plant, best match first.
       A 5 inch plant wants a 5 inch pot, or a 4 or 6 at a push. If there
       aren't enough that close, the net widens rather than showing none. */
    function suggestPots(plant, limit) {
      if (!plant || plant.main === "pots") return [];
      const max = limit || POT_RULES.howMany || 4;
  
      const pots = potPool().filter(p => p.inStock);
      if (!pots.length) return [];
  
      const target = (plant.sizeInches || 5) + (POT_RULES.sizeUpInches || 0);
      const tolerance = POT_RULES.toleranceInches == null ? 1 : POT_RULES.toleranceInches;
  
      /* A trailing plant needs a hanging pot and a floor plant must not
         get one, whatever the sizes say. */
      const rightType = pots.filter(p => !!p.hanging === !!plant.hanging);
      const pool = rightType.length ? rightType : pots;
  
      const withGap = pool.map(pot => ({
        pot: pot,
        gap: pot.sizeInches == null ? null : Math.abs(pot.sizeInches - target),
      }));
  
      /* Widen the search only if too few pots are a genuine fit. */
      let picks = [];
      for (let allowed = tolerance; allowed <= tolerance + 3; allowed++) {
        picks = withGap.filter(x => x.gap !== null && x.gap <= allowed);
        if (picks.length >= Math.min(3, pool.length)) break;
      }
  
      /* Still nothing sized? Fall back to pots with no size recorded. */
      if (!picks.length) picks = withGap.filter(x => x.gap === null);
      if (!picks.length) picks = withGap;
  
      picks.sort((a, b) => {
        if (a.gap === null) return 1;
        if (b.gap === null) return -1;
        if (a.gap !== b.gap) return a.gap - b.gap;
        return (a.pot.price || 0) - (b.pot.price || 0);
      });
  
      return picks.slice(0, max).map(x => x.pot);
    }
  
    /* ═══════════════════════════════════════════════════════════
       CATEGORIES SHOWN ON THE PAGE
       ═══════════════════════════════════════════════════════════ */
  
    /* Every category that currently has stock, in your preferred
       order, with a live count. Pass "indoor"/"outdoor"/"pots" to
       narrow it, or "all" for everything. */
    function categories(mainKey) {
      const scope = (!mainKey || mainKey === "all" || mainKey === "saved")
        ? CATALOG
        : CATALOG.filter(p => p.main === mainKey);
  
      const byKey = Object.create(null);
      scope.forEach(p => {
        if (!byKey[p.category]) {
          byKey[p.category] = {
            key: p.category, label: p.categoryLabel,
            emoji: p.emoji, bg: p.bg,
            desc: (CATEGORY_MAP[p.category] && CATEGORY_MAP[p.category].desc) || "",
            count: 0, main: p.main,
          };
        }
        byKey[p.category].count++;
      });
  
      const list = Object.keys(byKey).map(k => byKey[k]);
      const order = CATEGORY_ORDER || [];
      list.sort((a, b) => {
        const ai = order.indexOf(a.key), bi = order.indexOf(b.key);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.label.localeCompare(b.label);
      });
      return list;
    }
  
    /* Which of the main tabs actually have something behind them. */
    function mainCategories() {
      const out = [];
      Object.keys(SHOP.sheets || {}).forEach(key => {
        const cfg = SHOP.sheets[key];
        const count = CATALOG.filter(p => p.main === key).length;
        if (count) out.push({ key: key, label: cfg.label || key, emoji: cfg.emoji || "🪴", count: count });
      });
      return out;
    }
  
    /* Type GVCData.diagnose() in the browser console to see exactly
       what each sheet did and why anything is missing. */
    function diagnose() {
      const line = (s) => console.log(s);
      line("%c Green View — catalogue check ", "background:#2d5a27;color:#fff;padding:2px 6px");
      line("Status: " + state.status + " · " + CATALOG.length + " products loaded");
  
      Object.keys(SHOP.sheets || {}).forEach(key => {
        const cfg = SHOP.sheets[key] || {};
        const label = cfg.label || key;
        if (!String(cfg.url || "").trim()) { line("• " + label + ": no link pasted in catalog.js"); return; }
  
        const doc = sheetIdFrom(cfg.url);
        if (!doc) { line("• " + label + ": that link isn't a Google Sheets address"); return; }
  
        const report = state.sheetReports.find(r => r.sheet === label);
        const where = "sheet " + doc.id.slice(0, 12) + "… tab gid=" + (gidFrom(cfg.url) || "(first)");
        if (!report) line("• " + label + ": not loaded — " + where);
        else if (!report.ok) line("• " + label + ": FAILED — " + report.reason + " — " + where);
        else line("• " + label + ": " + report.kept + " shown" +
          (report.duplicates ? " (" + report.duplicates + " skipped as duplicate codes)" : "") + " — " + where);
      });
  
      const counts = {};
      CATALOG.forEach(p => { counts[p.main] = (counts[p.main] || 0) + 1; });
      line("Products by category: " + (JSON.stringify(counts) === "{}" ? "none" : JSON.stringify(counts)));
  
      line("Photos: API key " + (SHOP.googleApiKey && SHOP.googleApiKey.length > 10 ? "is set" : "is NOT set — Drive folders can't be read"));
      const withFolders = CATALOG.filter(p => /\/folders\//.test(p.imageUrl || "")).length;
      line("Plants with a Drive folder in Image_URL: " + withFolders);
  
      if (state.errors.length) { line("Problems:"); state.errors.forEach(e => line("  ! " + e)); }
      if (state.imageProblems.length) { line("Photo problems:"); state.imageProblems.forEach(e => line("  ! " + e)); }
      if (!state.errors.length && !state.imageProblems.length) line("No problems found.");
      return state;
    }
  
    return {
      state: state,
      load: load,
      images: images,
      suggestPots: suggestPots,
      categories: categories,
      mainCategories: mainCategories,
      parseSize: parseSize,
      diagnose: diagnose,
      placeholder: function () { return SHOP.placeholderImage || ""; },
    };
  })();
  