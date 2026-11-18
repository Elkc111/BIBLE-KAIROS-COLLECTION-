use flate2::read::GzDecoder;
use rusqlite::{Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};
use std::io;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[cfg(any(target_os = "android", target_os = "windows"))]
const EMBEDDED_VAULT_GZ: &[u8] = include_bytes!("../resources/bible_vault.db.gz");

struct AppState {
    vault: Mutex<Option<Connection>>,
    custom: Mutex<Option<Connection>>,
    prefs: Mutex<Option<Connection>>,
    data_dir: PathBuf,
    resource_dir: Option<PathBuf>,
}

#[derive(Serialize)]
struct TranslationInfo {
    code: String,
    name: String,
}

#[derive(Serialize)]
struct BookInfo {
    id: i64,
    usfm_code: String,
    name: String,
    testament: String,
    chapters: i64,
}

#[derive(Serialize, Deserialize, Clone)]
struct PrayerItem {
    id: String,
    text: String,
    scripture_ref: Option<String>,
    answered: bool,
    created_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct HistoryEntry {
    book_id: i64,
    book_name: String,
    chapter: i64,
    verse: Option<i64>,
}

fn default_pin_folder() -> String {
    "General".to_string()
}

#[derive(Serialize, Deserialize, Clone)]
struct PinnedVerse {
    book_id: i64,
    book_name: String,
    chapter: i64,
    verse: i64,
    #[serde(default)]
    end_verse: Option<i64>,
    snippet: String,
    #[serde(default = "default_pin_folder")]
    folder: String,
}

fn default_font_style() -> String { "editorial".to_string() }
fn default_line_height() -> String { "balanced".to_string() }
fn default_color_code() -> bool { true }
fn default_scroll_style() -> String { "ribbon".to_string() }

#[derive(Serialize, Deserialize, Clone)]
struct UserPrefs {
    slots: Vec<String>,
    book_id: i64,
    chapter: i64,
    view_mode: String,
    #[serde(default = "default_scroll_style")]
    scroll_style: String,
    theme: String,
    font_size: i64,
    #[serde(default = "default_font_style")]
    font_style: String,
    #[serde(default = "default_line_height")]
    line_height: String,
    clean_pilcrow: bool,
    #[serde(default = "default_color_code")]
    color_code: bool,
    active_plan: String,
    completed_days: HashMap<String, Vec<i64>>,
    #[serde(default)]
    pins: Vec<PinnedVerse>,
    #[serde(default)]
    slot_fonts: HashMap<String, String>,
    #[serde(default)]
    daily_dismissed_date: Option<String>,
    #[serde(default = "default_pin_folder")]
    last_pin_folder: String,
    #[serde(default)]
    history: Vec<HistoryEntry>,
    #[serde(default)]
    prayers: Vec<PrayerItem>,
}

#[derive(Serialize)]
struct BootstrapData {
    translations: Vec<TranslationInfo>,
    books: Vec<BookInfo>,
    prefs: UserPrefs,
    last_read_date: Option<String>,
}

#[derive(Serialize, Clone)]
struct VerseCell {
    text: String,
    formatted_text: String,
    heading: Option<String>,
    para_start: i64,
    poetry_level: i64,
}

#[derive(Serialize)]
struct AlignedVerseRow {
    verse: i64,
    cells: HashMap<String, VerseCell>,
}

#[derive(Serialize)]
struct DailyVersePayload {
    book_id: i64,
    book_name: String,
    chapter: i64,
    verse: i64,
    cells: HashMap<String, String>,
}

#[derive(Serialize)]
struct SearchHit {
    book_id: i64,
    book_name: String,
    chapter: i64,
    verse: i64,
    text: String,
}

#[derive(Serialize)]
struct ImportReport {
    code: String,
    name: String,
    books_count: i64,
    verses_count: i64,
    gen1_1: String,
    john3_16: String,
}

const DAILY_VERSES: &[(i64, i64, i64)] = &[
    (43, 3, 16), (19, 23, 1), (20, 3, 5), (23, 40, 31), (45, 8, 28),
    (50, 4, 13), (6, 1, 9), (19, 46, 1), (24, 29, 11), (40, 11, 28),
    (19, 119, 105), (45, 12, 2), (48, 5, 22), (58, 11, 1), (59, 1, 5),
    (19, 27, 1), (23, 41, 10), (40, 6, 33), (47, 5, 17), (49, 2, 8),
    (50, 4, 6), (55, 1, 7), (60, 5, 7), (19, 91, 1), (19, 121, 1),
    (20, 18, 10), (43, 14, 6), (43, 16, 33), (45, 5, 8), (62, 1, 9),
    (66, 21, 4),
];

fn mybible_to_canon(bn: i64) -> Option<i64> {
    match bn {
        10..=160 if bn % 10 == 0 => Some(bn / 10),
        190 => Some(17),
        220..=260 if bn % 10 == 0 => Some(18 + (bn - 220) / 10),
        290..=310 if bn % 10 == 0 => Some(23 + (bn - 290) / 10),
        330..=460 if bn % 10 == 0 => Some(26 + (bn - 330) / 10),
        470..=730 if bn % 10 == 0 => Some(40 + (bn - 470) / 10),
        _ => None,
    }
}

fn prepare_db_paths(data_dir: &Path, resource_dir: Option<&Path>) -> (PathBuf, PathBuf, PathBuf) {
    #[cfg(not(any(target_os = "android", target_os = "windows")))]
    {
        let mint_vault = PathBuf::from("/home/kaslorin/Desktop/Letah stuff/BIBLE/bible_vault.db");
        if mint_vault.exists() {
            let dir = mint_vault.parent().unwrap();
            return (mint_vault.clone(), dir.join("custom_vault.db"), dir.join("kairos_prefs.db"));
        }
    }

    let _ = std::fs::create_dir_all(data_dir);
    let custom_path = data_dir.join("custom_vault.db");
    let prefs_path = data_dir.join("kairos_prefs.db");

    #[cfg(not(target_os = "android"))]
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let beside = dir.join("bible_vault.db");
            if beside.exists() {
                return (beside, custom_path, prefs_path);
            }
        }
    }

    let unpacked = data_dir.join("bible_vault.db");
    if !unpacked.exists() {
        let mut _done = false;
        #[cfg(not(target_os = "android"))]
        if let Some(res_dir) = resource_dir {
            for gz in [res_dir.join("resources/bible_vault.db.gz"), res_dir.join("bible_vault.db.gz")] {
                if gz.exists() {
                    if let Ok(f) = std::fs::File::open(&gz) {
                        let mut dec = GzDecoder::new(f);
                        let tmp = data_dir.join("bible_vault.tmp");
                        if let Ok(mut out) = std::fs::File::create(&tmp) {
                            if io::copy(&mut dec, &mut out).is_ok() {
                                let _ = std::fs::rename(&tmp, &unpacked);
                                _done = true;
                                break;
                            }
                        }
                    }
                }
            }
        }
        #[cfg(any(target_os = "android", target_os = "windows"))]
        if !_done {
            let mut dec = GzDecoder::new(&EMBEDDED_VAULT_GZ[..]);
            let tmp = data_dir.join("bible_vault.tmp");
            if let Ok(mut out) = std::fs::File::create(&tmp) {
                if io::copy(&mut dec, &mut out).is_ok() {
                    let _ = std::fs::rename(&tmp, &unpacked);
                }
            }
        }
    }
    (unpacked, custom_path, prefs_path)
}

