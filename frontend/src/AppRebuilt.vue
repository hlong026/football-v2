<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AnalysisResultTab from './features/workbench/components/AnalysisResultTab.vue'
import ResultTextTab from './features/workbench/components/ResultTextTab.vue'
import StructuredResultTab from './features/workbench/components/StructuredResultTab.vue'
import {
  defaultApiEndpoint,
  defaultAsianCompanies,
  defaultDoubaoApiEndpoint,
  defaultDoubaoModelName,
  defaultEuropeanCompanies,
  defaultFrequencyPenalty,
  defaultMaxTokens,
  defaultModelName,
  defaultPresencePenalty,
  defaultPromptName,
  defaultSite,
  defaultTemperature,
  defaultTimeoutSeconds,
  defaultTopP,
  formDraftStorageKey,
  resultTabLabels,
  sampleMatchUrl,
} from './features/workbench/constants'
import { callWorkbenchPost, loadServerAISettings, loadServerAnalysisSettings, loadServerFetchSettings, runWorkbenchStage, saveServerAISettings, saveServerAnalysisSettings, saveServerFetchSettings } from './features/workbench/api'
import {
  loadStoredFormDraft as readStoredFormDraft,
  persistFormDraft as writeFormDraft,
} from './features/workbench/storage'
import {
  buildAnalysisSectionCards,
  buildAnalysisView,
  formatAnalysisText,
  formatDate,
  pretty,
  prettyDisplayPreferred,
  splitCompanies,
  splitCookies,
  toDatetimeLocalValue,
} from './features/workbench/utils'
import type { AIConnectionTestResult, AnalysisConclusionCard, AnalysisRunResult, CookieTestResult, ResultTab, SavedAISettingsResponse, SavedAnalysisSettingsResponse, SavedFetchSettingsResponse, StageAnalysisResult, StageRunResult, StructuredMatchLite, WorkflowStepItem } from './features/workbench/types'

type SupportedAIProvider = 'deepseek' | 'openai' | 'doubao'
type StageKey = 'european' | 'asian_base' | 'final'

const providerPresets: Record<SupportedAIProvider, { label: string; apiEndpoint: string; modelName: string; helperText: string }> = {
  deepseek: {
    label: 'DeepSeek',
    apiEndpoint: defaultApiEndpoint,
    modelName: defaultModelName,
    helperText: 'DeepSeek 会沿用当前默认地址与模型，你可以按需改成自己的兼容网关。',
  },
  openai: {
    label: 'OpenAI Compatible',
    apiEndpoint: 'https://api.openai.com/v1',
    modelName: 'gpt-4o-mini',
    helperText: 'OpenAI Compatible 适合通用兼容接口；如果你用自建网关，可以手动覆盖地址和模型名。',
  },
  doubao: {
    label: '豆包官方 API',
    apiEndpoint: defaultDoubaoApiEndpoint,
    modelName: defaultDoubaoModelName,
    helperText: '选择豆包官方 API 后，会自动带出官方地址和默认模型，通常只需要填写 API Key。',
  },
}

const stored = readStoredFormDraft(formDraftStorageKey, resultTabLabels)
const site = ref(stored.site ?? defaultSite)
const matchUrl = ref(stored.matchUrl ?? '')
const anchorStartTime = ref(stored.anchorStartTime ?? '')
const anchorEndTime = ref(stored.anchorEndTime ?? '')
const aiProvider = ref<SupportedAIProvider>(stored.aiProvider ?? 'deepseek')
const apiEndpoint = ref(stored.apiEndpoint ?? defaultApiEndpoint)
const apiKey = ref(stored.apiKey ?? '')
const modelName = ref(stored.modelName ?? defaultModelName)
const fetchCookie = ref(stored.fetchCookie ?? '')
const temperature = ref(stored.temperature ?? defaultTemperature)
const maxTokens = ref(stored.maxTokens ?? defaultMaxTokens)
const topP = ref(stored.topP ?? defaultTopP)
const presencePenalty = ref(stored.presencePenalty ?? defaultPresencePenalty)
const frequencyPenalty = ref(stored.frequencyPenalty ?? defaultFrequencyPenalty)
const timeoutSeconds = ref(stored.timeoutSeconds ?? defaultTimeoutSeconds)
const europeanPromptName = ref(stored.europeanPromptName ?? 'european')
const europeanPromptText = ref(stored.europeanPromptText ?? '')
const asianBasePromptName = ref(stored.asianBasePromptName ?? 'asian_base')
const asianBasePromptText = ref(stored.asianBasePromptText ?? '')
const finalPromptName = ref(stored.finalPromptName ?? defaultPromptName)
const finalPromptText = ref(stored.finalPromptText ?? '')
const europeanCompanies = ref(stored.europeanCompanies ?? defaultEuropeanCompanies)
const asianCompanies = ref(stored.asianCompanies ?? defaultAsianCompanies)
const europeanStageDraftText = ref(stored.europeanStageText ?? '')
const asianBaseStageDraftText = ref(stored.asianBaseStageText ?? '')
const finalStageDraftText = ref(stored.finalStageText ?? '')
const activeResultTab = ref<ResultTab>(stored.activeResultTab ?? 'analysis')

const loadingStructured = ref(false)
const loadingPreview = ref(false)
const loadingAnalysis = ref(false)
const loadingCookieTest = ref(false)
const loadingFetchSettings = ref(false)
const loadingAISettings = ref(false)
const loadingAnalysisSettings = ref(false)
const loadingInstitutionSettings = ref(false)
const loadingModelConnection = ref(false)
const loadingStageKey = ref<StageKey | null>(null)
const errorMessage = ref('')
const successMessage = ref('')
const structuredResult = ref<StructuredMatchLite | null>(null)
const previewResult = ref<any>(null)
const analysisResult = ref<AnalysisRunResult | null>(null)
const cookieTestResult = ref<CookieTestResult | null>(null)
const modelConnectionResult = ref<AIConnectionTestResult | null>(null)
const savedFetchSettings = ref<SavedFetchSettingsResponse | null>(null)
const savedAISettings = ref<SavedAISettingsResponse | null>(null)
const savedAnalysisSettings = ref<SavedAnalysisSettingsResponse | null>(null)
const modelSettingsSavedAt = ref(stored.modelSettingsSavedAt ?? '')
const analysisSettingsSavedAt = ref(stored.analysisSettingsSavedAt ?? '')
const institutionSettingsSavedAt = ref(stored.institutionSettingsSavedAt ?? '')
const fetchSettingsSavedAt = ref(stored.fetchSettingsSavedAt ?? '')
const coreInputExpanded = ref(true)
const fetchSettingsExpanded = ref(true)
const modelSettingsExpanded = ref(true)
const analysisSettingsExpanded = ref(true)

onMounted(() => {
  void loadSavedFetchSettingsFromServer()
  void loadSavedAISettingsFromServer()
  void loadSavedAnalysisSettingsFromServer()
})

watch(aiProvider, (provider, previousProvider) => {
  const preset = providerPresets[provider]
  const knownEndpoints = Object.values(providerPresets).map((item) => item.apiEndpoint)
  const knownModels = Object.values(providerPresets).map((item) => item.modelName)
  const shouldForceReplace = previousProvider !== undefined && previousProvider !== provider
  if (shouldForceReplace || !apiEndpoint.value.trim() || knownEndpoints.includes(apiEndpoint.value.trim())) {
    apiEndpoint.value = preset.apiEndpoint
  }
  if (shouldForceReplace || !modelName.value.trim() || knownModels.includes(modelName.value.trim())) {
    modelName.value = preset.modelName
  }
}, { immediate: true })

watch([site, matchUrl, anchorStartTime, anchorEndTime, aiProvider, apiEndpoint, apiKey, modelName, fetchCookie, temperature, maxTokens, topP, presencePenalty, frequencyPenalty, timeoutSeconds, europeanPromptName, europeanPromptText, asianBasePromptName, asianBasePromptText, finalPromptName, finalPromptText, europeanCompanies, asianCompanies, europeanStageDraftText, asianBaseStageDraftText, finalStageDraftText, activeResultTab], saveDraft)

