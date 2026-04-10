import { computed, ref } from 'vue';
const props = defineProps();
const activeCard = ref(null);
const copyMessage = ref('');
const leadHighlights = computed(() => props.analysisView.summaryPoints
    .filter((item) => item && item !== props.analysisView.headlineFull && item !== props.analysisView.leadFull)
    .slice(0, 3));
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.openCard('最终结论', props.analysisView.leadFull ? `${props.analysisView.headlineFull}\n\n${props.analysisView.leadFull}` : props.analysisView.headlineFull);
        } },
    type: "button",
    ...{ class: "analysis-lead-card emphasis-card interactive-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (item.value);
    if (item.hint) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "conclusion-card-hint" },
        });
        (item.hint);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "analysis-section-grid" },
});
for (const [section] of __VLS_getVForSourceType((props.analysisSectionCards))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.openCard(section.title, `${section.hint}\n\n${section.items.join('\n')}`);
            } },
        key: (section.key),
        type: "button",
        ...{ class: "analysis-section-card interactive-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (section.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (section.items[0] || section.hint);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "analysis-section-hint" },
    });
    (section.hint);
    if (section.items.length > 1) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({});
        for (const [item] of __VLS_getVForSourceType((section.items.slice(1)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (item),
            });
            (item);
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
    ...{ class: "detail-section" },
    open: (props.analysisView.hasContent),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "result-content-card result-content-code-card nested-result-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
(props.analysisDisplayText);
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
/** @type {__VLS_StyleScopedClasses['analysis-lead-card']} */ ;
/** @type {__VLS_StyleScopedClasses['emphasis-card']} */ ;
/** @type {__VLS_StyleScopedClasses['interactive-card']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-lead-pills']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-lead-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['conclusion-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['conclusion-card-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-section-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-section-card']} */ ;
/** @type {__VLS_StyleScopedClasses['interactive-card']} */ ;
/** @type {__VLS_StyleScopedClasses['analysis-section-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-section']} */ ;
/** @type {__VLS_StyleScopedClasses['result-content-card']} */ ;
/** @type {__VLS_StyleScopedClasses['result-content-code-card']} */ ;
/** @type {__VLS_StyleScopedClasses['nested-result-card']} */ ;
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
            openCard: openCard,
            closeCard: closeCard,
            copyActiveCard: copyActiveCard,
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
