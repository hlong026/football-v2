<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AnalysisResultTab from './features/workbench/components/AnalysisResultTab.vue'
import ResultTextTab from './features/workbench/components/ResultTextTab.vue'
import StructuredResultTab from './features/workbench/components/StructuredResultTab.vue'
import {
  defaultApiEndpoint,
  defaultAsianCompanies,
  defaultEuropeanCompanies,
  defaultMaxTokens,
  defaultModelName,
  defaultPromptName,
  defaultSite,
  defaultTemperature,
  formDraftStorageKey,
  recordCustomStorageKey,
  recordMarksStorageKey,
  resultTabLabels,
  sampleMatchUrl,
} from './features/workbench/constants'
import { callWorkbenchGet, callWorkbenchPost, loadServerAISettings, loadServerAnalysisSettings, loadServerFetchSettings, saveServerAISettings, saveServerAnalysisSettings, saveServerFetchSettings } from './features/workbench/api'
import {
  defaultRecordCustomization,
  loadStoredFormDraft as readStoredFormDraft,
  loadStoredRecordCustomizations as readStoredRecordCustomizations,
  loadStoredRecordMarks as readStoredRecordMarks,
  persistFormDraft as writeFormDraft,
  persistRecordCustomizations as writeRecordCustomizations,
  persistRecordMarks as writeRecordMarks,
} from './features/workbench/storage'
import {
  buildAnalysisSectionCards,
  buildAnalysisView,
  formatAnalysisText,
  formatDate,
  getPageLabel,
  pretty,
  prettyDisplayPreferred,
  splitCompanies,
  splitCookies,
  toDatetimeLocalValue,
} from './features/workbench/utils'
import type { AIConnectionTestResult, AnalysisConclusionCard, AnalysisRunResult, CookieTestResult, RecordDetail, RecordListItem, ResultTab, SavedAISettingsResponse, SavedAnalysisSettingsResponse, SavedFetchSettingsResponse, StructuredMatchLite, WorkflowStepItem } from './features/workbench/types'

const stored = readStoredFormDraft(formDraftStorageKey, resultTabLabels)
const site = ref(stored.site ?? defaultSite)
const matchUrl = ref(stored.matchUrl ?? '')
const anchorStartTime = ref(stored.anchorStartTime ?? '')
const anchorEndTime = ref(stored.anchorEndTime ?? '')
const aiProvider = ref<'deepseek' | 'openai'>(stored.aiProvider ?? 'deepseek')
const apiEndpoint = ref(stored.apiEndpoint ?? defaultApiEndpoint)
const apiKey = ref(stored.apiKey ?? '')
const modelName = ref(stored.modelName ?? defaultModelName)
const fetchCookie = ref(stored.fetchCookie ?? '')
const temperature = ref(stored.temperature ?? defaultTemperature)
const maxTokens = ref(stored.maxTokens ?? defaultMaxTokens)
const promptName = ref(stored.promptName ?? defaultPromptName)
const promptText = ref(stored.promptText ?? '')
const europeanCompanies = ref(stored.europeanCompanies ?? defaultEuropeanCompanies)
const asianCompanies = ref(stored.asianCompanies ?? defaultAsianCompanies)
const activeResultTab = ref<ResultTab>(stored.activeResultTab ?? 'analysis')

const loadingStructured = ref(false)
const loadingPreview = ref(false)
const loadingAnalysis = ref(false)
const loadingRecords = ref(false)
const loadingRecordDetail = ref(false)
const loadingCookieTest = ref(false)
const loadingFetchSettings = ref(false)
const loadingAISettings = ref(false)
const loadingAnalysisSettings = ref(false)
const loadingModelConnection = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const structuredResult = ref<StructuredMatchLite | null>(null)
const previewResult = ref<any>(null)
const analysisResult = ref<AnalysisRunResult | null>(null)
const cookieTestResult = ref<CookieTestResult | null>(null)
const historyRecords = ref<RecordListItem[]>([])
const selectedRecordDetail = ref<RecordDetail | null>(null)
const selectedRecordPath = ref('')
const modelConnectionResult = ref<AIConnectionTestResult | null>(null)
const savedFetchSettings = ref<SavedFetchSettingsResponse | null>(null)
const savedAISettings = ref<SavedAISettingsResponse | null>(null)
const savedAnalysisSettings = ref<SavedAnalysisSettingsResponse | null>(null)
const recordMarks = ref(readStoredRecordMarks(recordMarksStorageKey))
const recordCustomizations = ref(readStoredRecordCustomizations(recordCustomStorageKey))
const recordCustomizationDraft = ref(defaultRecordCustomization())
const modelSettingsSavedAt = ref(stored.modelSettingsSavedAt ?? '')
const analysisSettingsSavedAt = ref(stored.analysisSettingsSavedAt ?? '')
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

