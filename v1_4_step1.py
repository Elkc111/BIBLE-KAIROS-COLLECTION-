#!/usr/bin/env python3
import re
from pathlib import Path

lib_p = Path("src-tauri/src/lib.rs")
lib = lib_p.read_text(encoding="utf-8")

if "study: Mutex<Option<Connection>>" not in lib:
    lib = lib.replace("    vault: Mutex<Option<Connection>>,\n", "    vault: Mutex<Option<Connection>>,\n    study: Mutex<Option<Connection>>,\n", 1)
    lib = lib.replace('fn default_scroll_style() -> String { "ribbon".to_string() }', 'fn default_scroll_style() -> String { "ribbon".to_string() }\nfn default_color_strands() -> bool { true }', 1)
    lib = re.sub(r"(struct UserPrefs \{[\s\S]*?)(\n\})", r'\1\n    #[serde(default = "default_color_strands")]\n    color_strands: bool,\2', lib, count=1)
    lib = re.sub(r"(fn default_prefs[\s\S]*?UserPrefs \{[\s\S]*?)(,?\s*\n?\s*\})", r"\1, color_strands: true\2", lib, count=1)
    lib = lib.replace(
        "    *state.vault.lock().map_err(|e| e.to_string())? = Some(v_conn);",
        """    *state.vault.lock().map_err(|e| e.to_string())? = Some(v_conn);
    for sp in [PathBuf::from("/home/kaslorin/Desktop/Letah stuff/BIBLE/study_vault.db"), state.data_dir.join("study_vault.db")] {
        if sp.exists() {
            if let Ok(sc) = Connection::open_with_flags(&sp, OpenFlags::SQLITE_OPEN_READ_ONLY) {
                *state.study.lock().map_err(|e| e.to_string())? = Some(sc);
                break;
            }
        }
    }""",
        1,
    )
    lib = lib.replace("                vault: Mutex::new(None),\n", "                vault: Mutex::new(None),\n                study: Mutex::new(None),\n", 1)

