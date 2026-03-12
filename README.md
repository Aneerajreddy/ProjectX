# In-House Trading Workstation

Internal trading platform (static frontend) for desk users with:

- Live watchlist (crypto stream + equity/index polling)
- Order ticket (simulated execution)
- Positions and mark-to-market P&L
- Risk snapshot (exposure + simulated VaR)
- Execution audit log
- TradingView market widget
- Forex Factory calendar + macro news feeds

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://127.0.0.1:4173`.

## GitHub Pages deployment

This repository already includes `.github/workflows/deploy-pages.yml`.

1. Push to `main` (or `master`).
2. In **Settings → Pages**, select **Source = GitHub Actions**.
3. In **Settings → Actions → General**, set workflow permissions to **Read and write**.
4. After workflow finishes, access:
   - `https://<your-username>.github.io/<repo-name>/`

## Notes

- This is a client-side prototype for internal workflows, not a broker-connected production OMS.
- External feeds can be limited by provider rate limits / CORS policies.


## Troubleshooting (GitHub Pages)

- If page looks blank, do a hard refresh (`Ctrl+Shift+R`).
- Verify workflow status in **Actions** tab: `Deploy static site to GitHub Pages`.
- Confirm URL is correct: `https://<username>.github.io/<repo>/`.
- Direct section link supported: `/#contact`.
- If external feeds are blocked, fallback sample data is shown by default.