watch([site, matchUrl, anchorStartTime, anchorEndTime, aiProvider, apiEndpoint, apiKey, modelName, fetchCookie, temperature, maxTokens, promptName, promptText, europeanCompanies, asianCompanies, activeResultTab], saveDraft)
watch(recordMarks, () => writeRecordMarks(recordMarksStorageKey, recordMarks.value), { deep: true })
watch(recordCustomizations, () => writeRecordCustomizations(recordCustomStorageKey, recordCustomizations.value), { deep: true })
watch(selectedRecordPath, (value) => {
  recordCustomizationDraft.value = value
    ? { ...getRecordCustomization(value) }
    : defaultRecordCustomization()
}, { immediate: true })

const canSubmit = computed(() => Boolean(matchUrl.value.trim() && anchorStartTime.value))
const isBusy = computed(() => loadingStructured.value || loadingPreview.value || loadingAnalysis.value || loadingRecords.value || loadingRecordDetail.value || loadingCookieTest.value || loadingModelConnection.value)
const cookiePoolItems = computed(() => splitCookies(fetchCookie.value))
const siteLabel = computed(() => (site.value === 'okooo' ? '澳客网' : site.value))
const analysisSucceeded = computed(() => Boolean(analysisResult.value?.success && analysisResult.value?.raw_response?.trim()))
const analysisDisplayText = computed(() => {
  if (!analysisResult.value) return '还没有正式分析结果，点击“正式执行分析”后这里会显示本场比赛的模型结论。'
  if (analysisSucceeded.value) return formatAnalysisText(analysisResult.value?.raw_response || '')
  return formatAnalysisText(analysisResult.value?.error_message || prettyDisplayPreferred(analysisResult.value))
})
const selectedRecordAnalysisText = computed(() => formatAnalysisText(selectedRecordDetail.value?.analysis_payload?.raw_response || selectedRecordDetail.value?.analysis_payload?.error_message || '暂无模型结论'))
const analysisView = computed(() => analysisSucceeded.value
  ? buildAnalysisView(analysisDisplayText.value, '等待正式分析', '正式执行分析后，这里会提炼本场结论。')
  : buildAnalysisView('还没有正式分析结果', '等待正式分析', '正式执行分析后，这里会提炼本场结论。'))
