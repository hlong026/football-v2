from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, HttpUrl, model_validator


class SiteType(str, Enum):
    OKOOO = "okooo"


class AIProvider(str, Enum):
    OPENAI = "openai"
    DEEPSEEK = "deepseek"
    DOUBAO = "doubao"


DOUBAO_DEFAULT_API_ENDPOINT = "https://operator.las.cn-beijing.volces.com/api/v1"
DOUBAO_DEFAULT_MODEL_NAME = "doubao-1-5-pro-32k-250115"


def _normalize_ai_payload(data: Any) -> Any:
    if not isinstance(data, dict):
        return data
    provider_value = data.get("provider") or AIProvider.DEEPSEEK.value
    if isinstance(provider_value, AIProvider):
        provider = provider_value.value
    else:
        provider = str(provider_value).strip().lower()
    if provider != AIProvider.DOUBAO.value:
        return data
    cloned = dict(data)
    api_endpoint = str(cloned.get("api_endpoint") or "").strip()
    model_name = str(cloned.get("model_name") or "").strip()
    if not api_endpoint or api_endpoint == "https://api.deepseek.com/v1":
        cloned["api_endpoint"] = DOUBAO_DEFAULT_API_ENDPOINT
    if not model_name or model_name in {"deepseek-chat", "deepseek-reasoner"}:
        cloned["model_name"] = DOUBAO_DEFAULT_MODEL_NAME
    return cloned


class AnalysisStage(str, Enum):
    EUROPEAN = "european"
    ASIAN_BASE = "asian_base"
    FINAL = "final"


class BookmakerSelection(BaseModel):
    european: list[str] = Field(default_factory=list)
    asian: list[str] = Field(default_factory=list)


class AIConfigPayload(BaseModel):
    provider: AIProvider = AIProvider.DEEPSEEK
    api_endpoint: str = "https://api.deepseek.com/v1"
    api_key: str | None = None
    model_name: str = "deepseek-reasoner"
    temperature: float | None = 0.1
    max_tokens: int | None = 25600
    top_p: float | None = 1.0
    presence_penalty: float | None = 0.0
    frequency_penalty: float | None = 0.0
    timeout_seconds: int | None = 180

    @model_validator(mode="before")
    @classmethod
    def normalize_ai_provider_defaults(cls, data: Any) -> Any:
        return _normalize_ai_payload(data)


class AIConnectionTestResponse(BaseModel):
    success: bool
    provider: AIProvider
    model_name: str
    endpoint: str
    message: str


class PromptConfigPayload(BaseModel):
    prompt_text: str = ""
    prompt_name: str = "default"


class AnalysisPromptSetPayload(BaseModel):
    european: PromptConfigPayload = Field(default_factory=lambda: PromptConfigPayload(prompt_name="european"))
    asian_base: PromptConfigPayload = Field(default_factory=lambda: PromptConfigPayload(prompt_name="asian_base"))
    final: PromptConfigPayload = Field(default_factory=lambda: PromptConfigPayload(prompt_name="final"))


def _normalize_prompt_set_payload(data: Any) -> Any:
    if not isinstance(data, dict):
        return data
    prompt_set = data.get("prompt_set")
    prompt_config = data.get("prompt_config")
    if prompt_set:
        return data
    if isinstance(prompt_config, dict):
        cloned = dict(data)
        cloned["prompt_set"] = {
            "european": dict(prompt_config),
            "asian_base": dict(prompt_config),
            "final": dict(prompt_config),
        }
        return cloned
    return data


class AnalysisSettingsPayload(BaseModel):
    bookmaker_selection: BookmakerSelection = Field(default_factory=BookmakerSelection)
    prompt_set: AnalysisPromptSetPayload = Field(default_factory=AnalysisPromptSetPayload)
    prompt_config: PromptConfigPayload | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_prompt_set(cls, data: Any) -> Any:
        return _normalize_prompt_set_payload(data)


