/* =========================================================
   Vaultframe — front-end logic
   Products are loaded from data/products.json, which is the
   single file Decap CMS edits (see admin/config.yml).
   ========================================================= */

// All three libraries are shown stacked at once (Blender → Games → Roblox),
// so instead of a single "activeLibrary" + "activeCategory" the state now
// tracks one active category per library. One search query is shared by
// all three sections.
const LIB_KEYS = ["blender", "games", "roblox"];

const state = {
  products: [],
  activeCategory: { blender: "All", games: "All", roblox: "All" },
  // Each library now has its own search query, so typing in one section
  // never filters or scrolls the other two.
  query: { blender: "", games: "", roblox: "" },
  lang: "en",
  // Comments + guestbook, loaded from data/comments.json (the single
  // shared source of truth for the whole site — see loadComments()).
  commentsData: { comments: {}, guestbook: [] },
};

/* =========================================================
   UI strings — English source. Arabic/Russian versions live in
   i18n.js (window.TRANSLATIONS) and are looked up by t() below.
   For anything NOT in this fixed dictionary (product titles,
   descriptions — free text the CMS owner writes in English),
   see translateDynamic() further down, which calls the Lingva
   API (lingva.ml) at runtime instead.
   ========================================================= */
const strings = {
    nav_library: "Library",
    nav_how: "How it works",
    nav_browse: "Browse assets",
    search_placeholder: "Search assets — try “cyberpunk character”",
    search_placeholder_blender: "Search the Blender library…",
    search_placeholder_games: "Search My Games…",
    search_placeholder_roblox: "Search Roblox Assets…",
    chip_all: "All",
    chip_characters: "Characters",
    chip_environments: "Environments",
    chip_shaders: "Shaders",
    chip_animations: "Animations",
    chip_assets: "Assets",
    chip_full_games: "Full games",
    chip_demos: "Demos / Prototypes",
    chip_dlc: "Mods / DLC",
    chip_scripts: "Scripts",
    chip_models: "Models",
    chip_maps: "Maps",
    lib_blender: "Blender Assets",
    lib_games: "My Games",
    lib_roblox: "Roblox Assets",
    library_heading: "The library",
    library_sub: "Every file is inspected before it's listed. New drops weekly.",
    library_heading_blender: "The Blender library",
    library_sub_blender: "Every file is inspected before it's listed. New drops weekly.",
    library_heading_games: "My Games",
    library_sub_games: "Playable builds and prototypes I've made — free to download.",
    library_heading_roblox: "Roblox Assets",
    library_sub_roblox: "Scripts, models and maps for Roblox Studio (.rbxl / .rbxm).",
    empty_title: "No assets match that search.",
    empty_sub: "Try a different keyword or clear the category filter.",
    how_heading: "How a download works",
    how1_title: "Pick your asset",
    how1_desc: "Browse or search any library, then open its download panel to see the specs.",
    how2_title: "Go through 4 quick steps",
    how2_desc: "Watch a short in-page video for each of the 4 steps — this is what keeps everything free. No pop-ups, no redirects.",
    how3_title: "Grab the file",
    how3_desc: "The direct download button unlocks right after step 4 — no login, no waiting rooms.",
    footer_built: "Built by Oelono.",
    footer_admin: "Admin",
    footer_top: "Back to top",
    footer_contact: "Contact",
    footer_privacy: "Privacy Policy",
    footer_terms: "Terms & Conditions",
    nav_about: "About",
    contact_heading: "Contact us",
    contact_desc: "Got a question, a bug report, or a takedown request? Reach out any time — we read every message.",
    modal_filesize_label: "File size",
    modal_engine_label: "Render engine",
    modal_license_label: "License",
    modal_drive_btn: "Download final file",
    tutorial_video_caption: "Stuck? Tap to watch how to download — with sound",
    modal_hint_default: "Watch a short video to unlock your file — everything happens right here on this page.",
    modal_hint_continue: "Step done — click Continue to open the next one.",
    modal_hint_ready: "Your file is ready — click below for the direct download.",
    modal_hint_video: "Watching the ad — the next step unlocks automatically in a few seconds.",
    unlock_unlocking: (s) => `Unlocking in ${s}s…`,
    unlock_ready: "Continue",
    step_video_label: "Ad",
    step_of_label: (n, total) => `Step ${n} of ${total}`,
    ad_playing_label: "Advertisement playing…",
    gate_caption_watch: "Watch the video to unlock this step — everything stays on this page.",
    gate_caption_ready: "Step complete — continue to unlock the next stage.",
    gate_fallback_text: "Your ad will appear here shortly. This step unlocks automatically.",
    gate_fallback_caption: "Preparing your download… please wait.",
    steps_left_one: "Almost done — 1 step left",
    steps_left: (n) => `${n} steps left`,
    steps_all_done: "All steps complete!",
    card_download: "Download",
    results_count: (n) => `${n} asset${n === 1 ? "" : "s"}`,
    nav_request_label: "Request a model",
    card_preview3d: "3D preview",
    card_preview_video: "Video preview",
    card_report: "Report broken link",
    viewer_title: "3D preview",
    viewer_title_video: "Video preview",
    viewer_hint: "Drag to rotate · scroll to zoom. This is a lightweight preview — the downloaded .blend file may include extra materials, rigs and lighting.",
    viewer_hint_video: "A short preview clip of this asset.",
    viewer_unavailable: "No 3D preview is available for this asset yet.",
    report_title: "Report a broken link",
    report_reason_label: "What's wrong?",
    report_reason_dead: "Download link doesn't work",
    report_reason_wrong: "File doesn't match the description",
    report_reason_corrupt: "File is corrupted / won't open",
    report_reason_other: "Something else",
    report_note_label: "Details (optional)",
    report_note_placeholder: "Anything that helps us fix it faster…",
    report_submit: "Send report",
    report_success: "Thanks — we'll take a look at this asset.",
    request_title: "Request a model",
    request_sub: "Tell us what you need — if it fits the library, we'll add it to the queue.",
    request_desc_label: "What model do you need?",
    request_desc_placeholder: "e.g. a low-poly medieval blacksmith shop with modular walls",
    request_category_label: "Category",
    request_contact_label: "Email (optional)",
    request_contact_placeholder: "you@example.com",
    request_ref_label: "Reference link (optional)",
    request_ref_placeholder: "Artstation / Pinterest / image URL…",
    request_submit: "Send request",
    request_success: "Thanks — your request has been sent.",
    request_error: "Please describe the model you need.",
    comments_title: "Comments",
    comment_name_label: "Your name",
    comment_name_placeholder: "Anonymous",
    comment_rating_label: "Your rating",
    comment_text_label: "Your comment",
    comment_text_placeholder: "Share your thoughts about this asset...",
    comment_captcha_label: "Anti-bot check",
    comment_captcha_placeholder: "Your answer",
    comment_submit: "Post comment",
    comment_success: "Thanks for your comment!",
    comment_error_name: "Please enter your name.",
    comment_error_text: "Please write a comment.",
    comment_error_captcha: "Wrong answer to the anti-bot check.",
    comment_error_profanity: "Please keep your comment respectful.",
    comment_error_save: "Couldn't save your comment — please try again.",
    comment_empty: "No comments yet. Be the first!",
    comment_avg_text: (n) => `Average: ${n.toFixed(1)} / 5`,
    wall_heading: "Community wall",
    wall_subheading: "Leave a public message for the whole site — feedback, ideas, or just say hi. No login needed.",
    wall_form_title: "Post a message",
    wall_list_title: "Latest messages",
    wall_text_placeholder: "Say something to the community…",
    wall_submit: "Post message",
    wall_empty: "No messages yet. Be the first to write on the wall!",
    wall_success: "Your message is on the wall — thanks!",
    wall_count_label: (n) => `${n} ${n === 1 ? "message" : "messages"}`,
};


/* =========================================================
   Libraries — three top-level sections that share the same
   product grid, search box and 4-step download modal, but each
   has its own category-chip set and its own slice of data/products.json
   (filtered via each product's "library" field: "blender" | "games" | "roblox").
   ========================================================= */
const LIBRARIES = {
  blender: {
    categories: ["All", "Characters", "Environments", "Shaders", "Animations", "Assets"],
    chipKey: {
      All: "chip_all", Characters: "chip_characters", Environments: "chip_environments",
      Shaders: "chip_shaders", Animations: "chip_animations", Assets: "chip_assets",
    },
  },
  games: {
    categories: ["All", "Full Games", "Demos", "Mods"],
    chipKey: { All: "chip_all", "Full Games": "chip_full_games", Demos: "chip_demos", Mods: "chip_dlc" },
  },
  roblox: {
    categories: ["All", "Scripts", "Models", "Maps"],
    chipKey: { All: "chip_all", Scripts: "chip_scripts", Models: "chip_models", Maps: "chip_maps" },
  },
};

function t(key) {
  const dict = window.TRANSLATIONS && window.TRANSLATIONS[state.lang];
  if (dict && Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
  return strings[key] ?? key;
}

// Per-library DOM refs — one grid/empty-state/results-count/chips-wrap/search
// set for each of the three stacked library sections.
const els = {};
LIB_KEYS.forEach(lib => {
  els[lib] = {
    grid: document.getElementById(`product-grid-${lib}`),
    emptyState: document.getElementById(`empty-state-${lib}`),
    resultsCount: document.getElementById(`results-count-${lib}`),
    chipsWrap: document.getElementById(`category-chips-${lib}`),
    searchInput: document.getElementById(`search-input-${lib}`),
  };
});

document.getElementById("year").textContent = new Date().getFullYear();

/* =========================================================
   Static text fill-in
   --------------------------------------------------------
   Fills every [data-i18n]/[data-i18n-placeholder] element from
   t(key), which resolves against window.TRANSLATIONS (i18n.js) for
   ar/ru or falls back to the English `strings` above. Called by
   setLang() below whenever the language changes.
   ========================================================= */
function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (typeof val === "string") el.textContent = val;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

function initLanguage() {
  setLang(getSavedLang(), { skipRender: true });
}

/* =========================================================
   Language switcher — plain EN/AR/RU pill buttons.

   Static UI text (nav, buttons, labels, empty states, etc.) comes
   straight from window.TRANSLATIONS (i18n.js) via t(), so switching
   is instant — no page reload, no external request.

   Content the CMS owner writes in English (product titles,
   descriptions, and anything else marked with data-mt-src) is
   translated live through the Lingva API — see translateDynamic()
   just below. This replaces the previous Google Translate widget
   (which drove translation via a `googtrans` cookie + full reload).
   ========================================================= */
const SITE_LANG_KEY = "site_lang";

function getSavedLang() {
  try {
    const saved = localStorage.getItem(SITE_LANG_KEY);
    if (saved === "ar" || saved === "ru" || saved === "en") return saved;
  } catch (e) { /* localStorage unavailable (private mode, etc.) — fall back to en */ }
  return "en";
}

function updateLangSwitcherUI() {
  const wrap = document.getElementById("lang-switcher");
  if (!wrap) return;
  wrap.querySelectorAll("button[data-lang]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === state.lang);
  });
}

