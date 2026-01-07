#!/usr/bin/env python3
"""
Scan a folder of audio files, flag items missing album art, optionally fetch album covers,
and embed them into the tracks. Provides a simple Tk UI for picking a folder and running
the check/fix flow.

Notes:
- Cover download uses iTunes Search API. Network must be available; otherwise it skips.
- Embedded tagging requires mutagen (installed via requirements.txt).
"""

from __future__ import annotations

import argparse
import base64
import io
import os
import sys
from pathlib import Path
from typing import Optional, Tuple

try:
    import mutagen
    from mutagen.flac import FLAC, Picture
    from mutagen.id3 import APIC, ID3, error as ID3Error
    from mutagen.mp3 import MP3
    from mutagen.mp4 import MP4, MP4Cover
    from mutagen.oggvorbis import OggVorbis
    MUTAGEN_AVAILABLE = True
except Exception:
    MUTAGEN_AVAILABLE = False

try:
    import requests
except Exception:
    requests = None

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
except Exception:
    tk = None
    filedialog = None
    messagebox = None
    ttk = None


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


def notify(message: str, title: str = "Cover checker"):
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


def folder_has_cover_file(folder: Path) -> bool:
    return any((folder / name).exists() for name in COVER_FILES)


def read_tags(path: Path) -> Tuple[Optional[str], Optional[str]]:
    """Return (artist, album) if available."""
    if not MUTAGEN_AVAILABLE:
        return None, None
    ext = path.suffix.lower()
    try:
        if ext == ".mp3":
            audio = MP3(path)
            artist = (audio.tags.get("TPE1") or [None])[0] if audio.tags else None
            album = (audio.tags.get("TALB") or [None])[0] if audio.tags else None
            return str(artist) if artist else None, str(album) if album else None
        if ext == ".flac":
            audio = FLAC(path)
            artist = audio.get("artist", [None])[0]
            album = audio.get("album", [None])[0]
            return artist, album
        if ext in {".m4a", ".aac", ".alac"}:
            audio = MP4(path)
            artist = audio.tags.get("\u00a9ART", [None])[0] if audio.tags else None
            album = audio.tags.get("\u00a9alb", [None])[0] if audio.tags else None
            return artist, album
        if ext in {".ogg", ".oga", ".opus"}:
            audio = OggVorbis(path)
            artist = audio.get("artist", [None])[0] if audio.tags else None
            album = audio.get("album", [None])[0] if audio.tags else None
            return artist, album
    except Exception:
        return None, None
    return None, None


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