watch([matchUrl, anchorStartTime, anchorEndTime, europeanCompanies, asianCompanies], (currentValues, previousValues) => {
  if (!previousValues) {
    return
  }
  const hasChanged = currentValues.some((value, index) => value !== previousValues[index])
  if (!hasChanged || !hasMatchExecutionState()) {
    return
  }
  resetMatchExecutionState()
  setSuccess('比赛上下文已更新，右侧结果已清空。请重新执行抓取诊断、结构化解析和三阶段分析。')
  saveDraft()
})

const canSubmit = computed(() => Boolean(matchUrl.value.trim() && anchorStartTime.value))
const isBusy = computed(() => loadingStructured.value || loadingPreview.value || loadingAnalysis.value || loadingCookieTest.value || loadingModelConnection.value || loadingInstitutionSettings.value || Boolean(loadingStageKey.value))
const cookiePoolItems = computed(() => splitCookies(fetchCookie.value))
const currentProviderPreset = computed(() => providerPresets[aiProvider.value])
const siteLabel = computed(() => (site.value === 'okooo' ? '澳客网' : site.value))
const selectedEuropeanCompanyCount = computed(() => splitCompanies(europeanCompanies.value).length)
const selectedAsianCompanyCount = computed(() => splitCompanies(asianCompanies.value).length)
const diagnosticCompleted = computed(() => Boolean(cookieTestResult.value))
const analysisSucceeded = computed(() => Boolean(analysisResult.value?.final_result?.success && finalStageDraftText.value.trim()))
const stagePreviewCount = computed(() => Object.keys(previewResult.value?.stages || {}).length)
const europeanStageText = computed(() => formatAnalysisText(europeanStageDraftText.value || analysisResult.value?.european_result?.raw_response || analysisResult.value?.european_result?.error_message || '暂无欧赔分析结果'))
const asianBaseStageText = computed(() => formatAnalysisText(asianBaseStageDraftText.value || analysisResult.value?.asian_base_result?.raw_response || analysisResult.value?.asian_base_result?.error_message || '暂无亚盘基础分析结果'))
const finalStageText = computed(() => formatAnalysisText(finalStageDraftText.value || analysisResult.value?.final_result?.raw_response || analysisResult.value?.raw_response || analysisResult.value?.final_result?.error_message || analysisResult.value?.error_message || '暂无最终综合分析结果'))
const analysisDisplayText = computed(() => {
  if (!analysisResult.value && !europeanStageDraftText.value.trim() && !asianBaseStageDraftText.value.trim() && !finalStageDraftText.value.trim()) {
    return '还没有分步分析结果，请先按欧赔分析 → 亚盘基础分析 → 最终综合分析的顺序逐步执行。'
  }
  return [
    '【欧赔分析】',
    europeanStageText.value,
    '',
    '【亚盘基础分析】',
    asianBaseStageText.value,
    '',
    '【最终综合分析】',
    finalStageText.value,
  ].join('\n')
})
const analysisView = computed(() => analysisSucceeded.value
  ? buildAnalysisView(finalStageText.value, '等待最终综合分析', '完成最终综合分析后，这里会提炼本场结论。')
  : buildAnalysisView('还没有最终综合分析结果', '等待最终综合分析', '完成最终综合分析后，这里会提炼本场结论。'))
