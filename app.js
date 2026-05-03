/**
 * UBBX DApp — ethers v5 + MetaMask.
 * Operator: set contract addresses and metadataBaseUrl below before publishing.
 */
class App {
    constructor() {
        this.ubbxAddress = "0x780ef830cc76AD6E88FCe62A0e0485b68c227C41";
        this.yodaAddress = "0xbd27d0b7F9fedb5A2A2C3ceF5dC9c70f3CF64Af2";
        /** Catalog JSON: listing 7 → metadata/7.json (trailing slash required). */
        this.metadataBaseUrl = "./metadata/";

        this.ubbxAbiPath = "./UBBX.json";
        this.yodaAbiPath = "./yoda.json";
        this.ubbxAbi = null;
        this.yodaAbi = null;

        this.provider = null;
        this.signer = null;
        this.ubbx = null;
        this.yoda = null;
        this.userAddress = null;
        this.yodaDecimals = 18;
    }

    static num(x) {
        if (x == null) return 0;
        if (typeof x === "number") return x;
        if (typeof x === "bigint") return Number(x);
        if (x.toNumber) return x.toNumber();
        return Number(x);
    }

    static conditionLabel(c) {
        const labels = ["Acceptable", "Good", "Very Good", "Like New"];
        const i = App.num(c);
        return labels[i] ?? String(c);
    }

    static availabilityLabel(a) {
        const labels = ["Available", "Pending", "Sold"];
        const i = App.num(a);
        return labels[i] ?? String(a);
    }

    /** Canonical JSON string for on-chain metadataHash (fixed key order). */
    static canonicalMetadata(m) {
        const o = {
            title: m.title || "",
            author: m.author || "",
            edition: m.edition || "",
            notes: m.notes || "",
            imageURL: m.imageURL || "",
            contact: m.contact || "",
        };
        return JSON.stringify(o);
    }

    static parseError(err) {
        return (
            err?.error?.message ||
            err?.error?.data?.message ||
            err?.data?.message ||
            err?.reason ||
            err?.shortMessage ||
            err?.message ||
            "Transaction failed"
        );
    }

    static truncate(s, max) {
        if (s == null || s === "") return "";
        const t = String(s);
        if (t.length <= max) return t;
        return t.slice(0, max) + "…";
    }

    async loadAbis() {
        const [ubbxRes, yodaRes] = await Promise.all([
            fetch(this.ubbxAbiPath),
            fetch(this.yodaAbiPath),
        ]);
        const ubbxJson = await ubbxRes.json();
        const yodaJson = await yodaRes.json();
        this.ubbxAbi = ubbxJson.abi;
        this.yodaAbi = yodaJson.abi;
    }

    assertConfigured() {
        if (
            !this.ubbxAddress ||
            this.ubbxAddress === ethers.constants.AddressZero
        ) {
            toastr.error("Marketplace is not available right now.");
            return false;
        }
        return true;
    }

    async connect() {
        try {
            if (!window.ethereum) {
                alert("Install MetaMask to use UBBX.");
                return;
            }
            if (!this.ubbxAbi) await this.loadAbis();

            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            await this.provider.send("eth_requestAccounts", []);
            this.signer = this.provider.getSigner();
            this.userAddress = await this.signer.getAddress();

            this.ubbx = new ethers.Contract(
                this.ubbxAddress,
                this.ubbxAbi,
                this.signer
            );
            this.yoda = new ethers.Contract(
                this.yodaAddress,
                this.yodaAbi,
                this.signer
            );

            try {
                this.yodaDecimals = await this.yoda.decimals();
            } catch (_) {
                this.yodaDecimals = 18;
            }

            document.getElementById("walletStatus").textContent =
                "Connected: " + this.userAddress;

            await this.refreshYodaBalance();
            toastr.success("Wallet connected.");
        } catch (e) {
            console.error(e);
            toastr.error(App.parseError(e));
        }
    }

    /** Read-only provider for listing table (no wallet connect required). */
    getReadProvider() {
        if (!window.ethereum) return null;
        return new ethers.providers.Web3Provider(window.ethereum);
    }

