import {
  defaultApiEndpoint,
  defaultAsianCompanies,
  defaultDoubaoApiEndpoint,
  defaultDoubaoModelName,
  defaultEuropeanCompanies,
  defaultFrequencyPenalty,
  defaultMaxTokens,
  defaultModelName,
  defaultPresencePenalty,
  defaultPromptName,
  defaultSite,
  defaultTemperature,
  defaultTimeoutSeconds,
  defaultTopP,
} from './constants'
import type { PersistedFormDraft, ResultTab } from './types'

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
      aiProvider: parsed.aiProvider === 'openai' ? 'openai' : parsed.aiProvider === 'doubao' ? 'doubao' : 'deepseek',
      apiEndpoint: normalizeDraftString(parsed.apiEndpoint, parsed.aiProvider === 'doubao' ? defaultDoubaoApiEndpoint : defaultApiEndpoint),
      apiKey: normalizeDraftString(parsed.apiKey),
      modelName: normalizeDraftString(parsed.modelName, parsed.aiProvider === 'doubao' ? defaultDoubaoModelName : defaultModelName),
      temperature: normalizeDraftTemperature(parsed.temperature),
      maxTokens: normalizeDraftMaxTokens(parsed.maxTokens),
      topP: normalizeDraftString(parsed.topP, defaultTopP),
      presencePenalty: normalizeDraftString(parsed.presencePenalty, defaultPresencePenalty),
      frequencyPenalty: normalizeDraftString(parsed.frequencyPenalty, defaultFrequencyPenalty),
      timeoutSeconds: normalizeDraftString(parsed.timeoutSeconds, defaultTimeoutSeconds),
      europeanPromptText: normalizeDraftString(parsed.europeanPromptText),
      europeanPromptName: normalizeDraftString(parsed.europeanPromptName, 'european'),
      asianBasePromptText: normalizeDraftString(parsed.asianBasePromptText),
      asianBasePromptName: normalizeDraftString(parsed.asianBasePromptName, 'asian_base'),
      finalPromptText: normalizeDraftString(parsed.finalPromptText),
      finalPromptName: normalizeDraftString(parsed.finalPromptName, defaultPromptName),
      europeanCompanies: normalizeDraftString(parsed.europeanCompanies, defaultEuropeanCompanies),
      asianCompanies: normalizeDraftString(parsed.asianCompanies, defaultAsianCompanies),
      fetchCookie: normalizeDraftString(parsed.fetchCookie),
      europeanStageText: normalizeDraftString(parsed.europeanStageText),
      asianBaseStageText: normalizeDraftString(parsed.asianBaseStageText),
      finalStageText: normalizeDraftString(parsed.finalStageText),
      activeResultTab: parsed.activeResultTab && parsed.activeResultTab in resultTabs ? parsed.activeResultTab : 'analysis',
      modelSettingsSavedAt: normalizeDraftString(parsed.modelSettingsSavedAt),
      analysisSettingsSavedAt: normalizeDraftString(parsed.analysisSettingsSavedAt),
      institutionSettingsSavedAt: normalizeDraftString(parsed.institutionSettingsSavedAt),
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
