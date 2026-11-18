#!/usr/bin/env python3
import re
from pathlib import Path

# 1. Add official Linux WebKitGTK DMA-BUF flicker guard in main.rs
main_p = Path("src-tauri/src/main.rs")
main_txt = main_p.read_text(encoding="utf-8")
if "WEBKIT_DISABLE_DMABUF_RENDERER" not in main_txt:
    main_p.write_text('''#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
    kairos_lib::run()
}
''', encoding="utf-8")

# 2. Add wasd_step to UserPrefs in lib.rs
lib_p = Path("src-tauri/src/lib.rs")
lib_txt = lib_p.read_text(encoding="utf-8")
if "wasd_step" not in lib_txt:
    lib_txt = lib_txt.replace(
        'fn default_scroll_style() -> String { "ribbon".to_string() }',
        'fn default_scroll_style() -> String { "ribbon".to_string() }\nfn default_wasd_step() -> i64 { 220 }',
        1,
    )
    lib_txt = lib_txt.replace(
        "    #[serde(default)]\n    prayers: Vec<PrayerItem>,\n}",
        "    #[serde(default)]\n    prayers: Vec<PrayerItem>,\n    #[serde(default = \"default_wasd_step\")]\n    wasd_step: i64,\n}",
        1,
    )
    lib_txt = lib_txt.replace(
        "        prayers: vec![],\n    }",
        "        prayers: vec![],\n        wasd_step: default_wasd_step(),\n    }",
        1,
    )
    lib_p.write_text(lib_txt, encoding="utf-8")

# 3. Restore Wood topbar background in styles.css (keep backdrop-filter off for speed)
css_p = Path("dist/styles.css")
css_txt = css_p.read_text(encoding="utf-8")
css_txt = css_txt.replace(
    ".topbar { background: var(--surface) !important; }",
    '.topbar { background: var(--surface); }\nhtml[data-theme="wood"] .topbar { background: linear-gradient(180deg, #825a37 0%, #684628 100%) !important; }',
)
css_p.write_text(css_txt, encoding="utf-8")

# 4. Add WASD Sensitivity Slider in index.html [Set]
idx_p = Path("dist/index.html")
idx_txt = idx_p.read_text(encoding="utf-8")
if 'id="wasd-slider"' not in idx_txt:
    old_ts = '''        <div class="setting-row">
          <span><strong>Text Size</strong> (<strong id="font-size-val">18px</strong>)</span>
          <input id="font-slider" type="range" min="15" max="24" value="18" />
        </div>'''
    # handle max="32"
    old_ts = old_ts.replace('max="24"', 'max="32"')
    new_ts = old_ts + '''
        <div class="setting-row">
          <span><strong>WASD Scroll Step</strong> (<strong id="wasd-step-val">220px</strong>)</span>
          <input id="wasd-slider" type="range" min="80" max="460" step="20" value="220" />
        </div>'''
    assert old_ts in idx_txt, "Text size block not found in index.html"
    idx_p.write_text(idx_txt.replace(old_ts, new_ts, 1), encoding="utf-8")

# 5. Patch app.js for WASD sensitivity + safe modal scrolling
js_p = Path("dist/app.js")
js_txt = js_p.read_text(encoding="utf-8")

if "wasd-slider" not in js_txt:
    js_txt = js_txt.replace(
        'document.getElementById("font-size-val").textContent = `${state.prefs.font_size}px`;',
        'document.getElementById("font-size-val").textContent = `${state.prefs.font_size}px`;\n  const ws = state.prefs.wasd_step || 220;\n  if (document.getElementById("wasd-slider")) document.getElementById("wasd-slider").value = ws;\n  if (document.getElementById("wasd-step-val")) document.getElementById("wasd-step-val").textContent = `${ws}px`;',
        1,
    )
    js_txt = js_txt.replace(
        'document.getElementById("font-slider").oninput = async (e) => {',
        '''document.getElementById("wasd-slider").oninput = async (e) => {
    state.prefs.wasd_step = Number(e.target.value);
    applyThemeAndTypography();
    await persistPrefs();
  };
  document.getElementById("font-slider").oninput = async (e) => {''',
        1,
    )

old_keys_tail = re.search(
    r'    if \(Array\.from\(document\.querySelectorAll\("\.modal"\)\)\.some[\s\S]*?    \} else if \(k === "e" \|\| e\.key === "ArrowRight"\) \{\s*e\.preventDefault\(\);\s*stepChapter\(1\);\s*\}',
    js_txt,
)
new_keys_tail = '''    const openMod = Array.from(document.querySelectorAll(".modal")).find((m) => !m.classList.contains("hidden"));
    const step = state.prefs?.wasd_step || 220;
    const k = e.key.toLowerCase();

    if (openMod) {
      const noTextPopup = openMod.id === "modal-plan" || openMod.id === "modal-settings";
      const scrollBox = openMod.querySelector(".plan-days, .settings-scroll, .search-results, .notepad-list, .passage-right");
      if (!scrollBox) return;
      if ((noTextPopup && k === "w") || e.key === "ArrowUp") {
        e.preventDefault();
        scrollBox.scrollBy({ top: -step, behavior: "smooth" });
      } else if ((noTextPopup && k === "s") || e.key === "ArrowDown") {
        e.preventDefault();
        scrollBox.scrollBy({ top: step, behavior: "smooth" });
      }
      return;
    }

    const ew = document.getElementById("ew-stage");
    const hStep = Math.round(step * 1.25);
    if (k === "w") {
      e.preventDefault();
      if (ew && state.prefs.view_mode === "scroll" && state.prefs.scroll_style !== "compact") {
        ew.scrollBy({ top: -step, behavior: "smooth" });
      } else {
        window.scrollBy({ top: -step, behavior: "smooth" });
      }
    } else if (k === "s") {
      e.preventDefault();
      if (ew && state.prefs.view_mode === "scroll" && state.prefs.scroll_style !== "compact") {
        ew.scrollBy({ top: step, behavior: "smooth" });
      } else {
        window.scrollBy({ top: step, behavior: "smooth" });
      }
    } else if (k === "a") {
      e.preventDefault();
      if (ew) ew.scrollBy({ left: -hStep, behavior: "smooth" });
      else stepChapter(-1);
    } else if (k === "d") {
      e.preventDefault();
      if (ew) ew.scrollBy({ left: hStep, behavior: "smooth" });
      else stepChapter(1);
    } else if (k === "q" || e.key === "ArrowLeft") {
      e.preventDefault();
      stepChapter(-1);
    } else if (k === "e" || e.key === "ArrowRight") {
      e.preventDefault();
      stepChapter(1);
    }'''
assert old_keys_tail, "old_keys_tail not found"
js_txt = js_txt[:old_keys_tail.start()] + new_keys_tail + js_txt[old_keys_tail.end():]
js_p.write_text(js_txt, encoding="utf-8")
print("Local v1.3.2 fixes applied!")
