@echo off
echo Starting all services...
echo.

REM Start the audio server in a new terminal
start "Audio Server" cmd /k "python agent\audio_server.py"

REM Start the main agent in a new terminal
start "Main Agent" cmd /k "cd agent && uv run python main.py dev"

REM Start the web dev server in a new terminal
start "Web Dev Server" cmd /k "cd web && pnpm dev"

echo All services started in separate terminals!
echo Please check the opened terminal windows.
pause
