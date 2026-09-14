// The download gate, for EVERY library (Blender / Games / Roblox):
// A site-wide, admin-configurable list of "ad slots" (data/settings.json,
// edited from /admin -> "Ad Gate & Key System"). Out of the box there are
// two slots:
//   Slot 1 -> HilltopAds "Direct Link" style ad: opens in a new tab, the
//             visitor must keep it open for the configured wait time
//             (a Direct Link is a redirect URL, not a video file, so it
//             can't be played inline — see admin hint on the "type" field).
//   Slot 2 -> RichAds RTB pre-roll: the site requests a VAST tag from the
//             endpoint and plays the returned video inline. If the ad
//             network's response can't be fetched/parsed (e.g. CORS, or
//             an empty fill), it automatically falls back to the same
//             new-tab + wait behaviour as slot 1, so the gate never gets
//             stuck.
// A slot only counts as done once its full "seconds" duration has been
// watched/waited WITHOUT the visitor pausing the video or closing the tab.
// Doing either of those sends them back to redo the *previous* slot (the
// first slot just restarts itself, since there's nothing before it).
// After the last slot, the "Download final file" button is revealed.
const RING_CIRCUMFERENCE = 2 * Math.PI * 15.5; // matches r=15.5 in the SVG
let countdownTimer = null;
let videoTimer = null;
let activeProduct = null;
let activeGateSteps = [];       // resolved from window.SITE_SETTINGS.gate.steps for the modal currently open
// activeStage: 0..activeGateSteps.length. Index of the slot currently being
// attempted is activeStage (0-based) until it's marked done, at which point
// activeStage increments.
let activeStage = 0;
let sponsorWindow = null;       // the tab opened for a "link-dwell" slot being timed
let watchedEnoughForCurrentSlot = false; // true once the required seconds of the current video have actually played
let pauseGraceTimer = null;     // short grace period after "pause" fires, to absorb buffering blips

const closedEarlyHint = "That ad tab was closed too early — reopen it and keep it open for the full wait.";
const reopenLabel = "Reopen ad link";
const popupBlockedHint = "Your browser blocked that tab from opening — allow pop-ups for this site, then try again.";
const pausedEarlyHint = "The ad was paused/stopped before it finished — you've been sent back a step. Watch it fully this time.";

// Falls back to a single harmless "just wait" slot if the CMS settings are
// empty/broken, so the download flow always has at least one gate step.
function resolveGateSteps() {
  const configured = (window.SITE_SETTINGS && window.SITE_SETTINGS.gate && window.SITE_SETTINGS.gate.steps) || [];
  if (configured.length) return configured;
  return [{ id: "fallback", label: "Ad", provider: "custom", type: "link-dwell", url: "", seconds: 10 }];
}

function stageHintText(n, total) {
  return `${t("step_of_label")(n, total)} — ${t("ad_playing_label")}`;
}

const stepReadyLabel = (n) => `Step ${n} complete`;
const driveStepLabel = "Drive file download";

// Renders a row of step pills: one per gate slot, then a final "Download"
// pill. Purely visual — activeStage only ever advances by exactly one per
// verified slot (or moves back on an early pause/close), so there's no way
// to reach a later pill without every prior slot actually finishing.
function renderStepIndicator(totalSteps, currentStage) {
  if (!stepIndicator) return;
  if (totalSteps <= 0) {
    stepIndicator.innerHTML = "";
    return;
  }
  const pills = [];
  for (let i = 1; i <= totalSteps; i++) {
    const done = i <= currentStage;
    const icon = done ? "✓" : "🎬";
    const label = activeGateSteps[i - 1] ? (activeGateSteps[i - 1].label || t("step_video_label")) : `Step ${i}`;
    pills.push(`
      <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
        style="${done
          ? "background:rgba(0,240,255,0.12); border-color:rgba(0,240,255,0.4); color:var(--ink);"
          : "background:transparent; border-color:var(--line); color:var(--ink-dim);"}">
        ${icon}
        <span>${label}</span>
      </div>
    `);
  }
  const driveDone = currentStage >= totalSteps;
  pills.push(`
    <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors"
      style="${driveDone
        ? "background:rgba(157,78,221,0.12); border-color:rgba(157,78,221,0.4); color:#C79BFF;"
        : "background:transparent; border-color:var(--line); color:var(--ink-dim);"}">
      ${driveDone ? "✓" : "🔒"}
      <span>${driveStepLabel}</span>
    </div>
  `);
  stepIndicator.innerHTML = pills.join("");
}

