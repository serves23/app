@echo off
setlocal
set SCRIPT_DIR=%~dp0
python "%SCRIPT_DIR%find_missing_covers.py" %*
endlocal
