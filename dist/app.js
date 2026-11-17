const invoke = window.__TAURI__.core.invoke;

const LENS_MAP = {
  BSB: "Balanced",
  KJV: "Word-for-Word",
  NKJV: "Word-for-Word",
  WEB: "Word-for-Word",
  ASV: "Word-for-Word",
  NASB: "Word-for-Word",
  ESV: "Word-for-Word",
  YLT: "Word-for-Word",
  DARBY: "Word-for-Word",
  FBV: "Thought-for-Thought",
  OEB: "Thought-for-Thought",
  NLT: "Thought-for-Thought",
  NIV: "Thought-for-Thought",
  NIV84: "Thought-for-Thought",
  CSB: "Balanced",
  BBE: "Thought-for-Thought",
};

const FONT_FAMILIES = {
  editorial: '"Noto Serif", "Liberation Serif", Georgia, serif',
  olde: '"YeOldeBlackletter", "UnifrakturMaguntia", "Old English Text MT", Georgia, serif',
  chancery: '"Z01", "URW Chancery L", "Apple Chancery", cursive, serif',
  sans: '"Inter", "Ubuntu", "Noto Sans", system-ui, -apple-system, sans-serif',
  mono: '"Ubuntu Mono", "Liberation Mono", "DejaVu Sans Mono", monospace',
};

const LINE_HEIGHTS = {
  snug: "1.52",
  balanced: "1.68",
  relaxed: "1.88",
};

const GOD_TERMS = [
  "King of kings", "Lord of lords", "Holy Spirit", "Spirit of God", "Lamb of God",
  "Son of God", "Son of Man", "LORD", "Yahweh", "Jehovah", "God", "Lord",
  "Almighty", "Jesus", "Christ", "Messiah", "Immanuel", "Emmanuel",
  "Creator", "Savior", "Saviour", "Father"
];
const PERSON_TERMS = [
  "Nebuchadnezzar", "Nicodemus", "Abraham", "Rebekah", "Rebecca", "Solomon",
  "Jonathan", "Jeremiah", "Mordecai", "Nehemiah", "Barnabas", "Hezekiah",
  "Absalom", "Goliath", "Pharaoh", "Lazarus", "Timothy", "Matthew", "Stephen",
  "Deborah", "Samson", "Gideon", "Samuel", "Ezekiel", "Isaiah", "Elijah",
  "Elisha", "Daniel", "Joshua", "Joseph", "Miriam", "Hannah", "Nathan",
  "Josiah", "Pilate", "Martha", "Andrew", "Philip", "Thomas", "Judas",
  "Herod", "Cyrus", "Rahab", "Abram", "Sarai", "Sarah", "Isaac", "Jacob",
  "Israel", "Moses", "Aaron", "Caleb", "David", "Hosea", "Jonah", "Micah",
  "Esther", "Peter", "Simon", "James", "Silas", "Titus", "Adam", "Abel",
  "Cain", "Noah", "Esau", "Ruth", "Boaz", "Saul", "Joel", "Amos", "Ezra",
  "Mary", "John", "Paul", "Luke", "Mark", "Eve", "Lot", "Job", "Eli"
];
const PLACE_TERMS = [
  "Mount of Olives", "Thessalonica", "Gethsemane", "Mount Sinai", "Mount Zion",
  "Capernaum", "Macedonia", "Jerusalem", "Bethlehem", "Euphrates", "Philistia",
  "Damascus", "Nazareth", "Golgotha", "Gomorrah", "Babylon", "Assyria",
  "Nineveh", "Samaria", "Jericho", "Antioch", "Corinth", "Ephesus",
  "Philippi", "Calvary", "Dead Sea", "Red Sea", "Galilee", "Lebanon",
  "Tiberias", "Tarshish", "Bethany", "Emmaus", "Canaan", "Egypt",
  "Jordan", "Hebron", "Bethel", "Patmos", "Athens", "Persia", "Cyprus",
  "Shiloh", "Gilead", "Judah", "Judea", "Sinai", "Sodom", "Syria",
  "Crete", "Sheba", "Eden", "Zion", "Rome", "Asia", "Nile", "Moab",
  "Edom", "Tyre", "Sidon", "Cana", "Ur"
];

const CC_CLASS = {};
GOD_TERMS.forEach((w) => { CC_CLASS[w] = "cc-god"; });
PERSON_TERMS.forEach((w) => { CC_CLASS[w] = "cc-person"; });
PLACE_TERMS.forEach((w) => { CC_CLASS[w] = "cc-place"; });

const ALL_CC_TERMS = [...GOD_TERMS, ...PERSON_TERMS, ...PLACE_TERMS]
  .sort((a, b) => b.length - a.length)
  .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const CC_REGEX = new RegExp(`\\b(${ALL_CC_TERMS.join("|")})\\b`, "g");

