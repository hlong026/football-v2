import { computed, onMounted, ref, watch } from 'vue';
import AnalysisResultTab from './features/workbench/components/AnalysisResultTab.vue';
import ResultTextTab from './features/workbench/components/ResultTextTab.vue';
import StructuredResultTab from './features/workbench/components/StructuredResultTab.vue';
import { defaultApiEndpoint, defaultAsianCompanies, defaultEuropeanCompanies, defaultMaxTokens, defaultModelName, defaultPromptName, defaultSite, defaultTemperature, formDraftStorageKey, recordCustomStorageKey, recordMarksStorageKey, resultTabLabels, sampleMatchUrl, } from './features/workbench/constants';
import { callWorkbenchGet, callWorkbenchPost, loadServerFetchSettings, saveServerFetchSettings } from './features/workbench/api';
import { defaultRecordCustomization, loadStoredFormDraft as readStoredFormDraft, loadStoredRecordCustomizations as readStoredRecordCustomizations, loadStoredRecordMarks as readStoredRecordMarks, persistFormDraft as writeFormDraft, persistRecordCustomizations as writeRecordCustomizations, persistRecordMarks as writeRecordMarks, } from './features/workbench/storage';
import { buildAnalysisSectionCards, buildAnalysisView, formatAnalysisText, formatDate, getPageLabel, pretty, prettyDisplayPreferred, splitCompanies, splitCookies, toDatetimeLocalValue, } from './features/workbench/utils';
const stored = readStoredFormDraft(formDraftStorageKey, resultTabLabels);
const site = ref(stored.site ?? defaultSite);
const matchUrl = ref(stored.matchUrl ?? '');
const anchorStartTime = ref(stored.anchorStartTime ?? '');
const anchorEndTime = ref(stored.anchorEndTime ?? '');
const aiProvider = ref(stored.aiProvider ?? 'deepseek');
const apiEndpoint = ref(stored.apiEndpoint ?? defaultApiEndpoint);
const apiKey = ref(stored.apiKey ?? '');
const modelName = ref(stored.modelName ?? defaultModelName);
const fetchCookie = ref(stored.fetchCookie ?? '');
const temperature = ref(stored.temperature ?? defaultTemperature);
const maxTokens = ref(stored.maxTokens ?? defaultMaxTokens);
const promptName = ref(stored.promptName ?? defaultPromptName);
const promptText = ref(stored.promptText ?? '');
const europeanCompanies = ref(stored.europeanCompanies ?? defaultEuropeanCompanies);
const asianCompanies = ref(stored.asianCompanies ?? defaultAsianCompanies);
const activeResultTab = ref(stored.activeResultTab ?? 'analysis');
const loadingStructured = ref(false);
const loadingPreview = ref(false);
const loadingAnalysis = ref(false);
const loadingRecords = ref(false);
const loadingRecordDetail = ref(false);
const loadingCookieTest = ref(false);
const loadingFetchSettings = ref(false);
const loadingModelConnection = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const structuredResult = ref(null);
const previewResult = ref(null);
const analysisResult = ref(null);
const cookieTestResult = ref(null);
const historyRecords = ref([]);
const selectedRecordDetail = ref(null);
const selectedRecordPath = ref('');
const modelConnectionResult = ref(null);
const savedFetchSettings = ref(null);
const recordMarks = ref(readStoredRecordMarks(recordMarksStorageKey));
const recordCustomizations = ref(readStoredRecordCustomizations(recordCustomStorageKey));
const recordCustomizationDraft = ref(defaultRecordCustomization());
onMounted(() => {
    void loadSavedFetchSettingsFromServer();
});
watch([site, matchUrl, anchorStartTime, anchorEndTime, aiProvider, apiEndpoint, apiKey, modelName, fetchCookie, temperature, maxTokens, promptName, promptText, europeanCompanies, asianCompanies, activeResultTab], saveDraft);
watch(recordMarks, () => writeRecordMarks(recordMarksStorageKey, recordMarks.value), { deep: true });
watch(recordCustomizations, () => writeRecordCustomizations(recordCustomStorageKey, recordCustomizations.value), { deep: true });
watch(selectedRecordPath, (value) => {
    recordCustomizationDraft.value = value
        ? { ...getRecordCustomization(value) }
        : defaultRecordCustomization();
}, { immediate: true });
const canSubmit = computed(() => Boolean(matchUrl.value.trim() && anchorStartTime.value));
const isBusy = computed(() => loadingStructured.value || loadingPreview.value || loadingAnalysis.value || loadingRecords.value || loadingRecordDetail.value || loadingCookieTest.value || loadingModelConnection.value);
const cookiePoolItems = computed(() => splitCookies(fetchCookie.value));
const siteLabel = computed(() => (site.value === 'okooo' ? '澳客网' : site.value));
const analysisSucceeded = computed(() => Boolean(analysisResult.value?.success && analysisResult.value?.raw_response?.trim()));
const analysisDisplayText = computed(() => {
    if (!analysisResult.value)
        return '还没有正式分析结果，点击“正式执行分析”后这里会显示本场比赛的模型结论。';
    if (analysisSucceeded.value)
        return formatAnalysisText(analysisResult.value?.raw_response || '');
    return formatAnalysisText(analysisResult.value?.error_message || prettyDisplayPreferred(analysisResult.value));
});
const selectedRecordAnalysisText = computed(() => formatAnalysisText(selectedRecordDetail.value?.analysis_payload?.raw_response || selectedRecordDetail.value?.analysis_payload?.error_message || '暂无模型结论'));
const analysisView = computed(() => analysisSucceeded.value
    ? buildAnalysisView(analysisDisplayText.value, '等待正式分析', '正式执行分析后，这里会提炼本场结论。')
    : buildAnalysisView('还没有正式分析结果', '等待正式分析', '正式执行分析后，这里会提炼本场结论。'));
