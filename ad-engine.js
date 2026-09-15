/* =========================================================
   ad-engine.js — Smart ad-tag resolver for the 4-step gate
   ---------------------------------------------------------
   Reads the tag strings the CMS owner typed into
   data/settings.json -> gate.ad_tags and decides, per tag,
   what it actually is:

     1. VAST tag WITH macros  ([IP], [USER_AGENT], [DEVICEIP]…)
        -> the visitor's real IP is fetched once from ipify,
           [USER_AGENT] is replaced with the encoded UA, and the
           finished URL is handed to Fluid Player / the VAST parser.

     2. VAST tag WITHOUT macros (plain XML endpoint)
        -> passed through to the player as-is.

     3. Direct media file (.mp4 / .webm / .m3u8)
        -> played straight in the <video> element.

     4. Direct link (popunder / smartlink / offer URL)
        -> RETURNED BYTE-FOR-BYTE UNCHANGED. No IP, no UA, no
           cachebuster, no extra query parameters at all, because
           any added parameter can invalidate the click and kill
           the payout. It is opened only on a real user gesture.

   Nothing here throws: every failure path returns a value the
   caller can act on, so a broken tag degrades to the in-page
   countdown instead of breaking the download flow.
   ========================================================= */

(function (global) {
  "use strict";

  /* ---------------------------------------------------------
     1. Config
     --------------------------------------------------------- */
  const IP_ENDPOINTS = [
    "https://api.ipify.org?format=json",      // primary  -> { ip: "1.2.3.4" }
    "https://api64.ipify.org?format=json",    // IPv6-capable mirror
    "https://ipapi.co/json/",                 // fallback -> { ip: "1.2.3.4", ... }
  ];
  const IP_TIMEOUT_MS = 4000;                 // don't let a dead lookup stall a step
  const IP_CACHE_KEY = "visitor_ip_v1";       // sessionStorage: one lookup per session
  const VAST_TIMEOUT_MS = 8000;
  const MAX_WRAPPER_HOPS = 3;

  // Any of these inside a tag marks it as a server-side ad request that
  // expects us to fill in the values. Matched in [BRACKET], {BRACE} and
  // %5BENCODED%5D form, case-insensitive.
  const MACRO_NAMES = [
    "IP", "DEVICEIP", "DEVICE_IP", "CLIENTIP", "CLIENT_IP", "IPADDRESS",
    "USER_AGENT", "USERAGENT", "UA", "DEVICE_UA", "DEVICEUA",
    "CACHEBUSTER", "CACHEBUST", "TIMESTAMP", "RAND", "RANDOM",
    "REFERRER", "REFERER", "PAGE_URL", "APP_BUNDLE", "DOMAIN",
    "WIDTH", "HEIGHT", "GDPR", "US_PRIVACY",
  ];
  const MACRO_RE = new RegExp(
    "(\\[|\\{|%5B)(" + MACRO_NAMES.join("|") + ")(\\]|\\}|%5D)",
    "gi"
  );

  const MEDIA_RE = /\.(mp4|webm|ogv|m4v|mov|m3u8)(\?|#|$)/i;

  /* ---------------------------------------------------------
     2. Visitor IP — fetched at most once per session
     --------------------------------------------------------- */
  let ipPromise = null;

  function readCachedIp() {
    try {
      const v = sessionStorage.getItem(IP_CACHE_KEY);
      return v && v !== "null" ? v : null;
    } catch (e) {
      return null; // private mode / storage blocked
    }
  }

  function writeCachedIp(ip) {
    try { sessionStorage.setItem(IP_CACHE_KEY, ip); } catch (e) { /* ignore */ }
  }

  async function fetchJsonWithTimeout(url, ms) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, ms);
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: ctrl ? ctrl.signal : undefined,
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Returns the visitor's public IP, or "" if it can't be determined.
   * Never rejects — an empty string is a valid value for most SSPs
   * (they fall back to the requesting IP server-side).
   */
  async function getVisitorIp() {
    const cached = readCachedIp();
    if (cached !== null) return cached;
    if (ipPromise) return ipPromise;

    ipPromise = (async () => {
      for (const endpoint of IP_ENDPOINTS) {
        try {
          const data = await fetchJsonWithTimeout(endpoint, IP_TIMEOUT_MS);
          const ip = data && typeof data.ip === "string" ? data.ip.trim() : "";
          if (ip) {
            writeCachedIp(ip);
            return ip;
          }
        } catch (err) {
          console.warn("[ads] IP lookup failed at", endpoint, "-", err && err.message);
        }
      }
      writeCachedIp(""); // remember the failure too; don't retry 3x per step
      return "";
    })();

    return ipPromise;
  }

  /* ---------------------------------------------------------
     3. Classification
     --------------------------------------------------------- */
  function hasMacros(url) {
    MACRO_RE.lastIndex = 0;              // global regex: reset before every test
    return MACRO_RE.test(String(url || ""));
  }

  /**
   * "vast"   -> XML ad request (with or without macros)
   * "media"  -> a plain video file we can drop into <video src>
   * "direct" -> a landing/offer/popunder link; must NOT be modified
   */
  function classifyAdTag(rawUrl) {
    const url = String(rawUrl || "").trim();
    if (!url) return "empty";
    if (MEDIA_RE.test(url)) return "media";
    if (hasMacros(url)) return "vast";            // macros only exist on ad requests
    if (/(vast|vpaid|pre-?roll|ad-?tag|\/ads?\/|adserve|zone=|pubid=)/i.test(url)) return "vast";
    return "direct";                              // anything else: leave it alone
  }

  /* ---------------------------------------------------------
     4. Macro substitution (VAST tags only)
     --------------------------------------------------------- */
  function macroValue(name, ctx) {
    switch (String(name).toUpperCase()) {
      case "IP":
      case "DEVICEIP":
      case "DEVICE_IP":
      case "CLIENTIP":
      case "CLIENT_IP":
      case "IPADDRESS":
        return ctx.ip || "";
      case "USER_AGENT":
      case "USERAGENT":
      case "UA":
      case "DEVICE_UA":
      case "DEVICEUA":
        return encodeURIComponent(ctx.ua || "");
      case "CACHEBUSTER":
      case "CACHEBUST":
      case "RAND":
      case "RANDOM":
        return String(Math.floor(Math.random() * 1e9));
      case "TIMESTAMP":
        return encodeURIComponent(new Date().toISOString());
      case "REFERRER":
      case "REFERER":
      case "PAGE_URL":
        return encodeURIComponent(ctx.pageUrl || "");
      case "DOMAIN":
      case "APP_BUNDLE":
        return encodeURIComponent(ctx.domain || "");
      case "WIDTH":
        return String(ctx.width || 640);
      case "HEIGHT":
        return String(ctx.height || 360);
      case "GDPR":
        return "0";
      case "US_PRIVACY":
        return "1---";
      default:
        return "";
    }
  }

  /**
   * Fills every known macro in a VAST tag. Unknown macros are emptied
   * rather than left as literal "[FOO]", which most ad servers reject.
   */
  async function expandMacros(rawUrl, opts = {}) {
    const url = String(rawUrl || "").trim();
    if (!url) return "";

    const ctx = {
      ip: "",
      ua: navigator.userAgent || "",
      pageUrl: (typeof location !== "undefined" && location.href) || "",
      domain: (typeof location !== "undefined" && location.hostname) || "",
      width: opts.width,
      height: opts.height,
    };

    // Only pay for the IP lookup if the tag actually asks for it.
    if (/(\[|\{|%5B)(IP|DEVICEIP|DEVICE_IP|CLIENTIP|CLIENT_IP|IPADDRESS)(\]|\}|%5D)/i.test(url)) {
      ctx.ip = await getVisitorIp();
    }

    MACRO_RE.lastIndex = 0;
    return url.replace(MACRO_RE, (match, open, name) => macroValue(name, ctx));
  }

  /* ---------------------------------------------------------
     5. VAST parsing (XML -> playable media file)
     --------------------------------------------------------- */
  function parseVast(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("invalid VAST XML");

    const mediaFiles = Array.from(doc.querySelectorAll("MediaFile"))
      .map(el => ({
        url: (el.textContent || "").trim(),
        type: el.getAttribute("type") || "",
        bitrate: Number(el.getAttribute("bitrate")) || 0,
      }))
      .filter(f => f.url);

    const wrapperEl = doc.querySelector("VASTAdTagURI, VAST Ad Wrapper VASTAdTagURI");
    const impressions = Array.from(doc.querySelectorAll("Impression"))
      .map(el => (el.textContent || "").trim())
      .filter(Boolean);
    const clickEl = doc.querySelector("ClickThrough");

    return {
      mediaFiles,
      wrapperUrl: wrapperEl ? (wrapperEl.textContent || "").trim() : null,
      impressions,
      clickUrl: clickEl ? (clickEl.textContent || "").trim() : null,
    };
  }

  function pickBestMediaFile(files) {
    const ranked = files.slice().sort((a, b) => b.bitrate - a.bitrate);
    return ranked.find(f => /mp4|webm/i.test(f.type || f.url)) || ranked[0] || null;
  }

  function firePixel(url) {
    if (!url) return;
    try { new Image().src = url; } catch (e) { /* fire and forget */ }
  }

  async function fetchVastMedia(tagUrl, signal) {
    let current = tagUrl;

    for (let hop = 0; hop <= MAX_WRAPPER_HOPS; hop++) {
      const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, VAST_TIMEOUT_MS);
      if (signal && ctrl) signal.addEventListener("abort", () => ctrl.abort(), { once: true });

      try {
        const res = await fetch(current, {
          cache: "no-store",
          signal: ctrl ? ctrl.signal : undefined,
        });
        if (!res.ok) throw new Error("VAST HTTP " + res.status);

        const parsed = parseVast(await res.text());
        parsed.impressions.forEach(firePixel);

        if (parsed.wrapperUrl) {
          current = await expandMacros(parsed.wrapperUrl);
          continue;                                   // follow the wrapper
        }

        const best = pickBestMediaFile(parsed.mediaFiles);
        if (!best) throw new Error("VAST response contained no playable MediaFile");
        return { url: best.url, clickUrl: parsed.clickUrl || null };
      } catch (err) {
        console.warn("[ads] VAST resolve failed:", err && err.message);
        return null;                                   // caller falls back
      } finally {
        clearTimeout(timer);
      }
    }
    return null;
  }

  /* ---------------------------------------------------------
     6. Public API — resolve one CMS tag
     --------------------------------------------------------- */
  /**
   * resolveAdTag(rawTag, opts) -> Promise<result>
   *
   * result.kind:
   *   "media"  -> { kind, url }            play in <video>
   *   "vast"   -> { kind, tagUrl, url }    tagUrl = macro-filled tag (give to
   *                                        Fluid Player); url = resolved MP4
   *                                        when we managed to parse it ourselves
   *   "direct" -> { kind, url }            EXACTLY the CMS string; open on click
   *   "none"   -> { kind, reason }         nothing playable; use the countdown
   *
   * Never rejects.
   */
  async function resolveAdTag(rawTag, opts = {}) {
    const raw = String(rawTag || "").trim();
    const kind = classifyAdTag(raw);

    if (kind === "empty" || raw === "YOUR_VAST_TAG_URL_HERE") {
      return { kind: "none", reason: "empty or placeholder tag" };
    }

    // --- Direct link: hands off. Not one character changes. ---
    if (kind === "direct") {
      return { kind: "direct", url: raw };
    }

    // --- Plain media file: still allow a cachebuster-free pass-through. ---
    if (kind === "media") {
      const url = hasMacros(raw) ? await expandMacros(raw, opts) : raw;
      return { kind: "media", url };
    }

    // --- VAST: fill macros (IP + UA), then try to resolve to an MP4. ---
    try {
      const tagUrl = await expandMacros(raw, opts);
      const resolved = await fetchVastMedia(tagUrl, opts.signal);
      return {
        kind: "vast",
        tagUrl,                                   // for Fluid Player's vastTag
        url: resolved ? resolved.url : null,      // for a bare <video> element
        clickUrl: resolved ? resolved.clickUrl : null,
      };
    } catch (err) {
      console.warn("[ads] tag resolution error:", err && err.message);
      return { kind: "none", reason: String(err && err.message) };
    }
  }

  /* ---------------------------------------------------------
     7. Playback helpers
     --------------------------------------------------------- */

  /**
   * Plays a resolved ad.
   *
   *   videoEl        <video> element used for media/VAST playback
   *   onDirect(url)  called for direct links so the caller can wire a
   *                  click handler (see attachDirectLink below)
   *   onFallback()   called when nothing is playable
   *
   * Returns the mode that actually started: "fluid" | "video" | "direct" | "fallback".
   */
  async function playAdTag(rawTag, options = {}) {
    const { videoEl, onDirect, onFallback, signal } = options;
    const result = await resolveAdTag(rawTag, { signal });

    if (result.kind === "direct") {
      if (typeof onDirect === "function") onDirect(result.url);
      return "direct";
    }

    if (result.kind === "media" && videoEl) {
      try {
        videoEl.src = result.url;
        videoEl.load();
        const p = videoEl.play();
        if (p && p.catch) p.catch(() => { /* autoplay blocked; caller shows a play chip */ });
        return "video";
      } catch (err) {
        console.warn("[ads] media playback failed:", err && err.message);
      }
    }

    if (result.kind === "vast") {
      // Preferred path: let Fluid Player handle the VAST session (it also
      // fires the tracking events the network expects).
      if (videoEl && typeof global.fluidPlayer === "function") {
        try {
          if (videoEl.__fluidInstance && videoEl.__fluidInstance.destroy) {
            videoEl.__fluidInstance.destroy();
          }
          videoEl.__fluidInstance = global.fluidPlayer(videoEl.id, {
            layoutControls: { autoPlay: true, mute: true, allowDownload: false },
            vastOptions: {
              adList: [{ roll: "preRoll", vastTag: result.tagUrl, adText: "" }],
              adCTAText: false,
              adClickable: true,
            },
          });
          return "fluid";
        } catch (err) {
          console.warn("[ads] Fluid Player init failed:", err && err.message);
        }
      }
      // Fallback path: we already parsed the MediaFile ourselves.
      if (videoEl && result.url) {
        try {
          videoEl.src = result.url;
          videoEl.load();
          const p = videoEl.play();
          if (p && p.catch) p.catch(() => {});
          return "video";
        } catch (err) {
          console.warn("[ads] VAST media playback failed:", err && err.message);
        }
      }
    }

    if (typeof onFallback === "function") onFallback(result);
    return "fallback";
  }

  /**
   * Wires a direct link to an element so it opens ONLY on a genuine click,
   * in a new tab, with the URL untouched. Returns a detach function.
   */
  function attachDirectLink(el, url, opts = {}) {
    if (!el || !url) return function () {};
    const once = opts.once !== false;

    const handler = (e) => {
      if (e) e.preventDefault();
      try {
        const w = global.open(url, "_blank", "noopener,noreferrer");
        if (!w) console.warn("[ads] direct link blocked by the popup blocker");
      } catch (err) {
        console.warn("[ads] direct link open failed:", err && err.message);
      }
      if (once) el.removeEventListener("click", handler);
    };

    el.addEventListener("click", handler);
    return function detach() { el.removeEventListener("click", handler); };
  }

  /* ---------------------------------------------------------
     8. Export
     --------------------------------------------------------- */
  global.AdEngine = {
    classifyAdTag,
    hasMacros,
    expandMacros,
    getVisitorIp,
    resolveAdTag,
    playAdTag,
    attachDirectLink,
  };
})(window);