const PLANS = {
  gospels_psalms: {
    name: "Gospels & Psalms (14-Day Core)",
    days: [
      { day: 1, label: "John 1–3", bookId: 43, chapter: 1 },
      { day: 2, label: "John 4–6", bookId: 43, chapter: 4 },
      { day: 3, label: "John 7–9", bookId: 43, chapter: 7 },
      { day: 4, label: "John 10–12", bookId: 43, chapter: 10 },
      { day: 5, label: "John 13–15", bookId: 43, chapter: 13 },
      { day: 6, label: "John 16–18", bookId: 43, chapter: 16 },
      { day: 7, label: "John 19–21", bookId: 43, chapter: 19 },
      { day: 8, label: "Psalm 1–8", bookId: 19, chapter: 1 },
      { day: 9, label: "Psalm 19–24", bookId: 19, chapter: 19 },
      { day: 10, label: "Matthew 5–7", bookId: 40, chapter: 5 },
      { day: 11, label: "Matthew 13 & 18", bookId: 40, chapter: 18 },
      { day: 12, label: "Romans 5–8", bookId: 45, chapter: 8 },
      { day: 13, label: "Ephesians 1–6", bookId: 49, chapter: 1 },
      { day: 14, label: "Psalm 90–91 & 103", bookId: 19, chapter: 91 },
    ],
  },
  nt_foundations: {
    name: "Epistles & Acts (10-Day)",
    days: [
      { day: 1, label: "Acts 1–2 (Pentecost)", bookId: 44, chapter: 2 },
      { day: 2, label: "Romans 1–4", bookId: 45, chapter: 1 },
      { day: 3, label: "Romans 8 & 12", bookId: 45, chapter: 8 },
      { day: 4, label: "1 Corinthians 13 & 15", bookId: 46, chapter: 13 },
      { day: 5, label: "Galatians 5", bookId: 48, chapter: 5 },
      { day: 6, label: "Philippians 2 & 4", bookId: 50, chapter: 2 },
      { day: 7, label: "Colossians 1 & 3", bookId: 51, chapter: 1 },
      { day: 8, label: "Hebrews 11–12", bookId: 58, chapter: 11 },
      { day: 9, label: "James 1–3", bookId: 59, chapter: 1 },
      { day: 10, label: "Revelation 21–22", bookId: 66, chapter: 21 },
    ],
  },
  ot_pillars: {
    name: "Old Testament Pillars (9-Day)",
    days: [
      { day: 1, label: "Genesis 1–3", bookId: 1, chapter: 1 },
      { day: 2, label: "Genesis 12 & 15", bookId: 1, chapter: 12 },
      { day: 3, label: "Exodus 14 & 20", bookId: 2, chapter: 14 },
      { day: 4, label: "Joshua 1 & 24", bookId: 6, chapter: 1 },
      { day: 5, label: "1 Samuel 16–17", bookId: 9, chapter: 17 },
      { day: 6, label: "Psalm 23 & 27", bookId: 19, chapter: 23 },
      { day: 7, label: "Proverbs 3–4", bookId: 20, chapter: 3 },
      { day: 8, label: "Isaiah 40 & 53", bookId: 23, chapter: 53 },
      { day: 9, label: "Daniel 3 & 6", bookId: 27, chapter: 6 },
    ],
  },
};


function editDist(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

function bookMatchScore(book, rawQ) {
  const q = rawQ.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!q) return 0;
  const bn = book.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const code = book.usfm_code.toLowerCase();
  if (bn === q || code === q) return 100;
  if (bn.startsWith(q)) return 90;
  if (bn.includes(q)) return 75;
  const prefix = bn.slice(0, Math.max(q.length, 3));
  const d = editDist(q, prefix);
  if (d <= 2) return 60 - d * 10;
  const dFull = editDist(q, bn);
  if (dFull <= 2) return 55 - dFull * 10;
  return 0;
}

const CHRONO_ORDER = [
  1, 18, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 19, 20, 21, 22, 11, 14, 29, 30, 31, 32, 33, 28, 23, 34, 36, 35, 24, 25, 12, 26, 27, 15, 16, 17, 37, 38, 39,
  40, 41, 42, 43, 44, 59, 48, 52, 53, 46, 47, 45, 51, 57, 49, 50, 54, 56, 60, 58, 55, 61, 65, 62, 63, 64, 66
];

function sliceBookOrder(bookIds, totalDays) {
  const chaps = [];
  bookIds.forEach((id) => {
    const b = state.books.find((x) => x.id === id);
    if (!b) return;
    for (let c = 1; c <= b.chapters; c++) chaps.push({ bookId: b.id, name: b.name, ch: c });
  });
  if (!chaps.length) return [];
  const days = [];
  for (let d = 0; d < totalDays; d++) {
    const start = Math.floor((d * chaps.length) / totalDays);
    const end = Math.floor(((d + 1) * chaps.length) / totalDays) - 1;
    const first = chaps[start];
    const last = chaps[Math.max(start, end)];
    const label = first.bookId === last.bookId
      ? (first.ch === last.ch ? `${first.name} ${first.ch}` : `${first.name} ${first.ch}–${last.ch}`)
      : `${first.name} ${first.ch} – ${last.name} ${last.ch}`;
    days.push({ day: d + 1, label, bookId: first.bookId, chapter: first.ch });
  }
  return days;
}

function getPlans() {
  const allIds = state.books.map((b) => b.id);
  const ntIds = state.books.filter((b) => b.testament === "NT").map((b) => b.id);
  return {
    ...PLANS,
    nt_90: { name: "New Testament Complete (90-Day)", days: sliceBookOrder(ntIds, 90) },
    bible_365: { name: "Whole Bible in a Year (365-Day)", days: sliceBookOrder(allIds, 365) },
    chrono_365: { name: "Chronological Bible (365-Day)", days: sliceBookOrder(CHRONO_ORDER, 365) },
  };
}

let state = {
  translations: [],
  books: [],
  prefs: null,
  rows: [],
  dailyVerse: null,
  lastReadDate: null,
  selectedVerse: null,
  pickerTestament: "NT",
  pickerBookId: 43,
  pickerChapter: null,
  pickerFilter: "",
  fontTarget: "all",
  pinFilter: "All",
  customFolders: ["General", "Prayer", "Worship", "Comfort"],
};

let readTimer = null;

function lensFor(code) {
  return LENS_MAP[code.toUpperCase()] || "Translation";
}

function localDateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayOfYearIndex() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}

function bookById(id) {
  return state.books.find((b) => b.id === id) || state.books[0];
}

function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add("hidden"), 1800);
}

function isPinned(bookId, chapter, verse) {
  return (state.prefs.pins || []).some(
    (p) => p.book_id === bookId && p.chapter === chapter && p.verse === verse
  );
}