const recordAnalysisView = computed(() => buildAnalysisView(selectedRecordAnalysisText.value, '等待历史结论', '载入历史记录后，这里会自动抽出重点。'));
const analysisSectionCards = computed(() => analysisSucceeded.value ? buildAnalysisSectionCards(analysisView.value) : []);
const recordAnalysisSectionCards = computed(() => selectedRecordDetail.value?.analysis_payload?.success ? buildAnalysisSectionCards(recordAnalysisView.value) : []);
const workflowSteps = computed(() => {
    const inputDone = canSubmit.value;
    const diagnosticDone = Boolean(cookieTestResult.value?.valid);
    const structuredDone = Boolean(structuredResult.value);
    const analysisDone = analysisSucceeded.value;
    const currentKey = !inputDone
        ? 'input'
        : !diagnosticDone
            ? 'diagnostic'
            : !structuredDone
                ? 'structured'
                : !analysisDone
                    ? 'analysis'
                    : 'history';
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
            label: '做结构化解析',
            statusLabel: structuredDone ? '已完成' : currentKey === 'structured' ? '当前步骤' : '待执行',
            description: '把欧赔、亚盘和平均值整理成可读数据，先确认抓到了多少家机构。',
            state: structuredDone ? 'done' : currentKey === 'structured' ? 'current' : 'idle',
        },
        {
            key: 'analysis',
            label: '最后执行正式分析',
            statusLabel: analysisDone ? '已完成' : currentKey === 'analysis' ? '当前步骤' : '待执行',
            description: '模型会直接给出一个最终判断，顶部会优先展示最核心结论。',
            state: analysisDone ? 'done' : currentKey === 'analysis' ? 'current' : 'idle',
        },
    ];
});
const currentWorkflowStepKey = computed(() => workflowSteps.value.find((item) => item.state === 'current')?.key ?? 'input');
const analysisConclusionCards = computed(() => {
    const tendency = getAnalysisTendencyText();
    const comparison = getAnalysisComparisonText();
    const risk = getAnalysisRiskText();
    const advice = getAnalysisAdviceText();
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
            value: cutDisplayText(comparison, 52),
            fullValue: comparison,
            tone: 'accent',
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
            value: cutDisplayText(advice, 52),
            fullValue: advice,
            tone: 'success',
        },
    ];
});
const structuredDisplayText = computed(() => structuredResult.value ? pretty(structuredResult.value) : '还没有结构化结果，点击“结构化解析”后这里会显示数据。');
const previewDisplayText = computed(() => previewResult.value ? prettyDisplayPreferred(previewResult.value) : '还没有模型输入预览，点击“分析输入预览”后这里会显示 system prompt、user prompt 和结构化入参。');
const selectedRecordTags = computed(() => splitCompanies(recordCustomizationDraft.value.tags));
function getMatchupText(payload) {
    if (payload?.home_team && payload?.away_team) {
        return `${payload.home_team} vs ${payload.away_team}`;
    }
    if (payload?.home_team) {
        return payload.home_team;
    }
    if (payload?.away_team) {
        return payload.away_team;
    }
    return '-';
}
const structuredMatchupText = computed(() => getMatchupText(structuredResult.value));
const selectedRecordMatchupText = computed(() => getMatchupText(selectedRecordDetail.value?.scraped_payload || selectedRecordDetail.value));
const currentMatchTitle = computed(() => {
    if (structuredMatchupText.value !== '-') {
        return structuredMatchupText.value;
    }
    if (selectedRecordMatchupText.value !== '-') {
        return selectedRecordMatchupText.value;
    }
    return structuredResult.value?.match_key || selectedRecordDetail.value?.match_key || '-';
});
function getSectionCardValue(sectionCards, key, fallback) {
    return sectionCards.find((item) => item.key === key)?.items[0] || fallback;
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
        .filter((item, index, array) => array.indexOf(item) === index);
}
function findAnalysisSignalByPattern(pattern, fallback, excludePattern) {
    return getAnalysisSignalPool().find((item) => pattern.test(item) && (!excludePattern || !excludePattern.test(item))) || fallback;
}
function getAnalysisTendencyText() {
    return getSectionCardValue(analysisSectionCards.value, 'tendency', analysisView.value.headlineFull);
}
function getAnalysisComparisonText() {
    return findAnalysisSignalByPattern(/(\d+(?:\.\d+)?%|概率|胜率|对比|vs|VS|高于|低于|领先|占优|更高|更低|优势)/, getSectionCardValue(analysisSectionCards.value, 'basis', analysisView.value.leadFull || analysisView.value.headlineFull), /(风险|建议|策略|操作|警惕|注意)/);
}
function getAnalysisRiskText() {
    return findAnalysisSignalByPattern(/(风险|警惕|防范|注意|不确定|隐患|波动|诱盘|反转|保守|谨慎)/, getSectionCardValue(analysisSectionCards.value, 'risk', analysisView.value.leadFull || analysisView.value.headlineFull));
}
function getAnalysisAdviceText() {
    return findAnalysisSignalByPattern(/(建议|策略|操作|可考虑|推荐|方案|执行|观望|等待|不宜|优先|跟进)/, getSectionCardValue(analysisSectionCards.value, 'advice', analysisView.value.leadFull || analysisView.value.headlineFull));
}
function cutDisplayText(value, maxLength) {
    return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}
