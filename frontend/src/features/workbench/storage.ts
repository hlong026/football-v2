import {
  defaultApiEndpoint,
  defaultAsianCompanies,
  defaultEuropeanCompanies,
  defaultMaxTokens,
  defaultModelName,
  defaultPromptName,
  defaultSite,
  defaultTemperature,
} from './constants'
import type { PersistedFormDraft, RecordCustomization, RecordMarkState, ResultTab } from './types'

export function defaultRecordMarkState(): RecordMarkState {
  return {
    pinned: false,
    favorited: false,
    important: false,
  }
}

export function normalizeRecordMarkState(value: unknown): RecordMarkState {
  if (!value || typeof value !== 'object') {
    return defaultRecordMarkState()
  }
  const input = value as Partial<RecordMarkState>
  return {
    pinned: Boolean(input.pinned),
    favorited: Boolean(input.favorited),
    important: Boolean(input.important),
  }
}

export function loadStoredRecordMarks(storageKey: string): Record<string, RecordMarkState> {
  if (typeof window === 'undefined') {
    return {}
  }
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, normalizeRecordMarkState(value)]))
  } catch {
    return {}
  }
}

export function persistRecordMarks(storageKey: string, recordMarks: Record<string, RecordMarkState>) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(storageKey, JSON.stringify(recordMarks))
}

export function defaultRecordCustomization(): RecordCustomization {
  return {
    title: '',
    note: '',
    tags: '',
  }
}

export function normalizeRecordCustomization(value: unknown): RecordCustomization {
  if (!value || typeof value !== 'object') {
    return defaultRecordCustomization()
  }
  const input = value as Partial<RecordCustomization>
  return {
    title: normalizeDraftString(input.title),
    note: normalizeDraftString(input.note),
    tags: normalizeDraftString(input.tags),
  }
}

export function loadStoredRecordCustomizations(storageKey: string): Record<string, RecordCustomization> {
  if (typeof window === 'undefined') {
    return {}
  }
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, normalizeRecordCustomization(value)]))
  } catch {
    return {}
  }
}

export function persistRecordCustomizations(storageKey: string, recordCustomizations: Record<string, RecordCustomization>) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(storageKey, JSON.stringify(recordCustomizations))
}

export function normalizeDraftString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

export function normalizeOptionalNumericInput(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeDraftTemperature(value: unknown) {
  const normalized = normalizeDraftString(value)
  if (!normalized || normalized === '0.2') {
    return defaultTemperature
  }
  return normalized
}

function normalizeDraftMaxTokens(value: unknown) {
  const normalized = normalizeDraftString(value)
  if (!normalized || normalized === '4000') {
    return defaultMaxTokens
  }
  return normalized
}

export function loadStoredFormDraft(storageKey: string, resultTabs: Record<ResultTab, string>): PersistedFormDraft {
  if (typeof window === 'undefined') {
    return {}
  }
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw) as Partial<PersistedFormDraft>
    return {
      site: normalizeDraftString(parsed.site, defaultSite),
      matchUrl: normalizeDraftString(parsed.matchUrl),
      anchorStartTime: normalizeDraftString(parsed.anchorStartTime),
      anchorEndTime: normalizeDraftString(parsed.anchorEndTime),
      aiProvider: parsed.aiProvider === 'openai' ? 'openai' : 'deepseek',
      apiEndpoint: normalizeDraftString(parsed.apiEndpoint, defaultApiEndpoint),
      apiKey: normalizeDraftString(parsed.apiKey),
      modelName: normalizeDraftString(parsed.modelName, defaultModelName),
      temperature: normalizeDraftTemperature(parsed.temperature),
      maxTokens: normalizeDraftMaxTokens(parsed.maxTokens),
      promptText: normalizeDraftString(parsed.promptText),
      promptName: normalizeDraftString(parsed.promptName, defaultPromptName),
      europeanCompanies: normalizeDraftString(parsed.europeanCompanies, defaultEuropeanCompanies),
      asianCompanies: normalizeDraftString(parsed.asianCompanies, defaultAsianCompanies),
      fetchCookie: normalizeDraftString(parsed.fetchCookie),
      activeResultTab: parsed.activeResultTab && parsed.activeResultTab in resultTabs ? parsed.activeResultTab : 'analysis',
      modelSettingsSavedAt: normalizeDraftString(parsed.modelSettingsSavedAt),
      analysisSettingsSavedAt: normalizeDraftString(parsed.analysisSettingsSavedAt),
      fetchSettingsSavedAt: normalizeDraftString(parsed.fetchSettingsSavedAt),
    }
  } catch {
    return {}
  }
}

export function persistFormDraft(storageKey: string, draft: PersistedFormDraft) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(storageKey, JSON.stringify(draft))
}
