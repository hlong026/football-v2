from fastapi import APIRouter, HTTPException, Query

from app.adapters.site_adapter import SiteAdapterFactory
from app.models.schemas import AIConfigPayload, AIConnectionTestResponse, AnalysisPreviewResponse, AnalysisRunResponse, AnalysisSettingsPayload, ArchivedAnalysisRecord, FetchConfigPayload, MatchPreparationRequest, PreparedMatchResponse, SavedAISettingsResponse, SavedAnalysisSettingsResponse, SavedFetchSettingsResponse, ScrapeMatchResponse, SiteMeta, SiteType, StructuredMatchResponse
from app.services.analysis_service import AnalysisService
from app.services.archive_service import ArchiveService
from app.services.scrape_service import ScrapeService
from app.services.settings_service import SettingsService
from app.services.structured_match_service import StructuredMatchService

router = APIRouter()
archive_service = ArchiveService()
scrape_service = ScrapeService()
settings_service = SettingsService()
structured_match_service = StructuredMatchService()
analysis_service = AnalysisService()


def resolve_fetch_config(fetch_config: FetchConfigPayload) -> FetchConfigPayload:
    return settings_service.resolve_fetch_config(fetch_config)


async def resolve_structured_match(request: MatchPreparationRequest) -> StructuredMatchResponse:
    effective_fetch_config = resolve_fetch_config(request.fetch_config)
    structured = request.structured_match
    if (
        structured
        and structured.site == request.site
        and structured.source_url == str(request.match_url)
        and structured.anchor_start_time == request.anchor_start_time
        and structured.anchor_end_time == request.anchor_end_time
        and structured.selected_european_companies == request.bookmaker_selection.european
        and structured.selected_asian_companies == request.bookmaker_selection.asian
    ):
        return structured
    return await structured_match_service.build_structured_match(
        request.site,
        str(request.match_url),
        anchor_start_time=request.anchor_start_time,
        anchor_end_time=request.anchor_end_time,
        cookie=effective_fetch_config.cookie,
        cookies=effective_fetch_config.cookies,
        selected_european_companies=request.bookmaker_selection.european,
        selected_asian_companies=request.bookmaker_selection.asian,
    )


@router.get('/health')
def health_check() -> dict:
    return {'status': 'ok', 'service': 'football-analysis-v2'}


@router.get('/sites', response_model=list[SiteMeta])
def list_sites() -> list[SiteMeta]:
    return [
        SiteMeta(key=SiteType.OKOOO, label='澳客网', supported=True, url_mode='manual_match_url'),
    ]


@router.get('/settings/fetch', response_model=SavedFetchSettingsResponse)
def get_fetch_settings() -> SavedFetchSettingsResponse:
    return settings_service.load_fetch_settings()


@router.get('/settings/ai', response_model=SavedAISettingsResponse)
def get_ai_settings() -> SavedAISettingsResponse:
    return settings_service.load_ai_settings()


@router.post('/settings/ai', response_model=SavedAISettingsResponse)
def save_ai_settings(ai_config: AIConfigPayload) -> SavedAISettingsResponse:
    return settings_service.save_ai_settings(ai_config)


@router.get('/settings/analysis', response_model=SavedAnalysisSettingsResponse)
def get_analysis_settings() -> SavedAnalysisSettingsResponse:
    return settings_service.load_analysis_settings()


@router.post('/settings/analysis', response_model=SavedAnalysisSettingsResponse)
def save_analysis_settings(analysis_settings: AnalysisSettingsPayload) -> SavedAnalysisSettingsResponse:
    return settings_service.save_analysis_settings(analysis_settings)


@router.post('/settings/fetch', response_model=SavedFetchSettingsResponse)
def save_fetch_settings(fetch_config: FetchConfigPayload) -> SavedFetchSettingsResponse:
    return settings_service.save_fetch_settings(fetch_config)


