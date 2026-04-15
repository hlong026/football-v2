import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const currentNodePath = process.execPath
const currentNodeVersion = normalizeVersion(process.versions.node)
const preferredNodePath = resolvePreferredNodePath()

if (!preferredNodePath) {
  console.error(`当前 Node 版本 ${currentNodeVersion} 会导致 Vite/Rollup 在 Windows 上不稳定。请改用 Node 20-24（推荐 Node 22 LTS）后再执行构建。`)
  process.exit(1)
}

if (preferredNodePath !== currentNodePath) {
  const preferredVersion = readNodeVersion(preferredNodePath)
  console.log(`检测到当前 Node 为 ${currentNodeVersion}，构建将切换到 ${preferredVersion}：${preferredNodePath}`)
}

runNodeScript(preferredNodePath, join(rootDir, 'node_modules', 'vue-tsc', 'bin', 'vue-tsc.js'), ['-b'])
runNodeScript(preferredNodePath, join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js'), ['build'])

function resolvePreferredNodePath() {
  if (!shouldUseFallbackNode(currentNodeVersion)) {
    return currentNodePath
  }

  const envPath = process.env.FOOTBALL_ANALYSIS_NODE_PATH?.trim()
  if (envPath) {
    const version = readNodeVersion(envPath)
    if (isSupportedNodeVersion(version)) {
      return envPath
    }
  }

  const candidates = listNodeCandidates()
  for (const candidate of candidates) {
    if (!candidate || candidate === currentNodePath) continue
    const version = readNodeVersion(candidate)
    if (isSupportedNodeVersion(version)) {
      return candidate
    }
  }

  return null
}

function shouldUseFallbackNode(version) {
  const major = parseMajor(version)
  return Number.isFinite(major) && major >= 25
}

function isSupportedNodeVersion(version) {
  const major = parseMajor(version)
  return Number.isFinite(major) && major >= 20 && major < 25
}

function listNodeCandidates() {
  const command = process.platform === 'win32' ? 'where' : 'which'
  const args = process.platform === 'win32' ? ['node'] : ['-a', 'node']
  const result = spawnSync(command, args, { cwd: rootDir, encoding: 'utf8' })
  if (result.status !== 0 || !result.stdout) {
    return []
  }
  return [...new Set(result.stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))]
}

function runNodeScript(nodePath, scriptPath, args) {
  const result = spawnSync(nodePath, [scriptPath, ...args], {
    cwd: rootDir,
    stdio: 'inherit',
  })
  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status)
  }
  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
}

function readNodeVersion(nodePath) {
  const result = spawnSync(nodePath, ['-v'], { cwd: rootDir, encoding: 'utf8' })
  if (result.status !== 0 || !result.stdout) {
    return ''
  }
  return normalizeVersion(result.stdout)
}

function normalizeVersion(version) {
  return version.trim().replace(/^v/i, '')
}

function parseMajor(version) {
  return Number.parseInt(normalizeVersion(version).split('.')[0] || '', 10)
}
