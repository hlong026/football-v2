import type { ResultTab } from './types'

export const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8010/api'
export const formDraftStorageKey = 'football-analysis-v2-form-draft'
export const sampleMatchUrl = 'https://www.okooo.com/soccer/match/1234567/odds/'
export const expectedEuropeanTargetCount = 14
export const expectedAsianTargetCount = 7
export const defaultTemperature = '0.1'
export const defaultMaxTokens = '25600'
export const defaultTopP = '1'
export const defaultPresencePenalty = '0'
export const defaultFrequencyPenalty = '0'
export const defaultTimeoutSeconds = '180'
export const defaultApiEndpoint = 'https://api.deepseek.com/v1'
export const defaultModelName = 'deepseek-chat'
export const defaultDoubaoApiEndpoint = 'https://operator.las.cn-beijing.volces.com/api/v1'
export const defaultDoubaoModelName = 'doubao-1-5-pro-32k-250115'
export const defaultPromptName = 'default'
export const defaultSite = 'okooo'
export const defaultEuropeanCompanies = '澳门,William Hill,Ladbrokes,bwin,Coral,SNAI,Bet365,Interwetten,Pinnacle,betvictor,Easybet,Crown,金宝博,bet-at-home'
export const defaultAsianCompanies = '澳门,Bet365,betvictor,Easybet,Crown,金宝博,Pinnacle'
export const resultTabLabels: Record<ResultTab, string> = {
  structured: '结构化结果',
  preview: '分析预览',
  analysis: '正式分析',
}