@router.post('/matches/prepare', response_model=PreparedMatchResponse)
def prepare_match(request: MatchPreparationRequest) -> PreparedMatchResponse:
    adapter = SiteAdapterFactory.get_adapter(request.site)
    parsed = adapter.parse_match_url(str(request.match_url))
    match_key = parsed.get('match_id') or 'unknown'

    return PreparedMatchResponse(
        site=request.site,
        match_url=str(request.match_url),
        match_key=str(match_key),
        parsed=parsed,
        anchor_start_time=request.anchor_start_time,
        anchor_end_time=request.anchor_end_time,
        selected_european_companies=request.bookmaker_selection.european,
        selected_asian_companies=request.bookmaker_selection.asian,
        ai_provider=request.ai_config.provider,
        model_name=request.ai_config.model_name,
        prompt_name=request.prompt_config.prompt_name,
    )


@router.post('/matches/scrape', response_model=ScrapeMatchResponse)
async def scrape_match(request: MatchPreparationRequest) -> ScrapeMatchResponse:
    effective_fetch_config = resolve_fetch_config(request.fetch_config)
    return await scrape_service.scrape_match(
        request.site,
        str(request.match_url),
        cookie=effective_fetch_config.cookie,
        cookies=effective_fetch_config.cookies,
    )


@router.post('/matches/test-cookie')
async def test_cookie(request: MatchPreparationRequest) -> dict:
    effective_fetch_config = resolve_fetch_config(request.fetch_config)
    return await scrape_service.test_cookie(
        request.site,
        str(request.match_url),
        cookie=effective_fetch_config.cookie,
        cookies=effective_fetch_config.cookies,
        selected_european_companies=request.bookmaker_selection.european,
        selected_asian_companies=request.bookmaker_selection.asian,
    )


@router.post('/matches/structured', response_model=StructuredMatchResponse)
async def get_structured_match(request: MatchPreparationRequest) -> StructuredMatchResponse:
    effective_fetch_config = resolve_fetch_config(request.fetch_config)
    return await structured_match_service.build_structured_match(
        request.site,
        str(request.match_url),
        anchor_start_time=request.anchor_start_time,
        anchor_end_time=request.anchor_end_time,
        cookie=effective_fetch_config.cookie,
        cookies=effective_fetch_config.cookies,
        selected_european_companies=request.bookmaker_selection.european,
        selected_asian_companies=request.bookmaker_selection.asian,
    )


@router.post('/analysis/preview', response_model=AnalysisPreviewResponse)
async def preview_analysis(request: MatchPreparationRequest) -> AnalysisPreviewResponse:
    structured = await resolve_structured_match(request)
    return analysis_service.build_preview(request, structured)


@router.post('/analysis/test-connection', response_model=AIConnectionTestResponse)
async def test_analysis_connection(request: MatchPreparationRequest) -> AIConnectionTestResponse:
    return await analysis_service.test_connection(request.ai_config)


@router.post('/analysis/run', response_model=AnalysisRunResponse)
async def run_analysis(request: MatchPreparationRequest) -> AnalysisRunResponse:
    structured = await resolve_structured_match(request)
    result = await analysis_service.run_analysis(request, structured)
    if result.success:
        archive_service.save_record(
            ArchivedAnalysisRecord(
                site=request.site,
                match_key=structured.match_key,
                source_url=str(request.match_url),
                request_payload=result.request_preview.structured_payload,
                scraped_payload=structured.model_dump(),
                analysis_payload=result.model_dump(),
            )
        )
    return result


@router.post('/records/archive')
def archive_record(record: ArchivedAnalysisRecord) -> dict:
    file_path = archive_service.save_record(record)
    return {'saved': True, 'path': str(file_path.resolve())}


@router.get('/records')
def list_archived_records(limit: int = 100) -> dict:
    return {'items': [item.model_dump() for item in archive_service.list_records(limit=limit)]}


@router.get('/records/detail')
def get_archived_record(relative_path: str = Query(..., description='归档文件相对路径')) -> dict:
    try:
        return archive_service.get_record(relative_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