#[tauri::command]
async fn ensure_ready(state: State<'_, AppState>) -> Result<bool, String> {
    {
        let g = state.vault.lock().map_err(|e| e.to_string())?;
        if g.is_some() {
            return Ok(true);
        }
    }
    let data_dir = state.data_dir.clone();
    let res_dir = state.resource_dir.clone();
    let (vault_p, custom_p, prefs_p) = tauri::async_runtime::spawn_blocking(move || {
        prepare_db_paths(&data_dir, res_dir.as_deref())
    })
    .await
    .map_err(|e| e.to_string())?;

    let v_conn = Connection::open_with_flags(&vault_p, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|e| format!("Vault open error: {e}"))?;
    let c_conn = Connection::open(&custom_p).map_err(|e| format!("Custom vault error: {e}"))?;
    c_conn
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS translations (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, source_format TEXT NOT NULL);
             CREATE TABLE IF NOT EXISTS verses (id INTEGER PRIMARY KEY AUTOINCREMENT, translation_id INTEGER NOT NULL, book_id INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL, text TEXT NOT NULL, formatted_text TEXT NOT NULL, heading TEXT, para_start INTEGER NOT NULL DEFAULT 0, poetry_level INTEGER NOT NULL DEFAULT 0, UNIQUE(translation_id, book_id, chapter, verse));
             CREATE INDEX IF NOT EXISTS idx_custom_lookup ON verses(translation_id, book_id, chapter, verse);",
        )
        .map_err(|e| e.to_string())?;

    let p_conn = Connection::open(&prefs_p).map_err(|e| format!("Prefs open error: {e}"))?;
    p_conn
        .execute_batch("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, val TEXT NOT NULL);")
        .map_err(|e| e.to_string())?;

    *state.vault.lock().map_err(|e| e.to_string())? = Some(v_conn);
    *state.custom.lock().map_err(|e| e.to_string())? = Some(c_conn);
    *state.prefs.lock().map_err(|e| e.to_string())? = Some(p_conn);
    Ok(true)
}