const analysisSectionCards = computed(() => analysisSucceeded.value ? buildAnalysisSectionCards(analysisView.value) : [])
const splitWorkflowSteps = computed<WorkflowStepItem[]>(() => {
  const inputDone = canSubmit.value
  const diagnosticDone = diagnosticCompleted.value
  const structuredDone = Boolean(structuredResult.value)
  const europeanDone = Boolean(europeanStageDraftText.value.trim())
  const asianBaseDone = Boolean(asianBaseStageDraftText.value.trim())
  const finalDone = Boolean(finalStageDraftText.value.trim())

  const currentKey: WorkflowStepItem['key'] = !inputDone
    ? 'input'
    : !diagnosticDone
      ? 'diagnostic'
      : !structuredDone
        ? 'structured'
        : !europeanDone
          ? 'european'
          : !asianBaseDone
            ? 'asian_base'
            : !finalDone
              ? 'final'
              : 'final'

  return [
    {
      key: 'input',
      label: '基础输入',
      statusLabel: inputDone ? '已完成' : '当前步骤',
      description: '填写比赛链接、时间范围、机构范围和三阶段提示词，这是整个分析链路的起点。',
      state: !inputDone ? 'current' : 'done',
    },
    {
      key: 'diagnostic',
      label: '抓取诊断',
      statusLabel: diagnosticDone ? '已完成' : currentKey === 'diagnostic' ? '当前步骤' : '待执行',
      description: '先确认 Cookie、欧赔页和亚盘页都能抓到，再继续进入结构化与分析。',
      state: diagnosticDone ? 'done' : currentKey === 'diagnostic' ? 'current' : 'idle',
    },
    {
      key: 'structured',
      label: '结构化解析',
      statusLabel: structuredDone ? '已完成' : currentKey === 'structured' ? '当前步骤' : '待执行',
      description: '把原始采集结果整理成结构化数据，再按指定时间和机构同步清洗。',
      state: structuredDone ? 'done' : currentKey === 'structured' ? 'current' : 'idle',
    },
    {
      key: 'european',
      label: '欧赔分析',
      statusLabel: europeanDone ? '已完成' : currentKey === 'european' ? '当前步骤' : '待执行',
      description: '正式分析开始后，第一阶段只基于欧赔数据输出阶段性结论。',
      state: europeanDone ? 'done' : currentKey === 'european' ? 'current' : 'idle',
    },
    {
      key: 'asian_base',
      label: '亚盘基础分析',
      statusLabel: asianBaseDone ? '已完成' : currentKey === 'asian_base' ? '当前步骤' : '待执行',
      description: '第二阶段结合亚盘主盘与欧赔上下文，输出亚盘基础判断。',
      state: asianBaseDone ? 'done' : currentKey === 'asian_base' ? 'current' : 'idle',
    },
    {
      key: 'final',
      label: '最终综合分析',
      statusLabel: finalDone ? '已完成' : currentKey === 'final' ? '当前步骤' : '待执行',
      description: '最后综合欧赔与亚盘阶段结论，得到最终业务判断。',
      state: finalDone ? 'done' : currentKey === 'final' ? 'current' : 'idle',
    },
  ]
})
const currentWorkflowStepKey = computed(() => splitWorkflowSteps.value.find((item) => item.state === 'current')?.key ?? 'input')
const heroWorkflowSteps = computed(() => splitWorkflowSteps.value.filter((item) => item.key !== 'preview'))
const analysisConclusionCards = computed<AnalysisConclusionCard[]>(() => {
  const tendency = getAnalysisTendencyText()
  const comparison = getAnalysisComparisonCardData()
  const risk = getAnalysisRiskText()
  const advice = getAnalysisAdviceCardData()
  return [
    {
      label: '倾向判断',
      hint: '一句话先看模型最后更偏向哪边。',
      value: cutDisplayText(tendency, 30),
      fullValue: tendency,
      tone: 'primary',
    },
    {
      label: '概率对比',
      hint: '抓最关键的概率差、赔率差和强弱对比。',
      value: comparison.summary,
      fullValue: comparison.fullValue,
      tone: 'accent',
      layout: 'comparison',
      leftLabel: comparison.leftLabel,
      leftValue: comparison.leftValue,
      rightLabel: comparison.rightLabel,
      rightValue: comparison.rightValue,
    },
    {
      label: '风险提醒',
      hint: '先提醒最可能让判断失真的风险点。',
      value: cutDisplayText(risk, 52),
      fullValue: risk,
      tone: 'warning',
    },
    {
      label: '操作建议',
      hint: '把结论直接翻译成更容易执行的动作。',
      value: advice.action,
      fullValue: advice.fullValue,
      tone: 'success',
      layout: 'advice',
      subValue: `风险等级：${advice.riskLevel}`,
    },
  ]
})
const structuredDisplayText = computed(() => structuredResult.value ? pretty(structuredResult.value) : '还没有结构化结果，点击“结构化解析”后这里会显示数据。')
const previewDisplayText = computed(() => previewResult.value ? prettyDisplayPreferred(previewResult.value) : '还没有模型输入预览，点击“分析输入预览”后这里会显示 system prompt、user prompt 和结构化入参。')
const analysisStageCards = computed<Array<{
  key: StageKey
  stepLabel: string
  title: string
  status: string
  statusTone: 'success' | 'warning' | 'error' | 'info'
  promptName: string
  summary: string
  fullText: string
  draftText: string
  runLabel: string
  runDisabled: boolean
  runLoading: boolean
  fields: Array<{ label: string; value: string }>
}>>(() => {
  const hasStructured = Boolean(structuredResult.value)
  const europeanSummary = analysisResult.value?.european_result?.summary
  const asianSummary = analysisResult.value?.asian_base_result?.summary
  const finalSummary = analysisResult.value?.final_result?.summary
  return [
    {
      key: 'european',
      stepLabel: '阶段 1',
      title: '欧赔分析',
      status: getStageStatusText(analysisResult.value?.european_result, europeanStageDraftText.value),
      statusTone: getStageStatusTone(analysisResult.value?.european_result, europeanStageDraftText.value),
      promptName: analysisResult.value?.european_result?.prompt_name || europeanPromptName.value || 'european',
      summary: europeanSummary?.statement || europeanStageText.value,
      fullText: europeanStageText.value,
      draftText: europeanStageDraftText.value,
      runLabel: loadingStageKey.value === 'european' ? '执行中...' : '执行欧赔分析',
      runDisabled: !hasStructured || Boolean(loadingStageKey.value),
      runLoading: loadingStageKey.value === 'european',
      fields: [
        { label: '方向', value: europeanSummary?.direction || '-' },
        { label: '机构范围', value: europeanSummary?.company_scope_summary || '未指定' },
        { label: '时间范围', value: europeanSummary?.time_scope_summary || '未指定' },
      ],
    },
    {
      key: 'asian_base',
      stepLabel: '阶段 2',
      title: '亚盘基础分析',
      status: getStageStatusText(analysisResult.value?.asian_base_result, asianBaseStageDraftText.value),
      statusTone: getStageStatusTone(analysisResult.value?.asian_base_result, asianBaseStageDraftText.value),
      promptName: analysisResult.value?.asian_base_result?.prompt_name || asianBasePromptName.value || 'asian_base',
      summary: asianSummary?.statement || asianBaseStageText.value,
      fullText: asianBaseStageText.value,
      draftText: asianBaseStageDraftText.value,
      runLabel: loadingStageKey.value === 'asian_base' ? '执行中...' : '执行亚盘基础分析',
      runDisabled: !hasStructured || !europeanStageDraftText.value.trim() || Boolean(loadingStageKey.value),
      runLoading: loadingStageKey.value === 'asian_base',
      fields: [
        { label: '方向', value: asianSummary?.direction || '-' },
        { label: '机构范围', value: asianSummary?.company_scope_summary || '未指定' },
        { label: '时间范围', value: asianSummary?.time_scope_summary || '未指定' },
      ],
    },
    {
      key: 'final',
      stepLabel: '阶段 3',
      title: '最终综合分析',
      status: getStageStatusText(analysisResult.value?.final_result, finalStageDraftText.value),
      statusTone: getStageStatusTone(analysisResult.value?.final_result, finalStageDraftText.value),
      promptName: analysisResult.value?.final_result?.prompt_name || finalPromptName.value || defaultPromptName,
      summary: finalSummary?.final_statement || finalStageText.value,
      fullText: finalStageText.value,
      draftText: finalStageDraftText.value,
      runLabel: loadingStageKey.value === 'final' ? '执行中...' : '执行最终综合分析',
      runDisabled: !hasStructured || !europeanStageDraftText.value.trim() || !asianBaseStageDraftText.value.trim() || Boolean(loadingStageKey.value),
      runLoading: loadingStageKey.value === 'final',
      fields: [
        { label: '最终方向', value: finalSummary?.final_direction || '-' },
        { label: '欧亚一致性', value: finalSummary?.cross_market_consensus || '待确认' },
        { label: '风险等级', value: finalSummary?.risk_level || '-' },
      ],
    },
  ]
})
function getMatchupText(payload?: { home_team?: string | null; away_team?: string | null } | null) {
  if (payload?.home_team && payload?.away_team) {
    return `${payload.home_team} vs ${payload.away_team}`
  }
  if (payload?.home_team) {
    return payload.home_team
  }
  if (payload?.away_team) {
    return payload.away_team
  }
  return '-'
}

const structuredMatchupText = computed(() => getMatchupText(structuredResult.value))
const currentMatchTitle = computed(() => {
  if (structuredMatchupText.value !== '-') {
    return structuredMatchupText.value
  }
  return structuredResult.value?.match_key || '-'
})

function getSectionCardValue(sectionCards: Array<{ key: string; items: string[] }>, key: string, fallback: string) {
  return sectionCards.find((item) => item.key === key)?.items[0] || fallback
}

function getAnalysisSignalPool() {
  return [
    analysisView.value.headlineFull,
    analysisView.value.leadFull,
    ...analysisView.value.summaryPoints,
    ...analysisSectionCards.value.flatMap((item) => item.items),
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index)
}

function findAnalysisSignalByPattern(pattern: RegExp, fallback: string, excludePattern?: RegExp) {
  return getAnalysisSignalPool().find((item) => pattern.test(item) && (!excludePattern || !excludePattern.test(item))) || fallback
}

function getAnalysisTendencyText() {
  return getSectionCardValue(analysisSectionCards.value, 'tendency', analysisView.value.headlineFull)
}

function normalizeComparisonLabel(label: string) {
  if (/主/.test(label)) {
    return '主方向'
  }
  if (/客/.test(label)) {
    return '客方向'
  }
  if (/平/.test(label)) {
    return '平局方向'
  }
  return label.trim() || '方向'
}

function extractComparisonSides(text: string) {
  const labeledMatches = [...text.matchAll(/(主胜概率|主队概率|主胜|主队|客胜概率|客队概率|客胜|客队|平局概率|平局)\s*[：:]?\s*(\d+(?:\.\d+)?)%/g)]
  if (labeledMatches.length >= 2) {
    return labeledMatches.slice(0, 2).map((match) => ({
      label: normalizeComparisonLabel(match[1] || ''),
      value: `${match[2]}%`,
    }))
  }

  const plainPercentages = [...text.matchAll(/(\d+(?:\.\d+)?)%/g)]
  if (plainPercentages.length >= 2) {
    return [
      { label: '方向A', value: `${plainPercentages[0]?.[1] || '-'}%` },
      { label: '方向B', value: `${plainPercentages[1]?.[1] || '-'}%` },
    ]
  }

  return null
}

function getAnalysisComparisonCardData() {
  const comparisonText = getAnalysisComparisonText()
  const comparisonSides = extractComparisonSides(comparisonText)
  if (!comparisonSides || comparisonSides.length < 2) {
    return {
      summary: cutDisplayText(comparisonText, 36),
      fullValue: comparisonText,
      leftLabel: '当前方向',
      leftValue: analysisView.value.directionTag,
      rightLabel: '核心对比',
      rightValue: cutDisplayText(comparisonText, 18),
    }
  }

  const [leftSide, rightSide] = comparisonSides
  const summary = `${leftSide.label} vs ${rightSide.label}`

  return {
    summary,
    fullValue: `${summary}。\n${comparisonText}`,
    leftLabel: leftSide.label,
    leftValue: leftSide.value,
    rightLabel: rightSide.label,
    rightValue: rightSide.value,
  }
}

