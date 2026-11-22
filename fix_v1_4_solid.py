#!/usr/bin/env python3
import re, sqlite3
from pathlib import Path

BASE = Path("/home/kaslorin/Desktop/Letah stuff/BIBLE")
STUDY_DB = BASE / "study_vault.db"

# 1. Verify study_vault.db
assert STUDY_DB.exists(), f"Missing {STUDY_DB}!"
sc = sqlite3.connect(STUDY_DB)
xc = sc.execute("SELECT COUNT(*) FROM xrefs").fetchone()[0]
wc = sc.execute("SELECT COUNT(*) FROM verse_words").fetchone()[0]
sc.close()
print(f"study_vault.db OK: {xc:,} xrefs, {wc:,} word roots")

# 2. Optimize get_verse_study & get_strongs_occurrences in lib.rs (async + single prepared stmt)
lib_p = Path("src-tauri/src/lib.rs")
lib = lib_p.read_text(encoding="utf-8")
assert "fn get_verse_study(" in lib, "Run v1_4_part1.py first — get_verse_study missing from lib.rs"

fast_study = r'''#[tauri::command]
async fn get_verse_study(
    state: State<'_, AppState>,
    book_id: i64,
    chapter: i64,
    verse: i64,
    translations: Vec<String>,
    min_votes: i64,
) -> Result<StudyPayload, String> {
    let s_guard = state.study.lock().map_err(|e| e.to_string())?;
    let Some(study) = s_guard.as_ref() else {
        return Ok(StudyPayload { available: false, xrefs: vec![], words: vec![] });
    };
    let v_guard = state.vault.lock().map_err(|e| e.to_string())?;
    let c_guard = state.custom.lock().map_err(|e| e.to_string())?;
    let vault = v_guard.as_ref().ok_or("Vault not initialized")?;
    let custom = c_guard.as_ref().ok_or("Custom vault not initialized")?;

    let books_map: HashMap<i64, String> = vault
        .prepare_cached("SELECT id, name FROM books")
        .map_err(|e| e.to_string())?
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<HashMap<_, _>, _>>()
        .map_err(|e| e.to_string())?;

    let mut x_stmt = study
        .prepare_cached(
            "SELECT to_b, to_c, to_v_start, to_v_end, votes
             FROM xrefs
             WHERE from_b = ?1 AND from_c = ?2 AND from_v = ?3 AND votes >= ?4
             ORDER BY votes DESC
             LIMIT 45",
        )
        .map_err(|e| e.to_string())?;

    let raw_xrefs: Vec<(i64, i64, i64, i64, i64)> = x_stmt
        .query_map((book_id, chapter, verse, min_votes), |r| {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let prev_sql = "SELECT v.text FROM verses v JOIN translations t ON t.id = v.translation_id WHERE v.book_id = ?1 AND v.chapter = ?2 AND v.verse = ?3 AND t.code = ?4";
    let mut v_prev = vault.prepare_cached(prev_sql).map_err(|e| e.to_string())?;
    let mut c_prev = custom.prepare_cached(prev_sql).map_err(|e| e.to_string())?;

    let mut xrefs = Vec::with_capacity(raw_xrefs.len());
    for (tb, tc, tvs, tve, votes) in raw_xrefs {
        let mut previews = HashMap::new();
        for code in &translations {
            if let Ok(txt) = v_prev.query_row((tb, tc, tvs, code), |r| r.get::<_, String>(0)) {
                previews.insert(code.clone(), txt);
            } else if let Ok(txt) = c_prev.query_row((tb, tc, tvs, code), |r| r.get::<_, String>(0)) {
                previews.insert(code.clone(), txt);
            }
        }
        xrefs.push(XrefHit {
            to_b: tb,
            to_c: tc,
            to_vs: tvs,
            to_ve: tve,
            to_book_name: books_map.get(&tb).cloned().unwrap_or_default(),
            votes,
            previews,
        });
    }

    let mut w_stmt = study
        .prepare_cached(
            "SELECT w.pos, w.word_orig, w.translit, w.gloss, w.strong_id, COALESCE(l.meaning, w.gloss)
             FROM verse_words w
             LEFT JOIN lexicon l ON l.strong_id = w.strong_id
             WHERE w.book_id = ?1 AND w.chapter = ?2 AND w.verse = ?3
             ORDER BY w.pos ASC",
        )
        .map_err(|e| e.to_string())?;
    let words: Vec<VerseWordItem> = w_stmt
        .query_map((book_id, chapter, verse), |r| {
            Ok(VerseWordItem {
                pos: r.get(0)?,
                word_orig: r.get(1)?,
                translit: r.get(2)?,
                gloss: r.get(3)?,
                strong_id: r.get(4)?,
                meaning: r.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(StudyPayload { available: true, xrefs, words })
}

#[tauri::command]
async fn get_strongs_occurrences(
    state: State<'_, AppState>,
    strong_id: String,
    translation_code: String,
    limit: Option<i64>,
) -> Result<Vec<SearchHit>, String> {
    let s_guard = state.study.lock().map_err(|e| e.to_string())?;
    let Some(study) = s_guard.as_ref() else {
        return Ok(vec![]);
    };
    let v_guard = state.vault.lock().map_err(|e| e.to_string())?;
    let c_guard = state.custom.lock().map_err(|e| e.to_string())?;
    let vault = v_guard.as_ref().ok_or("Vault not initialized")?;
    let custom = c_guard.as_ref().ok_or("Custom vault not initialized")?;
    let lim = limit.unwrap_or(35).min(80);

    let books_map: HashMap<i64, String> = vault
        .prepare_cached("SELECT id, name FROM books")
        .map_err(|e| e.to_string())?
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<HashMap<_, _>, _>>()
        .map_err(|e| e.to_string())?;

    let mut st = study
        .prepare_cached("SELECT DISTINCT book_id, chapter, verse FROM verse_words WHERE strong_id = ?1 ORDER BY book_id, chapter, verse LIMIT ?2")
        .map_err(|e| e.to_string())?;

    let refs: Vec<(i64, i64, i64)> = st
        .query_map((&strong_id, lim), |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let sql = "SELECT v.text FROM verses v JOIN translations t ON t.id = v.translation_id WHERE v.book_id = ?1 AND v.chapter = ?2 AND v.verse = ?3 AND t.code = ?4";
    let mut v_st = vault.prepare_cached(sql).map_err(|e| e.to_string())?;
    let mut c_st = custom.prepare_cached(sql).map_err(|e| e.to_string())?;
    let mut hits = Vec::with_capacity(refs.len());
    for (b, c, v) in refs {
        let txt = v_st
            .query_row((b, c, v, &translation_code), |r| r.get::<_, String>(0))
            .or_else(|_| c_st.query_row((b, c, v, &translation_code), |r| r.get::<_, String>(0)))
            .unwrap_or_default();
        hits.push(SearchHit {
            book_id: b,
            book_name: books_map.get(&b).cloned().unwrap_or_default(),
            chapter: c,
            verse: v,
            text: txt,
        });
    }
    Ok(hits)
}'''

