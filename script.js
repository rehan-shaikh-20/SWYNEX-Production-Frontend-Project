(() => {
    "use strict";

    // ========================================
    // Configuration
    // ========================================

    const API = "https://world.openfoodfacts.org";

    const FIELDS =
        "code,product_name,product_name_en,brands,image_front_url,image_url,categories_tags,nutriscore_grade,nutrition_grades,nutriments,ingredients_text,ingredients_text_en,quantity";

    const PAGE_SIZE = 24;

    const $ = (s) => document.querySelector(s);

    // ========================================
    // Application State
    // ========================================

    const state = {
        mode: "name",
        query: "",
        products: [],
        page: 1,
        category: "all",
        sort: "relevance",
        saved: loadSaved(),
        showingSaved: false,
        loading: false
    };

    // ========================================
    // DOM Elements
    // ========================================

    const el = {
        form: $("#searchForm"),
        input: $("#searchInput"),
        label: $("#searchLabel"),
        submit: $("#searchSubmit"),
        nameTab: $("#nameTab"),
        barcodeTab: $("#barcodeTab"),
        grid: $("#grid"),
        status: $("#status"),
        summary: $("#summary"),
        toolbarLabel: $("#toolbarLabel"),
        category: $("#categoryFilter"),
        sort: $("#sortSelect"),
        loadWrap: $("#loadMoreWrap"),
        load: $("#loadMore"),
        savedToggle: $("#savedToggle"),
        savedCount: $("#savedCount"),
        dialog: $("#dialog"),
        dialogContent: $("#dialogContent")
    };

    // ========================================
    // Saved Products
    // ========================================

    function loadSaved() {
        try {
            const x = JSON.parse(
                localStorage.getItem("swynex_food_saved_v1") || "[]"
            );

            return Array.isArray(x) ? x : [];
        } catch {
            return [];
        }
    }

    function persist() {
        try {
            localStorage.setItem(
                "swynex_food_saved_v1",
                JSON.stringify(state.saved)
            );
        } catch {
            toast("Your browser could not save favorites.");
        }

        updateSavedCount();
    }

    function updateSavedCount() {
        el.savedCount.textContent = state.saved.length;

        el.savedToggle.setAttribute(
            "aria-pressed",
            String(state.showingSaved)
        );

        el.savedToggle.innerHTML = `
            ${state.showingSaved ? "♥" : "♡"}
            ${state.showingSaved ? "All products" : "Saved"}
            <b id="savedCount">${state.saved.length}</b>
        `;
    }

    // ========================================
    // Utility Functions
    // ========================================

    function esc(v) {
        return String(v ?? "").replace(/[&<>"']/g, (c) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[c]);
    }

    function url(v) {
        try {
            const u = new URL(v);

            return ["https:", "http:"].includes(u.protocol)
                ? u.href
                : "";
        } catch {
            return "";
        }
    }

    const name = (p) =>
        p.product_name_en || p.product_name || "Unnamed food product";

    const brand = (p) =>
        p.brands
            ? p.brands.split(",")[0].trim()
            : "Brand not listed";

    const grade = (p) => {
        const g = String(
            p.nutriscore_grade || p.nutrition_grades || ""
        ).toLowerCase();

        return /^[a-e]$/.test(g) ? g : "";
    };

    const image = (p) =>
        url(p.image_front_url || p.image_url || "");

    // ========================================
    // Product Filtering and Sorting
    // ========================================

    function matches(p) {
        if (state.category === "all") {
            return true;
        }

        const t = (p.categories_tags || [])
            .join(" ")
            .toLowerCase();

        const terms = {
            beverages: [
                "beverages",
                "drinks",
                "waters",
                "juices",
                "sodas"
            ],
            snacks: [
                "snacks",
                "sweets",
                "chocolates",
                "biscuits",
                "cookies",
                "chips"
            ],
            breakfast: [
                "breakfast",
                "cereals",
                "oat"
            ],
            dairy: [
                "dairies",
                "dairy",
                "milks",
                "cheeses",
                "yogurts"
            ]
        };

        return terms[state.category].some((x) => t.includes(x));
    }

    function visible() {
        let list = state.showingSaved
            ? state.saved
            : state.products;

        list = list.filter(matches);

        if (state.sort === "name") {
            list = [...list].sort((a, b) =>
                name(a).localeCompare(name(b))
            );
        }

        if (state.sort === "grade") {
            const rank = {
                a: 1,
                b: 2,
                c: 3,
                d: 4,
                e: 5
            };

            list = [...list].sort((a, b) =>
                (rank[grade(a)] || 9) -
                    (rank[grade(b)] || 9) ||
                name(a).localeCompare(name(b))
            );
        }

        return list;
    }

    // ========================================
    // Status and Loading UI
    // ========================================

    function message(title, body, icon = "✳", retry = false) {
        el.grid.innerHTML = "";

        el.status.innerHTML = `
            <div class="message">
                <span>${icon}</span>
                <h3>${esc(title)}</h3>
                <p>${esc(body)}</p>
                ${
                    retry
                        ? '<button class="outline" id="retry" type="button">Try again ↻</button>'
                        : ""
                }
            </div>
        `;

        if ($("#retry")) {
            $("#retry").addEventListener("click", () =>
                search(state.query)
            );
        }

        el.loadWrap.hidden = true;
    }

    function loading() {
        el.status.innerHTML = "";

        el.grid.innerHTML = `
            <div class="skeleton-grid">
                ${Array.from(
                    { length: 8 },
                    () => `
                        <div class="skeleton-card">
                            <div class="skeleton skeleton-image"></div>
                            <div class="skeleton skeleton-line short"></div>
                            <div class="skeleton skeleton-line long"></div>
                            <div class="skeleton skeleton-line"></div>
                        </div>
                    `
                ).join("")}
            </div>
        `;

        el.summary.textContent = "Finding products…";
        el.loadWrap.hidden = true;
    }

    // ========================================
    // Product Cards
    // ========================================

    function card(p) {
        const code = String(p.code || "");
        const img = image(p);
        const g = grade(p);

        const saved = state.saved.some(
            (x) => String(x.code) === code
        );

        return `
            <article class="card">
                <div class="image-wrap">
                    ${
                        img
                            ? `
                                <img
                                    src="${esc(img)}"
                                    alt="${esc(name(p))}"
                                    loading="lazy"
                                    onerror="this.hidden=true;this.nextElementSibling.hidden=false"
                                >
                            `
                            : ""
                    }

                    <div class="placeholder" ${img ? "hidden" : ""}>
                        ✳
                    </div>

                    <button
                        class="heart ${saved ? "saved" : ""}"
                        type="button"
                        data-fav="${esc(code)}"
                        aria-label="${saved ? "Remove saved product" : "Save product"}"
                    >
                        ${saved ? "♥" : "♡"}
                    </button>
                </div>

                <div class="card-info">
                    <p class="brand-label">${esc(brand(p))}</p>

                    <h3>${esc(name(p))}</h3>

                    <p class="meta">
                        ${esc(p.quantity || "Quantity not listed")}
                    </p>

                    <div class="card-bottom">
                        ${
                            g
                                ? `
                                    <span class="score grade-${g}">
                                        Nutri-Score ${g.toUpperCase()}
                                    </span>
                                `
                                : `
                                    <span class="score">
                                        Score unavailable
                                    </span>
                                `
                        }

                        <button
                            class="details"
                            type="button"
                            data-detail="${esc(code)}"
                        >
                            Details →
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    // ========================================
    // Render Product Results
    // ========================================

    function render() {
        const list = visible();

        el.status.innerHTML = "";
        el.grid.innerHTML = list.map(card).join("");

        el.summary.textContent = state.showingSaved
            ? `${list.length} saved product${list.length === 1 ? "" : "s"}`
            : `${list.length} product${list.length === 1 ? "" : "s"} shown`;

        el.toolbarLabel.textContent = state.showingSaved
            ? "Your saved products"
            : "Explore products";

        el.loadWrap.hidden =
            state.showingSaved ||
            state.mode === "barcode" ||
            !state.query ||
            state.products.length < state.page * PAGE_SIZE;

        if (!list.length) {
            message(
                state.showingSaved
                    ? "Nothing saved just yet."
                    : "No products match these filters.",
                state.showingSaved
                    ? "Tap the heart on a product to save it here."
                    : "Try another category or search for a different food product.",
                state.showingSaved ? "♡" : "⌕"
            );

            el.summary.textContent = "No products to show";
        }
    }

    // ========================================
    // API Requests
    // ========================================

    async function getJSON(u) {
        const r = await fetch(u, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!r.ok) {
            if (r.status === 429) {
                throw Error(
                    "The food database is receiving too many requests. Wait a moment and try again."
                );
            }

            throw Error(
                `The food database returned an error (${r.status}). Please try again.`
            );
        }

        return r.json();
    }

    async function search(q, append = false) {
        q = String(q || "").trim();

        if (q.length < 2) {
            message(
                "Enter a little more to search.",
                "Type at least two characters for a product name, or enter a full barcode.",
                "⌕"
            );

            el.input.focus();
            return;
        }

        state.query = q;
        state.showingSaved = false;

        updateSavedCount();

        state.loading = true;

        if (!append) {
            state.page = 1;
            state.products = [];
            loading();
        } else {
            el.load.disabled = true;
            el.load.textContent = "Loading…";
        }

        el.submit.disabled = true;
        el.submit.textContent = "Searching…";

        try {
            let data;

            // Barcode Search
            if (state.mode === "barcode") {
                const code = q.replace(/\s/g, "");

                if (!/^\d{8,14}$/.test(code)) {
                    throw Error(
                        "Please enter a barcode containing 8 to 14 digits."
                    );
                }

                data = await getJSON(
                    `${API}/api/v2/product/${encodeURIComponent(code)}.json?fields=${encodeURIComponent(FIELDS)}`
                );

                if (data.status !== 1 || !data.product) {
                    state.products = [];

                    message(
                        "We couldn't find that barcode.",
                        "Check the digits on the packaging. Not every product is in the database.",
                        "▦"
                    );

                    el.summary.textContent = "No matching barcode";
                    return;
                }

                state.products = [data.product];
            } else {
                // Product Name Search
                const params = new URLSearchParams({
                    search_terms: q,
                    search_simple: "1",
                    action: "process",
                    json: "1",
                    page_size: String(PAGE_SIZE),
                    page: String(state.page),
                    fields: FIELDS
                });

                data = await getJSON(
                    `${API}/cgi/search.pl?${params}`
                );

                const found = Array.isArray(data.products)
                    ? data.products.filter((p) => p && p.code)
                    : [];

                state.products = append
                    ? [...state.products, ...found]
                    : found;
            }

            render();

            if (!state.products.length) {
                message(
                    "No products found for that search.",
                    "Try a shorter name or different spelling. Product coverage varies by country and brand.",
                    "⌕"
                );
            }
        } catch (err) {
            message(
                "We couldn't load products.",
                err.message || "Check your connection and try again.",
                "↻",
                true
            );

            el.summary.textContent = "Search unsuccessful";
        } finally {
            state.loading = false;

            el.submit.disabled = false;
            el.submit.innerHTML = "Search →";

            el.load.disabled = false;
            el.load.innerHTML = "Load more products ↓";
        }
    }

    // ========================================
    // Favorites
    // ========================================

    function toggleFav(code) {
        if (!code) {
            return;
        }

        const i = state.saved.findIndex(
            (p) => String(p.code) === String(code)
        );

        if (i >= 0) {
            state.saved.splice(i, 1);
            toast("Removed from saved products.");
        } else {
            const p = state.products.find(
                (p) => String(p.code) === String(code)
            );

            if (p) {
                state.saved.push(p);
                toast("Product saved on this device.");
            }
        }

        persist();
        render();
    }

    // ========================================
    // Nutrition Information
    // ========================================

    function nutrient(p, key, unit = " g") {
        const v = p.nutriments?.[key];

        if (v === undefined || v === null || v === "") {
            return "Not listed";
        }

        const n = Number(v);

        return Number.isFinite(n)
            ? `${Number(n.toFixed(2))}${unit}`
            : "Not listed";
    }

    // ========================================
    // Product Details Dialog
    // ========================================

    function details(code) {
        const p =
            state.products.find(
                (x) => String(x.code) === String(code)
            ) ||
            state.saved.find(
                (x) => String(x.code) === String(code)
            );

        if (!p) {
            return;
        }

        const img = image(p);
        const g = grade(p);

        const ingredients =
            p.ingredients_text_en ||
            p.ingredients_text ||
            "Ingredient information is not available for this product.";

        const nutrients = [
            ["Energy", nutrient(p, "energy-kcal_100g", " kcal")],
            ["Fat", nutrient(p, "fat_100g")],
            ["Saturated fat", nutrient(p, "saturated-fat_100g")],
            ["Carbohydrates", nutrient(p, "carbohydrates_100g")],
            ["Sugars", nutrient(p, "sugars_100g")],
            ["Protein", nutrient(p, "proteins_100g")],
            ["Salt", nutrient(p, "salt_100g")]
        ];

        el.dialogContent.innerHTML = `
            <div class="detail-layout">
                <div class="detail-visual">
                    ${
                        img
                            ? `
                                <img
                                    src="${esc(img)}"
                                    alt="${esc(name(p))}"
                                >
                            `
                            : `
                                <div class="placeholder">✳</div>
                            `
                    }
                </div>

                <div class="detail-copy">
                    <div class="brand-label">
                        ${esc(brand(p))}
                    </div>

                    <h2 id="dialogTitle">
                        ${esc(name(p))}
                    </h2>

                    <p>
                        ${esc(p.quantity || "Quantity not listed")}
                        · Barcode: ${esc(p.code || "Not listed")}
                    </p>

                    ${
                        g
                            ? `
                                <span class="score grade-${g}">
                                    Nutri-Score ${g.toUpperCase()}
                                </span>
                            `
                            : ""
                    }

                    <h3>Nutrition per 100 g / 100 ml</h3>

                    <div class="nutrition">
                        ${nutrients.map(([k, v]) => `
                            <div class="nutrient">
                                <span>${esc(k)}</span>
                                <strong>${esc(v)}</strong>
                            </div>
                        `).join("")}
                    </div>

                    <h3>Ingredients</h3>

                    <p>${esc(ingredients)}</p>

                    <p>
                        Data may be incomplete. Verify details on the product packaging.
                    </p>

                    <div class="detail-actions">
                        <button id="dialogFav" type="button">
                            ${
                                state.saved.some(
                                    (x) => String(x.code) === String(p.code)
                                )
                                    ? "♥ Remove saved"
                                    : "♡ Save product"
                            }
                        </button>

                        <button id="source" type="button">
                            View source data ↗
                        </button>
                    </div>
                </div>
            </div>
        `;

        el.dialog.showModal();

        $("#dialogFav").addEventListener("click", () => {
            toggleFav(String(p.code));

            if (el.dialog.open) {
                details(String(p.code));
            }
        });

        $("#source").addEventListener("click", () => {
            const u = url(
                `${API}/product/${encodeURIComponent(p.code || "")}`
            );

            if (u) {
                window.open(
                    u,
                    "_blank",
                    "noopener,noreferrer"
                );
            }
        });
    }

    // ========================================
    // Toast Notifications
    // ========================================

    let toastTimer;

    function toast(text) {
        let t = $("#toast");

        if (!t) {
            t = document.createElement("div");
            t.id = "toast";
            t.setAttribute("role", "status");

            t.style.cssText = `
                position: fixed;
                left: 50%;
                bottom: 22px;
                transform: translateX(-50%);
                z-index: 20;
                background: #1f5039;
                color: white;
                padding: 12px 17px;
                border-radius: 8px;
                font-size: 12px;
                box-shadow: 0 8px 24px #15281b35;
            `;

            document.body.append(t);
        }

        t.textContent = text;
        t.hidden = false;

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            t.hidden = true;
        }, 2300);
    }

    // ========================================
    // Search Mode
    // ========================================

    function setMode(mode) {
        state.mode = mode;

        const barcode = mode === "barcode";

        el.nameTab.classList.toggle("active", !barcode);
        el.barcodeTab.classList.toggle("active", barcode);

        el.nameTab.setAttribute(
            "aria-selected",
            String(!barcode)
        );

        el.barcodeTab.setAttribute(
            "aria-selected",
            String(barcode)
        );

        el.label.textContent = barcode
            ? "Enter product barcode"
            : "Search food products";

        el.input.inputMode = barcode ? "numeric" : "search";

        el.input.pattern = barcode ? "\\d{8,14}" : "";

        el.input.placeholder = barcode
            ? "Enter 8–14 barcode digits…"
            : "Try “oat milk”, “chocolate”, or “pasta”…";

        el.input.value = "";
        el.input.minLength = barcode ? 8 : 2;
        el.input.maxLength = barcode ? 14 : 120;

        el.input.focus();
    }

    // ========================================
    // Event Listeners
    // ========================================

    // Search form
    el.form.addEventListener("submit", (e) => {
        e.preventDefault();
        search(el.input.value);
    });

    // Search mode tabs
    el.nameTab.addEventListener("click", () => setMode("name"));
    el.barcodeTab.addEventListener("click", () => setMode("barcode"));

    // Quick search buttons
    document.querySelectorAll("[data-query]").forEach((b) => {
        b.addEventListener("click", () => {
            setMode("name");

            el.input.value = b.dataset.query;

            search(b.dataset.query);

            $("#explore").scrollIntoView({
                behavior: "smooth"
            });
        });
    });

    // Category filter
    el.category.addEventListener("change", () => {
        state.category = el.category.value;
        render();
    });

    // Sorting
    el.sort.addEventListener("change", () => {
        state.sort = el.sort.value;
        render();
    });

    // Load more products
    el.load.addEventListener("click", () => {
        if (
            !state.loading &&
            state.query &&
            state.mode === "name"
        ) {
            state.page++;
            search(state.query, true);
        }
    });

    // Saved products toggle
    el.savedToggle.addEventListener("click", () => {
        state.showingSaved = !state.showingSaved;

        updateSavedCount();
        render();

        $("#explore").scrollIntoView({
            behavior: "smooth"
        });
    });

    // Product grid actions
    el.grid.addEventListener("click", (e) => {
        const f = e.target.closest("[data-fav]");
        const d = e.target.closest("[data-detail]");

        if (f) {
            toggleFav(f.dataset.fav);
        }

        if (d) {
            details(d.dataset.detail);
        }
    });

    // Dialog close button
    $("#closeDialog").addEventListener("click", () => {
        el.dialog.close();
    });

    // Close dialog by clicking its backdrop
    el.dialog.addEventListener("click", (e) => {
        if (e.target === el.dialog) {
            el.dialog.close();
        }
    });

    // Escape key closes the dialog
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && el.dialog.open) {
            el.dialog.close();
        }
    });

    // ========================================
    // Initialization
    // ========================================

    updateSavedCount();
})();