function getAnalysisComparisonText() {
  return findAnalysisSignalByPattern(
    /(\d+(?:\.\d+)?%|概率|胜率|对比|vs|VS|高于|低于|领先|占优|更高|更低|优势)/,
    getSectionCardValue(analysisSectionCards.value, 'basis', analysisView.value.leadFull || analysisView.value.headlineFull),
    /(风险|建议|策略|操作|警惕|注意)/,
  )
}

function getAnalysisRiskText() {
  return findAnalysisSignalByPattern(
    /(风险|警惕|防范|注意|不确定|隐患|波动|诱盘|反转|保守|谨慎)/,
    getSectionCardValue(analysisSectionCards.value, 'risk', analysisView.value.leadFull || analysisView.value.headlineFull),
  )
}

function getAnalysisRiskLevel() {
  const riskText = `${getAnalysisRiskText()}\n${getAnalysisAdviceText()}`
  if (/(回避|不宜|高风险|风险高|风险较高|谨慎参与|不建议|诱盘|反转|波动大|观望为主|先别下手)/.test(riskText)) {
    return '高风险'
  }
  if (/(谨慎|注意|警惕|防范|保守|控制仓位|中等风险|有分歧|需防|留意)/.test(riskText)) {
    return '中风险'
  }
  if (/(低风险|可跟进|相对稳|较稳|可执行|明确支持)/.test(riskText)) {
    return '低风险'
  }
  return '中风险'
}

function getAnalysisAdviceText() {
  return findAnalysisSignalByPattern(
    /(建议|策略|操作|可考虑|推荐|方案|执行|观望|等待|不宜|优先|跟进)/,
    getSectionCardValue(analysisSectionCards.value, 'advice', analysisView.value.leadFull || analysisView.value.headlineFull),
  )
}

function getAnalysisAdviceCardData() {
  const adviceText = getAnalysisAdviceText().replace(/^(操作建议|建议|推荐|策略)[：:\s]*/, '').trim()
  const riskLevel = getAnalysisRiskLevel()
  return {
    action: cutDisplayText(adviceText || '继续观察临场变化', 28),
    riskLevel,
    fullValue: `${adviceText || '继续观察临场变化'}\n风险等级：${riskLevel}\n\n${getAnalysisRiskText()}`,
  }
}

function cutDisplayText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
}

function getStageStatusText(result?: StageAnalysisResult | null, draftText = '') {
  if (draftText.trim()) {
    return result?.success === false ? '已编辑，待重跑' : result?.success ? '已执行，可编辑' : '已编辑'
  }
  if (!result) return '未执行'
  return result.success ? '成功' : '失败'
}

function getStageStatusTone(result?: StageAnalysisResult | null, draftText = ''): 'success' | 'warning' | 'error' | 'info' {
  if (draftText.trim()) {
    return result?.success === false ? 'warning' : 'success'
  }
  if (!result) return 'info'
  return result.success ? 'success' : 'error'
}

function getWorkflowButtonClass(stepKey: WorkflowStepItem['key']) {
  const analysisStageKeys: WorkflowStepItem['key'][] = ['european', 'asian_base', 'final']
  return {
    'step-current-button': currentWorkflowStepKey.value === stepKey || (stepKey === 'analysis' && analysisStageKeys.includes(currentWorkflowStepKey.value)),
  }
}

function applyServerCookies(result: SavedFetchSettingsResponse, forceReplace = false) {
  savedFetchSettings.value = result
  if ((forceReplace || !fetchCookie.value.trim()) && result.cookies.length) {
    fetchCookie.value = result.cookies.join('\n')
    saveDraft()
  }
}

function applyServerAISettings(result: SavedAISettingsResponse, forceReplace = false) {
  savedAISettings.value = result
  if (forceReplace || !modelName.value.trim()) {
    if (result.provider === 'deepseek' || result.provider === 'openai' || result.provider === 'doubao') {
      aiProvider.value = result.provider
    }
    apiEndpoint.value = result.api_endpoint || apiEndpoint.value
    apiKey.value = result.api_key || ''
    modelName.value = result.model_name || modelName.value
    temperature.value = result.temperature === null || result.temperature === undefined ? temperature.value : String(result.temperature)
    maxTokens.value = result.max_tokens === null || result.max_tokens === undefined ? maxTokens.value : String(result.max_tokens)
    topP.value = result.top_p === null || result.top_p === undefined ? topP.value : String(result.top_p)
    presencePenalty.value = result.presence_penalty === null || result.presence_penalty === undefined ? presencePenalty.value : String(result.presence_penalty)
    frequencyPenalty.value = result.frequency_penalty === null || result.frequency_penalty === undefined ? frequencyPenalty.value : String(result.frequency_penalty)
    timeoutSeconds.value = result.timeout_seconds === null || result.timeout_seconds === undefined ? timeoutSeconds.value : String(result.timeout_seconds)
    saveDraft()
  }
}

function applyServerAnalysisSettings(result: SavedAnalysisSettingsResponse, forceReplace = false) {
  savedAnalysisSettings.value = result
  const shouldApply = forceReplace || (!europeanCompanies.value.trim() && !asianCompanies.value.trim() && !europeanPromptText.value.trim() && !asianBasePromptText.value.trim() && !finalPromptText.value.trim())
  if (!shouldApply) {
    return
  }
  if (result.bookmaker_selection?.european?.length) {
    europeanCompanies.value = result.bookmaker_selection.european.join(',')
  }
  if (result.bookmaker_selection?.asian?.length) {
    asianCompanies.value = result.bookmaker_selection.asian.join(',')
  }
  europeanPromptName.value = result.prompt_set?.european?.prompt_name || europeanPromptName.value
  europeanPromptText.value = result.prompt_set?.european?.prompt_text || ''
  asianBasePromptName.value = result.prompt_set?.asian_base?.prompt_name || asianBasePromptName.value
  asianBasePromptText.value = result.prompt_set?.asian_base?.prompt_text || ''
  finalPromptName.value = result.prompt_set?.final?.prompt_name || finalPromptName.value
  finalPromptText.value = result.prompt_set?.final?.prompt_text || ''
  saveDraft()
}

function toggleCoreInputCard() {
  coreInputExpanded.value = !coreInputExpanded.value
}

function updateLocalSavedAt(kind: 'fetch' | 'model' | 'analysis' | 'institution', value = new Date().toISOString()) {
  if (kind === 'fetch') {
    fetchSettingsSavedAt.value = value
  }
  if (kind === 'model') {
    modelSettingsSavedAt.value = value
  }
  if (kind === 'analysis') {
    analysisSettingsSavedAt.value = value
  }
  if (kind === 'institution') {
    institutionSettingsSavedAt.value = value
  }
}

function toggleSettingsCard(kind: 'fetch' | 'model' | 'analysis') {
  if (kind === 'fetch') {
    fetchSettingsExpanded.value = !fetchSettingsExpanded.value
    return
  }
  if (kind === 'model') {
    modelSettingsExpanded.value = !modelSettingsExpanded.value
    return
  }
  analysisSettingsExpanded.value = !analysisSettingsExpanded.value
}