function getRecordCustomization(relativePath) {
    return recordCustomizations.value[relativePath] ?? defaultRecordCustomization();
}
function getDisplayRecordTitle(item) {
    const customTitle = getRecordCustomization(item.relative_path).title.trim();
    if (customTitle) {
        return customTitle;
    }
    if (item.display_title) {
        return item.display_title;
    }
    const matchup = getMatchupText(item);
    return matchup !== '-' ? matchup : item.match_key;
}
function getRecordTags(relativePath) {
    return splitCompanies(getRecordCustomization(relativePath).tags);
}
function getWorkflowButtonClass(stepKey) {
    return {
        'step-current-button': currentWorkflowStepKey.value === stepKey,
        'step-done-button': workflowSteps.value.find((item) => item.key === stepKey)?.state === 'done',
    };
}
function applyServerCookies(result, forceReplace = false) {
    savedFetchSettings.value = result;
    if ((forceReplace || !fetchCookie.value.trim()) && result.cookies.length) {
        fetchCookie.value = result.cookies.join('\n');
        saveDraft();
    }
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
    });
}
function setError(message) { errorMessage.value = message; successMessage.value = ''; }
function setSuccess(message) { successMessage.value = message; errorMessage.value = ''; }
function getErrorMessage(error) { return error instanceof Error ? error.message : '请求失败，请稍后重试。'; }
function fillSuggestedStartTime() { anchorStartTime.value = toDatetimeLocalValue(new Date()); setSuccess('已把起始时间设置为当前时间。'); }
async function copyText(text, successText) { try {
    await navigator.clipboard.writeText(text);
    setSuccess(successText);
}
catch {
    setError('复制失败，请手动复制。');
} }
function saveSelectedRecordCustomization() {
    if (!selectedRecordPath.value)
        return;
    recordCustomizations.value = {
        ...recordCustomizations.value,
        [selectedRecordPath.value]: {
            title: recordCustomizationDraft.value.title.trim(),
            note: recordCustomizationDraft.value.note.trim(),
            tags: recordCustomizationDraft.value.tags.trim(),
        },
    };
    setSuccess('这条历史记录的自定义标题、备注和标签已保存到当前浏览器。');
}
function clearSelectedRecordCustomization() {
    if (!selectedRecordPath.value)
        return;
    const next = { ...recordCustomizations.value };
    delete next[selectedRecordPath.value];
    recordCustomizations.value = next;
    recordCustomizationDraft.value = defaultRecordCustomization();
    setSuccess('这条历史记录的自定义信息已清空。');
}
async function loadSavedFetchSettingsFromServer() {
    loadingFetchSettings.value = true;
    try {
        const result = await loadServerFetchSettings();
        applyServerCookies(result);
    }
    catch {
    }
    finally {
        loadingFetchSettings.value = false;
    }
}
async function refillFetchSettingsFromServer() {
    loadingFetchSettings.value = true;
    try {
        const result = await loadServerFetchSettings();
        applyServerCookies(result, true);
        setSuccess(result.cookies.length ? `已用后端保存的 ${result.cookies.length} 条 Cookie 覆盖当前输入框。` : '后端当前没有可回填的 Cookie。');
    }
    catch (e) {
        setError(getErrorMessage(e));
    }
    finally {
        loadingFetchSettings.value = false;
    }
}
async function saveFetchSettings() {
    saveDraft();
    loadingFetchSettings.value = true;
    try {
        const result = await saveServerFetchSettings(fetchCookie.value);
        savedFetchSettings.value = result;
        setSuccess(result.cookies.length ? '抓取设置已保存到浏览器本地和后端本地。后续请求即使前端不再手动传入，后端也可以复用。' : '已清空后端已保存的 Cookie 设置。');
    }
    catch (e) {
        setError(getErrorMessage(e));
    }
    finally {
        loadingFetchSettings.value = false;
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
    };
}
async function loadStructuredData() {
    if (!canSubmit.value)
        return setError('请先填写比赛链接和起始时间。');
    loadingStructured.value = true;
    try {
        structuredResult.value = await callWorkbenchPost('/matches/structured', buildPayload());
        activeResultTab.value = 'structured';
        setSuccess('结构化解析已完成。');
    }
    catch (e) {
        setError(getErrorMessage(e));
    }
    finally {
        loadingStructured.value = false;
    }
}
async function previewAnalysis() {
    if (!canSubmit.value)
        return setError('请先填写比赛链接和起始时间。');
    loadingPreview.value = true;
    try {
        previewResult.value = await callWorkbenchPost('/analysis/preview', buildPayload());
        activeResultTab.value = 'preview';
        setSuccess('模型输入预览已生成。');
    }
    catch (e) {
        setError(getErrorMessage(e));
    }
    finally {
        loadingPreview.value = false;
    }
}
async function runAnalysis() {
    if (!canSubmit.value)
        return setError('请先填写比赛链接和起始时间。');
    loadingAnalysis.value = true;
    try {
        analysisResult.value = await callWorkbenchPost('/analysis/run', buildPayload());
        activeResultTab.value = 'analysis';
        analysisResult.value?.success ? setSuccess('正式分析已完成。') : setError(analysisResult.value?.error_message || '正式分析失败。');
    }
    catch (e) {
        setError(getErrorMessage(e));
    }
    finally {
        loadingAnalysis.value = false;
    }
}
async function testCookieConnection() {
    if (!canSubmit.value)
        return setError('请先填写比赛链接和起始时间。');
    loadingCookieTest.value = true;
    try {
        cookieTestResult.value = await callWorkbenchPost('/matches/test-cookie', buildPayload());
        setSuccess('抓取诊断已完成。');
    }
    catch (e) {
        setError(getErrorMessage(e));
    }
    finally {
        loadingCookieTest.value = false;
    }
}
async function testModelConnection() {
    if (!canSubmit.value)
        return setError('请先填写比赛链接和起始时间。');
    loadingModelConnection.value = true;
    try {
        const result = await callWorkbenchPost('/analysis/test-connection', buildPayload());
        modelConnectionResult.value = result;
        result.success ? setSuccess('模型连接正常。') : setError(result.message);
    }
    catch (e) {
        setError(getErrorMessage(e));
    }
    finally {
        loadingModelConnection.value = false;
    }
}
async function loadRecords() {
    loadingRecords.value = true;
    try {
        const result = await callWorkbenchGet('/records?limit=100');
        historyRecords.value = Array.isArray(result?.items) ? result.items : [];
        activeResultTab.value = 'history';
        if (historyRecords.value.length && !selectedRecordPath.value)
            await loadRecordDetail(historyRecords.value[0].relative_path);
        setSuccess(`历史记录已加载，共 ${historyRecords.value.length} 条。`);
    }
    catch (e) {
        setError(getErrorMessage(e));
    }
    finally {
        loadingRecords.value = false;
    }
}
async function loadRecordDetail(relativePath) {
    selectedRecordPath.value = relativePath;
    loadingRecordDetail.value = true;
    try {
        selectedRecordDetail.value = await callWorkbenchGet(`/records/detail?relative_path=${encodeURIComponent(relativePath)}`);
        setSuccess('历史详情已加载。');
    }
    catch (e) {
        setError(getErrorMessage(e));
    }
    finally {
        loadingRecordDetail.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "hero" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-tag-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "hero-tag" },
});
(__VLS_ctx.siteLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "hero-tag" },
});
(__VLS_ctx.cookiePoolItems.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "hero-tag" },
});
(__VLS_ctx.modelName || '-');
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "dashboard-layout workbench-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "panel control-panel workspace-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "subtle-card onboarding-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "onboarding-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "onboarding-steps" },
});
for (const [step, index] of __VLS_getVForSourceType((__VLS_ctx.workflowSteps))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (step.key),
        ...{ class: (['onboarding-step', step.state]) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (index + 1);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (step.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (step.description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({});
    (step.statusLabel);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: (['core-input-shell', { 'step-current-shell': __VLS_ctx.currentWorkflowStepKey === 'input' }]) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "field-grid key-field-grid core-input-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "full-span" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "url",
    placeholder: (__VLS_ctx.sampleMatchUrl),
});
(__VLS_ctx.matchUrl);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "datetime-local",
});
(__VLS_ctx.anchorStartTime);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "datetime-local",
});
(__VLS_ctx.anchorEndTime);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "quick-helper-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.fillSuggestedStartTime) },
    ...{ class: "secondary helper-button" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.saveDraft();
            __VLS_ctx.setSuccess('当前设置已保存到浏览器本地。');
        } },
    ...{ class: "secondary helper-button" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "action-row primary-action-row vertical-action-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.testCookieConnection) },
    ...{ class: (['secondary', __VLS_ctx.getWorkflowButtonClass('diagnostic')]) },
    disabled: (__VLS_ctx.loadingCookieTest || !__VLS_ctx.canSubmit),
});
(__VLS_ctx.loadingCookieTest ? '第2步 测试中...' : '第2步 先做抓取诊断');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadStructuredData) },
    ...{ class: (__VLS_ctx.getWorkflowButtonClass('structured')) },
    disabled: (__VLS_ctx.loadingStructured || !__VLS_ctx.canSubmit || !__VLS_ctx.cookieTestResult?.valid),
});
(__VLS_ctx.loadingStructured ? '第3步 解析中...' : '第3步 结构化解析');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.previewAnalysis) },
    ...{ class: "secondary" },
    disabled: (__VLS_ctx.loadingPreview || !__VLS_ctx.canSubmit),
});
(__VLS_ctx.loadingPreview ? '预览生成中...' : '可选：分析输入预览');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.runAnalysis) },
    ...{ class: (['secondary', __VLS_ctx.getWorkflowButtonClass('analysis')]) },
    disabled: (__VLS_ctx.loadingAnalysis || !__VLS_ctx.canSubmit || !__VLS_ctx.structuredResult),
});
(__VLS_ctx.loadingAnalysis ? '第4步 分析中...' : '第4步 正式执行分析');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadRecords) },
    ...{ class: "secondary" },
    disabled: (__VLS_ctx.loadingRecords),
});
(__VLS_ctx.loadingRecords ? '历史加载中...' : '补充：查看历史记录');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "empty-tip-card compact-tip-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "empty-tip-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.sampleMatchUrl);
__VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
    ...{ class: "advanced-panel" },
    open: true,
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-shell advanced-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "module-status-card info settings-storage-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "subtle-card setting-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-card-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "field-grid settings-field-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "full-span" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
    value: (__VLS_ctx.fetchCookie),
    rows: "6",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "module-action-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.saveFetchSettings) },
    ...{ class: "secondary small-button" },
    disabled: (__VLS_ctx.loadingFetchSettings),
});
(__VLS_ctx.loadingFetchSettings ? '保存中...' : '保存抓取设置');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.refillFetchSettingsFromServer) },
    ...{ class: "secondary small-button" },
    disabled: (__VLS_ctx.loadingFetchSettings),
});
(__VLS_ctx.loadingFetchSettings ? '读取中...' : '从后端回填 Cookie');
if (__VLS_ctx.savedFetchSettings?.updated_at) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "module-status-card info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.formatDate(__VLS_ctx.savedFetchSettings.updated_at));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "subtle-card setting-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-card-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "field-grid settings-field-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.aiProvider),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "deepseek",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "openai",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    value: (__VLS_ctx.modelName),
    type: "text",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    value: (__VLS_ctx.apiEndpoint),
    type: "text",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "password",
});
(__VLS_ctx.apiKey);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "0",
    max: "2",
    step: "0.1",
});
(__VLS_ctx.temperature);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "1",
    step: "1",
});
(__VLS_ctx.maxTokens);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "module-action-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.saveDraft();
            __VLS_ctx.setSuccess('模型设置已保存到浏览器本地。');
        } },
    ...{ class: "secondary small-button" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.testModelConnection) },
    ...{ class: "secondary small-button" },
    disabled: (__VLS_ctx.loadingModelConnection || !__VLS_ctx.canSubmit),
});
(__VLS_ctx.loadingModelConnection ? '测试中...' : '测试模型连接');
if (__VLS_ctx.modelConnectionResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: (['module-status-card', __VLS_ctx.modelConnectionResult.success ? 'success' : 'error']) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.modelConnectionResult.success ? '模型连接正常' : '模型连接异常');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.modelConnectionResult.message);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "subtle-card setting-card full-span-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "settings-card-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "field-grid settings-field-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "full-span" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
    value: (__VLS_ctx.europeanCompanies),
    rows: "3",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "full-span" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
    value: (__VLS_ctx.asianCompanies),
    rows: "3",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "full-span" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    value: (__VLS_ctx.promptName),
    type: "text",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "full-span" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
    value: (__VLS_ctx.promptText),
    rows: "6",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "panel result-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-grid result-meta-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-card result-summary-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.resultTabLabels[__VLS_ctx.activeResultTab]);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-card result-summary-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.currentMatchTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-card result-summary-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.analysisSucceeded ? '成功' : __VLS_ctx.analysisResult ? '未成功' : '未执行');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-card result-summary-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
