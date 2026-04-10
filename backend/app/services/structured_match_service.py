import hashlib
import json
import re
from datetime import datetime, timedelta, timezone

from app.adapters.site_adapter import SiteAdapterFactory
from app.core.config import settings
from app.models.schemas import AsianHandicapDetail, EuropeanOddsDetail, ScrapedPagePayload, SiteType, StructuredMatchResponse
from app.services.parse_service import ParseService
from app.services.scrape_service import ScrapeService


class StructuredMatchService:
    def __init__(self) -> None:
        self.scrape_service = ScrapeService()
        self.parse_service = ParseService()
        self.cache_dir = settings.data_dir / 'structured-cache'
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache_ttl = timedelta(hours=2)

    def _resolve_cache_file(self, site: SiteType, match_url: str):
        adapter = SiteAdapterFactory.get_adapter(site)
        parsed = adapter.parse_match_url(match_url)
        match_key = str(parsed.get('match_id') or match_url.strip())
        cache_token = hashlib.sha1(f'{site.value}:{match_key}'.encode('utf-8')).hexdigest()
        return self.cache_dir / f'{cache_token}.json'

    def _is_cache_fresh(self, cached_at: str) -> bool:
        try:
            cached_time = datetime.fromisoformat(cached_at)
        except ValueError:
            return False
        if cached_time.tzinfo is None:
            cached_time = cached_time.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) - cached_time < self.cache_ttl

    def _load_cached_fetch(self, site: SiteType, match_url: str):
        cache_file = self._resolve_cache_file(site, match_url)
        if not cache_file.exists():
            return None
        try:
            payload = json.loads(cache_file.read_text(encoding='utf-8'))
            cached_at = str(payload.get('cached_at') or '')
            if not self._is_cache_fresh(cached_at):
                cache_file.unlink(missing_ok=True)
                return None
            parsed = payload.get('parsed')
            pages_payload = payload.get('pages')
            raw_html_map_payload = payload.get('raw_html_map')
            if not isinstance(parsed, dict) or not isinstance(pages_payload, dict) or not isinstance(raw_html_map_payload, dict):
                return None
            pages = {key: ScrapedPagePayload.model_validate(value) for key, value in pages_payload.items()}
            raw_html_map = {str(key): value for key, value in raw_html_map_payload.items() if isinstance(value, str)}
            if not raw_html_map.get('odds') or not raw_html_map.get('asian_handicap'):
                return None
            return parsed, pages, raw_html_map
        except Exception:
            return None

    def _save_cached_fetch(self, site: SiteType, match_url: str, parsed: dict, pages: dict[str, ScrapedPagePayload], raw_html_map: dict[str, str]) -> None:
        if not raw_html_map.get('odds') or not raw_html_map.get('asian_handicap'):
            return
        cache_file = self._resolve_cache_file(site, match_url)
        cache_payload = {
            'cached_at': datetime.now(timezone.utc).isoformat(),
            'parsed': parsed,
            'pages': {key: value.model_dump(mode='json') for key, value in pages.items()},
            'raw_html_map': raw_html_map,
        }
        cache_file.write_text(json.dumps(cache_payload, ensure_ascii=False), encoding='utf-8')

    async def _resolve_fetch_pages(
        self,
        site: SiteType,
        match_url: str,
        cookie: str | None = None,
        cookies: list[str] | None = None,
    ):
        cached = self._load_cached_fetch(site, match_url)
        if cached is not None:
            return cached
        parsed, pages, raw_html_map = await self.scrape_service.fetch_pages(site, match_url, cookie=cookie, cookies=cookies)
        self._save_cached_fetch(site, match_url, parsed, pages, raw_html_map)
        return parsed, pages, raw_html_map

    async def build_structured_match(
        self,
        site: SiteType,
        match_url: str,
        anchor_start_time: datetime | None = None,
        anchor_end_time: datetime | None = None,
        cookie: str | None = None,
        cookies: list[str] | None = None,
        selected_european_companies: list[str] | None = None,
        selected_asian_companies: list[str] | None = None,
    ) -> StructuredMatchResponse:
        parsed, pages, raw_html_map = await self._resolve_fetch_pages(site, match_url, cookie=cookie, cookies=cookies)
        match_key = parsed.get('match_id') or 'unknown'
        home_team, away_team = self._extract_team_names(pages)

        average_european = None
        european_rows = []
        average_asian = None
        asian_rows = []
        european_details = []
        asian_details = []

        if site == SiteType.OKOOO:
            if raw_html_map.get('odds'):
                average_european, european_rows = self.parse_service.parse_european_odds(
                    raw_html_map['odds'],
                    selected_companies=selected_european_companies,
                )
            if raw_html_map.get('asian_handicap'):
                average_asian, asian_rows = self.parse_service.parse_asian_handicap(
                    raw_html_map['asian_handicap'],
                    selected_companies=selected_asian_companies,
                )
            european_details, asian_details = await self._build_change_details(
                site=site,
                match_url=match_url,
                parsed=parsed,
                european_rows=european_rows,
                asian_rows=asian_rows,
                anchor_start_time=anchor_start_time,
                anchor_end_time=anchor_end_time,
                cookie=cookie,
                cookies=cookies,
            )

        return StructuredMatchResponse(
            site=site,
            match_key=str(match_key),
            source_url=match_url,
            home_team=home_team,
            away_team=away_team,
            anchor_start_time=anchor_start_time,
            anchor_end_time=anchor_end_time,
            selected_european_companies=selected_european_companies or [],
            selected_asian_companies=selected_asian_companies or [],
            parsed=parsed,
            pages=pages,
            average_european_odds=average_european,
            european_odds=european_rows,
            average_asian_handicap=average_asian,
            asian_handicap=asian_rows,
            european_odds_details=european_details,
            asian_handicap_details=asian_details,
        )

    def _extract_team_names(self, pages: dict[str, ScrapedPagePayload]) -> tuple[str | None, str | None]:
        title_candidates = [
            pages.get(key).title
            for key in ('match', 'odds', 'asian_handicap', 'history')
            if pages.get(key) and pages.get(key).title
        ]
        for title in title_candidates:
            parsed = self._parse_team_names_from_title(title)
            if parsed is not None:
                return parsed
        return None, None

    def _parse_team_names_from_title(self, title: str) -> tuple[str, str] | None:
        normalized_title = re.sub(r'\s+', ' ', title).strip()
        match = re.search(
            r'(?:直播详情|欧赔|亚盘)?[-—–_：:\s]*(?P<home>.+?)\s*(?:vs|VS|Vs|v|V)\s*(?P<away>.+?)(?:(?:比赛历史|阵容|数据分析|文字比分直播|赔率|盘口|最新伤停)|[-—–_]|$)',
            normalized_title,
        )
        if not match:
            return None
        home_team = self._clean_team_name(match.group('home'))
        away_team = self._clean_team_name(match.group('away'))
        if not home_team or not away_team:
            return None
        return home_team, away_team

    def _clean_team_name(self, value: str) -> str:
        cleaned = re.sub(r'^(直播详情|欧赔|亚盘)\s*[-—–_：:]*\s*', '', value).strip()
        cleaned = re.sub(r'(比赛历史|阵容|数据分析|文字比分直播|赔率|盘口|最新伤停).*$','', cleaned).strip()
        return cleaned

    async def _build_change_details(
        self,
        site: SiteType,
        match_url: str,
        parsed: dict,
        european_rows: list,
        asian_rows: list,
        anchor_start_time: datetime | None = None,
        anchor_end_time: datetime | None = None,
        cookie: str | None = None,
        cookies: list[str] | None = None,
    ) -> tuple[list[EuropeanOddsDetail], list[AsianHandicapDetail]]:
        if site != SiteType.OKOOO:
            return [], []
        european_ids = [int(row.institution_id) for row in european_rows if getattr(row, 'institution_id', 0) > 0]
        asian_ids = [int(row.institution_id) for row in asian_rows if getattr(row, 'institution_id', 0) > 0]
        if not european_ids and not asian_ids:
            return [], []

        change_pages, change_html_map = await self.scrape_service.fetch_change_pages(
            site,
            match_url,
            european_ids=european_ids,
            asian_ids=asian_ids,
            cookie=cookie,
            cookies=cookies,
        )

        european_details: list[EuropeanOddsDetail] = []
        asian_details: list[AsianHandicapDetail] = []
        match_id = str(parsed.get('match_id') or '')

        for row in european_rows:
            institution_id = int(getattr(row, 'institution_id', 0) or 0)
            if institution_id <= 0:
                continue
            key = f'odds_change_{institution_id}'
            page = change_pages.get(key) or self._build_missing_change_payload(match_id, institution_id, market='odds')
            all_records = self.parse_service.parse_european_odds_change(change_html_map[key]) if change_html_map.get(key) else []
            filtered_records = self.parse_service.filter_european_odds_change(all_records, anchor_start_time, anchor_end_time) if anchor_start_time else all_records
            european_details.append(
                EuropeanOddsDetail(
                    institution_id=institution_id,
                    institution_name=row.institution_name,
                    page=page,
                    all_records_count=len(all_records),
                    matched_records_count=len(filtered_records),
                    records=filtered_records,
                )
            )

        for row in asian_rows:
            institution_id = int(getattr(row, 'institution_id', 0) or 0)
            if institution_id <= 0:
                continue
            key = f'asian_handicap_change_{institution_id}'
            page = change_pages.get(key) or self._build_missing_change_payload(match_id, institution_id, market='ah')
            all_records = self.parse_service.parse_asian_handicap_change(change_html_map[key]) if change_html_map.get(key) else []
            filtered_records = self.parse_service.filter_asian_handicap_change(all_records, anchor_start_time, anchor_end_time) if anchor_start_time else all_records
            asian_details.append(
                AsianHandicapDetail(
                    institution_id=institution_id,
                    institution_name=row.institution_name,
                    page=page,
                    all_records_count=len(all_records),
                    matched_records_count=len(filtered_records),
                    records=filtered_records,
                )
            )

        return european_details, asian_details

    def _build_missing_change_payload(self, match_id: str, institution_id: int, market: str) -> ScrapedPagePayload:
        market_path = 'odds' if market == 'odds' else 'ah'
        return ScrapedPagePayload(
            page_url=f'https://www.okooo.com/soccer/match/{match_id}/{market_path}/change/{institution_id}/',
            html_length=0,
            fetched=False,
            title=None,
            status_code=None,
            final_url=None,
            error_message='详情页未抓取到有效内容。',
        )