    async refreshYodaBalance() {
        if (!this.yoda || !this.userAddress) return;
        try {
            const b = await this.yoda.balanceOf(this.userAddress);
            document.getElementById("yodaBalance").textContent =
                this.formatYodaBalance(b) + " Yoda";
        } catch (e) {
            document.getElementById("yodaBalance").textContent = "—";
        }
    }

    collectMetaFields() {
        return {
            title: document.getElementById("metaTitle").value.trim(),
            author: document.getElementById("metaAuthor").value.trim(),
            edition: document.getElementById("metaEdition").value.trim(),
            notes: document.getElementById("metaNotes").value.trim(),
            imageURL: document.getElementById("metaImage").value.trim(),
            contact: document.getElementById("metaContact").value.trim(),
        };
    }

    priceToWei(wholeTokens) {
        const n = ethers.BigNumber.from(wholeTokens);
        return n.mul(ethers.BigNumber.from(10).pow(this.yodaDecimals));
    }

    async listBook() {
        if (!this.assertConfigured()) return;
        if (!this.ubbx) await this.connect();

        const isbnStr = document.getElementById("inIsbn").value.trim();
        if (!isbnStr) {
            toastr.error("Enter ISBN.");
            return;
        }
        const isbn = ethers.BigNumber.from(isbnStr);
        const wholePrice = document.getElementById("inPrice").value;
        const priceYoda = this.priceToWei(wholePrice);
        const condition = Number(document.getElementById("inCondition").value);

        const meta = this.collectMetaFields();
        const anchor = document.getElementById("anchorHash").checked;
        let metadataHash = ethers.constants.HashZero;
        let canonical = null;
        if (anchor) {
            canonical = App.canonicalMetadata(meta);
            metadataHash = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(canonical)
            );
        }

