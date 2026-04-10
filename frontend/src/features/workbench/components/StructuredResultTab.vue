<script setup lang="ts">
import { computed, ref } from 'vue'

type OverviewItem = {
  label: string
  value: string
}

type DetailFieldItem = {
  label: string
  value: string
}

type PageLite = {
  fetched?: boolean
}

type AverageEuropeanLite = {
  latest_home?: number
  latest_draw?: number
  latest_away?: number
  home_probability?: number
  draw_probability?: number
  away_probability?: number
}

type AverageAsianLite = {
  latest_home_water?: number
  latest_handicap?: string
  latest_away_water?: number
}

type EuropeanChangeRecordLite = {
  change_time?: string
  change_time_display?: string
  change_time_iso?: string | null
  time_before_match?: string
  home_odds?: number
  draw_odds?: number
  away_odds?: number
  home_probability?: number
  draw_probability?: number
  away_probability?: number
  kelly_home?: number
  kelly_draw?: number
  kelly_away?: number
  return_rate?: number
}

type AsianChangeRecordLite = {
  change_time?: string
  change_time_display?: string
  change_time_iso?: string | null
  time_before_match?: string
  home_water?: number
  handicap?: string
  away_water?: number
  is_initial?: boolean
  is_final?: boolean
}

type EuropeanDetailLite = {
  institution_id?: number
  institution_name?: string
  all_records_count?: number
  matched_records_count?: number
  page?: {
    fetched?: boolean
    error_message?: string | null
  }
  records?: EuropeanChangeRecordLite[]
}

type AsianDetailLite = {
  institution_id?: number
  institution_name?: string
  all_records_count?: number
  matched_records_count?: number
  page?: {
    fetched?: boolean
    error_message?: string | null
  }
  records?: AsianChangeRecordLite[]
}

type StructuredPayloadLite = {
  match_key?: string
  pages?: Record<string, PageLite>
  european_odds?: unknown[]
  asian_handicap?: unknown[]
  anchor_start_time?: string | null
  anchor_end_time?: string | null
  average_european_odds?: AverageEuropeanLite | null
  average_asian_handicap?: AverageAsianLite | null
  european_odds_details?: EuropeanDetailLite[]
  asian_handicap_details?: AsianDetailLite[]
}

const props = defineProps<{
  structuredResult: StructuredPayloadLite | null
  displayText: string
  overviewCards: OverviewItem[]
  onCopy: () => void
}>()

const europeanDetails = computed(() => props.structuredResult?.european_odds_details ?? [])
const asianDetails = computed(() => props.structuredResult?.asian_handicap_details ?? [])
const fetchedDetailCount = computed(() => [...europeanDetails.value, ...asianDetails.value].filter((item) => item.page?.fetched).length)
const matchedDetailRecordCount = computed(() => [...europeanDetails.value, ...asianDetails.value].reduce((sum, item) => sum + (item.matched_records_count ?? 0), 0))
const europeanFetchedCount = computed(() => europeanDetails.value.filter((item) => item.page?.fetched).length)
const asianFetchedCount = computed(() => asianDetails.value.filter((item) => item.page?.fetched).length)
const europeanMatchedCount = computed(() => europeanDetails.value.reduce((sum, item) => sum + (item.matched_records_count ?? 0), 0))
const asianMatchedCount = computed(() => asianDetails.value.reduce((sum, item) => sum + (item.matched_records_count ?? 0), 0))
const pageReadyCount = computed(() => Object.values(props.structuredResult?.pages ?? {}).filter((item) => item?.fetched).length)
const pageTotalCount = computed(() => Object.keys(props.structuredResult?.pages ?? {}).length)
const structuredSummaryCards = computed<OverviewItem[]>(() => [
  ...props.overviewCards,
  { label: '已抓详情页', value: `${fetchedDetailCount.value}` },
  { label: '命中详情记录', value: `${matchedDetailRecordCount.value}` },
])
const europeanExpandedMap = ref<Record<string, boolean>>({})
const asianExpandedMap = ref<Record<string, boolean>>({})
const allEuropeanExpanded = computed(() => europeanDetails.value.length > 0 && europeanDetails.value.every((detail, index) => isEuropeanExpanded(detail, index)))
const allAsianExpanded = computed(() => asianDetails.value.length > 0 && asianDetails.value.every((detail, index) => isAsianExpanded(detail, index)))

function formatNumber(value: number | undefined, digits = 2) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '-'
}

function formatText(value: string | undefined | null) {
  return typeof value === 'string' && value.trim() ? value.trim() : '-'
}

function formatProbability(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : '-'
}

function formatBoolean(value: boolean | undefined) {
  return value ? '是' : '否'
}

function formatRangeText() {
  if (!props.structuredResult?.anchor_start_time) return '未设置时间区间'
  return `${props.structuredResult.anchor_start_time}${props.structuredResult.anchor_end_time ? ` → ${props.structuredResult.anchor_end_time}` : ' → 未设置结束时间'}`
}

function getChangeTimeDisplay(record: EuropeanChangeRecordLite | AsianChangeRecordLite) {
  return formatText(record.change_time_display || record.change_time)
}