class UpstreamStageTextPayload(BaseModel):
    european: str | None = None
    asian_base: str | None = None


class FetchConfigPayload(BaseModel):
    cookie: str | None = None
    cookies: list[str] = Field(default_factory=list)


class SavedAISettingsResponse(BaseModel):
    provider: AIProvider = AIProvider.DEEPSEEK
    api_endpoint: str = "https://api.deepseek.com/v1"
    api_key: str | None = None
    model_name: str = "deepseek-reasoner"
    temperature: float | None = 0.1
    max_tokens: int | None = 25600
    top_p: float | None = 1.0
    presence_penalty: float | None = 0.0
    frequency_penalty: float | None = 0.0
    timeout_seconds: int | None = 180
    updated_at: datetime | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_ai_provider_defaults(cls, data: Any) -> Any:
        return _normalize_ai_payload(data)


class SavedAnalysisSettingsResponse(BaseModel):
    bookmaker_selection: BookmakerSelection = Field(default_factory=BookmakerSelection)
    prompt_set: AnalysisPromptSetPayload = Field(default_factory=AnalysisPromptSetPayload)
    prompt_config: PromptConfigPayload | None = None
    updated_at: datetime | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_prompt_set(cls, data: Any) -> Any:
        return _normalize_prompt_set_payload(data)


class SavedFetchSettingsResponse(BaseModel):
    cookie: str | None = None
    cookies: list[str] = Field(default_factory=list)
    updated_at: datetime | None = None


class MatchPreparationRequest(BaseModel):
    site: SiteType
    match_url: HttpUrl
    anchor_start_time: datetime
    anchor_end_time: datetime | None = None
    bookmaker_selection: BookmakerSelection = Field(default_factory=BookmakerSelection)
    ai_config: AIConfigPayload = Field(default_factory=AIConfigPayload)
    prompt_set: AnalysisPromptSetPayload = Field(default_factory=AnalysisPromptSetPayload)
    prompt_config: PromptConfigPayload | None = None
    fetch_config: FetchConfigPayload = Field(default_factory=FetchConfigPayload)
    structured_match: StructuredMatchResponse | None = None
    upstream_stage_texts: UpstreamStageTextPayload = Field(default_factory=UpstreamStageTextPayload)

    @model_validator(mode="before")
    @classmethod
    def normalize_prompt_set(cls, data: Any) -> Any:
        return _normalize_prompt_set_payload(data)


class PreparedMatchResponse(BaseModel):
    site: SiteType
    match_url: str
    match_key: str
    parsed: dict[str, Any]
    anchor_start_time: datetime
    anchor_end_time: datetime | None = None
    selected_european_companies: list[str] = Field(default_factory=list)
    selected_asian_companies: list[str] = Field(default_factory=list)
    ai_provider: AIProvider
    model_name: str
    prompt_name: str


class ScrapedPagePayload(BaseModel):
    page_url: str
    html_length: int
    fetched: bool
    title: str | None = None
    status_code: int | None = None
    final_url: str | None = None
    error_message: str | None = None


class ScrapeMatchResponse(BaseModel):
    site: SiteType
    match_key: str
    source_url: str
    pages: dict[str, ScrapedPagePayload]
    parsed: dict[str, Any]


class EuropeanOddsRow(BaseModel):
    institution_id: int
    institution_name: str
    country: str
    initial_home: float
    initial_draw: float
    initial_away: float
    latest_home: float
    latest_draw: float
    latest_away: float
    home_probability: float
    draw_probability: float
    away_probability: float
    kelly_home: float
    kelly_draw: float
    kelly_away: float
    return_rate: float
    update_timestamp: int


class AsianHandicapRow(BaseModel):
    institution_id: int
    institution_name: str
    initial_home_water: float
    initial_handicap: str
    initial_away_water: float
    latest_home_water: float
    latest_handicap: str
    latest_away_water: float
    kelly_home: float
    kelly_away: float
    payoff: float
    update_timestamp: int


