# SIZER web edition

This folder is the browser version of **SIZER / ID Picture Layout**. It is the
same app as the desktop build, with a responsive phone/tablet layout, touch
gestures, PWA installation and a browser-based file/print bridge.

The original Electron app is untouched. Everything needed to host the website
is inside this folder.

## Live site

- **Web app:** <https://id-sizer-web-app.vercel.app/>
- **Activation API:** <https://idpl-activation.jasonirishilot99.workers.dev>
- **Repository:** <https://github.com/idsizer/ID-SIZER-Web-app>

The Vercel project is connected to the repository's `main` branch, so a push
deploys the site automatically. The activation Worker now enforces the same
1000-code `VALID_HASHES` allowlist as the browser.

---

## What is in this folder

| File / folder | Purpose |
| --- | --- |
| `index.html` | The app (shared UI and logic), with the web patches applied |
| `web.css` | Responsive layer, mobile step bar, touch sizing, PWA chrome |
| `web-app.js` | Mobile step navigation, canvas touch bridge, install flow, service worker |
| `web-bridge.js` | Browser replacement for the Electron `window.idpl` API |
| `idpl-config.js` | Site configuration (activation server, model location, version) |
| `manifest.webmanifest` | PWA name, icons, shortcuts and install behaviour |
| `sw.js` | Service worker that keeps the app shell available offline |
| `vercel.json` | Vercel headers: long-lived cache for `ml/` and `icons/` |
| `ml/` | ONNX background-removal model + onnxruntime-web runtime (~115 MB) |
| `icons/` | PWA / home-screen icons |
| `serve.py`, `serve.js` | Local preview servers with the correct MIME types |
| `serve.command`, `serve.cmd` | Double-click launchers for macOS and Windows |

The app is fully self-contained. There is no build step and no `npm install`.

---

## Quick start (local preview)

Background removal and service workers need a real `http://` or `https://`
address. Opening `index.html` by double-clicking it (`file://`) still shows the
interface, but the model cannot load and the app shows a warning banner.

### macOS

Double-click **`serve.command`** in Finder, or run:

```bash
cd website
python3 serve.py
```

Then open <http://127.0.0.1:4173/>.

### Windows

Double-click **`serve.cmd`**, or open Command Prompt in this folder and run:

```bat
py -3 serve.py
```

Then open <http://127.0.0.1:4173/>.

If Python is not installed, the launchers fall back to Node.js (`serve.js`).
Any static server works as long as it sends `.wasm` as `application/wasm`.

### Test on a phone or tablet

Start the server on your local network:

```bash
python3 serve.py --host 0.0.0.0
```

The terminal prints a `http://192.168.x.x:4173/` address. Open that address on
the phone while both devices are on the same Wi-Fi. On macOS, allow incoming
connections if the firewall asks.

`serve.js` accepts the same options:

```bash
node serve.js --host 0.0.0.0 --port 8080
```

---

## Deploying the site

Upload the **contents of this folder** to any static host. The site needs:

- HTTPS (required for PWA installation and service workers; `localhost` is the
  exception during development).
- Correct MIME types for `.wasm` (`application/wasm`) and `.webmanifest`
  (`application/manifest+json`). Most hosts already do this; `netlify` and
  `serve.py`/`serve.js` are set up correctly.
- Enough space for the model: roughly 115 MB total.

### Netlify (easiest)

1. Go to <https://app.netlify.com/drop> and drag this `website` folder onto the
   page, **or** run `npx netlify deploy --prod --dir .` from this folder.
2. No build command is needed; the publish directory is this folder.
3. Netlify accepts the 88 MB model file. The included `_headers` file gives the
   model long-lived caching and open CORS.

### Vercel

1. Push this folder to GitHub first (see the GitHub Pages instructions below).
2. In Vercel choose **Add New → Project** and import the repository.
3. Set **Framework Preset** to **Other**. Leave the build command and output
   directory empty.
