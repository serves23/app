#!/usr/bin/env python3
"""
Scan a folder of audio files and flag items missing album art.

- Detects cover art via embedded tags (mutagen) when available.
- Also considers presence of cover files in the same directory (cover.jpg/png etc.).
- Outputs a report to the console and writes missing items to missing_covers_report.txt
- If no folder argument is passed, a folder picker dialog opens (macOS/Windows/Linux with Tk).
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

try:
    import mutagen
    from mutagen.flac import FLAC
    from mutagen.mp3 import MP3
    from mutagen.mp4 import MP4
    from mutagen.oggvorbis import OggVorbis
    MUTAGEN_AVAILABLE = True
except Exception:
    MUTAGEN_AVAILABLE = False

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox
except Exception:
    tk = None
    filedialog = None
    messagebox = None


AUDIO_EXTS = {".mp3", ".flac", ".m4a", ".aac", ".alac", ".ogg", ".oga", ".opus", ".wav", ".aif", ".aiff"}
COVER_FILES = {"cover.jpg", "cover.jpeg", "cover.png", "folder.jpg", "folder.png", "front.jpg", "front.png"}


def pick_folder_with_dialog() -> Path | None:
    if tk is None or filedialog is None:
        return None
    root = tk.Tk()
    root.withdraw()
    folder = filedialog.askdirectory(title="Choose a folder to scan for missing covers")
    root.destroy()
    return Path(folder) if folder else None


def has_embedded_cover(path: Path) -> bool:
    if not MUTAGEN_AVAILABLE:
        return False
    ext = path.suffix.lower()
    try:
        if ext == ".mp3":
            audio = MP3(path)
            return any(key.startswith("APIC") for key in audio.tags or {})
        if ext == ".flac":
            audio = FLAC(path)
            return bool(audio.pictures)
        if ext in {".m4a", ".aac", ".alac"}:
            audio = MP4(path)
            covr = audio.tags.get("covr") if audio.tags else None
            return bool(covr)
        if ext in {".ogg", ".oga", ".opus"}:
            audio = OggVorbis(path)
            pics = audio.tags.get("metadata_block_picture") if audio.tags else None
            return bool(pics)
    except Exception:
        return False
    return False


def folder_has_cover_file(folder: Path) -> bool:
    for name in COVER_FILES:
        if (folder / name).exists():
            return True
    return False


def scan(folder: Path) -> tuple[list[Path], list[Path]]:
    audio_files: list[Path] = []
    missing: list[Path] = []
    for root, _, files in os.walk(folder):
        root_path = Path(root)
        cover_in_folder = folder_has_cover_file(root_path)
        for name in files:
            path = root_path / name
            if path.suffix.lower() not in AUDIO_EXTS:
                continue
            audio_files.append(path)
            embedded = has_embedded_cover(path)
            if not (embedded or cover_in_folder):
                missing.append(path)
    return audio_files, missing


def write_report(folder: Path, missing: list[Path]) -> Path:
    report_path = folder / "missing_covers_report.txt"
    with report_path.open("w", encoding="utf-8") as f:
        if not missing:
            f.write("All scanned audio files have cover art or a folder cover file.\n")
            return report_path
        f.write("Missing cover art:\n")
        for path in missing:
            f.write(str(path) + "\n")
    return report_path


def notify(message: str, title: str = "Cover check"):
    if messagebox is None:
        print(message)
        return
    try:
        root = tk.Tk()
        root.withdraw()
        messagebox.showinfo(title, message)
        root.destroy()
    except Exception:
        print(message)


def main():
    parser = argparse.ArgumentParser(description="Find audio files missing cover art.")
    parser.add_argument("folder", nargs="?", help="Folder to scan (optional, opens dialog if omitted).")
    args = parser.parse_args()

    target_folder = Path(args.folder).expanduser() if args.folder else pick_folder_with_dialog()
    if not target_folder or not target_folder.exists():
        print("No folder selected or folder does not exist.")
        sys.exit(1)

    audio_files, missing = scan(target_folder)
    report_path = write_report(target_folder, missing)

    summary = (
        f"Scanned {len(audio_files)} audio files in {target_folder}\n"
        f"Missing cover art: {len(missing)}\n"
        f"Report: {report_path}"
    )
    print(summary)
    notify(summary, "Cover check complete")


if __name__ == "__main__":
    main()
