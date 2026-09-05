/* ═══════════════════════════════════════════════════════════
   GREEN VIEW CONCEPTS — SETTINGS
   This is the only file you edit by hand. Everything else
   (names, prices, stock, photos) now comes from Google Sheets.
   ═══════════════════════════════════════════════════════════ */

   const SHOP = {
    name: "Green View Concepts Nursery",
    city: "Indore",
    address: "9FB Scheme No 94, Near Bangali Square, Ring Road, Bengali Chowk, Indore — 452016",
    phone: "+91 96177 65000",
    email: "greenviewconcepts@gmail.com",
  
    // 📱 Orders land on this WhatsApp number. Country code, no + and no spaces.
    whatsappNumber: "919617765000",
  
    // 🚚 Shown to the customer at checkout.
    deliveryNote: "Delivery charge depends on your area and is confirmed on WhatsApp before dispatch.",
  
    /* 📥 ORDER INBOX — where completed orders are sent, PDF and all,
       so you don't have to rely on the customer attaching anything.
  
       Set this up with apps-script/order-inbox.gs — it takes about five
       minutes, is free, and emails you every order with the PDF attached
       plus files a copy in Drive and a row in a log spreadsheet.
  
       Leave "" and the site behaves as before: the PDF saves to the
       customer's device and they attach it on WhatsApp themselves.      */
    orderInboxUrl: "https://script.google.com/macros/s/AKfycbzcq7D25LkEueqTVLZ3qolDZrM44YMWc_di0pqE_OpT7bl1_NlI2pDuqM2U_88a62ePUQ/exec",
  
    /* 🔑 GOOGLE API KEY — only needed for plant PHOTOS, not for prices.
       The site works fine without it; every plant just shows the
       placeholder picture until you add one.
  
       console.cloud.google.com → Create project → APIs & Services
         → Enable "Google Drive API"
         → Credentials → Create credentials → API key
         → Restrict it: Website restrictions = your domain,
           API restrictions = Google Drive API only.                */
    googleApiKey: "",
  
    /* 🖼 Shown whenever a plant has no photos yet. Swap in your own
       file (assets/your-photo.jpg) whenever you like.              */
    placeholderImage: "assets/placeholder-plant.svg",
  
    /* ═════════════════════════════════════════════════════════
       📊 YOUR GOOGLE SHEETS — one per main category
       ═════════════════════════════════════════════════════════
  
       HOW TO CONNECT A SHEET (takes about a minute):
  
         1. Open the sheet in Google Sheets.
         2. Press "Share" → General access → change "Restricted"
            to "Anyone with the link" → role "Viewer" → Done.
         3. Copy the address from your browser's address bar.
         4. Paste it below, between the quotes.
  
       That's it. The sheet stays private to edit — the link only
       lets people read it, which is what the website does.
  
       Your columns must be named exactly like this, in row 1
       (order doesn't matter, extra columns are ignored):
  
         Product_ID | Product_Name | Pot_Size | Price | Image_URL | Out_of_stock | Note
  
       If a sheet is left blank below, that category simply doesn't
       appear on the site — so you can add Outdoor and Pots later
       without touching anything else.                              */
  
    sheets: {
      indoor: {
        label: "Indoor Plants",
        emoji: "🌿",
        url: "https://docs.google.com/spreadsheets/d/1ctuC1fmw8ujpI-lsWlOf3laa9D9SCnBRt8GNQy_L08o/edit?usp=sharing",   // ← paste your INDOOR PLANTS sheet link here
      },
      outdoor: {
        label: "Outdoor Plants",
        emoji: "🌳",
        url: "",   // ← paste your OUTDOOR PLANTS sheet link here (later)
      },
      pots: {
        label: "Pots",
        emoji: "🏺",
        url: "",   // ← paste your POTS sheet link here (later)
      },
    },
  
    /* Which tab inside the sheet to read. "" means the first tab.
       Only change this if your data sits on a second tab.          */
    sheetTabGid: "",
  
    /* How many products to show before the "Show more" button.     */
    pageSize: 12,
  };
  
  /* ═══════════════════════════════════════════════════════════
     🏷 PLANT CATEGORIES
     ═══════════════════════════════════════════════════════════
     The first three letters of Product_ID decide the category.
     "AGL-101" and "AGL-112" both land under Aglaonema.
  
     To add a new category, add a line here and start using that
     code in the sheet. If you forget to add it here nothing
     breaks — the site invents a sensible name from the code and
     shows the plants anyway.
     ═══════════════════════════════════════════════════════════ */
  
  const CATEGORY_MAP = {
    AGL: { label: "Aglaonema",         emoji: "🌿", bg: "#2d5a27", desc: "Chinese evergreens with hand-painted leaves" },
    MON: { label: "Money Plants",      emoji: "🍀", bg: "#3a6b35", desc: "Trailing greens said to bring good fortune" },
    DRA: { label: "Dracaena & Bamboo", emoji: "🎋", bg: "#4a7c3f", desc: "Lucky bamboo and easy upright dracaenas" },
    FLO: { label: "Flowering Plants",  emoji: "🪷", bg: "#3d7a37", desc: "Anthurium, peace lily and orchids in bloom" },
    PAC: { label: "Pachira",           emoji: "🌳", bg: "#2e6e29", desc: "Braided money trees with a sculpted trunk" },
    ZAM: { label: "ZZ Plants",         emoji: "🌱", bg: "#4d7e41", desc: "Glossy, near-indestructible, thrives on neglect" },
    FIC: { label: "Ficus & Rubber",    emoji: "🍃", bg: "#2a5d24", desc: "Bold, glossy statement foliage" },
    SCC: { label: "Succulents",        emoji: "🌵", bg: "#6b8e5e", desc: "Compact rosettes and jade, watered rarely" },
  
    /* Outdoor — add your real codes when that sheet is ready */
    OUT: { label: "Outdoor Plants",    emoji: "🌳", bg: "#3f7a34", desc: "Hardy growers for balconies and terraces" },
    FLW: { label: "Flowering Shrubs",  emoji: "🌺", bg: "#54823f", desc: "Colour through the season" },
  
    /* Pots */
    POT: { label: "Ceramic Pots",      emoji: "🏺", bg: "#8a9a80", desc: "Glazed planters, drainage hole and saucer" },
    TER: { label: "Terracotta Pots",   emoji: "🪴", bg: "#c4956a", desc: "Breathable clay, kind to roots" },
    PLS: { label: "Plastic Pots",      emoji: "🪣", bg: "#6f8f66", desc: "Light, sturdy and inexpensive" },
    HNG: { label: "Hanging Pots",      emoji: "🧺", bg: "#5c7a4a", desc: "For trailing plants and railings" },
  };
  
  /* Category shown first, second, third… Anything not listed
     here follows afterwards in alphabetical order. */
  const CATEGORY_ORDER = ["AGL", "MON", "DRA", "FLO", "PAC", "ZAM", "FIC", "SCC"];
  
  /* ═══════════════════════════════════════════════════════════
     🪴 POT MATCHING
     ═══════════════════════════════════════════════════════════
     When a customer picks a plant, the site suggests pots that
     actually fit it. A plant in a 5 inch nursery pot wants a
     6–7 inch decorative pot, so we look for one about this much
     bigger. Raise or lower this if you disagree.
     ═══════════════════════════════════════════════════════════ */
  
  const POT_RULES = {
    sizeUpInches: 0,      // 0 = a pot the same size as the plant's nursery pot
    toleranceInches: 1,   // one inch either way still counts as a fit
    howMany: 4,           // suggestions shown per plant
  };
  
  /* ═══════════════════════════════════════════════════════════
     🎁 GIFT EXTRAS
     ═══════════════════════════════════════════════════════════
     Shown at checkout when the customer ticks "This order is a gift".
     They can pick any combination. Change the prices here; set one to
     0 to make it free. Delete a line to stop offering it.
     ═══════════════════════════════════════════════════════════ */
  
  const GIFT_EXTRAS = [
    { id: "box", label: "Gift box packing", price: 50,
      desc: "Rigid box, tissue and ribbon", emoji: "🎁" },
    { id: "bag", label: "Gift bag", price: 25,
      desc: "Kraft carry bag with handles", emoji: "🛍️" },
    { id: "tag", label: "Custom message tag", price: 0,
      desc: "Handwritten on a card tag", emoji: "🏷️", wantsMessage: true },
  ];
  
  /* Photos auto-slide every 4 seconds */
  const SLIDE_INTERVAL = 4000;
  
  /* ═══════════════════════════════════════════════════════════
     SAFETY NET
     ═══════════════════════════════════════════════════════════
     If Google is unreachable, the sheet link is missing, or the
     internet drops mid-visit, the site falls back to this list so
     customers still see a working shop instead of a blank page.
     Keep a handful of your steadiest sellers here.
     ═══════════════════════════════════════════════════════════ */
  
  const FALLBACK_CATALOG = [
    { id: "AGL-101", name: "Aglaonema Anjuman",       size: "3 Inch",  price: 200,  main: "indoor", note: "Compact, pink-veined and happy in low light" },
    { id: "AGL-113", name: "Aglaonema White Legacy",  size: "5 Inch",  price: 750,  main: "indoor", note: "Cream and green marbling, a collector's pick" },
    { id: "MON-102", name: "Golden Money Plant",      size: "5 Inch",  price: 150,  main: "indoor", note: "The easiest plant we sell — grows in water too" },
    { id: "MON-108", name: "Golden Money Plant",      size: "Hanging", price: 450,  main: "indoor", note: "Ready-grown trails in a hanging pot" },
    { id: "DRA-103", name: "Lucky Bamboo Spiral Stick", size: "30 cm", price: 200,  main: "indoor", note: "Hand-curled stems, grown in plain water" },
    { id: "FLO-104", name: "Peace Lily",              size: "5 Inch",  price: 250,  main: "indoor", note: "White blooms and a great air purifier" },
    { id: "PAC-101", name: "Pachira Braided",         size: "4 Inch",  price: 1050, main: "indoor", note: "Braided money tree, our most gifted plant" },
    { id: "ZAM-102", name: "ZZ Plant",                size: "5 Inch",  price: 350,  main: "indoor", note: "Glossy and forgiving — survives a missed month" },
    { id: "FIC-101", name: "Variegated Rubber Plant", size: "4 Inch",  price: 250,  main: "indoor", note: "Cream-edged leaves with a pink blush" },
    { id: "SCC-105", name: "Jade Plant",              size: "3 Inch",  price: 80,   main: "indoor", note: "The prosperity plant, needs sun and little water" },
    { id: "SCC-111", name: "Haworthia",               size: "3 Inch",  price: 150,  main: "indoor", note: "Zebra-striped rosette for a bright desk" },
  
    /* A few pots so the pot suggestions work before your Pots
       sheet exists. Replace these with your real stock. */
    { id: "POT-101", name: "Matte White Ceramic Pot",  size: "6 Inch",  price: 449, main: "pots", note: "Clean matte glaze with a matching saucer" },
    { id: "TER-101", name: "Terracotta Ribbed Pot",    size: "8 Inch",  price: 699, main: "pots", note: "Hand-thrown ribs in warm natural clay" },
    { id: "POT-102", name: "Sage Glazed Bowl Planter", size: "5 Inch",  price: 399, main: "pots", note: "Shallow bowl made for succulents" },
    { id: "POT-103", name: "Charcoal Cylinder Pot",    size: "7 Inch",  price: 599, main: "pots", note: "Deep charcoal glaze, saucer included" },
    { id: "POT-104", name: "Ivory Stoneware Pot",      size: "4 Inch",  price: 349, main: "pots", note: "Small and neutral, fits any desk plant" },
    { id: "HNG-101", name: "Ceramic Hanging Pot",      size: "Hanging", price: 549, main: "pots", note: "Cotton rope hanger, for trailing greens" },
  ];
  
  /* Filled in by data.js once the sheets load. Never reassigned —
     always edited in place — so every other file keeps working. */
  const CATALOG = [];
  