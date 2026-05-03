# UBBX — deployment and testing

## Smart contract (Remix)

1. Open [Remix](https://remix.ethereum.org/), upload [`contracts/UBBX.sol`](contracts/UBBX.sol) (or paste its contents).
2. Compile with Solidity **0.8.28** (or compatible **^0.8.28**).
3. Deploy **Yoda** first if you need a local token, or use the class **Yoda** address on Sepolia.
4. Deploy **UBBX** with constructor argument `_yodaToken` = the Yoda ERC-20 address.
5. Copy the deployed UBBX address into [`app.js`](app.js) at the repo root as `this.ubbxAddress`.
6. Set `this.yodaAddress` to the same Yoda address you passed to the constructor.
7. In Remix, copy the **ABI** into [`UBBX.json`](UBBX.json) under `"abi"` if you change the contract (or regenerate with `solc --abi contracts/UBBX.sol`).

## Front end

1. Serve the **repo root** over **http(s)** (MetaMask requires it). For example:
   - `python3 -m http.server 8080` from the repository root (next to `index.html`).
   - **GitHub Pages:** Settings → Pages → branch **`main`**, folder **`/ (root)`**.
2. Buyers need **Sepolia ETH** for gas and **Yoda** balance. Use the class faucet button if your `yoda.json` matches a contract with `receiveTokens()`.
3. **List:** fill metadata; optionally anchor hash; submit `listBook`. If anchored, save the downloaded JSON as `metadata/<listingId>.json` next to `index.html`.
4. **Buy:** connect seller’s listing id; **Approve** then **Purchase**.

## Local VM (optional)

Use Hardhat/Anvil or Remix VM: deploy Yoda + UBBX, add the local chain to MetaMask, point `app.js` addresses at local deployments.

## AI-assisted work (course disclosure)

**Tooling:** Cursor IDE with an AI coding agent; Solidity compiler `solc` via `npx` for ABI generation.

**Prompts (summary):** User provided the course plan “UBBX full DApp (professor patterns + off-chain metadata)” and asked to implement it fully from [`contracts/UBBX.sol`](contracts/UBBX.sol) and lecture notes—without editing the plan file.

**AI-generated / AI-edited (clearly marked):**

- [`contracts/UBBX.sol`](contracts/UBBX.sol) — refactored for IERC20 payments, events, `bytes32 metadataHash`, removal of on-chain string profiles; written to match the attached plan.
- Repo root — `index.html`, `app.js`, [`UBBX.json`](UBBX.json) (ABI from compilation), [`CNAME`](CNAME) for custom domain.
- [`yoda.json`](yoda.json) — copied from professor `cse426` Yoda DApp ABI (local clone, not in this repo).
- [`metadata/`](metadata/) — example JSON and `README.txt`.
- This file — deployment steps and AI disclosure template.

**Student-authored / pre-existing:**

- Original project idea and notebook concept (UB Book Exchange).
- Professor `cse426` / `Cse406Demo` clones (kept locally if needed; not committed in this repo).
- After implementation: you must set real deployed addresses, run your own Sepolia tests, record transaction screenshots for the rubric, and extend this disclosure in your PDF with exact prompts you used in Cursor if they differ from the summary above.
