# Green View Concepts Nursery — website

The shop now runs from **Google Sheets**. You edit a sheet, the website
follows. No code, no re-uploading, no waiting for a developer.

Everything that already worked — cart, wishlist, quick view, PDF order
summary, WhatsApp checkout — still works exactly as before.

---

## Running it

```bash
npm install     # only the first time
npm run dev     # http://localhost:3000
```

To publish, upload the whole folder, including `vendor/` and `assets/`.

---

## Setting up your sheets (about a minute each)

You need one sheet per main category: **Indoor Plants**, **Outdoor
Plants**, **Pots**. You already have the indoor one.

### 1. Column names

Row 1 of the sheet must have these headings. Order doesn't matter, extra
columns are ignored, and capitals/spaces/underscores don't matter either.

| Product_ID | Product_Name | Pot_Size | Price | Image_URL | Out_of_stock | Note |
|---|---|---|---|---|---|---|
| AGL-101 | Aglaonema Anjuman | 3 Inch | 200 | *(Drive link)* | ☐ | Optional |

### 2. Share the sheet

**Share → General access → "Anyone with the link" → Viewer → Done.**

Only *reading* is shared. Nobody but you can edit it. This is required —
the website is read by your customers' browsers, so the sheet has to be
readable by them too.

### 3. Paste the link

Copy the address from your browser's address bar and paste it into
`catalog.js`:

```js
sheets: {
  indoor:  { label: "Indoor Plants",  emoji: "🌿", url: "PASTE HERE" },
  outdoor: { label: "Outdoor Plants", emoji: "🌳", url: "" },
  pots:    { label: "Pots",           emoji: "🏺", url: "" },
},
```

Leave a category blank and it simply doesn't appear on the site. So you
can launch with indoor plants today and add the other two later without
touching anything else.

---

## Day-to-day: your sheet is the control panel

| You want to… | Do this in the sheet |
|---|---|
| Change a price | Type the new number in **Price**. Plain numbers — `250`, not `₹250`. (Though `₹1,250` and `Rs. 900` are understood too.) |
| Rename a plant | Edit **Product_Name** |
| Mark something sold out | Tick the **Out_of_stock** checkbox. An "Out of stock" banner appears across the photo and the Add button disappears. Untick it to bring it back. |
| Add a new plant | New row. Give it a code with the right three letters — `AGL-114` joins Aglaonema automatically. |
| Add a whole new category | Use new letters, e.g. `TUL-101`. It appears immediately with a category made from the code. To give it a proper name and icon, add a line to `CATEGORY_MAP` in `catalog.js`. |
| Hide something completely | Delete the row |

Changes show up on the next page load. No republishing.

**Don't change a Product_ID once it's live.** A customer may have that
code sitting in their saved cart.

---

## Categories

The first three letters of `Product_ID` decide the category:

`AGL-101`, `AGL-112`, `AGL-113` → all **Aglaonema**

Your current codes are already mapped in `catalog.js`:

| Code | Category |
|---|---|
| AGL | Aglaonema |
| MON | Money Plants |
| DRA | Dracaena & Bamboo |
| FLO | Flowering Plants |
| PAC | Pachira |
| ZAM | ZZ Plants |
| FIC | Ficus & Rubber |
| SCC | Succulents |

On the site this gives you two levels. The **All / Indoor Plants /
Outdoor Plants / Pots** tabs come from your three sheets. Underneath,
the plant categories appear as chips, and the same categories fill the
tiles in the "Our Specialities" section on the front page. Tapping
Aglaonema anywhere shows every AGL plant with a "← All categories"
link back out.

Categories, counts and tiles are all worked out from the sheet. You
never maintain them by hand.

---

## Photos

`Image_URL` takes a **Google Drive folder link** — one folder per
plant, 3–4 photos inside. The site turns them into a slideshow that
auto-advances every 4 seconds, with dots and arrows.

It also accepts a single Drive file link, a plain image address
(`https://…/photo.jpg`), or several addresses separated by commas.

**Right now every plant shows a placeholder picture**
(`assets/placeholder-plant.svg`) because no photos are connected yet.
That's expected and the site looks fine like this. Swap the file for
your own if you'd like a different holding image.

### Drive folders need an API key — single images don't

This trips everyone up, so plainly:

- **A link to one image** works immediately, no setup.
- **A link to a folder** needs a Google API key. A browser cannot see
  what's inside a Drive folder without one — there is no way around it.

So if you paste a folder link and see the placeholder, the key is almost
certainly what's missing. The site now says so under the gallery instead
of failing quietly.

Setting it up:

1. `console.cloud.google.com` → create a project
2. APIs & Services → Library → enable **Google Drive API**
3. Credentials → Create credentials → **API key**
4. Restrict it: website restriction = your domain, API restriction =
   Google Drive API only
5. Paste it into `googleApiKey` in `catalog.js`
6. Share each photo folder: **right-click → Share → Anyone with the link
   → Viewer**

Folders are re-checked once a day and remembered in between.

**Don't want the key?** Put the individual image links in `Image_URL`
separated by commas. You still get the slideshow:

```
https://drive.google.com/file/d/AAA/view, https://drive.google.com/file/d/BBB/view
```

Each file still needs to be shared as "Anyone with the link".

### When something isn't showing

Open the browser console (F12) and run:

```js
GVCData.diagnose()
```

It prints every sheet, how many products each contributed, which tab it
read, whether the API key is set, and what went wrong.

The usual causes:

