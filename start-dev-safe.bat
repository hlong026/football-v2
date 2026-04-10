@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

set "CHECK_ONLY=0"
if /I "%~1"=="--check-only" set "CHECK_ONLY=1"

call :main
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo 启动失败，按任意键关闭窗口...
  pause >nul
)
exit /b %EXIT_CODE%

:main
set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "BACKEND_PORT=8010"
set "FRONTEND_PORT=5176"
set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%"
set "BACKEND_START="

if not exist "!BACKEND_DIR!\run.py" (
  echo [错误] 未找到后端启动文件：!BACKEND_DIR!\run.py
  exit /b 1
)

if not exist "!FRONTEND_DIR!\package.json" (
  echo [错误] 未找到前端配置文件：!FRONTEND_DIR!\package.json
  exit /b 1
)

call :resolve_python
if errorlevel 1 exit /b 1

where npm >nul 2>nul
if errorlevel 1 (
  echo [错误] 没有找到 npm。请先安装 Node.js。
  exit /b 1
)

call :detect_port %BACKEND_PORT% BACKEND_PID
if defined BACKEND_PID (
  echo [提示] 端口 %BACKEND_PORT% 已被 PID !BACKEND_PID! 占用，跳过后端启动。
) else (
  if "%CHECK_ONLY%"=="1" (
    echo [检查] 端口 %BACKEND_PORT% 当前空闲，后端可启动。
  ) else (
    echo [1/3] 正在启动后端服务...
    start "Football Backend" cmd /k "cd /d ""!BACKEND_DIR!"" && !BACKEND_START!"
  )
)

call :detect_port %FRONTEND_PORT% FRONTEND_PID
if defined FRONTEND_PID (
  echo [2/3] 端口 %FRONTEND_PORT% 已被 PID !FRONTEND_PID! 占用，跳过前端启动。
) else (
  if "%CHECK_ONLY%"=="1" (
    echo [检查] 端口 %FRONTEND_PORT% 当前空闲，前端可启动。
  ) else (
    echo [2/3] 正在启动前端服务...
    start "Football Frontend" cmd /k "cd /d ""!FRONTEND_DIR!"" && npm run dev"
  )
)

if "%CHECK_ONLY%"=="1" (
  echo [检查] 主页地址：!FRONTEND_URL!
) else if not defined FRONTEND_PID (
  echo [提示] 前端首次启动中，等待 5 秒后打开主页...
  timeout /t 5 /nobreak >nul
)

if "%CHECK_ONLY%"=="1" (
  echo [检查完成] 未执行启动，也未打开浏览器。
) else (
  echo [3/3] 正在打开主页...
  start "" "!FRONTEND_URL!"
)

echo 已完成：安全启动检查已执行。
echo BACKEND_PORT=%BACKEND_PORT%
echo FRONTEND_PORT=%FRONTEND_PORT%
echo 如果浏览器打开过快导致页面为空，等待几秒后刷新即可。
exit /b 0

:resolve_python
set "PYTHON_CMD="
set "BACKEND_START="
if exist "!ROOT_DIR!.venv\Scripts\python.exe" goto use_root_venv
if exist "!BACKEND_DIR!\.venv\Scripts\python.exe" goto use_backend_venv
where py >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_CMD=py -3"
  set "BACKEND_START=py -3 run.py"
  exit /b 0
)
where python >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_CMD=python"
  set "BACKEND_START=python run.py"
  exit /b 0
)
echo [错误] 没有找到 Python。请先安装 Python，或创建 .venv 虚拟环境。
exit /b 1

:use_root_venv
set "PYTHON_CMD=!ROOT_DIR!.venv\Scripts\python.exe"
set "BACKEND_START=""!ROOT_DIR!.venv\Scripts\python.exe"" run.py"
exit /b 0

:use_backend_venv
set "PYTHON_CMD=!BACKEND_DIR!\.venv\Scripts\python.exe"
set "BACKEND_START=""!BACKEND_DIR!\.venv\Scripts\python.exe"" run.py"
exit /b 0

:detect_port
set "%~2="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":%~1 .*LISTENING"') do (
  set "%~2=%%a"
  goto :eof
)
exit /b 0