4. If the repository has a `website/` folder at its root, set **Root Directory**
   to `website`. If `index.html` is at the repository root, leave it as `./`.
5. Deploy. Vercel provides HTTPS, so the PWA and background removal work.

Vercel's Hobby plan is for non-commercial use and lists a 100 MB limit for CLI
static-file uploads, while this site is about 115 MB. Git imports usually work,
but if Vercel rejects the deployment, either move `ml/` to a CDN (see below),
use Vercel Pro (1 GB source limit), or host on GitHub Pages instead. Vercel
ignores the included `_headers` file; that does not affect the app.

### GitHub Pages

GitHub Pages is enough for the whole app. It is static hosting; photo editing,
background removal, downloads and printing all run in the visitor's browser.

**Do not use GitHub's “Add file → Upload files” page for this project.** The
88 MB `segment.onnx` is larger than the browser uploader's 25 MB per-file
limit. It is below GitHub's 100 MB hard limit, so a normal Git push or GitHub
Desktop works.

#### Option A — Git command line

1. Create an empty **public** repository on GitHub, for example `sizer-web`.
   Do not add a README, `.gitignore` or licence there.
   (On the free plan, Pages requires a public repository.)
2. Install Git, then set your name and email once:

   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```

3. In Terminal (macOS) or Git Bash (Windows), go **inside this `website`
   folder** and create the repository:

   ```bash
   cd /path/to/website
   git init
   git branch -M main
   git add .
   git commit -m "SIZER web edition"
   ```

4. Connect it to GitHub and push. Replace `YOURNAME` with your username:

   ```bash
   git remote add origin https://github.com/YOURNAME/sizer-web.git
   git push -u origin main
   ```

   The 88 MB model can make the first push slow. A warning that the file is
   over 50 MB is normal; let the upload finish.

5. On GitHub open **Settings → Pages**. Under **Build and deployment** choose
   **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
6. Wait for the “Pages” deployment to finish, then open
   `https://YOURNAME.github.io/sizer-web/`.

#### Option B — GitHub Desktop

1. Install GitHub Desktop and sign in.
2. **File → Add local repository**, choose this `website` folder, and create a
   repository when prompted. Keep the repository root at this folder.
3. Commit the files, click **Publish repository**, and keep it public.
4. Enable Pages from **Settings → Pages** as in Option A step 5.

The empty `.nojekyll` file must be committed; it stops Pages from running
Jekyll over the app. GitHub Pages works from a subfolder such as
`https://name.github.io/sizer-web/` because every path in the app is relative.

For later updates, copy the changed files into the repo, commit, push, and bump
`CACHE_VERSION` in `sw.js` so returning visitors refresh their offline cache.

### Cloudflare Pages, S3, or another host

Some hosts cap individual files below 90 MB (Cloudflare Pages currently caps
files at 25 MiB). If the 88 MB model is rejected, upload the **`ml/` folder** to
object storage or a CDN instead:

1. Put `segment.onnx`, `ort.min.js` and the `ort-wasm*.wasm` files on the CDN,
   keeping them in one folder.
2. Allow cross-origin reads (`Access-Control-Allow-Origin: *`) and serve
   `.wasm` as `application/wasm`.
3. In `idpl-config.js`, point `mlBase` at that folder, including the trailing
   slash:

```js
mlBase: "https://cdn.example.com/sizer/ml/"
```

The rest of the site can stay on the original host. The service worker does not
intercept the model, so the CDN's own cache headers apply.

### Subfolders

The site can be hosted at the domain root or in a subfolder. The manifest,
service worker and model paths are relative to `index.html`; `mlBase: "ml/"`
becomes the correct URL in either case.

---

## Configuration

Edit **`idpl-config.js`** after deploying:

```js
window.IDPL_WEB_CONFIG = {
  version: "4.7.5",
  activationUrl: "https://idpl-activation.jasonirishilot99.workers.dev",
  mlBase: "ml/",
  checkForDesktopUpdates: false
};
```

