import { computed } from 'vue';
const props = defineProps();
const europeanDetails = computed(() => props.structuredResult?.european_odds_details ?? []);
const asianDetails = computed(() => props.structuredResult?.asian_handicap_details ?? []);
const fetchedDetailCount = computed(() => [...europeanDetails.value, ...asianDetails.value].filter((item) => item.page?.fetched).length);
const matchedDetailRecordCount = computed(() => [...europeanDetails.value, ...asianDetails.value].reduce((sum, item) => sum + (item.matched_records_count ?? 0), 0));
const pageReadyCount = computed(() => Object.values(props.structuredResult?.pages ?? {}).filter((item) => item?.fetched).length);
const structuredSummaryCards = computed(() => [
    ...props.overviewCards,
    { label: '已抓详情页', value: `${fetchedDetailCount.value}` },
    { label: '命中详情记录', value: `${matchedDetailRecordCount.value}` },
]);
function formatNumber(value, digits = 2) {
    return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '-';
}
function formatText(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : '-';
}
function formatProbability(value) {
    return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : '-';
}
function formatBoolean(value) {
    return value ? '是' : '否';
}
function formatRangeText() {
    if (!props.structuredResult?.anchor_start_time)
        return '未设置时间区间';
    return `${props.structuredResult.anchor_start_time}${props.structuredResult.anchor_end_time ? ` → ${props.structuredResult.anchor_end_time}` : ' → 未设置结束时间'}`;
}
function getChangeTimeDisplay(record) {
    return formatText(record.change_time_display || record.change_time);
}
function getEuropeanRecordFields(record) {
    return [
        { label: '距赛时间', value: formatText(record.time_before_match) },
        { label: '主胜赔率', value: formatNumber(record.home_odds) },
        { label: '平局赔率', value: formatNumber(record.draw_odds) },
        { label: '客胜赔率', value: formatNumber(record.away_odds) },
        { label: '主胜概率', value: formatProbability(record.home_probability) },
        { label: '平局概率', value: formatProbability(record.draw_probability) },
        { label: '客胜概率', value: formatProbability(record.away_probability) },
        { label: '主胜凯利', value: formatNumber(record.kelly_home) },
        { label: '平局凯利', value: formatNumber(record.kelly_draw) },
        { label: '客胜凯利', value: formatNumber(record.kelly_away) },
        { label: '返还率', value: formatNumber(record.return_rate) },
    ];
}
function getAsianRecordFields(record) {
    return [
        { label: '距赛时间', value: formatText(record.time_before_match) },
        { label: '主水', value: formatNumber(record.home_water) },
        { label: '盘口', value: formatText(record.handicap) },
        { label: '客水', value: formatNumber(record.away_water) },
        { label: '初盘标记', value: formatBoolean(record.is_initial) },
        { label: '终盘标记', value: formatBoolean(record.is_final) },
    ];
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (props.onCopy) },
    ...{ class: "secondary small-button" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-grid result-overview-grid structured-overview-grid" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.structuredSummaryCards))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (item.label),
        ...{ class: "summary-card result-summary-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.value);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "structured-highlight-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-content-card structured-highlight-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-card-head compact-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "structured-range-text" },
});
(__VLS_ctx.formatRangeText());
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-content-card structured-highlight-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-card-head compact-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "structured-metric-line" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatNumber(props.structuredResult?.average_european_odds?.latest_home));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatNumber(props.structuredResult?.average_european_odds?.latest_draw));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatNumber(props.structuredResult?.average_european_odds?.latest_away));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-content-card structured-highlight-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-card-head compact-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "structured-metric-line structured-metric-line-asian" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatNumber(props.structuredResult?.average_asian_handicap?.latest_home_water));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(props.structuredResult?.average_asian_handicap?.latest_handicap || '-');
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.formatNumber(props.structuredResult?.average_asian_handicap?.latest_away_water));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-content-card structured-highlight-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-card-head compact-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "structured-range-text" },
});
(__VLS_ctx.pageReadyCount);
(Object.keys(props.structuredResult?.pages ?? {}).length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "structured-detail-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "result-content-card structured-detail-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-card-head compact-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
if (__VLS_ctx.europeanDetails.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "structured-detail-grid" },
    });
    for (const [detail] of __VLS_getVForSourceType((__VLS_ctx.europeanDetails))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (`eu-${detail.institution_id}`),
            ...{ class: "structured-detail-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "structured-detail-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (detail.institution_name || `机构 ${detail.institution_id ?? '-'}`);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (detail.matched_records_count ?? 0);
        (detail.all_records_count ?? 0);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (['status-badge', detail.page?.fetched ? 'success' : 'error']) },
        });
        (detail.page?.fetched ? '详情已抓取' : '详情失败');
        if (detail.page?.error_message) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "structured-detail-error" },
            });
            (detail.page.error_message);
        }
        if (detail.records?.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: "structured-record-list" },
            });
            for (const [record, index] of __VLS_getVForSourceType((detail.records))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    key: (`${detail.institution_id}-${index}`),
                    ...{ class: "structured-record-item" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "structured-record-head" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
                    ...{ class: "structured-record-time" },
                });
                (__VLS_ctx.getChangeTimeDisplay(record));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "structured-record-meta" },
                });
                (__VLS_ctx.formatText(record.time_before_match));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "structured-record-field-grid" },
                });
                for (const [field] of __VLS_getVForSourceType((__VLS_ctx.getEuropeanRecordFields(record)))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        key: (`${detail.institution_id}-${index}-${field.label}`),
                        ...{ class: "structured-record-field" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                    (field.label);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                    (field.value);
                }
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "structured-empty-text" },
            });
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "structured-empty-text" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "result-content-card structured-detail-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-card-head compact-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
if (__VLS_ctx.asianDetails.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "structured-detail-grid" },
    });
    for (const [detail] of __VLS_getVForSourceType((__VLS_ctx.asianDetails))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (`ah-${detail.institution_id}`),
            ...{ class: "structured-detail-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "structured-detail-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (detail.institution_name || `机构 ${detail.institution_id ?? '-'}`);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (detail.matched_records_count ?? 0);
        (detail.all_records_count ?? 0);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (['status-badge', detail.page?.fetched ? 'success' : 'error']) },
        });
        (detail.page?.fetched ? '详情已抓取' : '详情失败');
        if (detail.page?.error_message) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "structured-detail-error" },
            });
            (detail.page.error_message);
        }
        if (detail.records?.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: "structured-record-list" },
            });
            for (const [record, index] of __VLS_getVForSourceType((detail.records))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    key: (`${detail.institution_id}-${index}`),
                    ...{ class: "structured-record-item" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "structured-record-head" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
                    ...{ class: "structured-record-time" },
                });
                (__VLS_ctx.getChangeTimeDisplay(record));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "structured-record-meta" },
                });
                (__VLS_ctx.formatText(record.time_before_match));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "structured-record-field-grid" },
                });
                for (const [field] of __VLS_getVForSourceType((__VLS_ctx.getAsianRecordFields(record)))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        key: (`${detail.institution_id}-${index}-${field.label}`),
                        ...{ class: "structured-record-field" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                    (field.label);
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                    (field.value);
                }
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "structured-empty-text" },
            });
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "structured-empty-text" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
    ...{ class: "detail-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-content-card result-content-code-card nested-result-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
(props.displayText);
/** @type {__VLS_StyleScopedClasses['result-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['result-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['result-overview-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-overview-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-highlight-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['result-content-card']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-highlight-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-head']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-range-text']} */ ;
/** @type {__VLS_StyleScopedClasses['result-content-card']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-highlight-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-head']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-metric-line']} */ ;
/** @type {__VLS_StyleScopedClasses['result-content-card']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-highlight-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-head']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-metric-line']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-metric-line-asian']} */ ;
/** @type {__VLS_StyleScopedClasses['result-content-card']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-highlight-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-head']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-range-text']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-detail-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['result-content-card']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['result-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-head']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-detail-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-detail-head']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-detail-error']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-record-list']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-record-item']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-record-head']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-record-time']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-record-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-record-field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-record-field']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-empty-text']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-empty-text']} */ ;
/** @type {__VLS_StyleScopedClasses['result-content-card']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['result-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-head']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-detail-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-detail-card']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-detail-head']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-detail-error']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-record-list']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-record-item']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-record-head']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-record-time']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-record-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-record-field-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-record-field']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-empty-text']} */ ;
/** @type {__VLS_StyleScopedClasses['structured-empty-text']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['result-content-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-content-code-card']} */ ;
/** @type {__VLS_StyleScopedClasses['nested-result-card']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            europeanDetails: europeanDetails,
            asianDetails: asianDetails,
            pageReadyCount: pageReadyCount,
            structuredSummaryCards: structuredSummaryCards,
            formatNumber: formatNumber,
            formatText: formatText,
            formatRangeText: formatRangeText,
            getChangeTimeDisplay: getChangeTimeDisplay,
            getEuropeanRecordFields: getEuropeanRecordFields,
            getAsianRecordFields: getAsianRecordFields,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
