#!/usr/bin/env python3
from pathlib import Path

js_p = Path("dist/app.js")
js = js_p.read_text(encoding="utf-8")

# 1. State fields
if "studyData:" not in js:
    js = js.replace(
        "  searchScope: null,\n",
        "  searchScope: null,\n  studyBookId: null, studyChap: null, studyVerse: null, studyTab: \"xrefs\", studyMinVotes: 4, studyData: null, activeStrongId: null,\n",
        1,
    )

# 2. Add Links button in actionButtonsHtml + click guard
if "data-links=" not in js:
    js = js.replace(
        '<button class="copy-mini" data-share="${verseNum}" title="Share or Copy">Share</button>',
        '<button class="copy-mini" data-share="${verseNum}" title="Share or Copy">Share</button>\n      <button class="copy-mini" data-links="${verseNum}" title="Cross-Refs, Arcs & Original Words">Links</button>',
        1,
    )
    js = js.replace(
        "if (e.target.dataset.share || e.target.dataset.pin) return;",
        "if (e.target.dataset.share || e.target.dataset.pin || e.target.dataset.links) return;",
        1,
    )
    js = js.replace(
        '  reader.querySelectorAll("[data-pin]").forEach((btn) => {',
        '  reader.querySelectorAll("[data-links]").forEach((btn) => {\n    btn.addEventListener("click", (e) => { e.stopPropagation(); openStudyModal(Number(btn.dataset.links)); });\n  });\n  reader.querySelectorAll("[data-pin]").forEach((btn) => {',
        1,
    )

# 3. Sync toggle-color-strands inside applyThemeAndTypography
if "toggle-color-strands" not in js:
    js = js.replace(
        'document.getElementById("toggle-color-code").checked = !!state.prefs.color_code;',
        'document.getElementById("toggle-color-code").checked = !!state.prefs.color_code;\n  if (document.getElementById("toggle-color-strands")) document.getElementById("toggle-color-strands").checked = state.prefs.color_strands !== false;',
        1,
    )

