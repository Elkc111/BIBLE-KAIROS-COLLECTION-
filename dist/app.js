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

let _cachedPlans = null;
function getPlans() {
  if (_cachedPlans && state.books.length) return _cachedPlans;
  const allIds = state.books.map((b) => b.id);
  const ntIds = state.books.filter((b) => b.testament === "NT").map((b) => b.id);
  const out = {
    ...PLANS,
    nt_90: { name: "New Testament Complete (90-Day)", days: sliceBookOrder(ntIds, 90) },
    bible_365: { name: "Whole Bible in a Year (365-Day)", days: sliceBookOrder(allIds, 365) },
    chrono_365: { name: "Chronological Bible (365-Day)", days: sliceBookOrder(CHRONO_ORDER, 365) },
  };
  if (state.books.length) _cachedPlans = out;
  return out;
}

let state = {
  translations: [],
  books: [],
  prefs: null,
  rows: [],
  dailyVerse: null,
  lastReadDate: null,
  selectedVerse: null,
  selEnd: null,
  pinDraftFolder: null,
  pinsTab: "pins",
  searchScope: null,
  studyBookId: null, studyChap: null, studyVerse: null, studyTab: "xrefs", studyMinVotes: 4, studyData: null, activeStrongId: null,
  pickerTestament: "NT",
  pickerBookId: 43,
  pickerChapter: null,
  pickerFilter: "",
  fontTarget: "all",
  pinFilter: "All",
  customFolders: ["General", "Prayer", "Worship", "Comfort"],
};

let readTimer = null;
let historyTimer = null;

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


async function shareOrCopy(title, bodyText) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text: bodyText });
      return;
    } catch (_) {}
  }
  await navigator.clipboard.writeText(bodyText);
  showToast(`Copied ${title}`);
}

function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add("hidden"), 1800);
}


function isVerseSelected(v) {
  if (state.selectedVerse === null) return false;
  const a = Math.min(state.selectedVerse, state.selEnd ?? state.selectedVerse);
  const b = Math.max(state.selectedVerse, state.selEnd ?? state.selectedVerse);
  return v >= a && v <= b;
}

function isPinned(bookId, chapter, verse) {
  return (state.prefs.pins || []).some((p) => {
    const endV = p.end_verse || p.verse;
    return p.book_id === bookId && p.chapter === chapter && verse >= p.verse && verse <= endV;
  });
}

function openPinPopup(clickedVerse) {
  const book = bookById(state.prefs.book_id);
  const maxV = state.rows.length ? state.rows[state.rows.length - 1].verse : clickedVerse;
  let startV = clickedVerse;
  let endV = clickedVerse;
  if (isVerseSelected(clickedVerse)) {
    startV = Math.min(state.selectedVerse, state.selEnd ?? state.selectedVerse);
    endV = Math.max(state.selectedVerse, state.selEnd ?? state.selectedVerse);
  }
  state.pinDraftFolder = state.prefs.last_pin_folder || "General";

  document.getElementById("pin-book-chap").textContent = `${book.name} ${state.prefs.chapter}:`;
  const sInp = document.getElementById("pin-start-v");
  const eInp = document.getElementById("pin-end-v");
  sInp.max = maxV; eInp.max = maxV;
  sInp.value = startV; eInp.value = endV;
  document.getElementById("pin-pop-new").value = "";

  const drawGroups = () => {
    const folders = allPinFolders();
    const wrap = document.getElementById("pin-pop-groups");
    wrap.innerHTML = folders
      .map((f) => `<button class="pin-pill ${state.pinDraftFolder === f ? "active" : ""}" data-draft-f="${escapeHtml(f)}">${escapeHtml(f)}</button>`)
      .join("");
    wrap.querySelectorAll("[data-draft-f]").forEach((btn) => {
      btn.onclick = () => {
        state.pinDraftFolder = btn.dataset.draftF;
        drawGroups();
        document.getElementById("btn-pin-save").focus();
      };
    });
  };
  drawGroups();
  openModal("modal-pin-pop");
  setTimeout(() => document.getElementById("btn-pin-save").focus(), 20);
}

