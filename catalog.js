
const SHOP = {
  name: "Green View Concepts Nursery",
  city: "Indore",
  address: "9FB Scheme No 94, Near Bangali Square, Ring Road, Bengali Chowk, Indore — 452016",
  phone: "+91 96177 65000",
  email: "greenviewconcepts@gmail.com",

  // 📱 Orders land on this WhatsApp number. Country code, no + and no spaces.
  whatsappNumber: "919617765000",

  // 🚚 Shown to the customer at checkout. Keep it honest — delivery charge
  //    is confirmed by you on WhatsApp, so no promise is made on the site.
  deliveryNote: "Delivery charge depends on your area and is confirmed on WhatsApp before dispatch.",

  // 🔌 OPTIONAL — leave "" unless you add a backend later.
  //    If you ever set up a server (WhatsApp Cloud API / Google Apps Script),
  //    put its URL here. Every order will also be POSTed to it as JSON with the
  //    PDF attached as base64, so the PDF can be delivered to you automatically.
  orderWebhookUrl: "",

  // 🔑 Google Drive photos — paste your API key here to switch photos on.
  //    console.cloud.google.com → Credentials → Create API key → enable "Google Drive API"
  googleApiKey: "",
};

/* ─────────────────────────────────────────────────────────────
   PRODUCTS
   ─────────────────────────────────────────────────────────────
   id       — must be unique and must never change once a customer
              may have it saved in their cart
   price    — plain number, no ₹ and no commas
   cats     — used by the filter chips: indoor | succulent | pots
              | trays | trending
   inStock  — set to false to show "Sold out" instead of the button
   folderId — Google Drive folder ID for that product's photos
   specs    — the facts shown in the quick-view panel
   ─────────────────────────────────────────────────────────── */