function saveDraft() {
  writeFormDraft(formDraftStorageKey, {
    site: site.value,
    matchUrl: matchUrl.value,
    anchorStartTime: anchorStartTime.value,
    anchorEndTime: anchorEndTime.value,
    aiProvider: aiProvider.value,
    apiEndpoint: apiEndpoint.value,
    apiKey: apiKey.value,
    modelName: modelName.value,
    fetchCookie: fetchCookie.value,
    temperature: temperature.value,
    maxTokens: maxTokens.value,
    topP: topP.value,
    presencePenalty: presencePenalty.value,
    frequencyPenalty: frequencyPenalty.value,
    timeoutSeconds: timeoutSeconds.value,
    europeanPromptName: europeanPromptName.value,
    europeanPromptText: europeanPromptText.value,
    asianBasePromptName: asianBasePromptName.value,
    asianBasePromptText: asianBasePromptText.value,
    finalPromptName: finalPromptName.value,
    finalPromptText: finalPromptText.value,
    europeanCompanies: europeanCompanies.value,
    asianCompanies: asianCompanies.value,
    europeanStageText: europeanStageDraftText.value,
    asianBaseStageText: asianBaseStageDraftText.value,
    finalStageText: finalStageDraftText.value,
    activeResultTab: activeResultTab.value,
    modelSettingsSavedAt: modelSettingsSavedAt.value,
    analysisSettingsSavedAt: analysisSettingsSavedAt.value,
    institutionSettingsSavedAt: institutionSettingsSavedAt.value,
    fetchSettingsSavedAt: fetchSettingsSavedAt.value,
  })
}

function setError(message: string) { errorMessage.value = message; successMessage.value = '' }
function setSuccess(message: string) { successMessage.value = message; errorMessage.value = '' }
function getErrorMessage(error: unknown) { return error instanceof Error ? error.message : '请求失败，请稍后重试。' }
function fillSuggestedStartTime() { anchorStartTime.value = toDatetimeLocalValue(new Date()); setSuccess('已把起始时间设置为当前时间。') }
async function copyText(text: string, successText: string) { try { await navigator.clipboard.writeText(text); setSuccess(successText) } catch { setError('复制失败，请手动复制。') } }

function hasMatchExecutionState() {
  return Boolean(
    cookieTestResult.value
    || structuredResult.value
    || previewResult.value
    || analysisResult.value
    || europeanStageDraftText.value.trim()
    || asianBaseStageDraftText.value.trim()
    || finalStageDraftText.value.trim(),
  )
}

function resetMatchExecutionState() {
  cookieTestResult.value = null
  structuredResult.value = null
  previewResult.value = null
  analysisResult.value = null
  europeanStageDraftText.value = ''
  asianBaseStageDraftText.value = ''
  finalStageDraftText.value = ''
}

function getUpstreamStageTexts(stage?: StageKey) {
  return {
    european: stage === 'european' ? null : europeanStageDraftText.value,
    asian_base: stage === 'final' ? asianBaseStageDraftText.value : null,
  }
}

function applyStageRunResult(result: StageRunResult) {
  const current = analysisResult.value || {}
  analysisResult.value = {
    ...current,
    request_preview: result.request_preview ?? current.request_preview,
    european_result: result.stage === 'european' ? result.stage_result : current.european_result,
    asian_base_result: result.stage === 'asian_base' ? result.stage_result : current.asian_base_result,
    final_result: result.stage === 'final' ? result.stage_result : current.final_result,
    raw_response: result.stage === 'final' ? result.stage_result.raw_response ?? null : current.raw_response,
    success: result.stage === 'final' ? Boolean(result.stage_result.success) : current.success,
    error_message: result.error_message ?? null,
  }
  if (result.stage === 'european') {
    europeanStageDraftText.value = result.stage_result.raw_response || ''
    asianBaseStageDraftText.value = ''
    finalStageDraftText.value = ''
    analysisResult.value.asian_base_result = undefined
    analysisResult.value.final_result = undefined
  }
  if (result.stage === 'asian_base') {
    asianBaseStageDraftText.value = result.stage_result.raw_response || ''
    finalStageDraftText.value = ''
    analysisResult.value.final_result = undefined
  }
  if (result.stage === 'final') {
    finalStageDraftText.value = result.stage_result.raw_response || ''
  }
  previewResult.value = result.request_preview ?? previewResult.value
  activeResultTab.value = 'analysis'
  saveDraft()
}

function updateStageDraft(stage: StageKey, value: string) {
  if (stage === 'european') {
    europeanStageDraftText.value = value
    asianBaseStageDraftText.value = ''
    finalStageDraftText.value = ''
    if (analysisResult.value) {
      analysisResult.value.asian_base_result = undefined
      analysisResult.value.final_result = undefined
    }
  }
  if (stage === 'asian_base') {
    asianBaseStageDraftText.value = value
    finalStageDraftText.value = ''
    if (analysisResult.value) {
      analysisResult.value.final_result = undefined
    }
  }
  if (stage === 'final') {
    finalStageDraftText.value = value
  }
  saveDraft()
}

async function runStage(stage: StageKey) {
  if (!canSubmit.value) return setError('请先填写比赛链接和起始时间。')
  if (!structuredResult.value) return setError('请先完成结构化解析，再执行分步分析。')
  loadingStageKey.value = stage
  try {
    const result = await runWorkbenchStage(stage, {
      ...buildPayload(),
      upstreamStageTexts: getUpstreamStageTexts(stage),
    })
    applyStageRunResult(result)
    result.stage_result?.success
      ? setSuccess(`${result.stage === 'european' ? '欧赔分析' : result.stage === 'asian_base' ? '亚盘基础分析' : '最终综合分析'}已完成。`)
      : setError(result.error_message || result.stage_result?.error_message || '当前阶段执行失败。')
  } catch (e) {
    setError(getErrorMessage(e))
  } finally {
    loadingStageKey.value = null
  }
}