# 4. Study Engine UI functions (Arcs SVG, Xrefs, Original Words, PNG Verse Card)
if "function openStudyModal(" not in js:
    study_fns = r'''
function genreColor(bookId, colorOn, fallbackHex = "#d4a853") {
  if (!colorOn) return fallbackHex;
  if (bookId <= 5) return "#d4a853";
  if (bookId <= 17) return "#68a8e8";
  if (bookId <= 22) return "#c792ea";
  if (bookId <= 39) return "#e09b6b";
  if (bookId <= 44) return "#5ec299";
  if (bookId <= 65) return "#8fa2f2";
  return "#e67c93";
}

function renderArcsSvg(fromBookId, xrefs, colorOn) {
  const W = 680, H = 132, baseY = 112, pad = 16;
  const xFor = (b) => pad + ((b - 1) / 65) * (W - pad * 2);
  const x1 = xFor(fromBookId);
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#d4a853";

  let paths = "";
  xrefs.forEach((x) => {
    const x2 = xFor(x.to_b);
    const mid = (x1 + x2) / 2;
    const dist = Math.abs(x2 - x1);
    const arch = Math.max(22, Math.min(100, dist * 0.32 + 16));
    const peakY = baseY - arch * 1.45;
    const col = genreColor(x.to_b, colorOn, accent);
    const op = Math.min(0.88, Math.max(0.28, 0.28 + (x.votes / 60) * 0.6));
    const sw = x.votes >= 20 ? 1.9 : 1.2;
    paths += `<path d="M ${x1.toFixed(1)} ${baseY} Q ${mid.toFixed(1)} ${peakY.toFixed(1)} ${x2.toFixed(1)} ${baseY}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-opacity="${op.toFixed(2)}" />`;
  });

  const otNtX = xFor(39.5).toFixed(1);
  return `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;">
      <line x1="${pad}" y1="${baseY}" x2="${W - pad}" y2="${baseY}" stroke="currentColor" stroke-opacity="0.18" stroke-width="1.5" />
      <line x1="${otNtX}" y1="${baseY - 6}" x2="${otNtX}" y2="${baseY + 6}" stroke="currentColor" stroke-opacity="0.35" stroke-width="1" />
      ${paths}
      <circle cx="${x1.toFixed(1)}" cy="${baseY}" r="4.5" fill="${accent}" />
    </svg>
    <div class="arc-legend">
      <span>Genesis (OT)</span>
      <span>${xrefs.length} cross-references shown</span>
      <span>OT | NT</span>
      <span>Revelation (NT)</span>
    </div>
  `;
}

async function openStudyModal(verseNum) {
  state.studyBookId = state.prefs.book_id;
  state.studyChap = state.prefs.chapter;
  state.studyVerse = verseNum;
  state.activeStrongId = null;
  const b = bookById(state.studyBookId);
  document.getElementById("study-title").textContent = `${b.name} ${state.studyChap}:${state.studyVerse}`;
  openModal("modal-study");
  await refreshStudyData();
}

async function refreshStudyData() {
  const payload = await invoke("get_verse_study", {
    bookId: state.studyBookId,
    chapter: state.studyChap,
    verse: state.studyVerse,
    translations: state.prefs.slots,
    minVotes: state.studyMinVotes,
  });
  state.studyData = payload;
  renderStudyModal();
}

function renderStudyModal() {
  const isXref = state.studyTab === "xrefs";
  document.getElementById("tab-study-xrefs").classList.toggle("active", isXref);
  document.getElementById("tab-study-words").classList.toggle("active", !isXref);
  document.getElementById("study-xrefs-pane").classList.toggle("hidden", !isXref);
  document.getElementById("study-words-pane").classList.toggle("hidden", isXref);

  const data = state.studyData;
  if (!data || !data.available) {
    document.getElementById("study-xref-list").innerHTML = `<div class="xref-item">study_vault.db not found beside bible_vault.db.</div>`;
    return;
  }

  document.getElementById("btn-xref-best").classList.toggle("active", state.studyMinVotes >= 4);
  document.getElementById("btn-xref-all").classList.toggle("active", state.studyMinVotes < 4);

  if (isXref) {
    const colorOn = state.prefs.color_strands !== false;
    document.getElementById("study-arc-wrap").innerHTML = renderArcsSvg(state.studyBookId, data.xrefs, colorOn);
    const list = document.getElementById("study-xref-list");
    if (!data.xrefs.length) {
      list.innerHTML = `<div class="xref-item">No cross-references at this vote filter. Try switching to <strong>All Links</strong>.</div>`;
      return;
    }
    list.innerHTML = data.xrefs.map((x, idx) => {
      const ref = x.to_ve > x.to_vs ? `${x.to_book_name} ${x.to_c}:${x.to_vs}–${x.to_ve}` : `${x.to_book_name} ${x.to_c}:${x.to_vs}`;
      const prevs = state.prefs.slots
        .map((c) => x.previews[c] ? `<div class="xref-prev"><b>${c}</b>${escapeHtml(cleanDisplayText(x.previews[c]))}</div>` : "")
        .join("");
      return `<div class="xref-item" data-xjump="${idx}"><div class="xref-head"><span class="xref-ref">${escapeHtml(ref)}</span><span class="xref-votes">${x.votes} votes</span></div>${prevs}</div>`;
    }).join("");

    list.querySelectorAll("[data-xjump]").forEach((el) => {
      el.onclick = () => {
        const x = data.xrefs[Number(el.dataset.xjump)];
        closeAllModals();
        loadChapter(x.to_b, x.to_c, x.to_vs, x.to_ve > x.to_vs ? x.to_ve : null);
      };
    });
  } else {
    const strip = document.getElementById("study-words-strip");
    const detail = document.getElementById("study-lex-detail");
    const hitsEl = document.getElementById("study-root-hits");
    if (!data.words.length) {
      strip.innerHTML = `<span style="color:var(--text-muted);font-size:13px;">No original word tags for this verse.</span>`;
      detail.innerHTML = "";
      hitsEl.innerHTML = "";
      return;
    }
    if (!state.activeStrongId) state.activeStrongId = data.words[0].strong_id;
    strip.innerHTML = data.words.map((w, i) => `
      <button class="word-chip ${w.strong_id === state.activeStrongId ? "active" : ""}" data-widx="${i}">
        <span class="word-orig">${escapeHtml(w.word_orig)}</span>
        <span class="word-trans">${escapeHtml(w.translit)}</span>
        <span class="word-gloss">${escapeHtml(w.gloss)}</span>
      </button>
    `).join("");

    const activeWord = data.words.find((w) => w.strong_id === state.activeStrongId) || data.words[0];
    detail.innerHTML = `<strong>${escapeHtml(activeWord.word_orig)}</strong> (<em>${escapeHtml(activeWord.translit)}</em> &middot; <code>${escapeHtml(activeWord.strong_id)}</code>)<br>${escapeHtml(activeWord.meaning)}`;

    strip.querySelectorAll("[data-widx]").forEach((btn) => {
      btn.onclick = () => {
        state.activeStrongId = data.words[Number(btn.dataset.widx)].strong_id;
        renderStudyModal();
        loadRootHits(state.activeStrongId);
      };
    });
    loadRootHits(activeWord.strong_id);
  }
}

async function loadRootHits(strongId) {
  const hitsEl = document.getElementById("study-root-hits");
  hitsEl.innerHTML = `<div class="xref-item">Finding verses sharing <code>${escapeHtml(strongId)}</code>...</div>`;
  const primary = state.prefs.slots[0];
  const hits = await invoke("get_strongs_occurrences", { strongId, translationCode: primary, limit: 35 });
  if (!hits.length) { hitsEl.innerHTML = ""; return; }
  hitsEl.innerHTML = `<div style="font-size:11.5px;color:var(--text-muted);padding:2px 2px 4px;">Other verses using <strong>${escapeHtml(strongId)}</strong> (${primary}):</div>` +
    hits.map((h) => `
      <div class="xref-item" data-rbook="${h.book_id}" data-rchap="${h.chapter}" data-rverse="${h.verse}">
        <div class="xref-head"><span class="xref-ref">${escapeHtml(h.book_name)} ${h.chapter}:${h.verse}</span></div>
        <div class="xref-prev">${escapeHtml(cleanDisplayText(h.text))}</div>
      </div>
    `).join("");
  hitsEl.querySelectorAll("[data-rbook]").forEach((el) => {
    el.onclick = () => {
      closeAllModals();
      loadChapter(Number(el.dataset.rbook), Number(el.dataset.rchap), Number(el.dataset.rverse));
    };
  });
}

async function saveVerseCardPng() {
  if (!state.studyData) return;
  const b = bookById(state.studyBookId);
  const ref = `${b.name} ${state.studyChap}:${state.studyVerse}`;
  const cs = getComputedStyle(document.documentElement);
  const bg = cs.getPropertyValue("--bg").trim() || "#111815";
  const textCol = cs.getPropertyValue("--text").trim() || "#ece7dd";
  const mutedCol = cs.getPropertyValue("--text-muted").trim() || "#9a9387";
  const accentCol = cs.getPropertyValue("--accent").trim() || "#d4a853";
  const colorOn = state.prefs.color_strands !== false;

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bg.startsWith("#") ? bg : "#141815";
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = accentCol;
  ctx.lineWidth = 4;
  ctx.strokeRect(42, 42, 996, 1266);

  ctx.fillStyle = accentCol;
  ctx.font = "bold 40px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(ref, 540, 128);

  // Draw 66-book arcs
  const baseY = 340, pad = 96;
  const xFor = (bk) => pad + ((bk - 1) / 65) * (1080 - pad * 2);
  const x1 = xFor(state.studyBookId);
  ctx.strokeStyle = mutedCol;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pad, baseY); ctx.lineTo(1080 - pad, baseY); ctx.stroke();

  state.studyData.xrefs.forEach((x) => {
    const x2 = xFor(x.to_b);
    const mid = (x1 + x2) / 2;
    const arch = Math.max(36, Math.min(175, Math.abs(x2 - x1) * 0.32 + 24));
    ctx.strokeStyle = genreColor(x.to_b, colorOn, accentCol);
    ctx.globalAlpha = Math.min(0.85, Math.max(0.28, 0.25 + (x.votes / 60) * 0.6));
    ctx.lineWidth = x.votes >= 20 ? 3 : 1.8;
    ctx.beginPath();
    ctx.moveTo(x1, baseY);
    ctx.quadraticCurveTo(mid, baseY - arch * 1.4, x2, baseY);
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.fillStyle = accentCol;
  ctx.beginPath(); ctx.arc(x1, baseY, 7, 0, Math.PI * 2); ctx.fill();

  // Render active 3 translations cleanly
  const row = state.rows.find((r) => r.verse === state.studyVerse);
  let y = 430;
  ctx.textAlign = "left";
  state.prefs.slots.forEach((code) => {
    const raw = row?.cells[code]?.text || "";
    if (!raw || y > 1180) return;
    ctx.fillStyle = accentCol;
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(code, 96, y);
    y += 38;
    ctx.fillStyle = textCol;
    ctx.font = "30px Georgia, serif";
    const words = cleanDisplayText(raw).split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > 888) {
        ctx.fillText(line, 96, y);
        y += 42;
        line = w;
      } else {
        line = test;
      }
    }
    if (line) { ctx.fillText(line, 96, y); y += 54; }
  });

  ctx.fillStyle = mutedCol;
  ctx.font = "20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Bible: Kairos Collection · ${state.studyData.xrefs.length} Cross-References · OpenBible.info`, 540, 1268);

  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
    const fname = `kairos-${b.name.replace(/\s+/g, "-")}-${state.studyChap}-${state.studyVerse}.png`;
    await invoke("export_binary_file", { filename: fname, bytes });
    showToast(`Saved ${fname} to Downloads`);
  }, "image/png");
}
'''
    js = js.replace("function renderPrayerModal()", study_fns + "\nfunction renderPrayerModal()", 1)

