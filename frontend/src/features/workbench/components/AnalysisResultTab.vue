<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AnalysisConclusionCard, AnalysisView } from '../types'

type StageKey = 'european' | 'asian_base' | 'final'

type OverviewItem = {
  label: string
  value: string
  fullValue?: string
}

type StageFieldItem = {
  label: string
  value: string
  fullValue?: string
}

type StageCardItem = {
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
  fields: StageFieldItem[]
}

type CardDialogState = {
  title: string
  content: string
}

const props = defineProps<{
  overviewCards: OverviewItem[]
  conclusionCards: AnalysisConclusionCard[]
  analysisView: AnalysisView
  stageCards: StageCardItem[]
  onCopy: () => void
  onRunStage: (stage: StageKey) => void
  onUpdateStageDraft: (stage: StageKey, value: string) => void
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

async function copyStageText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copyMessage.value = '阶段内容已复制。'
  } catch {
    copyMessage.value = '复制失败，请手动复制。'
  }
}
</script>

<template>
  <div class="result-shell">
    <div class="result-toolbar">
      <h3>正式分析结果</h3>
      <button class="secondary small-button" @click="props.onCopy">复制最终结论</button>
    </div>
    <div class="summary-grid result-overview-grid">
      <div v-for="item in props.overviewCards" :key="item.label" class="summary-card result-summary-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>
    <div class="analysis-layout">
      <div class="result-content-card nested-result-card">
        <div class="result-card-head compact-head">
          <h4>三步骤阶段原文与编辑区</h4>
          <p>这里保留每一步的大模型原始输出，供你手动修改；下一步分析会自动读取这里的最新文本。</p>
        </div>
        <div class="analysis-stage-stack">
          <div
            v-for="item in props.stageCards"
            :key="item.key"
            :class="['analysis-stage-panel', item.statusTone === 'success' ? 'conclusion-card-success' : item.statusTone === 'warning' ? 'conclusion-card-warning' : item.statusTone === 'error' ? 'conclusion-card-warning' : 'conclusion-card-accent']"
          >
            <div class="analysis-stage-head">
              <div class="analysis-stage-title-wrap">
                <span>{{ item.stepLabel }}</span>
                <strong>{{ item.title }}</strong>
                <p class="conclusion-card-hint">状态：{{ item.status }}</p>
                <p class="conclusion-card-hint">提示词：{{ item.promptName }}</p>
              </div>
              <div class="analysis-stage-action-row">
                <button class="secondary small-button" :disabled="item.runDisabled" @click="props.onRunStage(item.key)">{{ item.runLabel }}</button>
                <button class="secondary small-button" @click="copyStageText(item.draftText || item.fullText)">复制阶段内容</button>
                <button class="secondary small-button" @click="openCard(`${item.stepLabel} ${item.title}`, item.fullText)">查看完整内容</button>
              </div>
            </div>
            <div v-if="item.fields.length" class="analysis-lead-pills analysis-stage-field-pills">
              <span v-for="field in item.fields.slice(0, 3)" :key="`${item.key}-${field.label}`" class="analysis-stage-field-pill">{{ field.label }}：{{ field.value }}</span>
            </div>
            <p class="analysis-stage-summary">{{ item.summary }}</p>
            <label class="analysis-stage-editor">
              <span>阶段输出文本（可直接编辑，下一步自动使用这里的内容）</span>
              <textarea :value="item.draftText" rows="10" @input="props.onUpdateStageDraft(item.key, ($event.target as HTMLTextAreaElement).value)"></textarea>
            </label>
          </div>
        </div>
      </div>
    </div>
    <div class="analysis-layout">
      <div class="result-content-card nested-result-card">
        <div class="result-card-head compact-head">
          <h4>最终结论摘要</h4>
          <p>这里仅展示提炼后的结论、风险和操作建议，不再重复展示完整原文。</p>
        </div>
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
      </div>
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