async function loadSavedFetchSettingsFromServer() {
  loadingFetchSettings.value = true
  try {
    const result = await loadServerFetchSettings()
    applyServerCookies(result)
  } catch {
  } finally {
    loadingFetchSettings.value = false
  }
}
async function loadSavedAISettingsFromServer() {
  loadingAISettings.value = true
  try {
    const result = await loadServerAISettings()
    applyServerAISettings(result)
  } catch {
  } finally {
    loadingAISettings.value = false
  }
}
async function loadSavedAnalysisSettingsFromServer() {
  loadingAnalysisSettings.value = true
  try {
    const result = await loadServerAnalysisSettings()
    applyServerAnalysisSettings(result)
  } catch {
  } finally {
    loadingAnalysisSettings.value = false
  }
}
async function refillFetchSettingsFromServer() {
  loadingFetchSettings.value = true
  try {
    const result = await loadServerFetchSettings()
    applyServerCookies(result, true)
    setSuccess(result.cookies.length ? `已用后端保存的 ${result.cookies.length} 条 Cookie 覆盖当前输入框。` : '后端当前没有可回填的 Cookie。')
  } catch (e) {
    setError(getErrorMessage(e))
  } finally {
    loadingFetchSettings.value = false
  }
}
async function saveFetchSettings() {
  updateLocalSavedAt('fetch')
  saveDraft()
  loadingFetchSettings.value = true
  try {
    const result = await saveServerFetchSettings(fetchCookie.value)
    savedFetchSettings.value = result
    if (result.updated_at) {
      updateLocalSavedAt('fetch', result.updated_at)
      saveDraft()
    }
    setSuccess(result.cookies.length ? '抓取设置已保存到浏览器本地和后端本地。后续请求即使前端不再手动传入，后端也可以复用。' : '已清空后端已保存的 Cookie 设置。')
  } catch (e) {
    setError(getErrorMessage(e))
  } finally {
    loadingFetchSettings.value = false
  }
}
async function saveAISettings() {
  updateLocalSavedAt('model')
  saveDraft()
  loadingAISettings.value = true
  try {
    const result = await saveServerAISettings({
      aiProvider: aiProvider.value,
      apiEndpoint: apiEndpoint.value,
      apiKey: apiKey.value,
      modelName: modelName.value,
      temperature: temperature.value,
      maxTokens: maxTokens.value,
      topP: topP.value,
      presencePenalty: presencePenalty.value,
      frequencyPenalty: frequencyPenalty.value,
      timeoutSeconds: timeoutSeconds.value,
    })
    savedAISettings.value = result
    if (result.updated_at) {
      updateLocalSavedAt('model', result.updated_at)
      saveDraft()
    }
    setSuccess('模型设置已保存到浏览器本地和后端本地。')
  } catch (e) {
    setError(getErrorMessage(e))
  } finally {
    loadingAISettings.value = false
  }
}
async function saveAnalysisSettings() {
  updateLocalSavedAt('analysis')
  saveDraft()
  loadingAnalysisSettings.value = true
  try {
    const result = await saveServerAnalysisSettings({
      europeanCompanies: europeanCompanies.value,
      asianCompanies: asianCompanies.value,
      europeanPromptName: europeanPromptName.value,
      europeanPromptText: europeanPromptText.value,
      asianBasePromptName: asianBasePromptName.value,
      asianBasePromptText: asianBasePromptText.value,
      finalPromptName: finalPromptName.value,
      finalPromptText: finalPromptText.value,
    })
    savedAnalysisSettings.value = result
    if (result.updated_at) {
      updateLocalSavedAt('analysis', result.updated_at)
      saveDraft()
    }
    setSuccess('分析口径已保存到浏览器本地和后端本地。')
  } catch (e) {
    setError(getErrorMessage(e))
  } finally {
    loadingAnalysisSettings.value = false
  }
}
async function saveInstitutionSettings() {
  updateLocalSavedAt('institution')
  saveDraft()
  loadingInstitutionSettings.value = true
  try {
    const result = await saveServerAnalysisSettings({
      europeanCompanies: europeanCompanies.value,
      asianCompanies: asianCompanies.value,
      europeanPromptName: europeanPromptName.value,
      europeanPromptText: europeanPromptText.value,
      asianBasePromptName: asianBasePromptName.value,
      asianBasePromptText: asianBasePromptText.value,
      finalPromptName: finalPromptName.value,
      finalPromptText: finalPromptText.value,
    })
    savedAnalysisSettings.value = result
    if (result.updated_at) {
      updateLocalSavedAt('institution', result.updated_at)
      saveDraft()
    }
    setSuccess(`机构范围已生效：欧赔 ${selectedEuropeanCompanyCount.value} 家，亚盘 ${selectedAsianCompanyCount.value} 家。后续二次清洗和正式分析都会按这组机构执行。`)
  } catch (e) {
    setError(getErrorMessage(e))
  } finally {
    loadingInstitutionSettings.value = false
  }
}
function buildPayload() {
  return {
    site: site.value,
    matchUrl: matchUrl.value,
    anchorStartTime: anchorStartTime.value,
    anchorEndTime: anchorEndTime.value,
    aiProvider: aiProvider.value,
    apiEndpoint: apiEndpoint.value,
    apiKey: apiKey.value,
    modelName: modelName.value,
    temperature: temperature.value,
    maxTokens: maxTokens.value,
    topP: topP.value,
    presencePenalty: presencePenalty.value,
    frequencyPenalty: frequencyPenalty.value,
    timeoutSeconds: timeoutSeconds.value,
    europeanPromptName: europeanPromptName.value,
    europeanPromptText: europeanPromptText.value,
    asianBasePromptName: asianBasePromptName.value,
    asianBasePromptText: asianBasePromptText.value,
    finalPromptName: finalPromptName.value,
    finalPromptText: finalPromptText.value,
    europeanCompanies: europeanCompanies.value,
    asianCompanies: asianCompanies.value,
    fetchCookie: fetchCookie.value,
    structuredMatch: structuredResult.value,
    upstreamStageTexts: getUpstreamStageTexts(),
  }
}
async function loadStructuredData() {
  if (!canSubmit.value) return setError('请先填写比赛链接和起始时间。')
  loadingStructured.value = true
  try {
    structuredResult.value = await callWorkbenchPost('/matches/structured', buildPayload())
    previewResult.value = null
    analysisResult.value = null
    europeanStageDraftText.value = ''
    asianBaseStageDraftText.value = ''
    finalStageDraftText.value = ''
    activeResultTab.value = 'structured'
    saveDraft()
    setSuccess('结构化解析已完成。')
  } catch (e) { setError(getErrorMessage(e)) } finally { loadingStructured.value = false }
}
async function previewAnalysis() {
  if (!canSubmit.value) return setError('请先填写比赛链接和起始时间。')
  loadingPreview.value = true
  try { previewResult.value = await callWorkbenchPost('/analysis/preview', buildPayload()); activeResultTab.value = 'preview'; setSuccess('模型输入预览已生成。') } catch (e) { setError(getErrorMessage(e)) } finally { loadingPreview.value = false }
}
async function runAnalysis() {
  if (!canSubmit.value) return setError('请先填写比赛链接和起始时间。')
  loadingAnalysis.value = true
  try { analysisResult.value = await callWorkbenchPost('/analysis/run', buildPayload()); activeResultTab.value = 'analysis'; analysisResult.value?.success ? setSuccess('正式分析已完成。') : setError(analysisResult.value?.error_message || '正式分析失败。') } catch (e) { setError(getErrorMessage(e)) } finally { loadingAnalysis.value = false }
}
async function testCookieConnection() {
  if (!canSubmit.value) return setError('请先填写比赛链接和起始时间。')
  loadingCookieTest.value = true
  try { cookieTestResult.value = await callWorkbenchPost('/matches/test-cookie', buildPayload()); setSuccess('抓取诊断已完成。') } catch (e) { setError(getErrorMessage(e)) } finally { loadingCookieTest.value = false }
}
async function testModelConnection() {
  if (!canSubmit.value) return setError('请先填写比赛链接和起始时间。')
  loadingModelConnection.value = true
  try {
    const result = await callWorkbenchPost('/analysis/test-connection', buildPayload())
    modelConnectionResult.value = result
    result.success ? setSuccess('模型连接正常。') : setError(result.message)
  } catch (e) { setError(getErrorMessage(e)) } finally { loadingModelConnection.value = false }
}
</script>

