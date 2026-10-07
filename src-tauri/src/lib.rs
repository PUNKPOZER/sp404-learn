//! Desktop shell: owns the Python sidecar process and exposes a tiny, local-only API.
//! Protocol with the sidecar is JSON lines over stdin/stdout (no network ports).

use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

/// Files the OS asked us to open (.spsystem / .sp404learn). The OS event can arrive before the web view is ready (cold start),
/// so paths are queued until the front-end calls `app_ready`; afterwards they are emitted as `open-path` events (warm start).
#[derive(Default)]
struct OpenQueue {
    inner: Mutex<OpenState>,
}

#[derive(Default)]
struct OpenState {
    ready: bool,
    queue: Vec<String>,
}

fn is_project_path(p: &str) -> bool {
    let l = p.to_lowercase();
    l.ends_with(".spsystem") || l.ends_with(".sp404learn")
}

impl OpenQueue {
    /// Project paths only. Returns the paths to emit right now (front-end ready) — otherwise they are queued and an empty list is returned.
    fn offer(&self, paths: Vec<String>) -> Vec<String> {
        let paths: Vec<String> = paths.into_iter().filter(|p| is_project_path(p)).collect();
        let mut st = self.inner.lock().unwrap();
        if st.ready {
            paths
        } else {
            st.queue.extend(paths);
            Vec::new()
        }
    }

    /// The front-end can handle open requests from now on: everything queued so far, in order.
    fn ready(&self) -> Vec<String> {
        let mut st = self.inner.lock().unwrap();
        st.ready = true;
        std::mem::take(&mut st.queue)
    }
}