function setLang(lang, opts = {}) {
  if (lang !== "ar" && lang !== "ru") lang = "en";
  state.lang = lang;
  try { localStorage.setItem(SITE_LANG_KEY, lang); } catch (e) { /* ignore */ }

  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  applyStaticTranslations();
  renderCategoryChips();
  updateLangSwitcherUI();

  if (!opts.skipRender) {
    render(); // redraws product grids with translated labels + fresh data-mt-src nodes
    translateDynamic(document); // (re)translate every dynamic node currently on the page
  }
}

function initLangSwitcher() {
  const wrap = document.getElementById("lang-switcher");
  if (!wrap) return;
  updateLangSwitcherUI();
  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-lang]");
    if (!btn || btn.classList.contains("active")) return;
    setLang(btn.dataset.lang);
  });
}
initLangSwitcher();

/* =========================================================
   Live translation of dynamic (non-UI) content via Lingva
   (https://lingva.ml — an open-source, ad/tracker-free front end
   for Google Translate). Any element rendered with a
   data-mt-src="<original English text>" attribute gets picked up
   here and translated into the current language, with results
   cached in localStorage so repeat visits (and repeat cards using
   the same title) don't re-hit the API.
   ========================================================= */
const LINGVA_INSTANCES = [
  "https://lingva.ml",
  "https://translate.plausibility.cloud", // fallback mirror if lingva.ml is unreachable
];
const LINGVA_CACHE_KEY = "lingva_cache_v1";
let lingvaCache = {};
try { lingvaCache = JSON.parse(localStorage.getItem(LINGVA_CACHE_KEY) || "{}"); } catch (e) { lingvaCache = {}; }

function saveLingvaCache() {
  try { localStorage.setItem(LINGVA_CACHE_KEY, JSON.stringify(lingvaCache)); } catch (e) { /* ignore quota errors */ }
}

