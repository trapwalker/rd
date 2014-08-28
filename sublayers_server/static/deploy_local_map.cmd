@echo off
cls
echo --- Script for creating local copy map ---
set /P answer="You have installed on your system program Wget? (y/n) "
echo Downloading map...
if "%answer%"=="y" (get_map_wget.cmd) else (get_map.wsf)
echo Downloading map end
echo Unpacking map...
7z x map.7z
echo Unpacking map end
echo Deleting temp files...
del 7z.exe 7z.dll map.7z
echo Deleting temp files end
