import { expectedAsianTargetCount, expectedEuropeanTargetCount } from './constants'
import type { AnalysisDirectionTag, AnalysisSectionCard, AnalysisSectionKey, AnalysisView, ParseSummary } from './types'

export function splitCompanies(value: string): string[] {
  return value
    .split(/[\r\n,，;；、]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function splitCookies(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function formatRate(value?: number | null) {
  return `${(((value ?? 0) as number) * 100).toFixed(0)}%`
}

export function isNonCriticalMatchFailure(
  failedPages?: Array<{
    key?: string
    page_url?: string
    status_code?: number | null
    final_url?: string | null
    error_message?: string | null
  }>,
  parseSummary?: ParseSummary,
  fetchedPages?: string[],
  expectedEuropeanCount = expectedEuropeanTargetCount,
  expectedAsianCount = expectedAsianTargetCount,
) {
  if (!failedPages || failedPages.length !== 1) {
    return false
  }
  const failedPage = failedPages[0]
  if (failedPage.key !== 'match' || failedPage.status_code !== 405) {
    return false
  }
  const fetched = new Set(fetchedPages || [])
  return fetched.has('odds')
    && fetched.has('asian_handicap')
    && fetched.has('history')
    && (parseSummary?.european_count ?? 0) >= expectedEuropeanCount
    && (parseSummary?.asian_count ?? 0) >= expectedAsianCount
}

export function getPageLabel(key: string) {
  const pageLabels: Record<string, string> = {
    match: '比赛页',
    odds: '欧赔页',
    asian_handicap: '亚盘页',
    history: '历史页',
  }
  return pageLabels[key] || key
}

export function toDatetimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function formatAnalysisText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/```[\w-]*\n?/g, '')
    .replace(/```/g, '')
    .split('\n')
    .map((line) => line
      .replace(/^#{1,6}\s*/, '')
      .replace(/^>\s?/, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function trimLeadMarker(line: string) {
  return formatAnalysisText(line)
    .replace(/^[-*•\d\s.、)）]+/, '')
    .replace(/^(结论|建议|风险|判断|方向|观察)[:：]\s*/, '')
    .replace(/^(第\s*\d+\s*[章节步部分]\s*)/, '')
    .trim()
}

export function cutText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
}

function normalizeAnalysisLine(line: string) {
  return trimLeadMarker(line)
    .replace(/[：:]+$/, '')
    .trim()
}

function compactDecisionLine(line: string) {
  return normalizeAnalysisLine(line)
    .replace(/^(平均欧赔与方向|欧赔整体与机构分歧|亚盘整体与机构分歧|欧亚交叉验证)[：:]?\s*/, '')
    .replace(/^(本次分析|本场分析|本场比赛|综合判断|分析方法论结论)[：:，,\s]*/, '')
    .replace(/^根据提供的.*?(?=(主胜|客胜|平局|胜平|平负|胜负|不败|主队|客队|大球|小球|概率|对比|占优|领先))/, '')
    .trim()
}

function isMethodologyLine(line: string) {
  return /^(时间锚点确认与分析范围|平均欧赔与方向|欧赔整体与机构分歧|亚盘整体与机构分歧|欧亚交叉验证|分析对象|时间锚点|本次分析|根据提供的|分析基于|方法说明)/.test(line)
}

function hasDecisionSignal(line: string) {
  return /(主胜|客胜|平局|胜平|平负|胜负|不败|让胜|让负|大球|小球|主队|客队|概率|对比|更占优|占优|领先|看好|倾向|首选|更值得|更高|更低)/.test(line)
}

function pickBestDecisionLine(lines: string[]) {
  const effectiveLines = lines
    .map(compactDecisionLine)
    .filter(Boolean)
    .filter((line) => !isSectionHeading(line) && !isMethodologyLine(line))

  return effectiveLines.find((line) => hasDecisionSignal(line))
    || effectiveLines.find((line) => /\d+(?:\.\d+)?%/.test(line))
    || effectiveLines[0]
    || '模型已返回分析结果'
}

function isConclusionHeading(line: string) {
  const normalized = formatAnalysisText(line)
    .replace(/[：:]+$/, '')
    .trim()
  return /^(最终结论|结论摘要|综合结论|核心结论|结论建议|结论)$/.test(normalized)
}

function extractFinalConclusion(rawLines: string[], cleanedLines: string[]) {
  for (const rawLine of rawLines) {
    const inlineMatch = formatAnalysisText(rawLine).match(/^(最终结论|结论摘要|综合结论|核心结论|结论建议|结论)\s*[：:]\s*(.+)$/)
    if (inlineMatch?.[2]) {
      const inlineConclusion = compactDecisionLine(inlineMatch[2])
      if (inlineConclusion) {
        return inlineConclusion
      }
    }
  }

  for (let index = 0; index < rawLines.length; index += 1) {
    const currentLine = formatAnalysisText(rawLines[index]).trim()
    if (!isConclusionHeading(currentLine)) {
      continue
    }
    for (let nextIndex = index + 1; nextIndex < rawLines.length; nextIndex += 1) {
      const candidateRaw = formatAnalysisText(rawLines[nextIndex]).trim()
      const candidate = compactDecisionLine(candidateRaw)
      if (!candidate || isSectionHeading(candidate) || isConclusionHeading(candidateRaw)) {
        continue
      }
      return candidate
    }
  }

  return pickBestDecisionLine(cleanedLines)
}

function extractConclusionLead(rawLines: string[], paragraphs: string[], cleanedLines: string[], headline: string) {
  for (let index = 0; index < rawLines.length; index += 1) {
    const currentLine = formatAnalysisText(rawLines[index]).trim()
    const inlineMatch = currentLine.match(/^(最终结论|结论摘要|综合结论|核心结论|结论建议|结论)\s*[：:]\s*(.+)$/)
    if (inlineMatch?.[2]) {
      const inlineLead = compactDecisionLine(inlineMatch[2])
      if (inlineLead && inlineLead !== headline) {
        return inlineLead
      }
    }
    if (!isConclusionHeading(currentLine)) {
      continue
    }
    for (let nextIndex = index + 1; nextIndex < rawLines.length; nextIndex += 1) {
      const candidateRaw = formatAnalysisText(rawLines[nextIndex]).trim()
      const candidate = compactDecisionLine(candidateRaw)
      if (!candidate || candidate === headline || isSectionHeading(candidate) || isConclusionHeading(candidateRaw)) {
        continue
      }
      return candidate
    }
  }

  return paragraphs.map(compactDecisionLine).find((item) => item && item !== headline && !isMethodologyLine(item))
    || cleanedLines.map(compactDecisionLine).find((item) => item && item !== headline && !isMethodologyLine(item))
    || headline
}

function countDirectionMatches(text: string, pattern: RegExp) {
  return text.match(pattern)?.length ?? 0
}

function resolveDirectionTag(lines: string[]): AnalysisDirectionTag {
  const content = lines.join('\n')
  if (!content) {
    return '观望'
  }
  if (/(观望|等待|暂不|回避|不宜|谨慎参与|先观察|继续观察)/.test(content)) {
    return '观望'
  }

  let homeScore = countDirectionMatches(content, /(主胜|主队|偏主|看好主|首选主|支持主|主不败|让胜|主队方向)/g)
  let awayScore = countDirectionMatches(content, /(客胜|客队|偏客|看好客|首选客|支持客|客不败|让负|客队方向)/g)
  let drawScore = countDirectionMatches(content, /(平局|偏平|防平|首选平|走平)/g)

  if (/胜平/.test(content)) {
    homeScore += 1
    drawScore += 1
  }
  if (/平负/.test(content)) {
    awayScore += 1
    drawScore += 1
  }
  if (/胜负/.test(content)) {
    homeScore += 1
    awayScore += 1
  }

  const maxScore = Math.max(homeScore, awayScore, drawScore)
  if (maxScore <= 0) {
    return '观望'
  }
  if (drawScore >= homeScore && drawScore >= awayScore) {
    return '偏平'
  }
  if (homeScore >= awayScore) {
    return '偏主'
  }
  return '偏客'
}

export function buildAnalysisView(text: string, emptyHeadline: string, emptyLead: string): AnalysisView {
  const normalized = formatAnalysisText(text)
  if (!normalized || normalized.startsWith('还没有') || normalized.startsWith('暂无')) {
    return {
      headline: emptyHeadline,
      headlineFull: emptyHeadline,
      lead: emptyLead,
      leadFull: emptyLead,
      directionTag: '观望',
      summaryPoints: [],
      raw: text,
      hasContent: false,
    }
  }
  const paragraphs = normalized.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean)
  const rawLines = normalized.split('\n').map((item) => formatAnalysisText(item).trim()).filter(Boolean)
  const cleanedLines = rawLines.map(normalizeAnalysisLine).filter((item) => item.length >= 4)
  const headlineSeed = extractFinalConclusion(rawLines, cleanedLines)
  const leadSeed = extractConclusionLead(rawLines, paragraphs, cleanedLines, headlineSeed)
  const prioritizedLines = [
    ...cleanedLines.filter((item) => hasDecisionSignal(compactDecisionLine(item))),
    ...cleanedLines.filter((item) => !hasDecisionSignal(compactDecisionLine(item)) && !isMethodologyLine(item)),
    ...cleanedLines.filter((item) => isMethodologyLine(item)),
  ]
  const lines = prioritizedLines.filter((item) => item.length >= 6)
  const summaryPoints: string[] = []
  for (const line of lines) {
    const compactLine = compactDecisionLine(line)
    if (!compactLine || compactLine === headlineSeed || compactLine === leadSeed || summaryPoints.includes(compactLine)) {
      continue
    }
    if (compactLine) {
      summaryPoints.push(compactLine)
    }
    if (summaryPoints.length >= 5) {
      break
    }
  }
  const directHeadline = headlineSeed.split(/[。；!！?？\n]/)[0]?.trim() || headlineSeed
  const compactLead = leadSeed && leadSeed !== headlineSeed ? cutText(leadSeed, 82) : ''
  const directionTag = resolveDirectionTag([headlineSeed, leadSeed, ...summaryPoints])
  return {
    headline: cutText(directHeadline, 38),
    headlineFull: headlineSeed,
    lead: compactLead,
    leadFull: leadSeed,
    directionTag,
    summaryPoints: summaryPoints.slice(0, 4),
    raw: normalized,
    hasContent: true,
  }
}

function resolveSectionKey(line: string): AnalysisSectionKey | null {
  if (/倾向|方向|看好|首选|主胜|客胜|平局|胜平|平负|胜负|不败/.test(line)) {
    return 'tendency'
  }
  if (/风险|警惕|防范|注意|不确定|隐患|波动/.test(line)) {
    return 'risk'
  }
  if (/依据|原因|因为|欧赔|亚盘|盘口|赔率|水位|数据|走势|交叉验证|一致|冲突/.test(line)) {
    return 'basis'
  }
  if (/建议|策略|操作|可考虑|推荐|方案|下手|执行/.test(line)) {
    return 'advice'
  }
  return null
}

function isSectionHeading(line: string) {
  return /^(倾向方向|风险提醒|判断依据|操作建议|时间锚点确认与分析范围|欧赔整体与机构分歧|亚盘整体与机构分歧|欧亚交叉验证|最终结论)$/.test(line)
}

const preferredDisplayFieldPairs: Array<[string, string]> = [
  ['anchor_start_time', 'anchor_start_time_display'],
  ['anchor_end_time', 'anchor_end_time_display'],
  ['change_time', 'change_time_display'],
]

function normalizeDisplayPreferredValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeDisplayPreferredValue)
  }
  if (!value || typeof value !== 'object') {
    return value
  }

  const source = value as Record<string, unknown>
  const normalized: Record<string, unknown> = {}
  const consumed = new Set<string>()

  preferredDisplayFieldPairs.forEach(([baseField, displayField]) => {
    const baseValue = source[baseField]
    const displayValue = source[displayField]
    if (baseValue === undefined && displayValue === undefined) {
      return
    }

    normalized[baseField] = normalizeDisplayPreferredValue(displayValue ?? baseValue)
    consumed.add(baseField)
    if (displayValue !== undefined) {
      consumed.add(displayField)
    }

    if (displayValue !== undefined && baseValue !== undefined && displayValue !== baseValue) {
      normalized[`${baseField}_raw`] = normalizeDisplayPreferredValue(baseValue)
    }
  })

  Object.entries(source).forEach(([key, currentValue]) => {
    if (consumed.has(key)) {
      return
    }
    normalized[key] = normalizeDisplayPreferredValue(currentValue)
  })

  return normalized
}