| Symptom | Cause |
|---|---|
| A category tab never appears | That sheet failed to load, or every row's `Product_ID` clashes with another sheet's |
| Outdoor/Pots missing after pasting links | All three sheets are tabs of **one** spreadsheet and the same link was pasted three times. Open each tab and copy the link from the address bar — the `gid=` number at the end must differ |
| Folder photos blank, single images fine | No API key |
| Photos blank even with a key | Folder isn't shared publicly, or the Drive API isn't enabled |

---

## Pot suggestions

Pick a plant and the site offers pots that actually fit it.

A plant in a 3 inch nursery pot is offered roughly 4 inch pots; a 10
inch ZZ plant is offered your biggest. A hanging plant is offered
hanging pots and nothing else. Out-of-stock pots are never suggested.

It appears in three places: a dropdown that opens on the card the
moment a plant is added to the cart, a row of pot cards in the plant's
pop-up, and a "Pots that fit your plants" strip on the checkout page.

The sizing comes from the **Pot_Size** column of both sheets, so it
gets better the moment your Pots sheet is connected. Until then it uses
the sample pots at the bottom of `catalog.js` — **replace those with
your real stock before going live**, the names and prices are invented.

Matching is by size: a 5 inch plant is offered 5 inch pots, or 4 and 6
at a push. If too few are that close the net widens rather than showing
nothing. Change it in `catalog.js`:

```js
const POT_RULES = {
  sizeUpInches: 0,      // 0 = same size as the plant's nursery pot
  toleranceInches: 1,   // one inch either way still counts
  howMany: 4,           // suggestions shown per plant
};
```

Each pot shows its own photograph from the `Image_URL` column of your
Pots sheet, so fill that in — people choose a pot by how it looks.

---

## If something goes wrong

The site is built so a customer never sees a broken page.

| What happened | What the customer sees |
|---|---|
| Google is slow or down | The prices from their last visit, and a small note saying so |
| First visit, and Google is down | A short sample range, and a note asking them to confirm on WhatsApp |
| One sheet broken, others fine | The working categories. The broken one is skipped |
| A column got renamed | Same as above, with the reason in the browser console |
| A photo folder is unreachable | The placeholder picture |
| A price cell has text in it | "Price on request" and an **Ask price** button that opens WhatsApp |
| A row has no code or no name | That row is skipped, everything else loads |

The cart is the important one: it remembers each item's name and price
at the moment it was added, so **a customer's cart never empties itself**
even if the sheet is unreachable when they return.

If an item is ticked out-of-stock *after* someone added it, it stays in
their order and is flagged "we'll confirm on WhatsApp" rather than
vanishing.

---

## Files

| File | What it does |
|---|---|
| **`catalog.js`** | **The only file you edit.** Sheet links, category names, pot rules, care notes, WhatsApp number. |
| `data.js` | Reads the sheets, handles photos and pot matching. Leave alone. |
| `index.html` | Home page |
| `checkout.html` | Checkout page |
| `cart.js` | The cart, shared by both pages |
| `script.js` | Home page behaviour |
| `checkout.js` | Checkout, PDF, WhatsApp handoff |
| `styles.css` | All styling |
| `assets/placeholder-plant.svg` | The holding image |
| `vendor/jspdf.umd.min.js` | Builds the PDF. Must be uploaded. |
| `apps-script/order-inbox.gs` | Paste into script.google.com so orders reach you automatically. Not uploaded with the site. |

---

## How an order reaches you

The customer fills in their name and WhatsApp number and presses one
button. Three things then happen:

1. **The order sheet is sent straight to you** — emailed with the PDF
   attached, filed in Drive, and logged in a spreadsheet. The customer
   does nothing.
2. WhatsApp opens on their phone with the whole order typed out on your
   number, +91 96177 65000. They press send so you have a thread to
   reply in.
3. They see "Your order has reached the nursery", with an optional
   Download a copy button.

Each item carries its code — `Aglaonema Anjuman · 3 Inch [AGL-101]` —
so you can look it up in your sheet.

### Gift extras

At checkout, ticking "This order is a gift" reveals extras the customer
can pick in any combination. Prices live in `catalog.js`:

```js
const GIFT_EXTRAS = [
  { id: "box", label: "Gift box packing", price: 50, ... },
  { id: "bag", label: "Gift bag",         price: 25, ... },
  { id: "tag", label: "Custom message tag", price: 0, wantsMessage: true, ... },
];
```

They're added to the order total and appear on the summary, the PDF, the
WhatsApp message and the email. `wantsMessage: true` makes the message
box appear when that extra is chosen. Delete a line to stop offering it.

### Setting up the order inbox

Open `apps-script/order-inbox.gs` and follow the instructions at the
top. About five minutes, free, no server. Paste the resulting URL into
`orderInboxUrl` in `catalog.js`.

**Until you do that**, the site behaves as it did before: the PDF saves
to the customer's device and they attach it on WhatsApp themselves.
Nothing breaks either way.

If delivery fails for any reason — you're over Gmail's daily quota, the
script is mid-redeploy, the customer's connection drops — the PDF is
saved to their device and the wording changes to ask them to attach it.
An order is never lost.

## Still to do

- Connect the indoor sheet (paste the link into `catalog.js`)
- Create the Outdoor Plants and Pots sheets
- Replace the sample pots at the bottom of `catalog.js` with real stock
- Add the Google API key when photo folders are ready
- Set up the order inbox so PDFs reach you without the customer attaching them
- Fill in `Image_URL` on the Pots sheet so pot suggestions show photographs
- Check the care notes in `CARE_HINTS` — they're sensible defaults, but
  you know your plants better
