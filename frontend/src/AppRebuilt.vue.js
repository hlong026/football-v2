import { computed, onMounted, ref, watch } from 'vue';
import AnalysisResultTab from './features/workbench/components/AnalysisResultTab.vue';
import ResultTextTab from './features/workbench/components/ResultTextTab.vue';
import StructuredResultTab from './features/workbench/components/StructuredResultTab.vue';
import { defaultApiEndpoint, defaultAsianCompanies, defaultDoubaoApiEndpoint, defaultDoubaoModelName, defaultEuropeanCompanies, defaultFrequencyPenalty, defaultMaxTokens, defaultModelName, defaultPresencePenalty, defaultPromptName, defaultSite, defaultTemperature, defaultTimeoutSeconds, defaultTopP, formDraftStorageKey, resultTabLabels, sampleMatchUrl, } from './features/workbench/constants';
import { callWorkbenchPost, loadServerAISettings, loadServerAnalysisSettings, loadServerFetchSettings, runWorkbenchStage, saveServerAISettings, saveServerAnalysisSettings, saveServerFetchSettings } from './features/workbench/api';
import { loadStoredFormDraft as readStoredFormDraft, persistFormDraft as writeFormDraft, } from './features/workbench/storage';
import { buildAnalysisSectionCards, buildAnalysisView, formatAnalysisText, formatDate, pretty, prettyDisplayPreferred, splitCompanies, splitCookies, toDatetimeLocalValue, } from './features/workbench/utils';
const providerPresets = {
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
};
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
const topP = ref(stored.topP ?? defaultTopP);
const presencePenalty = ref(stored.presencePenalty ?? defaultPresencePenalty);
const frequencyPenalty = ref(stored.frequencyPenalty ?? defaultFrequencyPenalty);
const timeoutSeconds = ref(stored.timeoutSeconds ?? defaultTimeoutSeconds);
const europeanPromptName = ref(stored.europeanPromptName ?? 'european');
const europeanPromptText = ref(stored.europeanPromptText ?? '');
const asianBasePromptName = ref(stored.asianBasePromptName ?? 'asian_base');
const asianBasePromptText = ref(stored.asianBasePromptText ?? '');
const finalPromptName = ref(stored.finalPromptName ?? defaultPromptName);
const finalPromptText = ref(stored.finalPromptText ?? '');
const europeanCompanies = ref(stored.europeanCompanies ?? defaultEuropeanCompanies);
const asianCompanies = ref(stored.asianCompanies ?? defaultAsianCompanies);
const europeanStageDraftText = ref(stored.europeanStageText ?? '');
const asianBaseStageDraftText = ref(stored.asianBaseStageText ?? '');
const finalStageDraftText = ref(stored.finalStageText ?? '');
const activeResultTab = ref(stored.activeResultTab ?? 'analysis');
const loadingStructured = ref(false);
const loadingPreview = ref(false);
const loadingAnalysis = ref(false);
const loadingCookieTest = ref(false);
const loadingFetchSettings = ref(false);
const loadingAISettings = ref(false);
const loadingAnalysisSettings = ref(false);
const loadingInstitutionSettings = ref(false);
const loadingModelConnection = ref(false);
const loadingStageKey = ref(null);
const errorMessage = ref('');
const successMessage = ref('');
const matchResetNotice = ref(null);
const structuredResult = ref(null);
const previewResult = ref(null);
const analysisResult = ref(null);
const cookieTestResult = ref(null);
const modelConnectionResult = ref(null);
const savedFetchSettings = ref(null);
const savedAISettings = ref(null);
const savedAnalysisSettings = ref(null);
const modelSettingsSavedAt = ref(stored.modelSettingsSavedAt ?? '');
const analysisSettingsSavedAt = ref(stored.analysisSettingsSavedAt ?? '');
const institutionSettingsSavedAt = ref(stored.institutionSettingsSavedAt ?? '');
const fetchSettingsSavedAt = ref(stored.fetchSettingsSavedAt ?? '');
const coreInputExpanded = ref(true);
const fetchSettingsExpanded = ref(true);
const modelSettingsExpanded = ref(true);
const analysisSettingsExpanded = ref(true);
onMounted(() => {
    void loadSavedFetchSettingsFromServer();
    void loadSavedAISettingsFromServer();
    void loadSavedAnalysisSettingsFromServer();
});
watch(aiProvider, (provider, previousProvider) => {
    const preset = providerPresets[provider];
    const knownEndpoints = Object.values(providerPresets).map((item) => item.apiEndpoint);
    const knownModels = Object.values(providerPresets).map((item) => item.modelName);
    const shouldForceReplace = previousProvider !== undefined && previousProvider !== provider;
    if (shouldForceReplace || !apiEndpoint.value.trim() || knownEndpoints.includes(apiEndpoint.value.trim())) {
        apiEndpoint.value = preset.apiEndpoint;
    }
    if (shouldForceReplace || !modelName.value.trim() || knownModels.includes(modelName.value.trim())) {
        modelName.value = preset.modelName;
    }
}, { immediate: true });
watch([site, matchUrl, anchorStartTime, anchorEndTime, aiProvider, apiEndpoint, apiKey, modelName, fetchCookie, temperature, maxTokens, topP, presencePenalty, frequencyPenalty, timeoutSeconds, europeanPromptName, europeanPromptText, asianBasePromptName, asianBasePromptText, finalPromptName, finalPromptText, europeanCompanies, asianCompanies, europeanStageDraftText, asianBaseStageDraftText, finalStageDraftText, activeResultTab], saveDraft);
watch([matchUrl, anchorStartTime, anchorEndTime, europeanCompanies, asianCompanies], (currentValues, previousValues) => {
    if (!previousValues) {
        return;
    }
    const hasChanged = currentValues.some((value, index) => value !== previousValues[index]);
    if (!hasChanged) {
        return;
    }
    const hadExecutionState = hasMatchExecutionState();
    if (hadExecutionState) {
        resetMatchExecutionState();
        activeResultTab.value = 'structured';
        setSuccess('比赛上下文已更新，右侧结果已清空。请重新执行抓取诊断、结构化解析和三阶段分析。');
    }
    if (hadExecutionState || resultResetPending.value) {
        matchResetNotice.value = {
            matchUrl: matchUrl.value.trim(),
            anchorStartTime: anchorStartTime.value,
            anchorEndTime: anchorEndTime.value,
            europeanCompanyCount: selectedEuropeanCompanyCount.value,
            asianCompanyCount: selectedAsianCompanyCount.value,
            resetAt: new Date().toISOString(),
        };
    }
    saveDraft();
});
const canSubmit = computed(() => Boolean(matchUrl.value.trim() && anchorStartTime.value));
const isBusy = computed(() => loadingStructured.value || loadingPreview.value || loadingAnalysis.value || loadingCookieTest.value || loadingModelConnection.value || loadingInstitutionSettings.value || Boolean(loadingStageKey.value));
const cookiePoolItems = computed(() => splitCookies(fetchCookie.value));
const currentProviderPreset = computed(() => providerPresets[aiProvider.value]);
const siteLabel = computed(() => (site.value === 'okooo' ? '澳客网' : site.value));
const selectedEuropeanCompanyCount = computed(() => splitCompanies(europeanCompanies.value).length);
const selectedAsianCompanyCount = computed(() => splitCompanies(asianCompanies.value).length);
const diagnosticCompleted = computed(() => Boolean(cookieTestResult.value));
const resultResetPending = computed(() => Boolean(matchResetNotice.value) && !hasMatchExecutionState());
const resultResetOverviewCards = computed(() => {
    if (!matchResetNotice.value) {
        return [];
    }
    return [
        { label: '比赛链接', value: cutDisplayText(matchResetNotice.value.matchUrl || '-', 42), fullValue: matchResetNotice.value.matchUrl || '-' },
        { label: '时间范围', value: buildResetWindowText(matchResetNotice.value.anchorStartTime, matchResetNotice.value.anchorEndTime) },
        { label: '欧赔机构', value: `${matchResetNotice.value.europeanCompanyCount} 家` },
        { label: '亚盘机构', value: `${matchResetNotice.value.asianCompanyCount} 家` },
    ];
});
const analysisSucceeded = computed(() => Boolean(analysisResult.value?.final_result?.success && finalStageDraftText.value.trim()));
const stagePreviewCount = computed(() => Object.keys(previewResult.value?.stages || {}).length);
const europeanStageText = computed(() => formatAnalysisText(europeanStageDraftText.value || analysisResult.value?.european_result?.raw_response || analysisResult.value?.european_result?.error_message || '暂无欧赔分析结果'));
const asianBaseStageText = computed(() => formatAnalysisText(asianBaseStageDraftText.value || analysisResult.value?.asian_base_result?.raw_response || analysisResult.value?.asian_base_result?.error_message || '暂无亚盘基础分析结果'));
const finalStageText = computed(() => formatAnalysisText(finalStageDraftText.value || analysisResult.value?.final_result?.raw_response || analysisResult.value?.raw_response || analysisResult.value?.final_result?.error_message || analysisResult.value?.error_message || '暂无最终综合分析结果'));
const analysisDisplayText = computed(() => {
    if (!analysisResult.value && !europeanStageDraftText.value.trim() && !asianBaseStageDraftText.value.trim() && !finalStageDraftText.value.trim()) {
        return '还没有分步分析结果。欧赔分析和亚盘基础分析可以任选先执行；最终综合分析需要先有亚盘基础结论。';
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
    ].join('\n');
});
const analysisView = computed(() => analysisSucceeded.value
    ? buildAnalysisView(finalStageText.value, '等待最终综合分析', '完成最终综合分析后，这里会提炼本场结论。')
    : buildAnalysisView('还没有最终综合分析结果', '等待最终综合分析', '完成最终综合分析后，这里会提炼本场结论。'));
