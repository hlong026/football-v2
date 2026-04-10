import { computed } from 'vue';
const props = defineProps();
const emit = defineEmits();
const recordSearchModel = computed({
    get: () => props.recordSearch,
    set: (value) => emit('update:recordSearch', value),
});
const historySortModel = computed({
    get: () => props.historySort,
    set: (value) => emit('update:historySort', value),
});
const historyRangeModel = computed({
    get: () => props.historyRange,
    set: (value) => emit('update:historyRange', value),
});
const historyFocusModel = computed({
    get: () => props.historyFocus,
    set: (value) => emit('update:historyFocus', value),
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
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
    ...{ onClick: (props.onRefresh) },
    ...{ class: "secondary small-button" },
    disabled: (props.loadingRecords),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "history-toolbar advanced-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    value: (__VLS_ctx.recordSearchModel),
    type: "text",
    placeholder: "搜索比赛键值、文件名、站点或时间",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.historySortModel),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "newest",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "oldest",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "match_key",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.historyRangeModel),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "all",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "today",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "7d",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "30d",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.historyFocusModel),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "all",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "pinned",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "favorited",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: "important",
});
if (props.historyGroupItems.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "history-group-strip" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(props.historyGroupItems.length))
                    return;
                props.onSelectGroup('all');
            } },
        ...{ class: "history-group-chip" },
        ...{ class: ({ active: props.effectiveHistoryGroupKey === 'all' }) },
    });
    for (const [group] of __VLS_getVForSourceType((props.historyGroupItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(props.historyGroupItems.length))
                        return;
                    props.onSelectGroup(group.matchKey);
                } },
            key: (group.matchKey),
            ...{ class: "history-group-chip" },
            ...{ class: ({ active: props.effectiveHistoryGroupKey === group.matchKey }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (group.matchKey);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (group.count);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "history-count" },
});
(props.displayedHistoryRecords.length);
(props.historyRecords.length);
if (props.hasHistoryRecords && props.displayedHistoryRecords.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "record-list" },
    });
    for (const [item] of __VLS_getVForSourceType((props.displayedHistoryRecords))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (item.relative_path),
            ...{ class: "record-item" },
            ...{ class: ({ active: props.selectedRecordPath === item.relative_path }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(props.hasHistoryRecords && props.displayedHistoryRecords.length))
                        return;
                    props.onLoadDetail(item.relative_path);
                } },
            ...{ class: "record-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "record-main-top" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.match_key);
        if (props.getRecordBadgeLabels(item.relative_path).length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "record-badge-row" },
            });
            for (const [badge] of __VLS_getVForSourceType((props.getRecordBadgeLabels(item.relative_path)))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    key: (badge),
                    ...{ class: "mark-badge" },
                });
                (badge);
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (props.formatDate(item.created_at));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.file_name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "record-action-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(props.hasHistoryRecords && props.displayedHistoryRecords.length))
                        return;
                    props.onToggleMark(item.relative_path, 'pinned');
                } },
            ...{ class: "mark-toggle" },
            ...{ class: ({ active: props.getRecordMarkState(item.relative_path).pinned }) },
        });
        (props.getRecordMarkState(item.relative_path).pinned ? '取消置顶' : '置顶');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(props.hasHistoryRecords && props.displayedHistoryRecords.length))
                        return;
                    props.onToggleMark(item.relative_path, 'favorited');
                } },
            ...{ class: "mark-toggle" },
            ...{ class: ({ active: props.getRecordMarkState(item.relative_path).favorited }) },
        });
        (props.getRecordMarkState(item.relative_path).favorited ? '取消收藏' : '收藏');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(props.hasHistoryRecords && props.displayedHistoryRecords.length))
                        return;
                    props.onToggleMark(item.relative_path, 'important');
                } },
            ...{ class: "mark-toggle" },
            ...{ class: ({ active: props.getRecordMarkState(item.relative_path).important }) },
        });
        (props.getRecordMarkState(item.relative_path).important ? '取消重点' : '重点');
    }
}
else if (props.hasHistoryRecords) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
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
    ...{ onClick: (props.onCopyConclusion) },
    ...{ class: "secondary small-button" },
});
if (props.selectedRecordDetail) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-meta" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (props.selectedRecordDetail.match_key || '-');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (props.formatDate(props.selectedRecordDetail.created_at));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (props.selectedRecordDetail.source_url || '-');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (props.selectedMatchHistoryCount);
    if (props.selectedMatchTimelineRecords.length > 1) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "detail-section match-trend-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "result-card-head compact-head match-trend-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "summary-grid selected-match-trend-grid" },
        });
        for (const [item] of __VLS_getVForSourceType((props.selectedMatchTrendSummary))) {
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
            ...{ class: "match-trend-timeline" },
        });
        for (const [item] of __VLS_getVForSourceType((props.selectedMatchTimelineRecords))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(props.selectedRecordDetail))
                            return;
                        if (!(props.selectedMatchTimelineRecords.length > 1))
                            return;
                        props.onLoadDetail(item.relativePath);
                    } },
                key: (item.relativePath),
                ...{ class: "match-trend-item" },
                ...{ class: ({ active: item.active }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "match-trend-item-head" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (item.order);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (item.createdAtText);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (item.fileName);
            if (item.badges.length) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "record-badge-row" },
                });
                for (const [badge] of __VLS_getVForSourceType((item.badges))) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        key: (`${item.relativePath}-${badge}`),
                        ...{ class: "mark-badge" },
                    });
                    (badge);
                }
            }
        }
    }
    if (props.selectedMatchConclusionComparisons.length > 1) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "detail-section match-trend-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "result-card-head compact-head match-trend-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        if (props.loadingMatchComparisons) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "history-count" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "match-trend-timeline conclusion-comparison-grid" },
        });
        for (const [item] of __VLS_getVForSourceType((props.selectedMatchConclusionComparisons))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (`${item.relativePath}-comparison`),
                ...{ class: "match-trend-item" },
                ...{ class: ({ active: item.active }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "match-trend-item-head" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (item.order);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (item.createdAtText);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (item.headline);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (item.lead);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "status-badge" },
                ...{ class: (item.active ? 'success' : 'info') },
            });
            (item.statusLabel);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(props.selectedRecordDetail))
                            return;
                        if (!(props.selectedMatchConclusionComparisons.length > 1))
                            return;
                        props.onLoadDetail(item.relativePath);
                    } },
                ...{ class: "secondary small-button" },
            });
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "record-action-row detail-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(props.selectedRecordDetail))
                    return;
                props.onToggleMark(props.selectedRecordPath, 'pinned');
            } },
        ...{ class: "mark-toggle" },
        ...{ class: ({ active: props.selectedRecordMark.pinned }) },
    });
    (props.selectedRecordMark.pinned ? '取消置顶' : '置顶记录');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(props.selectedRecordDetail))
                    return;
                props.onToggleMark(props.selectedRecordPath, 'favorited');
            } },
        ...{ class: "mark-toggle" },
        ...{ class: ({ active: props.selectedRecordMark.favorited }) },
    });
    (props.selectedRecordMark.favorited ? '取消收藏' : '加入收藏');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(props.selectedRecordDetail))
                    return;
                props.onToggleMark(props.selectedRecordPath, 'important');
            } },
        ...{ class: "mark-toggle" },
        ...{ class: ({ active: props.selectedRecordMark.important }) },
    });
    (props.selectedRecordMark.important ? '取消重点' : '标记重点');
    if (props.selectedRecordBadges.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "record-badge-row detail-badges" },
        });
        for (const [badge] of __VLS_getVForSourceType((props.selectedRecordBadges))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (badge),
                ...{ class: "mark-badge" },
            });
            (badge);
        }
    }
    if (props.historyDiagnosticCards.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "diagnostic-grid" },
        });
        for (const [card] of __VLS_getVForSourceType((props.historyDiagnosticCards))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (card.title),
                ...{ class: (['diagnostic-card', card.tone]) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (card.tone === 'warning' ? '需要关注' : '排查线索');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (card.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (card.summary);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({});
            for (const [point] of __VLS_getVForSourceType((card.points))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    key: (point),
                });
                (point);
            }
        }
    }
    if (props.pageStatusItems.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
            ...{ class: "detail-section" },
            open: true,
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "diagnostic-page-list" },
        });
        for (const [item] of __VLS_getVForSourceType((props.pageStatusItems))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (item.key),
                ...{ class: "diagnostic-page-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (item.label);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
            (item.pageUrl);
            if (item.finalUrl !== item.pageUrl) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (item.finalUrl);
            }
            if (item.errorMessage) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (item.errorMessage);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "diagnostic-page-meta" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: (['status-badge', item.fetched ? 'success' : 'error']) },
            });
            (item.fetched ? '已抓取' : '抓取失败');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (item.statusCode ?? '-');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (item.htmlLength);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "highlight-grid" },
    });
    for (const [item] of __VLS_getVForSourceType((props.detailHighlights))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.label),
            ...{ class: "highlight-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (item.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.value);
    }
    if (props.averageEuropeanBars.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chart-block" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        for (const [bar] of __VLS_getVForSourceType((props.averageEuropeanBars))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (bar.label),
                ...{ class: "metric-bar-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (bar.label);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "metric-bar-track" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "metric-bar-fill" },
                ...{ style: (props.barStyle(bar.value)) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (bar.value.toFixed(2));
        }
    }
    if (props.averageAsianBars.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "chart-block" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        for (const [bar] of __VLS_getVForSourceType((props.averageAsianBars))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (bar.label),
                ...{ class: "metric-bar-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (bar.label);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "metric-bar-track" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "metric-bar-fill secondary" },
                ...{ style: (props.barStyle(bar.value)) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            ((bar.value / 100).toFixed(2));
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
    (props.recordAnalysisView.headline);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (props.loadingRecordDetail ? '详情加载中...' : props.recordAnalysisView.lead);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "analysis-section-grid" },
    });
    for (const [section] of __VLS_getVForSourceType((props.recordAnalysisSectionCards))) {
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
        open: (props.recordAnalysisView.hasContent),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
    (props.loadingRecordDetail ? '详情加载中...' : props.selectedRecordAnalysisText);
    if (props.europeanRows.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
            ...{ class: "detail-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "data-table-wrap" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: "data-table" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [row] of __VLS_getVForSourceType((props.europeanRows))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (row.institution_name),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (row.institution_name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (row.latest_home.toFixed(2));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (row.latest_draw.toFixed(2));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (row.latest_away.toFixed(2));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (row.home_probability.toFixed(2));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (row.draw_probability.toFixed(2));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (row.away_probability.toFixed(2));
        }
    }
    if (props.asianRows.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
            ...{ class: "detail-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "data-table-wrap" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: "data-table" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [row] of __VLS_getVForSourceType((props.asianRows))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (row.institution_name),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (row.institution_name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            ((row.initial_home_water ?? 0).toFixed(2));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (row.initial_handicap || '-');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            ((row.initial_away_water ?? 0).toFixed(2));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (row.latest_home_water.toFixed(2));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (row.latest_handicap);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (row.latest_away_water.toFixed(2));
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
}
/** @type {__VLS_StyleScopedClasses['history-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['history-list-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['result-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['history-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['advanced-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['history-group-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['history-group-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['history-group-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['history-count']} */ ;
/** @type {__VLS_StyleScopedClasses['record-list']} */ ;
/** @type {__VLS_StyleScopedClasses['record-item']} */ ;
/** @type {__VLS_StyleScopedClasses['record-main']} */ ;
/** @type {__VLS_StyleScopedClasses['record-main-top']} */ ;
/** @type {__VLS_StyleScopedClasses['record-badge-row']} */ ;
/** @type {__VLS_StyleScopedClasses['mark-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['record-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['mark-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['mark-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['mark-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['history-detail-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['result-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['match-trend-section']} */ ;
/** @type {__VLS_StyleScopedClasses['result-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-head']} */ ;
/** @type {__VLS_StyleScopedClasses['match-trend-head']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-match-trend-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['match-trend-timeline']} */ ;
/** @type {__VLS_StyleScopedClasses['match-trend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['match-trend-item-head']} */ ;
/** @type {__VLS_StyleScopedClasses['record-badge-row']} */ ;
/** @type {__VLS_StyleScopedClasses['mark-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['match-trend-section']} */ ;
/** @type {__VLS_StyleScopedClasses['result-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-head']} */ ;
/** @type {__VLS_StyleScopedClasses['match-trend-head']} */ ;
/** @type {__VLS_StyleScopedClasses['history-count']} */ ;
/** @type {__VLS_StyleScopedClasses['match-trend-timeline']} */ ;
/** @type {__VLS_StyleScopedClasses['conclusion-comparison-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['match-trend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['match-trend-item-head']} */ ;
/** @type {__VLS_StyleScopedClasses['status-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['record-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['mark-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['mark-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['mark-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['record-badge-row']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-badges']} */ ;
/** @type {__VLS_StyleScopedClasses['mark-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['diagnostic-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['diagnostic-page-list']} */ ;
/** @type {__VLS_StyleScopedClasses['diagnostic-page-row']} */ ;
/** @type {__VLS_StyleScopedClasses['diagnostic-page-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['highlight-card']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-block']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-bar-row']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-bar-track']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-bar-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-block']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-bar-row']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-bar-track']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-bar-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-lead-card']} */ ;
/** @type {__VLS_StyleScopedClasses['emphasis-card']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-section-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-section-card']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['data-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['data-table']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['data-table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['data-table']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            recordSearchModel: recordSearchModel,
            historySortModel: historySortModel,
            historyRangeModel: historyRangeModel,
            historyFocusModel: historyFocusModel,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
