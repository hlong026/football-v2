from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from app.models.schemas import (
    CleanedAsianHandicapRecord,
    CleanedAsianInstitutionPayload,
    CleanedEuropeanInstitutionPayload,
    CleanedEuropeanOddsRecord,
    CleanedMatchResponse,
    CleanedMatchStats,
    CompanySelectionMapping,
    MatchPreparationRequest,
    StructuredMatchResponse,
    TimeWindowPayload,
)
from app.services.parse_service import ParseService


class SecondaryCleanService:
    display_timezone = timezone(timedelta(hours=8))
    display_timezone_name = "Asia/Shanghai"

    def __init__(self) -> None:
        self.parse_service = ParseService()

    def build_cleaned_match(
        self,
        request: MatchPreparationRequest,
        structured: StructuredMatchResponse,
    ) -> CleanedMatchResponse:
        european = self._build_cleaned_european(structured)
        asian = self._build_cleaned_asian(structured)
        company_mappings = (
            self._build_company_mappings(
                market="european",
                selected_companies=request.bookmaker_selection.european,
                matched_items=structured.european_odds_details,
                default_groups=self.parse_service.european_keywords,
            )
            + self._build_company_mappings(
                market="asian_handicap",
                selected_companies=request.bookmaker_selection.asian,
                matched_items=structured.asian_handicap_details,
                default_groups=self.parse_service.asian_keywords,
            )
        )

        stats = CleanedMatchStats(
            requested_european_company_count=len(request.bookmaker_selection.european),
            matched_european_company_count=sum(1 for item in company_mappings if item.market == "european" and item.matched),
            requested_asian_company_count=len(request.bookmaker_selection.asian),
            matched_asian_company_count=sum(1 for item in company_mappings if item.market == "asian_handicap" and item.matched),
            raw_european_record_count=sum(len(detail.records) for detail in structured.european_odds_details),
            cleaned_european_record_count=sum(len(detail.records) for detail in european),
            raw_asian_record_count=sum(len(detail.records) for detail in structured.asian_handicap_details),
            cleaned_asian_record_count=sum(len(detail.records) for detail in asian),
            dropped_european_first_row_count=sum(1 for detail in european if detail.dropped_first_row),
        )

        return CleanedMatchResponse(
            site=request.site,
            match_key=structured.match_key,
            source_url=structured.source_url,
            requested_match_url=str(request.match_url),
            home_team=structured.home_team,
            away_team=structured.away_team,
            matchup=self._format_matchup(structured),
            analysis_scope=self._build_scope_statement(structured),
            parsed_request=structured.parsed,
            page_context=self._build_page_context_payload(structured),
            bookmaker_selection=request.bookmaker_selection,
            time_window=self._build_time_window(request),
            company_mappings=company_mappings,
            european=european,
            asian_handicap=asian,
            stats=stats,
        )

    def _build_time_window(self, request: MatchPreparationRequest) -> TimeWindowPayload:
        start_utc = self._normalize_datetime(request.anchor_start_time).isoformat()
        end_utc = self._normalize_datetime(request.anchor_end_time).isoformat() if request.anchor_end_time else None
        return TimeWindowPayload(
            requested_start_time=request.anchor_start_time,
            requested_end_time=request.anchor_end_time,
            normalized_start_time_utc=start_utc,
            normalized_end_time_utc=end_utc,
            display_timezone=self.display_timezone_name,
            requested_start_time_display=self._format_display_time(request.anchor_start_time),
            requested_end_time_display=self._format_display_time(request.anchor_end_time),
        )

    def _build_cleaned_european(self, structured: StructuredMatchResponse) -> list[CleanedEuropeanInstitutionPayload]:
        cleaned_details: list[CleanedEuropeanInstitutionPayload] = []
        for detail in structured.european_odds_details:
            dropped_first_row = False
            records_source = list(detail.records)
            cleaned_details.append(
                CleanedEuropeanInstitutionPayload(
                    institution_id=detail.institution_id,
                    institution_name=detail.institution_name,
                    all_records_count=detail.all_records_count,
                    matched_records_count=len(records_source),
                    dropped_first_row=dropped_first_row,
                    records=[
                        CleanedEuropeanOddsRecord(
                            change_time=record.change_time,
                            change_time_iso=record.change_time_iso,
                            change_time_display=self._format_change_time(record.change_time_iso, record.change_time),
                            home_probability=record.home_probability,
                            draw_probability=record.draw_probability,
                            away_probability=record.away_probability,
                            kelly_home=record.kelly_home,
                            kelly_draw=record.kelly_draw,
                            kelly_away=record.kelly_away,
                            return_rate=record.return_rate,
                        )
                        for record in records_source
                    ],
                )
            )
        return cleaned_details

    def _build_cleaned_asian(self, structured: StructuredMatchResponse) -> list[CleanedAsianInstitutionPayload]:
        cleaned_details: list[CleanedAsianInstitutionPayload] = []
        for detail in structured.asian_handicap_details:
            cleaned_details.append(
                CleanedAsianInstitutionPayload(
                    institution_id=detail.institution_id,
                    institution_name=detail.institution_name,
                    all_records_count=detail.all_records_count,
                    matched_records_count=len(detail.records),
                    records=[
                        CleanedAsianHandicapRecord(
                            change_time=record.change_time,
                            change_time_iso=record.change_time_iso,
                            change_time_display=self._format_change_time(record.change_time_iso, record.change_time),
                            home_water=record.home_water,
                            handicap=record.handicap,
                            away_water=record.away_water,
                        )
                        for record in detail.records
                    ],
                )
            )
        return cleaned_details

    def _build_company_mappings(
        self,
        market: str,
        selected_companies: list[str],
        matched_items: list,
        default_groups: list[list[str]],
    ) -> list[CompanySelectionMapping]:
        mappings: list[CompanySelectionMapping] = []
        keyword_groups = self.parse_service._resolve_keyword_groups(selected_companies, default_groups)
        normalized_items = [
            (
                int(getattr(item, "institution_id", 0) or 0),
                str(getattr(item, "institution_name", "") or ""),
                self.parse_service._normalize_keyword_text(str(getattr(item, "institution_name", "") or "")),
            )
            for item in matched_items
        ]
        for index, requested_name in enumerate(selected_companies):
            keywords = keyword_groups[index] if index < len(keyword_groups) else [requested_name]
            normalized_name = self.parse_service._normalize_keyword_text(requested_name)
            matched = next(
                (
                    item
                    for item in normalized_items
                    if any(
                        self.parse_service._normalize_keyword_text(keyword)
                        and self.parse_service._normalize_keyword_text(keyword) in item[2]
                        for keyword in keywords
                    )
                ),
                None,
            )
            mappings.append(
                CompanySelectionMapping(
                    market=market,
                    requested_name=requested_name,
                    normalized_name=normalized_name,
                    matched=matched is not None,
                    matched_institution_id=matched[0] if matched else None,
                    matched_institution_name=matched[1] if matched else None,
                )
            )
        return mappings

    def _build_scope_statement(self, structured: StructuredMatchResponse) -> str:
        return (
            f"仅针对比赛 {structured.match_key} 的当前输入页面及其同场页面链路"
            "（match / odds / asian_handicap / history 以及机构 change 详情页）做综合分析，"
            "不扩展到其他比赛或未提供的数据。"
        )

    def _build_page_context_payload(self, structured: StructuredMatchResponse) -> list[dict]:
        return [
            {
                "key": key,
                "page_url": page.page_url,
                "final_url": page.final_url,
                "fetched": page.fetched,
                "status_code": page.status_code,
                "title": page.title,
                "error_message": page.error_message,
            }
            for key, page in structured.pages.items()
        ]

    def _format_matchup(self, structured: StructuredMatchResponse) -> str | None:
        if structured.home_team and structured.away_team:
            return f"{structured.home_team} vs {structured.away_team}"
        if structured.home_team:
            return structured.home_team
        if structured.away_team:
            return structured.away_team
        return None

    def _format_display_time(self, value: datetime | None) -> str | None:
        if value is None:
            return None
        return self._normalize_datetime(value).astimezone(self.display_timezone).strftime("%Y-%m-%d %H:%M")

    def _format_change_time(self, change_time_iso: str | None, fallback: str) -> str:
        if not change_time_iso:
            return fallback
        try:
            value = datetime.fromisoformat(change_time_iso)
        except ValueError:
            return fallback
        display_value = self._normalize_datetime(value).astimezone(self.display_timezone).strftime("%Y-%m-%d %H:%M")
        marker_match = re.search(r"(\([^)]+\)|（[^）]+）)$", fallback)
        if marker_match:
            return f"{display_value}{marker_match.group(1)}"
        return display_value

    def _normalize_datetime(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
