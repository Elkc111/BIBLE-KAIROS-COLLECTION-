#!/usr/bin/env python3
import json, re
from pathlib import Path

# 1. Add pinned tauri-plugin-android-fs = "=19.1.1" to Cargo.toml & capabilities
cargo_p = Path("src-tauri/Cargo.toml")
cargo = cargo_p.read_text(encoding="utf-8")
if "tauri-plugin-android-fs" not in cargo:
    cargo += 'tauri-plugin-android-fs = "=19.1.1"\n'
    cargo_p.write_text(cargo, encoding="utf-8")

cap_p = Path("src-tauri/capabilities/default.json")
cap = json.loads(cap_p.read_text(encoding="utf-8"))
if "android-fs:default" not in cap["permissions"]:
    cap["permissions"].append("android-fs:default")
    cap_p.write_text(json.dumps(cap, indent=2) + "\n", encoding="utf-8")

# 2. Patch lib.rs (Android SAF folder picker + visible .txt / .png writer)
lib_p = Path("src-tauri/src/lib.rs")
lib = lib_p.read_text(encoding="utf-8")

if "pick_android_backup_dir" not in lib:
    new_exports = r'''#[tauri::command]
async fn pick_android_backup_dir(app: AppHandle, state: State<'_, AppState>) -> Result<Option<String>, String> {
    #[cfg(target_os = "android")]
    {
        use tauri_plugin_android_fs::AndroidFsExt;
        let api = app.android_fs_async();
        let picked = api.file_picker().pick_dir(None).await.map_err(|e| e.to_string())?;
        let Some(dir_uri) = picked else { return Ok(None); };
        let _ = api.take_persistable_uri_permission(&dir_uri).await;
        let uri_json = serde_json::to_string(&dir_uri).map_err(|e| e.to_string())?;
        let name = api.get_name(&dir_uri).await.unwrap_or_else(|_| "Selected Folder".into());
        let g = state.prefs.lock().map_err(|e| e.to_string())?;
        if let Some(p_conn) = g.as_ref() {
            let _ = p_conn.execute(
                "INSERT INTO kv (k, val) VALUES ('android_backup_dir', ?1) ON CONFLICT(k) DO UPDATE SET val = excluded.val",
                (&uri_json,),
            );
        }
        return Ok(Some(name));
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, state);
        Ok(Some("Downloads".to_string()))
    }
}

#[cfg(target_os = "android")]
async fn write_to_android_dir(app: &AppHandle, state: &State<'_, AppState>, safe_name: &str, bytes: &[u8], mime: &str) -> Result<String, String> {
    use std::io::Write;
    use tauri_plugin_android_fs::{AndroidFsExt, FileUri};

    let uri_json: Option<String> = {
        let g = state.prefs.lock().map_err(|e| e.to_string())?;
        g.as_ref().and_then(|c| c.query_row("SELECT val FROM kv WHERE k = 'android_backup_dir'", [], |r| r.get(0)).ok())
    };
    let Some(uj) = uri_json else {
        return Err("NO_ANDROID_DIR".to_string());
    };
    let dir_uri: FileUri = serde_json::from_str(&uj).map_err(|e| e.to_string())?;
    let api = app.android_fs_async();
    let file_uri = api.create_new_file(&dir_uri, safe_name, Some(mime)).await.map_err(|e| e.to_string())?;
    let mut file = api.open_file_writable(&file_uri).await.map_err(|e| e.to_string())?;
    file.write_all(bytes).map_err(|e| e.to_string())?;
    let dir_name = api.get_name(&dir_uri).await.unwrap_or_else(|_| "Backup Folder".into());
    Ok(format!("{dir_name}/{safe_name}"))
}

#[tauri::command]
async fn export_text_file(app: AppHandle, state: State<'_, AppState>, filename: String, contents: String) -> Result<String, String> {
    let safe_name: String = filename.chars().map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' }).collect();
    #[cfg(target_os = "android")]
    {
        return write_to_android_dir(&app, &state, &safe_name, contents.as_bytes(), "text/plain").await;
    }
    #[cfg(not(target_os = "android"))]
    {
        let dir = app.path().download_dir().unwrap_or_else(|_| state.data_dir.clone());
        let _ = std::fs::create_dir_all(&dir);
        let target = dir.join(&safe_name);
        std::fs::write(&target, contents.as_bytes()).map_err(|e| e.to_string())?;
        Ok(target.display().to_string())
    }
}

#[tauri::command]
async fn export_binary_file(app: AppHandle, state: State<'_, AppState>, filename: String, bytes: Vec<u8>) -> Result<String, String> {
    let safe_name: String = filename.chars().map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' }).collect();
    #[cfg(target_os = "android")]
    {
        return write_to_android_dir(&app, &state, &safe_name, &bytes, "image/png").await;
    }
    #[cfg(not(target_os = "android"))]
    {
        let dir = app.path().download_dir().unwrap_or_else(|_| state.data_dir.clone());
        let _ = std::fs::create_dir_all(&dir);
        let target = dir.join(&safe_name);
        std::fs::write(&target, &bytes).map_err(|e| e.to_string())?;
        Ok(target.display().to_string())
    }
}
'''
    lib = re.sub(r"#\[tauri::command\]\nfn export_text_file\([\s\S]*?\n\}\n", "", lib, count=1)
    lib = re.sub(r"#\[tauri::command\]\nfn export_binary_file\([\s\S]*?\n\}\n", new_exports, lib, count=1)

    old_run_build = "    tauri::Builder::default()\n"
    new_run_build = '''    let builder = tauri::Builder::default();
    #[cfg(target_os = "android")]
    let builder = builder.plugin(tauri_plugin_android_fs::init());
    builder\n'''
    lib = lib.replace(old_run_build, new_run_build, 1)
    lib = lib.replace("            export_binary_file\n        ])", "            export_binary_file,\n            pick_android_backup_dir\n        ])", 1)
    lib_p.write_text(lib, encoding="utf-8")