const remainingStepsText = (n) => n === 1 ? "Almost done — 1 step left" : `${n} steps left`;
const allDoneText = "All steps complete!";

// Overall progress across every gate slot, including the in-progress
// fraction of whichever slot is currently playing/counting down.
function updateOverallProgress(totalSteps, currentStage, fraction) {
  if (!progressBar) return;
  const totalUnits = totalSteps + 1; // +1 for the final drive unlock
  const completedUnits = currentStage + (fraction || 0);
  const pct = totalUnits > 0 ? Math.min(100, Math.round((completedUnits / totalUnits) * 100)) : 0;

  progressBar.style.width = `${pct}%`;
  progressPercent.textContent = `${pct}%`;

  const remaining = totalSteps - currentStage;
  progressLabel.textContent = remaining > 0
    ? remainingStepsText(remaining)
    : allDoneText;
}

function openModal(product) {
  activeProduct = product;
  activeStage = 0;
  activeGateSteps = resolveGateSteps();

  modalBadge.textContent = product.blenderVersion || product.platform || "";
  setDynamicText(modalTitle, product.title);
  setDynamicText(modalDesc, product.description || "");
  modalFilesize.textContent = product.fileSize || "—";
  modalEngine.textContent = product.engine || product.platform || "—";
  modalLicense.textContent = product.license || "—";

  // reset state
  driveBtn.classList.add("hidden");
  driveBtn.classList.remove("flex");
  unlockBtn.classList.add("hidden");
  unlockBtn.disabled = true;
  unlockRingProgress.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
  unlockRingProgress.style.strokeDashoffset = "0";

  renderStepIndicator(activeGateSteps.length, 0);
  updateOverallProgress(activeGateSteps.length, 0, 0);

  setupTutorialPanel(product);

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.style.overflow = "hidden";

  runGateStage(0);
}

// Dispatches to the right handler for whichever slot index is now active.
function runGateStage(index) {
  activeStage = index;
  renderStepIndicator(activeGateSteps.length, activeStage);
  updateOverallProgress(activeGateSteps.length, activeStage, 0);

  if (index >= activeGateSteps.length) {
    revealDownload();
    return;
  }

  const slot = activeGateSteps[index];
  if (slot.type === "vast-video") {
    runVideoSlot(slot, index);
  } else {
    runLinkDwellSlot(slot, index);
  }
}

function revealDownload() {
  driveBtn.href = (activeProduct && (activeProduct.downloadUrl || activeProduct.driveLink)) || "#";
  unlockBtn.classList.add("hidden");
  adVideoStep.classList.add("hidden");
  driveBtn.classList.remove("hidden");
  driveBtn.classList.add("flex");
  modalHint.textContent = t("modal_hint_ready");
}

// Sends the visitor back to redo the PREVIOUS slot (or restarts slot 0 if
// there is no previous one) because the current slot's video was paused,
// stopped, or its tab was closed before the required time elapsed.
function revertStage(hintText) {
  clearInterval(countdownTimer);
  clearInterval(videoTimer);
  clearTimeout(pauseGraceTimer);
  try { adVideo.pause(); } catch (e) { /* no-op */ }
  sponsorWindow = null;
  const backTo = Math.max(0, activeStage - 1);
  unlockBtn.disabled = false;
  unlockLabel.textContent = reopenLabel;
  modalHint.textContent = hintText;
  runGateStage(backTo);
}

