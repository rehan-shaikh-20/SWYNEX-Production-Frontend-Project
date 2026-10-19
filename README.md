# SWYNEX Food Explorer

**Task 4 — Production Frontend Project**

A responsive frontend for searching packaged food products and exploring product images, ingredients, and nutrition information from the Open Food Facts public database.

## Features
- Search by product name or barcode
- Product cards with images, brand, quantity, and Nutri-Score when available
- Product details dialog with nutrition values and ingredients
- Category filtering and sorting
- Save favorites in browser Local Storage
- Loading skeletons, empty states, API error messages, and retry
- Responsive desktop, tablet, and mobile layout
- Accessible form labels and keyboard-friendly dialogs

## Technology
HTML5 · CSS3 · JavaScript ES6+ · Fetch API · Open Food Facts API · Local Storage

## API endpoints
- Search: `https://world.openfoodfacts.org/cgi/search.pl`
- Barcode: `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
- Documentation: https://openfoodfacts.github.io/documentation/
- Website: https://world.openfoodfacts.org/

The read endpoints used here do not require an API key. Respect the API usage guidance and rate limits. Searches are submitted by the user rather than sent on every keystroke.

## Run locally
1. Download or clone this repository.
2. Open `index.html` in a browser, or run it through a local development server such as VS Code Live Server.
3. An internet connection is needed to fetch live product data.

## Deploy with GitHub Pages
1. Upload `index.html`, `style.css`, `script.js`, and `README.md` to the repository root.
2. Open **Settings → Pages**.
3. Select **Deploy from a branch**, choose `main` and `/(root)`, then save.
4. Wait for GitHub Pages to publish the site.

## Data note
Open Food Facts is a community-contributed database. Product data can be missing, incomplete, or incorrect. Always check packaging for authoritative ingredient and nutrition details. This educational project is not medical or dietary advice and is not affiliated with or endorsed by Open Food Facts.

Suggested repository name: `SWYNEX-Production-Frontend-Project`