def fetch_cover_bytes(artist: Optional[str], album: Optional[str]) -> Optional[bytes]:
    if requests is None or not artist or not album:
        return None
    try:
        term = f"{artist} {album}"
        resp = requests.get(
            "https://itunes.apple.com/search",
            params={"term": term, "entity": "album", "limit": 1},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results") or []
        if not results:
            return None
        artwork_url = results[0].get("artworkUrl100")
        if not artwork_url:
            return None
        artwork_url = artwork_url.replace("100x100bb", "1000x1000bb")
        img_resp = requests.get(artwork_url, timeout=10)
        img_resp.raise_for_status()
        return img_resp.content
    except Exception:
        return None


def embed_cover(path: Path, cover_bytes: bytes) -> bool:
    if not MUTAGEN_AVAILABLE:
        return False
    ext = path.suffix.lower()
    try:
        if ext == ".mp3":
            audio = MP3(path)
            try:
                audio.add_tags()
            except ID3Error:
                pass
            audio.tags.add(APIC(encoding=3, mime="image/jpeg", type=3, desc="Cover", data=cover_bytes))
            audio.save()
            return True
        if ext == ".flac":
            audio = FLAC(path)
            pic = Picture()
            pic.data = cover_bytes
            pic.type = 3
            pic.mime = "image/jpeg"
            audio.add_picture(pic)
            audio.save()
            return True
        if ext in {".m4a", ".aac", ".alac"}:
            audio = MP4(path)
            audio["covr"] = [MP4Cover(cover_bytes, imageformat=MP4Cover.FORMAT_JPEG)]
            audio.save()
            return True
        if ext in {".ogg", ".oga", ".opus"}:
            audio = OggVorbis(path)
            pic = Picture()
            pic.data = cover_bytes
            pic.type = 3
            pic.mime = "image/jpeg"
            encoded = base64.b64encode(pic.write()).decode("ascii")
            audio["metadata_block_picture"] = [encoded]
            audio.save()
            return True
    except Exception:
        return False
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


def run_scan(folder: Path, download_and_embed: bool = False, ui_log: Optional[callable] = None) -> str:
    log = ui_log or (lambda msg: print(msg))
    audio_files, missing = scan(folder)
    fixed = 0
    if download_and_embed:
        for path in list(missing):
            artist, album = read_tags(path)
            if not (artist and album):
                log(f"[skip] {path.name}: missing artist/album tags")
                continue
            cover_bytes = fetch_cover_bytes(artist, album)
            if not cover_bytes:
                log(f"[miss] {path.name}: no cover found online")
                continue
            if embed_cover(path, cover_bytes):
                log(f"[ok]   {path.name}: cover embedded")
                fixed += 1
    report_path = write_report(folder, missing)
    summary = (
        f"Scanned {len(audio_files)} audio files\n"
        f"Missing cover art: {len(missing)}\n"
        f"Embedded covers: {fixed}\n"
        f"Report: {report_path}"
    )
    log(summary)
    return summary


def run_cli():
    parser = argparse.ArgumentParser(description="Find and optionally fix missing cover art.")
    parser.add_argument("folder", nargs="?", help="Folder to scan (optional, opens dialog if omitted).")
    parser.add_argument("--fix", action="store_true", help="Download and embed covers when possible.")
    args = parser.parse_args()

    target_folder = Path(args.folder).expanduser() if args.folder else pick_folder_with_dialog()
    if not target_folder or not target_folder.exists():
        print("No folder selected or folder does not exist.")
        sys.exit(1)

    summary = run_scan(target_folder, download_and_embed=args.fix)
    notify(summary, "Cover check complete")


def run_ui():
    if tk is None or ttk is None:
        print("Tkinter not available; falling back to CLI.")
        run_cli()
        return

    root = tk.Tk()
    root.title("Cover Checker")
    root.geometry("520x360")

    selected_folder: Path | None = None

    log_box = tk.Text(root, height=12, bg="#0f172a", fg="#e2e8f0", insertbackground="white")
    log_box.pack(fill="both", expand=True, padx=12, pady=(12, 4))

    def log(msg: str):
        log_box.insert("end", msg + "\n")
        log_box.see("end")
        root.update_idletasks()

    def choose_folder():
        nonlocal selected_folder
        folder = pick_folder_with_dialog()
        if folder:
            selected_folder = folder
            folder_var.set(str(folder))
            log(f"Selected: {folder}")

    def run_action(fix: bool):
        if not selected_folder:
            notify("Choose a folder first.", "Cover checker")
            return
        summary = run_scan(selected_folder, download_and_embed=fix, ui_log=log)
        notify(summary, "Cover checker")

    controls = tk.Frame(root, bg="#0f172a")
    controls.pack(fill="x", padx=12, pady=8)

    folder_var = tk.StringVar(value="No folder selected")
    folder_label = tk.Label(controls, textvariable=folder_var, fg="#e2e8f0", bg="#0f172a")
    folder_label.pack(anchor="w")

    btn_row = tk.Frame(controls, bg="#0f172a")
    btn_row.pack(fill="x", pady=6)

    pick_btn = tk.Button(btn_row, text="Choose folder", command=choose_folder)
    pick_btn.pack(side="left", padx=(0, 6))

    scan_btn = tk.Button(btn_row, text="Scan only", command=lambda: run_action(False))
    scan_btn.pack(side="left", padx=6)

    fix_btn = tk.Button(btn_row, text="Scan + download covers", command=lambda: run_action(True))
    fix_btn.pack(side="left", padx=6)

    root.mainloop()


if __name__ == "__main__":
    run_ui()
