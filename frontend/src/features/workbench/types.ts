export type RecordListItem = {
  file_name: string
  site: string
  match_key: string
  display_title?: string | null
  home_team?: string | null
  away_team?: string | null
  created_at: string
  absolute_path: string
  relative_path: string
}

export type EuropeanOddsLite = {
  institution_name: string
  home_probability: number
  draw_probability: number
  away_probability: number
  latest_home: number
  latest_draw: number
  latest_away: number
}

export type AsianHandicapLite = {
  institution_name: string
  initial_home_water?: number
  initial_handicap?: string
  initial_away_water?: number
  latest_home_water: number
  latest_handicap: string
  latest_away_water: number
}

export type EuropeanOddsChangeLite = {
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

export type AsianHandicapChangeLite = {
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

export type EuropeanOddsDetailLite = {
  institution_id?: number
  institution_name?: string
  page?: ScrapedPageLite
  all_records_count?: number
  matched_records_count?: number
  records?: EuropeanOddsChangeLite[]
}

export type AsianHandicapDetailLite = {
  institution_id?: number
  institution_name?: string
  page?: ScrapedPageLite
  all_records_count?: number
  matched_records_count?: number
  records?: AsianHandicapChangeLite[]
}

export type StructuredMatchLite = {
  match_key?: string
  source_url?: string
  home_team?: string | null
  away_team?: string | null
  anchor_start_time?: string | null
  anchor_end_time?: string | null
  anchor_start_time_display?: string | null
  anchor_end_time_display?: string | null
  selected_european_companies?: string[]
  selected_asian_companies?: string[]
  parsed?: {
    host?: string
    path?: string
    match_id?: string
    normalized_url?: string
  }
  pages?: Record<string, ScrapedPageLite>
  average_european_odds?: EuropeanOddsLite
  average_asian_handicap?: AsianHandicapLite
  european_odds?: EuropeanOddsLite[]
  asian_handicap?: AsianHandicapLite[]
  european_odds_details?: EuropeanOddsDetailLite[]
  asian_handicap_details?: AsianHandicapDetailLite[]
}

export type RecordDetail = {
  match_key?: string
  created_at?: string
  source_url?: string
  home_team?: string | null
  away_team?: string | null
  scraped_payload?: {
    home_team?: string | null
    away_team?: string | null
    parsed?: StructuredMatchLite['parsed']
    pages?: Record<string, ScrapedPageLite>
    average_european_odds?: EuropeanOddsLite
    average_asian_handicap?: AsianHandicapLite
    european_odds?: EuropeanOddsLite[]
    asian_handicap?: AsianHandicapLite[]
    european_odds_details?: EuropeanOddsDetailLite[]
    asian_handicap_details?: AsianHandicapDetailLite[]
    anchor_start_time?: string | null
    anchor_end_time?: string | null
    anchor_start_time_display?: string | null
    anchor_end_time_display?: string | null
  }
  analysis_payload?: {
    success?: boolean
    raw_response?: string | null
    error_message?: string | null
  }
}

export type ResultTab = 'structured' | 'preview' | 'analysis' | 'history'
export type HistorySort = 'newest' | 'oldest' | 'match_key'
export type HistoryRange = 'all' | 'today' | '7d' | '30d'
export type RecordFocus = 'all' | 'pinned' | 'favorited' | 'important'
export type RecordMarkField = 'pinned' | 'favorited' | 'important'
export type RecordMarkState = {
  pinned: boolean
  favorited: boolean
  important: boolean
}
export type RecordCustomization = {
  title: string
  note: string
  tags: string
}
export type AnalysisSectionKey = 'tendency' | 'risk' | 'basis' | 'advice'
export type AnalysisDirectionTag = '偏主' | '偏客' | '偏平' | '观望'
export type AnalysisCardTone = 'primary' | 'accent' | 'warning' | 'success'
export type AnalysisConclusionCard = {
  label: string
  hint: string
  value: string
  fullValue: string
  tone: AnalysisCardTone
  layout?: 'default' | 'comparison' | 'advice'
  subValue?: string
  leftLabel?: string
  leftValue?: string
  rightLabel?: string
  rightValue?: string
}
export type AnalysisView = {
  headline: string
  headlineFull: string
  lead: string
  leadFull: string
  directionTag: AnalysisDirectionTag
  summaryPoints: string[]
  raw: string
  hasContent: boolean
}
export type AnalysisSectionCard = {
  key: AnalysisSectionKey
  title: string
  hint: string
  items: string[]
}
export type AnalysisRunResult = {
  success?: boolean
  raw_response?: string | null
  error_message?: string | null
}
export type WorkflowStepItem = {
  key: 'input' | 'diagnostic' | 'structured' | 'analysis' | 'history'
  label: string
  statusLabel: string
  description: string
  state: 'done' | 'current' | 'idle'
}
export type PersistedFormDraft = {
  site?: string
  matchUrl?: string
  anchorStartTime?: string
  anchorEndTime?: string
  aiProvider?: 'deepseek' | 'openai'
  apiEndpoint?: string
  apiKey?: string
  modelName?: string
  temperature?: string
  maxTokens?: string
  promptText?: string
  promptName?: string
  europeanCompanies?: string
  asianCompanies?: string
  fetchCookie?: string
  activeResultTab?: ResultTab
  modelSettingsSavedAt?: string
  analysisSettingsSavedAt?: string
  fetchSettingsSavedAt?: string
}
export type AIConnectionTestResult = {
  success: boolean
  provider: string
  model_name: string
  endpoint: string
  message: string
}
export type SavedFetchSettingsResponse = {
  cookie: string | null
  cookies: string[]
  updated_at: string | null
}
export type SavedAISettingsResponse = {
  provider: 'deepseek' | 'openai' | 'ollama'
  api_endpoint: string
  api_key: string | null
  model_name: string
  temperature: number | null
  max_tokens: number | null
  updated_at: string | null
}
export type SavedAnalysisSettingsResponse = {
  bookmaker_selection: {
    european: string[]
    asian: string[]
  }
  prompt_config: {
    prompt_name: string
    prompt_text: string
  }
  updated_at: string | null
}
export type HistoryGroupItem = {
  matchKey: string
  count: number
  latestCreatedAt: string
  badges: string[]
}
export type ScrapedPageLite = {
  page_url?: string
  html_length?: number
  fetched?: boolean
  title?: string | null
  status_code?: number | null
  final_url?: string | null
  error_message?: string | null
}
export type PageStatusItem = {
  key: string
  label: string
  pageUrl: string
  htmlLength: number
  fetched: boolean
  title: string
  statusCode: number | null
  finalUrl: string
  errorMessage: string
}
export type DiagnosticCard = {
  title: string
  tone: 'warning' | 'info'
  summary: string
  points: string[]
}
export type ParseSummary = {
  odds_fetched?: boolean
  asian_fetched?: boolean
  european_count?: number
  asian_count?: number
}
export type CookieDiagnostic = {
  index?: number
  label?: string
  cookie_preview?: string
  valid?: boolean
  success_rate?: number
  fetched_page_count?: number
  failed_page_count?: number
  parse_summary?: ParseSummary
  last_error?: string | null
  last_failed_page?: string | null
}
export type CookieHealthItem = {
  index: number
  label: string
  cookiePreview: string
  rawValue: string
  valid: boolean
  recommended: boolean
  statusLabel: string
  statusTone: 'success' | 'error'
  successRateText: string
  successRateValue: number
  fetchedPageCount: number
  failedPageCount: number
  europeanCount: number
  asianCount: number
  lastFailedPage: string
  lastError: string
}
export type CookieTestResult = {
  valid?: boolean
  match_key?: string
  cookie_count?: number
  healthy_cookie_count?: number
  fetched_pages?: string[]
  failed_pages?: Array<{
    key?: string
    page_url?: string
    status_code?: number | null
    final_url?: string | null
    error_message?: string | null
  }>
  pages?: Record<string, ScrapedPageLite>
  parse_summary?: ParseSummary
  cookie_diagnostics?: CookieDiagnostic[]
  suggestions?: string[]
}