if "fn get_verse_study(" not in lib:
    study_code = r'''
#[derive(Serialize)]
struct XrefHit { to_b: i64, to_c: i64, to_vs: i64, to_ve: i64, to_book_name: String, votes: i64, previews: HashMap<String, String> }

#[derive(Serialize)]
struct VerseWordItem { pos: i64, word_orig: String, translit: String, gloss: String, strong_id: String, meaning: String }

#[derive(Serialize)]
struct StudyPayload { available: bool, xrefs: Vec<XrefHit>, words: Vec<VerseWordItem> }

#[tauri::command]
async fn get_verse_study(state: State<'_, AppState>, book_id: i64, chapter: i64, verse: i64, translations: Vec<String>, min_votes: i64) -> Result<StudyPayload, String> {
    let s_guard = state.study.lock().map_err(|e| e.to_string())?;
    let Some(study) = s_guard.as_ref() else {
        return Ok(StudyPayload { available: false, xrefs: vec![], words: vec![] });
    };
    let v_guard = state.vault.lock().map_err(|e| e.to_string())?;
    let c_guard = state.custom.lock().map_err(|e| e.to_string())?;
    let vault = v_guard.as_ref().ok_or("Vault not initialized")?;
    let custom = c_guard.as_ref().ok_or("Custom vault not initialized")?;

    let books_map: HashMap<i64, String> = vault.prepare_cached("SELECT id, name FROM books").map_err(|e| e.to_string())?
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?))).map_err(|e| e.to_string())?
        .collect::<Result<HashMap<_, _>, _>>().map_err(|e| e.to_string())?;

    let mut x_stmt = study.prepare_cached("SELECT to_b, to_c, to_v_start, to_v_end, votes FROM xrefs WHERE from_b = ?1 AND from_c = ?2 AND from_v = ?3 AND votes >= ?4 ORDER BY votes DESC LIMIT 45").map_err(|e| e.to_string())?;
    let raw_xrefs: Vec<(i64, i64, i64, i64, i64)> = x_stmt.query_map((book_id, chapter, verse, min_votes), |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?))).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    let prev_sql = "SELECT v.text FROM verses v JOIN translations t ON t.id = v.translation_id WHERE v.book_id = ?1 AND v.chapter = ?2 AND v.verse = ?3 AND t.code = ?4";
    let mut v_prev = vault.prepare_cached(prev_sql).map_err(|e| e.to_string())?;
    let mut c_prev = custom.prepare_cached(prev_sql).map_err(|e| e.to_string())?;

    let mut xrefs = Vec::with_capacity(raw_xrefs.len());
    for (tb, tc, tvs, tve, votes) in raw_xrefs {
        let mut previews = HashMap::new();
        for code in &translations {
            if let Ok(txt) = v_prev.query_row((tb, tc, tvs, code), |r| r.get::<_, String>(0)) { previews.insert(code.clone(), txt); }
            else if let Ok(txt) = c_prev.query_row((tb, tc, tvs, code), |r| r.get::<_, String>(0)) { previews.insert(code.clone(), txt); }
        }
        xrefs.push(XrefHit { to_b: tb, to_c: tc, to_vs: tvs, to_ve: tve, to_book_name: books_map.get(&tb).cloned().unwrap_or_default(), votes, previews });
    }

    let mut w_stmt = study.prepare_cached("SELECT w.pos, w.word_orig, w.translit, w.gloss, w.strong_id, COALESCE(l.meaning, w.gloss) FROM verse_words w LEFT JOIN lexicon l ON l.strong_id = w.strong_id WHERE w.book_id = ?1 AND w.chapter = ?2 AND w.verse = ?3 ORDER BY w.pos ASC").map_err(|e| e.to_string())?;
    let words: Vec<VerseWordItem> = w_stmt.query_map((book_id, chapter, verse), |r| Ok(VerseWordItem { pos: r.get(0)?, word_orig: r.get(1)?, translit: r.get(2)?, gloss: r.get(3)?, strong_id: r.get(4)?, meaning: r.get(5)? })).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    Ok(StudyPayload { available: true, xrefs, words })
}

#[tauri::command]
async fn get_strongs_occurrences(state: State<'_, AppState>, strong_id: String, translation_code: String, limit: Option<i64>) -> Result<Vec<SearchHit>, String> {
    let s_guard = state.study.lock().map_err(|e| e.to_string())?;
    let Some(study) = s_guard.as_ref() else { return Ok(vec![]); };
    let v_guard = state.vault.lock().map_err(|e| e.to_string())?;
    let c_guard = state.custom.lock().map_err(|e| e.to_string())?;
    let vault = v_guard.as_ref().ok_or("Vault not initialized")?;
    let custom = c_guard.as_ref().ok_or("Custom vault not initialized")?;
    let lim = limit.unwrap_or(35).min(80);

    let books_map: HashMap<i64, String> = vault.prepare_cached("SELECT id, name FROM books").map_err(|e| e.to_string())?.query_map([], |r| Ok((r.get(0)?, r.get(1)?))).map_err(|e| e.to_string())?.collect::<Result<HashMap<_, _>, _>>().map_err(|e| e.to_string())?;
    let mut st = study.prepare_cached("SELECT DISTINCT book_id, chapter, verse FROM verse_words WHERE strong_id = ?1 ORDER BY book_id, chapter, verse LIMIT ?2").map_err(|e| e.to_string())?;
    let refs: Vec<(i64, i64, i64)> = st.query_map((&strong_id, lim), |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;

    let sql = "SELECT v.text FROM verses v JOIN translations t ON t.id = v.translation_id WHERE v.book_id = ?1 AND v.chapter = ?2 AND v.verse = ?3 AND t.code = ?4";
    let mut v_st = vault.prepare_cached(sql).map_err(|e| e.to_string())?;
    let mut c_st = custom.prepare_cached(sql).map_err(|e| e.to_string())?;
    let mut hits = Vec::with_capacity(refs.len());
    for (b, c, v) in refs {
        let txt = v_st.query_row((b, c, v, &translation_code), |r| r.get::<_, String>(0)).or_else(|_| c_st.query_row((b, c, v, &translation_code), |r| r.get::<_, String>(0))).unwrap_or_default();
        hits.push(SearchHit { book_id: b, book_name: books_map.get(&b).cloned().unwrap_or_default(), chapter: c, verse: v, text: txt });
    }
    Ok(hits)
}

#[tauri::command]
fn export_binary_file(app: AppHandle, state: State<AppState>, filename: String, bytes: Vec<u8>) -> Result<String, String> {
    let dir = app.path().download_dir().unwrap_or_else(|_| state.data_dir.clone());
    let _ = std::fs::create_dir_all(&dir);
    let safe_name: String = filename.chars().map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' }).collect();
    let target = dir.join(safe_name);
    std::fs::write(&target, &bytes).map_err(|e| e.to_string())?;
    Ok(target.display().to_string())
}
'''
    lib = lib.replace("#[cfg_attr(mobile, tauri::mobile_entry_point)]", study_code + "\n#[cfg_attr(mobile, tauri::mobile_entry_point)]", 1)
    lib = lib.replace("            export_text_file\n        ])", "            export_text_file,\n            get_verse_study,\n            get_strongs_occurrences,\n            export_binary_file\n        ])", 1)