# 5. Wire #modal-study events + WASD scrolling inside #modal-study
if 'btn-save-verse-card' not in js:
    study_wiring = '''
  document.getElementById("tab-study-xrefs").onclick = () => { state.studyTab = "xrefs"; renderStudyModal(); };
  document.getElementById("tab-study-words").onclick = () => { state.studyTab = "words"; renderStudyModal(); };
  document.getElementById("btn-xref-best").onclick = () => { state.studyMinVotes = 4; refreshStudyData(); };
  document.getElementById("btn-xref-all").onclick = () => { state.studyMinVotes = 0; refreshStudyData(); };
  document.getElementById("toggle-color-strands").onchange = async (e) => {
    state.prefs.color_strands = e.target.checked;
    renderStudyModal();
    await persistPrefs();
  };
  document.getElementById("btn-save-verse-card").onclick = saveVerseCardPng;
'''
    js = js.replace('  document.getElementById("btn-prayer").onclick = () => {', study_wiring + '\n  document.getElementById("btn-prayer").onclick = () => {', 1)

    js = js.replace(
        'box = openMod.querySelector(".plan-days, .settings-scroll, .search-results, .notepad-list, .passage-right");',
        'if (openMod.id === "modal-study") { box = document.getElementById(state.studyTab === "xrefs" ? "study-xref-list" : "study-root-hits"); } else { box = openMod.querySelector(".plan-days, .settings-scroll, .search-results, .notepad-list, .passage-right"); }',
        1,
    )

js_p.write_text(js, encoding="utf-8")
print("v1.4 Part 2 (Study Engine UI + Arcs + PNG Card + Original Words) ready!")