async function togglePin(verseNum) {
  const book = bookById(state.prefs.book_id);
  const idx = (state.prefs.pins || []).findIndex(
    (p) => p.book_id === book.id && p.chapter === state.prefs.chapter && p.verse === verseNum
  );
  if (idx >= 0) {
    state.prefs.pins.splice(idx, 1);
    showToast(`Unpinned ${book.name} ${state.prefs.chapter}:${verseNum}`);
  } else {
    const row = state.rows.find((r) => r.verse === verseNum);
    const primary = state.prefs.slots[0];
    const raw = row?.cells[primary]?.text || "";
    const snippet = cleanDisplayText(raw).slice(0, 110);
    const folder = state.pinFilter !== "All" ? state.pinFilter : "General";
    state.prefs.pins.unshift({
      book_id: book.id,
      book_name: book.name,
      chapter: state.prefs.chapter,
      verse: verseNum,
      snippet,
      folder,
    });
    showToast(`Pinned ${book.name} ${state.prefs.chapter}:${verseNum}`);
  }
  await persistPrefs();
  renderReader();
}

async function markReadToday() {
  const today = localDateKey();
  if (state.lastReadDate === today) return;
  state.lastReadDate = today;
  await invoke("mark_read_today", { dateStr: today });
  document.getElementById("read-badge").classList.remove("hidden");
}

function scheduleReadCheck() {
  clearTimeout(readTimer);
  readTimer = setTimeout(() => {
    markReadToday();
  }, 18000);
}

async function persistPrefs() {
  await invoke("save_prefs", { prefs: state.prefs });
}

function applyThemeAndTypography() {
  const fs = state.prefs.font_style || "editorial";
  const lh = state.prefs.line_height || "balanced";
  const sc = state.prefs.scroll_style || "ribbon";

  document.documentElement.setAttribute("data-theme", state.prefs.theme);
  document.documentElement.style.setProperty("--reader-size", `${state.prefs.font_size}px`);
  const sf = state.prefs.slot_fonts || {};
  document.documentElement.style.setProperty("--font-reader", FONT_FAMILIES[fs] || FONT_FAMILIES.editorial);
  [0, 1, 2].forEach((i) => {
    const chosen = sf[String(i)] || fs;
    document.documentElement.style.setProperty(`--slot-font-${i}`, FONT_FAMILIES[chosen] || FONT_FAMILIES.editorial);
  });
  const activeFontForTarget = state.fontTarget === "all" ? fs : (sf[state.fontTarget] || fs);
  document.querySelectorAll("[data-font-target]").forEach((b) => {
    b.classList.toggle("active", b.dataset.fontTarget === state.fontTarget);
  });
  document.documentElement.style.setProperty("--reader-lh", LINE_HEIGHTS[lh] || LINE_HEIGHTS.balanced);

  document.getElementById("font-slider").value = state.prefs.font_size;
  document.getElementById("font-size-val").textContent = `${state.prefs.font_size}px`;
  document.getElementById("toggle-pilcrow").checked = state.prefs.clean_pilcrow;
  document.getElementById("toggle-color-code").checked = !!state.prefs.color_code;
  document.getElementById("cc-legend").classList.toggle("hidden", !state.prefs.color_code);

  const pinCount = (state.prefs.pins || []).length;
  document.getElementById("btn-pins").textContent = pinCount > 0 ? `Pins (${pinCount})` : "Pins";

  document.querySelectorAll("[data-theme-pick]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.themePick === state.prefs.theme);
  });
  document.querySelectorAll("[data-font-pick]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.fontPick === activeFontForTarget);
  });
  document.querySelectorAll("[data-rhythm-pick]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.rhythmPick === lh);
  });
  document.querySelectorAll("[data-mode-pick]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.modePick === state.prefs.view_mode);
  });
  document.querySelectorAll("[data-scroll-pick]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.scrollPick === sc);
  });
}

function nextPlanDay() {
  const allPlans = getPlans();
  const planKey = state.prefs.active_plan in allPlans ? state.prefs.active_plan : "gospels_psalms";
  const plan = allPlans[planKey];
  const done = new Set(state.prefs.completed_days[planKey] || []);
  return plan.days.find((d) => !done.has(d.day)) || plan.days[0];
}

function cleanDisplayText(raw) {
  let txt = raw || "";
  if (state.prefs.clean_pilcrow) {
    txt = txt.replace(/^¶\s*/g, "").replace(/\s*¶\s*/g, " ");
  }
  return txt;
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function formatScriptureHtml(raw) {
  let safe = escapeHtml(cleanDisplayText(raw));
  if (state.prefs.color_code) {
    safe = safe.replace(CC_REGEX, (m) => {
      const cls = CC_CLASS[m];
      return cls ? `<span class="${cls}">${m}</span>` : m;
    });
  }
  return safe.replace(/\n/g, "<br>");
}

async function loadDailyCard(forceShow = false) {
  const dv = await invoke("get_daily_verse", {
    dayIndex: dayOfYearIndex(),
    translations: state.prefs.slots,
  });
  state.dailyVerse = dv;
  document.getElementById("daily-ref").textContent = `${dv.book_name} ${dv.chapter}:${dv.verse}`;

  const nextDay = nextPlanDay();
  document.getElementById("btn-daily-plan-go").textContent = `Plan: ${nextDay.label}`;

  const trioEl = document.getElementById("daily-trio");
  trioEl.innerHTML = state.prefs.slots
    .map((code) => {
      const txt = dv.cells[code] ? formatScriptureHtml(dv.cells[code]) : "—";
      return `
        <div class="daily-col">
          <div class="daily-col-code">${code} &middot; ${lensFor(code)}</div>
          <div class="daily-col-text">${txt}</div>
        </div>
      `;
    })
    .join("");

  if (state.lastReadDate === localDateKey()) {
    document.getElementById("read-badge").classList.remove("hidden");
  }
  if (forceShow) {
    document.getElementById("daily-card-wrap").classList.remove("hidden");
  }
}

function renderSlotPills() {
  const wrap = document.getElementById("slot-pills");
  wrap.innerHTML = "";
  state.prefs.slots.forEach((code, idx) => {
    const btn = document.createElement("button");
    btn.className = "version-pill";
    btn.title = `${code} (${lensFor(code)}) — click to swap`;
    btn.innerHTML = `<span class="slot-idx">${idx + 1}</span> ${code} <span class="chev">&#9662;</span>`;
    btn.onclick = (e) => openSlotMenu(idx, e.currentTarget);
    wrap.appendChild(btn);
  });

  const colHead = document.getElementById("col-headers");
  if (state.prefs.view_mode === "cols") {
    colHead.classList.remove("hidden");
    colHead.innerHTML = state.prefs.slots
      .map((code) => `
        <div class="col-header-cell">
          <span class="col-code">${code}</span>
          <span class="col-lens">&middot; ${lensFor(code)}</span>
        </div>
      `)
      .join("");
  } else {
    colHead.classList.add("hidden");
  }
}

function attachHorizontalWheel(el) {
  if (!el) return;
  el.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY * 1.15;
    }
  }, { passive: false });
}