lib_p.write_text(lib, encoding="utf-8")

idx_p = Path("dist/index.html")
idx = idx_p.read_text(encoding="utf-8")
if 'id="modal-study"' not in idx:
    idx = idx.replace("  <!-- Reading Plans Drawer -->", '''  <div id="modal-study" class="modal hidden">
    <div class="modal-card study-card">
      <div class="modal-head">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <h3 id="study-title">Connections</h3>
          <div class="testament-tabs">
            <button id="tab-study-xrefs" class="tab-btn active">Cross-Refs &amp; Arcs</button>
            <button id="tab-study-words" class="tab-btn">Original Words</button>
          </div>
        </div>
        <button class="close-btn" data-close="modal-study">&times;</button>
      </div>
      <div id="study-xrefs-pane" class="study-pane">
        <div class="study-controls">
          <div class="segmented">
            <button id="btn-xref-best" class="seg-btn active">Best (4+ votes)</button>
            <button id="btn-xref-all" class="seg-btn">All Links</button>
          </div>
          <label class="prayer-attach"><input id="toggle-color-strands" type="checkbox" checked /> Color Strands</label>
          <button id="btn-save-verse-card" class="pill pill-primary" style="font-size:12px;">Save Verse Card (PNG)</button>
        </div>
        <div id="study-arc-wrap" class="study-arc-wrap"></div>
        <div id="study-xref-list" class="study-list"></div>
      </div>
      <div id="study-words-pane" class="study-pane hidden">
        <div id="study-words-strip" class="study-words-strip"></div>
        <div id="study-lex-detail" class="study-lex-detail"></div>
        <div id="study-root-hits" class="study-list"></div>
      </div>
    </div>
  </div>\n\n  <!-- Reading Plans Drawer -->''', 1)
if "OpenBible.info" not in idx:
    idx = idx.replace("OEB, WEB &amp; KJV (Public Domain).", "OEB, WEB &amp; KJV (Public Domain) &middot; Cross-Refs: OpenBible.info &amp; trekhleb/bible-cross-references (CC BY 4.0 / MIT) &middot; Hebrew/Greek: STEPBible.org (CC BY 4.0).", 1)
idx_p.write_text(idx, encoding="utf-8")

css_p = Path("dist/styles.css")
css = css_p.read_text(encoding="utf-8")
mark = "/* === V1.4 STUDY ENGINE === */"
if mark in css:
    css = css.split(mark)[0]
css_p.write_text(css + """
/* === V1.4 STUDY ENGINE === */
.study-card { width: 780px; max-width: 96vw; height: 84vh; max-height: 86vh; }
.study-pane { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.study-controls { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--border-subtle); }
.study-arc-wrap { padding: 8px 16px 4px; border-bottom: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--bg) 55%, transparent); }
.arc-legend { display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); padding: 2px 4px 4px; }
.study-list { overflow-y: auto; min-height: 0; flex: 1; padding: 10px 16px; display: flex; flex-direction: column; gap: 8px; }
.xref-item { padding: 10px 12px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border-subtle); cursor: pointer; }
.xref-item:hover { border-color: var(--accent); }
.xref-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.xref-ref { font-size: 13px; font-weight: 700; color: var(--accent); }
.xref-votes { font-size: 11px; color: var(--text-muted); }
.xref-prev { font-family: var(--font-reader); font-size: 13.5px; line-height: 1.5; color: var(--text); margin-top: 3px; }
.xref-prev b { font-family: var(--font-sans); font-size: 11px; color: var(--text-muted); margin-right: 6px; }
.study-words-strip { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); max-height: 175px; overflow-y: auto; }
.word-chip { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 7px 11px; border-radius: 9px; background: var(--surface-2); border: 1px solid var(--border-subtle); cursor: pointer; color: var(--text); }
.word-chip:hover, .word-chip.active { border-color: var(--accent); background: var(--accent-soft); }
.word-orig { font-size: 16px; font-weight: 600; color: var(--accent); }
.word-trans { font-size: 11px; font-style: italic; color: var(--text-muted); }
.word-gloss { font-size: 11.5px; color: var(--text); }
.study-lex-detail { padding: 10px 16px; border-bottom: 1px solid var(--border-subtle); font-size: 13px; line-height: 1.5; background: color-mix(in srgb, var(--surface-2) 60%, transparent); }
""", encoding="utf-8")

print("v1.4 Step 1 ready!")