# 3. Update index.html (allow any file in Android picker + Choose Backup Folder button)
idx_p = Path("dist/index.html")
idx = idx_p.read_text(encoding="utf-8")
idx = idx.replace('accept=".json"', 'accept="*/*"')
idx = idx.replace('accept=".sqlite3,.sqlite,.bblx,.bbli,.mybible,.db"', 'accept="*/*"')
if 'id="btn-pick-backup-dir"' not in idx:
    idx = idx.replace(
        '<button id="btn-export-backup" class="pill pill-primary">Export Backup</button>',
        '<button id="btn-pick-backup-dir" class="pill pill-ghost">Choose Backup Folder</button>\n            <button id="btn-export-backup" class="pill pill-primary">Export Backup (.txt)</button>',
        1,
    )
idx_p.write_text(idx, encoding="utf-8")

# 4. Update app.js (Android visible .txt backups + auto folder prompt if needed)
js_p = Path("dist/app.js")
js = js_p.read_text(encoding="utf-8")

old_exp = re.search(r"async function exportFileOrShare\(filename, textContent\) \{[\s\S]*?\n\}", js)
new_exp = '''async function exportFileOrShare(filename, textContent) {
  try {
    const saved = await invoke("export_text_file", { filename, contents: textContent });
    showToast(`Saved: ${saved}`);
    return;
  } catch (err) {
    if (String(err).includes("NO_ANDROID_DIR")) {
      const picked = await invoke("pick_android_backup_dir");
      if (picked) {
        const saved2 = await invoke("export_text_file", { filename, contents: textContent });
        showToast(`Saved: ${saved2}`);
        return;
      }
    }
  }
  if (navigator.share) {
    try { await navigator.share({ title: filename, text: textContent }); return; } catch (_) {}
  }
  await navigator.clipboard.writeText(textContent);
  showToast(`Copied ${filename} to clipboard`);
}'''
assert old_exp, "exportFileOrShare not found"
js = js[:old_exp.start()] + new_exp + js[old_exp.end():]

js = js.replace("kairos-pins-${state.pinFilter.toLowerCase()}.json", "kairos-pins-${state.pinFilter.toLowerCase()}.txt")
js = js.replace("kairos-backup-${localDateKey()}.json", "kairos-backup-${localDateKey()}.txt")

if "btn-pick-backup-dir" not in js:
    js = js.replace(
        'document.getElementById("btn-export-backup").onclick =',
        '''if (document.getElementById("btn-pick-backup-dir")) {
    document.getElementById("btn-pick-backup-dir").onclick = async () => {
      const name = await invoke("pick_android_backup_dir");
      if (name) showToast(`Backup folder: ${name}`);
    };
  }
  document.getElementById("btn-export-backup").onclick =''',
        1,
    )

js_p.write_text(js, encoding="utf-8")
print("Android Backup Folder & .txt export applied!")