| Key | Meaning |
| --- | --- |
| `activationUrl` | Base URL of the activation API. Leave `""` for offline trial-only mode. |
| `mlBase` | Folder containing `segment.onnx`, `ort.min.js` and the ORT wasm files. |
| `checkForDesktopUpdates` | Keep `false` on the web build. The desktop `.exe` updater is hidden. |
| `version` | Shown to the browser bridge; does not change the UI build tag. |

`idpl-config.js` is loaded before the app. It is safe to edit without touching
`index.html`.

### Activation server and CORS

The web app calls the activation endpoint directly from the browser, so the
server must allow cross-origin requests:

- `Access-Control-Allow-Origin: *` (or the exact site origin)
- permission for the request headers the app sends
- an `OPTIONS` response if the browser preflights the request

The configured Cloudflare Worker is already open (`Access-Control-Allow-Origin:
*`), so activation works from a browser. If you point `activationUrl` at a new
backend, test it from the deployed origin, not only with `curl`.

Activation is stored in this browser's `localStorage`, together with a random
per-browser device ID. Clearing site data creates a new device ID, so the old
code will not match. This is explained in the activation dialog.

### Issued activation codes

This build accepts the 2000 sellable codes: 1000 web `HTTP-XXXX-XXXX-XXXX`
codes and 1000 standalone `IDPS-XXXX-XXXX-XXXX` codes. Their SHA-256 hashes are
baked into `index.html`, and the same hashes are in the Worker (`worker-new.js`,
`VALID_HASHES`). A code that is not in that list is rejected by the browser
before any network request, and the Worker rejects retired or unknown codes
again on the server. The 500 legacy `IDPL-…` codes are retired from sale;
existing activations keep working.

- Keep the plaintext list (`activation-codes.txt` / `.csv` in the project
  root) private. Never upload it to GitHub or the web host.
- If you replace the codes, update the hash list in **both** `index.html` and
  the Worker, then bump `CACHE_VERSION` in `sw.js` and redeploy.
- The Worker only enforces the new list after you paste the updated
  `worker-live.js` or `worker-new.js` into Cloudflare and deploy it. The
  browser-side check works immediately with the website update alone.

> Do not put plaintext activation codes or the admin password in the website
> files. The app stores only one-way SHA-256 hashes; the activation server
> remains the authority.

---

## PWA installation and offline use

After the first successful visit over HTTPS (or `localhost`):

- **Chrome / Edge (Windows, macOS, Android):** use the install icon in the
  address bar, the browser menu, or the download button in the app header.
- **Safari on macOS:** **File → Add to Dock**.
- **Safari on iPhone / iPad:** **Share → Add to Home Screen**.
- **Samsung Internet / other Android browsers:** menu → **Install app** or
  **Add to Home screen**.

The service worker caches the app shell (`index.html`, CSS, JS, manifest and
icons). The 88 MB model is **not** precached, and it is also not left to the
browser's HTTP cache: Chrome often refuses to store a single cache entry that
large, which made every refresh download it again. Instead the page copies
`segment.onnx` into Cache Storage (`sizer-ml-v1`) the first time background
removal runs, and loads it from there afterwards. Bump `ML_CACHE` in
`index.html` when you replace `segment.onnx` so visitors fetch the new model.
Offline use therefore covers the interface and editing; background removal
needs the model to have been downloaded at least once.

When you change any shell file, bump `CACHE_VERSION` in `sw.js` (for example
`sizer-web-4.7.5-7` → `sizer-web-4.7.5-8`). Shell files are cached for offline
use but fetched network-first, so online visitors get the deployed version on
their next reload. The version bump clears the previous offline cache.

During local development, either use the included servers (they send
`Cache-Control: no-store` for the shell) or enable **Update on reload** in
DevTools → Application → Service Workers.

---

## Printing