<template>
  <div class="page-shell">
    <header class="hero">
      <div class="hero-main">
        <div class="hero-copy">
          <span class="eyebrow">足球赔率分析工作台</span>
          <h1>当前输入比赛单场分析</h1>
          <p>这里只分析你当前输入的这场比赛页面链路，不混入其他比赛、全站数据或外部信息。左侧负责配置，右侧负责查看每一步执行结果。</p>
          <div class="hero-tag-row">
            <span class="hero-tag">站点 {{ siteLabel }}</span>
            <span class="hero-tag">Cookie {{ cookiePoolItems.length }} 个</span>
            <span class="hero-tag">模型 {{ modelName || '-' }}</span>
          </div>
        </div>
        <div class="hero-flow-panel">
          <div class="hero-flow-head">
            <strong>真实分析链路</strong>
            <span>正式分析会在右侧结果区依次拆解为欧赔分析、亚盘基础分析、最终综合分析。</span>
          </div>
          <div class="hero-flow-track">
            <div v-for="(step, index) in heroWorkflowSteps" :key="step.key" :class="['hero-flow-step', step.state]">
              <div class="hero-flow-dot">{{ index + 1 }}</div>
              <div class="hero-flow-content">
                <strong>{{ step.label }}</strong>
                <span>{{ step.statusLabel }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="dashboard-layout workbench-layout">
      <section class="panel control-panel workspace-panel">
        <div class="section-head"><div><h2>左侧设置区</h2><p>这里集中配置基础输入、抓取设置、模型设置和分析口径；顶部流程线会同步显示当前链路位置。</p></div></div>
        <div :class="['core-input-shell', { 'step-current-shell': currentWorkflowStepKey === 'input', expanded: coreInputExpanded }]">
          <button type="button" class="settings-card-head settings-card-toggle panel-card-toggle" @click="toggleCoreInputCard">
            <div>
              <h3>比赛链接与时间区间</h3>
              <p>这里是本场分析的基础输入。先填比赛链接和时间，再执行后面的诊断、结构化解析和正式分析。</p>
            </div>
            <span class="settings-card-toggle-text">{{ coreInputExpanded ? '收起' : '展开' }}</span>
          </button>
          <template v-if="coreInputExpanded">
            <div class="field-grid key-field-grid core-input-grid">
              <label class="full-span"><span>比赛链接</span><input v-model="matchUrl" type="url" :placeholder="sampleMatchUrl" /></label>
              <label><span>起始时间</span><input v-model="anchorStartTime" type="datetime-local" /></label>
              <label><span>结束时间</span><input v-model="anchorEndTime" type="datetime-local" /></label>
            </div>
            <div class="quick-helper-row">
              <button class="secondary helper-button" @click="fillSuggestedStartTime">起始时间填当前</button>
              <button class="secondary helper-button" @click="saveDraft(); setSuccess('当前设置已保存到浏览器本地。')">保存当前设置</button>
            </div>
            <div class="module-status-card info">
              <strong>第 4、5、6 步改为手动推进</strong>
              <span>现在需要你自己按顺序点击：欧赔分析 -> 亚盘基础分析 -> 最终综合分析。每一步执行后，都可以在右侧直接修改文本，再进入下一步。</span>
            </div>
            <div class="action-row primary-action-row vertical-action-row">
              <button :class="['secondary', getWorkflowButtonClass('diagnostic')]" :disabled="loadingCookieTest || !canSubmit" @click="testCookieConnection">{{ loadingCookieTest ? '第2步 测试中...' : '第2步 先做抓取诊断' }}</button>
              <button :class="['secondary', getWorkflowButtonClass('structured')]" :disabled="loadingStructured || !canSubmit || !diagnosticCompleted" @click="loadStructuredData">{{ loadingStructured ? '第3步 解析中...' : '第3步 结构化解析' }}</button>
              <button class="secondary" :disabled="loadingPreview || !canSubmit" @click="previewAnalysis">{{ loadingPreview ? '预览生成中...' : '可选：分析输入预览' }}</button>
              <button :class="['secondary', getWorkflowButtonClass('european')]" :disabled="loadingStageKey === 'european' || !canSubmit || !structuredResult" @click="runStage('european')">{{ loadingStageKey === 'european' ? '第4步 执行中...' : '第4步 欧赔分析' }}</button>
              <button :class="['secondary', getWorkflowButtonClass('asian_base')]" :disabled="loadingStageKey === 'asian_base' || !canSubmit || !structuredResult || !europeanStageDraftText.trim()" @click="runStage('asian_base')">{{ loadingStageKey === 'asian_base' ? '第5步 执行中...' : '第5步 亚盘基础分析' }}</button>
              <button :class="['secondary', getWorkflowButtonClass('final')]" :disabled="loadingStageKey === 'final' || !canSubmit || !structuredResult || !europeanStageDraftText.trim() || !asianBaseStageDraftText.trim()" @click="runStage('final')">{{ loadingStageKey === 'final' ? '第6步 执行中...' : '第6步 最终综合分析' }}</button>
            </div>
            <div class="empty-tip-card compact-tip-card"><div class="empty-tip-head"><strong>链接格式示例</strong><span>{{ sampleMatchUrl }}</span></div></div>
          </template>
        </div>

        <details class="advanced-panel" open>
          <summary>高级设置</summary>
          <div class="settings-shell advanced-grid">
            <div class="module-status-card info settings-storage-card"><strong>配置持久化</strong><span>现在抓取设置、模型设置、分析口径都支持明确保存。</span><small>每个模块都会显示“浏览器本地”和“后端本地”的保存时间，方便你确认到底有没有存进去。</small></div>
            <div class="settings-grid">
              <div :class="['subtle-card', 'setting-card', { expanded: fetchSettingsExpanded }]">
                <button type="button" class="settings-card-head settings-card-toggle" @click="toggleSettingsCard('fetch')"><div><h3>抓取设置</h3><p>支持一行一个 Cookie，便于做 Cookie 池轮询。</p></div><span class="settings-card-toggle-text">{{ fetchSettingsExpanded ? '收起' : '展开' }}</span></button>
                <template v-if="fetchSettingsExpanded">
                  <div class="field-grid settings-field-grid"><label class="full-span"><span>Cookie 池</span><textarea v-model="fetchCookie" rows="6"></textarea></label></div>
                  <div class="module-action-row"><button class="secondary small-button" :disabled="loadingFetchSettings" @click="saveFetchSettings">{{ loadingFetchSettings ? '保存中...' : '保存抓取设置' }}</button><button class="secondary small-button" :disabled="loadingFetchSettings" @click="refillFetchSettingsFromServer">{{ loadingFetchSettings ? '读取中...' : '从后端回填 Cookie' }}</button></div>
                  <div class="module-status-grid">
                    <div v-if="fetchSettingsSavedAt" class="module-status-card success"><strong>浏览器本地已保存</strong><span>最近更新时间：{{ formatDate(fetchSettingsSavedAt) }}</span></div>
                    <div v-if="savedFetchSettings?.updated_at" class="module-status-card info"><strong>后端本地已保存</strong><span>最近更新时间：{{ formatDate(savedFetchSettings.updated_at) }}</span></div>
                  </div>
                </template>
              </div>
              <div :class="['subtle-card', 'setting-card', { expanded: modelSettingsExpanded }]">
                <button type="button" class="settings-card-head settings-card-toggle" @click="toggleSettingsCard('model')"><div><h3>模型设置</h3><p>当前 API 地址、模型名和 Key 会自动复用。</p></div><span class="settings-card-toggle-text">{{ modelSettingsExpanded ? '收起' : '展开' }}</span></button>
                <template v-if="modelSettingsExpanded">
                  <div class="field-grid settings-field-grid">
                    <label><span>模型提供商</span><select v-model="aiProvider"><option value="deepseek">DeepSeek</option><option value="doubao">豆包官方 API</option><option value="openai">OpenAI Compatible</option></select></label>
                    <label><span>模型名称</span><input v-model="modelName" type="text" /></label>
                    <label><span>API 地址</span><input v-model="apiEndpoint" type="text" /></label>
                    <label><span>API Key</span><input v-model="apiKey" type="password" /></label>
                    <label><span>Temperature</span><input v-model="temperature" type="number" min="0" max="2" step="0.1" /></label>
                    <label><span>Max Tokens</span><input v-model="maxTokens" type="number" min="1" step="1" /></label>
                    <label><span>Top P</span><input v-model="topP" type="number" min="0" max="1" step="0.1" /></label>
                    <label><span>Presence Penalty</span><input v-model="presencePenalty" type="number" min="-2" max="2" step="0.1" /></label>
                    <label><span>Frequency Penalty</span><input v-model="frequencyPenalty" type="number" min="-2" max="2" step="0.1" /></label>
                    <label><span>Timeout Seconds</span><input v-model="timeoutSeconds" type="number" min="5" step="1" /></label>
                  </div>
                  <div class="module-status-card info">
                    <strong>{{ currentProviderPreset.label }}</strong>
                    <span>{{ currentProviderPreset.helperText }}</span>
                    <small>默认地址：{{ currentProviderPreset.apiEndpoint }} ｜ 默认模型：{{ currentProviderPreset.modelName }} ｜ 高级参数会一并保存到本地与后端。</small>
                  </div>
                  <div class="module-action-row"><button class="secondary small-button" :disabled="loadingAISettings" @click="saveAISettings">{{ loadingAISettings ? '保存中...' : '保存模型设置' }}</button><button class="secondary small-button" :disabled="loadingModelConnection || !canSubmit" @click="testModelConnection">{{ loadingModelConnection ? '测试中...' : '测试模型连接' }}</button></div>
                  <div class="module-status-grid">
                    <div v-if="modelSettingsSavedAt" class="module-status-card success"><strong>浏览器本地已保存</strong><span>最近更新时间：{{ formatDate(modelSettingsSavedAt) }}</span></div>
                    <div v-if="savedAISettings?.updated_at" class="module-status-card info"><strong>后端本地已保存</strong><span>最近更新时间：{{ formatDate(savedAISettings.updated_at) }}</span></div>
                    <div v-if="modelConnectionResult" :class="['module-status-card', modelConnectionResult.success ? 'success' : 'error']"><strong>{{ modelConnectionResult.success ? '模型连接正常' : '模型连接异常' }}</strong><span>{{ modelConnectionResult.message }}</span></div>
                  </div>
                </template>
              </div>
              <div :class="['subtle-card', 'setting-card', 'full-span-card', { expanded: analysisSettingsExpanded }]">
                <button type="button" class="settings-card-head settings-card-toggle" @click="toggleSettingsCard('analysis')"><div><h3>分析口径</h3><p>机构范围和提示词会直接影响结构化视角与模型输出。</p></div><span class="settings-card-toggle-text">{{ analysisSettingsExpanded ? '收起' : '展开' }}</span></button>
                <template v-if="analysisSettingsExpanded">
                  <div class="field-grid settings-field-grid">
                    <label class="full-span"><span>欧赔机构范围</span><textarea v-model="europeanCompanies" rows="3"></textarea></label>
                    <label class="full-span"><span>亚盘机构范围</span><textarea v-model="asianCompanies" rows="3"></textarea></label>
                    <div v-if="institutionSettingsSavedAt" class="module-status-card success full-span">
                      <strong>机构范围已生效</strong>
                      <span>欧赔 {{ selectedEuropeanCompanyCount }} 家，亚盘 {{ selectedAsianCompanyCount }} 家</span>
                      <small>最近保存时间：{{ formatDate(institutionSettingsSavedAt) }}</small>
                    </div>
                    <label class="full-span"><span>欧赔分析提示词名称</span><input v-model="europeanPromptName" type="text" /></label>
                    <label class="full-span"><span>欧赔分析提示词</span><textarea v-model="europeanPromptText" rows="4"></textarea></label>
                    <label class="full-span"><span>亚盘基础分析提示词名称</span><input v-model="asianBasePromptName" type="text" /></label>
                    <label class="full-span"><span>亚盘基础分析提示词</span><textarea v-model="asianBasePromptText" rows="4"></textarea></label>
                    <label class="full-span"><span>最终综合分析提示词名称</span><input v-model="finalPromptName" type="text" /></label>
                    <label class="full-span"><span>最终综合分析提示词</span><textarea v-model="finalPromptText" rows="6"></textarea></label>
                  </div>
                  <div class="module-action-row">
                    <button class="secondary small-button" :disabled="loadingInstitutionSettings" @click="saveInstitutionSettings">{{ loadingInstitutionSettings ? '保存中...' : '保存机构范围' }}</button>
                    <button class="secondary small-button" :disabled="loadingAnalysisSettings" @click="saveAnalysisSettings">{{ loadingAnalysisSettings ? '保存中...' : '保存分析口径' }}</button>
                  </div>
                  <div class="module-status-grid">
                    <div v-if="analysisSettingsSavedAt" class="module-status-card success"><strong>浏览器本地已保存</strong><span>最近更新时间：{{ formatDate(analysisSettingsSavedAt) }}</span></div>
                    <div v-if="savedAnalysisSettings?.updated_at" class="module-status-card info"><strong>后端本地已保存</strong><span>最近更新时间：{{ formatDate(savedAnalysisSettings.updated_at) }}</span></div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </details>
      </section>

      <section class="panel result-panel">
        <div class="section-head"><div><h2>右侧结果区</h2><p>这里按真实执行链路查看抓取诊断、结构化结果、预览以及正式分析三阶段结果。</p></div></div>
        <div class="summary-grid result-meta-grid">
          <div class="summary-card result-summary-card"><span>当前页签</span><strong>{{ resultTabLabels[activeResultTab] }}</strong></div>
          <div class="summary-card result-summary-card"><span>比赛标题</span><strong>{{ currentMatchTitle }}</strong></div>
          <div class="summary-card result-summary-card"><span>正式分析</span><strong>{{ analysisSucceeded ? '成功' : analysisResult ? '未成功' : '未执行' }}</strong></div>
          <div class="summary-card result-summary-card"><span>分析链路</span><strong>结构化 + 三阶段分析</strong></div>
        </div>
        <p v-if="isBusy" class="busy-banner">当前正在处理，请稍候。</p>
        <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>
        <p v-if="successMessage" class="success-banner">{{ successMessage }}</p>

        <div v-if="cookieTestResult" class="subtle-card diagnosis-shell">
          <div class="status-grid">
            <div class="status-card"><span>诊断结论</span><strong>{{ cookieTestResult.valid ? '可以继续分析' : '需要先处理抓取问题' }}</strong></div>
            <div class="status-card"><span>Cookie 池</span><strong>{{ cookieTestResult.healthy_cookie_count ?? 0 }} / {{ cookieTestResult.cookie_count ?? 0 }}</strong></div>
            <div class="status-card"><span>欧赔识别</span><strong>{{ cookieTestResult.parse_summary?.european_count ?? 0 }}</strong></div>
            <div class="status-card"><span>亚盘识别</span><strong>{{ cookieTestResult.parse_summary?.asian_count ?? 0 }}</strong></div>
          </div>
          <ul v-if="cookieTestResult.suggestions?.length" class="guide-list compact-list"><li v-for="item in cookieTestResult.suggestions" :key="item">{{ item }}</li></ul>
        </div>

        <div class="tab-row">
          <button :class="['tab-button', { active: activeResultTab === 'structured' }]" @click="activeResultTab = 'structured'">结构化结果</button>
          <button :class="['tab-button', { active: activeResultTab === 'preview' }]" @click="activeResultTab = 'preview'">分析预览</button>
          <button :class="['tab-button', { active: activeResultTab === 'analysis' }]" @click="activeResultTab = 'analysis'">正式分析</button>
        </div>

        <StructuredResultTab v-if="activeResultTab === 'structured'" :structured-result="structuredResult" :display-text="structuredDisplayText" :overview-cards="[{ label: '比赛键值', value: String(structuredResult?.match_key || '-') }, { label: '比赛对阵', value: structuredMatchupText }, { label: '页面数', value: String(structuredResult?.pages ? Object.keys(structuredResult.pages).length : 0) }, { label: '欧赔条数', value: String(structuredResult?.european_odds?.length ?? 0) }, { label: '亚盘条数', value: String(structuredResult?.asian_handicap?.length ?? 0) }]" :on-copy="() => copyText(structuredDisplayText, '结构化结果已复制。')" />
        <ResultTextTab v-else-if="activeResultTab === 'preview'" title="分阶段送模预览" copy-label="复制预览" card-title="最终送模数据预览" card-description="用于确认欧赔分析、亚盘基础分析和最终综合分析三阶段的 prompt 与结构化入参。" :display-text="previewDisplayText" :overview-cards="[{ label: '阶段数量', value: `${stagePreviewCount}` }, { label: '最终提示词', value: finalPromptName || defaultPromptName }, { label: '当前模型', value: modelName || '-' }, { label: 'Cookie 数量', value: `${cookiePoolItems.length}` }]" :on-copy="() => copyText(previewDisplayText, '分阶段送模预览已复制。')" />
        <AnalysisResultTab v-else-if="activeResultTab === 'analysis'" :overview-cards="[{ label: '模型', value: modelName || '-' }, { label: '执行状态', value: analysisSucceeded ? '最终综合分析已完成' : analysisResult || europeanStageDraftText || asianBaseStageDraftText || finalStageDraftText ? '分步执行中' : '未执行' }, { label: '欧赔阶段', value: europeanStageDraftText.trim() ? '已就绪' : '未执行' }, { label: '亚盘基础阶段', value: asianBaseStageDraftText.trim() ? '已就绪' : '未执行' }, { label: '最终综合阶段', value: finalStageDraftText.trim() ? '已就绪' : '未执行' }]" :conclusion-cards="analysisConclusionCards" :analysis-view="analysisView" :stage-cards="analysisStageCards" :on-copy="() => copyText(finalStageText, '最终综合分析结论已复制。')" :on-run-stage="runStage" :on-update-stage-draft="updateStageDraft" />
      </section>
    </main>
  </div>
</template>
