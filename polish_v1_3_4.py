#!/usr/bin/env python3
import re
from pathlib import Path

# 1. Support translation_code == "ALL" in Rust search_verses
lib_p = Path("src-tauri/src/lib.rs")
lib = lib_p.read_text(encoding="utf-8")

new_search = r'''#[tauri::command]
fn search_verses(state: State<AppState>, query: String, translation_code: String, limit: Option<i64>) -> Result<Vec<SearchHit>, String> {
    let v_guard = state.vault.lock().map_err(|e| e.to_string())?;
    let c_guard = state.custom.lock().map_err(|e| e.to_string())?;
    let vault = v_guard.as_ref().ok_or("Vault not initialized")?;
    let custom = c_guard.as_ref().ok_or("Custom vault not initialized")?;
    let q = query.trim();
    if q.is_empty() { return Ok(vec![]); }
    let lim = limit.unwrap_or(50).min(150);

    let sanitized: String = q.split_whitespace().map(|w| format!(r#""{}""#, w.replace('"', ""))).collect::<Vec<_>>().join(" ");
    if translation_code == "ALL" {
        let mut stmt = vault.prepare("SELECT v.book_id, b.name || ' [' || t.code || ']', v.chapter, v.verse, v.text FROM verses_fts f JOIN verses v ON v.id = f.rowid JOIN translations t ON t.id = v.translation_id JOIN books b ON b.id = v.book_id WHERE f.text MATCH ?1 ORDER BY v.book_id, v.chapter, v.verse, t.id LIMIT ?2").map_err(|e| e.to_string())?;
        let hits = stmt.query_map((&sanitized, lim), |r| Ok(SearchHit { book_id: r.get(0)?, book_name: r.get(1)?, chapter: r.get(2)?, verse: r.get(3)?, text: r.get(4)? }))
            .map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        return Ok(hits);
    }

    let in_vault: bool = vault.query_row("SELECT EXISTS(SELECT 1 FROM translations WHERE code = ?1)", (&translation_code,), |r| r.get(0)).unwrap_or(false);
    if in_vault {
        let mut stmt = vault.prepare("SELECT v.book_id, b.name, v.chapter, v.verse, v.text FROM verses_fts f JOIN verses v ON v.id = f.rowid JOIN translations t ON t.id = v.translation_id JOIN books b ON b.id = v.book_id WHERE f.text MATCH ?1 AND t.code = ?2 ORDER BY v.book_id, v.chapter, v.verse LIMIT ?3").map_err(|e| e.to_string())?;
        let hits = stmt.query_map((&sanitized, &translation_code, lim), |r| Ok(SearchHit { book_id: r.get(0)?, book_name: r.get(1)?, chapter: r.get(2)?, verse: r.get(3)?, text: r.get(4)? }))
            .map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
        return Ok(hits);
    }

    let books_map: HashMap<i64, String> = vault.prepare("SELECT id, name FROM books").map_err(|e| e.to_string())?
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?))).map_err(|e| e.to_string())?
        .collect::<Result<HashMap<_, _>, _>>().map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", q);
    let mut stmt = custom.prepare("SELECT v.book_id, v.chapter, v.verse, v.text FROM verses v JOIN translations t ON t.id = v.translation_id WHERE t.code = ?1 AND v.text LIKE ?2 ORDER BY v.book_id, v.chapter, v.verse LIMIT ?3").map_err(|e| e.to_string())?;
    let hits = stmt.query_map((&translation_code, &pattern, lim), |r| {
        let bid: i64 = r.get(0)?;
        Ok(SearchHit { book_id: bid, book_name: books_map.get(&bid).cloned().unwrap_or_default(), chapter: r.get(1)?, verse: r.get(2)?, text: r.get(3)? })
    }).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    Ok(hits)
}
'''
lib = re.sub(r"#\[tauri::command\]\nfn search_verses\([\s\S]*?\n\}\n", new_search, lib, count=1)
lib_p.write_text(lib, encoding="utf-8")

