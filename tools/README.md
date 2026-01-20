# Cover Checker

Find audio files missing album art.

## Requirements
- Python 3.9+ with Tk (built-in on macOS/Windows; most Linux distros include it).
- Optional: `pip install mutagen` for embedded cover detection (recommended).

## Run
- macOS: double-click `run_find_missing_covers.command`.
- Windows: double-click `run_find_missing_covers.bat`.
- CLI (any OS):
  ```bash
  python3 find_missing_covers.py /path/to/folder
  ```
  Without a folder argument, a picker dialog opens.

## What it does
- Scans audio files for embedded covers (via mutagen if installed).
- Also treats folder cover files (cover.jpg/png, folder.jpg/png, front.jpg/png) as valid.
- Writes `missing_covers_report.txt` in the scanned folder and shows a summary dialog/console output.

# Backup Scanner Agent

Uploads local filesystem scan stats to the hosted app so it can update backup health.

## Requirements
- Node.js 18+
- A Supabase access token for your user (from the app session)

## Run
```bash
node tools/scan-agent.mjs \
  --app-url https://your-app.com \
  --token <SUPABASE_ACCESS_TOKEN> \
  --target-id <BACKUP_TARGET_ID> \
  --working-path /path/to/working \
  --backup-path /path/to/backup
```

Scan all targets:
```bash
node tools/scan-agent.mjs \
  --app-url https://your-app.com \
  --token <SUPABASE_ACCESS_TOKEN> \
  --all true
```

## Notes
- Use absolute paths for `--working-path` and `--backup-path`.
- Increase the scan limit with `--max-files 100000` if needed.
- You can find the access token in your browser local storage under the Supabase auth entry (look for `access_token`).