/// Route project paths to the front-end (or queue them) and bring the window forward.
fn handle_open(app: &AppHandle, paths: Vec<String>) {
    let had_projects = paths.iter().any(|p| is_project_path(p));
    let now = app.state::<OpenQueue>().offer(paths);
    if !had_projects {
        return;
    }
    for p in now {
        let _ = app.emit("open-path", p);
    }
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// Called once by the front-end when it can handle open requests: returns everything queued so far.
#[tauri::command]
fn app_ready(state: State<OpenQueue>) -> Vec<String> {
    state.ready()
}

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
    let ext = canon.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    if !canon.starts_with(&root) || !["wav", "mp3", "flac", "m4a", "aif", "aiff", "ogg"].contains(&ext.as_str()) {
        return Err("not an analysis-cache audio file".into());
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

/// Show a file in Finder (macOS) / the file manager. Only paths that exist; nothing is executed.
#[tauri::command]
fn reveal_path(path: String) -> Result<(), String> {
    if !std::path::Path::new(&path).exists() {
        return Err(format!("{path}: not found"));
    }
    #[cfg(target_os = "macos")]
    let r = std::process::Command::new("open").args(["-R", &path]).status();
    #[cfg(target_os = "windows")]
    let r = std::process::Command::new("explorer").arg(format!("/select,{path}")).status();
    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    let r = std::process::Command::new("xdg-open").arg(std::path::Path::new(&path).parent().unwrap_or(std::path::Path::new("/"))).status();
    r.map(|_| ()).map_err(|e| e.to_string())
}

/// The app that "Prepare in DROP" launches. The front-end cannot choose it; a user may point it elsewhere (name or full path of an .app)
/// with the environment variable SP404LEARN_DROP_APP, e.g. to test with another build or to simulate DROP being unavailable.
fn drop_app() -> String {
    std::env::var("SP404LEARN_DROP_APP").ok().filter(|v| !v.trim().is_empty()).unwrap_or_else(|| "SP404 DROP".to_string())
}

/// Only an existing, absolute .spsystem file may be handed to another application.
fn check_handoff_path(path: &str) -> Result<(), String> {
    let p = std::path::Path::new(path);
    if !p.is_absolute() {
        return Err(format!("{path}: not an absolute path"));
    }
    if !path.to_lowercase().ends_with(".spsystem") {
        return Err(format!("{path}: not a .spsystem file"));
    }
    if !p.is_file() {
        return Err(format!("{path}: not found"));
    }
    Ok(())
}

/// Arguments for `open`: `-a <app> <path>` as separate argv entries (never a shell string, so spaces, quotes and Unicode in the path are inert).
fn open_args(app: &str, path: &str) -> Vec<std::ffi::OsString> {
    vec!["-a".into(), app.into(), path.into()]
}

/// Open a saved .spsystem in SP404 DROP (macOS `open -a`). Err = DROP missing or could not be launched (the caller falls back to Finder).
#[tauri::command]
fn open_in_drop(path: String) -> Result<(), String> {
    check_handoff_path(&path)?;
    #[cfg(target_os = "macos")]
    {
        let out = std::process::Command::new("open").args(open_args(&drop_app(), &path)).output().map_err(|e| e.to_string())?;
        if out.status.success() {
            Ok(())
        } else {
            Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = open_args(&drop_app(), &path);
        Err("opening SP404 DROP is only implemented on macOS".into())
    }
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

pub fn run() {
    let mut builder = tauri::Builder::default();
    // A second launch (Windows/Linux, or an explicit second process) hands its arguments to the running instance instead of opening another window.
    // On macOS `open -a` / double-click already reach the running app as an Opened event (below).
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            handle_open(app, argv.into_iter().skip(1).collect());
        }));
    }
    builder
        .plugin(tauri_plugin_dialog::init())
        .manage(Sidecar::default())
        .manage(OpenQueue::default())
        .setup(|app| {
            // cold start with a path on the command line (dev, Windows/Linux): queue it for the front-end
            let args: Vec<String> = std::env::args().skip(1).collect();
            handle_open(app.handle(), args);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            sidecar_start, sidecar_send, read_text_file, write_text_file, path_exists, autotest_path, read_stem_file, reveal_path, open_in_drop, app_ready
        ])
        .build(tauri::generate_context!())
        .expect("error while building SP-404 LEARN")
        .run(|app, event| match event {
            tauri::RunEvent::Exit => {
                if let Some(mut c) = app.state::<Sidecar>().child.lock().unwrap().take() {
                    let _ = c.kill();
                }
            }
            // macOS: Finder double-click, `open -a "SP-404 LEARN" file`, drag onto the Dock icon — cold start and warm start alike
            #[cfg(any(target_os = "macos", target_os = "ios"))]
            tauri::RunEvent::Opened { urls } => {
                let paths = urls.into_iter().filter_map(|u| u.to_file_path().ok()).map(|p| p.to_string_lossy().into_owned()).collect();
                handle_open(app, paths);
            }
            _ => {}
        });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cold_start_queues_until_the_front_end_is_ready() {
        let q = OpenQueue::default();
        assert!(q.offer(vec!["/p/a.spsystem".into()]).is_empty(), "nothing is emitted before the web view is ready");
        assert!(q.offer(vec!["/p/b.sp404learn".into()]).is_empty());
        assert_eq!(q.ready(), vec!["/p/a.spsystem", "/p/b.sp404learn"], "the startup events are not lost, order kept");
        assert!(q.ready().is_empty(), "the queue is drained once");
    }

    #[test]
    fn warm_start_is_delivered_immediately_without_queueing() {
        let q = OpenQueue::default();
        q.ready();
        assert_eq!(q.offer(vec!["/p/new revision.spsystem".into()]), vec!["/p/new revision.spsystem"]);
        assert!(q.ready().is_empty());
    }

    #[test]
    fn drop_is_launched_with_the_exact_path_as_one_argument() {
        for path in ["/Users/me/Documents/SP404 DROP/Projects/Jungle — break.spsystem", "/tmp/a \"quoted\" $(rm -rf x); `y`.spsystem", "/tmp/日本語 ✓.spsystem"] {
            let a = open_args("SP404 DROP", path);
            assert_eq!(a.len(), 3, "never split or joined into a shell string");
            assert_eq!(a[0], "-a");
            assert_eq!(a[1], "SP404 DROP");
            assert_eq!(a[2], std::ffi::OsString::from(path), "the path is passed through unchanged");
        }
    }

    #[test]
    fn only_an_existing_absolute_spsystem_file_may_be_handed_over() {
        let dir = std::env::temp_dir().join(format!("sp404learn-handoff-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let ok = dir.join("Projekt ünï.spsystem");
        std::fs::write(&ok, b"x").unwrap();
        assert!(check_handoff_path(ok.to_str().unwrap()).is_ok());
        assert!(check_handoff_path("relative/p.spsystem").is_err());
        assert!(check_handoff_path(dir.join("missing.spsystem").to_str().unwrap()).is_err());
        let wav = dir.join("a.wav");
        std::fs::write(&wav, b"x").unwrap();
        assert!(check_handoff_path(wav.to_str().unwrap()).is_err());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn only_project_files_are_accepted_case_insensitively() {
        let q = OpenQueue::default();
        q.offer(vec!["/x/song.wav".into(), "/x/notes.txt".into(), "/x/A.SPSYSTEM".into(), "-psn_0_12345".into(), "/x/p.spsystem.bak".into()]);
        assert_eq!(q.ready(), vec!["/x/A.SPSYSTEM"]);
        assert!(is_project_path("/Users/me/Documents/SP404 DROP/Projects/Jungle — break.spsystem"));
        assert!(!is_project_path("/x/spsystem"));
    }

    // ---- manual harness (not run by default): launches the REAL application --------------------------------------------------
    // SP404LEARN_TEST_SPSYSTEM=/abs/path.spsystem [SP404LEARN_DROP_APP=/path/to/SP404\ DROP.app] cargo test manual_ -- --ignored --nocapture
    #[test]
    #[ignore = "manual: launches the real SP404 DROP"]
    fn manual_open_in_drop() {
        let path = std::env::var("SP404LEARN_TEST_SPSYSTEM").expect("SP404LEARN_TEST_SPSYSTEM");
        println!("open_in_drop({path:?}) with app {:?} -> {:?}", drop_app(), open_in_drop(path.clone()));
        open_in_drop(path).unwrap();
    }

    #[test]
    #[ignore = "manual: needs SP404LEARN_DROP_APP pointing at a missing app"]
    fn manual_missing_drop_is_an_error_not_a_panic() {
        let path = std::env::var("SP404LEARN_TEST_SPSYSTEM").expect("SP404LEARN_TEST_SPSYSTEM");
        let r = open_in_drop(path);
        println!("{r:?}");
        assert!(r.is_err());
    }
}
