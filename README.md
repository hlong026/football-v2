# football-v2

这是一个面向浏览器使用的足球比赛分析系统 V2 版本，采用前后端分离架构：

- 前端：Vue 3 + TypeScript + Vite
- 后端：FastAPI + Python
- 数据来源：当前 V2 版本聚焦澳客网链路

## 项目结构

```text
v2/
├── backend/              # FastAPI 后端
├── frontend/             # Vue 3 前端
├── start-dev.bat         # 开发启动脚本
├── start-dev-safe.bat    # 安全启动脚本（会先检查端口）
└── README.md
```

## 功能说明

当前版本主要围绕“单场比赛页面 + 时间锚点 + 结构化解析 + AI 分析”展开，支持：

- 手动输入比赛页面 URL
- 手动输入起始/结束时间锚点
- 抓取澳客网比赛、欧赔、亚盘、历史与机构详情数据
- 将抓取结果整理为结构化数据
- 按“抓取诊断 -> 结构化解析 -> 欧赔分析 -> 亚盘基础分析 -> 最终综合分析”的顺序手动推进分析
- 每个 AI 分析阶段都可以查看原始输出、手动编辑输出文本
- 编辑后的欧赔/亚盘阶段文本会自动作为下一阶段的输入
- 阶段编辑文本会自动保存到浏览器本地，刷新后可继续接着修改和执行
- 保存历史记录与结构化归档
- 本地保存抓取设置、模型设置和分析口径

## 当前推荐使用流程

1. 填写比赛链接、起始时间、结束时间
2. 先执行抓取诊断，确认 Cookie 和页面抓取正常
3. 执行结构化解析，得到右侧结构化结果
4. 进入正式分析页签，先执行欧赔分析
5. 如有需要，直接编辑欧赔分析输出文本
6. 再执行亚盘基础分析，系统会自动读取你编辑后的欧赔文本
7. 如有需要，继续编辑亚盘基础分析输出文本
8. 最后执行最终综合分析，系统会自动读取最新的欧赔与亚盘文本

## 环境要求

- Node.js 18+
- Python 3.10+
- npm

## 安装方式

### 1. 安装前端依赖

```bash
cd frontend
npm install
```

说明：前端正式构建推荐使用 Node 20-24，当前项目在 Windows 下遇到过 Node 25 触发 Vite/Rollup 原生构建进程崩溃的问题。现在 `npm run build` 会优先尝试当前 Node；如果检测到当前 Node 版本过新且系统里存在更稳定的 Node 20-24 版本，会自动切换过去继续构建。

### 2. 安装后端依赖

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 启动方式

### 方式一：使用一键脚本（Windows）

推荐直接在项目根目录运行：

```bash
start-dev-safe.bat
```

这个脚本会：

- 检查 Python 和 npm 是否存在
- 检查端口是否已被占用
- 启动后端服务
- 启动前端服务
- 自动打开浏览器首页

### 方式二：分别启动

后端：

```bash
cd backend
python run.py
```

前端：

```bash
cd frontend
npm run dev
```

## 默认端口

- 前端：`5176`
- 后端：`8010`

## 注意事项

- `backend/data/runtime-settings.json` 可能包含 Cookie、接口地址、API Key 等本地敏感配置，默认不提交到 Git。
- `backend/data/archive/` 和 `backend/data/structured-cache/` 属于运行产物，默认不提交到 Git。
- 首次运行前，请自行准备有效的 Cookie 和模型配置。

## 常用命令

前端类型检查：

```bash
cd frontend
npm run typecheck
```

前端构建：

```bash
cd frontend
npm run build
```

## 说明

如果你准备把这个目录单独推送到 `football-v2` 仓库，当前 README 和 `.gitignore` 已按独立仓库方式整理。