async function lingvaTranslate(text, targetLang, sourceLang = "en") {
  if (!text || !text.trim() || targetLang === "en") return text;
  const cacheKey = `${sourceLang}:${targetLang}::${text}`;
  if (lingvaCache[cacheKey]) return lingvaCache[cacheKey];

  for (const base of LINGVA_INSTANCES) {
    try {
      const res = await fetch(`${base}/api/v1/${sourceLang}/${targetLang}/${encodeURIComponent(text)}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data && data.translation) {
        lingvaCache[cacheKey] = data.translation;
        saveLingvaCache();
        return data.translation;
      }
    } catch (e) { /* try next instance / fall back to original below */ }
  }
  return text; // every instance failed — show the original text rather than nothing
}

// Translates every element under `root` carrying data-mt-src into the
// current language. Safe to call repeatedly (e.g. after re-rendering
// the grid, or right after openModal/openReportModal/etc. set the
// attribute on a single element).
//
// Elements written by the CMS owner (product titles/descriptions) are
// known to be in English, so they translate from "en". Elements also
// carrying data-mt-auto="1" are free text visitors typed themselves
// (comments, guestbook messages) — source language is unknown, so we
// ask Lingva to auto-detect it instead of assuming English.
async function translateDynamic(root = document) {
  if (state.lang === "en") return;
  const lang = state.lang;
  const nodes = root.querySelectorAll ? root.querySelectorAll("[data-mt-src]") : [];
  await Promise.all(Array.from(nodes).map(async (el) => {
    const original = el.dataset.mtSrc;
    if (!original) return;
    const source = el.dataset.mtAuto ? "auto" : "en";
    const translated = await lingvaTranslate(original, lang, source);
    // Guard against the element having been reused for different content
    // (e.g. modal reopened with another product) while the request was in flight.
    if (el.dataset.mtSrc === original) el.textContent = translated;
  }));
}

// Sets `el`'s text to `text`, marking it for live translation if the
// current language isn't English. Shows the English text immediately
// and upgrades it in place once the translation resolves, so there's
// no blank/loading flash.
function setDynamicText(el, text) {
  if (!el) return;
  const value = text || "";
  el.dataset.mtSrc = value;
  el.textContent = value;
  if (state.lang !== "en" && value) translateDynamic(el.parentElement || el);
}

/* ---------- load data ---------- */
async function loadProducts() {
  renderSkeletons(6);
  try {
    const res = await fetch("data/products.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load products.json");
    const json = await res.json();
    state.products = (json.products || []).filter(p => p && p.title);
    // Normalize CMS paths ("/blender-free-asset/assets/..." -> "assets/...")
    // so thumbnails/preview images always resolve, wherever the site is hosted.
    state.products.forEach(p => {
      ["thumbnail", "previewImage", "previewGif", "modelUrl", "posterImage", "previewVideoUrl"].forEach(k => {
        if (p[k]) p[k] = normalizeAssetPath(p[k]);
      });
    });
  } catch (err) {
    console.error(err);
    state.products = [];
  }
  render();
}

// Site-wide 4-step download-gate + Panda key-system config, edited from
// /admin (Decap CMS -> data/settings.json). NEW clean schema:
//   gate.enable_steps  — Boolean: run the 4-step unlock or not
//   gate.step_duration — Number:  seconds each step must be watched (default 30)
//   gate.ad_tags       — Array:   VAST/video tag URLs, one per step (cycled)
// Falls back to safe defaults if the file is missing/broken, so a bad CMS
// edit can never break the download flow entirely.
window.SITE_SETTINGS = window.SITE_SETTINGS || null;
const DEFAULT_STEP_DURATION = 30;
const PLACEHOLDER_TAG = "YOUR_VAST_TAG_URL_HERE";

function normalizeSettings(json) {
  const gate = (json && json.gate) || {};
  const duration = Number(gate.step_duration);
  const rawTags = Array.isArray(gate.ad_tags) ? gate.ad_tags : [];
  const tagUrls = rawTags
    .map(tag => (typeof tag === "string" ? tag : (tag && tag.url)))
    .filter(url => typeof url === "string" && url.trim() && url.trim() !== PLACEHOLDER_TAG)
    .map(url => url.trim());
  return {
    gate: {
      enable_steps: typeof gate.enable_steps === "boolean" ? gate.enable_steps : true,
      step_duration: Number.isFinite(duration) && duration >= 5 ? Math.round(duration) : DEFAULT_STEP_DURATION,
      ad_tags: tagUrls,
    },
    keySystem: Object.assign(
      { service: "", whitelistCheckUrl: "", callbackBaseUrl: "", getKeyUrl: "", returnParamName: "key" },
      (json && json.keySystem) || {}
    ),
  };
}

async function loadSettings() {
  const fallback = normalizeSettings(null);
  try {
    const res = await fetch("data/settings.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load settings.json");
    const json = await res.json();
    window.SITE_SETTINGS = normalizeSettings(json);
  } catch (err) {
    console.error(err);
    window.SITE_SETTINGS = fallback;
  }
}

function renderSkeletons(n) {
  const skeletonHtml = Array.from({ length: n }).map(() => `
    <div class="card rounded-xl overflow-hidden">
      <div class="skeleton h-44 w-full"></div>
      <div class="p-5 space-y-3">
        <div class="skeleton h-4 w-3/4 rounded"></div>
        <div class="skeleton h-3 w-full rounded"></div>
        <div class="skeleton h-3 w-5/6 rounded"></div>
      </div>
    </div>
  `).join("");
  LIB_KEYS.forEach(lib => {
    if (els[lib].grid) els[lib].grid.innerHTML = skeletonHtml;
  });
}

/* ---------- filtering ---------- */
function getFiltered(lib) {
  const q = state.query[lib].trim().toLowerCase();
  return state.products.filter(p => {
    // Products created before the "library" field existed are treated as
    // Blender assets, so nothing already in data/products.json disappears.
    const productLibrary = p.library || "blender";
    const matchesLibrary = productLibrary === lib;
    const matchesCategory = state.activeCategory[lib] === "All" || p.category === state.activeCategory[lib];
    const haystack = `${p.title} ${p.description} ${p.category}`.toLowerCase();
    const matchesQuery = q === "" || haystack.includes(q);
    return matchesLibrary && matchesCategory && matchesQuery;
  });
}

/* ---------- render ---------- */
// Renders all three stacked library sections. Each section is independent
// (its own grid/empty-state/results-count) but shares the one search query.
function render() {
  LIB_KEYS.forEach(lib => renderLibrarySection(lib));
  // Comments button counts are shared/global across all cards on the page.
  refreshCommentCounts();
}

function renderLibrarySection(lib) {
  const { grid, emptyState, resultsCount } = els[lib];
  if (!grid) return;

  const items = getFiltered(lib);
  if (resultsCount) resultsCount.textContent = items.length ? t("results_count")(items.length) : "";

  if (items.length === 0) {
    grid.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }
  if (emptyState) emptyState.classList.add("hidden");

  grid.innerHTML = items.map(cardTemplate).join("");
  translateDynamic(grid); // translate title/description of every card just inserted

  grid.querySelectorAll("[data-download-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const product = state.products.find(p => p.id === btn.dataset.downloadId);
      if (product) openModal(product);
    });
  });

  grid.querySelectorAll("[data-viewer-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const product = state.products.find(p => p.id === btn.dataset.viewerId);
      if (product) openViewerModal(product);
    });
  });

  // Inline 3D preview: load the GLB/GLTF only when the card is hovered.
  // Debounced so quick pointer passes don't flash a blank card; the thumbnail
  // stays visible until the model has actually finished loading.
  grid.querySelectorAll(".card-media").forEach(media => {
    const viewer = media.querySelector(".card-3d-viewer");
    if (!viewer) return;

    let enterTimer = null;
    let leaveTimer = null;
    let safetyTimer = null;

    const isVideo = viewer.tagName === "VIDEO";

    const loadViewer = () => {
      if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
      enterTimer = setTimeout(() => {
        enterTimer = null;
        if (!viewer.dataset.loaded) {
          const src = viewer.dataset.modelSrc;
          if (src) {
            viewer.setAttribute("src", src);
            viewer.dataset.loaded = "1";
            media.classList.add("model-loading");
            // When the media has finished streaming, mark ready + show it.
            // model-viewer fires "load"; <video> fires "loadeddata".
            viewer.addEventListener(isVideo ? "loadeddata" : "load", () => {
              media.classList.remove("model-loading");
              media.classList.add("model-ready");
              if (isVideo) viewer.play().catch(() => {});
            }, { once: true });
            viewer.addEventListener("error", () => {
              media.classList.remove("model-loading");
            }, { once: true });
            // Safety: if the media hasn't loaded in 15s, drop the spinner
            // so the card doesn't look frozen.
            safetyTimer = setTimeout(() => {
              media.classList.remove("model-loading");
            }, 15000);
          } else {
            media.classList.add("model-ready");
          }
        } else if (isVideo) {
          viewer.currentTime = 0;
          viewer.play().catch(() => {});
        }
        media.classList.add("show-3d");
      }, 120);
    };

    const hideViewer = () => {
      if (enterTimer) { clearTimeout(enterTimer); enterTimer = null; }
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
      leaveTimer = setTimeout(() => {
        leaveTimer = null;
        media.classList.remove("show-3d");
        if (isVideo) viewer.pause();
      }, 120);
    };

    media.addEventListener("pointerenter", loadViewer);
    media.addEventListener("pointerleave", hideViewer);
  });

  grid.querySelectorAll("[data-report-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const product = state.products.find(p => p.id === btn.dataset.reportId);
      if (product) openReportModal(product);
    });
  });

  // Comments button on each card
  grid.querySelectorAll("[data-comments-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const product = state.products.find(p => p.id === btn.dataset.commentsId);
      if (product) openCommentsModal(product);
    });
  });
}

function cardTemplate(p) {
  const thumb = p.thumbnail || "https://placehold.co/600x400/0B0C10/00F0FF?text=Vaultframe";
  const preview = p.previewImage || p.previewGif || ""; // optional hover preview (image or GIF)
  const hasModel = !!p.modelUrl; // optional GLB/GLTF for the 3D viewer
  // Optional MP4 preview — only used when there's no 3D model (modelUrl wins if both are set).
  const hasVideo = !hasModel && !!p.previewVideoUrl;
  const hasMedia = hasModel || hasVideo; // either a 3D model OR a video preview
  return `
    <article class="card rounded-xl overflow-hidden group">
      <div class="card-media relative h-44${hasMedia ? " has-3d" : ""}${preview ? " has-preview" : ""}">
        <img class="card-thumb" src="${escapeAttr(thumb)}" alt="${escapeAttr(p.title)}" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/600x400/0B0C10/00F0FF?text=Vaultframe'">
        ${preview ? `<img class="card-preview" src="${escapeAttr(preview)}" alt="" loading="lazy" aria-hidden="true" onerror="this.closest('.card-media').classList.remove('has-preview'); this.remove()">` : ""}
        ${hasModel ? `<model-viewer class="card-3d-viewer" data-model-src="${escapeAttr(p.modelUrl)}" alt="3D preview of ${escapeAttr(p.title)}" camera-controls auto-rotate rotation-per-second="18deg" interaction-prompt="none" shadow-intensity="0.8" exposure="1"></model-viewer>` : ""}
        ${hasVideo ? `<video class="card-3d-viewer card-video-preview" data-model-src="${escapeAttr(p.previewVideoUrl)}" muted loop playsinline preload="none" aria-hidden="true"></video>` : ""}
        <div class="absolute top-3 left-3 flex gap-1.5">
          ${(p.blenderVersion || p.platform) ? `<span class="badge px-2 py-1 rounded">${escapeHtml(p.blenderVersion || p.platform)}</span>` : ""}
        </div>
        <div class="absolute top-3 right-3">
          ${p.engine ? `<span class="badge px-2 py-1 rounded" style="border-color:rgba(157,78,221,0.4); color:#C79BFF; background:rgba(157,78,221,0.08);">${escapeHtml(p.engine)}</span>` : ""}
        </div>
      </div>
      <div class="p-5">
        <div class="text-xs text-[var(--ink-dim)] mb-1.5">${escapeHtml(p.category || "")}</div>
        <h3 class="font-semibold leading-snug mb-1.5" data-mt-src="${escapeAttr(p.title)}">${escapeHtml(p.title)}</h3>
        <p class="text-sm text-[var(--ink-dim)] line-clamp-2 mb-4" data-mt-src="${escapeAttr(p.description || "")}">${escapeHtml(p.description || "")}</p>
        <div class="flex items-center justify-between">
          <span class="text-xs text-[var(--ink-dim)]">${escapeHtml(p.fileSize || "")}</span>
          <button data-download-id="${escapeAttr(p.id)}" class="btn-primary text-xs px-4 py-2 rounded-md">${escapeHtml(t("card_download"))}</button>
        </div>
        <div class="card-actions-row">
          <div style="display:flex;align-items:center;gap:8px;">
            ${hasMedia
              ? `<button data-viewer-id="${escapeAttr(p.id)}" class="btn-3d">
                   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>
                   ${escapeHtml(hasModel ? t("card_preview3d") : t("card_preview_video"))}
                 </button>`
              : `<span></span>`}
            <button data-comments-id="${escapeAttr(p.id)}" class="comment-count-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span class="cmt-count" data-cmt-for="${escapeAttr(p.id)}">0</span>
            </button>
          </div>
          <button data-report-id="${escapeAttr(p.id)}" class="btn-ghost-sm report-link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>
            ${escapeHtml(t("card_report"))}
          </button>
        </div>
      </div>
    </article>
  `;
}

/* Normalize image/file paths coming from the CMS.
   The Decap CMS saves uploads as "/blender-free-asset/assets/uploads/x.png"
   (absolute, repo-based). That only works when the site is served from the
   same URL. Convert it to a relative "assets/uploads/x.png" so thumbnails
   work everywhere (GitHub Pages, custom domain, local preview). */
function normalizeAssetPath(p = "") {
  if (!p) return "";
  if (/^(https?:|data:|blob:)/i.test(p)) return p;          // external / inline
  return p.replace(/^\/?blender-free-asset\//i, "").replace(/^\//, "");
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}
function escapeAttr(str = "") { return escapeHtml(str); }

/* ---------- search + chips + libraries ---------- */
// Each library has its own search box, so typing in it only re-renders
// that library's own grid — no jumping/scrolling caused by other sections.
LIB_KEYS.forEach(lib => {
  const input = els[lib].searchInput;
  if (!input) return;
  input.addEventListener("input", (e) => {
    state.query[lib] = e.target.value;
    renderLibrarySection(lib);
  });
});

// Builds the category-chip row for every library's section (all three are
// visible at once, so all three chip rows are built every time — on load
// and whenever the language changes).
function renderCategoryChips() {
  LIB_KEYS.forEach(lib => {
    const chipsWrap = els[lib].chipsWrap;
    if (!chipsWrap) return;
    const libDef = LIBRARIES[lib];
    chipsWrap.innerHTML = libDef.categories.map(cat => {
      const key = libDef.chipKey[cat] || "";
      const label = key ? t(key) : (cat || "");
      const isActive = cat === state.activeCategory[lib];
      return `<button data-cat="${escapeAttr(cat)}" class="chip${isActive ? " active" : ""} px-3.5 py-1.5 rounded-full text-xs">${escapeHtml(label)}</button>`;
    }).join("");
  });
}

// Each library's chip row only filters that library's own grid.
LIB_KEYS.forEach(lib => {
  const chipsWrap = els[lib].chipsWrap;
  if (!chipsWrap) return;
  chipsWrap.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-cat]");
    if (!btn) return;
    chipsWrap.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    state.activeCategory[lib] = btn.dataset.cat;
    renderLibrarySection(lib);
  });
});

/* =========================================================
   Download modal — NEW 4-step in-page video unlock gate
   ---------------------------------------------------------
   One compact stage inside the existing download box handles all 4
   steps. For every step it resolves an ad source from the CMS
   (settings.gate.ad_tags — VAST XML tag or direct video URL),
   plays it in the in-page HTML5 player, and credits watch time
   (video-clock based, loops included) until step_duration seconds
   are watched. Then the single morphing action button enables:
     steps 1-3  -> "Continue" (متابعة) unlocks the next stage
     step 4     -> the button becomes the official "Download"
                  (تحميل) file link
   NO new tabs, windows, pop-unders or redirects — ever.
   If an ad tag can't be resolved (CORS/placeholder/empty), the step
   degrades to a styled in-page countdown so the flow always works.
   ========================================================= */

const modal = document.getElementById("download-modal");
const modalBadge = document.getElementById("modal-badge");
const modalTitle = document.getElementById("modal-title");
const modalDesc = document.getElementById("modal-desc");
const modalFilesize = document.getElementById("modal-filesize");
const modalEngine = document.getElementById("modal-engine");
const modalLicense = document.getElementById("modal-license");
const modalHint = document.getElementById("modal-hint");
const modalClose = document.getElementById("modal-close");
const stepIndicator = document.getElementById("step-indicator");
const progressBar = document.getElementById("progress-bar");
const progressLabel = document.getElementById("progress-label");
const progressPercent = document.getElementById("progress-percent");
const tutorialPanel = document.getElementById("tutorial-panel");
const tutorialVideo = document.getElementById("tutorial-video");
const tutorialVideoToggle = document.getElementById("tutorial-video-toggle");

// --- gate stage refs ---
const gateStage = document.getElementById("gate-stage");
const gateStepLabel = document.getElementById("gate-step-label");
const gateCountdownEl = document.getElementById("gate-countdown");
const gateVideo = document.getElementById("gate-video");
const gateVideoLoading = document.getElementById("gate-video-loading");
const gateLoadingText = document.getElementById("gate-loading-text");
const gateVideoFallback = document.getElementById("gate-video-fallback");
const gateFallbackCountdown = document.getElementById("gate-fallback-countdown");
const gateFallbackText = document.getElementById("gate-fallback-text");
const gatePlayChip = document.getElementById("gate-play-chip");
const gateCaption = document.getElementById("gate-caption");
const gateActionBtn = document.getElementById("gate-action-btn");
const gateRing = document.getElementById("gate-ring");
const gateRingProgress = document.getElementById("gate-ring-progress");
const gateActionIcon = document.getElementById("gate-action-icon");
const gateActionLabel = document.getElementById("gate-action-label");
const gateDownloadLink = document.getElementById("gate-download-link");

// Optional site-wide fallback tutorial/explainer video, used when a product
// doesn't define its own `tutorialVideoUrl`. Leave empty (default) to keep
// the side panel fully optional/off unless a product sets one via the CMS.
window.DEFAULT_TUTORIAL_VIDEO_URL = window.DEFAULT_TUTORIAL_VIDEO_URL || "";

// Shows/hides the optional "how to download" side panel for the product
// currently open in the modal. Starts muted+looping (a silent preview);
// clicking the overlay unmutes, shows native controls, and plays with sound.
function setupTutorialPanel(product) {
  const src = (product && product.tutorialVideoUrl) || window.DEFAULT_TUTORIAL_VIDEO_URL || "";
  tutorialPanel.classList.remove("played");
  tutorialVideo.pause();
  tutorialVideo.controls = false;
  tutorialVideo.muted = true;
  tutorialVideo.currentTime = 0;

  if (!src) {
    tutorialPanel.classList.add("hidden");
    tutorialVideo.removeAttribute("src");
    return;
  }

  tutorialPanel.classList.remove("hidden");
  tutorialVideo.src = src;
  tutorialVideo.load();
  tutorialVideo.play().catch(() => { /* silent autoplay can still be blocked on some browsers; the tap-to-play overlay covers that case */ });
}

if (tutorialVideoToggle) {
  tutorialVideoToggle.addEventListener("click", () => {
    tutorialVideo.muted = false;
    tutorialVideo.loop = false;
    tutorialVideo.controls = true;
    tutorialVideo.currentTime = 0;
    tutorialVideo.play().catch(() => { /* no-op — user gesture should satisfy autoplay policies here */ });
    tutorialPanel.classList.add("played");
  });
}

// ===== NEW 4-STEP IN-PAGE GATE ENGINE =====
// ---------------------------------------------------------------------------
// Ad source resolution: each step gets one entry from settings.gate.ad_tags
// (cycled if fewer than 4 exist). A tag can be:
//   1) a direct media URL (.mp4 / .webm / .m3u8-free) -> played as-is
//   2) a VAST 3/4 XML tag URL -> fetched, parsed for <MediaFile>, any
//      <Wrapper> is followed (up to 3 hops), and the best bitrate MP4
//      becomes the video source. Standard VAST macros are substituted.
// If anything fails (network, CORS, no mediafile, placeholder), the step
// degrades to a styled in-page countdown of the same duration — the flow
// NEVER breaks and NEVER opens a new tab.
// ---------------------------------------------------------------------------
const GATE_TOTAL_STEPS = 4;
const RING_CIRCUMFERENCE = 2 * Math.PI * 15.5; // matches r=15.5 in the SVG
const MAX_WRAPPER_HOPS = 3;
const VAST_MACRO_MAP = {
  CACHEBUSTER: () => Math.round(Math.random() * 1e9),
  TIMESTAMP: () => encodeURIComponent(new Date().toISOString()),
  RAND: () => Math.round(Math.random() * 1e9),
  RANDOM: () => Math.round(Math.random() * 1e9),
};

// --- gate state ---
let activeProduct = null;      // product whose modal is open
let gateStep = 0;              // 0-based index of the CURRENT step (0..3)
let gateAdSource = null;       // resolved { url, type } for this step
let gateWatchedMs = 0;         // ms actually watched this step (video clock)
let gateDurationMs = 0;        // required watch time this step
let gateLastTick = 0;          // performance.now() at last tick
let gateTicker = null;         // rAF/interval handle
let gateAwaitingContinue = false; // step done, waiting for متابعة click
let gateResolver = null;       // active AbortController (VAST fetch)
let gateRunning = false;       // gate currently active (timer counting)

function gateSettings() {
  const g = (window.SITE_SETTINGS && window.SITE_SETTINGS.gate) || {};
  return {
    enable_steps: typeof g.enable_steps === "boolean" ? g.enable_steps : true,
    step_duration: Number.isFinite(g.step_duration) && g.step_duration >= 5 ? g.step_duration : DEFAULT_STEP_DURATION,
    ad_tags: Array.isArray(g.ad_tags) ? g.ad_tags : [],
  };
}

// the ad tag for step index i (0-based), cycling through the list
function gateTagForStep(i) {
  const { ad_tags } = gateSettings();
  if (!ad_tags.length) return null;
  return ad_tags[i % ad_tags.length];
}

/* ---------- VAST resolution ---------- */

// substitutes standard VAST macros like [CACHEBUSTER], [TIMESTAMP], [RAND]
function expandVastMacros(url) {
  return url.replace(/\[(CACHEBUSTER|TIMESTAMP|RAND|RANDOM)\]/gi, (m, name) => {
    const fn = VAST_MACRO_MAP[String(name).toUpperCase()];
    return fn ? String(fn()) : m;
  });
}

// true when the tag looks like a direct media file rather than a VAST XML
function isDirectMediaUrl(url) {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

// picks the best (highest-bitrate) progressive MP4 MediaFile from a VAST body
function pickBestMediaFile(mediaFiles) {
  const ranked = mediaFiles
    .filter(f => f && f.url)
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
  // prefer HTML5-friendly progressive MP4/WebM
  const progressive = ranked.find(f => f.type && /mp4|webm/i.test(f.type));
  return progressive || ranked[0] || null;
}

// minimal VAST 3/4 parser: returns { mediaFiles, wrapperUrl, impressions, errors }
function parseVastXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("VAST XML parse error");
  const mediaFiles = Array.from(doc.querySelectorAll("MediaFile")).map(el => ({
    url: (el.textContent || "").trim(),
    type: el.getAttribute("type") || "",
    bitrate: Number(el.getAttribute("bitrate")) || 0,
    width: Number(el.getAttribute("width")) || 0,
    height: Number(el.getAttribute("height")) || 0,
  }));
  const wrapperEl = doc.querySelector("VAST Ad Wrapper");
  const wrapperUrl = wrapperEl ? (wrapperEl.textContent || "").trim() : null;
  const impressions = Array.from(doc.querySelectorAll("VAST Ad InLine Impression")).map(el => (el.textContent || "").trim()).filter(Boolean);
  const errors = Array.from(doc.querySelectorAll("VAST Ad Error")).map(el => (el.textContent || "").trim()).filter(Boolean);
  const clickThrough = doc.querySelector("VAST Ad InLine Linear Creative VideoClicks ClickThrough");
  const clickUrl = clickThrough ? (clickThrough.textContent || "").trim() : null;
  return { mediaFiles, wrapperUrl, impressions, errors, clickUrl };
}

// Resolves one ad tag to { url, type: "vast" | "direct" } — follows VAST
// wrappers up to MAX_WRAPPER_HOPS. Never throws to the caller; on failure
// returns null and the step falls back to the in-page countdown.
async function resolveAdSource(tagUrl) {
  const tag = expandVastMacros(String(tagUrl || "").trim());
  if (!tag) return null;
  if (isDirectMediaUrl(tag)) return { url: tag, type: "direct" };

  // VAST XML tag — fetch + parse
  let currentUrl = tag;
  for (let hop = 0; hop <= MAX_WRAPPER_HOPS; hop++) {
    try {
      const res = await fetch(currentUrl, { cache: "no-store", signal: gateResolver && gateResolver.signal });
      if (!res.ok) throw new Error(`VAST tag HTTP ${res.status}`);
      const xmlText = await res.text();
      const parsed = parseVastXml(xmlText);
      // fire tracking pixels best-effort (imp 1x1), never blocking the flow
      parsed.impressions.forEach(px => firePixel(px));
      if (parsed.wrapperUrl) {
        currentUrl = expandVastMacros(parsed.wrapperUrl);
        continue;
      }
      const best = pickBestMediaFile(parsed.mediaFiles);
      if (best && best.url) return { url: best.url, type: "vast", clickUrl: parsed.clickUrl || null };
      throw new Error("VAST tag had no playable MediaFile");
    } catch (err) {
      console.warn("[gate] ad tag failed:", err && err.message);
      return null;
    }
  }
  return null;
}

// best-effort 1x1 pixel ping (CORS-safe, fire and forget)
function firePixel(url) {
  if (!url) return;
  try { new Image().src = expandVastMacros(url); } catch (e) { /* no-op */ }
}

/* ---------- rendering ---------- */

function renderStepIndicator(totalSteps, currentStep) {
  if (!stepIndicator) return;
  if (totalSteps <= 0) {
    stepIndicator.innerHTML = "";
    return;
  }
  const pills = [];
  for (let i = 1; i <= totalSteps; i++) {
    const done = i < currentStep;      // steps before the current one
    const active = i === currentStep;
    const cls = done
      ? "background:rgba(0,240,255,0.12); border-color:rgba(0,240,255,0.4); color:var(--ink);"
      : active
        ? "background:rgba(157,78,221,0.12); border-color:rgba(157,78,221,0.45); color:#C79BFF;"
        : "background:transparent; border-color:var(--line); color:var(--ink-dim);";
    const icon = done ? "\u2713" : "\u25B6";
    pills.push(`
      <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors" style="${cls}">
        ${icon}
        <span>${t("step_of_label")(i, totalSteps)}</span>
      </div>`);
  }
  const unlocked = currentStep > totalSteps; // all 4 done
  pills.push(`
    <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
      style="${unlocked
        ? "background:rgba(0,240,255,0.12); border-color:rgba(0,240,255,0.4); color:var(--ink);"
        : "background:transparent; border-color:var(--line); color:var(--ink-dim);"}">
      ${unlocked ? "\u2713" : "\uD83D\uDD12"}
      <span>${t("modal_drive_btn")}</span>
    </div>`);
  stepIndicator.innerHTML = pills.join("");
}

const remainingStepsText = (n) => n === 1 ? t("steps_left_one") : t("steps_left")(n);
const allDoneText = () => t("steps_all_done");

// Overall progress across all 4 steps + final unlock. fraction = 0..1 of the
// CURRENT step already watched, so the bar creeps smoothly every frame.
function updateOverallProgress(totalSteps, currentStep, fraction) {
  if (!progressBar) return;
  const totalUnits = totalSteps + 1; // +1 final download unit
  const completedUnits = Math.min(currentStep, totalSteps) + Math.min(fraction || 0, 1);
  const pct = Math.min(100, Math.round((completedUnits / totalUnits) * 100));
  progressBar.style.width = pct + "%";
  if (progressPercent) progressPercent.textContent = pct + "%";
  const remaining = Math.max(totalSteps - currentStep, 0);
  if (progressLabel) {
    progressLabel.textContent = remaining > 0 ? remainingStepsText(remaining) : allDoneText();
  }
}

/* ---------- modal ---------- */

function openModal(product) {
  activeProduct = product;
  gateStep = 0;
  stopGateTicker();
  gateResolverAbort();

  modalBadge.textContent = product.blenderVersion || product.platform || "";
  setDynamicText(modalTitle, product.title);
  setDynamicText(modalDesc, product.description || "");
  modalFilesize.textContent = product.fileSize || "\u2014";
  modalEngine.textContent = product.engine || product.platform || "\u2014";
  modalLicense.textContent = product.license || "\u2014";

  setupTutorialPanel(product);

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.style.overflow = "hidden";

  const settings = gateSettings();
  if (!settings.enable_steps) {
    // gate disabled in CMS -> straight to the final download button
    revealFinalDownload();
  } else {
    startGateStep(1);
  }
}

/* ---------- gate steps ---------- */
function startGateStep(stepNumber) {
  gateStep = stepNumber - 1;
  const { step_duration } = gateSettings();
  gateDurationMs = Math.max(5, step_duration) * 1000;
  gateWatchedMs = 0;
  gateAwaitingContinue = false;
  gateRunning = true;
  gateLastTick = performance.now();

  const tag = gateTagForStep(gateStep);
  if (tag && window.AdEngine) {
    gateResolverAbort();
    gateResolver = new AbortController();
    showGateLoading(true);

    AdEngine.playAdTag(tag, {
      videoEl: gateVideo,
      signal: gateResolver.signal,
      onDirect: function(url) {
        showGateLoading(false);
        startFallbackStep();
        AdEngine.attachDirectLink(gateVideoFallback, url);
      },
      onFallback: function() {
        showGateLoading(false);
        startFallbackStep();
      }
    }).then(function() {
      showGateLoading(false);
    });
  } else {
    startFallbackStep();
  }
}
  // UI reset for this step
  gateStage.classList.remove("hidden");
  gateDownloadLink.classList.add("hidden");
  gateDownloadLink.classList.remove("flex");
  gateActionBtn.classList.remove("hidden");
  gateActionBtn.disabled = true;
  gateActionBtn.classList.remove("ready");
  gateActionIcon.classList.add("hidden");
  gateRing.classList.remove("hidden");
  gateActionLabel.textContent = t("unlock_unlocking")(Math.ceil(gateDurationMs / 1000));
  gateRingProgress.style.strokeDasharray = String(RING_CIRCUMFERENCE);
  gateRingProgress.style.strokeDashoffset = "0";
  gateStepLabel.textContent = t("step_of_label")(stepNumber, GATE_TOTAL_STEPS);
  gateCountdownEl.textContent = String(Math.ceil(gateDurationMs / 1000));
  gateCaption.textContent = t("gate_caption_watch");
  modalHint.textContent = t("modal_hint_video");

  renderStepIndicator(GATE_TOTAL_STEPS, stepNumber);
  updateOverallProgress(GATE_TOTAL_STEPS, stepNumber - 1, 0);

  // reset video element state from any previous step
  gateVideo.pause();
  gateVideo.removeAttribute("src");
  gateVideo.load();
  hideGateOverlays();
  gatePlayChip.classList.remove("shown");
  gatePlayChip.classList.add("hidden");

  // resolve this step's ad source (VAST or direct) asynchronously
  const tag = gateTagForStep(gateStep);
  if (tag) {
    gateResolverAbort();
    gateResolver = new AbortController();
    showGateLoading(true);
    resolveAdSource(tag).then(source => {
      if (!gateRunning || gateAwaitingContinue) return; // closed/moved on
      showGateLoading(false);
      if (source && source.url) {
        attachAdVideo(source.url);
      } else {
        startFallbackStep();
      }
    });
  } else {
    startFallbackStep();
  }

  startGateTicker();
}

function hideGateOverlays() {
  [gateVideoLoading, gateVideoFallback].forEach(el => {
    if (!el) return;
    el.classList.remove("shown");
    el.classList.add("hidden");
  });
}

function showGateLoading(on) {
  if (!gateVideoLoading) return;
  gateVideoLoading.classList.toggle("shown", !!on);
  gateVideoLoading.classList.toggle("hidden", !on);
}

function attachAdVideo(url) {
  if (!gateRunning || gateAwaitingContinue) return;
  gateVideoFallback.classList.add("hidden");
  gateVideoFallback.classList.remove("shown");
  gateVideo.src = url;
  gateVideo.load();
  const tryPlay = gateVideo.play();
  if (tryPlay && tryPlay.catch) tryPlay.catch(() => showGatePlayChip());
  // if the ad is blocked from autoplaying, show the center play chip
  gateVideo.onplaying = () => { hideGatePlayChip(); };
}

function showGatePlayChip() {
  if (!gatePlayChip) return;
  gatePlayChip.classList.remove("hidden");
  gatePlayChip.classList.add("shown");
}

function hideGatePlayChip() {
  if (!gatePlayChip) return;
  gatePlayChip.classList.add("hidden");
  gatePlayChip.classList.remove("shown");
}

// Styled in-page countdown used when no ad could be resolved — same
// duration, same progress behaviour, still fully inside the box.
function startFallbackStep() {
  if (!gateRunning || gateAwaitingContinue) return;
  gateVideoLoading.classList.add("hidden");
  gateVideoLoading.classList.remove("shown");
  gateVideoFallback.classList.remove("hidden");
  gateVideoFallback.classList.add("shown");
  gateFallbackText.textContent = t("gate_fallback_text");
  gateFallbackCountdown.textContent = String(Math.ceil((gateDurationMs - gateWatchedMs) / 1000));
  gateCaption.textContent = t("gate_fallback_caption");
}

/* ---------- watch-time ticker (video-clock based) ---------- */

// The step duration counts REAL watch time: while an ad video is actually
// playing (even across loops), the watch clock advances; while paused it
// stands still. When no ad is playable (fallback state), plain wall time
// counts instead so the step still completes on schedule. A 250ms ticker
// samples both clocks, keeping countdown + progress bar in sync.
let lastShownRemainS = -1;
function startGateTicker() {
  stopGateTicker();
  lastShownRemainS = -1;
  gateRunning = true;              // the ticker IS the running clock
  gateLastTick = performance.now(); // clean start for the first delta
  gateTicker = setInterval(gateTick, 250);
  gateTick();
}

function stopGateTicker() {
  if (gateTicker !== null) {
    clearInterval(gateTicker);
    gateTicker = null;
  }
  gateRunning = false;
}

function gateTick() {
  if (!gateRunning || gateAwaitingContinue) return;
  const now = performance.now();
  const wallDelta = now - gateLastTick;
  gateLastTick = now;
  if (wallDelta <= 0 || wallDelta > 2000) return; // tab hidden / throttled — don't credit

  const fallbackVisible = isFallbackVisible();
  const adPlaying = !fallbackVisible &&
    !gateVideo.paused && !gateVideo.ended && !gateVideo.error && !!gateVideo.currentSrc;

  if (adPlaying || fallbackVisible) gateWatchedMs += wallDelta;

  const remainingMs = Math.max(gateDurationMs - gateWatchedMs, 0);
  const remainS = Math.ceil(remainingMs / 1000);
  gateCountdownEl.textContent = String(remainS);
  if (fallbackVisible && gateFallbackCountdown) gateFallbackCountdown.textContent = String(remainS);
  if (remainS !== lastShownRemainS) {
    lastShownRemainS = remainS;
    gateActionLabel.textContent = t("unlock_unlocking")(remainS);
  }

  const fraction = gateWatchedMs / gateDurationMs;
  gateRingProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * Math.min(fraction, 1));
  updateOverallProgress(GATE_TOTAL_STEPS, gateStep, fraction);

  if (remainingMs <= 0) finishStepWatch();
}

function isFallbackVisible() {
  return gateVideoFallback && !gateVideoFallback.classList.contains("hidden");
}

/* ---------- step completion ---------- */

function finishStepWatch() {
  gateAwaitingContinue = true;
  stopGateTicker();
  try { gateVideo.pause(); } catch (e) { /* no-op */ }
  hideGatePlayChip();

  const isLastStep = gateStep >= GATE_TOTAL_STEPS - 1;
  renderStepIndicator(GATE_TOTAL_STEPS, isLastStep ? GATE_TOTAL_STEPS + 1 : gateStep + 1);

  if (isLastStep) {
    revealFinalDownload();
  } else {
    // "Continue" (متابعة) — unlocks the next stage in the same box
    gateActionBtn.disabled = false;
    gateActionBtn.classList.add("ready");
    gateRing.classList.add("hidden");
    gateActionIcon.classList.add("hidden");
    gateActionLabel.textContent = t("unlock_ready");
    gateCaption.textContent = t("gate_caption_ready");
    modalHint.textContent = t("modal_hint_continue");
    updateOverallProgress(GATE_TOTAL_STEPS, gateStep + 1, 0);
  }
}

// Step 4 finished -> the action button becomes the official file download.
function revealFinalDownload() {
  const url = (activeProduct && (activeProduct.downloadUrl || activeProduct.driveLink)) || "#";
  gateDownloadLink.href = url;
  gateDownloadLink.classList.remove("hidden");
  gateDownloadLink.classList.add("flex");
  gateActionBtn.classList.add("hidden");
  gateStage.classList.add("hidden");
  gateAwaitingContinue = true;
  stopGateTicker();
  renderStepIndicator(GATE_TOTAL_STEPS, GATE_TOTAL_STEPS + 1);
  updateOverallProgress(GATE_TOTAL_STEPS, GATE_TOTAL_STEPS, 1); // final unit done -> 100%
  modalHint.textContent = t("modal_hint_ready");
}

/* ---------- interactions ---------- */

gateActionBtn.addEventListener("click", () => {
  if (gateActionBtn.disabled) return;
  if (!gateAwaitingContinue) return; // still watching — button stays inert
  if (!activeProduct) return;
  const nextStep = gateStep + 2; // moving to step N+1 (1-based)
  if (nextStep > GATE_TOTAL_STEPS) {
    revealFinalDownload();
    return;
  }
  startGateStep(nextStep);
});

if (gatePlayChip) {
  gatePlayChip.addEventListener("click", () => {
    hideGatePlayChip();
    gateVideo.play().catch(() => { /* still blocked -> fallback below */ });
    setTimeout(() => {
      if (!gateVideo.paused) return;
      // autoplay still refused after a direct gesture: degrade gracefully
      if (!isFallbackVisible()) startFallbackStep();
    }, 400);
  });
}

gateVideo.addEventListener("click", () => {
  // clicking the ad video toggles pause/resume (in-page, no pop-unders)
  if (gateVideo.paused) gateVideo.play().catch(() => {});
  else gateVideo.pause();
});

function gateResolverAbort() {
  if (gateResolver) {
    try { gateResolver.abort(); } catch (e) { /* no-op */ }
    gateResolver = null;
  }
}

function closeModal() {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.style.overflow = "";
  // stop the gate cleanly: timer, ad fetch, video, overlays
  gateAwaitingContinue = true;
  stopGateTicker();
  gateResolverAbort();
  hideGatePlayChip();
  try { gateVideo.pause(); } catch (e) { /* no-op */ }
  gateVideo.removeAttribute("src");
  gateVideo.load();
  hideGateOverlays();
  gateStage.classList.add("hidden");
  gateActionBtn.classList.add("hidden");
  gateDownloadLink.classList.add("hidden");
  gateDownloadLink.classList.remove("flex");
  try { tutorialVideo.pause(); } catch (e) { /* no-op */ }
  tutorialPanel.classList.add("hidden");
  tutorialPanel.classList.remove("played");
  activeProduct = null;
}

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});

/* =========================================================
   NEW: contact target for the report / request forms below.
   Frontend-only delivery via mailto — replace CONTACT_EMAIL
   with a real inbox, or swap the two window.location.href
   lines for a fetch() call to Formspree / Getform / your own
   worker if you'd rather submit silently with no mail client.
   ========================================================= */
const CONTACT_EMAIL = "requests@oelono.dev"; // TODO: replace with your real inbox

/* =========================================================
   DISCORD INTEGRATION (via Cloudflare Worker)
   --------------------------------------------------------
   Reports, model requests AND comments are pushed to Discord
   through the "discord-bot" Cloudflare Worker instead of
   calling a Discord webhook directly from the browser. This
   keeps the webhook URLs secret (they live only as Worker
   secrets), and lets the Worker validate/rate-limit input.

   SETUP:
   1. Deploy the Worker (discord-bot-worker.js) to Cloudflare.
   2. Replace WORKER_URL below with your Worker's URL, e.g.
      "https://discord-bot.YOUR-SUBDOMAIN.workers.dev/submit"
   ========================================================= */
const WORKER_URL = "https://discord-bot.beenbeen123455678.workers.dev/submit";

/* =========================================================
   reCAPTCHA verification (via the oelono-comments Worker)
   --------------------------------------------------------
   The Worker holds the reCAPTCHA SECRET key (never exposed to the
   browser) and checks the token against Google before we accept a
   comment / wall message as human-submitted.
   ========================================================= */
const COMMENTS_API_URL = "https://oelono-comments.beenbeen123455678.workers.dev";

async function verifyRecaptcha(token) {
  if (!token) return false;
  try {
    const res = await fetch(`${COMMENTS_API_URL}/verify-captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    return !!(data && data.success);
  } catch (err) {
    console.error("[reCAPTCHA] verify failed:", err);
    return false;
  }
}

/* =========================================================
   Persist a comment or guestbook entry to data/comments.json.
   This calls the SAME Worker as reCAPTCHA verification
   (COMMENTS_API_URL), on a new "/submit-comment" route. That
   route re-checks the honeypot/basic shape server-side, then
   commits the updated data/comments.json straight to the repo
   via the GitHub Contents API — see comments-worker/worker.js
   for the deployable Worker source and setup notes.

   `payload` is either:
     { type: "comment",   productId, comment: {name,text,rating,ts} }
     { type: "guestbook", entry: {name,text,rating,ts} }

   On success, the Worker also returns the fresh comments.json so we
   can update state.commentsData immediately without waiting for the
   GitHub Pages rebuild (which normally takes under a minute).
   Returns true/false.
   ========================================================= */
async function saveCommentRemote(payload) {
  try {
    const res = await fetch(`${COMMENTS_API_URL}/submit-comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    if (data && data.comments) {
      // Server confirmed + returned the updated file — use it as-is.
      state.commentsData = {
        comments: data.comments.comments || {},
        guestbook: data.comments.guestbook || [],
      };
    } else {
      // Fallback: append optimistically on the client so the UI still
      // reflects the new entry this session, even if the Worker didn't
      // echo the file back.
      if (payload.type === "comment") {
        const id = payload.productId;
        if (!Array.isArray(state.commentsData.comments[id])) state.commentsData.comments[id] = [];
        state.commentsData.comments[id].push(payload.comment);
      } else if (payload.type === "guestbook") {
        state.commentsData.guestbook.push(payload.entry);
      }
    }
    return true;
  } catch (err) {
    console.error("[comments] save failed:", err);
    return false;
  }
}

async function sendToDiscord(type, { title, description, fields = [], footer = "" }) {
  if (!WORKER_URL || WORKER_URL.includes("YOUR-SUBDOMAIN")) {
    console.warn("[Discord] WORKER_URL not configured yet in script.js.");
    return false;
  }
  const payload = {
    type, // "report" | "request" | "comment"
    title: title || "",
    description: description || "",
    fields: fields.filter(f => f && f.name && f.value),
    footer: footer || "",
    honeypot: "", // فاضي دايمًا للمستخدم الحقيقي؛ لو اتملى الـ Worker بيتجاهل الطلب
  };
  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error("[Discord] send failed:", err);
    return false;
  }
}


const toastEl = document.getElementById("toast");
let toastTimer = null;
function showToast(message) {
  if (!toastEl || !message) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
}

/* ---------------------------------------------------------
   3D VIEWER MODAL — <model-viewer> loads the asset's GLB/GLTF
   (product field: modelUrl) so visitors can rotate/zoom it
   before downloading.
   --------------------------------------------------------- */
const viewerModal = document.getElementById("viewer-modal");
const viewerClose = document.getElementById("viewer-close");
const viewerTitleEl = document.getElementById("viewer-title");
const viewerHintEl = document.getElementById("viewer-hint");
const modelViewerEl = document.getElementById("model-viewer-el");
const videoViewerEl = document.getElementById("video-viewer-el");

function openViewerModal(product) {
  const hasModel = !!product.modelUrl;
  const hasVideo = !hasModel && !!product.previewVideoUrl;
  if (!hasModel && !hasVideo) {
    showToast(t("viewer_unavailable"));
    return;
  }

  if (product.title) {
    setDynamicText(viewerTitleEl, product.title);
  } else {
    delete viewerTitleEl.dataset.mtSrc;
    viewerTitleEl.textContent = hasModel ? t("viewer_title") : t("viewer_title_video");
  }
  if (viewerHintEl) viewerHintEl.textContent = hasModel ? t("viewer_hint") : t("viewer_hint_video");

  if (hasModel) {
    modelViewerEl.classList.remove("hidden");
    videoViewerEl.classList.add("hidden");
    modelViewerEl.setAttribute("alt", product.title || "3D preview");
    if (product.posterImage || product.thumbnail) {
      modelViewerEl.setAttribute("poster", product.posterImage || product.thumbnail);
    } else {
      modelViewerEl.removeAttribute("poster");
    }
    modelViewerEl.setAttribute("src", product.modelUrl);
    videoViewerEl.removeAttribute("src");
    videoViewerEl.pause();
  } else {
    videoViewerEl.classList.remove("hidden");
    modelViewerEl.classList.add("hidden");
    modelViewerEl.removeAttribute("src");
    videoViewerEl.setAttribute("src", product.previewVideoUrl);
    videoViewerEl.play().catch(() => {});
  }

  viewerModal.classList.remove("hidden");
  viewerModal.classList.add("flex");
  document.body.style.overflow = "hidden";
}

function closeViewerModal() {
  viewerModal.classList.add("hidden");
  viewerModal.classList.remove("flex");
  document.body.style.overflow = "";
  modelViewerEl.removeAttribute("src"); // stop rendering once hidden
  videoViewerEl.pause();
  videoViewerEl.removeAttribute("src");
  videoViewerEl.load();
}

viewerClose.addEventListener("click", closeViewerModal);
viewerModal.addEventListener("click", (e) => { if (e.target === viewerModal) closeViewerModal(); });

/* ---------------------------------------------------------
   REPORT BROKEN LINK MODAL
   --------------------------------------------------------- */
const reportModal = document.getElementById("report-modal");
const reportClose = document.getElementById("report-close");
const reportForm = document.getElementById("report-form");
const reportAssetName = document.getElementById("report-asset-name");
const reportReasonSelect = document.getElementById("report-reason");
const reportNote = document.getElementById("report-note");
let reportProduct = null;

function openReportModal(product) {
  reportProduct = product;
  setDynamicText(reportAssetName, product.title || "");
  reportForm.reset();
  reportModal.classList.remove("hidden");
  reportModal.classList.add("flex");
  document.body.style.overflow = "hidden";
}

function closeReportModal() {
  reportModal.classList.add("hidden");
  reportModal.classList.remove("flex");
  document.body.style.overflow = "";
  reportProduct = null;
}

reportClose.addEventListener("click", closeReportModal);
reportModal.addEventListener("click", (e) => { if (e.target === reportModal) closeReportModal(); });

reportForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!reportProduct) return;

  const reasonLabel = reportReasonSelect.options[reportReasonSelect.selectedIndex].text;

  const ok = await sendToDiscord("report", {
    title: "🚩 Broken Link Report",
    description: `**Asset:** ${reportProduct.title} (\`${reportProduct.id}\`)`,
    fields: [
      { name: "Reason", value: reasonLabel, inline: true },
      { name: "Details", value: reportNote.value.trim() || "—", inline: false },
      { name: "Page", value: window.location.href, inline: false },
    ],
    footer: "Vaultframe report",
  });

  showToast(t("report_success"));
  closeReportModal();

  if (!ok) {
    const subject = `Broken link report: ${reportProduct.title}`;
    const body =
      `Asset: ${reportProduct.title} (${reportProduct.id})\n` +
      `Reason: ${reasonLabel}\n` +
      `Details: ${reportNote.value.trim() || "—"}\n` +
      `Page: ${window.location.href}`;
    window.location.href =
      `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
});

/* ---------------------------------------------------------
   ABOUT / PRIVACY / TERMS — GLASS INFO MODALS
   --------------------------------------------------------- */
const infoModals = {
  about: document.getElementById("about-modal"),
  privacy: document.getElementById("privacy-modal"),
  terms: document.getElementById("terms-modal"),
};

function openInfoModal(name) {
  const modal = infoModals[name];
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.style.overflow = "hidden";
}

function closeInfoModal(name) {
  const modal = infoModals[name];
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.style.overflow = "";
}

function closeAllInfoModals() {
  Object.keys(infoModals).forEach(closeInfoModal);
}

document.querySelectorAll("[data-info-modal]").forEach((btn) => {
  btn.addEventListener("click", () => openInfoModal(btn.getAttribute("data-info-modal")));
});

Object.entries(infoModals).forEach(([name, modal]) => {
  if (!modal) return;
  modal.addEventListener("click", (e) => { if (e.target === modal) closeInfoModal(name); });
  modal.querySelectorAll("[data-info-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeInfoModal(name));
  });
});

// link inside the privacy modal that jumps to the contact section
document.querySelectorAll("[data-info-modal-jump]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-info-modal-jump");
    closeAllInfoModals();
    document.body.style.overflow = "";
    const el = document.querySelector(target);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  });
});

/* ---------------------------------------------------------
   LEAVE-SITE CONFIRMATION (Admin / GitHub / Contact / any
   link marked with data-confirm-leave)
   --------------------------------------------------------- */
const leaveSiteModal = document.getElementById("leave-site-modal");
const leaveSiteConfirm = document.getElementById("leave-site-confirm");
const leaveSiteCancel = document.getElementById("leave-site-cancel");

function openLeaveSiteModal(url, target) {
  leaveSiteConfirm.setAttribute("href", url);
  if (target) {
    leaveSiteConfirm.setAttribute("target", target);
    leaveSiteConfirm.setAttribute("rel", "noopener");
  } else {
    leaveSiteConfirm.removeAttribute("target");
  }
  leaveSiteModal.classList.remove("hidden");
  leaveSiteModal.classList.add("flex");
  document.body.style.overflow = "hidden";
}

function closeLeaveSiteModal() {
  leaveSiteModal.classList.add("hidden");
  leaveSiteModal.classList.remove("flex");
  document.body.style.overflow = "";
}

if (leaveSiteModal && leaveSiteConfirm && leaveSiteCancel) {
  document.querySelectorAll("[data-confirm-leave]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      openLeaveSiteModal(link.getAttribute("href"), link.getAttribute("target"));
    });
  });

  leaveSiteCancel.addEventListener("click", closeLeaveSiteModal);
  leaveSiteConfirm.addEventListener("click", closeLeaveSiteModal);
  leaveSiteModal.addEventListener("click", (e) => { if (e.target === leaveSiteModal) closeLeaveSiteModal(); });
}

/* ---------------------------------------------------------
   REQUEST A MODEL MODAL
   --------------------------------------------------------- */
const requestModal = document.getElementById("request-modal");
const requestClose = document.getElementById("request-close");
const requestForm = document.getElementById("request-form");
const requestDesc = document.getElementById("request-desc");
const requestCategory = document.getElementById("request-category");
const requestContact = document.getElementById("request-contact");
const requestRef = document.getElementById("request-ref");

function openRequestModal() {
  requestForm.reset();
  requestModal.classList.remove("hidden");
  requestModal.classList.add("flex");
  document.body.style.overflow = "hidden";
}

function closeRequestModal() {
  requestModal.classList.add("hidden");
  requestModal.classList.remove("flex");
  document.body.style.overflow = "";
}

const requestModalNavBtn = document.getElementById("open-request-modal");
if (requestModalNavBtn) requestModalNavBtn.addEventListener("click", openRequestModal);
const requestModalFooterBtn = document.getElementById("open-request-modal-footer");
if (requestModalFooterBtn) requestModalFooterBtn.addEventListener("click", openRequestModal);

requestClose.addEventListener("click", closeRequestModal);
requestModal.addEventListener("click", (e) => { if (e.target === requestModal) closeRequestModal(); });

requestForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!requestDesc.value.trim()) {
    showToast(t("request_error"));
    return;
  }

  const ok = await sendToDiscord("request", {
    title: "💡 Model Request",
    description: `**Category:** ${requestCategory.value}`,
    fields: [
      { name: "Description", value: requestDesc.value.trim(), inline: false },
      { name: "Reference", value: requestRef.value.trim() || "—", inline: false },
      { name: "Contact", value: requestContact.value.trim() || "—", inline: true },
    ],
    footer: "Vaultframe request",
  });

  showToast(t("request_success"));
  closeRequestModal();

  if (!ok) {
    const subject = `Model request: ${requestCategory.value}`;
    const body =
      `Category: ${requestCategory.value}\n` +
      `Description: ${requestDesc.value.trim()}\n` +
      `Reference: ${requestRef.value.trim() || "—"}\n` +
      `Contact: ${requestContact.value.trim() || "—"}`;
    window.location.href =
      `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
});

/* =========================================================
   COMMENTS SYSTEM
   - No login required (name + comment + 1-5 star rating)
   - Simple math captcha (anti-bot)
   - Profanity filter (blocklist)
   - Stored in localStorage + pushed to Discord webhook
   ========================================================= */

// --- Profanity blocklist (English + Arabic + Russian common offenders) ---
const PROFANITY_LIST = [
  // English
  "fuck", "shit", "bitch", "asshole", "bastard", "dick", "piss", "cunt",
  "whore", "slut", "nigger", "nigga", "retard", "faggot", "douche",
  "motherfucker", "cock", "pussy", "wanker", "twat", "prick", "bollocks",
  // Arabic (transliterated + script)
  "khsara", "kos", "kuss", "omak", "abak", "khol", "sharmoota", "sharmuta",
  "kes emmak", "ibn", "kalb", "hmar", "gayid", "nagis", "khara", "khara2",
  // Russian (transliterated)
  "blyad", "blyat", "suka", "pizdec", "pizdets", "hui", "davalka", "ebal",
];

function containsProfanity(text) {
  const lower = text.toLowerCase();
  // Normalize: collapse repeated spaces and strip diacritics lightly
  const normalized = lower.replace(/\s+/g, " ").trim();
  for (const word of PROFANITY_LIST) {
    // word boundary match so "ass" won't flag "class"
    const re = new RegExp("(?:^|[^a-z\u0600-\u06ff\u0400-\u04ff])" +
      word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
      "(?:[^a-z\u0600-\u06ff\u0400-\u04ff]|$)", "i");
    if (re.test(normalized)) return true;
  }
  return false;
}

/* =========================================================
   COMMENTS STORAGE — single source of truth is data/comments.json.
   The file is fetched once on load (loadComments, below) and kept in
   state.commentsData. Comments are NEVER kept in localStorage anymore:
   submitting a comment POSTs it to the comments Worker, which commits
   the update to data/comments.json in the repo. The card counters and
   the comments modal both read straight from state.commentsData, so
   every visitor sees the same comments — not just their own browser.
   ========================================================= */
async function loadComments() {
  try {
    const res = await fetch("data/comments.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load comments.json");
    const json = await res.json();
    state.commentsData = {
      comments: (json && typeof json.comments === "object" && json.comments) || {},
      guestbook: (json && Array.isArray(json.guestbook)) ? json.guestbook : [],
    };
  } catch (err) {
    console.error(err);
    state.commentsData = { comments: {}, guestbook: [] };
  }
}

function getCommentsFor(productId) {
  const list = state.commentsData.comments[productId];
  return Array.isArray(list) ? list : [];
}

// --- Refresh the visible comment count badges on cards ---
function refreshCommentCounts() {
  const all = state.commentsData.comments;
  document.querySelectorAll("[data-cmt-for]").forEach(span => {
    const id = span.getAttribute("data-cmt-for");
    const list = Array.isArray(all[id]) ? all[id] : [];
    span.textContent = String(list.length);
  });
}

// --- Comments modal ---
const commentsModal = document.getElementById("comments-modal");
const commentsClose = document.getElementById("comments-close");
const commentsAssetName = document.getElementById("comments-asset-name");
const commentList = document.getElementById("comment-list");
const commentAvgWrap = document.getElementById("comment-avg-wrap");
const commentAvgStars = document.getElementById("comment-avg-stars");
const commentAvgText = document.getElementById("comment-avg-text");
const commentForm = document.getElementById("comment-form");
const commentNameInput = document.getElementById("comment-name");
const commentTextInput = document.getElementById("comment-text");
let activeCommentProduct = null;

function starsString(n) {
  let s = "";
  for (let i = 0; i < 5; i++) s += (i < n) ? "\u2605" : "\u2606";
  return s;
}

function renderComments(productId) {
  const list = getCommentsFor(productId);
  if (!list.length) {
    commentList.innerHTML = '<div class="comment-empty">' + escapeHtml(t("comment_empty")) + '</div>';
    commentAvgWrap.style.display = "none";
    return;
  }
  // average
  const avg = list.reduce((s, c) => s + (c.rating || 0), 0) / list.length;
  commentAvgStars.textContent = starsString(Math.round(avg));
  commentAvgText.textContent = t("comment_avg_text")(avg);
  commentAvgWrap.style.display = "inline-flex";

  commentList.innerHTML = list.slice().reverse().map(c => {
    const d = new Date(c.ts || Date.now());
    const dateStr = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    return '<div class="comment-item">' +
      '<div class="c-head">' +
        '<span class="c-name">' + escapeHtml(c.name || "Anonymous") + '</span>' +
        '<span class="c-date">' + escapeHtml(dateStr) + '</span>' +
      '</div>' +
      '<div class="c-stars">' + starsString(c.rating || 0) + '</div>' +
      '<div class="c-body" data-mt-auto="1" data-mt-src="' + escapeAttr(c.text || "") + '">' + escapeHtml(c.text || "") + '</div>' +
    '</div>';
  }).join("");
  translateDynamic(commentList); // best-effort: translate visitor comments into the current UI language
}

function openCommentsModal(product) {
  activeCommentProduct = product;
  setDynamicText(commentsAssetName, product.title || "");
  renderComments(product.id);
  commentForm.reset();
  if (window.grecaptcha && window.commentRecaptchaWidgetId !== null) {
    grecaptcha.reset(window.commentRecaptchaWidgetId);
  }
  commentsModal.classList.remove("hidden");
  commentsModal.classList.add("flex");
  document.body.style.overflow = "hidden";
}

function closeCommentsModal() {
  commentsModal.classList.add("hidden");
  commentsModal.classList.remove("flex");
  document.body.style.overflow = "";
  activeCommentProduct = null;
}

commentsClose.addEventListener("click", closeCommentsModal);
commentsModal.addEventListener("click", (e) => {
  if (e.target === commentsModal) closeCommentsModal();
});

commentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = commentNameInput.value.trim();
  const text = commentTextInput.value.trim();
  const ratingInput = commentForm.querySelector('input[name="rating"]:checked');
  const rating = ratingInput ? parseInt(ratingInput.value, 10) : 0;
  const recaptchaToken = window.grecaptcha && window.commentRecaptchaWidgetId !== null
    ? grecaptcha.getResponse(window.commentRecaptchaWidgetId)
    : "";

  if (!name) { showToast(t("comment_error_name")); return; }
  if (!text) { showToast(t("comment_error_text")); return; }
  if (!recaptchaToken) { showToast(t("comment_error_captcha")); return; }
  if (containsProfanity(name + " " + text)) { showToast(t("comment_error_profanity")); return; }

  const captchaOk = await verifyRecaptcha(recaptchaToken);
  if (!captchaOk) {
    showToast(t("comment_error_captcha"));
    if (window.grecaptcha && window.commentRecaptchaWidgetId !== null) {
      grecaptcha.reset(window.commentRecaptchaWidgetId);
    }
    return;
  }

  const comment = {
    name: name,
    text: text,
    rating: rating,
    ts: Date.now(),
  };

  const submitBtn = commentForm.querySelector('[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  // Save it to data/comments.json (via the comments Worker) — this is the
  // ONLY place the comment is stored. There's no localStorage fallback:
  // if this fails, the comment is not shown, because it wouldn't be visible
  // to anyone else anyway.
  const saved = await saveCommentRemote({
    type: "comment",
    productId: activeCommentProduct.id,
    comment,
  });

  if (submitBtn) submitBtn.disabled = false;

  if (!saved) {
    showToast(t("comment_error_save"));
    return;
  }

  renderComments(activeCommentProduct.id);
  refreshCommentCounts();
  commentForm.reset();
  if (window.grecaptcha && window.commentRecaptchaWidgetId !== null) {
    grecaptcha.reset(window.commentRecaptchaWidgetId);
  }
  showToast(t("comment_success"));

  // Best-effort Discord notification for the site owner (in addition to,
  // not instead of, the saved comment above).
  sendToDiscord("comment", {
    title: "\u{1F4AC} New Comment",
    description: "**Asset:** " + (activeCommentProduct.title || "Unknown"),
    fields: [
      { name: "Name", value: name, inline: true },
      { name: "Rating", value: rating + " / 5 " + starsString(rating), inline: true },
      { name: "Comment", value: text, inline: false },
    ],
    footer: "Vaultframe comments",
  }).then(() => {}).catch(() => {});
});

/* =========================================================
   SITE-WIDE COMMUNITY WALL (guestbook)
   - Same engine as the asset comments: math captcha,
     profanity filter, 1-5 star rating, Discord push.
   - Persisted the SAME way the per-asset comments are: via the
     comments-worker (saveCommentRemote), which commits straight
     into data/comments.json on GitHub so every visitor sees it —
     NOT localStorage. (Previously this section only saved to the
     current browser's localStorage and never called the Worker at
     all, which is why wall messages used to appear instantly for
     the poster but never reached GitHub for anyone else.)
   ========================================================= */
const gbForm = document.getElementById("guestbook-form");
const gbList = document.getElementById("guestbook-list");
const gbCount = document.getElementById("gb-count");
const gbAvgWrap = document.getElementById("gb-avg-wrap");
const gbAvgStars = document.getElementById("gb-avg-stars");
const gbAvgText = document.getElementById("gb-avg-text");
const gbNameInput = document.getElementById("gb-name");
const gbTextInput = document.getElementById("gb-text");

// --- storage: reads straight from the server-loaded state, same
//     source of truth as the per-asset comments ---
function getGuestbook() {
  return Array.isArray(state.commentsData.guestbook) ? state.commentsData.guestbook : [];
}

// --- render ---
function renderGuestbook() {
  const list = getGuestbook().slice().reverse();
  if (gbCount) {
    const n = list.length;
    gbCount.textContent = t("wall_count_label")(n);
  }
  if (!list.length) {
    if (gbList) gbList.innerHTML = '<div class="comment-empty">' + escapeHtml(t("wall_empty")) + '</div>';
    if (gbAvgWrap) gbAvgWrap.style.display = "none";
    return;
  }
  const rated = list.filter(c => c.rating > 0);
  if (rated.length && gbAvgWrap) {
    const avg = rated.reduce((s, c) => s + c.rating, 0) / rated.length;
    gbAvgStars.textContent = starsString(Math.round(avg));
    gbAvgText.textContent = t("comment_avg_text")(avg);
    gbAvgWrap.style.display = "inline-flex";
  } else if (gbAvgWrap) {
    gbAvgWrap.style.display = "none";
  }
  if (gbList) {
    gbList.innerHTML = list.map(c => {
      const d = new Date(c.ts || Date.now());
      const dateStr = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
      return '<div class="comment-item">' +
        '<div class="c-head">' +
          '<span class="c-name">' + escapeHtml(c.name || "Anonymous") + '</span>' +
          '<span class="c-date">' + escapeHtml(dateStr) + '</span>' +
        '</div>' +
        (c.rating ? '<div class="c-stars">' + starsString(c.rating) + '</div>' : '') +
        '<div class="c-body" data-mt-auto="1" data-mt-src="' + escapeAttr(c.text || "") + '">' + escapeHtml(c.text || "") + '</div>' +
      '</div>';
    }).join("");
    translateDynamic(gbList); // best-effort: translate wall messages into the current UI language
  }
}

// --- form ---
if (gbForm) {
  gbForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = gbNameInput.value.trim();
    const text = gbTextInput.value.trim();
    const ratingInput = gbForm.querySelector('input[name="gb-rating"]:checked');
    const rating = ratingInput ? parseInt(ratingInput.value, 10) : 0;
    const recaptchaToken = window.grecaptcha && window.wallRecaptchaWidgetId !== null
      ? grecaptcha.getResponse(window.wallRecaptchaWidgetId)
      : "";

    if (!name) { showToast(t("comment_error_name")); return; }
    if (!text) { showToast(t("comment_error_text")); return; }
    if (!recaptchaToken) { showToast(t("comment_error_captcha")); return; }
    if (containsProfanity(name + " " + text)) { showToast(t("comment_error_profanity")); return; }

    const captchaOk = await verifyRecaptcha(recaptchaToken);
    if (!captchaOk) {
      showToast(t("comment_error_captcha"));
      if (window.grecaptcha && window.wallRecaptchaWidgetId !== null) {
        grecaptcha.reset(window.wallRecaptchaWidgetId);
      }
      return;
    }

    const entry = { name, text, rating, ts: Date.now() };
    const submitBtn = gbForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const saved = await saveCommentRemote({ type: "guestbook", entry });

    if (submitBtn) submitBtn.disabled = false;
    if (window.grecaptcha && window.wallRecaptchaWidgetId !== null) {
      grecaptcha.reset(window.wallRecaptchaWidgetId);
    }

    if (!saved) {
      showToast(t("comment_error_save"));
      return;
    }

    renderGuestbook();
    gbForm.reset();
    showToast(t("wall_success"));

    // best-effort Discord push (same webhook as comments)
    sendToDiscord("comment", {
      title: "\u{1F4AC} Wall message",
      description: "**Where:** Community wall (site-wide)",
      fields: [
        { name: "Name", value: name, inline: true },
        { name: "Rating", value: rating > 0 ? rating + " / 5 " + starsString(rating) : "—", inline: true },
        { name: "Message", value: text, inline: false },
      ],
      footer: "Oelono community wall",
    }).then(() => {}).catch(() => {});
  });
}