        try {
            const tx = await this.ubbx.listBook(
                isbn,
                priceYoda,
                condition,
                metadataHash
            );
            const receipt = await tx.wait();
            let newId = null;
            const ubx = this.ubbxAddress.toLowerCase();
            for (const log of receipt.logs) {
                if (log.address.toLowerCase() !== ubx) continue;
                try {
                    const parsed = this.ubbx.interface.parseLog(log);
                    if (parsed && parsed.name === "BookListed") {
                        newId = parsed.args.listingId;
                        break;
                    }
                } catch (_) {}
            }
            if (newId == null) {
                newId = await this.ubbx.listingId();
            }
            const idStr = newId.toString();
            toastr.success("Listed as #" + idStr);

            if (anchor && canonical) {
                this.downloadText(canonical, "metadata-" + idStr + ".json", null);
                toastr.info(
                    "From repo root: node scripts/write-metadata.mjs " +
                        idStr +
                        " path/to/metadata-" +
                        idStr +
                        ".json",
                    "Publish catalog file",
                    { timeOut: 18000 }
                );
            }
            await this.loadListings();
        } catch (e) {
            console.error(e);
            toastr.error("Could not create listing.");
        }
    }

    downloadText(text, filename, hint) {
        const blob = new Blob([text], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        if (hint) toastr.info(hint);
    }

    formatYodaBalance(weiBn) {
        try {
            return ethers.utils.formatUnits(weiBn, this.yodaDecimals);
        } catch (_) {
            return weiBn.toString();
        }
    }

    async purchaseBook() {
        if (!this.assertConfigured()) return;
        if (!this.ubbx) await this.connect();
        const id = document.getElementById("buyId").value;
        if (!id) {
            toastr.error("Enter a listing number.");
            return;
        }
        try {
            const L = await this.ubbx.showBook(id);
            const price = L.priceYoda;
            const allowance = await this.yoda.allowance(
                this.userAddress,
                this.ubbxAddress
            );
            if (allowance.lt(price)) {
                toastr.info("Confirm token access in your wallet.");
                const txA = await this.yoda.approve(
                    this.ubbxAddress,
                    ethers.constants.MaxUint256
                );
                await txA.wait();
            }
            const tx = await this.ubbx.purchaseBook(id);
            await tx.wait();
            toastr.success("Purchased listing #" + id);
            await this.refreshYodaBalance();
            await this.loadListings();
        } catch (e) {
            console.error(e);
            toastr.error("Purchase did not complete.");
        }
    }

    async fetchMetadataJson(listingId) {
        const url = this.metadataBaseUrl.replace(/\/?$/, "/") + listingId + ".json";
        const res = await fetch(url);
        if (!res.ok) return { ok: false, text: null, url };
        const text = await res.text();
        return { ok: true, text, url };
    }

    async loadListings() {
        if (!this.assertConfigured()) return;
        if (!this.ubbxAbi) await this.loadAbis();

        const container = document.getElementById("listingsContainer");
        container.innerHTML =
            '<div class="text-muted py-4 text-center" style="grid-column:1/-1">Loading…</div>';

        const readProv = this.provider || this.getReadProvider();
        if (!readProv) {
            container.innerHTML =
                '<div class="text-muted py-4 text-center" style="grid-column:1/-1">Add a wallet extension to view listings.</div>';
            return;
        }

        const ubbxRead = new ethers.Contract(
            this.ubbxAddress,
            this.ubbxAbi,
            readProv
        );
        const yodaRead = new ethers.Contract(
            this.yodaAddress,
            this.yodaAbi,
            readProv
        );

        let decimals = this.yodaDecimals;
        try {
            decimals = await yodaRead.decimals();
        } catch (_) {}

        try {
            const maxIdBn = await ubbxRead.listingId();
            const maxId = maxIdBn.toNumber();
            const cards = [];

            for (let i = 1; i <= maxId; i++) {
                const L = await ubbxRead.showBook(i);
                const seller = L.seller;
                if (seller === ethers.constants.AddressZero) continue;

                const metaResult = await this.fetchMetadataJson(String(i));
                let metaObj = null;
                let hashOk = null;
                if (metaResult.ok) {
                    try {
                        metaObj = JSON.parse(metaResult.text);
                    } catch (_) {
                        metaObj = { _parseError: "Invalid catalog file" };
                    }
                    const h = L.metadataHash;
                    if (
                        h &&
                        h !== ethers.constants.HashZero &&
                        metaResult.text != null
                    ) {
                        const computed = ethers.utils.keccak256(
                            ethers.utils.toUtf8Bytes(metaResult.text)
                        );
                        hashOk =
                            computed.toLowerCase() === String(h).toLowerCase();
                    }
                }

                const priceWhole = ethers.utils.formatUnits(
                    L.priceYoda,
                    decimals
                );
                const isbnStr = L.isbn.toString();

                const availNum = App.num(L.bookAvailability);
                const isAvailable = availNum === 0;
                const statusLabel = App.availabilityLabel(L.bookAvailability);

                const catalogBroken =
                    !!(metaResult.ok && metaObj && metaObj._parseError);
                const hasMeta = metaObj && !metaObj._parseError;
                const displayTitle = hasMeta
                    ? metaObj.title || "Untitled listing"
                    : catalogBroken
                      ? `Listing #${i} (catalog file error)`
                      : `Textbook listing #${i}`;
                let authorHtml = "";
                if (hasMeta && metaObj.author) {
                    authorHtml = `<p class="ubbx-card-author">by ${escapeHtml(
                        metaObj.author
                    )}</p>`;
                } else if (catalogBroken) {
                    authorHtml = `<p class="ubbx-card-author text-warning small">The seller’s catalog file for this listing is not valid JSON.</p>`;
                } else if (!hasMeta) {
                    authorHtml = `<p class="ubbx-card-author text-muted small">Title, photo, and contact come from the seller’s catalog file for this listing.</p>`;
                }
                const editionLine =
                    hasMeta && metaObj.edition
                        ? `<p class="ubbx-card-line"><strong>Edition:</strong> ${escapeHtml(
                              metaObj.edition
                          )}</p>`
                        : "";
                const notesRaw = hasMeta ? metaObj.notes || "" : "";
                const notesLine =
                    notesRaw
                        ? `<p class="ubbx-card-line"><strong>Pickup / notes:</strong> ${escapeHtml(
                              App.truncate(notesRaw, 220)
                          )}</p>`
                        : "";
                const contactVal = hasMeta ? metaObj.contact || "" : "";
                const contactLine = contactVal
                    ? `<p class="ubbx-card-contact"><strong>Contact seller:</strong> ${escapeHtml(
                          contactVal
                      )}</p>`
                    : `<p class="ubbx-card-contact text-muted small mb-0">No contact in catalog yet — ISBN ${escapeHtml(
                          isbnStr
                      )} is on file for this listing.</p>`;

                let mediaInner;
                if (catalogBroken) {
                    mediaInner = `<div class="ubbx-card-media-placeholder">Catalog error</div>`;
                } else if (hasMeta && metaObj.imageURL) {
                    mediaInner = `<img src="${escapeHtml(
                        metaObj.imageURL
                    )}" alt="" loading="lazy" onerror="this.parentNode.innerHTML='<div class=\\'ubbx-card-media-placeholder\\'>Cover image unavailable</div>'">`;
                } else if (hasMeta) {
                    mediaInner = `<div class="ubbx-card-media-placeholder">No cover image</div>`;
                } else {
                    mediaInner = `<div class="ubbx-card-media-placeholder">Waiting for seller catalog (JSON) for this listing</div>`;
                }

                let verifyHtml = "";
                if (hashOk === true) {
                    verifyHtml =
                        '<span class="ubbx-badge ubbx-badge-verified">Catalog verified</span>';
                } else if (hashOk === false) {
                    verifyHtml =
                        '<span class="ubbx-badge ubbx-badge-warn">Catalog mismatch</span>';
                }

                const statusBadge = isAvailable
                    ? `<span class="ubbx-badge" style="background:#e3f0fa;color:var(--nyse-blue);">For sale</span>`
                    : `<span class="ubbx-badge ubbx-badge-sold">${escapeHtml(
                          statusLabel
                      )}</span>`;

                const buyBtn = isAvailable
                    ? `<button type="button" class="btn-ubbx-select nyse-pick-id" data-id="${i}">Select this book</button>`
                    : `<button type="button" class="btn-ubbx-select" disabled title="Already sold">Sold</button>`;

                cards.push(`<article class="ubbx-card">
  <div class="ubbx-card-media">${mediaInner}</div>
  <div class="ubbx-card-body">
    <h3 class="ubbx-card-title">${escapeHtml(displayTitle)}</h3>
    ${authorHtml}
    ${editionLine}
    ${notesLine}
    ${contactLine}
    <div class="ubbx-card-footer">
      <div class="ubbx-card-stats">
        <span class="ubbx-price">${escapeHtml(priceWhole)} Yoda</span>
        <span>${escapeHtml(App.conditionLabel(L.bookCondition))}</span>
        ${statusBadge}
        ${verifyHtml}
      </div>
      <p class="ubbx-chain-hint mb-2">ISBN ${escapeHtml(isbnStr)} · Listing #${i} · Seller ${escapeHtml(
                    seller.slice(0, 6)
                )}…${escapeHtml(seller.slice(-4))}</p>
      ${buyBtn}
    </div>
  </div>
</article>`);
            }

            container.innerHTML =
                cards.length === 0
                    ? '<div class="text-muted py-4 text-center" style="grid-column:1/-1">No listings yet.</div>'
                    : cards.join("");
        } catch (e) {
            console.error(e);
            container.innerHTML =
                '<div class="text-danger py-3 text-center" style="grid-column:1/-1">Listings could not be loaded.</div>';
            toastr.error("Listings could not be loaded.");
        }
    }
}

function escapeHtml(s) {
    if (!s) return "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

document.addEventListener("DOMContentLoaded", async () => {
    const app = new App();
    await app.loadAbis();

    document.getElementById("connectBtn").addEventListener("click", () => {
        app.connect().then(() => app.loadListings());
    });
    document.getElementById("refreshBtn").addEventListener("click", () => {
        app.loadListings();
    });
    document.getElementById("listBtn").addEventListener("click", () => {
        app.listBook();
    });
    document.getElementById("buyBtn").addEventListener("click", () => {
        app.purchaseBook();
    });

    document.getElementById("listingsContainer").addEventListener("click", (ev) => {
        const t = ev.target.closest(".nyse-pick-id");
        if (!t) return;
        const id = t.getAttribute("data-id");
        if (id) {
            document.getElementById("buyId").value = id;
        }
    });

    await app.loadListings();
});
