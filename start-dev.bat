@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

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
set "FRONTEND_URL=http://localhost:5176"
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

echo [1/3] 正在启动后端服务...
start "Football Backend" cmd /k "cd /d ""!BACKEND_DIR!"" && !BACKEND_START!"

echo [2/3] 正在启动前端服务...
start "Football Frontend" cmd /k "cd /d ""!FRONTEND_DIR!"" && npm run dev"

echo [3/3] 正在打开主页...
timeout /t 5 /nobreak >nul
start "" "!FRONTEND_URL!"

echo 已完成：前后端启动命令已发送，主页已尝试打开。
echo INFO: If the page is blank at first, wait a few seconds and refresh.
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