# 2. Make search scope a clickable dropdown in index.html
idx_p = Path("dist/index.html")
idx = idx_p.read_text(encoding="utf-8")
idx = idx.replace(
    '<span id="search-scope" class="search-scope">in BSB</span>',
    '<select id="search-scope" class="search-scope-sel"></select>',
    1,
)
idx_p.write_text(idx, encoding="utf-8")

# 3. CSS: color-scheme for dropdown legibility, remove Bubbles scroll-snap fight, search scope style
css_p = Path("dist/styles.css")
css = css_p.read_text(encoding="utf-8")
mark = "/* === V1.3.4 POLISH === */"
if mark in css:
    css = css.split(mark)[0]
css_p.write_text(css + """
/* === V1.3.4 POLISH === */
:root, html[data-theme="slate"], html[data-theme="cedar"], html[data-theme="indigo"], html[data-theme="plum"], html[data-theme="crimson"] {
  color-scheme: dark;
}
html[data-theme="parchment"], html[data-theme="wood"], html[data-theme="stone"], html[data-theme="terracotta"] {
  color-scheme: light;
}
.slot-font-box select, .search-scope-sel {
  background-color: var(--surface-2) !important;
  color: var(--text) !important;
}
.search-scope-sel {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--accent) !important;
  outline: none;
}
.bubbles-stage { scroll-snap-type: none !important; }
""", encoding="utf-8")

# 4. Patch app.js: Pin xN counter, Search scope dropdown, Modal+Bubble WASD, Mark 15 top scroll, Gamepad
js_p = Path("dist/app.js")
js = js_p.read_text(encoding="utf-8")

js = js.replace("  pinsTab: \"pins\",\n", "  pinsTab: \"pins\",\n  searchScope: null,\n", 1)

old_act = re.search(r"function actionButtonsHtml\(verseNum\) \{[\s\S]*?\n\}", js)
new_act = '''function countPinsFor(bookId, chapter, verse) {
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
    </div>
  `;
}'''
assert old_act, "actionButtonsHtml not found"
js = js[:old_act.start()] + new_act + js[old_act.end():]

# Search scope selector
old_hs = re.search(r"async function handleSearchInput\(\) \{[\s\S]*?const primary = state\.prefs\.slots\[0\];\n  document\.getElementById\(\"search-scope\"\)\.textContent = `in \$\{primary\}`;", js)
new_hs = '''function populateSearchScope() {
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
  const primary = state.searchScope || state.prefs.slots[0];'''
assert old_hs, "handleSearchInput header not found"
js = js[:old_hs.start()] + new_hs + js[old_hs.end():]

js = js.replace(
    '  const openSearch = () => {\n    openModal("modal-search");',
    '  const openSearch = () => {\n    populateSearchScope();\n    openModal("modal-search");',
    1,
)

# Replace keydown/glide block cleanly (Modal WASD everywhere, Bubbles A/D+W/S, Mark 15 top scroll, Gamepad)
pat = re.compile(r'  const heldKeys = new Set\(\);[\s\S]*?\n\}\n\ninit\(\);')
new_glide = '''  const heldKeys = new Set();
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
        box = openMod.querySelector(".plan-days, .settings-scroll, .search-results, .notepad-list, .passage-right");
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

init();'''
assert pat.search(js), "glide block not found"
js_p.write_text(pat.sub(new_glide, js, count=1), encoding="utf-8")

# 5. Trim build-linux from GitHub Actions to save free minutes (Windows + Android only)
wf_p = Path(".github/workflows/build.yml")
wf = wf_p.read_text(encoding="utf-8")
wf = re.sub(r"  build-linux:[\s\S]*?(?=  build-android:)", "", wf)
wf = wf.replace("name: Build Windows, Android & Linux", "name: Build Windows & Android")
wf_p.write_text(wf, encoding="utf-8")

print("v1.3.4 polish & CI trim applied cleanly!")