export function buildAnalysisSectionCards(view: AnalysisView): AnalysisSectionCard[] {
  const configs: Array<{ key: AnalysisSectionKey; title: string; hint: string }> = [
    {
      key: 'tendency',
      title: '倾向方向',
      hint: '先看模型更偏向哪一边。',
    },
    {
      key: 'risk',
      title: '风险提醒',
      hint: '提醒你哪些地方可能反转或不稳。',
    },
    {
      key: 'basis',
      title: '判断依据',
      hint: '解释模型主要参考了哪些赔率线索。',
    },
    {
      key: 'advice',
      title: '操作建议',
      hint: '把结论转成更容易执行的建议。',
    },
  ]
  const cleanedLines = view.raw
    .split('\n')
    .map(trimLeadMarker)
    .map((item) => item.replace(/[：:]+$/, '').trim())
    .filter((item) => item.length >= 4)
  const usedLines = new Set<string>()
  const buckets = Object.fromEntries(configs.map((config) => [config.key, [] as string[]])) as Record<AnalysisSectionKey, string[]>
  let currentSection: AnalysisSectionKey | null = null
  for (const line of cleanedLines) {
    const headingSection = resolveSectionKey(line)
    if (isSectionHeading(line) && headingSection) {
      currentSection = headingSection
      continue
    }
    const matchedSection = currentSection || resolveSectionKey(line)
    if (!matchedSection) {
      continue
    }
    if (!buckets[matchedSection].includes(line)) {
      buckets[matchedSection].push(line)
      usedLines.add(line)
    }
  }
  const fallbackPool = [view.lead, ...view.summaryPoints, ...cleanedLines].filter(Boolean)
  const fallbackOrder: AnalysisSectionKey[] = ['tendency', 'basis', 'risk', 'advice']
  fallbackOrder.forEach((key, index) => {
    if (buckets[key].length > 0) {
      return
    }
    const fallback = fallbackPool.find((item) => item && !usedLines.has(item))
      || fallbackPool[index]
      || ''
    if (fallback) {
      buckets[key].push(fallback)
      usedLines.add(fallback)
    }
  })
  return configs.map((config) => ({
    key: config.key,
    title: config.title,
    hint: config.hint,
    items: buckets[config.key].slice(0, 3),
  }))
}

export function formatDate(value?: string) {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString('zh-CN')
}

export function barStyle(value: number) {
  const normalized = Math.max(0, Math.min(value, 100))
  return { width: `${normalized}%` }
}

export function pretty(value: unknown) {
  return JSON.stringify(value, null, 2)
}

export function prettyDisplayPreferred(value: unknown) {
  return JSON.stringify(normalizeDisplayPreferredValue(value), null, 2)
}