function actionButtonsHtml(verseNum) {
  const pinned = isPinned(state.prefs.book_id, state.prefs.chapter, verseNum);
  return `
    <div class="row-actions">
      <button class="copy-mini ${pinned ? "pinned" : ""}" data-pin="${verseNum}">${pinned ? "Pinned" : "Pin"}</button>
      <button class="copy-mini" data-copy="${verseNum}">Copy</button>
    </div>
  `;
}

function renderReader() {
  const prevStage = document.getElementById("ew-stage");
  const prevLeft = prevStage ? prevStage.scrollLeft : 0;

  const book = bookById(state.prefs.book_id);
  document.getElementById("passage-label").textContent = `${book.name} ${state.prefs.chapter}`;
  document.getElementById("bottom-meta").textContent = `${book.name} Chapter ${state.prefs.chapter} of ${book.chapters}`;

  const pinCount = (state.prefs.pins || []).length;
  document.getElementById("btn-pins").textContent = pinCount > 0 ? `Pins (${pinCount})` : "Pins";

  const reader = document.getElementById("reader");
  const isEW = state.prefs.view_mode === "bubbles" || state.prefs.view_mode === "scroll";
  reader.classList.toggle("ew-active", isEW);

  const banner = `
    <div class="chapter-banner">
      <h1>${escapeHtml(book.name)} ${state.prefs.chapter}</h1>
      <div class="sub">${state.prefs.slots.join("  ·  ")}</div>
    </div>
  `;

  if (state.prefs.view_mode === "cols") {
    const rowsHtml = state.rows
      .map((row) => {
        const selectedClass = state.selectedVerse === row.verse ? "selected" : "";
        const cellsHtml = state.prefs.slots
          .map((code, slotIdx) => {
            const cell = row.cells[code];
            if (!cell) return `<div class="verse-cell"></div>`;
            const head = cell.heading ? `<div class="verse-heading">${escapeHtml(cell.heading)}</div>` : "";
            const pClass = cell.poetry_level >= 2 ? "poetry-2" : cell.poetry_level === 1 ? "poetry-1" : "";
            const gapClass = cell.para_start ? "para-gap" : "";
            const body = formatScriptureHtml(cell.formatted_text || cell.text);
            return `<div class="verse-cell ${pClass} ${gapClass}" data-slot="${slotIdx}">${head}<span class="verse-num">${row.verse}</span>${body}</div>`;
          })
          .join("");
        return `<div class="verse-row ${selectedClass}" data-verse="${row.verse}">${cellsHtml}${actionButtonsHtml(row.verse)}</div>`;
      })
      .join("");
    reader.innerHTML = banner + rowsHtml;
  } else if (state.prefs.view_mode === "stack") {
    const cardsHtml = state.rows
      .map((row) => {
        const selectedClass = state.selectedVerse === row.verse ? "selected" : "";
        const linesHtml = state.prefs.slots
          .map((code, slotIdx) => {
            const cell = row.cells[code];
            const txt = cell ? formatScriptureHtml(cell.formatted_text || cell.text) : "—";
            return `
              <div class="stack-line" data-slot="${slotIdx}">
                <div class="stack-badge">${code}<span class="stack-lens">${lensFor(code)}</span></div>
                <div class="stack-text">${txt}</div>
              </div>
            `;
          })
          .join("");
        return `<div class="stack-card ${selectedClass}" data-verse="${row.verse}"><div class="stack-verse-tag">VERSE ${row.verse}</div>${linesHtml}${actionButtonsHtml(row.verse)}</div>`;
      })
      .join("");
    reader.innerHTML = banner + `<div class="stack-wrap">${cardsHtml}</div>`;
  } else if (state.prefs.view_mode === "bubbles") {
    const bubblesHtml = state.rows
      .map((row) => {
        const selectedClass = state.selectedVerse === row.verse ? "selected" : "";
        const slotsHtml = state.prefs.slots
          .map((code, slotIdx) => {
            const cell = row.cells[code];
            const txt = cell ? formatScriptureHtml(cell.formatted_text || cell.text) : "—";
            return `
              <div class="bubble-slot" data-slot="${slotIdx}">
                <div class="bubble-slot-code">${code} &middot; ${lensFor(code)}</div>
                <div class="bubble-slot-txt">${txt}</div>
              </div>
            `;
          })
          .join("");
        return `<div class="bubble-card ${selectedClass}" data-verse="${row.verse}"><div class="bubble-head">VERSE ${row.verse}</div>${slotsHtml}${actionButtonsHtml(row.verse)}</div>`;
      })
      .join("");
    reader.innerHTML = banner + `<div class="ew-bar"><span class="ew-hint">Scroll mouse wheel to glide East &rarr; West</span></div><div id="ew-stage" class="bubbles-stage">${bubblesHtml}</div>`;
    const stage = document.getElementById("ew-stage");
    attachHorizontalWheel(stage);
    stage.scrollLeft = prevLeft;
  } else {
    const sc = state.prefs.scroll_style || "ribbon";
    const switcher = `
      <div class="ew-bar">
        <span class="ew-hint">Scroll mouse wheel to unroll East &rarr; West</span>
        <div class="segmented">
          <button class="seg-btn ${sc === "ribbon" ? "active" : ""}" data-inline-scroll="ribbon">Ribbon Flow</button>
          <button class="seg-btn ${sc === "compact" ? "active" : ""}" data-inline-scroll="compact">Compact Folio</button>
        </div>
      </div>
    `;

    if (sc === "ribbon") {
      let gridHtml = `<div class="ribbon-rail rail-top">VERSE</div>`;
      state.prefs.slots.forEach((code) => {
        gridHtml += `<div class="ribbon-rail"><div class="ribbon-rail-code">${code}</div><div class="ribbon-rail-lens">${lensFor(code)}</div></div>`;
      });

      state.rows.forEach((row) => {
        const sel = state.selectedVerse === row.verse ? "selected" : "";
        gridHtml += `<div class="ribbon-col-head ${sel}" data-verse="${row.verse}">Verse ${row.verse}${actionButtonsHtml(row.verse)}</div>`;
        state.prefs.slots.forEach((code, slotIdx) => {
          const cell = row.cells[code];
          const txt = cell ? formatScriptureHtml(cell.formatted_text || cell.text) : "—";
          const foot = slotIdx === state.prefs.slots.length - 1 ? `<span class="ribbon-foot-tag">Verse ${row.verse}</span>` : "";
          gridHtml += `<div class="ribbon-cell ${sel}" data-slot="${slotIdx}" data-verse="${row.verse}">${txt}${foot}</div>`;
        });
      });

      reader.innerHTML = banner + switcher + `<div id="ew-stage" class="ribbon-stage">${gridHtml}</div>`;
    } else {
      const foliosHtml = state.rows
        .map((row) => {
          const selectedClass = state.selectedVerse === row.verse ? "selected" : "";
          const colsHtml = state.prefs.slots
            .map((code) => {
              const cell = row.cells[code];
              const txt = cell ? formatScriptureHtml(cell.formatted_text || cell.text) : "—";
              return `
                <div class="sheet-col" data-slot="${slotIdx}">
                  <div class="sheet-col-tag">${code}</div>
                  <span class="verse-num">${row.verse}</span>${txt}
                </div>
              `;
            })
            .join("");
          return `<div class="sheet-verse ${selectedClass}" data-verse="${row.verse}">${colsHtml}${actionButtonsHtml(row.verse)}</div>`;
        })
        .join("");
      reader.innerHTML = banner + switcher + `<div id="ew-stage" class="sheet-stage">${foliosHtml}</div>`;
    }

    const stage = document.getElementById("ew-stage");
    attachHorizontalWheel(stage);
    stage.scrollLeft = prevLeft;

    reader.querySelectorAll("[data-inline-scroll]").forEach((btn) => {
      btn.onclick = async () => {
        state.prefs.scroll_style = btn.dataset.inlineScroll;
        applyThemeAndTypography();
        renderReader();
        await persistPrefs();
      };
    });
  }

  reader.querySelectorAll("[data-verse]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.dataset.copy || e.target.dataset.pin) return;
      const v = Number(el.dataset.verse);
      state.selectedVerse = state.selectedVerse === v ? null : v;
      renderReader();
    });
  });

  reader.querySelectorAll("[data-pin]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePin(Number(btn.dataset.pin));
    });
  });

  reader.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const v = Number(btn.dataset.copy);
      const row = state.rows.find((r) => r.verse === v);
      if (!row) return;
      const b = bookById(state.prefs.book_id);
      const lines = state.prefs.slots
        .map((c) => row.cells[c] ? `[${c}] ${cleanDisplayText(row.cells[c].text)}` : "")
        .filter(Boolean)
        .join("\n");
      await navigator.clipboard.writeText(`${b.name} ${state.prefs.chapter}:${v}\n${lines}`);
      showToast(`Copied ${b.name} ${state.prefs.chapter}:${v}`);
    });
  });
}

