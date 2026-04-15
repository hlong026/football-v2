import { computed, ref } from 'vue';
const props = defineProps();
const activeCard = ref(null);
const copyMessage = ref('');
const leadHighlights = computed(() => props.analysisView.summaryPoints
    .filter((item) => item && item !== props.analysisView.headlineFull && item !== props.analysisView.leadFull)
    .slice(0, 3));
const leadTagTone = computed(() => {
    if (props.analysisView.directionTag === '偏主')
        return 'tag-home';
    if (props.analysisView.directionTag === '偏客')
        return 'tag-away';
    if (props.analysisView.directionTag === '偏平')
        return 'tag-draw';
    return 'tag-watch';
});
function openCard(title, content) {
    activeCard.value = {
        title,
        content: content.trim(),
    };
    copyMessage.value = '';
}
function closeCard() {
    activeCard.value = null;
    copyMessage.value = '';
}
async function copyActiveCard() {
    if (!activeCard.value)
        return;
    try {
        await navigator.clipboard.writeText(activeCard.value.content);
        copyMessage.value = '完整内容已复制。';
    }
    catch {
        copyMessage.value = '复制失败，请手动复制。';
    }
}
async function copyStageText(text) {
    try {
        await navigator.clipboard.writeText(text);
        copyMessage.value = '阶段内容已复制。';
    }
    catch {
        copyMessage.value = '复制失败，请手动复制。';
    }
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
    ...{ class: "summary-grid result-overview-grid" },
});
for (const [item] of __VLS_getVForSourceType((props.overviewCards))) {
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
    ...{ class: "analysis-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-content-card nested-result-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-card-head compact-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "analysis-stage-stack" },
});
for (const [item] of __VLS_getVForSourceType((props.stageCards))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (item.key),
        ...{ class: (['analysis-stage-panel', item.statusTone === 'success' ? 'conclusion-card-success' : item.statusTone === 'warning' ? 'conclusion-card-warning' : item.statusTone === 'error' ? 'conclusion-card-warning' : 'conclusion-card-accent']) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "analysis-stage-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "analysis-stage-title-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.stepLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "conclusion-card-hint" },
    });
    (item.status);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "conclusion-card-hint" },
    });
    (item.promptName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "analysis-stage-action-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                props.onRunStage(item.key);
            } },
        ...{ class: "secondary small-button" },
        disabled: (item.runDisabled),
    });
    (item.runLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.copyStageText(item.draftText || item.fullText);
            } },
        ...{ class: "secondary small-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.openCard(`${item.stepLabel} ${item.title}`, item.fullText);
            } },
        ...{ class: "secondary small-button" },
    });
    if (item.fields.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "analysis-lead-pills analysis-stage-field-pills" },
        });
        for (const [field] of __VLS_getVForSourceType((item.fields.slice(0, 3)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (`${item.key}-${field.label}`),
                ...{ class: "analysis-stage-field-pill" },
            });
            (field.label);
            (field.value);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "analysis-stage-summary" },
    });
    (item.summary);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "analysis-stage-editor" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        ...{ onInput: (...[$event]) => {
                props.onUpdateStageDraft(item.key, $event.target.value);
            } },
        value: (item.draftText),
        rows: "10",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "analysis-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-content-card nested-result-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-card-head compact-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.openCard('最终结论', props.analysisView.leadFull ? `${props.analysisView.headlineFull}\n\n${props.analysisView.leadFull}` : props.analysisView.headlineFull);
        } },
    type: "button",
    ...{ class: "analysis-lead-card emphasis-card interactive-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "analysis-lead-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.em, __VLS_intrinsicElements.em)({
    ...{ class: (['direction-tag', __VLS_ctx.leadTagTone]) },
});
(props.analysisView.directionTag);
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(props.analysisView.headline);
if (props.analysisView.lead) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (props.analysisView.lead);
}
if (__VLS_ctx.leadHighlights.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "analysis-lead-pills" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.leadHighlights))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (item),
            ...{ class: "analysis-lead-pill" },
        });
        (item);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "summary-grid conclusion-grid" },
});
for (const [item] of __VLS_getVForSourceType((props.conclusionCards))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.openCard(item.label, item.fullValue || item.value);
            } },
        key: (item.label),
        type: "button",
        ...{ class: (['summary-card', 'result-summary-card', 'conclusion-card', 'interactive-card', item.tone ? `conclusion-card-${item.tone}` : '']) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.label);
    if (item.layout === 'comparison') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.value);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "comparison-split-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "comparison-side" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "comparison-side-label" },
        });
        (item.leftLabel);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (item.leftValue);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "comparison-divider" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "comparison-side" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "comparison-side-label" },
        });
        (item.rightLabel);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (item.rightValue);
    }
    else if (item.layout === 'advice') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.value);
        if (item.subValue) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "conclusion-card-subvalue" },
            });
            (item.subValue);
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (item.value);
    }
    if (item.hint) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "conclusion-card-hint" },
        });
        (item.hint);
    }
}
if (__VLS_ctx.activeCard) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.closeCard) },
        ...{ class: "card-dialog-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-dialog" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-dialog-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.activeCard.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-dialog-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.copyActiveCard) },
        ...{ class: "secondary small-button" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeCard) },
        ...{ class: "secondary small-button" },
    });
    if (__VLS_ctx.copyMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "card-dialog-copy-message" },
        });
        (__VLS_ctx.copyMessage);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-dialog-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
    (__VLS_ctx.activeCard.content);
}
/** @type {__VLS_StyleScopedClasses['result-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['result-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['result-overview-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-summary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['result-content-card']} */ ;
/** @type {__VLS_StyleScopedClasses['nested-result-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-head']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-stage-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-stage-head']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-stage-title-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['conclusion-card-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['conclusion-card-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-stage-action-row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-lead-pills']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-stage-field-pills']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-stage-field-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-stage-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-stage-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['result-content-card']} */ ;
/** @type {__VLS_StyleScopedClasses['nested-result-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-head']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-lead-card']} */ ;
/** @type {__VLS_StyleScopedClasses['emphasis-card']} */ ;
/** @type {__VLS_StyleScopedClasses['interactive-card']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-lead-head']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-lead-pills']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-lead-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['conclusion-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-split-card']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-side']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-side-label']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-side']} */ ;
/** @type {__VLS_StyleScopedClasses['comparison-side-label']} */ ;
/** @type {__VLS_StyleScopedClasses['conclusion-card-subvalue']} */ ;
/** @type {__VLS_StyleScopedClasses['conclusion-card-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['card-dialog-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['card-dialog']} */ ;
/** @type {__VLS_StyleScopedClasses['card-dialog-head']} */ ;
/** @type {__VLS_StyleScopedClasses['card-dialog-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['small-button']} */ ;
/** @type {__VLS_StyleScopedClasses['card-dialog-copy-message']} */ ;
/** @type {__VLS_StyleScopedClasses['card-dialog-body']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            activeCard: activeCard,
            copyMessage: copyMessage,
            leadHighlights: leadHighlights,
            leadTagTone: leadTagTone,
            openCard: openCard,
            closeCard: closeCard,
            copyActiveCard: copyActiveCard,
            copyStageText: copyStageText,
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
