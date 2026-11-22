@echo off
title Ticket to Taitoka - online
cd /d "%~dp0.."
echo.
echo   Building the game and starting an online game...
echo   Pick the edition (USA, China or Europe) in the game. Keep this window open while you play.
echo   Close it (or press Ctrl+C) to stop.
echo.
call npm run play:online
echo.
echo   The game has stopped.
pause
