from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class SiteType(str, Enum):
    OKOOO = "okooo"


class AIProvider(str, Enum):
    OPENAI = "openai"
    OLLAMA = "ollama"
    DEEPSEEK = "deepseek"


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


class AIConnectionTestResponse(BaseModel):
    success: bool
    provider: AIProvider
    model_name: str
    endpoint: str
    message: str


class PromptConfigPayload(BaseModel):
    prompt_text: str = ""
    prompt_name: str = "default"


class AnalysisSettingsPayload(BaseModel):
    bookmaker_selection: BookmakerSelection = Field(default_factory=BookmakerSelection)
    prompt_config: PromptConfigPayload = Field(default_factory=PromptConfigPayload)


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
    updated_at: datetime | None = None


class SavedAnalysisSettingsResponse(BaseModel):
    bookmaker_selection: BookmakerSelection = Field(default_factory=BookmakerSelection)
    prompt_config: PromptConfigPayload = Field(default_factory=PromptConfigPayload)
    updated_at: datetime | None = None


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
    prompt_config: PromptConfigPayload = Field(default_factory=PromptConfigPayload)
    fetch_config: FetchConfigPayload = Field(default_factory=FetchConfigPayload)
    structured_match: StructuredMatchResponse | None = None


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


class AnalysisPreviewResponse(BaseModel):
    site: SiteType
    match_key: str
    model_name: str
    prompt_name: str
    system_prompt: str
    user_prompt: str
    structured_payload: dict[str, Any]


class AnalysisRunResponse(BaseModel):
    site: SiteType
    match_key: str
    model_name: str
    prompt_name: str
    success: bool
    request_preview: AnalysisPreviewResponse
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
