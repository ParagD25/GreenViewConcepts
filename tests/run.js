const H = require("./harness");

let pass = 0, fail = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) { pass++; console.log("  ✓ " + name); }
  else { fail++; failures.push(name + (detail ? " → " + detail : "")); console.log("  ✗ " + name + (detail ? " → " + detail : "")); }
}

function section(title) { console.log("\n" + title); }

/* Builds an env whose fetch answers with the given sheets. */
function envWith(options) {
  const opts = options || {};
  return H.makeEnv(async (url) => {
    const u = String(url);

    if (opts.failEverything) throw new Error("network down");

    if (u.indexOf("INDOORID") !== -1) {
      if (opts.indoorFails) throw new Error("boom");
      if (opts.indoorCsvOnly && u.indexOf("gviz") !== -1) throw new Error("gviz blocked");
      const body = u.indexOf("gviz") !== -1
        ? H.gvizPayload(H.HEADERS, opts.indoorRows || H.INDOOR_ROWS)
        : H.csvPayload(H.HEADERS, opts.indoorRows || H.INDOOR_ROWS);
      return { ok: true, text: async () => body };
    }
    if (u.indexOf("POTSID") !== -1) {
      if (opts.potsFails) throw new Error("boom");
      const body = u.indexOf("gviz") !== -1
        ? H.gvizPayload(H.HEADERS, H.POT_ROWS)
        : H.csvPayload(H.HEADERS, H.POT_ROWS);
      return { ok: true, text: async () => body };
    }
    if (u.indexOf("googleapis.com/drive") !== -1) {
      if (opts.driveFails) throw new Error("drive down");
      return { ok: true, text: async () => JSON.stringify({ files: [{ id: "f1", name: "a.jpg" }, { id: "f2", name: "b.jpg" }, { id: "f3", name: "c.jpg" }] }) };
    }
    throw new Error("unexpected url " + u);
  });
}

function connect(sandbox, opts) {
  const o = opts || {};
  sandbox.SHOP.sheets.indoor.url = o.indoor === false ? "" : "https://docs.google.com/spreadsheets/d/INDOORID/edit#gid=0";
  sandbox.SHOP.sheets.pots.url = o.pots ? "https://docs.google.com/spreadsheets/d/POTSID/edit#gid=0" : "";
  sandbox.SHOP.sheets.outdoor.url = "";
}

