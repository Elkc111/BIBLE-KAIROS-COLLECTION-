use rusqlite::{Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};
use std::path::PathBuf;
use std::sync::Mutex;
use flate2::read::GzDecoder;
use std::io;
use tauri::{AppHandle, Manager, State};

struct AppState {
    vault: Mutex<Connection>,
    prefs: Mutex<Connection>,
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

fn default_pin_folder() -> String {
    "General".to_string()
}

#[derive(Serialize, Deserialize, Clone)]
struct HistoryEntry {
    book_id: i64,
    book_name: String,
    chapter: i64,
    verse: Option<i64>,
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

fn default_font_style() -> String {
    "editorial".to_string()
}

fn default_line_height() -> String {
    "balanced".to_string()
}

fn default_color_code() -> bool {
    true
}

fn default_scroll_style() -> String {
    "ribbon".to_string()
}

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

const DAILY_VERSES: &[(i64, i64, i64)] = &[
    (43, 3, 16), (19, 23, 1), (20, 3, 5), (23, 40, 31), (45, 8, 28),
    (50, 4, 13), (6, 1, 9), (19, 46, 1), (24, 29, 11), (40, 11, 28),
    (19, 119, 105), (45, 12, 2), (48, 5, 22), (58, 11, 1), (59, 1, 5),
    (19, 27, 1), (23, 41, 10), (40, 6, 33), (47, 5, 17), (49, 2, 8),
    (50, 4, 6), (55, 1, 7), (60, 5, 7), (19, 91, 1), (19, 121, 1),
    (20, 18, 10), (43, 14, 6), (43, 16, 33), (45, 5, 8), (62, 1, 9),
    (66, 21, 4),
];

#[cfg(target_os = "android")]
const ANDROID_VAULT_GZ: &[u8] = include_bytes!("../resources/bible_vault.db.gz");

fn resolve_paths(app: &AppHandle) -> (PathBuf, PathBuf) {
    #[cfg(not(any(target_os = "android", target_os = "windows")))]
    {
        let mint_vault = PathBuf::from("/home/kaslorin/Desktop/Letah stuff/BIBLE/bible_vault.db");
        if mint_vault.exists() {
            let mint_prefs = mint_vault.parent().unwrap().join("kairos_prefs.db");
            return (mint_vault, mint_prefs);
        }
    }

    let data_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    let _ = std::fs::create_dir_all(&data_dir);
    let prefs_path = data_dir.join("kairos_prefs.db");

    #[cfg(not(target_os = "android"))]
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let beside = dir.join("bible_vault.db");
            if beside.exists() {
                return (beside, prefs_path);
            }
        }
    }