pat_study = re.compile(r"#\[tauri::command\]\n(?:async )?fn get_verse_study\([\s\S]*?fn export_binary_file")
assert pat_study.search(lib), "Study functions block not found"
lib = pat_study.sub(fast_study + "\n\n#[tauri::command]\nfn export_binary_file", lib, count=1)
lib_p.write_text(lib, encoding="utf-8")

# 3. Verify index.html has modal-study
idx = Path("dist/index.html").read_text(encoding="utf-8")
assert 'id="modal-study"' in idx, "modal-study missing from index.html!"

# 4. Fix WebKitGTK flex height collapse on .study-card & .study-pane
css_p = Path("dist/styles.css")
css = css_p.read_text(encoding="utf-8")
mark = "/* === V1.4.1 STUDY PERF & FLEX FIX === */"
if mark in css:
    css = css.split(mark)[0]
css_p.write_text(css + """
/* === V1.4.1 STUDY PERF & FLEX FIX === */
.study-card {
  width: 780px;
  max-width: 96vw;
  height: 84vh;
  max-height: 86vh;
}
.study-pane { min-height: 0; flex: 1; display: flex; flex-direction: column; }
.study-list { min-height: 0; flex: 1; overflow-y: auto; }
""", encoding="utf-8")

# 5. Add loading & error guard in openStudyModal / refreshStudyData in app.js
js_p = Path("dist/app.js")
js = js_p.read_text(encoding="utf-8")
assert "function openStudyModal(" in js, "openStudyModal missing from app.js!"

old_refresh = '''async function refreshStudyData() {
  const payload = await invoke("get_verse_study", {
    bookId: state.studyBookId,
    chapter: state.studyChap,
    verse: state.studyVerse,
    translations: state.prefs.slots,
    minVotes: state.studyMinVotes,
  });
  state.studyData = payload;
  renderStudyModal();
}'''
new_refresh = '''async function refreshStudyData() {
  const list = document.getElementById("study-xref-list");
  if (list) list.innerHTML = `<div class="xref-item">Loading connections...</div>`;
  try {
    const payload = await invoke("get_verse_study", {
      bookId: state.studyBookId,
      chapter: state.studyChap,
      verse: state.studyVerse,
      translations: state.prefs.slots,
      minVotes: state.studyMinVotes,
    });
    state.studyData = payload;
    renderStudyModal();
  } catch (err) {
    if (list) list.innerHTML = `<div class="xref-item">Error loading connections: ${escapeHtml(String(err))}</div>`;
  }
}'''
if "Loading connections..." not in js and old_refresh in js:
    js = js.replace(old_refresh, new_refresh, 1)

# Verify zero missing HTML IDs
html_ids = set(re.findall(r'id="([^"]+)"', idx))
for i, ln in enumerate(js.splitlines(), 1):
    for m in re.finditer(r'getElementById\("([^"]+)"\)\.on', ln):
        if m.group(1) not in html_ids:
            raise SystemExit(f"Missing HTML ID in index.html: {m.group(1)} at line {i}")

js_p.write_text(js, encoding="utf-8")
print("v1.4.1 solid fix verified & applied!")