Printing uses the browser's print dialog (`window.print()`), not a native
Electron printer list:

1. Choose **Print sheet** in step 3.
2. Set **Paper size** to the canvas size shown in the app.
3. Set **Scale** to **100% / Actual size**, not "Fit to page".
4. Set **Margins** to **None**.

Chrome or Edge usually gives the most predictable sizing on Windows and macOS.
On iPhone/iPad, use **AirPrint** and the same paper and scale settings. The
**Download as image** button saves a PNG at the canvas resolution.

The trial watermark and paid-output checks are preserved from the desktop app.

### ID name tags

The **ID name tag** group prints a white bar with the name at the bottom of each
photo. Type a name, then **Tag all photos** or click individual photos to tag
them. Tags already placed keep their own text, so editing the box afterwards
only affects new tags.

**Stretch to fit long names** keeps the name tall and squeezes it horizontally
instead of shrinking the font, so long customer names still fill the bar. Short
names are left at their normal size. The setting is remembered in
`localStorage` (`idpl_nametag_stretch`).

---

## Background removal

The background remover is the original ISNet model running locally in the
browser through onnxruntime-web. No photo is uploaded anywhere.

- The first run downloads the model and runtime (about 100 MB). Keep the tab
  open until it finishes.
- It needs `http://` or `https://`; it does not work from `file://`.
- A normal static host runs it single-threaded. Threads require
  `SharedArrayBuffer`, which requires cross-origin isolation headers
  (`Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp`) on every asset. Those headers
  are optional; the app falls back automatically.
- If you host `ml/` on a CDN, CORS and the `application/wasm` MIME type are
  required.

---

## Differences from the desktop app

The web edition intentionally keeps the same UI and licensing behaviour, but a
browser imposes a few differences:

- **Updates:** the Windows `.exe` update bar is disabled. Deploy the new files
  and bump the service-worker cache version instead.
- **Printing:** uses the browser print dialog; there is no native printer
  picker or driver settings page.
- **Outfits:** imported formal-attire PNGs are saved in browser
  `localStorage`. If the storage quota is full, an outfit remains available for
  the current session. The desktop version wrote files to the app data folder.
- **Activation:** tied to this browser profile's storage and random device ID,
  not to the operating system.
- **Background removal:** runs in the browser, so the first run is slower and
  the 88 MB model is downloaded once, then kept in Cache Storage.
- **Offline:** the shell is cached, but the first model download still needs a
  connection.

Everything else — set layouts, custom sizes, photo framing, name tags, attire,
arranging, watermarking and the activation-code flow — is the same code as the
desktop app.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| The page says it is open from disk | Use `serve.command` / `serve.cmd`, or any HTTP server. Do not open `index.html` with `file://`. |
| Background removal fails to start | Check that `ml/ort.min.js`, `ml/segment.onnx` and `ml/ort-wasm*.wasm` exist. Confirm `.wasm` is served as `application/wasm`. If using a CDN, check CORS. |
| Changes do not appear after upload | Bump `CACHE_VERSION` in `sw.js`, redeploy, then reload twice (or unregister the service worker in DevTools). |
| Install button does nothing | PWA install needs HTTPS (or localhost). On iPhone use Safari's Share menu; the app shows the correct steps. |
| Activation fails in the browser | Check the browser console/Network tab for CORS. The activation server must allow the deployed origin. |
| Print size is wrong | Set scale to 100% / Actual size and margins to None; choose the same paper size the app shows. |
| Phone layout looks too wide / zoomed | Confirm the `<meta name="viewport">` tag is present and that the server is not stripping HTML. Use the latest `web.css`. |

---

## Licence

SIZER / ID Picture Layout is proprietary software. Copyright © 2026
LKprintshop. All rights reserved. The web edition is a browser port of the
same application; do not redistribute it without permission. Third-party
licences for onnxruntime-web and the segmentation model are included in
`ml/LICENSES.txt`.
