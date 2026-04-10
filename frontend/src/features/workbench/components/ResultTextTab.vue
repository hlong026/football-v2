<script setup lang="ts">
type OverviewItem = {
  label: string
  value: string
}

const props = defineProps<{
  title: string
  copyLabel: string
  cardTitle: string
  cardDescription: string
  displayText: string
  overviewCards: OverviewItem[]
  onCopy: () => void
}>()
</script>

<template>
  <div class="result-shell">
    <div class="result-toolbar">
      <h3>{{ props.title }}</h3>
      <button class="secondary small-button" @click="props.onCopy">{{ props.copyLabel }}</button>
    </div>
    <div class="summary-grid result-overview-grid">
      <div v-for="item in props.overviewCards" :key="item.label" class="summary-card result-summary-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>
    <div class="result-content-card result-content-code-card">
      <div class="result-card-head compact-head">
        <h4>{{ props.cardTitle }}</h4>
        <p>{{ props.cardDescription }}</p>
      </div>
      <pre>{{ props.displayText }}</pre>
    </div>
  </div>
</template>
