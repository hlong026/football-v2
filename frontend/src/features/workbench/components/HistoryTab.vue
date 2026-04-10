<script setup lang="ts">
import { computed } from 'vue'
import type {
  AnalysisSectionCard,
  AnalysisView,
  AsianHandicapLite,
  DiagnosticCard,
  EuropeanOddsLite,
  HistoryGroupItem,
  HistoryRange,
  HistorySort,
  PageStatusItem,
  RecordDetail,
  RecordFocus,
  RecordListItem,
  RecordMarkField,
  RecordMarkState,
} from '../types'

type SummaryItem = {
  label: string
  value: string
}

type TimelineItem = {
  relativePath: string
  createdAt: string
  createdAtText: string
  fileName: string
  order: number
  badges: string[]
  active: boolean
}

type BarItem = {
  label: string
  value: number
}

type ConclusionComparisonItem = {
  relativePath: string
  createdAtText: string
  fileName: string
  order: number
  active: boolean
  headline: string
  lead: string
  statusLabel: string
}

const props = defineProps<{
  loadingRecords: boolean
  loadingRecordDetail: boolean
  loadingMatchComparisons: boolean
  recordSearch: string
  historySort: HistorySort
  historyRange: HistoryRange
  historyFocus: RecordFocus
  historyGroupItems: HistoryGroupItem[]
  effectiveHistoryGroupKey: string
  displayedHistoryRecords: RecordListItem[]
  historyRecords: RecordListItem[]
  hasHistoryRecords: boolean
  selectedRecordPath: string
  selectedRecordDetail: RecordDetail | null
  selectedRecordAnalysisText: string
  selectedMatchHistoryCount: number
  selectedMatchTimelineRecords: TimelineItem[]
  selectedMatchTrendSummary: SummaryItem[]
  selectedMatchConclusionComparisons: ConclusionComparisonItem[]
  selectedRecordMark: RecordMarkState
  selectedRecordBadges: string[]
  historyDiagnosticCards: DiagnosticCard[]
  pageStatusItems: PageStatusItem[]
  detailHighlights: SummaryItem[]
  averageEuropeanBars: BarItem[]
  averageAsianBars: BarItem[]
  recordAnalysisView: AnalysisView
  recordAnalysisSectionCards: AnalysisSectionCard[]
  europeanRows: EuropeanOddsLite[]
  asianRows: AsianHandicapLite[]
  getRecordBadgeLabels: (relativePath: string) => string[]
  getRecordMarkState: (relativePath: string) => RecordMarkState
  formatDate: (value?: string) => string
  barStyle: (value: number) => { width: string }
  onRefresh: () => void
  onSelectGroup: (matchKey: string) => void
  onLoadDetail: (relativePath: string) => void
  onToggleMark: (relativePath: string, field: RecordMarkField) => void
  onCopyConclusion: () => void
}>()

const emit = defineEmits<{
  'update:recordSearch': [value: string]
  'update:historySort': [value: HistorySort]
  'update:historyRange': [value: HistoryRange]
  'update:historyFocus': [value: RecordFocus]
}>()

const recordSearchModel = computed({
  get: () => props.recordSearch,
  set: (value: string) => emit('update:recordSearch', value),
})
const historySortModel = computed({
  get: () => props.historySort,
  set: (value: HistorySort) => emit('update:historySort', value),
})
const historyRangeModel = computed({
  get: () => props.historyRange,
  set: (value: HistoryRange) => emit('update:historyRange', value),
})
const historyFocusModel = computed({
  get: () => props.historyFocus,
  set: (value: RecordFocus) => emit('update:historyFocus', value),
})
</script>