fn default_prefs(available: &[TranslationInfo]) -> UserPrefs {
    let preferred = ["BSB", "NKJV", "NIV84"];
    let mut slots: Vec<String> = preferred
        .iter()
        .filter(|c| available.iter().any(|t| t.code == **c))
        .map(|c| c.to_string())
        .collect();
    for t in available {
        if slots.len() >= 3 { break; }
        if !slots.contains(&t.code) { slots.push(t.code.clone()); }
    }
    UserPrefs {
        slots, book_id: 43, chapter: 3, view_mode: "cols".to_string(),
        scroll_style: default_scroll_style(), theme: "wood".to_string(),
        font_size: 18, font_style: default_font_style(), line_height: default_line_height(),
        clean_pilcrow: true, color_code: default_color_code(),
        active_plan: "gospels_psalms".to_string(), completed_days: HashMap::new(),
        pins: vec![], slot_fonts: HashMap::new(), daily_dismissed_date: None,
        last_pin_folder: default_pin_folder(), history: vec![], prayers: vec![],
    }
}

#[tauri::command]
fn get_bootstrap(state: State<AppState>) -> Result<BootstrapData, String> {
    let v_guard = state.vault.lock().map_err(|e| e.to_string())?;
    let c_guard = state.custom.lock().map_err(|e| e.to_string())?;
    let p_guard = state.prefs.lock().map_err(|e| e.to_string())?;
    let vault = v_guard.as_ref().ok_or("Vault not initialized")?;
    let custom = c_guard.as_ref().ok_or("Custom vault not initialized")?;
    let prefs_conn = p_guard.as_ref().ok_or("Prefs not initialized")?;

    let mut translations = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for conn in [vault, custom] {
        let mut st = conn.prepare("SELECT code, name FROM translations ORDER BY id").map_err(|e| e.to_string())?;
        let items = st.query_map([], |r| Ok(TranslationInfo { code: r.get(0)?, name: r.get(1)? })).map_err(|e| e.to_string())?;
        for it in items {
            let ti = it.map_err(|e| e.to_string())?;
            if seen.insert(ti.code.clone()) { translations.push(ti); }
        }
    }

    let mut b_stmt = vault
        .prepare("SELECT b.id, b.usfm_code, b.name, b.testament, COALESCE(MAX(v.chapter), 1) FROM books b LEFT JOIN verses v ON v.book_id = b.id GROUP BY b.id ORDER BY b.id")
        .map_err(|e| e.to_string())?;
    let books: Vec<BookInfo> = b_stmt
        .query_map([], |r| Ok(BookInfo { id: r.get(0)?, usfm_code: r.get(1)?, name: r.get(2)?, testament: r.get(3)?, chapters: r.get(4)? }))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let saved: Option<String> = prefs_conn.query_row("SELECT val FROM kv WHERE k = 'prefs'", [], |r| r.get(0)).ok();
    let prefs = saved.and_then(|s| serde_json::from_str::<UserPrefs>(&s).ok()).unwrap_or_else(|| default_prefs(&translations));
    let last_read_date: Option<String> = prefs_conn.query_row("SELECT val FROM kv WHERE k = 'last_read_date'", [], |r| r.get(0)).ok();

    Ok(BootstrapData { translations, books, prefs, last_read_date })
}