/* ---------- Video slot (in-page VAST-resolved video, or an .mp4/.webm URL directly) ---------- */
function runVideoSlot(slot, index) {
  adVideoStep.classList.remove("hidden");
  unlockBtn.classList.add("hidden");
  driveBtn.classList.add("hidden");
  modalHint.textContent = t("modal_hint_video");
  if (adVideoCaption) adVideoCaption.textContent = stageHintText(index + 1, activeGateSteps.length);

  watchedEnoughForCurrentSlot = false;
  clearTimeout(pauseGraceTimer);

  const requiredSeconds = Number(slot.seconds) || 30;
  adVideoCountdownEl.textContent = requiredSeconds;

  const showFallback = () => {
    adVideo.classList.add("hidden");
    adVideoFallback.classList.remove("hidden");
    adVideoFallback.style.display = "flex";
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* AdSense not loaded (adblock) */ }
  };
  adVideoFallback.classList.add("hidden");
  adVideoFallback.style.display = "none";
  adVideo.classList.remove("hidden");

  adVideo.onpause = null;
  adVideo.onended = null;
  adVideo.ontimeupdate = null;
  adVideo.onerror = null;

  // Falls back to a "new tab + timed wait" for this same slot if a real
  // video source can't be resolved/played (network ad blocked, CORS, no
  // fill, etc.) — the visitor never gets stuck on a broken player.
  const fallbackToLinkDwell = () => {
    runLinkDwellSlot(slot, index);
  };

  resolveVideoSource(slot).then((src) => {
    if (activeStage !== index) return; // the visitor already moved on/back
    if (!src) {
      if (slot.url) { fallbackToLinkDwell(); return; }
      showFallback();
      startVideoTimer(requiredSeconds, index);
      return;
    }
    adVideo.muted = false;
    adVideo.controls = false;
    adVideo.src = src;
    adVideo.load();
    adVideo.play().catch(() => { /* autoplay-with-sound can be blocked; visitor can tap play */ });

    adVideo.ontimeupdate = () => {
      if (adVideo.currentTime >= requiredSeconds) {
        watchedEnoughForCurrentSlot = true;
        adVideoCountdownEl.textContent = 0;
      } else {
        adVideoCountdownEl.textContent = Math.max(Math.ceil(requiredSeconds - adVideo.currentTime), 0);
      }
      if (watchedEnoughForCurrentSlot) {
        adVideo.ontimeupdate = null;
        completeSlot(index);
      }
    };
    // A real "turn the video off" — paused (and not because it simply
    // finished) before the required time was watched. A short grace period
    // absorbs normal buffering pauses; if it's still paused after that,
    // the visitor is sent back a step per the required behaviour.
    adVideo.onpause = () => {
      if (watchedEnoughForCurrentSlot || adVideo.ended) return;
      clearTimeout(pauseGraceTimer);
      pauseGraceTimer = setTimeout(() => {
        if (adVideo.paused && !watchedEnoughForCurrentSlot && !adVideo.ended) {
          revertStage(pausedEarlyHint);
        }
      }, 1200);
    };
    adVideo.onerror = fallbackToLinkDwell;
  }).catch(fallbackToLinkDwell);
}

// Plain countdown used only when no real video element is available at all
// (no ad source configured and AdSense fallback is shown instead).
function startVideoTimer(requiredSeconds, index) {
  let remaining = requiredSeconds;
  clearInterval(videoTimer);
  videoTimer = setInterval(() => {
    remaining -= 1;
    adVideoCountdownEl.textContent = Math.max(remaining, 0);
    updateOverallProgress(activeGateSteps.length, index, 1 - Math.max(remaining, 0) / requiredSeconds);
    if (remaining <= 0) {
      clearInterval(videoTimer);
      completeSlot(index);
    }
  }, 1000);
}

