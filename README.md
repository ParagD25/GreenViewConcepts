# Green View Concepts Nursery — shop update

Your site now takes orders. Customers add plants and pots to a cart, review them on a
checkout page, fill in their name and WhatsApp number, and press one button. That button
builds a formatted PDF order summary and opens WhatsApp addressed to **+91 96177 65000**
with the whole order already typed out.

---

## Running it

Nothing about how you run the site has changed.

```bash
npm install     # only needed the first time
npm run dev     # opens on http://localhost:3000
```

To publish, upload the whole folder — including the `vendor` folder — to your host.

---

## Files

| File | What it does |
|---|---|
| **`catalog.js`** | **The only file you need to edit.** Your WhatsApp number, prices, product names, stock status, photo folder IDs. |
| `index.html` | Home page. |
| `checkout.html` | New checkout page. |
| `cart.js` | Keeps the cart saved between visits. Shared by both pages. |
| `script.js` | Home page behaviour — gallery, search, cart drawer, quick view. |
| `checkout.js` | Checkout, the PDF, and the WhatsApp handoff. |
| `styles.css` | All styling, in your existing colours and fonts. |
| `vendor/jspdf.umd.min.js` | Builds the PDF inside the customer's browser. Must be uploaded with the rest. |

---

## Day-to-day edits

Everything lives at the top of **`catalog.js`**.

**Change your WhatsApp number**

```js
whatsappNumber: "919617765000",   // country code, no + and no spaces
```

**Change a price** — plain numbers, no ₹ and no commas:

```js
{ id: "gvc-monstera-deliciosa", name: "Monstera Deliciosa", price: 899, ... }
```

**Mark something as sold out** — the Add to cart button becomes "Sold out":

```js
inStock: false,
```

**Add a new product** — copy an existing block and change the details. Two rules:

- `id` must be unique, and never change it afterwards. A customer may have that id sitting
  in their saved cart.
- `cats` decides which filter chips it appears under: `indoor`, `succulent`, `pots`,
  `trays`, `trending`. A product can be in several.

**Product photos** work exactly as before. Paste your Google API key into
`googleApiKey` and a Drive folder ID into each product's `folderId`. Until then, each
card shows its plant emoji on a coloured tile.

---

## How an order reaches you

1. Customer adds items and opens the checkout page.
2. They enter name and WhatsApp number (email optional), and choose pickup or delivery.
3. Pressing **Create PDF & send on WhatsApp**:
   - saves a PDF order summary to their device,
   - opens WhatsApp on your number with the full order typed out — every item, quantity,
     the total, their details, and any notes,
   - shows them a three-step panel telling them to press send, and to attach the PDF.
4. You reply with the final amount and the delivery charge. Payment happens on pickup or
   delivery, exactly as it does today.

**Worth knowing:** a website cannot attach a file to WhatsApp by itself. WhatsApp links
only carry text, and sending files needs the paid WhatsApp Business API running on a
server. So the PDF downloads to the customer's phone and attaching it is one tap, shown
as step 3. The message alone already contains everything you need, so an order is never
lost if they skip that step.

**If you want true automatic PDF delivery later**, the code is ready for it. Set:

```js
orderWebhookUrl: "https://your-server.example.com/orders",
```

Every order will then also be POSTed to that address as JSON, with the PDF included as
base64 — no changes to the site needed. A Google Apps Script or a small Node server with
the WhatsApp Cloud API is enough to receive it.

---

## The PDF

One page for a normal order, with your green header, the customer's details, an itemised
table, the total, their notes, and a "what happens next" section. Longer orders continue
onto more pages with the table header and page numbers repeated.

Order IDs look like `GVC-260819-4821` — the date, then a random number.

The PDF prints **Rs. 899** instead of ₹899. Standard PDF fonts have no rupee symbol and
would print an empty box. The website and the WhatsApp message both use ₹ normally.

---

## What else was added

- **Search and sort** across the gallery, plus filter chips for ceramic pots and trays.
- **Quick view** on any product with real care facts — light, water, care level, whether
  it's safe around pets, and what size pot it comes in. Edit these in `catalog.js` under
  `specs`.
- **Save for later** — the heart on each card, with a "♥ Saved" filter chip.
- **Cart drawer** that slides in from the right, with quantity steppers and an undo when
  something is removed.
- **"Goes well with this"** on the checkout page, suggesting a pot when there's a plant in
  the cart. This is where pot sales come from.
- **Gift orders** — a checkbox and a card message, both carried into the PDF and the
  WhatsApp message.
- **Your contact form now works.** It opens WhatsApp with the enquiry composed instead of
  doing nothing.
- Floating WhatsApp, cart and back-to-top buttons; toast confirmations; keyboard support
  (Esc closes the cart and quick view); and reduced-motion support for people who ask
  their phone to limit animation.

---

## Things you may want to change

- **Delivery wording.** `deliveryNote` in `catalog.js` currently reads "Delivery charge
  depends on your area and is confirmed on WhatsApp before dispatch." It deliberately
  promises nothing, since your features strip has free delivery commented out.
- **The four ceramic pots and three succulent trays** are placeholders I added so the cart
  has pots in it — the names, prices and sizes are invented. Replace them with your real
  stock before going live.
- **Care details** in `specs` are sensible defaults, but you know your plants better.