function initGuestbook() {
  renderGuestbook();
}
initGuestbook();

// Escape closes whichever overlay is open
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!viewerModal.classList.contains("hidden")) closeViewerModal();
  if (!reportModal.classList.contains("hidden")) closeReportModal();
  if (!requestModal.classList.contains("hidden")) closeRequestModal();
  if (!commentsModal.classList.contains("hidden")) closeCommentsModal();
  closeAllInfoModals();
  if (leaveSiteModal && !leaveSiteModal.classList.contains("hidden")) closeLeaveSiteModal();
});

initLanguage();
loadProducts();
// Load the CMS-editable gate/key settings BEFORE the visitor can click a
// download button — this used to be defined but never invoked (bug), so the
// gate always ran on hard-coded defaults. Now settings.json is actually read.
loadSettings();
// Pull the shared data/comments.json from GitHub so every visitor sees
// the same comments/guestbook messages, not just whoever is currently
// submitting one. (This call used to be missing entirely — the function
// existed but nothing ever invoked it, so comment counts/badges and the
// guestbook only ever reflected the current browser's own session.)
loadComments().then(() => {
  refreshCommentCounts();
  renderGuestbook();
});
// ===== البلاغات والطلبات عبر Discord =====
// (تم نقل المنطق إلى sendToDiscord أعلاه — هذه دوال مساعدة للأزرار الديناميكية)

