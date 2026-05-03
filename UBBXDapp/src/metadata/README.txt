Off-chain book metadata (UBBX)

- After you list with "Anchor hash" checked, save the downloaded file as:
    metadata/<listingId>.json
  where <listingId> is the number from the success toast (same as on-chain event).

- The file bytes must match exactly what was hashed (UTF-8). Do not reformat or add fields.

- If you did not anchor a hash, you may still add metadata/<id>.json for display; the UI will load it but will not show a green hash check.

- example-listing-1.json shows the canonical key order used by the DApp when anchoring:
  title, author, edition, notes, imageURL, contact

- Local: keep this folder next to index.html so ./metadata/7.json works.

- GitHub Pages: commit metadata/*.json in the repo branch Pages serves. Then in the DApp,
  set "Metadata files base URL" to the public folder URL with trailing slash, e.g.
  https://YOURUSER.github.io/YOURREPO/UBBXDapp/src/metadata/
  so the app loads https://.../metadata/7.json for listing 7.
