//! Desktop shell: owns the Python sidecar process and exposes a tiny, local-only API.
//! Protocol with the sidecar is JSON lines over stdin/stdout (no network ports).

use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Default)]
struct Sidecar {
    child: Mutex<Option<Child>>,
    stdin: Mutex<Option<ChildStdin>>,
}

/// Where to find the engine. Packaged builds ship a frozen sidecar binary in resources;
/// dev builds run the repo's Python package from its virtualenv.
fn sidecar_command(app: &AppHandle) -> Result<Command, String> {
    let exe = if cfg!(windows) { "sp404-sidecar.exe" } else { "sp404-sidecar" };
    // debug builds always run the repo's Python so engine edits are picked up
    if cfg!(debug_assertions) {
        // fall through to the virtualenv below
    } else if let Ok(res) = app.path().resource_dir() {
        let bundled = res.join("resources").join("sp404-sidecar").join(exe);
        if bundled.exists() {
            return Ok(Command::new(bundled));
        }
    }
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    let py_dir = root.join("python");
    let venv_py = if cfg!(windows) {
        root.join(".venv/Scripts/python.exe")
    } else {
        root.join(".venv/bin/python")
    };
    let python = std::env::var("SP404LEARN_PYTHON")
        .map(PathBuf::from)
        .unwrap_or(if venv_py.exists() { venv_py } else { PathBuf::from("python3") });
    let mut c = Command::new(python);
    c.args(["-m", "sidecar.server"]).current_dir(py_dir);
    Ok(c)
}

#[tauri::command]
fn sidecar_start(app: AppHandle, state: State<Sidecar>) -> Result<(), String> {
    let mut guard = state.child.lock().unwrap();
    if guard.is_some() {
        return Ok(());
    }
    let mut cmd = sidecar_command(&app)?;
    if let Ok(dir) = app.path().app_cache_dir() {
        cmd.env("SP404LEARN_CACHE", dir.join("analysis"));
    }
    let mut child = cmd
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("cannot start analysis engine: {e}"))?;
    let stdout = child.stdout.take().ok_or("no sidecar stdout")?;
    *state.stdin.lock().unwrap() = child.stdin.take();
    *guard = Some(child);
    let handle = app.clone();
    std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            let _ = handle.emit("sidecar-msg", line);
        }
        let _ = handle.emit("sidecar-exit", ());
    });
    Ok(())
}

#[tauri::command]
fn sidecar_send(line: String, state: State<Sidecar>) -> Result<(), String> {
    let mut g = state.stdin.lock().unwrap();
    let stdin = g.as_mut().ok_or("analysis engine is not running")?;
    stdin.write_all(line.as_bytes()).map_err(|e| e.to_string())?;
    stdin.write_all(b"\n").map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("{path}: {e}"))
}

/// Raw bytes of a stem WAV for in-app playback. Only files under the analysis cache are readable.
#[tauri::command]
fn read_stem_file(app: AppHandle, path: String) -> Result<tauri::ipc::Response, String> {
    let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?.join("analysis");
    let canon = std::fs::canonicalize(&path).map_err(|e| format!("{path}: {e}"))?;
    let root = std::fs::canonicalize(&cache).map_err(|e| e.to_string())?;
    if !canon.starts_with(&root) || canon.extension().and_then(|e| e.to_str()) != Some("wav") {
        return Err("not a stem file".into());
    }
    std::fs::read(&canon).map(tauri::ipc::Response::new).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| format!("{path}: {e}"))
}

/// Dev-only hook: lets a script ask the running app to open a track and report back.
#[tauri::command]
fn autotest_path() -> Option<String> {
    if cfg!(debug_assertions) { std::env::var("SP404LEARN_AUTOTEST").ok() } else { None }
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Sidecar::default())
        .invoke_handler(tauri::generate_handler![
            sidecar_start, sidecar_send, read_text_file, write_text_file, path_exists, autotest_path, read_stem_file
        ])
        .build(tauri::generate_context!())
        .expect("error while building SP-404 LEARN")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                if let Some(mut c) = app.state::<Sidecar>().child.lock().unwrap().take() {
                    let _ = c.kill();
                }
            }
        });
}