async function savePinFromPopup() {
  const book = bookById(state.prefs.book_id);
  const a = Math.max(1, Number(document.getElementById("pin-start-v").value) || 1);
  const b = Math.max(a, Number(document.getElementById("pin-end-v").value) || a);
  const typedNew = document.getElementById("pin-pop-new").value.trim();
  const folder = typedNew || state.pinDraftFolder || "General";
  if (typedNew && !state.customFolders.includes(typedNew)) {
    state.customFolders.push(typedNew);
  }

  const primary = state.prefs.slots[0];
  const row = state.rows.find((r) => r.verse === a);
  const snippet = cleanDisplayText(row?.cells[primary]?.text || "").slice(0, 120);

  state.prefs.pins.unshift({
    book_id: book.id,
    book_name: book.name,
    chapter: state.prefs.chapter,
    verse: a,
    end_verse: b > a ? b : null,
    snippet,
    folder,
  });
  state.prefs.last_pin_folder = folder;
  document.getElementById("modal-pin-pop").classList.add("hidden");
  await persistPrefs();
  renderReader();
  const ref = b > a ? `${book.name} ${state.prefs.chapter}:${a}–${b}` : `${book.name} ${state.prefs.chapter}:${a}`;
  showToast(`Pinned ${ref} -> ${folder}`);
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

async function logRecentVisit() {
  const b = bookById(state.prefs.book_id);
  if (!b) return;
  if (!state.prefs.history) state.prefs.history = [];
  const v = state.selectedVerse || null;
  state.prefs.history = state.prefs.history.filter(
    (h) => !(h.book_id === b.id && h.chapter === state.prefs.chapter && (h.verse || null) === v)
  );
  state.prefs.history.unshift({ book_id: b.id, book_name: b.name, chapter: state.prefs.chapter, verse: v });
  state.prefs.history = state.prefs.history.slice(0, 25);
  await persistPrefs();
}

function scheduleReadCheck() {
  clearTimeout(readTimer);
  clearTimeout(historyTimer);
  historyTimer = setTimeout(() => { logRecentVisit(); }, 10000);
  readTimer = setTimeout(() => { markReadToday(); }, 18000);
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
  const activeFontForTarget = fs;
  renderSlotFontGrid();
  document.documentElement.style.setProperty("--reader-lh", LINE_HEIGHTS[lh] || LINE_HEIGHTS.balanced);

  document.getElementById("font-slider").value = state.prefs.font_size;
  document.getElementById("font-size-val").textContent = `${state.prefs.font_size}px`;
  const ws = state.prefs.wasd_step || 220;
  if (document.getElementById("wasd-slider")) document.getElementById("wasd-slider").value = ws;
  if (document.getElementById("wasd-step-val")) document.getElementById("wasd-step-val").textContent = `${ws}px`;
  document.getElementById("toggle-pilcrow").checked = state.prefs.clean_pilcrow;
  document.getElementById("toggle-color-code").checked = !!state.prefs.color_code;
  if (document.getElementById("toggle-color-strands")) document.getElementById("toggle-color-strands").checked = state.prefs.color_strands !== false;
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

function countPinsFor(bookId, chapter, verse) {
  return (state.prefs.pins || []).filter((p) => {
    const endV = p.end_verse || p.verse;
    return p.book_id === bookId && p.chapter === chapter && verse >= p.verse && verse <= endV;
  }).length;
}

function actionButtonsHtml(verseNum) {
  const cnt = countPinsFor(state.prefs.book_id, state.prefs.chapter, verseNum);
  const pinLabel = cnt > 0 ? `Pin &times;${cnt}` : "Pin";
  return `
    <div class="row-actions">
      <button class="copy-mini ${cnt > 0 ? "pinned" : ""}" data-pin="${verseNum}" title="Pin verse (unlimited)">${pinLabel}</button>
      <button class="copy-mini" data-share="${verseNum}" title="Share or Copy">Share</button>
      <button class="copy-mini" data-links="${verseNum}" title="Cross-Refs, Arcs & Original Words">Links</button>
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
        const selectedClass = isVerseSelected(row.verse) ? "selected" : "";
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
        const selectedClass = isVerseSelected(row.verse) ? "selected" : "";
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
        const selectedClass = isVerseSelected(row.verse) ? "selected" : "";
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
        const sel = isVerseSelected(row.verse) ? "selected" : "";
        gridHtml += `<div class="ribbon-col-head ${sel}" data-verse="${row.verse}">Verse ${row.verse}${actionButtonsHtml(row.verse)}</div>`;
        state.prefs.slots.forEach((code, slotIdx) => {
          const cell = row.cells[code];
          const txt = cell ? formatScriptureHtml(cell.formatted_text || cell.text) : "—";
          const foot = `<span class="ribbon-foot-tag">Verse ${row.verse}</span>`;
          gridHtml += `<div class="ribbon-cell ${sel}" data-slot="${slotIdx}" data-verse="${row.verse}">${txt}${foot}</div>`;
        });
      });

      reader.innerHTML = banner + switcher + `<div id="ew-stage" class="ribbon-stage">${gridHtml}</div>`;
    } else {
      const foliosHtml = state.rows
        .map((row) => {
          const selectedClass = isVerseSelected(row.verse) ? "selected" : "";
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
      if (e.target.dataset.share || e.target.dataset.pin || e.target.dataset.links) return;
      const v = Number(el.dataset.verse);
      if (e.shiftKey && state.selectedVerse !== null) {
        state.selEnd = v;
      } else if (state.selectedVerse === v && (state.selEnd === null || state.selEnd === v)) {
        state.selectedVerse = null;
        state.selEnd = null;
      } else {
        state.selectedVerse = v;
        state.selEnd = v;
      }
      renderReader();
    });
  });

  reader.querySelectorAll("[data-links]").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); openStudyModal(Number(btn.dataset.links)); });
  });
  reader.querySelectorAll("[data-pin]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openPinPopup(Number(btn.dataset.pin));
    });
  });

  reader.querySelectorAll("[data-share]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const v = Number(btn.dataset.share);
      const b = bookById(state.prefs.book_id);
      const startV = isVerseSelected(v) ? Math.min(state.selectedVerse, state.selEnd ?? state.selectedVerse) : v;
      const endV = isVerseSelected(v) ? Math.max(state.selectedVerse, state.selEnd ?? state.selectedVerse) : v;
      const picked = state.rows.filter((r) => r.verse >= startV && r.verse <= endV);
      if (!picked.length) return;
      const blocks = picked.map((row) => {
        const prefix = picked.length > 1 ? `v.${row.verse} ` : "";
        return state.prefs.slots
          .map((c) => row.cells[c] ? `${prefix}[${c}] ${cleanDisplayText(row.cells[c].text)}` : "")
          .filter(Boolean)
          .join("\n\n");
      }).join("\n\n---\n\n");
      const ref = endV > startV ? `${b.name} ${state.prefs.chapter}:${startV}–${endV}` : `${b.name} ${state.prefs.chapter}:${startV}`;
      await shareOrCopy(ref, `${ref}\n\n${blocks}`);
    });
  });
}

async function loadChapter(bookId, chapter, targetVerse = null, targetEnd = null) {
  state.prefs.book_id = bookId;
  state.prefs.chapter = chapter;
  state.selectedVerse = targetVerse;
  state.selEnd = targetEnd ?? targetVerse;
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
  const mw = menu.offsetWidth || 270;
  menu.style.left = `${Math.max(10, Math.min(rect.left, window.innerWidth - mw - 12))}px`;

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


function renderRecentList() {
  const recEl = document.getElementById("recent-list");
  const items = state.prefs.history || [];
  if (!items.length) {
    recEl.innerHTML = `<div class="plan-day"><span style="color:var(--text-muted)">Stay on any chapter for 10 seconds and it appears here automatically.</span></div>`;
    return;
  }
  recEl.innerHTML = `<div style="display:flex;justify-content:flex-end;padding-bottom:4px;"><button id="btn-clear-recent" class="pill pill-ghost" style="font-size:12px;">Clear History</button></div>` +
    items.map((h, i) => `
      <div class="plan-day">
        <div class="plan-day-left"><strong>${escapeHtml(h.book_name)} ${h.chapter}${h.verse ? ":" + h.verse : ""}</strong></div>
        <button class="pill pill-primary" data-rec-open="${i}">Open</button>
      </div>
    `).join("");

  recEl.querySelector("#btn-clear-recent").onclick = async () => {
    state.prefs.history = [];
    await persistPrefs();
    renderRecentList();
  };
  recEl.querySelectorAll("[data-rec-open]").forEach((btn) => {
    btn.onclick = () => {
      const h = items[Number(btn.dataset.recOpen)];
      closeAllModals();
      loadChapter(h.book_id, h.chapter, h.verse || null);
    };
  });
}


function toggleSelah(on) {
  document.body.classList.toggle("selah-active", on);
  document.getElementById("btn-exit-selah").classList.toggle("hidden", !on);
}

function renderSlotFontGrid() {
  const grid = document.getElementById("slot-font-grid");
  if (!grid || !state.prefs) return;
  const sf = state.prefs.slot_fonts || {};
  const opts = [
    ["", "Match All"],
    ["editorial", "Editorial Serif"],
    ["olde", "Ye Olde"],
    ["chancery", "Chancery"],
    ["sans", "Modern Sans"],
    ["mono", "Monospace"],
  ];
  grid.innerHTML = state.prefs.slots.map((code, i) => {
    const cur = sf[String(i)] || "";
    const optHtml = opts.map(([val, lbl]) => `<option value="${val}" ${val === cur ? "selected" : ""}>${lbl}</option>`).join("");
    return `<div class="slot-font-box"><span>Slot ${i + 1} (<strong>${escapeHtml(code)}</strong>)</span><select data-slot-font="${i}">${optHtml}</select></div>`;
  }).join("");

  grid.querySelectorAll("[data-slot-font]").forEach((sel) => {
    sel.onchange = async () => {
      if (!state.prefs.slot_fonts) state.prefs.slot_fonts = {};
      if (!sel.value) delete state.prefs.slot_fonts[sel.dataset.slotFont];
      else state.prefs.slot_fonts[sel.dataset.slotFont] = sel.value;
      applyThemeAndTypography();
      await persistPrefs();
    };
  });
}

async function exportFileOrShare(filename, textContent) {
  if (navigator.share) {
    try {
      await navigator.share({ title: filename, text: textContent });
      return;
    } catch (_) {}
  }
  try {
    await invoke("export_text_file", { filename, contents: textContent });
    showToast(`Saved ${filename} to Downloads`);
  } catch (_) {
    await navigator.clipboard.writeText(textContent);
    showToast(`Copied ${filename} to clipboard`);
  }
}


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
    const fname = `kairos-${b.name.replace(/\s+/g, "-")}-${state.studyChap}-${state.studyVerse}.png`;
    try {
      const file = new File([blob], fname, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: ref, files: [file] });
        return;
      }
    } catch (_) {}
    const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
    await invoke("export_binary_file", { filename: fname, bytes });
    showToast(`Saved ${fname} to Downloads`);
  }, "image/png");
}

function renderPrayerModal() {
  const b = bookById(state.prefs.book_id);
  const curRef = `${b.name} ${state.prefs.chapter}${state.selectedVerse ? ":" + state.selectedVerse : ""}`;
  const refEl = document.getElementById("prayer-cur-ref");
  if (refEl) refEl.textContent = curRef;

  const list = document.getElementById("prayer-list");
  if (!list) return;
  const prayers = state.prefs.prayers || [];
  const inp = document.getElementById("prayer-input");
  if (inp) inp.placeholder = `Prayer #${prayers.length + 1} — write a specific request...`;

  if (!prayers.length) {
    list.innerHTML = `<div class="notepad-row"><span class="notepad-num">1.</span><span></span><span style="color:var(--text-muted)">Your prayer notepad is blank. Write #1 above.</span><span></span></div>`;
    return;
  }
  list.innerHTML = prayers.map((pr, idx) => `
    <div class="notepad-row">
      <span class="notepad-num">${idx + 1}.</span>
      <input type="checkbox" data-pray-done="${idx}" ${pr.answered ? "checked" : ""} title="Mark answered" />
      <div class="notepad-body">
        <span class="${pr.answered ? "prayer-answered" : ""}" style="white-space:pre-wrap;">${escapeHtml(pr.text)}</span>
        <div class="notepad-meta">
          <small style="color:var(--text-muted);font-size:11px;">${escapeHtml(pr.created_at)}</small>
          ${pr.scripture_ref ? `<button class="pin-pill active" data-pray-jump="${escapeHtml(pr.scripture_ref)}">${escapeHtml(pr.scripture_ref)}</button>` : ""}
        </div>
      </div>
      <button class="pill pill-ghost" data-pray-del="${idx}" title="Delete">&times;</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-pray-done]").forEach((chk) => {
    chk.onchange = async () => {
      state.prefs.prayers[Number(chk.dataset.prayDone)].answered = chk.checked;
      await persistPrefs();
      renderPrayerModal();
    };
  });
  list.querySelectorAll("[data-pray-del]").forEach((btn) => {
    btn.onclick = async () => {
      state.prefs.prayers.splice(Number(btn.dataset.prayDel), 1);
      await persistPrefs();
      renderPrayerModal();
    };
  });
  list.querySelectorAll("[data-pray-jump]").forEach((btn) => {
    btn.onclick = () => {
      const ref = tryParseRef(btn.dataset.prayJump);
      if (ref) { closeAllModals(); loadChapter(ref.book.id, ref.chapter, ref.verse); }
    };
  });
}

function renderPinsModal() {
  const isPins = state.pinsTab !== "recent";
  document.getElementById("tab-pins-view").classList.toggle("active", isPins);
  document.getElementById("tab-recent-view").classList.toggle("active", !isPins);
  document.getElementById("pins-toolbar").classList.toggle("hidden", !isPins);
  document.getElementById("pins-list").classList.toggle("hidden", !isPins);
  document.getElementById("recent-list").classList.toggle("hidden", isPins);
  if (!isPins) { renderRecentList(); return; }
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
            <strong>${escapeHtml(p.book_name)} ${p.chapter}:${p.verse}${p.end_verse && p.end_verse > p.verse ? "–" + p.end_verse : ""}</strong>
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
      loadChapter(p.book_id, p.chapter, p.verse, p.end_verse || null);
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

function populateSearchScope() {
  const sel = document.getElementById("search-scope");
  if (!sel || !state.prefs) return;
  if (!state.searchScope) state.searchScope = state.prefs.slots[0];
  const opts = [
    ...state.translations.map((t) => [t.code, `in ${t.code}`]),
    ["ALL", "All Versions"],
  ];
  sel.innerHTML = opts.map(([v, l]) => `<option value="${v}" ${v === state.searchScope ? "selected" : ""}>${l}</option>`).join("");
  sel.onchange = () => { state.searchScope = sel.value; handleSearchInput(); };
}

async function handleSearchInput() {
  const val = document.getElementById("search-input").value;
  const res = document.getElementById("search-results");
  const primary = state.searchScope || state.prefs.slots[0];

  if (!val.trim()) {
    res.innerHTML = `<div class="search-hit" style="cursor:default"><div class="search-hit-txt">Try typing a reference like <strong>Rom 8</strong>, <strong>Prov 24:16</strong>, or a keyword like <strong>wisdom</strong>.</div></div>`;
    return;
  }

  let html = "";
  const qLow = val.trim().toLowerCase();
  if (qLow === "selah") {
    html += `<div class="search-hit" id="hit-enter-selah"><div class="search-hit-ref">Selah &mdash; Quiet Focus Mode</div><div class="search-hit-txt">Tap to fade out all menus and pause calmly in the Word.</div></div>`;
  } else if (qLow === "kairos" || qLow === "stones") {
    html += `<div class="search-hit" style="cursor:default;"><div class="search-hit-ref">Luke 19:40 &mdash; Even the stones will cry out</div><div class="search-hit-txt">Built with Hyares for Kaslorin &middot; Bible: Kairos Collection</div></div>`;
  }
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
  const selahHit = res.querySelector("#hit-enter-selah");
  if (selahHit) selahHit.onclick = () => { closeAllModals(); toggleSelah(true); };
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

  const nextItem = plan.days.find((d) => !done.has(d.day)) || plan.days[0];
  const bannerEl = document.getElementById("plan-next-banner");
  if (nextItem) {
    bannerEl.classList.remove("hidden");
    bannerEl.innerHTML = `<span><strong>Next Up &mdash; Day ${nextItem.day}:</strong> ${escapeHtml(nextItem.label)}</span><button id="btn-plan-next-go" class="pill pill-primary">Read Now</button>`;
    bannerEl.querySelector("#btn-plan-next-go").onclick = () => {
      closeAllModals();
      markReadToday();
      loadChapter(nextItem.bookId, nextItem.chapter);
    };
    setTimeout(() => {
      const targetRow = list.querySelector(`input[data-day="${nextItem.day}"]`)?.closest(".plan-day");
      if (targetRow) targetRow.scrollIntoView({ block: "center" });
    }, 20);
  }

  list.querySelectorAll("[data-open-b]").forEach((btn) => {
    btn.onclick = () => {
      closeAllModals();
      markReadToday();
      loadChapter(Number(btn.dataset.openB), Number(btn.dataset.openC));
    };
  });
}


function closeAllModals(fromPop = false) {
  document.querySelectorAll(".modal").forEach((m) => m.classList.add("hidden"));
  document.getElementById("slot-menu").classList.add("hidden");
  if (!fromPop && history.state && history.state.kairosModal) {
    history.back();
  }
}

function openModal(id) {
  document.querySelectorAll(".modal").forEach((m) => m.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  if (!history.state || !history.state.kairosModal) {
    history.pushState({ kairosModal: true }, "");
  }
}

async function init() {
  await invoke("ensure_ready");
  const boot = await invoke("get_bootstrap");
  document.getElementById("vault-splash")?.classList.add("hidden");
  state.translations = boot.translations;
  state.books = boot.books;
  state.prefs = boot.prefs;
  if (state.prefs.view_mode === "sheet") state.prefs.view_mode = "scroll";
  if (window.innerWidth <= 720 && window.innerHeight > window.innerWidth && state.prefs.view_mode === "cols") state.prefs.view_mode = "stack";
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
  document.getElementById("btn-daily-share").onclick = async () => {
    if (!state.dailyVerse) return;
    const dv = state.dailyVerse;
    const ref = `${dv.book_name} ${dv.chapter}:${dv.verse}`;
    const lines = state.prefs.slots
      .map((c) => dv.cells[c] ? `[${c}] ${cleanDisplayText(dv.cells[c])}` : "")
      .filter(Boolean)
      .join("\n\n");
    await shareOrCopy(ref, `${ref}\n\n${lines}`);
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
    openModal("modal-passage");
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

  document.getElementById("btn-pin-save").onclick = savePinFromPopup;
  document.getElementById("modal-pin-pop").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      savePinFromPopup();
    }
  });

  document.getElementById("tab-pins-view").onclick = () => { state.pinsTab = "pins"; renderPinsModal(); };
  document.getElementById("tab-recent-view").onclick = () => { state.pinsTab = "recent"; renderPinsModal(); };
  window.addEventListener("popstate", () => closeAllModals(true));
  document.getElementById("btn-pins").onclick = () => {
    renderPinsModal();
    openModal("modal-pins");
  };

  const openSearch = () => {
    populateSearchScope();
    openModal("modal-search");
    const inp = document.getElementById("search-input");
    inp.focus();
    inp.select();
    handleSearchInput();
  };
  document.getElementById("btn-jump").onclick = openSearch;
  document.getElementById("search-input").oninput = handleSearchInput;

  document.getElementById("btn-plan").onclick = () => {
    renderPlanModal();
    openModal("modal-plan");
  };
  document.getElementById("plan-select").onchange = async (e) => {
    state.prefs.active_plan = e.target.value;
    await persistPrefs();
    renderPlanModal();
  };


  const showImportReport = (rep) => {
    const box = document.getElementById("import-status");
    box.classList.remove("hidden");
    box.innerHTML = `<strong>[${escapeHtml(rep.code)}] ${escapeHtml(rep.name)}</strong><br>` +
      `Verified: ${rep.books_count}/66 books, ${rep.verses_count.toLocaleString()} verses<br>` +
      `<em>Gen 1:1:</em> ${escapeHtml(rep.gen1_1.slice(0, 90))}<br>` +
      `<em>John 3:16:</em> ${escapeHtml(rep.john3_16.slice(0, 90))}`;
  };

  if (document.getElementById("inp-import-file")) document.getElementById("inp-import-file").onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const box = document.getElementById("import-status");
    box.classList.remove("hidden");
    box.textContent = `Importing ${file.name}...`;
    try {
      const buf = await file.arrayBuffer();
      const rep = await invoke("import_bible_bytes", { filename: file.name, bytes: Array.from(new Uint8Array(buf)) });
      showImportReport(rep);
      const boot = await invoke("get_bootstrap");
      state.translations = boot.translations;
      showToast(`Added ${rep.code}!`);
    } catch (err) {
      box.textContent = `Import error: ${err}`;
    }
    e.target.value = "";
  };

  if (document.getElementById("btn-scan-dropin")) document.getElementById("btn-scan-dropin").onclick = async () => {
    const box = document.getElementById("import-status");
    box.classList.remove("hidden");
    box.textContent = "Scanning drop_in folder...";
    try {
      const [dir, reps] = await invoke("scan_drop_in");
      if (!reps.length) {
        box.innerHTML = `No SQLite/e-Sword files found in:<br><code>${escapeHtml(dir)}</code>`;
      } else {
        reps.forEach(showImportReport);
        const boot = await invoke("get_bootstrap");
        state.translations = boot.translations;
        showToast(`Imported ${reps.length} Bible(s)`);
      }
    } catch (err) {
      box.textContent = `Scan error: ${err}`;
    }
  };


  document.getElementById("btn-selah-mode").onclick = () => {
    closeAllModals();
    toggleSelah(true);
  };
  document.getElementById("btn-exit-selah").onclick = () => toggleSelah(false);


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

  document.getElementById("btn-prayer").onclick = () => {
    renderPrayerModal();
    openModal("modal-prayer");
  };
  document.getElementById("btn-add-prayer").onclick = async () => {
    const inp = document.getElementById("prayer-input");
    const txt = inp.value.trim();
    if (!txt) return;
    const attach = document.getElementById("prayer-attach-ref").checked;
    const ref = attach ? document.getElementById("prayer-cur-ref").textContent : null;
    if (!state.prefs.prayers) state.prefs.prayers = [];
    state.prefs.prayers.push({
      id: String(Date.now()),
      text: txt,
      scripture_ref: ref,
      answered: false,
      created_at: localDateKey(),
    });
    inp.value = "";
    await persistPrefs();
    renderPrayerModal();
    showToast("Prayer added");
  };
  document.getElementById("btn-export-prayers").onclick = async () => {
    const prayers = state.prefs.prayers || [];
    if (!prayers.length) { showToast("Prayer list is empty"); return; }
    const lines = prayers.map((p, idx) => {
      const box = p.answered ? "[Answered]" : "[Praying]";
      const ref = p.scripture_ref ? ` (${p.scripture_ref})` : "";
      return `${idx + 1}. ${box} ${p.created_at}${ref}\n   ${p.text}`;
    }).join("\n\n");
    await exportFileOrShare("kairos-prayer-list.txt", `KAIROS PRAYER LIST\n\n${lines}`);
  };

  document.getElementById("btn-export-pins").onclick = async () => {
    const pins = state.prefs.pins || [];
    const sub = state.pinFilter === "All" ? pins : pins.filter((p) => (p.folder || "General") === state.pinFilter);
    if (!sub.length) { showToast("No pins to export"); return; }
    const payload = JSON.stringify({ kairos_pins: 1, folder_filter: state.pinFilter, pins: sub }, null, 2);
    await exportFileOrShare(`kairos-pins-${state.pinFilter.toLowerCase()}.json`, payload);
  };
  document.getElementById("inp-import-pins").onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      const incoming = Array.isArray(obj.pins) ? obj.pins : [];
      if (!state.prefs.pins) state.prefs.pins = [];
      let added = 0;
      incoming.forEach((np) => {
        const dup = state.prefs.pins.some((x) =>
          x.book_id === np.book_id && x.chapter === np.chapter && x.verse === np.verse && (x.end_verse || null) === (np.end_verse || null) && (x.folder || "General") === (np.folder || "General")
        );
        if (!dup && np.book_id && np.chapter && np.verse) {
          state.prefs.pins.push(np);
          if (np.folder && !state.customFolders.includes(np.folder)) state.customFolders.push(np.folder);
          added++;
        }
      });
      await persistPrefs();
      applyThemeAndTypography();
      renderPinsModal();
      renderReader();
      showToast(`Imported ${added} pin(s)!`);
    } catch (_) {
      showToast("Invalid pins file");
    }
    e.target.value = "";
  };

  document.getElementById("btn-export-backup").onclick = async () => {
    const payload = JSON.stringify({ kairos_backup: 1, prefs: state.prefs }, null, 2);
    await exportFileOrShare(`kairos-backup-${localDateKey()}.json`, payload);
  };
  document.getElementById("inp-import-backup").onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      if (!obj.prefs || !Array.isArray(obj.prefs.slots)) throw new Error("bad");
      state.prefs = obj.prefs;
      await persistPrefs();
      applyThemeAndTypography();
      await loadChapter(state.prefs.book_id, state.prefs.chapter);
      showToast("Progress recovered!");
    } catch (_) {
      showToast("Invalid backup file");
    }
    e.target.value = "";
  };

  document.getElementById("btn-settings").onclick = () => {
    openModal("modal-settings");
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
  document.querySelectorAll("[data-font-pick]").forEach((btn) => {
    btn.onclick = async () => {
      state.prefs.font_style = btn.dataset.fontPick;
      state.prefs.slot_fonts = {};
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
  document.getElementById("wasd-slider").oninput = async (e) => {
    state.prefs.wasd_step = Number(e.target.value);
    applyThemeAndTypography();
    await persistPrefs();
  };
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

  const heldKeys = new Set();
  let glideRaf = null;
  let lastFrameTs = 0;

  function activeScrollTarget() {
    const openMod = Array.from(document.querySelectorAll(".modal")).find((m) => !m.classList.contains("hidden"));
    if (openMod) {
      let box = null;
      if (openMod.id === "modal-pins") {
        const rec = document.getElementById("recent-list");
        box = rec && !rec.classList.contains("hidden") ? rec : document.getElementById("pins-list");
      } else {
        if (openMod.id === "modal-study") { box = document.getElementById(state.studyTab === "xrefs" ? "study-xref-list" : "study-root-hits"); } else { box = openMod.querySelector(".plan-days, .settings-scroll, .search-results, .notepad-list, .passage-right"); }
      }
      return { el: box, isModal: true, allowWASD: true };
    }
    return { el: document.getElementById("ew-stage"), isModal: false, allowWASD: true };
  }

  function applyGlide(dx, dy) {
    const { el, isModal } = activeScrollTarget();
    if (dy !== 0) {
      if (isModal && el) {
        el.scrollTop += dy;
      } else if (!isModal && state.prefs.view_mode === "bubbles") {
        const card = document.querySelector(".bubble-card.selected, .bubble-card:hover") || document.querySelector(".bubble-card");
        if (card && card.scrollHeight > card.clientHeight + 4) {
          const before = card.scrollTop;
          card.scrollTop += dy;
          if (card.scrollTop === before) window.scrollBy(0, dy);
        } else {
          window.scrollBy(0, dy);
        }
      } else if (!isModal && el && state.prefs.view_mode === "scroll" && state.prefs.scroll_style !== "compact") {
        const before = el.scrollTop;
        el.scrollTop += dy;
        if (el.scrollTop === before) window.scrollBy(0, dy);
      } else if (!isModal) {
        window.scrollBy(0, dy);
      }
    }
    if (dx !== 0 && !isModal && el) {
      el.scrollLeft += dx;
    }
  }

  function glideLoop(now) {
    if (!heldKeys.size) { glideRaf = null; return; }
    const dt = lastFrameTs ? Math.min(0.05, (now - lastFrameTs) / 1000) : 0.016;
    lastFrameTs = now;
    const dist = ((state.prefs?.wasd_step || 220) * 3.4) * dt;
    const { el, isModal, allowWASD } = activeScrollTarget();

    let dy = 0, dx = 0;
    if ((allowWASD && heldKeys.has("w")) || heldKeys.has("arrowup")) dy -= dist;
    if ((allowWASD && heldKeys.has("s")) || heldKeys.has("arrowdown")) dy += dist;
    if (!isModal && el) {
      if (heldKeys.has("a")) dx -= dist * 1.25;
      if (heldKeys.has("d")) dx += dist * 1.25;
    }
    applyGlide(dx, dy);
    glideRaf = requestAnimationFrame(glideLoop);
  }

  function startGlide() {
    if (!glideRaf) { lastFrameTs = 0; glideRaf = requestAnimationFrame(glideLoop); }
  }

  window.addEventListener("blur", () => {
    heldKeys.clear();
    if (glideRaf) { cancelAnimationFrame(glideRaf); glideRaf = null; }
  });
  document.addEventListener("keyup", (e) => { heldKeys.delete(e.key.toLowerCase()); });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault(); openSearch(); return;
    }
    if (e.key === "Escape") {
      if (document.body.classList.contains("selah-active")) { toggleSelah(false); return; }
      closeAllModals(); return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && e.target.matches("input, textarea, select")) return;

    const k = e.key.toLowerCase();
    const { el, isModal } = activeScrollTarget();

    if (["w", "s", "arrowup", "arrowdown"].includes(k)) {
      e.preventDefault();
      heldKeys.add(k);
      startGlide();
      return;
    }
    if (!isModal && (k === "a" || k === "d")) {
      e.preventDefault();
      if (el) { heldKeys.add(k); startGlide(); }
      else if (!e.repeat) stepChapter(k === "a" ? -1 : 1);
      return;
    }
    if (!isModal && !e.repeat && (k === "q" || e.key === "ArrowLeft")) {
      e.preventDefault(); stepChapter(-1);
    } else if (!isModal && !e.repeat && (k === "e" || e.key === "ArrowRight")) {
      e.preventDefault(); stepChapter(1);
    }
  });

  // Dormant Gamepad Support (activates only when a controller connects)
  let padRaf = null;
  let lastPadTs = 0;
  let lastBumpTs = 0;
  function pollGamepad(now) {
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    if (!pads.length) { padRaf = null; return; }
    const dt = lastPadTs ? Math.min(0.05, (now - lastPadTs) / 1000) : 0.016;
    lastPadTs = now;
    const p = pads[0];
    const ax = Math.abs(p.axes[0] || 0) > 0.2 ? p.axes[0] : 0;
    const ay = Math.abs(p.axes[1] || 0) > 0.2 ? p.axes[1] : 0;
    const dx = ax + (p.buttons[15]?.pressed ? 1 : 0) - (p.buttons[14]?.pressed ? 1 : 0);
    const dy = ay + (p.buttons[13]?.pressed ? 1 : 0) - (p.buttons[12]?.pressed ? 1 : 0);
    const speed = (state.prefs?.wasd_step || 220) * 3.4 * dt;
    if (dx !== 0 || dy !== 0) applyGlide(dx * speed * 1.2, dy * speed);
    if (now - lastBumpTs > 280) {
      if (p.buttons[4]?.pressed) { stepChapter(-1); lastBumpTs = now; }
      else if (p.buttons[5]?.pressed) { stepChapter(1); lastBumpTs = now; }
    }
    padRaf = requestAnimationFrame(pollGamepad);
  }
  window.addEventListener("gamepadconnected", () => {
    showToast("Controller connected");
    if (!padRaf) { lastPadTs = 0; padRaf = requestAnimationFrame(pollGamepad); }
  });
}

init();