(async function () {

  /* ═══════════════════════════════════════════════════════ */
  section("1. Reading a normally-shared sheet (gviz path)");
  {
    const { sandbox } = envWith();
    connect(sandbox);
    const state = await sandbox.GVCData.load();
    const C = sandbox.CATALOG;

    check("status is live", state.status === "live", state.status);
    check("blank row skipped", C.length === 23, "got " + C.length);
    check("no errors", state.errors.length === 0, JSON.stringify(state.errors));

    const agl = C.find(p => p.id === "AGL-101");
    check("name read", agl && agl.name === "Aglaonema Anjuman");
    check("price read as number", agl && agl.price === 200 && agl.hasPrice === true);
    check("pot size read", agl && agl.size === "3 Inch");
    check("category from code prefix", agl && agl.category === "AGL" && agl.categoryLabel === "Aglaonema");
    check("main category tagged", agl && agl.main === "indoor");
    check("full name includes size", agl && agl.fullName === "Aglaonema Anjuman · 3 Inch");
    check("in stock by default", agl && agl.inStock === true);
  }

  /* ═══════════════════════════════════════════════════════ */
  section("2. Out-of-stock checkbox");
  {
    const { sandbox } = envWith();
    connect(sandbox);
    await sandbox.GVCData.load();
    const C = sandbox.CATALOG;

    const out = C.find(p => p.id === "MON-102");
    check("ticked checkbox → out of stock", out && out.inStock === false);
    check("unticked → in stock", C.find(p => p.id === "MON-101").inStock === true);
    check("note carried through", out && out.note === "Back next week");
    check("the note reaches the detail panel",
      out && out.specs.some(s => s.label === "Note" && s.value === "Back next week"));
    check("specs stay to the facts — no care or availability rows",
      out && out.specs.every(s => !/Availability|Light|Water|Care level|Pet friendly/.test(s.label)),
      out && out.specs.map(s => s.label).join(", "));

    /* Text variants people actually type */
    const variants = [["A-1", "x", "TRUE"], ["A-2", "x", "Yes"], ["A-3", "x", "1"],
                      ["A-4", "x", "FALSE"], ["A-5", "x", "no"], ["A-6", "x", ""]];
    const rows = variants.map(([id, n, v]) => [id, n, "3 Inch", 100, "", v, ""]);
    const env2 = envWith({ indoorRows: rows });
    connect(env2.sandbox);
    await env2.sandbox.GVCData.load();
    const got = env2.sandbox.CATALOG.map(p => p.inStock);
    check("TRUE/Yes/1 → out; FALSE/no/blank → in",
      JSON.stringify(got) === JSON.stringify([false, false, false, true, true, true]),
      JSON.stringify(got));
  }

  /* ═══════════════════════════════════════════════════════ */
  section("3. Sizes: inches, ranges, centimetres, hanging");
  {
    const { sandbox } = envWith();
    const ps = sandbox.GVCData.parseSize;

    check('"3 Inch" → 3in', ps("3 Inch").inches === 3);
    check('"5-8 Inch" → 6.5in (midpoint)', ps("5-8 Inch").inches === 6.5);
    check('"30 cm" → ~11.8in', Math.abs(ps("30 cm").inches - 11.81) < 0.1);
    check('"Hanging" flagged, no size', ps("Hanging").hanging === true && ps("Hanging").inches === null);
    check("blank size is safe", ps("").inches === null && ps("").label === "");
    check("blank size doesn't crash on undefined", ps(undefined).label === "");
  }

  /* ═══════════════════════════════════════════════════════ */
  section("4. Categories on the page");
  {
    const { sandbox } = envWith();
    connect(sandbox, { pots: true });
    await sandbox.GVCData.load();

    const cats = sandbox.GVCData.categories("indoor");
    check("8 plant categories found", cats.length === 8, "got " + cats.length);
    check("your preferred order respected",
      cats[0].key === "AGL" && cats[1].key === "MON" && cats[2].key === "DRA",
      cats.map(c => c.key).join(","));
    check("counts are live", cats[0].count === 6, "AGL count " + cats[0].count);
    check("labels come from CATEGORY_MAP", cats[0].label === "Aglaonema");

    const mains = sandbox.GVCData.mainCategories();
    check("only connected sheets become tabs",
      mains.length === 2 && mains[0].key === "indoor" && mains[1].key === "pots",
      JSON.stringify(mains.map(m => m.key)));
    check("tab counts correct", mains[0].count === 23 && mains[1].count === 7);

    /* An unknown code must not hide the plants */
    const env2 = envWith({ indoorRows: [["TUL-101", "Tulsi", "4 Inch", 90, "", false, ""]] });
    connect(env2.sandbox);
    await env2.sandbox.GVCData.load();
    const tulsi = env2.sandbox.CATALOG[0];
    check("unknown code still shows up", tulsi && tulsi.name === "Tulsi");
    check("unknown code gets an invented category", tulsi && tulsi.categoryLabel === "Tul", tulsi && tulsi.categoryLabel);
  }

  /* ═══════════════════════════════════════════════════════ */
  section("5. Pot suggestions");
  {
    const { sandbox } = envWith();
    connect(sandbox, { pots: true });
    await sandbox.GVCData.load();
    const C = sandbox.CATALOG;
    const suggest = sandbox.GVCData.suggestPots;

    const small = C.find(p => p.id === "SCC-101");        // 2 inch echeveria
    const smallPots = suggest(small);
    check("small plant gets pots", smallPots.length > 0);
    check("small plant's best pot is the 3 inch",
      smallPots[0].size === "3 Inch", smallPots[0] && smallPots[0].size);

    const big = C.find(p => p.id === "ZAM-105");           // 10 inch ZZ
    const bigPots = suggest(big);
    check("big plant's best pot is the 8 inch",
      bigPots[0].size === "8 Inch", bigPots[0] && bigPots[0].size);
    check("a pot smaller than the plant is not first",
      bigPots[0].sizeInches >= 6, bigPots[0] && bigPots[0].size);

    const hanging = C.find(p => p.id === "MON-106");       // hanging money plant
    const hangPots = suggest(hanging);
    check("hanging plant gets a hanging pot first",
      hangPots[0].hanging === true, hangPots[0] && hangPots[0].name);
    check("out-of-stock pot is never suggested",
      !hangPots.some(p => p.id === "HNG-201"),
      hangPots.map(p => p.id).join(","));

    check("suggestions capped at the configured number",
      suggest(small).length <= sandbox.POT_RULES.howMany);
    check("a pot is not offered pots for itself",
      suggest(C.find(p => p.main === "pots")).length === 0);

    const noSize = C.find(p => p.id === "DRA-105");        // blank Pot_Size
    check("plant with no size still gets suggestions", suggest(noSize).length > 0);
  }

  /* ═══════════════════════════════════════════════════════ */
  section("6. Pots suggested before the Pots sheet exists");
  {
    const { sandbox } = envWith();
    connect(sandbox, { pots: false });          // only the indoor sheet connected
    await sandbox.GVCData.load();
    const plant = sandbox.CATALOG.find(p => p.id === "AGL-101");
    const picks = sandbox.GVCData.suggestPots(plant);
    check("falls back to the built-in pots", picks.length > 0, "got " + picks.length);
    check("fallback pots are real products", picks[0] && !!picks[0].name);
  }

  /* ═══════════════════════════════════════════════════════ */
  section("7. When things go wrong");
  {
    /* No sheet connected at all */
    const a = envWith();
    a.sandbox.SHOP.sheets.indoor.url = "";
    const s1 = await a.sandbox.GVCData.load();
    check("no sheet → sample catalog, not a blank page",
      s1.status === "fallback" && a.sandbox.CATALOG.length > 0);

    /* Sheet unreachable, nothing cached */
    const b = envWith({ failEverything: true });
    connect(b.sandbox);
    const s2 = await b.sandbox.GVCData.load();
    check("sheet down → still shows products",
      s2.status === "fallback" && b.sandbox.CATALOG.length > 0, s2.status);
    check("failure is recorded for the notice", s2.errors.length > 0);

    /* Sheet unreachable, but we have yesterday's copy */
    const c = envWith();
    connect(c.sandbox);
    await c.sandbox.GVCData.load();                       // warm the cache
    const cached = c.store["gvc_catalog_v1"];
    check("good load writes a cache", !!cached && JSON.parse(cached).products.length === 23);

    const d = envWith({ failEverything: true });
    d.store["gvc_catalog_v1"] = cached;                   // same browser, next visit
    connect(d.sandbox);
    const s3 = await d.sandbox.GVCData.load();
    check("sheet down → falls back to the saved copy",
      s3.status === "cached" && d.sandbox.CATALOG.length === 23, s3.status);

    /* One sheet fine, one broken */
    const e = envWith({ potsFails: true });
    connect(e.sandbox, { pots: true });
    const s4 = await e.sandbox.GVCData.load();
    check("one broken sheet doesn't sink the other",
      s4.status === "live" && e.sandbox.CATALOG.length === 23, s4.status);
    check("the broken one is reported", s4.errors.length === 1, JSON.stringify(s4.errors));

    /* Wrong column names */
    const f = envWith({ indoorRows: [["x", "y"]] });
    f.sandbox.SHOP.sheets.indoor.url = "https://docs.google.com/spreadsheets/d/INDOORID/edit";
    const origHeaders = H.HEADERS.slice();
    H.HEADERS.length = 0; H.HEADERS.push("Foo", "Bar");
    const s5 = await f.sandbox.GVCData.load();
    check("unrecognised columns → clear message, site still up",
      s5.status === "fallback" && /Product_ID/.test(s5.errors[0]), JSON.stringify(s5.errors));
    H.HEADERS.length = 0; origHeaders.forEach(h => H.HEADERS.push(h));

    /* Rubbish in the price column */
    const g = envWith({ indoorRows: [
      ["AGL-101", "Aglaonema", "3 Inch", "₹1,250", "", false, ""],
      ["AGL-102", "Aglaonema Two", "3 Inch", "Rs. 900", "", false, ""],
      ["AGL-103", "Aglaonema Three", "3 Inch", "ask", "", false, ""],
    ]});
    connect(g.sandbox);
    await g.sandbox.GVCData.load();
    const G = g.sandbox.CATALOG;
    check('"₹1,250" is understood', G[0].price === 1250, String(G[0].price));
    check('"Rs. 900" is understood', G[1].price === 900, String(G[1].price));
    check("unreadable price → shown as price-on-request, not zero",
      G[2].price === null && G[2].hasPrice === false);
  }

  /* ═══════════════════════════════════════════════════════ */
  section("8. Published-CSV sheets and odd headers");
  {
    const a = envWith({ indoorCsvOnly: true });
    connect(a.sandbox);
    const s = await a.sandbox.GVCData.load();
    check("falls back to CSV when gviz is blocked",
      s.status === "live" && a.sandbox.CATALOG.length === 23, s.status);

    /* Header spelling and order shouldn't matter */
    const orig = H.HEADERS.slice();
    H.HEADERS.length = 0;
    ["note", "PRICE", "product id", "Out Of Stock", "Product Name", "Pot-Size", "Image URL"]
      .forEach(h => H.HEADERS.push(h));
    const b = envWith({ indoorRows: [["nice one", 500, "AGL-999", "TRUE", "Test Plant", "6 Inch", ""]] });
    connect(b.sandbox);
    await b.sandbox.GVCData.load();
    const p = b.sandbox.CATALOG[0];
    check("columns matched by name, not position",
      p && p.id === "AGL-999" && p.name === "Test Plant" && p.price === 500 &&
      p.size === "6 Inch" && p.inStock === false && p.note === "nice one",
      JSON.stringify(p && { id: p.id, name: p.name, price: p.price, size: p.size, inStock: p.inStock }));
    H.HEADERS.length = 0; orig.forEach(h => H.HEADERS.push(h));

    /* Commas inside a cell */
    const c = envWith({ indoorCsvOnly: true, indoorRows: [
      ["AGL-500", "Aglaonema, Special", "3 Inch", 200, "", false, 'Big, bold leaves — "wow"'],
    ]});
    connect(c.sandbox);
    await c.sandbox.GVCData.load();
    const q = c.sandbox.CATALOG[0];
    check("commas and quotes inside cells survive CSV",
      q && q.name === "Aglaonema, Special" && q.note === 'Big, bold leaves — "wow"',
      q && q.name + " | " + q.note);
  }

  /* ═══════════════════════════════════════════════════════ */
  section("9. Photos");
  {
    const withKey = () => {
      const e = envWith();
      e.sandbox.SHOP.googleApiKey = "AIzaSyTESTKEY1234567890";
      return e;
    };

    const a = withKey();
    connect(a.sandbox, {});
    a.sandbox.SHOP.sheets.indoor.url = "https://docs.google.com/spreadsheets/d/INDOORID/edit";
    const rows = [["AGL-101", "Aglaonema", "3 Inch", 200, "https://drive.google.com/drive/folders/FOLDER123?usp=sharing", false, ""]];
    const b = H.makeEnv(async (url) => {
      const u = String(url);
      if (u.indexOf("INDOORID") !== -1) return { ok: true, text: async () => H.gvizPayload(H.HEADERS, rows) };
      if (u.indexOf("googleapis.com/drive") !== -1) {
        return { ok: true, text: async () => JSON.stringify({ files: [{ id: "f1", name: "1.jpg" }, { id: "f2", name: "2.jpg" }, { id: "f3", name: "3.jpg" }] }) };
      }
      throw new Error("unexpected " + u);
    });
    b.sandbox.SHOP.googleApiKey = "AIzaSyTESTKEY1234567890";
    connect(b.sandbox);
    await b.sandbox.GVCData.load();
    const imgs = await b.sandbox.GVCData.images(b.sandbox.CATALOG[0]);
    check("drive folder link → 3 photos for the slideshow", imgs.length === 3, "got " + imgs.length);
    check("photos become viewable thumbnails",
      imgs[0].url.indexOf("drive.google.com/thumbnail?id=f1") !== -1, imgs[0] && imgs[0].url);

    /* No API key — the commonest state right now */
    const c = envWith();
    connect(c.sandbox);
    await c.sandbox.GVCData.load();
    const noKey = await c.sandbox.GVCData.images(
      Object.assign({}, c.sandbox.CATALOG[0], { imageUrl: "https://drive.google.com/drive/folders/X", images: null }));
    check("no API key → no photos, no crash", Array.isArray(noKey) && noKey.length === 0);
    check("placeholder is configured", c.sandbox.GVCData.placeholder().indexOf("placeholder") !== -1);

    /* Drive down */
    const d = H.makeEnv(async (url) => {
      const u = String(url);
      if (u.indexOf("INDOORID") !== -1) return { ok: true, text: async () => H.gvizPayload(H.HEADERS, rows) };
      throw new Error("drive down");
    });
    d.sandbox.SHOP.googleApiKey = "AIzaSyTESTKEY1234567890";
    connect(d.sandbox);
    await d.sandbox.GVCData.load();
    const failImgs = await d.sandbox.GVCData.images(d.sandbox.CATALOG[0]);
    check("drive down → falls back to placeholder quietly", failImgs.length === 0);

    /* Other link shapes */
    const e = envWith();
    connect(e.sandbox);
    await e.sandbox.GVCData.load();
    const single = await e.sandbox.GVCData.images({ name: "x", imageUrl: "https://drive.google.com/file/d/FILEID/view", images: null });
    check("single drive file link works", single.length === 1 && single[0].url.indexOf("FILEID") !== -1);
    const direct = await e.sandbox.GVCData.images({ name: "x", imageUrl: "https://example.com/plant.jpg", images: null });
    check("plain image address works", direct.length === 1 && direct[0].url === "https://example.com/plant.jpg");
    const many = await e.sandbox.GVCData.images({ name: "x", imageUrl: "https://a.com/1.jpg, https://a.com/2.jpg", images: null });
    check("several addresses in one cell work", many.length === 2);
    const junk = await e.sandbox.GVCData.images({ name: "x", imageUrl: "not a link", images: null });
    check("nonsense in Image_URL → placeholder, no crash", junk.length === 0);
  }

  /* ═══════════════════════════════════════════════════════ */
  section("10. Prices update when the sheet changes");
  {
    const rowsBefore = [["AGL-101", "Aglaonema Anjuman", "3 Inch", 200, "", false, ""]];
    const rowsAfter  = [["AGL-101", "Aglaonema Anjuman", "3 Inch", 275, "", true, ""]];

    let current = rowsBefore;
    const env = H.makeEnv(async (url) => {
      if (String(url).indexOf("INDOORID") !== -1) return { ok: true, text: async () => H.gvizPayload(H.HEADERS, current) };
      throw new Error("unexpected");
    });
    connect(env.sandbox);

    await env.sandbox.GVCData.load();
    check("price starts at 200", env.sandbox.CATALOG[0].price === 200);

    current = rowsAfter;                                   // shop owner edits the sheet
    await env.sandbox.GVCData.load();
    check("new price picked up on reload", env.sandbox.CATALOG[0].price === 275);
    check("stock tick picked up on reload", env.sandbox.CATALOG[0].inStock === false);
    check("CATALOG array is edited in place, never swapped",
      Array.isArray(env.sandbox.CATALOG) && env.sandbox.CATALOG.length === 1);
  }

  /* ═══════════════════════════════════════════════════════ */
  section("11. Duplicate codes");
  {
    const env = envWith({ indoorRows: [
      ["AGL-101", "First", "3 Inch", 200, "", false, ""],
      ["AGL-101", "Duplicate", "5 Inch", 900, "", false, ""],
    ]});
    connect(env.sandbox);
    await env.sandbox.GVCData.load();
    check("duplicate code kept once", env.sandbox.CATALOG.length === 1);
    check("the first row wins", env.sandbox.CATALOG[0].name === "First");
  }

  /* ═══════════════════════════════════════════════════════ */
  section("12. Diagnosing a broken setup");
  {
    /* The commonest slip: three categories, one spreadsheet, same link
       pasted three times. Everything after the first would silently
       vanish as duplicate codes. */
    const env = envWith();
    env.sandbox.SHOP.sheets.indoor.url = "https://docs.google.com/spreadsheets/d/INDOORID/edit#gid=0";
    env.sandbox.SHOP.sheets.outdoor.url = "https://docs.google.com/spreadsheets/d/INDOORID/edit#gid=0";
    const s1 = await env.sandbox.GVCData.load();
    check("same link pasted twice is called out",
      s1.errors.some(e => /same sheet tab/i.test(e)), JSON.stringify(s1.errors));
    check("the message says how to fix it",
      s1.errors.some(e => /gid/i.test(e)), JSON.stringify(s1.errors));

    /* Distinct tabs of one spreadsheet are fine */
    const env2 = envWith();
    env2.sandbox.SHOP.sheets.indoor.url = "https://docs.google.com/spreadsheets/d/INDOORID/edit#gid=0";
    env2.sandbox.SHOP.sheets.pots.url = "https://docs.google.com/spreadsheets/d/POTSID/edit#gid=77";
    const s2 = await env2.sandbox.GVCData.load();
    check("different tabs load without complaint", s2.errors.length === 0, JSON.stringify(s2.errors));
    check("both ranges are present",
      env2.sandbox.CATALOG.some(p => p.main === "indoor") && env2.sandbox.CATALOG.some(p => p.main === "pots"));

    /* A sheet whose codes all clash with another */
    const env3 = envWith();
    env3.sandbox.SHOP.sheets.indoor.url = "https://docs.google.com/spreadsheets/d/INDOORID/edit#gid=0";
    env3.sandbox.SHOP.sheets.outdoor.url = "https://docs.google.com/spreadsheets/d/INDOORID/edit#gid=9";
    const s3 = await env3.sandbox.GVCData.load();
    check("a sheet that adds nothing is reported",
      s3.errors.some(e => /shares a Product_ID/i.test(e)), JSON.stringify(s3.errors));

    /* Per-sheet report */
    const env4 = envWith({ potsFails: true });
    connect(env4.sandbox, { pots: true });
    const s4 = await env4.sandbox.GVCData.load();
    const rep = s4.sheetReports;
    check("each sheet gets a report line", rep.length === 2, JSON.stringify(rep));
    check("the working sheet reports its row count",
      rep.find(r => r.ok) && rep.find(r => r.ok).kept === 23);
    check("the failing sheet reports why", rep.find(r => !r.ok) && !!rep.find(r => !r.ok).reason);
    check("diagnose() runs without throwing", typeof env4.sandbox.GVCData.diagnose === "function" &&
      !!env4.sandbox.GVCData.diagnose());
  }

  /* ═══════════════════════════════════════════════════════ */
  section("13. Explaining why photos are missing");
  {
    const rows = [["AGL-101", "Aglaonema", "3 Inch", 200, "https://drive.google.com/drive/folders/FOLDER123", false, ""]];

    /* No API key — the state they're in right now */
    const a = envWith({ indoorRows: rows });
    connect(a.sandbox);
    await a.sandbox.GVCData.load();
    await a.sandbox.GVCData.images(a.sandbox.CATALOG[0]);
    check("missing API key is explained, not silent",
      a.sandbox.GVCData.state.imageProblems.some(m => /API key/i.test(m)),
      JSON.stringify(a.sandbox.GVCData.state.imageProblems));
    check("it points out single links still work",
      a.sandbox.GVCData.state.imageProblems.some(m => /single image/i.test(m)));

    /* Key set, but Drive API not enabled on the project */
    const b = H.makeEnv(async (url) => {
      const u = String(url);
      if (u.indexOf("INDOORID") !== -1) return { ok: true, text: async () => H.gvizPayload(H.HEADERS, rows) };
      return { ok: false, status: 403, text: async () => JSON.stringify({
        error: { status: "PERMISSION_DENIED", errors: [{ reason: "accessNotConfigured" }] } }) };
    });
    b.sandbox.SHOP.googleApiKey = "AIzaSyTESTKEY1234567890";
    connect(b.sandbox);
    await b.sandbox.GVCData.load();
    await b.sandbox.GVCData.images(b.sandbox.CATALOG[0]);
    check("Drive API not enabled is named exactly",
      b.sandbox.GVCData.state.imageProblems.some(m => /not switched on|Drive API/i.test(m)),
      JSON.stringify(b.sandbox.GVCData.state.imageProblems));

    /* Key fine, folder not shared — Google returns an empty list */
    const c = H.makeEnv(async (url) => {
      const u = String(url);
      if (u.indexOf("INDOORID") !== -1) return { ok: true, text: async () => H.gvizPayload(H.HEADERS, rows) };
      return { ok: true, status: 200, text: async () => JSON.stringify({ files: [] }) };
    });
    c.sandbox.SHOP.googleApiKey = "AIzaSyTESTKEY1234567890";
    connect(c.sandbox);
    await c.sandbox.GVCData.load();
    const imgs = await c.sandbox.GVCData.images(c.sandbox.CATALOG[0]);
    check("an empty folder falls back to the placeholder", imgs.length === 0);
    check("and says the sharing is probably wrong",
      c.sandbox.GVCData.state.imageProblems.some(m => /shared/i.test(m)),
      JSON.stringify(c.sandbox.GVCData.state.imageProblems));

    /* Working key and folder */
    const e = H.makeEnv(async (url) => {
      const u = String(url);
      if (u.indexOf("INDOORID") !== -1) return { ok: true, text: async () => H.gvizPayload(H.HEADERS, rows) };
      return { ok: true, status: 200, text: async () => JSON.stringify({
        files: [{ id: "a", name: "1.jpg" }, { id: "b", name: "2.jpg" }, { id: "c", name: "3.jpg" }] }) };
    });
    e.sandbox.SHOP.googleApiKey = "AIzaSyTESTKEY1234567890";
    connect(e.sandbox);
    await e.sandbox.GVCData.load();
    const ok = await e.sandbox.GVCData.images(e.sandbox.CATALOG[0]);
    check("a working folder gives 3 photos for the slideshow", ok.length === 3, "got " + ok.length);
    check("no problem is reported when it works",
      e.sandbox.GVCData.state.imageProblems.length === 0,
      JSON.stringify(e.sandbox.GVCData.state.imageProblems));
  }

  console.log("\n" + "─".repeat(56));
  console.log(pass + " passed, " + fail + " failed");
  if (fail) { console.log("\nFailures:"); failures.forEach(f => console.log("  • " + f)); process.exit(1); }
})().catch(err => { console.error("\nHARNESS CRASH:", err); process.exit(1); });