<template>
  <div class="history-layout">
    <div class="history-list-panel">
      <div class="result-toolbar compact-toolbar">
        <h3>历史归档记录</h3>
        <button class="secondary small-button" @click="props.onRefresh" :disabled="props.loadingRecords">刷新</button>
      </div>
      <div class="history-toolbar advanced-toolbar">
        <input v-model="recordSearchModel" type="text" placeholder="搜索比赛键值、文件名、站点或时间" />
        <select v-model="historySortModel">
          <option value="newest">最新优先</option>
          <option value="oldest">最早优先</option>
          <option value="match_key">按比赛键值</option>
        </select>
        <select v-model="historyRangeModel">
          <option value="all">全部时间</option>
          <option value="today">近 24 小时</option>
          <option value="7d">近 7 天</option>
          <option value="30d">近 30 天</option>
        </select>
        <select v-model="historyFocusModel">
          <option value="all">全部记录</option>
          <option value="pinned">仅看置顶</option>
          <option value="favorited">仅看收藏</option>
          <option value="important">仅看重点</option>
        </select>
      </div>
      <div v-if="props.historyGroupItems.length" class="history-group-strip">
        <button class="history-group-chip" :class="{ active: props.effectiveHistoryGroupKey === 'all' }" @click="props.onSelectGroup('all')">全部比赛</button>
        <button
          v-for="group in props.historyGroupItems"
          :key="group.matchKey"
          class="history-group-chip"
          :class="{ active: props.effectiveHistoryGroupKey === group.matchKey }"
          @click="props.onSelectGroup(group.matchKey)"
        >
          <strong>{{ group.matchKey }}</strong>
          <span>{{ group.count }} 条</span>
        </button>
      </div>
      <div class="history-count">{{ props.displayedHistoryRecords.length }} / {{ props.historyRecords.length }}</div>
      <div v-if="props.hasHistoryRecords && props.displayedHistoryRecords.length" class="record-list">
        <article
          v-for="item in props.displayedHistoryRecords"
          :key="item.relative_path"
          class="record-item"
          :class="{ active: props.selectedRecordPath === item.relative_path }"
        >
          <button class="record-main" @click="props.onLoadDetail(item.relative_path)">
            <div class="record-main-top">
              <strong>{{ item.match_key }}</strong>
              <div v-if="props.getRecordBadgeLabels(item.relative_path).length" class="record-badge-row">
                <span v-for="badge in props.getRecordBadgeLabels(item.relative_path)" :key="badge" class="mark-badge">{{ badge }}</span>
              </div>
            </div>
            <span>{{ props.formatDate(item.created_at) }}</span>
            <span>{{ item.file_name }}</span>
          </button>
          <div class="record-action-row">
            <button class="mark-toggle" :class="{ active: props.getRecordMarkState(item.relative_path).pinned }" @click.stop="props.onToggleMark(item.relative_path, 'pinned')">{{ props.getRecordMarkState(item.relative_path).pinned ? '取消置顶' : '置顶' }}</button>
            <button class="mark-toggle" :class="{ active: props.getRecordMarkState(item.relative_path).favorited }" @click.stop="props.onToggleMark(item.relative_path, 'favorited')">{{ props.getRecordMarkState(item.relative_path).favorited ? '取消收藏' : '收藏' }}</button>
            <button class="mark-toggle" :class="{ active: props.getRecordMarkState(item.relative_path).important }" @click.stop="props.onToggleMark(item.relative_path, 'important')">{{ props.getRecordMarkState(item.relative_path).important ? '取消重点' : '重点' }}</button>
          </div>
        </article>
      </div>
      <pre v-else-if="props.hasHistoryRecords">没有匹配到历史记录，请换个关键词或筛选条件试试。</pre>
      <pre v-else>还没有加载历史记录，点击“查看历史记录”后这里会显示最近 20 条归档。</pre>
    </div>

    <div class="history-detail-panel">
      <div class="result-toolbar compact-toolbar">
        <h3>历史详情</h3>
        <button class="secondary small-button" @click="props.onCopyConclusion">复制结论</button>
      </div>
      <div v-if="props.selectedRecordDetail" class="detail-grid">
        <div class="detail-meta">
          <div><strong>比赛键值：</strong>{{ props.selectedRecordDetail.match_key || '-' }}</div>
          <div><strong>创建时间：</strong>{{ props.formatDate(props.selectedRecordDetail.created_at) }}</div>
          <div><strong>比赛链接：</strong>{{ props.selectedRecordDetail.source_url || '-' }}</div>
          <div><strong>同比赛归档：</strong>{{ props.selectedMatchHistoryCount }} 条</div>
        </div>
        <div v-if="props.selectedMatchTimelineRecords.length > 1" class="detail-section match-trend-section">
          <div class="result-card-head compact-head match-trend-head">
            <h4>同场趋势观察</h4>
            <p>按时间查看同一场比赛的多次分析记录，快速切换复盘。</p>
          </div>
          <div class="summary-grid selected-match-trend-grid">
            <div v-for="item in props.selectedMatchTrendSummary" :key="item.label" class="summary-card result-summary-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
          <div class="match-trend-timeline">
            <button
              v-for="item in props.selectedMatchTimelineRecords"
              :key="item.relativePath"
              class="match-trend-item"
              :class="{ active: item.active }"
              @click="props.onLoadDetail(item.relativePath)"
            >
              <div class="match-trend-item-head">
                <strong>第 {{ item.order }} 次</strong>
                <span>{{ item.createdAtText }}</span>
              </div>
              <p>{{ item.fileName }}</p>
              <div v-if="item.badges.length" class="record-badge-row">
                <span v-for="badge in item.badges" :key="`${item.relativePath}-${badge}`" class="mark-badge">{{ badge }}</span>
              </div>
            </button>
          </div>
        </div>
        <div v-if="props.selectedMatchConclusionComparisons.length > 1" class="detail-section match-trend-section">
          <div class="result-card-head compact-head match-trend-head">
            <h4>多次结论对比</h4>
            <p>同一场比赛不同时间点的结论会集中展示，方便你观察是否出现判断变化。</p>
          </div>
          <p v-if="props.loadingMatchComparisons" class="history-count">正在加载同场对比详情...</p>
          <div class="match-trend-timeline conclusion-comparison-grid">
            <div v-for="item in props.selectedMatchConclusionComparisons" :key="`${item.relativePath}-comparison`" class="match-trend-item" :class="{ active: item.active }">
              <div class="match-trend-item-head">
                <strong>第 {{ item.order }} 次</strong>
                <span>{{ item.createdAtText }}</span>
              </div>
              <strong>{{ item.headline }}</strong>
              <p>{{ item.lead }}</p>
              <span class="status-badge" :class="item.active ? 'success' : 'info'">{{ item.statusLabel }}</span>
              <button class="secondary small-button" @click="props.onLoadDetail(item.relativePath)">查看这次详情</button>
            </div>
          </div>
        </div>
        <div class="record-action-row detail-actions">
          <button class="mark-toggle" :class="{ active: props.selectedRecordMark.pinned }" @click="props.onToggleMark(props.selectedRecordPath, 'pinned')">{{ props.selectedRecordMark.pinned ? '取消置顶' : '置顶记录' }}</button>
          <button class="mark-toggle" :class="{ active: props.selectedRecordMark.favorited }" @click="props.onToggleMark(props.selectedRecordPath, 'favorited')">{{ props.selectedRecordMark.favorited ? '取消收藏' : '加入收藏' }}</button>
          <button class="mark-toggle" :class="{ active: props.selectedRecordMark.important }" @click="props.onToggleMark(props.selectedRecordPath, 'important')">{{ props.selectedRecordMark.important ? '取消重点' : '标记重点' }}</button>
        </div>
        <div v-if="props.selectedRecordBadges.length" class="record-badge-row detail-badges">
          <span v-for="badge in props.selectedRecordBadges" :key="badge" class="mark-badge">{{ badge }}</span>
        </div>
        <div v-if="props.historyDiagnosticCards.length" class="diagnostic-grid">
          <div v-for="card in props.historyDiagnosticCards" :key="card.title" :class="['diagnostic-card', card.tone]">
            <span>{{ card.tone === 'warning' ? '需要关注' : '排查线索' }}</span>
            <strong>{{ card.title }}</strong>
            <p>{{ card.summary }}</p>
            <ul>
              <li v-for="point in card.points" :key="point">{{ point }}</li>
            </ul>
          </div>
        </div>
        <details class="detail-section" v-if="props.pageStatusItems.length" open>
          <summary>查看抓取页面状态</summary>
          <div class="diagnostic-page-list">
            <div v-for="item in props.pageStatusItems" :key="item.key" class="diagnostic-page-row">
              <div>
                <strong>{{ item.label }}</strong>
                <p>{{ item.pageUrl }}</p>
                <p v-if="item.finalUrl !== item.pageUrl">最终跳转：{{ item.finalUrl }}</p>
                <p v-if="item.errorMessage">{{ item.errorMessage }}</p>
              </div>
              <div class="diagnostic-page-meta">
                <span :class="['status-badge', item.fetched ? 'success' : 'error']">{{ item.fetched ? '已抓取' : '抓取失败' }}</span>
                <span>HTTP {{ item.statusCode ?? '-' }}</span>
                <span>HTML {{ item.htmlLength }}</span>
              </div>
            </div>
          </div>
        </details>
        <div class="highlight-grid">
          <div v-for="item in props.detailHighlights" :key="item.label" class="highlight-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
        <div class="chart-block" v-if="props.averageEuropeanBars.length">
          <h4>欧赔平均概率</h4>
          <div v-for="bar in props.averageEuropeanBars" :key="bar.label" class="metric-bar-row">
            <span>{{ bar.label }}</span>
            <div class="metric-bar-track">
              <div class="metric-bar-fill" :style="props.barStyle(bar.value)"></div>
            </div>
            <strong>{{ bar.value.toFixed(2) }}%</strong>
          </div>
        </div>
        <div class="chart-block" v-if="props.averageAsianBars.length">
          <h4>亚盘平均水位</h4>
          <div v-for="bar in props.averageAsianBars" :key="bar.label" class="metric-bar-row">
            <span>{{ bar.label }}</span>
            <div class="metric-bar-track">
              <div class="metric-bar-fill secondary" :style="props.barStyle(bar.value)"></div>
            </div>
            <strong>{{ (bar.value / 100).toFixed(2) }}</strong>
          </div>
        </div>
        <div class="analysis-layout">
          <div class="analysis-lead-card emphasis-card">
            <span>历史结论摘要</span>
            <strong>{{ props.recordAnalysisView.headline }}</strong>
            <p>{{ props.loadingRecordDetail ? '详情加载中...' : props.recordAnalysisView.lead }}</p>
          </div>
          <div class="analysis-section-grid">
            <div v-for="section in props.recordAnalysisSectionCards" :key="section.key" class="analysis-section-card">
              <span>{{ section.title }}</span>
              <strong>{{ section.hint }}</strong>
              <ul>
                <li v-for="item in section.items" :key="item">{{ item }}</li>
              </ul>
            </div>
          </div>
          <details class="detail-section" :open="props.recordAnalysisView.hasContent">
            <summary>查看完整历史结论</summary>
            <pre>{{ props.loadingRecordDetail ? '详情加载中...' : props.selectedRecordAnalysisText }}</pre>
          </details>
        </div>
        <details class="detail-section" v-if="props.europeanRows.length">
          <summary>查看欧赔机构对比</summary>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>机构</th>
                  <th>主胜</th>
                  <th>平局</th>
                  <th>客胜</th>
                  <th>主胜概率</th>
                  <th>平局概率</th>
                  <th>客胜概率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in props.europeanRows" :key="row.institution_name">
                  <td>{{ row.institution_name }}</td>
                  <td>{{ row.latest_home.toFixed(2) }}</td>
                  <td>{{ row.latest_draw.toFixed(2) }}</td>
                  <td>{{ row.latest_away.toFixed(2) }}</td>
                  <td>{{ row.home_probability.toFixed(2) }}%</td>
                  <td>{{ row.draw_probability.toFixed(2) }}%</td>
                  <td>{{ row.away_probability.toFixed(2) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
        <details class="detail-section" v-if="props.asianRows.length">
          <summary>查看亚盘机构对比</summary>
          <div class="data-table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>机构</th>
                  <th>初盘主水</th>
                  <th>初盘盘口</th>
                  <th>初盘客水</th>
                  <th>即时主水</th>
                  <th>即时盘口</th>
                  <th>即时客水</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in props.asianRows" :key="row.institution_name">
                  <td>{{ row.institution_name }}</td>
                  <td>{{ (row.initial_home_water ?? 0).toFixed(2) }}</td>
                  <td>{{ row.initial_handicap || '-' }}</td>
                  <td>{{ (row.initial_away_water ?? 0).toFixed(2) }}</td>
                  <td>{{ row.latest_home_water.toFixed(2) }}</td>
                  <td>{{ row.latest_handicap }}</td>
                  <td>{{ row.latest_away_water.toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </div>
      <pre v-else>请选择一条历史记录查看详情。</pre>
    </div>
  </div>
</template>