class EuropeanOddsChangeRecord(BaseModel):
    change_time: str
    change_time_iso: str | None = None
    time_before_match: str
    home_odds: float
    draw_odds: float
    away_odds: float
    home_probability: float
    draw_probability: float
    away_probability: float
    kelly_home: float
    kelly_draw: float
    kelly_away: float
    return_rate: float


class AsianHandicapChangeRecord(BaseModel):
    change_time: str
    change_time_iso: str | None = None
    time_before_match: str
    home_water: float
    handicap: str
    away_water: float
    is_initial: bool = False
    is_final: bool = False


class EuropeanOddsDetail(BaseModel):
    institution_id: int
    institution_name: str
    page: ScrapedPagePayload
    all_records_count: int = 0
    matched_records_count: int = 0
    records: list[EuropeanOddsChangeRecord] = Field(default_factory=list)


class AsianHandicapDetail(BaseModel):
    institution_id: int
    institution_name: str
    page: ScrapedPagePayload
    all_records_count: int = 0
    matched_records_count: int = 0
    records: list[AsianHandicapChangeRecord] = Field(default_factory=list)


class StructuredMatchResponse(BaseModel):
    site: SiteType
    match_key: str
    source_url: str
    home_team: str | None = None
    away_team: str | None = None
    anchor_start_time: datetime | None = None
    anchor_end_time: datetime | None = None
    selected_european_companies: list[str] = Field(default_factory=list)
    selected_asian_companies: list[str] = Field(default_factory=list)
    parsed: dict[str, Any]
    pages: dict[str, ScrapedPagePayload]
    average_european_odds: EuropeanOddsRow | None = None
    european_odds: list[EuropeanOddsRow] = Field(default_factory=list)
    average_asian_handicap: AsianHandicapRow | None = None
    asian_handicap: list[AsianHandicapRow] = Field(default_factory=list)
    european_odds_details: list[EuropeanOddsDetail] = Field(default_factory=list)
    asian_handicap_details: list[AsianHandicapDetail] = Field(default_factory=list)


class TimeWindowPayload(BaseModel):
    requested_start_time: datetime
    requested_end_time: datetime | None = None
    normalized_start_time_utc: str
    normalized_end_time_utc: str | None = None
    display_timezone: str = "Asia/Shanghai"
    requested_start_time_display: str
    requested_end_time_display: str | None = None


class CompanySelectionMapping(BaseModel):
    market: str
    requested_name: str
    normalized_name: str
    matched: bool
    matched_institution_id: int | None = None
    matched_institution_name: str | None = None


class CleanedEuropeanOddsRecord(BaseModel):
    change_time: str
    change_time_iso: str | None = None
    change_time_display: str | None = None
    home_probability: float
    draw_probability: float
    away_probability: float
    kelly_home: float
    kelly_draw: float
    kelly_away: float
    return_rate: float


class CleanedAsianHandicapRecord(BaseModel):
    change_time: str
    change_time_iso: str | None = None
    change_time_display: str | None = None
    home_water: float
    handicap: str
    away_water: float


class CleanedEuropeanInstitutionPayload(BaseModel):
    institution_id: int
    institution_name: str
    all_records_count: int = 0
    matched_records_count: int = 0
    dropped_first_row: bool = False
    records: list[CleanedEuropeanOddsRecord] = Field(default_factory=list)


class CleanedAsianInstitutionPayload(BaseModel):
    institution_id: int
    institution_name: str
    all_records_count: int = 0
    matched_records_count: int = 0
    records: list[CleanedAsianHandicapRecord] = Field(default_factory=list)


class CleanedMatchStats(BaseModel):
    requested_european_company_count: int = 0
    matched_european_company_count: int = 0
    requested_asian_company_count: int = 0
    matched_asian_company_count: int = 0
    raw_european_record_count: int = 0
    cleaned_european_record_count: int = 0
    raw_asian_record_count: int = 0
    cleaned_asian_record_count: int = 0
    dropped_european_first_row_count: int = 0


