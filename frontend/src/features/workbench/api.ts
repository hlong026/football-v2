import { backendBaseUrl } from './constants'
import { normalizeOptionalNumericInput } from './storage'
import { splitCompanies, splitCookies } from './utils'
import type { SavedAISettingsResponse, SavedAnalysisSettingsResponse, SavedFetchSettingsResponse } from './types'

type BuildPayloadInput = {
  site: string
  matchUrl: string
  anchorStartTime: string
  anchorEndTime: string
  aiProvider: 'deepseek' | 'openai'
  apiEndpoint: string
  apiKey: string
  modelName: string
  temperature: string | number
  maxTokens: string | number
  promptName: string
  promptText: string
  europeanCompanies: string
  asianCompanies: string
  fetchCookie: string
  structuredMatch?: unknown
}

export function buildPayload(input: BuildPayloadInput) {
  const normalizedTemperature = normalizeOptionalNumericInput(input.temperature)
  const normalizedMaxTokens = normalizeOptionalNumericInput(input.maxTokens)
  const cookieItems = splitCookies(input.fetchCookie)
  return {
    site: input.site.trim(),
    match_url: input.matchUrl.trim(),
    anchor_start_time: new Date(input.anchorStartTime).toISOString(),
    anchor_end_time: input.anchorEndTime ? new Date(input.anchorEndTime).toISOString() : null,
    bookmaker_selection: {
      european: splitCompanies(input.europeanCompanies.trim()),
      asian: splitCompanies(input.asianCompanies.trim()),
    },
    ai_config: {
      provider: input.aiProvider,
      api_endpoint: input.apiEndpoint.trim(),
      api_key: input.apiKey.trim() || null,
      model_name: input.modelName.trim(),
      temperature: normalizedTemperature ? Number(normalizedTemperature) : null,
      max_tokens: normalizedMaxTokens ? Number(normalizedMaxTokens) : null,
    },
    prompt_config: {
      prompt_name: input.promptName.trim() || 'default',
      prompt_text: input.promptText.trim(),
    },
    fetch_config: {
      cookie: cookieItems[0] || null,
      cookies: cookieItems,
    },
    structured_match: input.structuredMatch ?? null,
  }
}

export async function getResponseError(response: Response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const payload = await response.json()
    return payload.detail || payload.message || JSON.stringify(payload)
  }
  return (await response.text()) || '请求失败'
}

export async function callWorkbenchPost(path: string, payloadInput: BuildPayloadInput) {
  const payload = buildPayload(payloadInput)
  console.log(`[DEBUG] POST ${backendBaseUrl}${path}`, JSON.stringify({
    eu_companies: payload.bookmaker_selection.european,
    ah_companies: payload.bookmaker_selection.asian,
    cookie_count: payload.fetch_config.cookies.length,
    match_url: payload.match_url,
  }))
  const response = await fetch(`${backendBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(await getResponseError(response))
  }
  const result = await response.json()
  if (path.includes('test-cookie')) {
    console.log('[DEBUG] test-cookie response parse_summary:', JSON.stringify(result.parse_summary))
    console.log('[DEBUG] test-cookie suggestions:', result.suggestions)
  }
  return result
}

export async function callWorkbenchGet(path: string) {
  const response = await fetch(`${backendBaseUrl}${path}`)
  if (!response.ok) {
    throw new Error(await getResponseError(response))
  }
  return response.json()
}

export async function loadServerFetchSettings(): Promise<SavedFetchSettingsResponse> {
  const response = await fetch(`${backendBaseUrl}/settings/fetch`)
  if (!response.ok) {
    throw new Error(await getResponseError(response))
  }
  return response.json()
}

export async function loadServerAISettings(): Promise<SavedAISettingsResponse> {
  const response = await fetch(`${backendBaseUrl}/settings/ai`)
  if (!response.ok) {
    throw new Error(await getResponseError(response))
  }
  return response.json()
}

export async function saveServerAISettings(input: {
  aiProvider: 'deepseek' | 'openai'
  apiEndpoint: string
  apiKey: string
  modelName: string
  temperature: string | number
  maxTokens: string | number
}): Promise<SavedAISettingsResponse> {
  const normalizedTemperature = normalizeOptionalNumericInput(input.temperature)
  const normalizedMaxTokens = normalizeOptionalNumericInput(input.maxTokens)
  const response = await fetch(`${backendBaseUrl}/settings/ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider: input.aiProvider,
      api_endpoint: input.apiEndpoint.trim(),
      api_key: input.apiKey.trim() || null,
      model_name: input.modelName.trim(),
      temperature: normalizedTemperature ? Number(normalizedTemperature) : null,
      max_tokens: normalizedMaxTokens ? Number(normalizedMaxTokens) : null,
    }),
  })
  if (!response.ok) {
    throw new Error(await getResponseError(response))
  }
  return response.json()
}

export async function loadServerAnalysisSettings(): Promise<SavedAnalysisSettingsResponse> {
  const response = await fetch(`${backendBaseUrl}/settings/analysis`)
  if (!response.ok) {
    throw new Error(await getResponseError(response))
  }
  return response.json()
}

export async function saveServerAnalysisSettings(input: {
  europeanCompanies: string
  asianCompanies: string
  promptName: string
  promptText: string
}): Promise<SavedAnalysisSettingsResponse> {
  const response = await fetch(`${backendBaseUrl}/settings/analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bookmaker_selection: {
        european: splitCompanies(input.europeanCompanies.trim()),
        asian: splitCompanies(input.asianCompanies.trim()),
      },
      prompt_config: {
        prompt_name: input.promptName.trim() || 'default',
        prompt_text: input.promptText.trim(),
      },
    }),
  })
  if (!response.ok) {
    throw new Error(await getResponseError(response))
  }
  return response.json()
}

export async function saveServerFetchSettings(fetchCookie: string): Promise<SavedFetchSettingsResponse> {
  const cookieItems = splitCookies(fetchCookie)
  const response = await fetch(`${backendBaseUrl}/settings/fetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cookie: cookieItems[0] || null,
      cookies: cookieItems,
    }),
  })
  if (!response.ok) {
    throw new Error(await getResponseError(response))
  }
  return response.json()
}