if (__VLS_ctx.isBusy) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "busy-banner" },
    });
}
if (__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error-banner" },
    });
    (__VLS_ctx.errorMessage);
}
if (__VLS_ctx.successMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "success-banner" },
    });
    (__VLS_ctx.successMessage);
}
if (__VLS_ctx.cookieTestResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "subtle-card diagnosis-shell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "status-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "status-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.cookieTestResult.valid ? '可以继续分析' : '需要先处理抓取问题');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "status-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.cookieTestResult.healthy_cookie_count ?? 0);
    (__VLS_ctx.cookieTestResult.cookie_count ?? 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "status-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.cookieTestResult.parse_summary?.european_count ?? 0);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "status-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.cookieTestResult.parse_summary?.asian_count ?? 0);
    if (__VLS_ctx.cookieTestResult.suggestions?.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "guide-list compact-list" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.cookieTestResult.suggestions))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (item),
            });
            (item);
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tab-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeResultTab = 'structured';
        } },
    ...{ class: (['tab-button', { active: __VLS_ctx.activeResultTab === 'structured' }]) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeResultTab = 'preview';
        } },
    ...{ class: (['tab-button', { active: __VLS_ctx.activeResultTab === 'preview' }]) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeResultTab = 'analysis';
        } },
    ...{ class: (['tab-button', { active: __VLS_ctx.activeResultTab === 'analysis' }]) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeResultTab = 'history';
        } },
    ...{ class: (['tab-button', { active: __VLS_ctx.activeResultTab === 'history' }]) },
});
if (__VLS_ctx.activeResultTab === 'structured') {
    /** @type {[typeof StructuredResultTab, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(StructuredResultTab, new StructuredResultTab({
        structuredResult: (__VLS_ctx.structuredResult),
        displayText: (__VLS_ctx.structuredDisplayText),
        overviewCards: ([{ label: '比赛键值', value: String(__VLS_ctx.structuredResult?.match_key || '-') }, { label: '比赛对阵', value: __VLS_ctx.structuredMatchupText }, { label: '页面数', value: String(__VLS_ctx.structuredResult?.pages ? Object.keys(__VLS_ctx.structuredResult.pages).length : 0) }, { label: '欧赔条数', value: String(__VLS_ctx.structuredResult?.european_odds?.length ?? 0) }, { label: '亚盘条数', value: String(__VLS_ctx.structuredResult?.asian_handicap?.length ?? 0) }]),
        onCopy: (() => __VLS_ctx.copyText(__VLS_ctx.structuredDisplayText, '结构化结果已复制。')),
    }));
    const __VLS_1 = __VLS_0({
        structuredResult: (__VLS_ctx.structuredResult),
        displayText: (__VLS_ctx.structuredDisplayText),
        overviewCards: ([{ label: '比赛键值', value: String(__VLS_ctx.structuredResult?.match_key || '-') }, { label: '比赛对阵', value: __VLS_ctx.structuredMatchupText }, { label: '页面数', value: String(__VLS_ctx.structuredResult?.pages ? Object.keys(__VLS_ctx.structuredResult.pages).length : 0) }, { label: '欧赔条数', value: String(__VLS_ctx.structuredResult?.european_odds?.length ?? 0) }, { label: '亚盘条数', value: String(__VLS_ctx.structuredResult?.asian_handicap?.length ?? 0) }]),
        onCopy: (() => __VLS_ctx.copyText(__VLS_ctx.structuredDisplayText, '结构化结果已复制。')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
}
else if (__VLS_ctx.activeResultTab === 'preview') {
    /** @type {[typeof ResultTextTab, ]} */ ;
    // @ts-ignore
    const __VLS_3 = __VLS_asFunctionalComponent(ResultTextTab, new ResultTextTab({
        title: "模型输入预览",
        copyLabel: "复制预览",
        cardTitle: "分析输入内容",
        cardDescription: "用于确认 system prompt、user prompt 和结构化入参是否严格围绕当前输入比赛页面链路。",
        displayText: (__VLS_ctx.previewDisplayText),
        overviewCards: ([{ label: '提示词名称', value: __VLS_ctx.promptName || __VLS_ctx.defaultPromptName }, { label: '当前模型', value: __VLS_ctx.modelName || '-' }, { label: 'API 地址', value: __VLS_ctx.apiEndpoint || '-' }, { label: 'Cookie 数量', value: `${__VLS_ctx.cookiePoolItems.length}` }]),
        onCopy: (() => __VLS_ctx.copyText(__VLS_ctx.previewDisplayText, '模型输入预览已复制。')),
    }));
    const __VLS_4 = __VLS_3({
        title: "模型输入预览",
        copyLabel: "复制预览",
        cardTitle: "分析输入内容",
        cardDescription: "用于确认 system prompt、user prompt 和结构化入参是否严格围绕当前输入比赛页面链路。",
        displayText: (__VLS_ctx.previewDisplayText),
        overviewCards: ([{ label: '提示词名称', value: __VLS_ctx.promptName || __VLS_ctx.defaultPromptName }, { label: '当前模型', value: __VLS_ctx.modelName || '-' }, { label: 'API 地址', value: __VLS_ctx.apiEndpoint || '-' }, { label: 'Cookie 数量', value: `${__VLS_ctx.cookiePoolItems.length}` }]),
        onCopy: (() => __VLS_ctx.copyText(__VLS_ctx.previewDisplayText, '模型输入预览已复制。')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_3));
}
else if (__VLS_ctx.activeResultTab === 'analysis') {
    /** @type {[typeof AnalysisResultTab, ]} */ ;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent(AnalysisResultTab, new AnalysisResultTab({
        overviewCards: ([{ label: '模型', value: __VLS_ctx.modelName || '-' }, { label: '执行状态', value: __VLS_ctx.analysisSucceeded ? '正式分析成功' : __VLS_ctx.analysisResult ? '正式分析未成功' : '未执行' }, { label: '判断模块', value: `${__VLS_ctx.analysisSectionCards.length}` }, { label: '输出格式', value: '已去除 Markdown 符号' }]),
        conclusionCards: (__VLS_ctx.analysisConclusionCards),
        analysisView: (__VLS_ctx.analysisView),
        analysisSectionCards: (__VLS_ctx.analysisSectionCards),
        analysisDisplayText: (__VLS_ctx.analysisDisplayText),
        onCopy: (() => __VLS_ctx.copyText(__VLS_ctx.analysisDisplayText, '正式分析结果已复制。')),
    }));
    const __VLS_7 = __VLS_6({
        overviewCards: ([{ label: '模型', value: __VLS_ctx.modelName || '-' }, { label: '执行状态', value: __VLS_ctx.analysisSucceeded ? '正式分析成功' : __VLS_ctx.analysisResult ? '正式分析未成功' : '未执行' }, { label: '判断模块', value: `${__VLS_ctx.analysisSectionCards.length}` }, { label: '输出格式', value: '已去除 Markdown 符号' }]),
        conclusionCards: (__VLS_ctx.analysisConclusionCards),
        analysisView: (__VLS_ctx.analysisView),
        analysisSectionCards: (__VLS_ctx.analysisSectionCards),
        analysisDisplayText: (__VLS_ctx.analysisDisplayText),
        onCopy: (() => __VLS_ctx.copyText(__VLS_ctx.analysisDisplayText, '正式分析结果已复制。')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "history-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "history-list-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "result-toolbar compact-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadRecords) },
        ...{ class: "secondary small-button" },
        disabled: (__VLS_ctx.loadingRecords),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "history-count" },
    });
    (__VLS_ctx.historyRecords.length);
    if (__VLS_ctx.historyRecords.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "record-list" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.historyRecords))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (item.relative_path),
                ...{ class: "record-item" },
                ...{ class: ({ active: __VLS_ctx.selectedRecordPath === item.relative_path }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.activeResultTab === 'structured'))
                            return;
                        if (!!(__VLS_ctx.activeResultTab === 'preview'))
                            return;
                        if (!!(__VLS_ctx.activeResultTab === 'analysis'))
                            return;
                        if (!(__VLS_ctx.historyRecords.length))
                            return;
                        __VLS_ctx.loadRecordDetail(item.relative_path);
                    } },
                ...{ class: "record-main" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "record-main-top" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (__VLS_ctx.getDisplayRecordTitle(item));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatDate(item.created_at));
            if (__VLS_ctx.getDisplayRecordTitle(item) !== item.match_key) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (item.match_key);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (item.file_name);
            if (__VLS_ctx.getRecordCustomization(item.relative_path).note.trim()) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "record-note-preview" },
                });
                (__VLS_ctx.getRecordCustomization(item.relative_path).note);
            }
            if (__VLS_ctx.getRecordTags(item.relative_path).length) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "record-badge-row" },
                });
                for (const [tag] of __VLS_getVForSourceType((__VLS_ctx.getRecordTags(item.relative_path)))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        key: (`${item.relative_path}-${tag}`),
                        ...{ class: "mark-badge info-badge" },
                    });
                    (tag);
                }
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "history-detail-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "result-toolbar compact-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.activeResultTab === 'structured'))
                    return;
                if (!!(__VLS_ctx.activeResultTab === 'preview'))
                    return;
                if (!!(__VLS_ctx.activeResultTab === 'analysis'))
                    return;
                __VLS_ctx.copyText(__VLS_ctx.selectedRecordAnalysisText, '历史分析结论已复制。');
            } },
        ...{ class: "secondary small-button" },
    });
    if (__VLS_ctx.selectedRecordDetail) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "detail-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "detail-meta" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedRecordDetail.match_key || '-');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedRecordMatchupText);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.recordCustomizationDraft.title || '未设置');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.formatDate(__VLS_ctx.selectedRecordDetail.created_at));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedRecordDetail.source_url || '-');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "subtle-card detail-customization-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "settings-card-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "field-grid settings-field-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "full-span" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.recordCustomizationDraft.title),
            type: "text",
            placeholder: "例如：1292872 临场主胜观察",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "full-span" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.recordCustomizationDraft.tags),
            type: "text",
            placeholder: "例如：临场，主胜，防冷",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "full-span" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
            value: (__VLS_ctx.recordCustomizationDraft.note),
            rows: "4",
            placeholder: "记录你为什么收藏这条历史，或这次复盘要注意什么。",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "module-action-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveSelectedRecordCustomization) },
            ...{ class: "secondary small-button" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.clearSelectedRecordCustomization) },
            ...{ class: "secondary small-button" },
        });
        if (__VLS_ctx.selectedRecordTags.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "record-badge-row detail-badges" },
            });
            for (const [tag] of __VLS_getVForSourceType((__VLS_ctx.selectedRecordTags))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    key: (`selected-${tag}`),
                    ...{ class: "mark-badge info-badge" },
                });
                (tag);
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "analysis-layout" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "analysis-lead-card emphasis-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.recordAnalysisView.headline);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.recordAnalysisView.lead);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "analysis-section-grid" },
        });
        for (const [section] of __VLS_getVForSourceType((__VLS_ctx.recordAnalysisSectionCards))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (section.key),
                ...{ class: "analysis-section-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (section.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (section.hint);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({});
            for (const [item] of __VLS_getVForSourceType((section.items))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    key: (item),
                });
                (item);
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
            ...{ class: "detail-section" },
            open: (__VLS_ctx.recordAnalysisView.hasContent),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
        (__VLS_ctx.selectedRecordAnalysisText);
        if (__VLS_ctx.selectedRecordDetail.scraped_payload?.pages) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
                ...{ class: "detail-section" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "diagnostic-page-list" },
            });
            for (const [page, key] of __VLS_getVForSourceType((__VLS_ctx.selectedRecordDetail.scraped_payload.pages))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (key),
                    ...{ class: "diagnostic-page-row" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (__VLS_ctx.getPageLabel(key));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (page.page_url);
                if (page.error_message) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                    (page.error_message);
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "diagnostic-page-meta" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: (['status-badge', page.fetched ? 'success' : 'error']) },
                });
                (page.fetched ? '已抓取' : '抓取失败');
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (page.status_code ?? '-');
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
    }
}
/** @type {__VLS_StyleScopedClasses['page-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-tag-row']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['control-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-card']} */ ;
/** @type {__VLS_StyleScopedClasses['onboarding-card']} */ ;
/** @type {__VLS_StyleScopedClasses['onboarding-head']} */ ;
/** @type {__VLS_StyleScopedClasses['onboarding-steps']} */ ;
/** @type {__VLS_StyleScopedClasses['field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['key-field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['core-input-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-helper-row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-button']} */ ;
/** @type {__VLS_StyleScopedClasses['action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['vertical-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-tip-card']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-tip-card']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-tip-head']} */ ;
/** @type {__VLS_StyleScopedClasses['advanced-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['advanced-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['module-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['info']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-storage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-card']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-card']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['module-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['module-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['info']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-card']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-card']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['module-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-card']} */ ;
/** @type {__VLS_StyleScopedClasses['setting-card']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span-card']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['result-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['result-meta-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['busy-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['error-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['success-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-card']} */ ;
/** @type {__VLS_StyleScopedClasses['diagnosis-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['status-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['guide-list']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-list']} */ ;
/** @type {__VLS_StyleScopedClasses['tab-row']} */ ;
/** @type {__VLS_StyleScopedClasses['history-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['history-list-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['result-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['history-count']} */ ;
/** @type {__VLS_StyleScopedClasses['record-list']} */ ;
/** @type {__VLS_StyleScopedClasses['record-item']} */ ;
/** @type {__VLS_StyleScopedClasses['record-main']} */ ;
/** @type {__VLS_StyleScopedClasses['record-main-top']} */ ;
/** @type {__VLS_StyleScopedClasses['record-note-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['record-badge-row']} */ ;
/** @type {__VLS_StyleScopedClasses['mark-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['info-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['history-detail-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['result-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['subtle-card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-customization-card']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['module-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['record-badge-row']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-badges']} */ ;
/** @type {__VLS_StyleScopedClasses['mark-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['info-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-lead-card']} */ ;
/** @type {__VLS_StyleScopedClasses['emphasis-card']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-section-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-section-card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['diagnostic-page-list']} */ ;
/** @type {__VLS_StyleScopedClasses['diagnostic-page-row']} */ ;
/** @type {__VLS_StyleScopedClasses['diagnostic-page-meta']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AnalysisResultTab: AnalysisResultTab,
            ResultTextTab: ResultTextTab,
            StructuredResultTab: StructuredResultTab,
            defaultPromptName: defaultPromptName,
            resultTabLabels: resultTabLabels,
            sampleMatchUrl: sampleMatchUrl,
            formatDate: formatDate,
            getPageLabel: getPageLabel,
            matchUrl: matchUrl,
            anchorStartTime: anchorStartTime,
            anchorEndTime: anchorEndTime,
            aiProvider: aiProvider,
            apiEndpoint: apiEndpoint,
            apiKey: apiKey,
            modelName: modelName,
            fetchCookie: fetchCookie,
            temperature: temperature,
            maxTokens: maxTokens,
            promptName: promptName,
            promptText: promptText,
            europeanCompanies: europeanCompanies,
            asianCompanies: asianCompanies,
            activeResultTab: activeResultTab,
            loadingStructured: loadingStructured,
            loadingPreview: loadingPreview,
            loadingAnalysis: loadingAnalysis,
            loadingRecords: loadingRecords,
            loadingCookieTest: loadingCookieTest,
            loadingFetchSettings: loadingFetchSettings,
            loadingModelConnection: loadingModelConnection,
            errorMessage: errorMessage,
            successMessage: successMessage,
            structuredResult: structuredResult,
            analysisResult: analysisResult,
            cookieTestResult: cookieTestResult,
            historyRecords: historyRecords,
            selectedRecordDetail: selectedRecordDetail,
            selectedRecordPath: selectedRecordPath,
            modelConnectionResult: modelConnectionResult,
            savedFetchSettings: savedFetchSettings,
            recordCustomizationDraft: recordCustomizationDraft,
            canSubmit: canSubmit,
            isBusy: isBusy,
            cookiePoolItems: cookiePoolItems,
            siteLabel: siteLabel,
            analysisSucceeded: analysisSucceeded,
            analysisDisplayText: analysisDisplayText,
            selectedRecordAnalysisText: selectedRecordAnalysisText,
            analysisView: analysisView,
            recordAnalysisView: recordAnalysisView,
            analysisSectionCards: analysisSectionCards,
            recordAnalysisSectionCards: recordAnalysisSectionCards,
            workflowSteps: workflowSteps,
            currentWorkflowStepKey: currentWorkflowStepKey,
            analysisConclusionCards: analysisConclusionCards,
            structuredDisplayText: structuredDisplayText,
            previewDisplayText: previewDisplayText,
            selectedRecordTags: selectedRecordTags,
            structuredMatchupText: structuredMatchupText,
            selectedRecordMatchupText: selectedRecordMatchupText,
            currentMatchTitle: currentMatchTitle,
            getRecordCustomization: getRecordCustomization,
            getDisplayRecordTitle: getDisplayRecordTitle,
            getRecordTags: getRecordTags,
            getWorkflowButtonClass: getWorkflowButtonClass,
            saveDraft: saveDraft,
            setSuccess: setSuccess,
            fillSuggestedStartTime: fillSuggestedStartTime,
            copyText: copyText,
            saveSelectedRecordCustomization: saveSelectedRecordCustomization,
            clearSelectedRecordCustomization: clearSelectedRecordCustomization,
            refillFetchSettingsFromServer: refillFetchSettingsFromServer,
            saveFetchSettings: saveFetchSettings,
            loadStructuredData: loadStructuredData,
            previewAnalysis: previewAnalysis,
            runAnalysis: runAnalysis,
            testCookieConnection: testCookieConnection,
            testModelConnection: testModelConnection,
            loadRecords: loadRecords,
            loadRecordDetail: loadRecordDetail,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