const CATALOG = [
  {
    id: "gvc-monstera-deliciosa",
    name: "Monstera Deliciosa", tag: "Air Purifier", price: 899,
    desc: "The iconic split-leaf beauty", emoji: "🌿", bg: "#2d5a27",
    cats: ["indoor", "trending"], inStock: true, folderId: "",
    specs: [
      { label: "Light", value: "Bright, indirect" },
      { label: "Water", value: "Once a week" },
      { label: "Care level", value: "Easy" },
      { label: "Pet friendly", value: "No — keep out of reach" },
      { label: "Supplied in", value: "6 inch nursery pot" },
    ],
  },
  {
    id: "gvc-echeveria-elegans",
    name: "Echeveria Elegans", tag: "Bestseller", price: 299,
    desc: "Mexican snowball rosette", emoji: "🌵", bg: "#6b8e5e",
    cats: ["succulent"], inStock: true, folderId: "",
    specs: [
      { label: "Light", value: "4–6 hrs direct sun" },
      { label: "Water", value: "Every 10–12 days" },
      { label: "Care level", value: "Very easy" },
      { label: "Pet friendly", value: "Yes" },
      { label: "Supplied in", value: "3 inch nursery pot" },
    ],
  },
  {
    id: "gvc-snake-plant",
    name: "Snake Plant", tag: "Low Light", price: 449,
    desc: "Virtually indestructible classic", emoji: "🌱", bg: "#3a6b35",
    cats: ["indoor"], inStock: true, folderId: "",
    specs: [
      { label: "Light", value: "Low to bright" },
      { label: "Water", value: "Every 2–3 weeks" },
      { label: "Care level", value: "Very easy" },
      { label: "Pet friendly", value: "No — keep out of reach" },
      { label: "Supplied in", value: "5 inch nursery pot" },
    ],
  },
  {
    id: "gvc-jade-plant",
    name: "Jade Plant", tag: "Lucky Charm", price: 349,
    desc: "Symbol of prosperity & growth", emoji: "🪴", bg: "#4a7c3f",
    cats: ["succulent"], inStock: true, folderId: "",
    specs: [
      { label: "Light", value: "Bright, some direct sun" },
      { label: "Water", value: "Every 10 days" },
      { label: "Care level", value: "Easy" },
      { label: "Pet friendly", value: "No — keep out of reach" },
      { label: "Supplied in", value: "4 inch nursery pot" },
    ],
  },
  {
    id: "gvc-fiddle-leaf-fig",
    name: "Fiddle Leaf Fig", tag: "Trending", price: 1249,
    desc: "Statement piece for any room", emoji: "🌳", bg: "#2e6e29",
    cats: ["indoor", "trending"], inStock: true, folderId: "",
    specs: [
      { label: "Light", value: "Bright, indirect" },
      { label: "Water", value: "Once a week" },
      { label: "Care level", value: "Needs attention" },
      { label: "Pet friendly", value: "No — keep out of reach" },
      { label: "Supplied in", value: "8 inch nursery pot" },
    ],
  },
  {
    id: "gvc-haworthia-zebra",
    name: "Haworthia Zebra", tag: "Rare Find", price: 399,
    desc: "Striking zebra-striped succulent", emoji: "🌵", bg: "#5a8b4e",
    cats: ["succulent", "trending"], inStock: true, folderId: "",
    specs: [
      { label: "Light", value: "Bright, indirect" },
      { label: "Water", value: "Every 2 weeks" },
      { label: "Care level", value: "Very easy" },
      { label: "Pet friendly", value: "Yes" },
      { label: "Supplied in", value: "3 inch nursery pot" },
    ],
  },
  {
    id: "gvc-peace-lily",
    name: "Peace Lily", tag: "Elegant", price: 599,
    desc: "Graceful white blooms year-round", emoji: "🪷", bg: "#3d7a37",
    cats: ["indoor"], inStock: true, folderId: "",
    specs: [
      { label: "Light", value: "Low to medium" },
      { label: "Water", value: "Twice a week" },
      { label: "Care level", value: "Easy" },
      { label: "Pet friendly", value: "No — keep out of reach" },
      { label: "Supplied in", value: "6 inch nursery pot" },
    ],
  },
  {
    id: "gvc-aloe-vera",
    name: "Aloe Vera", tag: "Medicinal", price: 249,
    desc: "Nature's healing wonder", emoji: "🌿", bg: "#4f8a43",
    cats: ["succulent"], inStock: true, folderId: "",
    specs: [
      { label: "Light", value: "4–6 hrs direct sun" },
      { label: "Water", value: "Every 2 weeks" },
      { label: "Care level", value: "Very easy" },
      { label: "Pet friendly", value: "No — keep out of reach" },
      { label: "Supplied in", value: "5 inch nursery pot" },
    ],
  },
  {
    id: "gvc-string-of-pearls",
    name: "String of Pearls", tag: "Unique", price: 499,
    desc: "Cascading succulent beauty", emoji: "🍃", bg: "#367032",
    cats: ["succulent", "trending"], inStock: true, folderId: "",
    specs: [
      { label: "Light", value: "Bright, indirect" },
      { label: "Water", value: "Every 2 weeks" },
      { label: "Care level", value: "Needs attention" },
      { label: "Pet friendly", value: "No — keep out of reach" },
      { label: "Supplied in", value: "4 inch hanging pot" },
    ],
  },
  {
    id: "gvc-rubber-plant",
    name: "Rubber Plant", tag: "Statement", price: 799,
    desc: "Bold burgundy glossy leaves", emoji: "🌳", bg: "#2a5d24",
    cats: ["indoor"], inStock: true, folderId: "",
    specs: [
      { label: "Light", value: "Bright, indirect" },
      { label: "Water", value: "Once a week" },
      { label: "Care level", value: "Easy" },
      { label: "Pet friendly", value: "No — keep out of reach" },
      { label: "Supplied in", value: "6 inch nursery pot" },
    ],
  },
  {
    id: "gvc-zz-plant",
    name: "ZZ Plant", tag: "Hardy", price: 549,
    desc: "Thrives on neglect, shines always", emoji: "🌱", bg: "#4d7e41",
    cats: ["indoor"], inStock: true, folderId: "",
    specs: [
      { label: "Light", value: "Low to bright" },
      { label: "Water", value: "Every 2–3 weeks" },
      { label: "Care level", value: "Very easy" },
      { label: "Pet friendly", value: "No — keep out of reach" },
      { label: "Supplied in", value: "6 inch nursery pot" },
    ],
  },
  {
    id: "gvc-crassula-ovata",
    name: "Crassula Ovata", tag: "Compact", price: 279,
    desc: "Miniature tree-like succulent", emoji: "🌵", bg: "#5d9051",
    cats: ["succulent", "trending"], inStock: true, folderId: "",
    specs: [
      { label: "Light", value: "Bright, some direct sun" },
      { label: "Water", value: "Every 10 days" },
      { label: "Care level", value: "Very easy" },
      { label: "Pet friendly", value: "No — keep out of reach" },
      { label: "Supplied in", value: "3 inch nursery pot" },
    ],
  },

  /* ─── Ceramic pots ─── */
  {
    id: "gvc-pot-matte-white-6",
    name: "Matte White Ceramic Pot", tag: "6 inch", price: 449,
    desc: "Clean matte finish, fits most desk plants", emoji: "🏺", bg: "#8a9a80",
    cats: ["pots"], inStock: true, folderId: "",
    specs: [
      { label: "Material", value: "Glazed ceramic" },
      { label: "Size", value: '6" wide × 6" tall' },
      { label: "Drainage hole", value: "Yes" },
      { label: "Saucer", value: "Included" },
      { label: "Pairs with", value: "Snake Plant, ZZ Plant" },
    ],
  },
  {
    id: "gvc-pot-terracotta-ribbed-8",
    name: "Terracotta Ribbed Pot", tag: "8 inch", price: 699,
    desc: "Hand-thrown ribs, warm earthy tone", emoji: "🏺", bg: "#c4956a",
    cats: ["pots", "trending"], inStock: true, folderId: "",
    specs: [
      { label: "Material", value: "Terracotta" },
      { label: "Size", value: '8" wide × 8" tall' },
      { label: "Drainage hole", value: "Yes" },
      { label: "Saucer", value: "Included" },
      { label: "Pairs with", value: "Fiddle Leaf Fig, Rubber Plant" },
    ],
  },
  {
    id: "gvc-pot-sage-bowl-5",
    name: "Sage Glazed Bowl Planter", tag: "5 inch", price: 399,
    desc: "Shallow bowl made for succulents", emoji: "🥣", bg: "#7a9e6f",
    cats: ["pots"], inStock: true, folderId: "",
    specs: [
      { label: "Material", value: "Glazed ceramic" },
      { label: "Size", value: '5" wide × 2.5" deep' },
      { label: "Drainage hole", value: "Yes" },
      { label: "Saucer", value: "Not required" },
      { label: "Pairs with", value: "Echeveria, Haworthia" },
    ],
  },
  {
    id: "gvc-pot-charcoal-cylinder-7",
    name: "Charcoal Cylinder Pot", tag: "7 inch", price: 599,
    desc: "Deep charcoal glaze with saucer", emoji: "🏺", bg: "#4a4a46",
    cats: ["pots"], inStock: true, folderId: "",
    specs: [
      { label: "Material", value: "Glazed ceramic" },
      { label: "Size", value: '7" wide × 7.5" tall' },
      { label: "Drainage hole", value: "Yes" },
      { label: "Saucer", value: "Included" },
      { label: "Pairs with", value: "Peace Lily, Monstera" },
    ],
  },

  /* ─── Succulent trays ─── */
  {
    id: "gvc-tray-four-plant",
    name: "Four-Plant Succulent Tray", tag: "Gift Ready", price: 999,
    desc: "Four hand-picked succulents, arranged", emoji: "🪴", bg: "#5c7a4a",
    cats: ["trays", "trending"], inStock: true, folderId: "",
    specs: [
      { label: "Contains", value: "4 succulents, our pick" },
      { label: "Tray size", value: '10" × 5" ceramic' },
      { label: "Water", value: "Light spray every 10 days" },
      { label: "Care level", value: "Very easy" },
      { label: "Good for", value: "Desks, housewarming gifts" },
    ],
  },
  {
    id: "gvc-tray-mini-cactus-trio",
    name: "Mini Cactus Trio Tray", tag: "Compact", price: 649,
    desc: "Three tiny cacti in a wooden tray", emoji: "🌵", bg: "#6b8e5e",
    cats: ["trays"], inStock: true, folderId: "",
    specs: [
      { label: "Contains", value: "3 mini cacti" },
      { label: "Tray size", value: '8" × 3" wooden' },
      { label: "Water", value: "Every 2–3 weeks" },
      { label: "Care level", value: "Very easy" },
      { label: "Good for", value: "Study tables, small windows" },
    ],
  },
  {
    id: "gvc-tray-zen-pebble",
    name: "Zen Pebble Succulent Tray", tag: "Signature", price: 1199,
    desc: "Succulents set among river pebbles", emoji: "🪷", bg: "#3d7a37",
    cats: ["trays"], inStock: true, folderId: "",
    specs: [
      { label: "Contains", value: "5 succulents + pebbles" },
      { label: "Tray size", value: '12" × 6" ceramic' },
      { label: "Water", value: "Light spray every 10 days" },
      { label: "Care level", value: "Easy" },
      { label: "Good for", value: "Reception desks, gifting" },
    ],
  },
];

/* Photos auto-slide every 4 seconds */
const SLIDE_INTERVAL = 4000;