const analysisSectionCards = computed(() => analysisSucceeded.value ? buildAnalysisSectionCards(analysisView.value) : []);
const splitWorkflowSteps = computed(() => {
    const inputDone = canSubmit.value;
    const diagnosticDone = diagnosticCompleted.value;
    const structuredDone = Boolean(structuredResult.value);
    const europeanDone = Boolean(europeanStageDraftText.value.trim());
    const asianBaseDone = Boolean(asianBaseStageDraftText.value.trim());
    const finalDone = Boolean(finalStageDraftText.value.trim());
    const currentKey = !inputDone
        ? 'input'
        : !diagnosticDone
            ? 'diagnostic'
            : !structuredDone
                ? 'structured'
                : !asianBaseDone
                    ? 'asian_base'
                    : !finalDone
                        ? 'final'
                        : !europeanDone
                            ? 'european'
                            : 'final';
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
            description: '欧赔分析只基于欧赔清洗数据输出阶段性结论，可与亚盘分析独立执行。',
            state: europeanDone ? 'done' : currentKey === 'european' ? 'current' : 'idle',
        },
        {
            key: 'asian_base',
            label: '亚盘基础分析',
            statusLabel: asianBaseDone ? '已完成' : currentKey === 'asian_base' ? '当前步骤' : '待执行',
            description: '亚盘基础分析只基于亚盘清洗数据输出基础判断，不依赖欧赔结论。',
            state: asianBaseDone ? 'done' : currentKey === 'asian_base' ? 'current' : 'idle',
        },
        {
            key: 'final',
            label: '最终综合分析',
            statusLabel: finalDone ? '已完成' : currentKey === 'final' ? '当前步骤' : '待执行',
            description: '最终综合分析基于亚盘基础结论和亚盘清洗数据，得到最终业务判断。',
            state: finalDone ? 'done' : currentKey === 'final' ? 'current' : 'idle',
        },
    ];
});
const currentWorkflowStepKey = computed(() => splitWorkflowSteps.value.find((item) => item.state === 'current')?.key ?? 'input');
const heroWorkflowSteps = computed(() => splitWorkflowSteps.value.filter((item) => item.key !== 'preview'));
const analysisConclusionCards = computed(() => {
    const tendency = getAnalysisTendencyText();
    const comparison = getAnalysisComparisonCardData();
    const risk = getAnalysisRiskText();
    const advice = getAnalysisAdviceCardData();
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
    ];
});
const structuredDisplayText = computed(() => structuredResult.value ? pretty(structuredResult.value) : '还没有结构化结果，点击“结构化解析”后这里会显示数据。');
const previewDisplayText = computed(() => previewResult.value ? prettyDisplayPreferred(previewResult.value) : '还没有模型输入预览，点击“分析输入预览”后这里会显示 system prompt、user prompt 和结构化入参。');
const analysisStageCards = computed(() => {
    const hasStructured = Boolean(structuredResult.value);
    const europeanSummary = analysisResult.value?.european_result?.summary;
    const asianSummary = analysisResult.value?.asian_base_result?.summary;
    const finalSummary = analysisResult.value?.final_result?.summary;
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
            runDisabled: !hasStructured || Boolean(loadingStageKey.value),
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
            runDisabled: !hasStructured || !asianBaseStageDraftText.value.trim() || Boolean(loadingStageKey.value),
            runLoading: loadingStageKey.value === 'final',
            fields: [
                { label: '最终方向', value: finalSummary?.final_direction || '-' },
                { label: '亚盘链路一致性', value: finalSummary?.cross_market_consensus || '待确认' },
                { label: '风险等级', value: finalSummary?.risk_level || '-' },
            ],
        },
    ];
});
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
const currentMatchTitle = computed(() => {
    if (structuredMatchupText.value !== '-') {
        return structuredMatchupText.value;
    }
    return structuredResult.value?.match_key || '-';
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
function normalizeComparisonLabel(label) {
    if (/主/.test(label)) {
        return '主方向';
    }
    if (/客/.test(label)) {
        return '客方向';
    }
    if (/平/.test(label)) {
        return '平局方向';
    }
    return label.trim() || '方向';
}
function extractComparisonSides(text) {
    const labeledMatches = [...text.matchAll(/(主胜概率|主队概率|主胜|主队|客胜概率|客队概率|客胜|客队|平局概率|平局)\s*[：:]?\s*(\d+(?:\.\d+)?)%/g)];
    if (labeledMatches.length >= 2) {
        return labeledMatches.slice(0, 2).map((match) => ({
            label: normalizeComparisonLabel(match[1] || ''),
            value: `${match[2]}%`,
        }));
    }
    const plainPercentages = [...text.matchAll(/(\d+(?:\.\d+)?)%/g)];
    if (plainPercentages.length >= 2) {
        return [
            { label: '方向A', value: `${plainPercentages[0]?.[1] || '-'}%` },
            { label: '方向B', value: `${plainPercentages[1]?.[1] || '-'}%` },
        ];
    }
    return null;
}
function getAnalysisComparisonCardData() {
    const comparisonText = getAnalysisComparisonText();
    const comparisonSides = extractComparisonSides(comparisonText);
    if (!comparisonSides || comparisonSides.length < 2) {
        return {
            summary: cutDisplayText(comparisonText, 36),
            fullValue: comparisonText,
            leftLabel: '当前方向',
            leftValue: analysisView.value.directionTag,
            rightLabel: '核心对比',
            rightValue: cutDisplayText(comparisonText, 18),
        };
    }
    const [leftSide, rightSide] = comparisonSides;
    const summary = `${leftSide.label} vs ${rightSide.label}`;
    return {
        summary,
        fullValue: `${summary}。\n${comparisonText}`,
        leftLabel: leftSide.label,
        leftValue: leftSide.value,
        rightLabel: rightSide.label,
        rightValue: rightSide.value,
    };
}
function getAnalysisComparisonText() {
    return findAnalysisSignalByPattern(/(\d+(?:\.\d+)?%|概率|胜率|对比|vs|VS|高于|低于|领先|占优|更高|更低|优势)/, getSectionCardValue(analysisSectionCards.value, 'basis', analysisView.value.leadFull || analysisView.value.headlineFull), /(风险|建议|策略|操作|警惕|注意)/);
}
function getAnalysisRiskText() {
    return findAnalysisSignalByPattern(/(风险|警惕|防范|注意|不确定|隐患|波动|诱盘|反转|保守|谨慎)/, getSectionCardValue(analysisSectionCards.value, 'risk', analysisView.value.leadFull || analysisView.value.headlineFull));
}
function getAnalysisRiskLevel() {
    const riskText = `${getAnalysisRiskText()}\n${getAnalysisAdviceText()}`;
    if (/(回避|不宜|高风险|风险高|风险较高|谨慎参与|不建议|诱盘|反转|波动大|观望为主|先别下手)/.test(riskText)) {
        return '高风险';
    }
    if (/(谨慎|注意|警惕|防范|保守|控制仓位|中等风险|有分歧|需防|留意)/.test(riskText)) {
        return '中风险';
    }
    if (/(低风险|可跟进|相对稳|较稳|可执行|明确支持)/.test(riskText)) {
        return '低风险';
    }
    return '中风险';
}
function getAnalysisAdviceText() {
    return findAnalysisSignalByPattern(/(建议|策略|操作|可考虑|推荐|方案|执行|观望|等待|不宜|优先|跟进)/, getSectionCardValue(analysisSectionCards.value, 'advice', analysisView.value.leadFull || analysisView.value.headlineFull));
}
function getAnalysisAdviceCardData() {
    const adviceText = getAnalysisAdviceText().replace(/^(操作建议|建议|推荐|策略)[：:\s]*/, '').trim();
    const riskLevel = getAnalysisRiskLevel();
    return {
        action: cutDisplayText(adviceText || '继续观察临场变化', 28),
        riskLevel,
        fullValue: `${adviceText || '继续观察临场变化'}\n风险等级：${riskLevel}\n\n${getAnalysisRiskText()}`,
    };
}
function cutDisplayText(value, maxLength) {
    return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}
function formatResetTimeValue(value) {
    return value ? value.replace('T', ' ') : '未设置';
}
function buildResetWindowText(start, end) {
    return `${formatResetTimeValue(start)} -> ${formatResetTimeValue(end)}`;
}
function getStageStatusText(result, draftText = '') {
    if (draftText.trim()) {
        return result?.success === false ? '已编辑，待重跑' : result?.success ? '已执行，可编辑' : '已编辑';
    }
    if (!result)
        return '未执行';
    return result.success ? '成功' : '失败';
}
function getStageStatusTone(result, draftText = '') {
    if (draftText.trim()) {
        return result?.success === false ? 'warning' : 'success';
    }
    if (!result)
        return 'info';
    return result.success ? 'success' : 'error';
}
function getWorkflowButtonClass(stepKey) {
    const analysisStageKeys = ['european', 'asian_base', 'final'];
    return {
        'step-current-button': currentWorkflowStepKey.value === stepKey || (stepKey === 'analysis' && analysisStageKeys.includes(currentWorkflowStepKey.value)),
    };
}
function applyServerCookies(result, forceReplace = false) {
    savedFetchSettings.value = result;
    if ((forceReplace || !fetchCookie.value.trim()) && result.cookies.length) {
        fetchCookie.value = result.cookies.join('\n');
        saveDraft();
    }
}
function applyServerAISettings(result, forceReplace = false) {
    savedAISettings.value = result;
    if (forceReplace || !modelName.value.trim()) {
        if (result.provider === 'deepseek' || result.provider === 'openai' || result.provider === 'doubao') {
            aiProvider.value = result.provider;
        }
        apiEndpoint.value = result.api_endpoint || apiEndpoint.value;
        apiKey.value = result.api_key || '';
        modelName.value = result.model_name || modelName.value;
        temperature.value = result.temperature === null || result.temperature === undefined ? temperature.value : String(result.temperature);
        maxTokens.value = result.max_tokens === null || result.max_tokens === undefined ? maxTokens.value : String(result.max_tokens);
        topP.value = result.top_p === null || result.top_p === undefined ? topP.value : String(result.top_p);
        presencePenalty.value = result.presence_penalty === null || result.presence_penalty === undefined ? presencePenalty.value : String(result.presence_penalty);
        frequencyPenalty.value = result.frequency_penalty === null || result.frequency_penalty === undefined ? frequencyPenalty.value : String(result.frequency_penalty);
        timeoutSeconds.value = result.timeout_seconds === null || result.timeout_seconds === undefined ? timeoutSeconds.value : String(result.timeout_seconds);
        saveDraft();
    }
}
function applyServerAnalysisSettings(result, forceReplace = false) {
    savedAnalysisSettings.value = result;
    const shouldApply = forceReplace || (!europeanCompanies.value.trim() && !asianCompanies.value.trim() && !europeanPromptText.value.trim() && !asianBasePromptText.value.trim() && !finalPromptText.value.trim());
    if (!shouldApply) {
        return;
    }
    if (result.bookmaker_selection?.european?.length) {
        europeanCompanies.value = result.bookmaker_selection.european.join(',');
    }
    if (result.bookmaker_selection?.asian?.length) {
        asianCompanies.value = result.bookmaker_selection.asian.join(',');
    }
    europeanPromptName.value = result.prompt_set?.european?.prompt_name || europeanPromptName.value;
    europeanPromptText.value = result.prompt_set?.european?.prompt_text || '';
    asianBasePromptName.value = result.prompt_set?.asian_base?.prompt_name || asianBasePromptName.value;
    asianBasePromptText.value = result.prompt_set?.asian_base?.prompt_text || '';
    finalPromptName.value = result.prompt_set?.final?.prompt_name || finalPromptName.value;
    finalPromptText.value = result.prompt_set?.final?.prompt_text || '';
    saveDraft();
}
function toggleCoreInputCard() {
    coreInputExpanded.value = !coreInputExpanded.value;
}
function updateLocalSavedAt(kind, value = new Date().toISOString()) {
    if (kind === 'fetch') {
        fetchSettingsSavedAt.value = value;
    }
    if (kind === 'model') {
        modelSettingsSavedAt.value = value;
    }
    if (kind === 'analysis') {
        analysisSettingsSavedAt.value = value;
    }
    if (kind === 'institution') {
        institutionSettingsSavedAt.value = value;
    }
}
function toggleSettingsCard(kind) {
    if (kind === 'fetch') {
        fetchSettingsExpanded.value = !fetchSettingsExpanded.value;
        return;
    }
    if (kind === 'model') {
        modelSettingsExpanded.value = !modelSettingsExpanded.value;
        return;
    }
    analysisSettingsExpanded.value = !analysisSettingsExpanded.value;
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
function hasMatchExecutionState() {
    return Boolean(cookieTestResult.value
        || structuredResult.value
        || previewResult.value
        || analysisResult.value
        || europeanStageDraftText.value.trim()
        || asianBaseStageDraftText.value.trim()
        || finalStageDraftText.value.trim());
}
function resetMatchExecutionState() {
    cookieTestResult.value = null;
    structuredResult.value = null;
    previewResult.value = null;
    analysisResult.value = null;
    europeanStageDraftText.value = '';
    asianBaseStageDraftText.value = '';
    finalStageDraftText.value = '';
}
function getUpstreamStageTexts(stage) {
    return {
        european: null,
        asian_base: stage === 'final' || stage === undefined ? asianBaseStageDraftText.value : null,
    };
}
function applyStageRunResult(result) {
    const current = analysisResult.value || {};
    analysisResult.value = {
        ...current,
        request_preview: result.request_preview ?? current.request_preview,
        european_result: result.stage === 'european' ? result.stage_result : current.european_result,
        asian_base_result: result.stage === 'asian_base' ? result.stage_result : current.asian_base_result,
        final_result: result.stage === 'final' ? result.stage_result : current.final_result,
        raw_response: result.stage === 'final' ? result.stage_result.raw_response ?? null : current.raw_response,
        success: result.stage === 'final' ? Boolean(result.stage_result.success) : current.success,
        error_message: result.error_message ?? null,
    };
    if (result.stage === 'european') {
        europeanStageDraftText.value = result.stage_result.raw_response || '';
    }
    if (result.stage === 'asian_base') {
        asianBaseStageDraftText.value = result.stage_result.raw_response || '';
        finalStageDraftText.value = '';
        analysisResult.value.final_result = undefined;
    }
    if (result.stage === 'final') {
        finalStageDraftText.value = result.stage_result.raw_response || '';
    }
    previewResult.value = result.request_preview ?? previewResult.value;
    activeResultTab.value = 'analysis';
    saveDraft();
}
function updateStageDraft(stage, value) {
    if (stage === 'european') {
        europeanStageDraftText.value = value;
    }
    if (stage === 'asian_base') {
        asianBaseStageDraftText.value = value;
        finalStageDraftText.value = '';
        if (analysisResult.value) {
            analysisResult.value.final_result = undefined;
        }
    }
    if (stage === 'final') {
        finalStageDraftText.value = value;
    }
    saveDraft();
}
async function runStage(stage) {
    if (!canSubmit.value)
        return setError('请先填写比赛链接和起始时间。');
    if (!structuredResult.value)
        return setError('请先完成结构化解析，再执行分步分析。');
    loadingStageKey.value = stage;
    try {
        const result = await runWorkbenchStage(stage, {
            ...buildPayload(),
            upstreamStageTexts: getUpstreamStageTexts(stage),
        });
        applyStageRunResult(result);
        result.stage_result?.success
            ? setSuccess(`${result.stage === 'european' ? '欧赔分析' : result.stage === 'asian_base' ? '亚盘基础分析' : '最终综合分析'}已完成。`)
            : setError(result.error_message || result.stage_result?.error_message || '当前阶段执行失败。');
    }
    catch (e) {
        setError(getErrorMessage(e));
    }
    finally {
        loadingStageKey.value = null;
    }
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
async function loadSavedAISettingsFromServer() {
    loadingAISettings.value = true;
    try {
        const result = await loadServerAISettings();
        applyServerAISettings(result);
    }
    catch {
    }
    finally {
        loadingAISettings.value = false;
    }
}
async function loadSavedAnalysisSettingsFromServer() {
    loadingAnalysisSettings.value = true;
    try {
        const result = await loadServerAnalysisSettings();
        applyServerAnalysisSettings(result);
    }
    catch {
    }
    finally {
        loadingAnalysisSettings.value = false;
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
    updateLocalSavedAt('fetch');
    saveDraft();
    loadingFetchSettings.value = true;
    try {
        const result = await saveServerFetchSettings(fetchCookie.value);
        savedFetchSettings.value = result;
        if (result.updated_at) {
            updateLocalSavedAt('fetch', result.updated_at);
            saveDraft();
        }
        setSuccess(result.cookies.length ? '抓取设置已保存到浏览器本地和后端本地。后续请求即使前端不再手动传入，后端也可以复用。' : '已清空后端已保存的 Cookie 设置。');
    }
    catch (e) {
        setError(getErrorMessage(e));
    }
    finally {
        loadingFetchSettings.value = false;
    }
}
async function saveAISettings() {
    updateLocalSavedAt('model');
    saveDraft();
    loadingAISettings.value = true;
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
        });
        savedAISettings.value = result;
        if (result.updated_at) {
            updateLocalSavedAt('model', result.updated_at);
            saveDraft();
        }
        setSuccess('模型设置已保存到浏览器本地和后端本地。');
    }
    catch (e) {
        setError(getErrorMessage(e));
    }
    finally {
        loadingAISettings.value = false;
    }
}
async function saveAnalysisSettings() {
    updateLocalSavedAt('analysis');
    saveDraft();
    loadingAnalysisSettings.value = true;
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
        });
        savedAnalysisSettings.value = result;
        if (result.updated_at) {
            updateLocalSavedAt('analysis', result.updated_at);
            saveDraft();
        }
        setSuccess('分析口径已保存到浏览器本地和后端本地。');
    }
    catch (e) {
        setError(getErrorMessage(e));
    }
    finally {
        loadingAnalysisSettings.value = false;
    }
}
async function saveInstitutionSettings() {
    updateLocalSavedAt('institution');
    saveDraft();
    loadingInstitutionSettings.value = true;
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
        });
        savedAnalysisSettings.value = result;
        if (result.updated_at) {
            updateLocalSavedAt('institution', result.updated_at);
            saveDraft();
        }
        setSuccess(`机构范围已生效：欧赔 ${selectedEuropeanCompanyCount.value} 家，亚盘 ${selectedAsianCompanyCount.value} 家。后续二次清洗和正式分析都会按这组机构执行。`);
    }
    catch (e) {
        setError(getErrorMessage(e));
    }
    finally {
        loadingInstitutionSettings.value = false;
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
    };
}
async function loadStructuredData() {
    if (!canSubmit.value)
        return setError('请先填写比赛链接和起始时间。');
    loadingStructured.value = true;
    try {
        structuredResult.value = await callWorkbenchPost('/matches/structured', buildPayload());
        previewResult.value = null;
        analysisResult.value = null;
        europeanStageDraftText.value = '';
        asianBaseStageDraftText.value = '';
        finalStageDraftText.value = '';
        activeResultTab.value = 'structured';
        saveDraft();
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
    ...{ class: "hero-main" },
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-flow-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-flow-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hero-flow-track" },
});
for (const [step, index] of __VLS_getVForSourceType((__VLS_ctx.heroWorkflowSteps))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (step.key),
        ...{ class: (['hero-flow-step', step.state]) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-flow-dot" },
    });
    (index + 1);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-flow-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (step.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (step.statusLabel);
}
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
    ...{ class: (['core-input-shell', { 'step-current-shell': __VLS_ctx.currentWorkflowStepKey === 'input', expanded: __VLS_ctx.coreInputExpanded }]) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.toggleCoreInputCard) },
    type: "button",
    ...{ class: "settings-card-head settings-card-toggle panel-card-toggle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "settings-card-toggle-text" },
});
(__VLS_ctx.coreInputExpanded ? '收起' : '展开');
if (__VLS_ctx.coreInputExpanded) {
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
                if (!(__VLS_ctx.coreInputExpanded))
                    return;
                __VLS_ctx.saveDraft();
                __VLS_ctx.setSuccess('当前设置已保存到浏览器本地。');
            } },
        ...{ class: "secondary helper-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "module-status-card info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
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
        ...{ class: (['secondary', __VLS_ctx.getWorkflowButtonClass('structured')]) },
        disabled: (__VLS_ctx.loadingStructured || !__VLS_ctx.canSubmit || !__VLS_ctx.diagnosticCompleted),
    });
    (__VLS_ctx.loadingStructured ? '第3步 解析中...' : '第3步 结构化解析');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.previewAnalysis) },
        ...{ class: "secondary" },
        disabled: (__VLS_ctx.loadingPreview || !__VLS_ctx.canSubmit),
    });
    (__VLS_ctx.loadingPreview ? '预览生成中...' : '可选：分析输入预览');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.coreInputExpanded))
                    return;
                __VLS_ctx.runStage('european');
            } },
        ...{ class: (['secondary', __VLS_ctx.getWorkflowButtonClass('european')]) },
        disabled: (__VLS_ctx.loadingStageKey === 'european' || !__VLS_ctx.canSubmit || !__VLS_ctx.structuredResult),
    });
    (__VLS_ctx.loadingStageKey === 'european' ? '第4步 执行中...' : '第4步 欧赔分析');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.coreInputExpanded))
                    return;
                __VLS_ctx.runStage('asian_base');
            } },
        ...{ class: (['secondary', __VLS_ctx.getWorkflowButtonClass('asian_base')]) },
        disabled: (__VLS_ctx.loadingStageKey === 'asian_base' || !__VLS_ctx.canSubmit || !__VLS_ctx.structuredResult),
    });
    (__VLS_ctx.loadingStageKey === 'asian_base' ? '第5步 执行中...' : '第5步 亚盘基础分析');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.coreInputExpanded))
                    return;
                __VLS_ctx.runStage('final');
            } },
        ...{ class: (['secondary', __VLS_ctx.getWorkflowButtonClass('final')]) },
        disabled: (__VLS_ctx.loadingStageKey === 'final' || !__VLS_ctx.canSubmit || !__VLS_ctx.structuredResult || !__VLS_ctx.asianBaseStageDraftText.trim()),
    });
    (__VLS_ctx.loadingStageKey === 'final' ? '第6步 执行中...' : '第6步 最终综合分析');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-tip-card compact-tip-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-tip-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.sampleMatchUrl);
}
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
    ...{ class: (['subtle-card', 'setting-card', { expanded: __VLS_ctx.fetchSettingsExpanded }]) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.toggleSettingsCard('fetch');
        } },
    type: "button",
    ...{ class: "settings-card-head settings-card-toggle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "settings-card-toggle-text" },
});
(__VLS_ctx.fetchSettingsExpanded ? '收起' : '展开');
if (__VLS_ctx.fetchSettingsExpanded) {
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "module-status-grid" },
    });
    if (__VLS_ctx.fetchSettingsSavedAt) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "module-status-card success" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDate(__VLS_ctx.fetchSettingsSavedAt));
    }
    if (__VLS_ctx.savedFetchSettings?.updated_at) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "module-status-card info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDate(__VLS_ctx.savedFetchSettings.updated_at));
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: (['subtle-card', 'setting-card', { expanded: __VLS_ctx.modelSettingsExpanded }]) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.toggleSettingsCard('model');
        } },
    type: "button",
    ...{ class: "settings-card-head settings-card-toggle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "settings-card-toggle-text" },
});
(__VLS_ctx.modelSettingsExpanded ? '收起' : '展开');
if (__VLS_ctx.modelSettingsExpanded) {
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
        value: "doubao",
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "0",
        max: "1",
        step: "0.1",
    });
    (__VLS_ctx.topP);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "-2",
        max: "2",
        step: "0.1",
    });
    (__VLS_ctx.presencePenalty);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "-2",
        max: "2",
        step: "0.1",
    });
    (__VLS_ctx.frequencyPenalty);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "number",
        min: "5",
        step: "1",
    });
    (__VLS_ctx.timeoutSeconds);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "module-status-card info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.currentProviderPreset.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (__VLS_ctx.currentProviderPreset.helperText);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.currentProviderPreset.apiEndpoint);
    (__VLS_ctx.currentProviderPreset.modelName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "module-action-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveAISettings) },
        ...{ class: "secondary small-button" },
        disabled: (__VLS_ctx.loadingAISettings),
    });
    (__VLS_ctx.loadingAISettings ? '保存中...' : '保存模型设置');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.testModelConnection) },
        ...{ class: "secondary small-button" },
        disabled: (__VLS_ctx.loadingModelConnection || !__VLS_ctx.canSubmit),
    });
    (__VLS_ctx.loadingModelConnection ? '测试中...' : '测试模型连接');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "module-status-grid" },
    });
    if (__VLS_ctx.modelSettingsSavedAt) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "module-status-card success" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDate(__VLS_ctx.modelSettingsSavedAt));
    }
    if (__VLS_ctx.savedAISettings?.updated_at) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "module-status-card info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDate(__VLS_ctx.savedAISettings.updated_at));
    }
    if (__VLS_ctx.modelConnectionResult) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: (['module-status-card', __VLS_ctx.modelConnectionResult.success ? 'success' : 'error']) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.modelConnectionResult.success ? '模型连接正常' : '模型连接异常');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.modelConnectionResult.message);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: (['subtle-card', 'setting-card', 'full-span-card', { expanded: __VLS_ctx.analysisSettingsExpanded }]) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.toggleSettingsCard('analysis');
        } },
    type: "button",
    ...{ class: "settings-card-head settings-card-toggle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "settings-card-toggle-text" },
});
(__VLS_ctx.analysisSettingsExpanded ? '收起' : '展开');
if (__VLS_ctx.analysisSettingsExpanded) {
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
    if (__VLS_ctx.institutionSettingsSavedAt) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "module-status-card success full-span" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.selectedEuropeanCompanyCount);
        (__VLS_ctx.selectedAsianCompanyCount);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.formatDate(__VLS_ctx.institutionSettingsSavedAt));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "full-span" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (__VLS_ctx.europeanPromptName),
        type: "text",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "full-span" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.europeanPromptText),
        rows: "4",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "full-span" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (__VLS_ctx.asianBasePromptName),
        type: "text",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "full-span" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.asianBasePromptText),
        rows: "4",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "full-span" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (__VLS_ctx.finalPromptName),
        type: "text",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "full-span" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.finalPromptText),
        rows: "6",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "module-action-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveInstitutionSettings) },
        ...{ class: "secondary small-button" },
        disabled: (__VLS_ctx.loadingInstitutionSettings),
    });
    (__VLS_ctx.loadingInstitutionSettings ? '保存中...' : '保存机构范围');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveAnalysisSettings) },
        ...{ class: "secondary small-button" },
        disabled: (__VLS_ctx.loadingAnalysisSettings),
    });
    (__VLS_ctx.loadingAnalysisSettings ? '保存中...' : '保存分析口径');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "module-status-grid" },
    });
    if (__VLS_ctx.analysisSettingsSavedAt) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "module-status-card success" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDate(__VLS_ctx.analysisSettingsSavedAt));
    }
    if (__VLS_ctx.savedAnalysisSettings?.updated_at) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "module-status-card info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.formatDate(__VLS_ctx.savedAnalysisSettings.updated_at));
    }
}
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
if (__VLS_ctx.resultResetPending && __VLS_ctx.matchResetNotice) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "module-status-card info reset-empty-state-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "summary-grid reset-empty-state-grid" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.resultResetOverviewCards))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.label),
            ...{ class: "summary-card result-summary-card reset-empty-state-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
            title: (item.fullValue || item.value),
        });
        (item.value);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: "guide-list compact-list reset-empty-state-list" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    (__VLS_ctx.formatDate(__VLS_ctx.matchResetNotice.resetAt));
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
        title: "分阶段送模预览",
        copyLabel: "复制预览",
        cardTitle: "最终送模数据预览",
        cardDescription: "用于确认欧赔分析、亚盘基础分析和最终综合分析三阶段的 prompt 与结构化入参。",
        displayText: (__VLS_ctx.previewDisplayText),
        overviewCards: ([{ label: '阶段数量', value: `${__VLS_ctx.stagePreviewCount}` }, { label: '最终提示词', value: __VLS_ctx.finalPromptName || __VLS_ctx.defaultPromptName }, { label: '当前模型', value: __VLS_ctx.modelName || '-' }, { label: 'Cookie 数量', value: `${__VLS_ctx.cookiePoolItems.length}` }]),
        onCopy: (() => __VLS_ctx.copyText(__VLS_ctx.previewDisplayText, '分阶段送模预览已复制。')),
    }));
    const __VLS_4 = __VLS_3({
        title: "分阶段送模预览",
        copyLabel: "复制预览",
        cardTitle: "最终送模数据预览",
        cardDescription: "用于确认欧赔分析、亚盘基础分析和最终综合分析三阶段的 prompt 与结构化入参。",
        displayText: (__VLS_ctx.previewDisplayText),
        overviewCards: ([{ label: '阶段数量', value: `${__VLS_ctx.stagePreviewCount}` }, { label: '最终提示词', value: __VLS_ctx.finalPromptName || __VLS_ctx.defaultPromptName }, { label: '当前模型', value: __VLS_ctx.modelName || '-' }, { label: 'Cookie 数量', value: `${__VLS_ctx.cookiePoolItems.length}` }]),
        onCopy: (() => __VLS_ctx.copyText(__VLS_ctx.previewDisplayText, '分阶段送模预览已复制。')),
    }, ...__VLS_functionalComponentArgsRest(__VLS_3));
}
else if (__VLS_ctx.activeResultTab === 'analysis') {
    /** @type {[typeof AnalysisResultTab, ]} */ ;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent(AnalysisResultTab, new AnalysisResultTab({
        overviewCards: ([{ label: '模型', value: __VLS_ctx.modelName || '-' }, { label: '执行状态', value: __VLS_ctx.analysisSucceeded ? '最终综合分析已完成' : __VLS_ctx.analysisResult || __VLS_ctx.europeanStageDraftText || __VLS_ctx.asianBaseStageDraftText || __VLS_ctx.finalStageDraftText ? '分步执行中' : '未执行' }, { label: '欧赔阶段', value: __VLS_ctx.europeanStageDraftText.trim() ? '已就绪' : '未执行' }, { label: '亚盘基础阶段', value: __VLS_ctx.asianBaseStageDraftText.trim() ? '已就绪' : '未执行' }, { label: '最终综合阶段', value: __VLS_ctx.finalStageDraftText.trim() ? '已就绪' : '未执行' }]),
        conclusionCards: (__VLS_ctx.analysisConclusionCards),
        analysisView: (__VLS_ctx.analysisView),
        stageCards: (__VLS_ctx.analysisStageCards),
        onCopy: (() => __VLS_ctx.copyText(__VLS_ctx.finalStageText, '最终综合分析结论已复制。')),
        onRunStage: (__VLS_ctx.runStage),
        onUpdateStageDraft: (__VLS_ctx.updateStageDraft),
    }));
    const __VLS_7 = __VLS_6({
        overviewCards: ([{ label: '模型', value: __VLS_ctx.modelName || '-' }, { label: '执行状态', value: __VLS_ctx.analysisSucceeded ? '最终综合分析已完成' : __VLS_ctx.analysisResult || __VLS_ctx.europeanStageDraftText || __VLS_ctx.asianBaseStageDraftText || __VLS_ctx.finalStageDraftText ? '分步执行中' : '未执行' }, { label: '欧赔阶段', value: __VLS_ctx.europeanStageDraftText.trim() ? '已就绪' : '未执行' }, { label: '亚盘基础阶段', value: __VLS_ctx.asianBaseStageDraftText.trim() ? '已就绪' : '未执行' }, { label: '最终综合阶段', value: __VLS_ctx.finalStageDraftText.trim() ? '已就绪' : '未执行' }]),
        conclusionCards: (__VLS_ctx.analysisConclusionCards),
        analysisView: (__VLS_ctx.analysisView),
        stageCards: (__VLS_ctx.analysisStageCards),
        onCopy: (() => __VLS_ctx.copyText(__VLS_ctx.finalStageText, '最终综合分析结论已复制。')),
        onRunStage: (__VLS_ctx.runStage),
        onUpdateStageDraft: (__VLS_ctx.updateStageDraft),
    }, ...__VLS_functionalComponentArgsRest(__VLS_6));
}
/** @type {__VLS_StyleScopedClasses['page-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['hero']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-main']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-tag-row']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-flow-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-flow-head']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-flow-track']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-flow-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-flow-content']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['control-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['section-head']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-card-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-toggle-text']} */ ;
/** @type {__VLS_StyleScopedClasses['field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['key-field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['core-input-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-helper-row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['helper-button']} */ ;
/** @type {__VLS_StyleScopedClasses['module-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['info']} */ ;
/** @type {__VLS_StyleScopedClasses['action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['vertical-action-row']} */ ;
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
/** @type {__VLS_StyleScopedClasses['settings-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-toggle-text']} */ ;
/** @type {__VLS_StyleScopedClasses['field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['module-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['module-status-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['module-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['success']} */ ;
/** @type {__VLS_StyleScopedClasses['module-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['info']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-toggle-text']} */ ;
/** @type {__VLS_StyleScopedClasses['field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['module-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['info']} */ ;
/** @type {__VLS_StyleScopedClasses['module-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['module-status-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['module-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['success']} */ ;
/** @type {__VLS_StyleScopedClasses['module-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['info']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-card-toggle-text']} */ ;
/** @type {__VLS_StyleScopedClasses['field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['module-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['success']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['full-span']} */ ;
/** @type {__VLS_StyleScopedClasses['module-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['module-status-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['module-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['success']} */ ;
/** @type {__VLS_StyleScopedClasses['module-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['info']} */ ;
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
/** @type {__VLS_StyleScopedClasses['module-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['info']} */ ;
/** @type {__VLS_StyleScopedClasses['reset-empty-state-card']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['reset-empty-state-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['reset-empty-state-item']} */ ;
/** @type {__VLS_StyleScopedClasses['guide-list']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-list']} */ ;
/** @type {__VLS_StyleScopedClasses['reset-empty-state-list']} */ ;
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
            topP: topP,
            presencePenalty: presencePenalty,
            frequencyPenalty: frequencyPenalty,
            timeoutSeconds: timeoutSeconds,
            europeanPromptName: europeanPromptName,
            europeanPromptText: europeanPromptText,
            asianBasePromptName: asianBasePromptName,
            asianBasePromptText: asianBasePromptText,
            finalPromptName: finalPromptName,
            finalPromptText: finalPromptText,
            europeanCompanies: europeanCompanies,
            asianCompanies: asianCompanies,
            europeanStageDraftText: europeanStageDraftText,
            asianBaseStageDraftText: asianBaseStageDraftText,
            finalStageDraftText: finalStageDraftText,
            activeResultTab: activeResultTab,
            loadingStructured: loadingStructured,
            loadingPreview: loadingPreview,
            loadingCookieTest: loadingCookieTest,
            loadingFetchSettings: loadingFetchSettings,
            loadingAISettings: loadingAISettings,
            loadingAnalysisSettings: loadingAnalysisSettings,
            loadingInstitutionSettings: loadingInstitutionSettings,
            loadingModelConnection: loadingModelConnection,
            loadingStageKey: loadingStageKey,
            errorMessage: errorMessage,
            successMessage: successMessage,
            matchResetNotice: matchResetNotice,
            structuredResult: structuredResult,
            analysisResult: analysisResult,
            cookieTestResult: cookieTestResult,
            modelConnectionResult: modelConnectionResult,
            savedFetchSettings: savedFetchSettings,
            savedAISettings: savedAISettings,
            savedAnalysisSettings: savedAnalysisSettings,
            modelSettingsSavedAt: modelSettingsSavedAt,
            analysisSettingsSavedAt: analysisSettingsSavedAt,
            institutionSettingsSavedAt: institutionSettingsSavedAt,
            fetchSettingsSavedAt: fetchSettingsSavedAt,
            coreInputExpanded: coreInputExpanded,
            fetchSettingsExpanded: fetchSettingsExpanded,
            modelSettingsExpanded: modelSettingsExpanded,
            analysisSettingsExpanded: analysisSettingsExpanded,
            canSubmit: canSubmit,
            isBusy: isBusy,
            cookiePoolItems: cookiePoolItems,
            currentProviderPreset: currentProviderPreset,
            siteLabel: siteLabel,
            selectedEuropeanCompanyCount: selectedEuropeanCompanyCount,
            selectedAsianCompanyCount: selectedAsianCompanyCount,
            diagnosticCompleted: diagnosticCompleted,
            resultResetPending: resultResetPending,
            resultResetOverviewCards: resultResetOverviewCards,
            analysisSucceeded: analysisSucceeded,
            stagePreviewCount: stagePreviewCount,
            finalStageText: finalStageText,
            analysisView: analysisView,
            currentWorkflowStepKey: currentWorkflowStepKey,
            heroWorkflowSteps: heroWorkflowSteps,
            analysisConclusionCards: analysisConclusionCards,
            structuredDisplayText: structuredDisplayText,
            previewDisplayText: previewDisplayText,
            analysisStageCards: analysisStageCards,
            structuredMatchupText: structuredMatchupText,
            currentMatchTitle: currentMatchTitle,
            getWorkflowButtonClass: getWorkflowButtonClass,
            toggleCoreInputCard: toggleCoreInputCard,
            toggleSettingsCard: toggleSettingsCard,
            saveDraft: saveDraft,
            setSuccess: setSuccess,
            fillSuggestedStartTime: fillSuggestedStartTime,
            copyText: copyText,
            updateStageDraft: updateStageDraft,
            runStage: runStage,
            refillFetchSettingsFromServer: refillFetchSettingsFromServer,
            saveFetchSettings: saveFetchSettings,
            saveAISettings: saveAISettings,
            saveAnalysisSettings: saveAnalysisSettings,
            saveInstitutionSettings: saveInstitutionSettings,
            loadStructuredData: loadStructuredData,
            previewAnalysis: previewAnalysis,
            testCookieConnection: testCookieConnection,
            testModelConnection: testModelConnection,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