function getDetailKey(prefix: 'eu' | 'ah', institutionId: number | undefined, index: number) {
  return `${prefix}-${institutionId ?? 'unknown'}-${index}`
}

function isEuropeanExpanded(detail: EuropeanDetailLite, index: number) {
  const key = getDetailKey('eu', detail.institution_id, index)
  return europeanExpandedMap.value[key] ?? true
}

function isAsianExpanded(detail: AsianDetailLite, index: number) {
  const key = getDetailKey('ah', detail.institution_id, index)
  return asianExpandedMap.value[key] ?? true
}

function toggleEuropeanExpanded(detail: EuropeanDetailLite, index: number) {
  const key = getDetailKey('eu', detail.institution_id, index)
  europeanExpandedMap.value = {
    ...europeanExpandedMap.value,
    [key]: !isEuropeanExpanded(detail, index),
  }
}

function toggleAsianExpanded(detail: AsianDetailLite, index: number) {
  const key = getDetailKey('ah', detail.institution_id, index)
  asianExpandedMap.value = {
    ...asianExpandedMap.value,
    [key]: !isAsianExpanded(detail, index),
  }
}

function setAllEuropeanExpanded(expanded: boolean) {
  europeanExpandedMap.value = Object.fromEntries(
    europeanDetails.value.map((detail, index) => [getDetailKey('eu', detail.institution_id, index), expanded]),
  )
}

function setAllAsianExpanded(expanded: boolean) {
  asianExpandedMap.value = Object.fromEntries(
    asianDetails.value.map((detail, index) => [getDetailKey('ah', detail.institution_id, index), expanded]),
  )
}

function getEuropeanRecordFields(record: EuropeanChangeRecordLite): DetailFieldItem[] {
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
  ]
}

function getAsianRecordFields(record: AsianChangeRecordLite): DetailFieldItem[] {
  return [
    { label: '距赛时间', value: formatText(record.time_before_match) },
    { label: '主水', value: formatNumber(record.home_water) },
    { label: '盘口', value: formatText(record.handicap) },
    { label: '客水', value: formatNumber(record.away_water) },
    { label: '初盘标记', value: formatBoolean(record.is_initial) },
    { label: '终盘标记', value: formatBoolean(record.is_final) },
  ]
}
</script>

