# Cover Checker

Find audio files missing album art.

## Requirements
- Python 3.9+ with Tk (built-in on macOS/Windows; most Linux distros include it).
- `pip install -r requirements.txt` (mutagen + requests).

## Run
- macOS: double-click `run_find_missing_covers.command`.
- Windows: double-click `run_find_missing_covers.bat`.
- CLI (any OS):
  ```bash
  python3 find_missing_covers.py /path/to/folder
  ```
  Without a folder argument, a picker dialog opens.

## What it does
- Scans audio files for embedded covers (via mutagen).
- Treats folder cover files (cover.jpg/png, folder.jpg/png, front.jpg/png) as valid.
- If enabled, tries to fetch covers online (iTunes Search API) using artist/album tags and embeds them.
- Writes `missing_covers_report.txt` in the scanned folder and shows a summary dialog/console output.
