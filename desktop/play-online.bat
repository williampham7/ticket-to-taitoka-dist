@echo off
rem Windows: update the game if a new version is on GitHub, then build it, start the online game and open it
rem in the browser (same as `npm run play:online`). Keep this window open while you play.
rem Everything is in one ( ) block, which cmd reads in full before running: the updater may replace this file.
rem (So no unescaped parentheses inside the block.)
(
  title Ticket to Taitoka - online
  cd /d "%~dp0.."
  echo.
  echo   Ticket to Taitoka
  echo.
  where node >nul 2>nul || (
    echo   Node.js was not found. Install it from https://nodejs.org, version 20 or newer, then run desktop\setup-windows.ps1 again.
    pause
    exit /b 1
  )
  node desktop\update.mjs
  echo.
  echo   Building the game and starting an online game...
  echo   Pick the edition in the game. Keep this window open while you play.
  echo   Close it or press Ctrl+C to stop.
  echo.
  call npm run play:online
  echo.
  echo   The game has stopped.
  pause
  exit /b
)
