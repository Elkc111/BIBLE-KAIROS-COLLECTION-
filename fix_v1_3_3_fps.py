#!/usr/bin/env python3
import re
from pathlib import Path

# 1. Restore native GPU compositing in main.rs
Path("src-tauri/src/main.rs").write_text('''#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    kairos_lib::run()
}
''', encoding="utf-8")

# 2. Trim expensive per-verse box-shadows for higher scroll FPS across Mint/Windows/Android
css_p = Path("dist/styles.css")
css = css_p.read_text(encoding="utf-8")
mark = "/* === V1.3.3 60FPS SCROLL === */"
if mark in css:
    css = css.split(mark)[0]
css_p.write_text(css + """
/* === V1.3.3 60FPS SCROLL === */
.ribbon-cell, .bubble-card, .verse-row { box-shadow: none !important; }
""", encoding="utf-8")

# 3. Replace keydown handler with silky 60fps requestAnimationFrame WASD glide loop
js_p = Path("dist/app.js")
js = js_p.read_text(encoding="utf-8")

pat = re.compile(r'  document\.addEventListener\("keydown", \(e\) => \{[\s\S]*?\n\}\n\ninit\(\);')
new_block = '''  const heldKeys = new Set();
  let glideRaf = null;
  let lastFrameTs = 0;

  function activeScrollTarget() {
    const openMod = Array.from(document.querySelectorAll(".modal")).find((m) => !m.classList.contains("hidden"));
    if (openMod) {
      const box = openMod.querySelector(".plan-days, .settings-scroll, .search-results, .notepad-list, .passage-right");
      const allowWASD = openMod.id === "modal-plan" || openMod.id === "modal-settings";
      return { el: box, isModal: true, allowWASD };
    }
    const ew = document.getElementById("ew-stage");
    return { el: ew, isModal: false, allowWASD: true };
  }

  function glideLoop(now) {
    if (!heldKeys.size) {
      glideRaf = null;
      return;
    }
    const dt = lastFrameTs ? Math.min(0.05, (now - lastFrameTs) / 1000) : 0.016;
    lastFrameTs = now;

    const speed = (state.prefs?.wasd_step || 220) * 3.4;
    const dist = speed * dt;
    const { el, isModal, allowWASD } = activeScrollTarget();

    let dy = 0;
    let dx = 0;
    if ((allowWASD && heldKeys.has("w")) || heldKeys.has("arrowup")) dy -= dist;
    if ((allowWASD && heldKeys.has("s")) || heldKeys.has("arrowdown")) dy += dist;
    if (!isModal && el) {
      if (heldKeys.has("a")) dx -= dist * 1.2;
      if (heldKeys.has("d")) dx += dist * 1.2;
    }

    if (dy !== 0) {
      if (el && (isModal || (state.prefs.view_mode === "scroll" && state.prefs.scroll_style !== "compact"))) {
        el.scrollTop += dy;
      } else if (!isModal) {
        window.scrollBy(0, dy);
      }
    }
    if (dx !== 0 && el) {
      el.scrollLeft += dx;
    }

    glideRaf = requestAnimationFrame(glideLoop);
  }

  function startGlide() {
    if (!glideRaf) {
      lastFrameTs = 0;
      glideRaf = requestAnimationFrame(glideLoop);
    }
  }

  window.addEventListener("blur", () => {
    heldKeys.clear();
    if (glideRaf) { cancelAnimationFrame(glideRaf); glideRaf = null; }
  });

  document.addEventListener("keyup", (e) => {
    heldKeys.delete(e.key.toLowerCase());
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openSearch();
      return;
    }
    if (e.key === "Escape") {
      if (document.body.classList.contains("selah-active")) { toggleSelah(false); return; }
      closeAllModals();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target && e.target.matches("input, textarea, select")) return;

    const k = e.key.toLowerCase();
    const { el, isModal, allowWASD } = activeScrollTarget();

    if (["w", "s", "arrowup", "arrowdown"].includes(k)) {
      if (!isModal || allowWASD || k.startsWith("arrow")) {
        e.preventDefault();
        heldKeys.add(k);
        startGlide();
      }
      return;
    }
    if (!isModal && (k === "a" || k === "d")) {
      e.preventDefault();
      if (el) {
        heldKeys.add(k);
        startGlide();
      } else if (!e.repeat) {
        stepChapter(k === "a" ? -1 : 1);
      }
      return;
    }
    if (!isModal && !e.repeat && (k === "q" || e.key === "ArrowLeft")) {
      e.preventDefault();
      stepChapter(-1);
    } else if (!isModal && !e.repeat && (k === "e" || e.key === "ArrowRight")) {
      e.preventDefault();
      stepChapter(1);
    }
  });
}

init();'''

assert pat.search(js), "Could not locate keydown block in dist/app.js"
js_p.write_text(pat.sub(new_block, js, count=1), encoding="utf-8")
print("60fps WASD glide & GPU compositing restored!")