function completeSlot(index) {
  clearInterval(videoTimer);
  clearInterval(countdownTimer);
  clearTimeout(pauseGraceTimer);
  try { adVideo.pause(); } catch (e) { /* no-op */ }
  adVideoStep.classList.add("hidden");
  runGateStage(index + 1);
}

// Attempts to resolve a real playable video URL for a "vast-video" slot:
//  - if the configured URL already looks like a direct media file
//    (.mp4/.webm/.m3u8), it's used as-is;
//  - otherwise it's treated as a VAST ad-request endpoint and fetched, with
//    the visitor's user agent appended (IP is taken server-side from the
//    request itself — never sent from the page). The first <MediaFile> in
//    the response is used as the video source.
// Resolves to "" (not rejects) on anything it can't handle, so the caller
// can fall back to the link-dwell behaviour instead of a broken player.
async function resolveVideoSource(slot) {
  const url = slot.url || "";
  if (!url) return "";
  if (/\.(mp4|webm|m3u8)(\?|$)/i.test(url)) return url;

  try {
    const sep = url.includes("?") ? "&" : "?";
    const requestUrl = `${url}${sep}ua=${encodeURIComponent(navigator.userAgent)}`;
    const res = await fetch(requestUrl, { mode: "cors" });
    if (!res.ok) return "";
    const text = await res.text();
    const xml = new DOMParser().parseFromString(text, "text/xml");
    const mediaFile = xml.querySelector("MediaFile");
    return mediaFile ? mediaFile.textContent.trim() : "";
  } catch (err) {
    return ""; // network/CORS failure — caller falls back to link-dwell
  }
}

/* ---------- Link-dwell slot (new tab + timed wait, e.g. a Direct Link ad) ---------- */
function runLinkDwellSlot(slot, index) {
  adVideoStep.classList.add("hidden");
  unlockBtn.classList.remove("hidden");
  unlockBtn.disabled = false;
  unlockRingProgress.style.strokeDashoffset = "0";
  unlockLabel.textContent = t("unlock_ready");
  modalHint.textContent = stageHintText(index + 1, activeGateSteps.length);
}

// windowRef is the tab opened for the slot being timed (or null if this
// slot has no link at all). The interval checks windowRef.closed on every
// tick — closing that tab before the wait finishes reverts the stage.
function startCountdown(windowRef, requiredSeconds, index) {
  sponsorWindow = windowRef || null;
  let remaining = requiredSeconds;
  unlockLabel.textContent = t("unlock_unlocking")(remaining);

  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    if (sponsorWindow && sponsorWindow.closed) {
      clearInterval(countdownTimer);
      revertStage(closedEarlyHint);
      return;
    }

    remaining -= 1;
    const progress = 1 - remaining / requiredSeconds;
    unlockRingProgress.style.strokeDashoffset = `${RING_CIRCUMFERENCE * progress}`;
    updateOverallProgress(activeGateSteps.length, index, progress);

    if (remaining <= 0) {
      clearInterval(countdownTimer);
      sponsorWindow = null;
      completeSlot(index);
    } else {
      unlockLabel.textContent = t("unlock_unlocking")(remaining);
    }
  }, 1000);
}

unlockBtn.addEventListener("click", () => {
  if (unlockBtn.disabled || !activeProduct) return;
  const index = activeStage;
  const slot = activeGateSteps[index];
  if (!slot) return;
  const requiredSeconds = Number(slot.seconds) || 30;

  let openedWindow = null;
  if (slot.url) {
    openedWindow = window.open(slot.url, "_blank");
    if (!openedWindow) {
      unlockLabel.textContent = t("unlock_ready");
      modalHint.textContent = popupBlockedHint;
      unlockBtn.disabled = false;
      return; // slot not credited — nothing to time, nothing advances
    }
  }

  unlockBtn.disabled = true;
  startCountdown(openedWindow, requiredSeconds, index);
});
