use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};

#[cfg(windows)]
use std::os::windows::fs::OpenOptionsExt;

pub const DB_FILENAME: &str = "tank_farm_dip.db";

#[derive(Clone, Debug)]
pub struct PortablePaths {
    pub root: PathBuf,
    pub data: PathBuf,
    pub backup: PathBuf,
    pub logs: PathBuf,
    pub reports: PathBuf,
    pub config: PathBuf,
    pub temp: PathBuf,
}

impl PortablePaths {
    pub fn discover() -> io::Result<Self> {
        let executable = std::env::current_exe()?;
        let root = executable.parent().ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::NotFound,
                "Unable to determine the application executable folder",
            )
        })?;
        Ok(Self::from_root(root))
    }

    pub fn from_root(root: impl AsRef<Path>) -> Self {
        let root = root.as_ref().to_path_buf();
        Self {
            data: root.join("Data"),
            backup: root.join("Backup"),
            logs: root.join("Logs"),
            reports: root.join("Reports"),
            config: root.join("Config"),
            temp: root.join("Temp"),
            root,
        }
    }

    pub fn ensure_directories(&self) -> io::Result<()> {
        for directory in [
            &self.data,
            &self.backup,
            &self.logs,
            &self.reports,
            &self.config,
            &self.temp,
        ] {
            fs::create_dir_all(directory)?;
        }

        let write_test = self.temp.join(".write_test");
        fs::write(&write_test, b"portable storage write test")?;
        fs::remove_file(write_test)?;
        Ok(())
    }

    pub fn database_path(&self) -> PathBuf {
        self.data.join(DB_FILENAME)
    }

    pub fn configure_process_environment(&self) {
        // Keep WebView2 localStorage/cache and process temporary files beside the executable.
        std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", self.temp.join("WebView2"));
        std::env::set_var("TEMP", &self.temp);
        std::env::set_var("TMP", &self.temp);
    }
}

pub struct InstanceLock {
    _file: File,
}

impl InstanceLock {
    pub fn acquire(paths: &PortablePaths) -> io::Result<Self> {
        let lock_path = paths.config.join("application.lock");
        let mut options = OpenOptions::new();
        options.read(true).write(true).create(true).truncate(true);

        // Windows share mode 0 keeps this file exclusively open. SMB propagates the
        // share violation, so another PC opening the same portable folder is stopped
        // before either process can touch SQLite.
        #[cfg(windows)]
        options.share_mode(0);

        let mut file = options.open(&lock_path).map_err(|error| {
            io::Error::new(
                error.kind(),
                format!(
                    "Tank Farm Dip Control is already open from this shared folder, or the folder is not writable. Ask the other user to close the application and try again. Lock: {} ({})",
                    lock_path.display(),
                    error
                ),
            )
        })?;

        let computer = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "unknown-computer".into());
        let user = std::env::var("USERNAME").unwrap_or_else(|_| "unknown-user".into());
        writeln!(
            file,
            "computer={computer}\nuser={user}\npid={}\nstarted_at={}",
            std::process::id(),
            chrono::Local::now().to_rfc3339()
        )?;
        file.sync_data()?;

        Ok(Self { _file: file })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn portable_paths_are_rooted_beside_the_executable() {
        let paths = PortablePaths::from_root(PathBuf::from("portable-root"));
        assert_eq!(paths.database_path(), PathBuf::from("portable-root/Data/tank_farm_dip.db"));
        assert_eq!(paths.backup, PathBuf::from("portable-root/Backup"));
        assert_eq!(paths.logs, PathBuf::from("portable-root/Logs"));
        assert_eq!(paths.reports, PathBuf::from("portable-root/Reports"));
        assert_eq!(paths.config, PathBuf::from("portable-root/Config"));
        assert_eq!(paths.temp, PathBuf::from("portable-root/Temp"));
    }
}
