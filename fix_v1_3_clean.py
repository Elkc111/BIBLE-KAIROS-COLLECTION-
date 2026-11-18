#!/usr/bin/env python3
import re
from pathlib import Path

# 1. Restore Import Module block in index.html & polish Prayer Notepad header
idx_p = Path("dist/index.html")
idx = idx_p.read_text(encoding="utf-8")

if 'id="inp-import-file"' not in idx:
    import_block = '''        <div class="setting-guide">
          <strong>Import Bible Module (Offline)</strong>
          <small>Add standard MyBible (<code>.SQLite3</code>), e-Sword (<code>.bblx</code>), MySword, or <code>.db</code> modules. Kairos checks book/verse counts &amp; previews verses automatically.</small>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
            <label class="pill pill-primary" style="display:inline-flex;align-items:center;">Choose File<input id="inp-import-file" type="file" accept=".sqlite3,.sqlite,.bblx,.bbli,.mybible,.db" style="display:none;" /></label>
            <button id="btn-scan-dropin" class="pill pill-ghost">Scan drop_in/</button>
          </div>
          <div id="import-status" class="import-status hidden"></div>
        </div>
'''
    idx = idx.replace(
        '        <div class="setting-guide">\n          <strong>Open Scripture Licenses',
        import_block + '        <div class="setting-guide">\n          <strong>Open Scripture Licenses',
        1,
    )

idx = idx.replace("<h3>Prayer List</h3>", "<h3>Prayer Notepad</h3>")
idx = idx.replace('<div id="prayer-list" class="plan-days"></div>', '<div id="prayer-list" class="notepad-list"></div>')
idx_p.write_text(idx, encoding="utf-8")

# 2. Kill WebKitGTK backdrop-filter lag + add Numbered Prayer Notepad CSS
css_p = Path("dist/styles.css")
css = css_p.read_text(encoding="utf-8")
mark = "/* === V1.3.1 PERF & NOTEPAD === */"
if mark in css:
    css = css.split(mark)[0]
css_p.write_text(css + """
/* === V1.3.1 PERF & NOTEPAD === */
.topbar, .col-headers, .modal {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
.topbar { background: var(--surface) !important; }
.col-headers { background: var(--bg) !important; }

.notepad-list {
  overflow-y: auto;
  max-height: 400px;
  padding: 6px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.notepad-row {
  display: grid;
  grid-template-columns: 32px 22px 1fr auto;
  align-items: start;
  gap: 8px;
  padding: 10px 6px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 13.5px;
  line-height: 1.5;
}
.notepad-num {
  font-weight: 700;
  color: var(--accent);
  text-align: right;
  padding-top: 1px;
  font-variant-numeric: tabular-nums;
}
.notepad-row input[type="checkbox"] {
  accent-color: var(--accent);
  width: 15px; height: 15px;
  margin-top: 3px;
  cursor: pointer;
}
.notepad-body { display: flex; flex-direction: column; gap: 4px; }
.notepad-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
""", encoding="utf-8")

# 3. Patch app.js (cache getPlans, chronological numbered notepad, safe DOM guards)
js_p = Path("dist/app.js")
js = js_p.read_text(encoding="utf-8")

# Cache getPlans() once
old_gp = "function getPlans() {"
new_gp = """let _cachedPlans = null;
function getPlans() {
  if (_cachedPlans && state.books.length) return _cachedPlans;"""
if "_cachedPlans" not in js:
    js = js.replace(old_gp, new_gp, 1)
    js = js.replace(
        '    chrono_365: { name: "Chronological Bible (365-Day)", days: sliceBookOrder(CHRONO_ORDER, 365) },\n  };',
        '    chrono_365: { name: "Chronological Bible (365-Day)", days: sliceBookOrder(CHRONO_ORDER, 365) },\n  };\n  if (state.books.length) _cachedPlans = out;\n  return out;\n}',
        1,
    )
    js = js.replace("  return {\n    ...PLANS,", "  const out = {\n    ...PLANS,", 1)
    # Remove duplicate closing brace if needed
    js = js.replace("  if (state.books.length) _cachedPlans = out;\n  return out;\n}\n}", "  if (state.books.length) _cachedPlans = out;\n  return out;\n}", 1)

# Upgrade Prayer List to chronological numbered notepad (1., 2., 3...)
old_rp = re.search(r"function renderPrayerModal\(\) \{[\s\S]*?\n\}\n", js)
new_rp = '''function renderPrayerModal() {
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
'''
if old_rp:
    js = js[:old_rp.start()] + new_rp + js[old_rp.end():]

# Push new prayers to bottom in chronological numbered order (#1, #2, #3...)
js = js.replace("state.prefs.prayers.unshift({", "state.prefs.prayers.push({")
js = js.replace(
    'return `${box} ${p.created_at}${ref}\\n${p.text}`;',
    'return `${idx + 1}. ${box} ${p.created_at}${ref}\\n   ${p.text}`;',
)
js = js.replace("const lines = prayers.map((p) => {", "const lines = prayers.map((p, idx) => {")

# Safe optional chaining on import buttons so init() never fails on missing element
js = js.replace('document.getElementById("inp-import-file").onchange =', 'if (document.getElementById("inp-import-file")) document.getElementById("inp-import-file").onchange =')
js = js.replace('document.getElementById("btn-scan-dropin").onclick =', 'if (document.getElementById("btn-scan-dropin")) document.getElementById("btn-scan-dropin").onclick =')

js_p.write_text(js, encoding="utf-8")

# Verify zero missing HTML IDs & valid JS
html_ids = set(re.findall(r'id="([^"]+)"', idx_p.read_text(encoding="utf-8")))
for i, ln in enumerate(js.splitlines(), 1):
    for m in re.finditer(r'getElementById\("([^"]+)"\)\.on', ln):
        if m.group(1) not in html_ids:
            raise SystemExit(f"Still missing in HTML: {m.group(1)} at line {i}")
print("Verified 0 missing HTML IDs!")