#[tauri::command]
fn get_verse_count(state: State<AppState>, book_id: i64, chapter: i64) -> Result<i64, String> {
    let g = state.vault.lock().map_err(|e| e.to_string())?;
    let vault = g.as_ref().ok_or("Vault not initialized")?;
    vault.query_row("SELECT COALESCE(MAX(verse), 1) FROM verses WHERE book_id = ?1 AND chapter = ?2", (book_id, chapter), |r| r.get(0))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_chapter(state: State<AppState>, book_id: i64, chapter: i64, translations: Vec<String>) -> Result<Vec<AlignedVerseRow>, String> {
    let v_guard = state.vault.lock().map_err(|e| e.to_string())?;
    let c_guard = state.custom.lock().map_err(|e| e.to_string())?;
    let vault = v_guard.as_ref().ok_or("Vault not initialized")?;
    let custom = c_guard.as_ref().ok_or("Custom vault not initialized")?;
    let mut rows_map: BTreeMap<i64, HashMap<String, VerseCell>> = BTreeMap::new();

    let sql = "SELECT v.verse, v.text, v.formatted_text, v.heading, v.para_start, v.poetry_level FROM verses v JOIN translations t ON t.id = v.translation_id WHERE v.book_id = ?1 AND v.chapter = ?2 AND t.code = ?3 ORDER BY v.verse ASC";
    for code in translations {
        let mut found_any = false;
        for conn in [vault, custom] {
            if found_any { break; }
            let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
            let mut iter = stmt.query_map((book_id, chapter, &code), |r| {
                Ok((r.get::<_, i64>(0)?, VerseCell { text: r.get(1)?, formatted_text: r.get(2)?, heading: r.get(3)?, para_start: r.get(4)?, poetry_level: r.get(5)? }))
            }).map_err(|e| e.to_string())?;
            while let Some(item) = iter.next() {
                found_any = true;
                let (v_num, cell) = item.map_err(|e| e.to_string())?;
                rows_map.entry(v_num).or_default().insert(code.clone(), cell);
            }
        }
    }
    Ok(rows_map.into_iter().map(|(verse, cells)| AlignedVerseRow { verse, cells }).collect())
}

#[tauri::command]
fn get_daily_verse(state: State<AppState>, day_index: i64, translations: Vec<String>) -> Result<DailyVersePayload, String> {
    let v_guard = state.vault.lock().map_err(|e| e.to_string())?;
    let c_guard = state.custom.lock().map_err(|e| e.to_string())?;
    let vault = v_guard.as_ref().ok_or("Vault not initialized")?;
    let custom = c_guard.as_ref().ok_or("Custom vault not initialized")?;
    let idx = (day_index.abs() as usize) % DAILY_VERSES.len();
    let (book_id, chapter, verse) = DAILY_VERSES[idx];

    let book_name: String = vault.query_row("SELECT name FROM books WHERE id = ?1", (book_id,), |r| r.get(0)).map_err(|e| e.to_string())?;
    let mut cells = HashMap::new();
    let sql = "SELECT v.text FROM verses v JOIN translations t ON t.id = v.translation_id WHERE v.book_id = ?1 AND v.chapter = ?2 AND v.verse = ?3 AND t.code = ?4";
    for code in translations {
        for conn in [vault, custom] {
            if let Ok(txt) = conn.query_row(sql, (book_id, chapter, verse, &code), |r| r.get::<_, String>(0)) {
                cells.insert(code.clone(), txt);
                break;
            }
        }
    }
    Ok(DailyVersePayload { book_id, book_name, chapter, verse, cells })
}

#[tauri::command]
fn mark_read_today(state: State<AppState>, date_str: String) -> Result<(), String> {
    let g = state.prefs.lock().map_err(|e| e.to_string())?;
    let prefs_conn = g.as_ref().ok_or("Prefs not initialized")?;
    prefs_conn.execute("INSERT INTO kv (k, val) VALUES ('last_read_date', ?1) ON CONFLICT(k) DO UPDATE SET val = excluded.val", (&date_str,))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn search_verses(state: State<AppState>, query: String, translation_code: String, limit: Option<i64>) -> Result<Vec<SearchHit>, String> {
    let v_guard = state.vault.lock().map_err(|e| e.to_string())?;
    let c_guard = state.custom.lock().map_err(|e| e.to_string())?;
    let vault = v_guard.as_ref().ok_or("Vault not initialized")?;
    let custom = c_guard.as_ref().ok_or("Custom vault not initialized")?;
    let q = query.trim();
    if q.is_empty() { return Ok(vec![]); }
    let lim = limit.unwrap_or(50).min(150);

    let in_vault: bool = vault.query_row("SELECT EXISTS(SELECT 1 FROM translations WHERE code = ?1)", (&translation_code,), |r| r.get(0)).unwrap_or(false);
    if in_vault {
        let sanitized: String = q.split_whitespace().map(|w| format!(r#""{}""#, w.replace('"', ""))).collect::<Vec<_>>().join(" ");
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

#[tauri::command]
fn save_prefs(state: State<AppState>, prefs: UserPrefs) -> Result<(), String> {
    let g = state.prefs.lock().map_err(|e| e.to_string())?;
    let prefs_conn = g.as_ref().ok_or("Prefs not initialized")?;
    let json = serde_json::to_string(&prefs).map_err(|e| e.to_string())?;
    prefs_conn.execute("INSERT INTO kv (k, val) VALUES ('prefs', ?1) ON CONFLICT(k) DO UPDATE SET val = excluded.val", (&json,))
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn strip_tags_simple(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len());
    let mut in_tag = false;
    let mut skip_buf = String::new();
    let chars: Vec<char> = raw.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if c == '<' {
            in_tag = true;
            skip_buf.clear();
            i += 1;
            continue;
        }
        if in_tag {
            if c == '>' {
                in_tag = false;
                let low = skip_buf.to_lowercase();
                if low.starts_with("s") && !low.starts_with("/s") && !low.starts_with("span") {
                    // skip <S>1234</S> Strong's tag content until </S>
                    if let Some(end_rel) = raw[chars[..=i].iter().map(|ch| ch.len_utf8()).sum::<usize>()..].to_lowercase().find("</s") {
                        let skip_bytes = end_rel;
                        let mut skipped = 0;
                        while i + 1 < chars.len() && skipped < skip_bytes {
                            i += 1;
                            skipped += chars[i].len_utf8();
                        }
                    }
                }
                out.push(' ');
            } else {
                skip_buf.push(c);
            }
            i += 1;
            continue;
        }
        out.push(c);
        i += 1;
    }
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn derive_code(filename: &str) -> String {
    let stem = filename.split('.').next().unwrap_or("CUSTOM");
    let cleaned: String = stem.chars().filter(|c| c.is_ascii_alphanumeric()).collect();
    let up = cleaned.to_uppercase();
    if up.is_empty() { "CUSTOM".to_string() } else { up.chars().take(10).collect() }
}

fn import_sqlite_file(custom: &mut Connection, path: &Path, filename: &str) -> Result<ImportReport, String> {
    let src = Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(|e| e.to_string())?;
    let mut tables = Vec::new();
    {
        let mut st = src.prepare("SELECT LOWER(name) FROM sqlite_master WHERE type='table'").map_err(|e| e.to_string())?;
        for r in st.query_map([], |r| r.get::<_, String>(0)).map_err(|e| e.to_string())? {
            tables.push(r.map_err(|e| e.to_string())?);
        }
    }

    let mut code = derive_code(filename);
    let mut full_name = code.clone();
    let mut rows: Vec<(i64, i64, i64, String)> = Vec::new();

    if tables.contains(&"verses".to_string()) && tables.contains(&"translations".to_string()) {
        if let Ok((c, n)) = src.query_row("SELECT code, name FROM translations LIMIT 1", [], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))) {
            code = c; full_name = n;
        }
        let mut st = src.prepare("SELECT book_id, chapter, verse, text FROM verses").map_err(|e| e.to_string())?;
        for r in st.query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get::<_, String>(3)?))).map_err(|e| e.to_string())? {
            let (b, c, v, t) = r.map_err(|e| e.to_string())?;
            if (1..=66).contains(&b) && !t.is_empty() { rows.push((b, c, v, t)); }
        }
    } else if tables.contains(&"verses".to_string()) {
        if tables.contains(&"info".to_string()) {
            if let Ok(desc) = src.query_row("SELECT value FROM info WHERE name='description'", [], |r| r.get::<_, String>(0)) {
                full_name = desc.trim().to_string();
            }
        }
        let mut st = src.prepare("SELECT book_number, chapter, verse, text FROM verses").map_err(|e| e.to_string())?;
        for r in st.query_map([], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?, r.get::<_, i64>(2)?, r.get::<_, String>(3)?))).map_err(|e| e.to_string())? {
            let (bn, c, v, raw) = r.map_err(|e| e.to_string())?;
            if let Some(b) = mybible_to_canon(bn) {
                let clean = strip_tags_simple(&raw);
                if !clean.is_empty() { rows.push((b, c, v, clean)); }
            }
        }
    } else if tables.contains(&"bible".to_string()) {
        if tables.contains(&"details".to_string()) {
            if let Ok(abbr) = src.query_row("SELECT Abbreviation FROM Details LIMIT 1", [], |r| r.get::<_, String>(0)) {
                let c = derive_code(&abbr);
                if !c.is_empty() { code = c; }
            }
            if let Ok(desc) = src.query_row("SELECT Description FROM Details LIMIT 1", [], |r| r.get::<_, String>(0)) {
                full_name = desc.trim().to_string();
            }
        }
        let mut st = src.prepare("SELECT Book, Chapter, Verse, Scripture FROM Bible").map_err(|e| e.to_string())?;
        for r in st.query_map([], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?, r.get::<_, i64>(2)?, r.get::<_, String>(3)?))).map_err(|e| e.to_string())? {
            let (b, c, v, raw) = r.map_err(|e| e.to_string())?;
            if (1..=66).contains(&b) {
                let clean = strip_tags_simple(&raw);
                if !clean.is_empty() { rows.push((b, c, v, clean)); }
            }
        }
    } else {
        return Err("Unrecognized SQLite Bible schema (expected MyBible or e-Sword)".to_string());
    }

    if rows.is_empty() { return Err("No canonical verses found in file".to_string()); }

    let tx = custom.transaction().map_err(|e| e.to_string())?;
    let existing: Option<i64> = tx.query_row("SELECT id FROM translations WHERE code = ?1", (&code,), |r| r.get(0)).ok();
    let t_id = if let Some(id) = existing {
        tx.execute("DELETE FROM verses WHERE translation_id = ?1", (id,)).map_err(|e| e.to_string())?;
        tx.execute("UPDATE translations SET name = ?1, source_format = 'DropIn' WHERE id = ?2", (&full_name, id)).map_err(|e| e.to_string())?;
        id
    } else {
        tx.execute("INSERT INTO translations (code, name, source_format) VALUES (?1, ?2, 'DropIn')", (&code, &full_name)).map_err(|e| e.to_string())?;
        tx.last_insert_rowid()
    };

    {
        let mut ins = tx.prepare("INSERT OR IGNORE INTO verses (translation_id, book_id, chapter, verse, text, formatted_text, heading, para_start, poetry_level) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, 0, 0)").map_err(|e| e.to_string())?;
        for (b, c, v, t) in &rows {
            ins.execute((t_id, b, c, v, t, t)).map_err(|e| e.to_string())?;
        }
    }
    tx.commit().map_err(|e| e.to_string())?;

    let books_count: i64 = custom.query_row("SELECT COUNT(DISTINCT book_id) FROM verses WHERE translation_id = ?1", (t_id,), |r| r.get(0)).unwrap_or(0);
    let verses_count: i64 = custom.query_row("SELECT COUNT(*) FROM verses WHERE translation_id = ?1", (t_id,), |r| r.get(0)).unwrap_or(0);
    let gen1_1: String = custom.query_row("SELECT text FROM verses WHERE translation_id = ?1 AND book_id = 1 AND chapter = 1 AND verse = 1", (t_id,), |r| r.get(0)).unwrap_or_else(|_| "Not found".into());
    let john3_16: String = custom.query_row("SELECT text FROM verses WHERE translation_id = ?1 AND book_id = 43 AND chapter = 3 AND verse = 16", (t_id,), |r| r.get(0)).unwrap_or_else(|_| "Not found".into());

    Ok(ImportReport { code, name: full_name, books_count, verses_count, gen1_1, john3_16 })
}