async function loadChapter(bookId, chapter, targetVerse = null) {
  state.prefs.book_id = bookId;
  state.prefs.chapter = chapter;
  state.selectedVerse = targetVerse;
  state.rows = await invoke("get_chapter", {
    bookId,
    chapter,
    translations: state.prefs.slots,
  });
  renderSlotPills();
  renderReader();
  scheduleReadCheck();
  window.scrollTo({ top: 0, behavior: "instant" });
  if (targetVerse) {
    setTimeout(() => {
      const target = document.querySelector(`[data-verse="${targetVerse}"]`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }, 40);
  }
  await persistPrefs();
}

function stepChapter(delta) {
  let bIdx = state.books.findIndex((b) => b.id === state.prefs.book_id);
  let chap = state.prefs.chapter + delta;
  if (chap < 1) {
    if (bIdx > 0) {
      bIdx -= 1;
      chap = state.books[bIdx].chapters;
    } else return;
  } else if (chap > state.books[bIdx].chapters) {
    if (bIdx < state.books.length - 1) {
      bIdx += 1;
      chap = 1;
    } else return;
  }
  markReadToday();
  loadChapter(state.books[bIdx].id, chap);
}

function openSlotMenu(slotIdx, anchor) {
  const menu = document.getElementById("slot-menu");
  const rect = anchor.getBoundingClientRect();
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${rect.bottom + 6}px`;
  menu.innerHTML = state.translations
    .map((t) => {
      const active = state.prefs.slots[slotIdx] === t.code ? "active" : "";
      return `
        <button class="slot-option ${active}" data-code="${t.code}">
          <span><strong>${t.code}</strong></span>
          <span class="slot-meta">${t.name}<br>${lensFor(t.code)}</span>
        </button>
      `;
    })
    .join("");
  menu.classList.remove("hidden");

  menu.querySelectorAll(".slot-option").forEach((btn) => {
    btn.onclick = async () => {
      state.prefs.slots[slotIdx] = btn.dataset.code;
      menu.classList.add("hidden");
      await loadChapter(state.prefs.book_id, state.prefs.chapter, state.selectedVerse);
      await loadDailyCard(false);
    };
  });
}

async function renderPassagePicker() {
  document.getElementById("tab-ot").classList.toggle("active", state.pickerTestament === "OT");
  document.getElementById("tab-nt").classList.toggle("active", state.pickerTestament === "NT");
  document.getElementById("tab-all").classList.toggle("active", state.pickerTestament === "ALL");

  const q = state.pickerFilter.trim().toLowerCase();
  const books = q
    ? state.books
        .map((b) => ({ b, s: bookMatchScore(b, q) }))
        .filter((x) => x.s > 0)
        .sort((a, c) => c.s - a.s)
        .map((x) => x.b)
    : state.books.filter((b) => state.pickerTestament === "ALL" || b.testament === state.pickerTestament);

  const bl = document.getElementById("book-list");
  bl.innerHTML = books
    .map((b) => `<button class="book-item ${b.id === state.pickerBookId ? "active" : ""}" data-bid="${b.id}">${b.name}</button>`)
    .join("");
  bl.querySelectorAll(".book-item").forEach((btn) => {
    btn.onclick = () => {
      state.pickerBookId = Number(btn.dataset.bid);
      state.pickerChapter = null;
      renderPassagePicker();
    };
  });

  const activeBook = bookById(state.pickerBookId);
  const chapWrap = document.getElementById("chapter-step");
  const verseWrap = document.getElementById("verse-step");

  if (state.pickerChapter === null) {
    chapWrap.classList.remove("hidden");
    verseWrap.classList.add("hidden");
    let html = "";
    for (let c = 1; c <= activeBook.chapters; c++) {
      const isCur = activeBook.id === state.prefs.book_id && c === state.prefs.chapter ? "active" : "";
      html += `<button class="chap-btn ${isCur}" data-c="${c}">${c}</button>`;
    }
    chapWrap.innerHTML = html;
    chapWrap.querySelectorAll(".chap-btn").forEach((btn) => {
      btn.onclick = () => {
        state.pickerChapter = Number(btn.dataset.c);
        renderPassagePicker();
      };
    });
  } else {
    chapWrap.classList.add("hidden");
    verseWrap.classList.remove("hidden");
    document.getElementById("verse-step-title").textContent = `${activeBook.name} ${state.pickerChapter}`;
    const vCount = await invoke("get_verse_count", { bookId: activeBook.id, chapter: state.pickerChapter });
    let vHtml = "";
    for (let v = 1; v <= vCount; v++) {
      vHtml += `<button class="chap-btn" data-v="${v}">${v}</button>`;
    }
    const vg = document.getElementById("verse-grid");
    vg.innerHTML = vHtml;
    vg.querySelectorAll(".chap-btn").forEach((btn) => {
      btn.onclick = () => {
        document.getElementById("modal-passage").classList.add("hidden");
        loadChapter(activeBook.id, state.pickerChapter, Number(btn.dataset.v));
      };
    });
  }
}

function allPinFolders() {
  const set = new Set(state.customFolders);
  (state.prefs.pins || []).forEach((p) => { if (p.folder) set.add(p.folder); });
  return Array.from(set);
}

function renderPinsModal() {
  const folders = allPinFolders();
  const bar = document.getElementById("pins-toolbar");
  bar.innerHTML = ["All", ...folders]
    .map((f) => `<button class="pin-pill ${state.pinFilter === f ? "active" : ""}" data-pin-tab="${escapeHtml(f)}">${escapeHtml(f)}</button>`)
    .join("") + `<input id="pin-new-folder" class="pin-new-input" type="text" placeholder="+ Folder & Enter" />`;

  bar.querySelectorAll("[data-pin-tab]").forEach((b) => {
    b.onclick = () => { state.pinFilter = b.dataset.pinTab; renderPinsModal(); };
  });
  bar.querySelector("#pin-new-folder").onkeydown = (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      const nf = e.target.value.trim();
      if (!state.customFolders.includes(nf)) state.customFolders.push(nf);
      state.pinFilter = nf;
      renderPinsModal();
    }
  };

  const list = document.getElementById("pins-list");
  const pins = state.prefs.pins || [];
  const filtered = pins.map((p, idx) => ({ p, idx }))
    .filter(({ p }) => state.pinFilter === "All" || (p.folder || "General") === state.pinFilter);

  if (!filtered.length) {
    list.innerHTML = `<div class="plan-day"><span style="color:var(--text-muted)">No pinned verses in <strong>${escapeHtml(state.pinFilter)}</strong> yet. Hover any verse and click <strong>Pin</strong>.</span></div>`;
    return;
  }
  list.innerHTML = filtered
    .map(({ p, idx }) => {
      const curF = p.folder || "General";
      const opts = folders.map((f) => `<option value="${escapeHtml(f)}" ${f === curF ? "selected" : ""}>${escapeHtml(f)}</option>`).join("");
      return `
      <div class="plan-day">
        <div class="plan-day-left" style="flex-direction:column;align-items:flex-start;gap:4px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <strong>${escapeHtml(p.book_name)} ${p.chapter}:${p.verse}</strong>
            <select class="pin-folder-sel" data-pin-move="${idx}">${opts}</select>
          </div>
          <span class="pin-snippet">${escapeHtml(p.snippet)}...</span>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="pill pill-primary" data-pin-open="${idx}">Open</button>
          <button class="pill pill-ghost" data-pin-del="${idx}">&times;</button>
        </div>
      </div>`;
    })
    .join("");

  list.querySelectorAll("[data-pin-move]").forEach((sel) => {
    sel.onchange = async () => {
      state.prefs.pins[Number(sel.dataset.pinMove)].folder = sel.value;
      await persistPrefs();
      renderPinsModal();
    };
  });

  list.querySelectorAll("[data-pin-open]").forEach((btn) => {
    btn.onclick = () => {
      const p = pins[Number(btn.dataset.pinOpen)];
      document.getElementById("modal-pins").classList.add("hidden");
      loadChapter(p.book_id, p.chapter, p.verse);
    };
  });
  list.querySelectorAll("[data-pin-del]").forEach((btn) => {
    btn.onclick = async () => {
      state.prefs.pins.splice(Number(btn.dataset.pinDel), 1);
      await persistPrefs();
      applyThemeAndTypography();
      renderPinsModal();
      renderReader();
    };
  });
}

function tryParseRef(raw) {
  const m = raw.trim().match(/^([1-3]?\s*[a-zA-Z]+)\s+(\d+)(?:[:.](\d+))?$/);
  if (!m) return null;
  const qBook = m[1].toLowerCase().replace(/\s+/g, "");
  const chap = Number(m[2]);
  const verse = m[3] ? Number(m[3]) : null;
  const match = state.books
    .map((b) => ({ b, s: bookMatchScore(b, qBook) }))
    .filter((x) => x.s > 0)
    .sort((a, c) => c.s - a.s)[0]?.b;
  if (!match || chap < 1 || chap > match.chapters) return null;
  return { book: match, chapter: chap, verse };
}

async function handleSearchInput() {
  const val = document.getElementById("search-input").value;
  const res = document.getElementById("search-results");
  const primary = state.prefs.slots[0];
  document.getElementById("search-scope").textContent = `in ${primary}`;

  if (!val.trim()) {
    res.innerHTML = `<div class="search-hit" style="cursor:default"><div class="search-hit-txt">Try typing a reference like <strong>Rom 8</strong>, <strong>Prov 24:16</strong>, or a keyword like <strong>wisdom</strong>.</div></div>`;
    return;
  }

  let html = "";
  const ref = tryParseRef(val);
  if (ref) {
    html += `
      <div class="search-hit" data-jump-book="${ref.book.id}" data-jump-chap="${ref.chapter}" data-jump-verse="${ref.verse || ""}">
        <div class="search-hit-ref">Jump to ${ref.book.name} ${ref.chapter}${ref.verse ? ":" + ref.verse : ""}</div>
        <div class="search-hit-txt">Open directly in your 3-Version Stack</div>
      </div>
    `;
  }

  const hits = await invoke("search_verses", { query: val, translationCode: primary, limit: 40 });
  html += hits
    .map((h) => `
      <div class="search-hit" data-jump-book="${h.book_id}" data-jump-chap="${h.chapter}" data-jump-verse="${h.verse}">
        <div class="search-hit-ref">${h.book_name} ${h.chapter}:${h.verse}</div>
        <div class="search-hit-txt">${escapeHtml(cleanDisplayText(h.text))}</div>
      </div>
    `)
    .join("");

  res.innerHTML = html || `<div class="search-hit"><div class="search-hit-txt">No matches found.</div></div>`;
  res.querySelectorAll("[data-jump-book]").forEach((el) => {
    el.onclick = () => {
      document.getElementById("modal-search").classList.add("hidden");
      const v = el.dataset.jumpVerse ? Number(el.dataset.jumpVerse) : null;
      loadChapter(Number(el.dataset.jumpBook), Number(el.dataset.jumpChap), v);
    };
  });
}

function renderPlanModal() {
  const sel = document.getElementById("plan-select");
  sel.innerHTML = Object.entries(getPlans())
    .map(([k, p]) => `<option value="${k}" ${k === state.prefs.active_plan ? "selected" : ""}>${p.name}</option>`)
    .join("");

  const allPlans = getPlans();
  const planKey = state.prefs.active_plan in allPlans ? state.prefs.active_plan : "gospels_psalms";
  const plan = allPlans[planKey];
  const done = new Set(state.prefs.completed_days[planKey] || []);
  document.getElementById("plan-progress").textContent = `${done.size} / ${plan.days.length} done`;

  const list = document.getElementById("plan-days");
  list.innerHTML = plan.days
    .map((d) => `
      <div class="plan-day">
        <div class="plan-day-left">
          <input type="checkbox" data-day="${d.day}" ${done.has(d.day) ? "checked" : ""} />
          <span><strong>Day ${d.day}:</strong> ${d.label}</span>
        </div>
        <button class="pill pill-primary" data-open-b="${d.bookId}" data-open-c="${d.chapter}">Read</button>
      </div>
    `)
    .join("");

  list.querySelectorAll("input[data-day]").forEach((chk) => {
    chk.onchange = async () => {
      const dayNum = Number(chk.dataset.day);
      const set = new Set(state.prefs.completed_days[planKey] || []);
      if (chk.checked) {
        set.add(dayNum);
        await markReadToday();
      } else {
        set.delete(dayNum);
      }
      state.prefs.completed_days[planKey] = Array.from(set);
      await persistPrefs();
      renderPlanModal();
    };
  });

  list.querySelectorAll("[data-open-b]").forEach((btn) => {
    btn.onclick = () => {
      document.getElementById("modal-plan").classList.add("hidden");
      markReadToday();
      loadChapter(Number(btn.dataset.openB), Number(btn.dataset.openC));
    };
  });
}

async function init() {
  const boot = await invoke("get_bootstrap");
  state.translations = boot.translations;
  state.books = boot.books;
  state.prefs = boot.prefs;
  if (state.prefs.view_mode === "sheet") state.prefs.view_mode = "scroll";
  state.lastReadDate = boot.last_read_date;

  applyThemeAndTypography();
  await loadChapter(state.prefs.book_id, state.prefs.chapter);
  const showDaily = state.prefs.daily_dismissed_date !== localDateKey();
  await loadDailyCard(showDaily);

  document.getElementById("btn-daily-close").onclick = async () => {
    document.getElementById("daily-card-wrap").classList.add("hidden");
    state.prefs.daily_dismissed_date = localDateKey();
    await persistPrefs();
  };
  document.getElementById("btn-daily-open").onclick = () => {
    if (!state.dailyVerse) return;
    loadChapter(state.dailyVerse.book_id, state.dailyVerse.chapter, state.dailyVerse.verse);
  };
  document.getElementById("btn-daily-plan-go").onclick = () => {
    const nextDay = nextPlanDay();
    markReadToday();
    loadChapter(nextDay.bookId, nextDay.chapter);
  };
  document.getElementById("btn-show-daily").onclick = () => {
    document.getElementById("modal-settings").classList.add("hidden");
    loadDailyCard(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  document.getElementById("btn-read-default").onclick = async () => {
    state.prefs.view_mode = "cols";
    state.prefs.color_code = false;
    state.prefs.clean_pilcrow = true;
    state.prefs.font_style = "editorial";
    state.prefs.slot_fonts = {};
    state.prefs.line_height = "balanced";
    applyThemeAndTypography();
    renderSlotPills();
    renderReader();
    await loadDailyCard(false);
    await persistPrefs();
    showToast("Switched to clean Default reading");
  };

  document.getElementById("btn-prev").onclick = () => stepChapter(-1);
  document.getElementById("btn-next").onclick = () => stepChapter(1);
  document.getElementById("btn-prev-bottom").onclick = () => stepChapter(-1);
  document.getElementById("btn-next-bottom").onclick = () => stepChapter(1);

  document.querySelectorAll("[data-mode-pick]").forEach((btn) => {
    btn.onclick = async () => {
      state.prefs.view_mode = btn.dataset.modePick;
      applyThemeAndTypography();
      renderSlotPills();
      renderReader();
      await persistPrefs();
    };
  });

  document.getElementById("btn-passage").onclick = () => {
    const cur = bookById(state.prefs.book_id);
    state.pickerTestament = cur.testament;
    state.pickerBookId = cur.id;
    state.pickerChapter = null;
    state.pickerFilter = "";
    document.getElementById("book-filter").value = "";
    renderPassagePicker();
    document.getElementById("modal-passage").classList.remove("hidden");
  };
  document.getElementById("tab-ot").onclick = () => {
    state.pickerTestament = "OT";
    state.pickerChapter = null;
    state.pickerBookId = state.books.find((b) => b.testament === "OT").id;
    renderPassagePicker();
  };
  document.getElementById("tab-nt").onclick = () => {
    state.pickerTestament = "NT";
    state.pickerChapter = null;
    state.pickerBookId = state.books.find((b) => b.testament === "NT").id;
    renderPassagePicker();
  };
  document.getElementById("tab-all").onclick = () => {
    state.pickerTestament = "ALL";
    state.pickerChapter = null;
    renderPassagePicker();
  };
  document.getElementById("book-filter").oninput = (e) => {
    state.pickerFilter = e.target.value;
    state.pickerChapter = null;
    renderPassagePicker();
  };
  document.getElementById("btn-back-chapters").onclick = () => {
    state.pickerChapter = null;
    renderPassagePicker();
  };
  document.getElementById("btn-open-chap-now").onclick = () => {
    document.getElementById("modal-passage").classList.add("hidden");
    loadChapter(state.pickerBookId, state.pickerChapter || 1);
  };

  document.getElementById("btn-pins").onclick = () => {
    renderPinsModal();
    document.getElementById("modal-pins").classList.remove("hidden");
  };

  const openSearch = () => {
    document.getElementById("modal-search").classList.remove("hidden");
    const inp = document.getElementById("search-input");
    inp.focus();
    inp.select();
    handleSearchInput();
  };
  document.getElementById("btn-jump").onclick = openSearch;
  document.getElementById("search-input").oninput = handleSearchInput;

  document.getElementById("btn-plan").onclick = () => {
    renderPlanModal();
    document.getElementById("modal-plan").classList.remove("hidden");
  };
  document.getElementById("plan-select").onchange = async (e) => {
    state.prefs.active_plan = e.target.value;
    await persistPrefs();
    renderPlanModal();
  };

  document.getElementById("btn-settings").onclick = () => {
    document.getElementById("modal-settings").classList.remove("hidden");
  };
  document.querySelectorAll("[data-theme-pick]").forEach((btn) => {
    btn.onclick = async () => {
      state.prefs.theme = btn.dataset.themePick;
      applyThemeAndTypography();
      await persistPrefs();
    };
  });
  document.querySelectorAll("[data-scroll-pick]").forEach((btn) => {
    btn.onclick = async () => {
      state.prefs.scroll_style = btn.dataset.scrollPick;
      applyThemeAndTypography();
      if (state.prefs.view_mode === "scroll") renderReader();
      await persistPrefs();
    };
  });
  document.querySelectorAll("[data-font-target]").forEach((btn) => {
    btn.onclick = () => {
      state.fontTarget = btn.dataset.fontTarget;
      applyThemeAndTypography();
    };
  });
  document.querySelectorAll("[data-font-pick]").forEach((btn) => {
    btn.onclick = async () => {
      if (!state.prefs.slot_fonts) state.prefs.slot_fonts = {};
      if (state.fontTarget === "all") {
        state.prefs.font_style = btn.dataset.fontPick;
        state.prefs.slot_fonts = {};
      } else {
        state.prefs.slot_fonts[state.fontTarget] = btn.dataset.fontPick;
      }
      applyThemeAndTypography();
      await persistPrefs();
    };
  });
  document.querySelectorAll("[data-rhythm-pick]").forEach((btn) => {
    btn.onclick = async () => {
      state.prefs.line_height = btn.dataset.rhythmPick;
      applyThemeAndTypography();
      await persistPrefs();
    };
  });
  document.getElementById("font-slider").oninput = async (e) => {
    state.prefs.font_size = Number(e.target.value);
    applyThemeAndTypography();
    await persistPrefs();
  };
  document.getElementById("toggle-pilcrow").onchange = async (e) => {
    state.prefs.clean_pilcrow = e.target.checked;
    renderReader();
    await persistPrefs();
  };
  document.getElementById("toggle-color-code").onchange = async (e) => {
    state.prefs.color_code = e.target.checked;
    applyThemeAndTypography();
    renderReader();
    await loadDailyCard(false);
    await persistPrefs();
  };

  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.onclick = () => document.getElementById(btn.dataset.close).classList.add("hidden");
  });
  document.querySelectorAll(".modal").forEach((m) => {
    m.addEventListener("click", (e) => {
      if (e.target === m) m.classList.add("hidden");
    });
  });

  document.addEventListener("click", (e) => {
    const menu = document.getElementById("slot-menu");
    if (!menu.classList.contains("hidden") && !e.target.closest(".version-pill") && !e.target.closest("#slot-menu")) {
      menu.classList.add("hidden");
    }
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openSearch();
    } else if (e.key === "Escape") {
      document.querySelectorAll(".modal").forEach((m) => m.classList.add("hidden"));
      document.getElementById("slot-menu").classList.add("hidden");
    }
  });
}

init();