class PipelineStoragePaths(BaseModel):
    raw_structured_path: str
    cleaned_structured_path: str
    meta_path: str
    analysis_input_paths: dict[str, str] = Field(default_factory=dict)
    analysis_output_paths: dict[str, str] = Field(default_factory=dict)


class CleanedMatchResponse(BaseModel):
    site: SiteType
    match_key: str
    source_url: str
    requested_match_url: str
    home_team: str | None = None
    away_team: str | None = None
    matchup: str | None = None
    analysis_scope: str
    parsed_request: dict[str, Any]
    page_context: list[dict[str, Any]] = Field(default_factory=list)
    bookmaker_selection: BookmakerSelection = Field(default_factory=BookmakerSelection)
    time_window: TimeWindowPayload
    company_mappings: list[CompanySelectionMapping] = Field(default_factory=list)
    european: list[CleanedEuropeanInstitutionPayload] = Field(default_factory=list)
    asian_handicap: list[CleanedAsianInstitutionPayload] = Field(default_factory=list)
    stats: CleanedMatchStats = Field(default_factory=CleanedMatchStats)
    storage_paths: PipelineStoragePaths | None = None


class StageAnalysisPreview(BaseModel):
    stage: AnalysisStage
    prompt_name: str
    system_prompt: str
    user_prompt: str
    structured_payload: dict[str, Any]


class AnalysisPreviewResponse(BaseModel):
    site: SiteType
    match_key: str
    model_name: str
    stages: dict[str, StageAnalysisPreview] = Field(default_factory=dict)


class StageAnalysisSummary(BaseModel):
    direction: str | None = None
    statement: str | None = None
    final_direction: str | None = None
    final_statement: str | None = None
    european_view: str | None = None
    asian_base_view: str | None = None
    cross_market_consensus: str | None = None
    key_points: list[str] = Field(default_factory=list)
    key_evidence: list[str] = Field(default_factory=list)
    risk_level: str | None = None
    risk_notes: list[str] = Field(default_factory=list)
    action_advice: str | None = None
    time_scope_summary: str | None = None
    company_scope_summary: str | None = None


class StageAnalysisResult(BaseModel):
    stage: AnalysisStage
    prompt_name: str
    success: bool
    request_preview: StageAnalysisPreview
    summary: StageAnalysisSummary | None = None
    raw_response: str | None = None
    error_message: str | None = None


class StageRunRequest(MatchPreparationRequest):
    stage: AnalysisStage


class StageRunResponse(BaseModel):
    site: SiteType
    match_key: str
    model_name: str
    stage: AnalysisStage
    stage_result: StageAnalysisResult
    request_preview: AnalysisPreviewResponse
    error_message: str | None = None


class AnalysisRunResponse(BaseModel):
    site: SiteType
    match_key: str
    model_name: str
    success: bool
    request_preview: AnalysisPreviewResponse
    european_result: StageAnalysisResult
    asian_base_result: StageAnalysisResult
    final_result: StageAnalysisResult
    raw_response: str | None = None
    error_message: str | None = None


class ArchivedAnalysisRecord(BaseModel):
    site: SiteType
    match_key: str
    source_url: str
    created_at: datetime = Field(default_factory=datetime.now)
    request_payload: dict[str, Any]
    scraped_payload: dict[str, Any] = Field(default_factory=dict)
    analysis_payload: dict[str, Any] = Field(default_factory=dict)


class ArchivedRecordItem(BaseModel):
    file_name: str
    site: str
    match_key: str
    display_title: str | None = None
    home_team: str | None = None
    away_team: str | None = None
    created_at: str
    absolute_path: str
    relative_path: str


class SiteMeta(BaseModel):
    key: SiteType
    label: str
    supported: bool
    url_mode: str