#[tauri::command]
fn import_bible_bytes(state: State<AppState>, filename: String, bytes: Vec<u8>) -> Result<ImportReport, String> {
    let tmp = state.data_dir.join("import_upload.tmp");
    std::fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;
    let mut c_guard = state.custom.lock().map_err(|e| e.to_string())?;
    let custom = c_guard.as_mut().ok_or("Custom vault not initialized")?;
    let res = import_sqlite_file(custom, &tmp, &filename);
    let _ = std::fs::remove_file(&tmp);
    res
}

#[tauri::command]
fn scan_drop_in(state: State<AppState>) -> Result<(String, Vec<ImportReport>), String> {
    let drop_dir = {
        let mint_drop = PathBuf::from("/home/kaslorin/Desktop/Letah stuff/BIBLE/drop_in");
        if mint_drop.exists() { mint_drop } else { state.data_dir.join("drop_in") }
    };
    let _ = std::fs::create_dir_all(&drop_dir);
    let mut c_guard = state.custom.lock().map_err(|e| e.to_string())?;
    let custom = c_guard.as_mut().ok_or("Custom vault not initialized")?;
    let mut reports = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&drop_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if !p.is_file() { continue; }
            let low = p.file_name().and_then(|n| n.to_str()).unwrap_or("").to_lowercase();
            if low.ends_with(".sqlite3") || low.ends_with(".sqlite") || low.ends_with(".bblx") || low.ends_with(".bbli") || low.ends_with(".mybible") || low.ends_with(".db") {
                if let Ok(rep) = import_sqlite_file(custom, &p, p.file_name().unwrap().to_str().unwrap()) {
                    reports.push(rep);
                }
            }
        }
    }
    Ok((drop_dir.display().to_string(), reports))
}


#[tauri::command]
fn export_text_file(app: AppHandle, state: State<AppState>, filename: String, contents: String) -> Result<String, String> {
    let dir = app.path().download_dir().unwrap_or_else(|_| state.data_dir.clone());
    let _ = std::fs::create_dir_all(&dir);
    let safe_name: String = filename
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let target = dir.join(safe_name);
    std::fs::write(&target, contents.as_bytes()).map_err(|e| e.to_string())?;
    Ok(target.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
            let resource_dir = app.path().resource_dir().ok();
            app.manage(AppState {
                vault: Mutex::new(None),
                custom: Mutex::new(None),
                prefs: Mutex::new(None),
                data_dir,
                resource_dir,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ensure_ready,
            get_bootstrap,
            get_verse_count,
            get_chapter,
            get_daily_verse,
            mark_read_today,
            search_verses,
            save_prefs,
            import_bible_bytes,
            scan_drop_in,
            export_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running Bible: Kairos Collection");
}