const recordAnalysisView = computed(() => buildAnalysisView(selectedRecordAnalysisText.value, '等待历史结论', '载入历史记录后，这里会自动抽出重点。'))
const analysisSectionCards = computed(() => analysisSucceeded.value ? buildAnalysisSectionCards(analysisView.value) : [])
const recordAnalysisSectionCards = computed(() => selectedRecordDetail.value?.analysis_payload?.success ? buildAnalysisSectionCards(recordAnalysisView.value) : [])
const workflowSteps = computed<WorkflowStepItem[]>(() => {
  const inputDone = canSubmit.value
  const diagnosticDone = Boolean(cookieTestResult.value?.valid)
  const structuredDone = Boolean(structuredResult.value)
  const analysisDone = analysisSucceeded.value

  const currentKey: WorkflowStepItem['key'] = !inputDone
    ? 'input'
    : !diagnosticDone
      ? 'diagnostic'
      : !structuredDone
        ? 'structured'
        : !analysisDone
          ? 'analysis'
          : 'history'

  return [
    {
      key: 'input',
      label: '先填比赛链接和起始时间',
      statusLabel: inputDone ? '已完成' : '当前步骤',
      description: '这是后端抓取和分析的基础参数，不填就不能继续。',
      state: !inputDone ? 'current' : 'done',
    },
    {
      key: 'diagnostic',
      label: '先做抓取诊断',
      statusLabel: diagnosticDone ? '已完成' : currentKey === 'diagnostic' ? '当前步骤' : '待执行',
      description: '先确认 Cookie、欧赔页、亚盘页是否抓取成功，再继续下一步。',
      state: diagnosticDone ? 'done' : currentKey === 'diagnostic' ? 'current' : 'idle',
    },
    {
      key: 'structured',
      label: '先做结构化解析',
      statusLabel: structuredDone ? '已完成' : currentKey === 'structured' ? '当前步骤' : '待执行',
      description: '把欧赔、亚盘和详情记录整理成可读数据，先确认抓到了多少家机构。',
      state: structuredDone ? 'done' : currentKey === 'structured' ? 'current' : 'idle',
    },
    {
      key: 'analysis',
      label: '最后执行正式分析',
      statusLabel: analysisDone ? '已完成' : currentKey === 'analysis' ? '当前步骤' : '待执行',
      description: '模型会直接给出一个最终判断，顶部会优先展示最核心结论。',
      state: analysisDone ? 'done' : currentKey === 'analysis' ? 'current' : 'idle',
    },
  ]
})
const currentWorkflowStepKey = computed(() => workflowSteps.value.find((item) => item.state === 'current')?.key ?? 'input')
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
const selectedRecordTags = computed(() => splitCompanies(recordCustomizationDraft.value.tags))

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
const selectedRecordMatchupText = computed(() => getMatchupText(selectedRecordDetail.value?.scraped_payload || selectedRecordDetail.value))
const currentMatchTitle = computed(() => {
  if (structuredMatchupText.value !== '-') {
    return structuredMatchupText.value
  }
  if (selectedRecordMatchupText.value !== '-') {
    return selectedRecordMatchupText.value
  }
  return structuredResult.value?.match_key || selectedRecordDetail.value?.match_key || '-'
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

function getRecordCustomization(relativePath: string) {
  return recordCustomizations.value[relativePath] ?? defaultRecordCustomization()
}

function getDisplayRecordTitle(item: RecordListItem) {
  const customTitle = getRecordCustomization(item.relative_path).title.trim()
  if (customTitle) {
    return customTitle
  }
  if (item.display_title) {
    return item.display_title
  }
  const matchup = getMatchupText(item)
  return matchup !== '-' ? matchup : item.match_key
}

function getRecordTags(relativePath: string) {
  return splitCompanies(getRecordCustomization(relativePath).tags)
}

function getWorkflowButtonClass(stepKey: WorkflowStepItem['key']) {
  return {
    'step-current-button': currentWorkflowStepKey.value === stepKey,
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
    if (result.provider === 'deepseek' || result.provider === 'openai') {
      aiProvider.value = result.provider
    }
    apiEndpoint.value = result.api_endpoint || apiEndpoint.value
    apiKey.value = result.api_key || ''
    modelName.value = result.model_name || modelName.value
    temperature.value = result.temperature === null || result.temperature === undefined ? temperature.value : String(result.temperature)
    maxTokens.value = result.max_tokens === null || result.max_tokens === undefined ? maxTokens.value : String(result.max_tokens)
    saveDraft()
  }
}

function applyServerAnalysisSettings(result: SavedAnalysisSettingsResponse, forceReplace = false) {
  savedAnalysisSettings.value = result
  const shouldApply = forceReplace || (!europeanCompanies.value.trim() && !asianCompanies.value.trim() && !promptText.value.trim())
  if (!shouldApply) {
    return
  }
  if (result.bookmaker_selection?.european?.length) {
    europeanCompanies.value = result.bookmaker_selection.european.join(',')
  }
  if (result.bookmaker_selection?.asian?.length) {
    asianCompanies.value = result.bookmaker_selection.asian.join(',')
  }
  promptName.value = result.prompt_config?.prompt_name || promptName.value
  promptText.value = result.prompt_config?.prompt_text || ''
  saveDraft()
}

function toggleCoreInputCard() {
  coreInputExpanded.value = !coreInputExpanded.value
}

function updateLocalSavedAt(kind: 'fetch' | 'model' | 'analysis', value = new Date().toISOString()) {
  if (kind === 'fetch') {
    fetchSettingsSavedAt.value = value
  }
  if (kind === 'model') {
    modelSettingsSavedAt.value = value
  }
  if (kind === 'analysis') {
    analysisSettingsSavedAt.value = value
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
    promptName: promptName.value,
    promptText: promptText.value,
    europeanCompanies: europeanCompanies.value,
    asianCompanies: asianCompanies.value,
    activeResultTab: activeResultTab.value,
    modelSettingsSavedAt: modelSettingsSavedAt.value,
    analysisSettingsSavedAt: analysisSettingsSavedAt.value,
    fetchSettingsSavedAt: fetchSettingsSavedAt.value,
  })
}

function setError(message: string) { errorMessage.value = message; successMessage.value = '' }
function setSuccess(message: string) { successMessage.value = message; errorMessage.value = '' }
function getErrorMessage(error: unknown) { return error instanceof Error ? error.message : '请求失败，请稍后重试。' }
function fillSuggestedStartTime() { anchorStartTime.value = toDatetimeLocalValue(new Date()); setSuccess('已把起始时间设置为当前时间。') }
async function copyText(text: string, successText: string) { try { await navigator.clipboard.writeText(text); setSuccess(successText) } catch { setError('复制失败，请手动复制。') } }
function saveSelectedRecordCustomization() {
  if (!selectedRecordPath.value) return
  recordCustomizations.value = {
    ...recordCustomizations.value,
    [selectedRecordPath.value]: {
      title: recordCustomizationDraft.value.title.trim(),
      note: recordCustomizationDraft.value.note.trim(),
      tags: recordCustomizationDraft.value.tags.trim(),
    },
  }
  setSuccess('这条历史记录的自定义标题、备注和标签已保存到当前浏览器。')
}
function clearSelectedRecordCustomization() {
  if (!selectedRecordPath.value) return
  const next = { ...recordCustomizations.value }
  delete next[selectedRecordPath.value]
  recordCustomizations.value = next
  recordCustomizationDraft.value = defaultRecordCustomization()
  setSuccess('这条历史记录的自定义信息已清空。')
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
      promptName: promptName.value,
      promptText: promptText.value,
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
    promptName: promptName.value,
    promptText: promptText.value,
    europeanCompanies: europeanCompanies.value,
    asianCompanies: asianCompanies.value,
    fetchCookie: fetchCookie.value,
    structuredMatch: structuredResult.value,
  }
}
async function loadStructuredData() {
  if (!canSubmit.value) return setError('请先填写比赛链接和起始时间。')
  loadingStructured.value = true
  try { structuredResult.value = await callWorkbenchPost('/matches/structured', buildPayload()); activeResultTab.value = 'structured'; setSuccess('结构化解析已完成。') } catch (e) { setError(getErrorMessage(e)) } finally { loadingStructured.value = false }
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
async function loadRecords() {
  loadingRecords.value = true
  try {
    const result = await callWorkbenchGet('/records?limit=100')
    historyRecords.value = Array.isArray(result?.items) ? result.items : []
    activeResultTab.value = 'history'
    if (historyRecords.value.length && !selectedRecordPath.value) await loadRecordDetail(historyRecords.value[0].relative_path)
    setSuccess(`历史记录已加载，共 ${historyRecords.value.length} 条。`)
  } catch (e) { setError(getErrorMessage(e)) } finally { loadingRecords.value = false }
}
async function loadRecordDetail(relativePath: string) {
  selectedRecordPath.value = relativePath
  loadingRecordDetail.value = true
  try { selectedRecordDetail.value = await callWorkbenchGet(`/records/detail?relative_path=${encodeURIComponent(relativePath)}`); setSuccess('历史详情已加载。') } catch (e) { setError(getErrorMessage(e)) } finally { loadingRecordDetail.value = false }
}
</script>

<template>
  <div class="page-shell">
    <header class="hero">
      <div class="hero-copy">
        <span class="eyebrow">足球赔率分析工作台</span>
        <h1>当前输入比赛单场分析</h1>
        <p>这里只分析你当前输入的这场比赛页面链路，不混入其他比赛、全站数据或外部信息。</p>
        <div class="hero-tag-row">
          <span class="hero-tag">站点 {{ siteLabel }}</span>
          <span class="hero-tag">Cookie {{ cookiePoolItems.length }} 个</span>
          <span class="hero-tag">模型 {{ modelName || '-' }}</span>
        </div>
      </div>
    </header>

    <main class="dashboard-layout workbench-layout">
      <section class="panel control-panel workspace-panel">
        <div class="section-head"><div><h2>统一设置区</h2><p>按下面步骤操作：先填参数，再做诊断，再做结构化解析和正式分析。</p></div></div>
        <div class="subtle-card onboarding-card">
          <div class="onboarding-head">
            <strong>新手使用步骤</strong>
            <span>第一次使用时，按 1 → 2 → 3 → 4 的顺序操作就可以。</span>
          </div>
          <div class="onboarding-steps">
            <div v-for="(step, index) in workflowSteps" :key="step.key" :class="['onboarding-step', step.state]">
              <strong>{{ index + 1 }}</strong>
              <div>
                <span>{{ step.label }}</span>
                <small>{{ step.description }}</small>
                <em>{{ step.statusLabel }}</em>
              </div>
            </div>
          </div>
        </div>
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
            <div class="action-row primary-action-row vertical-action-row">
              <button :class="['secondary', getWorkflowButtonClass('diagnostic')]" :disabled="loadingCookieTest || !canSubmit" @click="testCookieConnection">{{ loadingCookieTest ? '第2步 测试中...' : '第2步 先做抓取诊断' }}</button>
              <button :class="['secondary', getWorkflowButtonClass('structured')]" :disabled="loadingStructured || !canSubmit || !cookieTestResult?.valid" @click="loadStructuredData">{{ loadingStructured ? '第3步 解析中...' : '第3步 结构化解析' }}</button>
              <button class="secondary" :disabled="loadingPreview || !canSubmit" @click="previewAnalysis">{{ loadingPreview ? '预览生成中...' : '可选：分析输入预览' }}</button>
              <button :class="['secondary', getWorkflowButtonClass('analysis')]" :disabled="loadingAnalysis || !canSubmit || !structuredResult" @click="runAnalysis">{{ loadingAnalysis ? '第4步 分析中...' : '第4步 正式执行分析' }}</button>
              <button class="secondary" :disabled="loadingRecords" @click="loadRecords">{{ loadingRecords ? '历史加载中...' : '补充：查看历史记录' }}</button>
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
                    <label><span>模型提供商</span><select v-model="aiProvider"><option value="deepseek">DeepSeek</option><option value="openai">OpenAI Compatible</option></select></label>
                    <label><span>模型名称</span><input v-model="modelName" type="text" /></label>
                    <label><span>API 地址</span><input v-model="apiEndpoint" type="text" /></label>
                    <label><span>API Key</span><input v-model="apiKey" type="password" /></label>
                    <label><span>Temperature</span><input v-model="temperature" type="number" min="0" max="2" step="0.1" /></label>
                    <label><span>Max Tokens</span><input v-model="maxTokens" type="number" min="1" step="1" /></label>
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
                    <label class="full-span"><span>提示词名称</span><input v-model="promptName" type="text" /></label>
                    <label class="full-span"><span>补充提示词</span><textarea v-model="promptText" rows="6"></textarea></label>
                  </div>
                  <div class="module-action-row"><button class="secondary small-button" :disabled="loadingAnalysisSettings" @click="saveAnalysisSettings">{{ loadingAnalysisSettings ? '保存中...' : '保存分析口径' }}</button></div>
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
        <div class="section-head"><div><h2>核心结果区</h2><p>这里集中查看抓取诊断、结构化结果、模型预览、正式分析和历史记录。</p></div></div>
        <div class="summary-grid result-meta-grid">
          <div class="summary-card result-summary-card"><span>当前页签</span><strong>{{ resultTabLabels[activeResultTab] }}</strong></div>
          <div class="summary-card result-summary-card"><span>比赛标题</span><strong>{{ currentMatchTitle }}</strong></div>
          <div class="summary-card result-summary-card"><span>正式分析</span><strong>{{ analysisSucceeded ? '成功' : analysisResult ? '未成功' : '未执行' }}</strong></div>
          <div class="summary-card result-summary-card"><span>结果归档</span><strong>成功分析自动写入 JSON</strong></div>
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
          <button :class="['tab-button', { active: activeResultTab === 'history' }]" @click="activeResultTab = 'history'">历史记录</button>
        </div>

        <StructuredResultTab v-if="activeResultTab === 'structured'" :structured-result="structuredResult" :display-text="structuredDisplayText" :overview-cards="[{ label: '比赛键值', value: String(structuredResult?.match_key || '-') }, { label: '比赛对阵', value: structuredMatchupText }, { label: '页面数', value: String(structuredResult?.pages ? Object.keys(structuredResult.pages).length : 0) }, { label: '欧赔条数', value: String(structuredResult?.european_odds?.length ?? 0) }, { label: '亚盘条数', value: String(structuredResult?.asian_handicap?.length ?? 0) }]" :on-copy="() => copyText(structuredDisplayText, '结构化结果已复制。')" />
        <ResultTextTab v-else-if="activeResultTab === 'preview'" title="模型输入预览" copy-label="复制预览" card-title="分析输入内容" card-description="用于确认 system prompt、user prompt 和结构化入参是否严格围绕当前输入比赛页面链路。" :display-text="previewDisplayText" :overview-cards="[{ label: '提示词名称', value: promptName || defaultPromptName }, { label: '当前模型', value: modelName || '-' }, { label: 'API 地址', value: apiEndpoint || '-' }, { label: 'Cookie 数量', value: `${cookiePoolItems.length}` }]" :on-copy="() => copyText(previewDisplayText, '模型输入预览已复制。')" />
        <AnalysisResultTab v-else-if="activeResultTab === 'analysis'" :overview-cards="[{ label: '模型', value: modelName || '-' }, { label: '执行状态', value: analysisSucceeded ? '正式分析成功' : analysisResult ? '正式分析未成功' : '未执行' }, { label: '判断模块', value: `${analysisSectionCards.length}` }, { label: '输出格式', value: '已去除 Markdown 符号' }]" :conclusion-cards="analysisConclusionCards" :analysis-view="analysisView" :analysis-display-text="analysisDisplayText" :on-copy="() => copyText(analysisDisplayText, '正式分析结果已复制。')" />

        <div v-else class="history-layout">
          <div class="history-list-panel">
            <div class="result-toolbar compact-toolbar"><h3>历史归档记录</h3><button class="secondary small-button" :disabled="loadingRecords" @click="loadRecords">刷新</button></div>
            <div class="history-count">{{ historyRecords.length }} 条</div>
            <div v-if="historyRecords.length" class="record-list">
              <article v-for="item in historyRecords" :key="item.relative_path" class="record-item" :class="{ active: selectedRecordPath === item.relative_path }">
                <button class="record-main" @click="loadRecordDetail(item.relative_path)"><div class="record-main-top"><strong>{{ getDisplayRecordTitle(item) }}</strong></div><span>{{ formatDate(item.created_at) }}</span><span v-if="getDisplayRecordTitle(item) !== item.match_key">原始比赛键值：{{ item.match_key }}</span><span>{{ item.file_name }}</span><span v-if="getRecordCustomization(item.relative_path).note.trim()" class="record-note-preview">{{ getRecordCustomization(item.relative_path).note }}</span></button>
                <div v-if="getRecordTags(item.relative_path).length" class="record-badge-row"><span v-for="tag in getRecordTags(item.relative_path)" :key="`${item.relative_path}-${tag}`" class="mark-badge info-badge">{{ tag }}</span></div>
              </article>
            </div>
            <pre v-else>还没有加载历史记录，点击“查看历史记录”后这里会显示最近归档。</pre>
          </div>
          <div class="history-detail-panel">
            <div class="result-toolbar compact-toolbar"><h3>历史详情</h3><button class="secondary small-button" @click="copyText(selectedRecordAnalysisText, '历史分析结论已复制。')">复制结论</button></div>
            <div v-if="selectedRecordDetail" class="detail-grid">
              <div class="detail-meta"><div><strong>比赛键值：</strong>{{ selectedRecordDetail.match_key || '-' }}</div><div><strong>比赛对阵：</strong>{{ selectedRecordMatchupText }}</div><div><strong>自定义标题：</strong>{{ recordCustomizationDraft.title || '未设置' }}</div><div><strong>创建时间：</strong>{{ formatDate(selectedRecordDetail.created_at) }}</div><div><strong>比赛链接：</strong>{{ selectedRecordDetail.source_url || '-' }}</div></div>
              <div class="subtle-card detail-customization-card">
                <div class="settings-card-head"><h3>自定义这条历史记录</h3><p>你可以改标题、写备注、加标签，方便后续复盘和筛选。</p></div>
                <div class="field-grid settings-field-grid">
                  <label class="full-span"><span>自定义标题</span><input v-model="recordCustomizationDraft.title" type="text" placeholder="例如：1292872 临场主胜观察" /></label>
                  <label class="full-span"><span>标签</span><input v-model="recordCustomizationDraft.tags" type="text" placeholder="例如：临场，主胜，防冷" /></label>
                  <label class="full-span"><span>备注</span><textarea v-model="recordCustomizationDraft.note" rows="4" placeholder="记录你为什么收藏这条历史，或这次复盘要注意什么。"></textarea></label>
                </div>
                <div class="module-action-row"><button class="secondary small-button" @click="saveSelectedRecordCustomization">保存自定义信息</button><button class="secondary small-button" @click="clearSelectedRecordCustomization">清空自定义信息</button></div>
                <div v-if="selectedRecordTags.length" class="record-badge-row detail-badges"><span v-for="tag in selectedRecordTags" :key="`selected-${tag}`" class="mark-badge info-badge">{{ tag }}</span></div>
              </div>
              <div class="analysis-layout">
                <div class="analysis-lead-card emphasis-card"><span>历史最终结论</span><strong>{{ recordAnalysisView.headline }}</strong><p>{{ recordAnalysisView.lead }}</p></div>
                <div class="analysis-section-grid"><div v-for="section in recordAnalysisSectionCards" :key="section.key" class="analysis-section-card"><span>{{ section.title }}</span><strong>{{ section.hint }}</strong><ul><li v-for="item in section.items" :key="item">{{ item }}</li></ul></div></div>
                <details class="detail-section" :open="recordAnalysisView.hasContent"><summary>查看完整历史结论</summary><pre>{{ selectedRecordAnalysisText }}</pre></details>
                <details class="detail-section" v-if="selectedRecordDetail.scraped_payload?.pages"><summary>查看抓取页面状态</summary><div class="diagnostic-page-list"><div v-for="(page, key) in selectedRecordDetail.scraped_payload.pages" :key="key" class="diagnostic-page-row"><div><strong>{{ getPageLabel(key) }}</strong><p>{{ page.page_url }}</p><p v-if="page.error_message">{{ page.error_message }}</p></div><div class="diagnostic-page-meta"><span :class="['status-badge', page.fetched ? 'success' : 'error']">{{ page.fetched ? '已抓取' : '抓取失败' }}</span><span>HTTP {{ page.status_code ?? '-' }}</span></div></div></div></details>
              </div>
            </div>
            <pre v-else>请选择一条历史记录查看详情。</pre>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