    let unpacked = data_dir.join("bible_vault.db");
    if !unpacked.exists() {
        #[cfg(target_os = "android")]
        {
            let mut dec = GzDecoder::new(&ANDROID_VAULT_GZ[..]);
            let tmp = data_dir.join("bible_vault.tmp");
            if let Ok(mut out) = std::fs::File::create(&tmp) {
                if io::copy(&mut dec, &mut out).is_ok() {
                    let _ = std::fs::rename(&tmp, &unpacked);
                }
            }
        }
        #[cfg(not(target_os = "android"))]
        if let Ok(res_dir) = app.path().resource_dir() {
            for gz in [
                res_dir.join("resources/bible_vault.db.gz"),
                res_dir.join("bible_vault.db.gz"),
            ] {
                if gz.exists() {
                    if let Ok(f) = std::fs::File::open(&gz) {
                        let mut dec = GzDecoder::new(f);
                        let tmp = data_dir.join("bible_vault.tmp");
                        if let Ok(mut out) = std::fs::File::create(&tmp) {
                            if io::copy(&mut dec, &mut out).is_ok() {
                                let _ = std::fs::rename(&tmp, &unpacked);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    (unpacked, prefs_path)
}

fn default_prefs(available: &[TranslationInfo]) -> UserPrefs {
    let preferred = ["BSB", "NKJV", "NIV84"];
    let mut slots: Vec<String> = preferred
        .iter()
        .filter(|c| available.iter().any(|t| t.code == **c))
        .map(|c| c.to_string())
        .collect();
    for t in available {
        if slots.len() >= 3 {
            break;
        }
        if !slots.contains(&t.code) {
            slots.push(t.code.clone());
        }
    }
    UserPrefs {
        slots,
        book_id: 43,
        chapter: 3,
        view_mode: "cols".to_string(),
        scroll_style: default_scroll_style(),
        theme: "obsidian".to_string(),
        font_size: 18,
        font_style: default_font_style(),
        line_height: default_line_height(),
        clean_pilcrow: true,
        color_code: default_color_code(),
        active_plan: "gospels_psalms".to_string(),
        completed_days: HashMap::new(),
        pins: vec![],
        slot_fonts: HashMap::new(),
        daily_dismissed_date: None,
        last_pin_folder: default_pin_folder(),
        history: vec![],
    }
}

#[tauri::command]
fn get_bootstrap(state: State<AppState>) -> Result<BootstrapData, String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    let prefs_conn = state.prefs.lock().map_err(|e| e.to_string())?;

    let mut t_stmt = vault
        .prepare("SELECT code, name FROM translations ORDER BY id")
        .map_err(|e| e.to_string())?;
    let translations: Vec<TranslationInfo> = t_stmt
        .query_map([], |r| {
            Ok(TranslationInfo {
                code: r.get(0)?,
                name: r.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut b_stmt = vault
        .prepare(
            "SELECT b.id, b.usfm_code, b.name, b.testament, COALESCE(MAX(v.chapter), 1)
             FROM books b
             LEFT JOIN verses v ON v.book_id = b.id
             GROUP BY b.id
             ORDER BY b.id",
        )
        .map_err(|e| e.to_string())?;
    let books: Vec<BookInfo> = b_stmt
        .query_map([], |r| {
            Ok(BookInfo {
                id: r.get(0)?,
                usfm_code: r.get(1)?,
                name: r.get(2)?,
                testament: r.get(3)?,
                chapters: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let saved: Option<String> = prefs_conn
        .query_row("SELECT val FROM kv WHERE k = 'prefs'", [], |r| r.get(0))
        .ok();
    let prefs = match saved.and_then(|s| serde_json::from_str::<UserPrefs>(&s).ok()) {
        Some(p) => p,
        None => default_prefs(&translations),
    };

    let last_read_date: Option<String> = prefs_conn
        .query_row("SELECT val FROM kv WHERE k = 'last_read_date'", [], |r| r.get(0))
        .ok();

    Ok(BootstrapData {
        translations,
        books,
        prefs,
        last_read_date,
    })
}

#[tauri::command]
fn get_verse_count(state: State<AppState>, book_id: i64, chapter: i64) -> Result<i64, String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    let cnt: i64 = vault
        .query_row(
            "SELECT COALESCE(MAX(verse), 1) FROM verses WHERE book_id = ?1 AND chapter = ?2",
            (book_id, chapter),
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    Ok(cnt)
}

#[tauri::command]
fn get_chapter(
    state: State<AppState>,
    book_id: i64,
    chapter: i64,
    translations: Vec<String>,
) -> Result<Vec<AlignedVerseRow>, String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    let mut rows_map: BTreeMap<i64, HashMap<String, VerseCell>> = BTreeMap::new();

    let mut stmt = vault
        .prepare(
            "SELECT v.verse, v.text, v.formatted_text, v.heading, v.para_start, v.poetry_level
             FROM verses v
             JOIN translations t ON t.id = v.translation_id
             WHERE v.book_id = ?1 AND v.chapter = ?2 AND t.code = ?3
             ORDER BY v.verse ASC",
        )
        .map_err(|e| e.to_string())?;

    for code in translations {
        let mut iter = stmt
            .query_map((book_id, chapter, &code), |r| {
                Ok((
                    r.get::<_, i64>(0)?,
                    VerseCell {
                        text: r.get(1)?,
                        formatted_text: r.get(2)?,
                        heading: r.get(3)?,
                        para_start: r.get(4)?,
                        poetry_level: r.get(5)?,
                    },
                ))
            })
            .map_err(|e| e.to_string())?;

        while let Some(item) = iter.next() {
            let (v_num, cell) = item.map_err(|e| e.to_string())?;
            rows_map.entry(v_num).or_default().insert(code.clone(), cell);
        }
    }

    Ok(rows_map
        .into_iter()
        .map(|(verse, cells)| AlignedVerseRow { verse, cells })
        .collect())
}

#[tauri::command]
fn get_daily_verse(
    state: State<AppState>,
    day_index: i64,
    translations: Vec<String>,
) -> Result<DailyVersePayload, String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    let idx = (day_index.abs() as usize) % DAILY_VERSES.len();
    let (book_id, chapter, verse) = DAILY_VERSES[idx];

    let book_name: String = vault
        .query_row("SELECT name FROM books WHERE id = ?1", (book_id,), |r| r.get(0))
        .map_err(|e| e.to_string())?;

    let mut cells = HashMap::new();
    let mut stmt = vault
        .prepare(
            "SELECT v.text
             FROM verses v
             JOIN translations t ON t.id = v.translation_id
             WHERE v.book_id = ?1 AND v.chapter = ?2 AND v.verse = ?3 AND t.code = ?4",
        )
        .map_err(|e| e.to_string())?;

    for code in translations {
        if let Ok(txt) = stmt.query_row((book_id, chapter, verse, &code), |r| r.get::<_, String>(0)) {
            cells.insert(code, txt);
        }
    }

    Ok(DailyVersePayload {
        book_id,
        book_name,
        chapter,
        verse,
        cells,
    })
}

#[tauri::command]
fn mark_read_today(state: State<AppState>, date_str: String) -> Result<(), String> {
    let prefs_conn = state.prefs.lock().map_err(|e| e.to_string())?;
    prefs_conn
        .execute(
            "INSERT INTO kv (k, val) VALUES ('last_read_date', ?1)
             ON CONFLICT(k) DO UPDATE SET val = excluded.val",
            (&date_str,),
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn search_verses(
    state: State<AppState>,
    query: String,
    translation_code: String,
    limit: Option<i64>,
) -> Result<Vec<SearchHit>, String> {
    let vault = state.vault.lock().map_err(|e| e.to_string())?;
    let q = query.trim();
    if q.is_empty() {
        return Ok(vec![]);
    }
    let lim = limit.unwrap_or(50).min(150);

    let sanitized: String = q
        .split_whitespace()
        .map(|w| format!(r#""{}""#, w.replace('"', "")))
        .collect::<Vec<_>>()
        .join(" ");

    let mut stmt = vault
        .prepare(
            "SELECT v.book_id, b.name, v.chapter, v.verse, v.text
             FROM verses_fts f
             JOIN verses v ON v.id = f.rowid
             JOIN translations t ON t.id = v.translation_id
             JOIN books b ON b.id = v.book_id
             WHERE f.text MATCH ?1 AND t.code = ?2
             ORDER BY v.book_id, v.chapter, v.verse
             LIMIT ?3",
        )
        .map_err(|e| e.to_string())?;

    let hits = stmt
        .query_map((&sanitized, &translation_code, lim), |r| {
            Ok(SearchHit {
                book_id: r.get(0)?,
                book_name: r.get(1)?,
                chapter: r.get(2)?,
                verse: r.get(3)?,
                text: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(hits)
}

#[tauri::command]
fn save_prefs(state: State<AppState>, prefs: UserPrefs) -> Result<(), String> {
    let prefs_conn = state.prefs.lock().map_err(|e| e.to_string())?;
    let json = serde_json::to_string(&prefs).map_err(|e| e.to_string())?;
    prefs_conn
        .execute(
            "INSERT INTO kv (k, val) VALUES ('prefs', ?1)
             ON CONFLICT(k) DO UPDATE SET val = excluded.val",
            (&json,),
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let (vault_path, prefs_path) = resolve_paths(app.handle());
            let vault_conn = Connection::open_with_flags(&vault_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
                .expect("Failed to open bible_vault.db");
            let prefs_conn = Connection::open(&prefs_path).expect("Failed to open kairos_prefs.db");
            prefs_conn
                .execute_batch("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, val TEXT NOT NULL);")
                .expect("Failed to initialize prefs table");
            app.manage(AppState {
                vault: Mutex::new(vault_conn),
                prefs: Mutex::new(prefs_conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_bootstrap,
            get_verse_count,
            get_chapter,
            get_daily_verse,
            mark_read_today,
            search_verses,
            save_prefs
        ])
        .run(tauri::generate_context!())
        .expect("error while running Bible: Kairos Collection");
}
