Off-chain book metadata (UBBX)

- After you list with "Anchor hash" checked, save the downloaded file as:
    metadata/<listingId>.json
  where <listingId> is the number from the success toast (same as on-chain event).

- The file bytes must match exactly what was hashed (UTF-8). Do not reformat or add fields.

- If you did not anchor a hash, you may still add metadata/<id>.json for display; the UI will load it but will not show a green hash check.

- example-listing-1.json shows the canonical key order used by the DApp when anchoring:
  title, author, edition, notes, imageURL, contact

- Local: keep this folder next to index.html so ./metadata/7.json works.

- GitHub Pages (site from repo root): commit metadata/*.json here. Default ./metadata/ in app.js
  loads https://YOURDOMAIN/metadata/7.json (e.g. https://ubbx.purusoni.com/metadata/7.json).