<template>
  <div class="result-shell">
    <div class="result-toolbar">
      <h3>结构化解析结果</h3>
      <button class="secondary small-button" @click="props.onCopy">复制结果</button>
    </div>

    <div class="result-content-card structured-summary-strip-card">
      <div class="structured-summary-strip">
        <div v-for="item in structuredSummaryCards" :key="item.label" class="structured-summary-inline-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </div>

    <div class="structured-highlight-grid structured-dashboard-grid">
      <div class="result-content-card structured-highlight-card structured-dashboard-card">
        <div class="structured-dashboard-head">
          <span class="structured-dashboard-label">时间区间</span>
          <strong>{{ formatRangeText() }}</strong>
        </div>
      </div>

      <div class="result-content-card structured-highlight-card structured-dashboard-card">
        <div class="structured-dashboard-head">
          <span class="structured-dashboard-label">欧赔详情</span>
          <strong>{{ europeanMatchedCount }}</strong>
        </div>
        <div class="structured-dashboard-metrics">
          <div class="structured-dashboard-metric"><span>已抓</span><strong>{{ europeanFetchedCount }}</strong></div>
          <div class="structured-dashboard-metric"><span>机构</span><strong>{{ europeanDetails.length }}</strong></div>
        </div>
      </div>

      <div class="result-content-card structured-highlight-card structured-dashboard-card">
        <div class="structured-dashboard-head">
          <span class="structured-dashboard-label">亚盘详情</span>
          <strong>{{ asianMatchedCount }}</strong>
        </div>
        <div class="structured-dashboard-metrics">
          <div class="structured-dashboard-metric"><span>已抓</span><strong>{{ asianFetchedCount }}</strong></div>
          <div class="structured-dashboard-metric"><span>机构</span><strong>{{ asianDetails.length }}</strong></div>
        </div>
      </div>

      <div class="result-content-card structured-highlight-card structured-dashboard-card">
        <div class="structured-dashboard-head">
          <span class="structured-dashboard-label">页面概况</span>
          <strong>{{ pageReadyCount }}/{{ pageTotalCount }}</strong>
        </div>
        <div class="structured-dashboard-metrics">
          <div class="structured-dashboard-metric"><span>详情已抓</span><strong>{{ fetchedDetailCount }}</strong></div>
          <div class="structured-dashboard-metric"><span>总命中</span><strong>{{ matchedDetailRecordCount }}</strong></div>
        </div>
      </div>
    </div>

    <div class="structured-detail-shell">
      <section class="result-content-card structured-detail-section">
        <div class="result-card-head compact-head structured-detail-toolbar">
          <div>
            <h4>欧赔机构详情时间段</h4>
            <p>这里展示每家欧赔机构在当前时间区间内命中的变化记录。</p>
          </div>
          <button class="secondary small-button" :disabled="!europeanDetails.length" @click="setAllEuropeanExpanded(!allEuropeanExpanded)">{{ allEuropeanExpanded ? '全部收起' : '全部展开' }}</button>
        </div>
        <div v-if="europeanDetails.length" class="structured-detail-grid">
          <article v-for="(detail, index) in europeanDetails" :key="`eu-${detail.institution_id}`" class="structured-detail-card">
            <div class="structured-detail-head">
              <div>
                <strong>{{ detail.institution_name || `机构 ${detail.institution_id ?? '-'}` }}</strong>
                <span>命中 {{ detail.matched_records_count ?? 0 }} / {{ detail.all_records_count ?? 0 }} 条</span>
              </div>
              <div class="structured-detail-actions">
                <span :class="['status-badge', detail.page?.fetched ? 'success' : 'error']">{{ detail.page?.fetched ? '详情已抓取' : '详情失败' }}</span>
                <button class="secondary small-button structured-fold-button" @click="toggleEuropeanExpanded(detail, index)">{{ isEuropeanExpanded(detail, index) ? '收起' : '展开' }}</button>
              </div>
            </div>
            <p v-if="detail.page?.error_message" class="structured-detail-error">{{ detail.page.error_message }}</p>
            <ul v-if="isEuropeanExpanded(detail, index) && detail.records?.length" class="structured-record-list">
              <li v-for="(record, index) in detail.records" :key="`${detail.institution_id}-${index}`" class="structured-record-item">
                <div class="structured-record-head">
                  <strong class="structured-record-time">{{ getChangeTimeDisplay(record) }}</strong>
                  <span class="structured-record-meta">距开赛 {{ formatText(record.time_before_match) }}</span>
                </div>
                <div class="structured-record-field-grid">
                  <div v-for="field in getEuropeanRecordFields(record)" :key="`${detail.institution_id}-${index}-${field.label}`" class="structured-record-field">
                    <span>{{ field.label }}</span>
                    <strong>{{ field.value }}</strong>
                  </div>
                </div>
              </li>
            </ul>
            <div v-else-if="isEuropeanExpanded(detail, index)" class="structured-empty-text">当前时间区间没有命中这家机构的欧赔变化记录。</div>
          </article>
        </div>
        <div v-else class="structured-empty-text">当前还没有欧赔机构详情数据。</div>
      </section>

      <section class="result-content-card structured-detail-section">
        <div class="result-card-head compact-head structured-detail-toolbar">
          <div>
            <h4>亚盘机构详情时间段</h4>
            <p>这里展示每家亚盘机构在当前时间区间内命中的盘口变化记录。</p>
          </div>
          <button class="secondary small-button" :disabled="!asianDetails.length" @click="setAllAsianExpanded(!allAsianExpanded)">{{ allAsianExpanded ? '全部收起' : '全部展开' }}</button>
        </div>
        <div v-if="asianDetails.length" class="structured-detail-grid">
          <article v-for="(detail, index) in asianDetails" :key="`ah-${detail.institution_id}`" class="structured-detail-card">
            <div class="structured-detail-head">
              <div>
                <strong>{{ detail.institution_name || `机构 ${detail.institution_id ?? '-'}` }}</strong>
                <span>命中 {{ detail.matched_records_count ?? 0 }} / {{ detail.all_records_count ?? 0 }} 条</span>
              </div>
              <div class="structured-detail-actions">
                <span :class="['status-badge', detail.page?.fetched ? 'success' : 'error']">{{ detail.page?.fetched ? '详情已抓取' : '详情失败' }}</span>
                <button class="secondary small-button structured-fold-button" @click="toggleAsianExpanded(detail, index)">{{ isAsianExpanded(detail, index) ? '收起' : '展开' }}</button>
              </div>
            </div>
            <p v-if="detail.page?.error_message" class="structured-detail-error">{{ detail.page.error_message }}</p>
            <ul v-if="isAsianExpanded(detail, index) && detail.records?.length" class="structured-record-list">
              <li v-for="(record, index) in detail.records" :key="`${detail.institution_id}-${index}`" class="structured-record-item">
                <div class="structured-record-head">
                  <strong class="structured-record-time">{{ getChangeTimeDisplay(record) }}</strong>
                  <span class="structured-record-meta">距开赛 {{ formatText(record.time_before_match) }}</span>
                </div>
                <div class="structured-record-field-grid">
                  <div v-for="field in getAsianRecordFields(record)" :key="`${detail.institution_id}-${index}-${field.label}`" class="structured-record-field">
                    <span>{{ field.label }}</span>
                    <strong>{{ field.value }}</strong>
                  </div>
                </div>
              </li>
            </ul>
            <div v-else-if="isAsianExpanded(detail, index)" class="structured-empty-text">当前时间区间没有命中这家机构的亚盘变化记录。</div>
          </article>
        </div>
        <div v-else class="structured-empty-text">当前还没有亚盘机构详情数据。</div>
      </section>
    </div>

    <details class="detail-section">
      <summary>查看完整结构化 JSON</summary>
      <div class="result-content-card result-content-code-card nested-result-card">
        <pre>{{ props.displayText }}</pre>
      </div>
    </details>
  </div>
</template>
