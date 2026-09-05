/* Loads catalog.js + data.js in a fake browser and lets tests
   drive the sheet responses. */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function makeEnv(fetchImpl) {
  const listeners = {};
  const store = {};

  const sandbox = {
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    JSON, Math, Date, Promise, Object, Array, String, Number, isFinite, parseFloat, parseInt,
    encodeURIComponent, decodeURIComponent,
    AbortController: class { constructor() { this.signal = {}; } abort() {} },
    fetch: fetchImpl,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    document: {
      addEventListener: (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); },
      dispatchEvent: (ev) => {
        (listeners[ev.type] || []).forEach((fn) => fn(ev));
        return true;
      },
    },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  const ctx = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "catalog.js"), "utf8"), ctx, { filename: "catalog.js" });
  vm.runInContext(fs.readFileSync(path.join(ROOT, "data.js"), "utf8"), ctx, { filename: "data.js" });

  /* vm keeps top-level const/let in a lexical scope rather than on the
     sandbox object, so surface the ones the tests need. CATALOG is
     copied by reference — it must stay the same array. */
  vm.runInContext(
    "window.SHOP = SHOP; window.CATALOG = CATALOG; window.CATEGORY_MAP = CATEGORY_MAP;" +
    "window.CATEGORY_ORDER = CATEGORY_ORDER; window.POT_RULES = POT_RULES;" +
    "window.FALLBACK_CATALOG = FALLBACK_CATALOG;", ctx);

  return { ctx, sandbox, store };
}

/* ─── The real indoor-plant data, straight from the screenshots ─── */
const HEADERS = ["Product_ID", "Product_Name", "Pot_Size", "Price", "Image_URL", "Out_of_stock", "Note"];

const INDOOR_ROWS = [
  ["AGL-101", "Aglaonema Anjuman", "3 Inch", 200, "", false, ""],
  ["AGL-102", "Aglaonema Super White", "3 Inch", 200, "", false, ""],
  ["AGL-103", "Aglaonema Super Red", "3 Inch", 250, "", false, ""],
  ["AGL-106", "Aglaonema Anjuman", "5-8 Inch", 550, "", false, ""],
  ["AGL-111", "Aglaonema Pink Dot", "5 Inch", 550, "", false, ""],
  ["AGL-113", "Aglaonema White Legacy", "5 Inch", 750, "", false, ""],
  ["MON-101", "Philodendron Oxycardium Money Plant", "5 Inch", 250, "", false, ""],
  ["MON-102", "Golden Money Plant", "5 Inch", 150, "", true, "Back next week"],
  ["MON-106", "Scindapsus Money Plant", "Hanging", 250, "", false, ""],
  ["MON-108", "Golden Money Plant", "Hanging", 450, "", false, ""],
  ["DRA-101", "Dracaena", "3 cm", 200, "", false, ""],
  ["DRA-103", "Lucky Bamboo Spiral Stick", "30 cm", 200, "", false, ""],
  ["DRA-105", "Lucky Bamboo 2 Layer with Glass", "", 300, "", false, ""],
  ["DRA-107", "Lucky Bamboo 5 Layer with Glass", "", 1200, "", false, ""],
  ["FLO-101", "Anthurium", "5 Inch", 350, "", false, ""],
  ["FLO-106", "Orchids", "", 550, "", false, ""],
  ["PAC-101", "Pachira Braided", "4 Inch", 1050, "", false, ""],
  ["ZAM-101", "ZZ Plant", "4 Inch", 100, "", false, ""],
  ["ZAM-105", "Green ZZ Plant", "10 Inch", 1200, "", false, ""],
  ["FIC-101", "Variegated Rubber Plant", "4 Inch", 250, "", false, ""],
  ["SCC-101", "Echeveria", "2 Inch", 100, "", false, ""],
  ["SCC-104", "Jade Plant Plastic Bag", "", 50, "", false, ""],
  ["SCC-111", "Haworthia", "3 Inch", 150, "", false, ""],
  ["", "", "", "", "", "", ""],                                 // blank row, must be skipped
];

const POT_ROWS = [
  ["POT-201", "Matte White Ceramic Pot", "6 Inch", 449, "", false, ""],
  ["POT-202", "Charcoal Cylinder Pot", "7 Inch", 599, "", false, ""],
  ["TER-201", "Terracotta Ribbed Pot", "8 Inch", 699, "", false, ""],
  ["POT-203", "Ivory Stoneware Pot", "4 Inch", 349, "", false, ""],
  ["POT-204", "Mini Glazed Pot", "3 Inch", 249, "", false, ""],
  ["HNG-201", "Ceramic Hanging Pot", "Hanging", 549, "", true, "Restocking"],
  ["HNG-202", "Macrame Hanging Planter", "Hanging", 399, "", false, ""],
];

function gvizPayload(headers, rows) {
  const body = {
    table: {
      cols: headers.map((h, i) => ({ id: "C" + i, label: h, type: "string" })),
      rows: rows.map((r) => ({ c: r.map((v) => (v === "" ? null : { v })) })),
    },
  };
  return "/*O_o*/\ngoogle.visualization.Query.setResponse(" + JSON.stringify(body) + ");";
}

function csvPayload(headers, rows) {
  const esc = (v) => {
    const s = String(v === null || v === undefined ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [headers.map(esc).join(",")]
    .concat(rows.map((r) => r.map(esc).join(",")))
    .join("\n");
}

module.exports = { makeEnv, HEADERS, INDOOR_ROWS, POT_ROWS, gvizPayload, csvPayload, ROOT };