// دالة إرسال بلاغ عن رابط مكسور (تستخدم Discord webhook)
window.reportBrokenLink = async function(modelName, details = '') {
    const ok = await sendToDiscord("report", {
        title: "🚩 Broken Link Report",
        description: `**Model:** ${modelName || 'غير محدد'}`,
        fields: [{ name: "Details", value: details || 'تم الإبلاغ عن رابط مكسور', inline: false }],
        footer: "Vaultframe report",
    });
    alert(ok ? '✅ تم إرسال بلاغك بنجاح، شكراً لك!' : '⚠️ تعذّر الإرسال لـ Discord — تأكد من إعداد الـ webhook.');
};

// دالة طلب موديل جديد (تستخدم Discord webhook)
window.requestModel = async function(modelName, description = '') {
    if (!modelName || modelName.trim() === '') {
        alert('الرجاء إدخال اسم الموديل المطلوب');
        return;
    }
    const ok = await sendToDiscord("request", {
        title: "💡 Model Request",
        description: `**Model:** ${modelName.trim()}`,
        fields: [{ name: "Description", value: description.trim() || 'لا توجد وصف', inline: false }],
        footer: "Vaultframe request",
    });
    alert(ok ? '✅ تم إرسال طلبك بنجاح، سنعمل على توفيره قريباً!' : '⚠️ تعذّر الإرسال لـ Discord — تأكد من إعداد الـ webhook.');
};
