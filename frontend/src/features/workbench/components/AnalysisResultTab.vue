<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AnalysisConclusionCard, AnalysisView } from '../types'

type OverviewItem = {
  label: string
  value: string
  fullValue?: string
}

type CardDialogState = {
  title: string
  content: string
}

const props = defineProps<{
  overviewCards: OverviewItem[]
  conclusionCards: AnalysisConclusionCard[]
  analysisView: AnalysisView
  analysisDisplayText: string
  onCopy: () => void
}>()

const activeCard = ref<CardDialogState | null>(null)
const copyMessage = ref('')
const leadHighlights = computed(() => props.analysisView.summaryPoints
  .filter((item) => item && item !== props.analysisView.headlineFull && item !== props.analysisView.leadFull)
  .slice(0, 3))
const leadTagTone = computed(() => {
  if (props.analysisView.directionTag === '偏主') return 'tag-home'
  if (props.analysisView.directionTag === '偏客') return 'tag-away'
  if (props.analysisView.directionTag === '偏平') return 'tag-draw'
  return 'tag-watch'
})

function openCard(title: string, content: string) {
  activeCard.value = {
    title,
    content: content.trim(),
  }
  copyMessage.value = ''
}

function closeCard() {
  activeCard.value = null
  copyMessage.value = ''
}

async function copyActiveCard() {
  if (!activeCard.value) return
  try {
    await navigator.clipboard.writeText(activeCard.value.content)
    copyMessage.value = '完整内容已复制。'
  } catch {
    copyMessage.value = '复制失败，请手动复制。'
  }
}
</script>

<template>
  <div class="result-shell">
    <div class="result-toolbar">
      <h3>正式分析结果</h3>
      <button class="secondary small-button" @click="props.onCopy">复制结论</button>
    </div>
    <div class="summary-grid result-overview-grid">
      <div v-for="item in props.overviewCards" :key="item.label" class="summary-card result-summary-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>
    <div class="analysis-layout">
      <button type="button" class="analysis-lead-card emphasis-card interactive-card" @click="openCard('最终结论', props.analysisView.leadFull ? `${props.analysisView.headlineFull}\n\n${props.analysisView.leadFull}` : props.analysisView.headlineFull)">
        <div class="analysis-lead-head">
          <span>最终结论</span>
          <em :class="['direction-tag', leadTagTone]">{{ props.analysisView.directionTag }}</em>
        </div>
        <strong>{{ props.analysisView.headline }}</strong>
        <p v-if="props.analysisView.lead">{{ props.analysisView.lead }}</p>
        <div v-if="leadHighlights.length" class="analysis-lead-pills">
          <span v-for="item in leadHighlights" :key="item" class="analysis-lead-pill">{{ item }}</span>
        </div>
      </button>
      <div class="summary-grid conclusion-grid">
        <button
          v-for="item in props.conclusionCards"
          :key="item.label"
          type="button"
          :class="['summary-card', 'result-summary-card', 'conclusion-card', 'interactive-card', item.tone ? `conclusion-card-${item.tone}` : '']"
          @click="openCard(item.label, item.fullValue || item.value)"
        >
          <span>{{ item.label }}</span>
          <template v-if="item.layout === 'comparison'">
            <strong>{{ item.value }}</strong>
            <div class="comparison-split-card">
              <div class="comparison-side">
                <span class="comparison-side-label">{{ item.leftLabel }}</span>
                <b>{{ item.leftValue }}</b>
              </div>
              <div class="comparison-divider">VS</div>
              <div class="comparison-side">
                <span class="comparison-side-label">{{ item.rightLabel }}</span>
                <b>{{ item.rightValue }}</b>
              </div>
            </div>
          </template>
          <template v-else-if="item.layout === 'advice'">
            <strong>{{ item.value }}</strong>
            <p v-if="item.subValue" class="conclusion-card-subvalue">{{ item.subValue }}</p>
          </template>
          <strong v-else>{{ item.value }}</strong>
          <p v-if="item.hint" class="conclusion-card-hint">{{ item.hint }}</p>
        </button>
      </div>
      <details class="detail-section" :open="props.analysisView.hasContent">
        <summary>查看完整推理与原始返回</summary>
        <div class="result-content-card result-content-code-card nested-result-card">
          <pre>{{ props.analysisDisplayText }}</pre>
        </div>
      </details>
    </div>
    <div v-if="activeCard" class="card-dialog-backdrop" @click.self="closeCard">
      <div class="card-dialog">
        <div class="card-dialog-head">
          <div>
            <span>完整卡片内容</span>
            <strong>{{ activeCard.title }}</strong>
          </div>
          <div class="card-dialog-actions">
            <button class="secondary small-button" @click="copyActiveCard">复制内容</button>
            <button class="secondary small-button" @click="closeCard">关闭</button>
          </div>
        </div>
        <p v-if="copyMessage" class="card-dialog-copy-message">{{ copyMessage }}</p>
        <div class="card-dialog-body">
          <pre>{{ activeCard.content }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
