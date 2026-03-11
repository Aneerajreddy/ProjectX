# WebCode Global Market Command Center

Static dashboard with live market widgets (TradingView), Forex Factory events, macro/gold feeds, and client-side AI-style summaries.

## Host on GitHub Pages

1. Push this repository to GitHub (branch: `main` or `master`).
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source = GitHub Actions**.
4. Ensure workflow permissions allow Pages deployment:
   - **Settings → Actions → General → Workflow permissions**
   - Select **Read and write permissions**.
5. Push any commit (or run workflow manually from **Actions** tab).
6. After workflow success, your site will be published at:
   - `https://<your-username>.github.io/<repo-name>/`

## Local preview

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

## Notes

- This project is static and backend-free, so it is compatible with GitHub Pages.
- Some external data providers may rate-limit or block browser requests depending on region/network policy.
