import json
from datetime import datetime, timedelta, timezone
from app.models.schemas import MatchPreparationRequest, StructuredMatchResponse

class PromptService:
    display_timezone = timezone(timedelta(hours=8))
    display_timezone_label = '北京时间（UTC+08:00）'

    def build_system_prompt(self, request: MatchPreparationRequest) -> str:
        return (
            '你只能基于当前请求中的这一场比赛和已提供的结构化数据完成分析。'
            '严禁引入其他比赛、外部新闻、历史数据库、训练语料中的隐含事实、主观臆测或虚构内容。'
            '如果某项数据没有提供，必须明确说明缺失，不得脑补。'
            f'所有时间锚点和机构变化时间统一按{self.display_timezone_label}理解与表述。'
            '如果用户提供了自定义分析要求，必须以用户要求为最高优先级。'
        )

    def build_user_prompt(self, request: MatchPreparationRequest, structured: StructuredMatchResponse) -> str:
        structured_payload = self.build_structured_payload(request, structured)
        custom_prompt = request.prompt_config.prompt_text.strip()
        effective_prompt = custom_prompt or '当前用户没有填写额外提示词，请直接基于完整结构化数据输出分析结论。'
        return (
            f"用户分析要求：{effective_prompt}\n"
            f"站点：{request.site.value}\n"
            f"比赛键值：{structured.match_key}\n"
            f"比赛对阵：{self._format_matchup(structured)}\n"
            f"比赛链接：{structured.source_url}\n"
            f"时间口径：以下起始/终止时间与机构变化时间统一按{self.display_timezone_label}展示\n"
            f"起始时间：{self._format_anchor_time(request.anchor_start_time)}\n"
            f"终止时间：{self._format_anchor_time(request.anchor_end_time)}\n"
            f"分析范围：{self._build_scope_statement(structured)}\n"
            '以下是本次分析使用的完整结构化数据（JSON，已包含欧赔/亚盘主表字段与机构详情记录完整字段）：\n'
            f"{self._dump_structured_payload_json(structured_payload)}\n"
            '请严格以“用户分析要求”为准，并且只能基于以上这一场比赛的完整结构化数据完成分析。'
        )

    def build_structured_payload(self, request: MatchPreparationRequest, structured: StructuredMatchResponse) -> dict:
        return {
            'site': request.site.value,
            'match_key': structured.match_key,
            'home_team': structured.home_team,
            'away_team': structured.away_team,
            'matchup': self._format_matchup(structured),
            'source_url': structured.source_url,
            'requested_match_url': str(request.match_url),
            'analysis_scope': self._build_scope_statement(structured),
            'time_display_timezone': self.display_timezone_label,
            'anchor_start_time': request.anchor_start_time.isoformat(),
            'anchor_end_time': request.anchor_end_time.isoformat() if request.anchor_end_time else None,
            'anchor_start_time_display': self._format_anchor_time(request.anchor_start_time),
            'anchor_end_time_display': self._format_anchor_time(request.anchor_end_time),
            'page_context': self._build_page_context_payload(structured),
            'parsed_request': structured.parsed,
            'bookmaker_selection': request.bookmaker_selection.model_dump(),
            'average_european_odds': structured.average_european_odds.model_dump() if structured.average_european_odds else None,
            'european_odds': [row.model_dump() for row in structured.european_odds],
            'average_asian_handicap': structured.average_asian_handicap.model_dump() if structured.average_asian_handicap else None,
            'asian_handicap': [row.model_dump() for row in structured.asian_handicap],
            'european_odds_details': self._build_european_details_payload(structured),
            'asian_handicap_details': self._build_asian_details_payload(structured),
        }

    def _build_scope_statement(self, structured: StructuredMatchResponse) -> str:
        return (
            f'仅针对比赛 {structured.match_key} 的当前输入页面及其同场页面链路（match / odds / asian_handicap / history 以及机构 change 详情页）做综合分析，'
            '不扩展到其他比赛或未提供的数据。'
        )

    def _format_matchup(self, structured: StructuredMatchResponse) -> str:
        if structured.home_team and structured.away_team:
            return f'{structured.home_team} vs {structured.away_team}'
        if structured.home_team:
            return structured.home_team
        if structured.away_team:
            return structured.away_team
        return '未识别'

    def _build_page_context(self, structured: StructuredMatchResponse) -> str:
        parts = []
        for key, page in structured.pages.items():
            status = '已抓取' if page.fetched else '未抓取'
            suffix = f'({page.status_code or "-"})'
            parts.append(f'{key}:{status}{suffix}')
        return ' | '.join(parts) if parts else '当前没有可用的页面抓取上下文'

    def _build_page_context_payload(self, structured: StructuredMatchResponse) -> list[dict]:
        return [
            {
                'key': key,
                'page_url': page.page_url,
                'final_url': page.final_url,
                'fetched': page.fetched,
                'status_code': page.status_code,
                'title': page.title,
                'error_message': page.error_message,
            }
            for key, page in structured.pages.items()
        ]

    def _dump_european(self, structured: StructuredMatchResponse) -> str:
        if not structured.european_odds:
            return '暂无结构化欧赔数据'
        return ' | '.join(
            f"{row.institution_name}: 初赔({row.initial_home:.2f}/{row.initial_draw:.2f}/{row.initial_away:.2f}) 最新({row.latest_home:.2f}/{row.latest_draw:.2f}/{row.latest_away:.2f})"
            for row in structured.european_odds
        )

    def _dump_asian(self, structured: StructuredMatchResponse) -> str:
        if not structured.asian_handicap:
            return '暂无结构化亚盘数据'
        return ' | '.join(
            f"{row.institution_name}: 初盘({row.initial_home_water:.2f}/{row.initial_handicap}/{row.initial_away_water:.2f}) 最新({row.latest_home_water:.2f}/{row.latest_handicap}/{row.latest_away_water:.2f})"
            for row in structured.asian_handicap
        )

    def _dump_european_details(self, structured: StructuredMatchResponse) -> str:
        if not structured.european_odds_details:
            return '暂无欧赔机构详情数据'
        parts = []
        for detail in structured.european_odds_details:
            if not detail.records:
                parts.append(f"{detail.institution_name}: 命中0条（总共{detail.all_records_count}条）")
                continue
            record_dump = ' ; '.join(
                f"{self._format_change_time(record.change_time_iso, record.change_time)}=>{record.home_odds:.2f}/{record.draw_odds:.2f}/{record.away_odds:.2f}"
                for record in detail.records
            )
            parts.append(f"{detail.institution_name}: 命中{detail.matched_records_count}条（总共{detail.all_records_count}条） {record_dump}")
        return ' | '.join(parts)

    def _dump_asian_details(self, structured: StructuredMatchResponse) -> str:
        if not structured.asian_handicap_details:
            return '暂无亚盘机构详情数据'
        parts = []
        for detail in structured.asian_handicap_details:
            if not detail.records:
                parts.append(f"{detail.institution_name}: 命中0条（总共{detail.all_records_count}条）")
                continue
            record_dump = ' ; '.join(
                f"{self._format_change_time(record.change_time_iso, record.change_time, record.is_initial, record.is_final)}=>{record.home_water:.2f}/{record.handicap}/{record.away_water:.2f}"
                for record in detail.records
            )
            parts.append(f"{detail.institution_name}: 命中{detail.matched_records_count}条（总共{detail.all_records_count}条） {record_dump}")
        return ' | '.join(parts)

    def _build_european_details_payload(self, structured: StructuredMatchResponse) -> list[dict]:
        payload = []
        for detail in structured.european_odds_details:
            detail_payload = detail.model_dump()
            detail_payload['records'] = []
            for record in detail.records:
                record_payload = record.model_dump()
                record_payload['change_time_display'] = self._format_change_time(record.change_time_iso, record.change_time)
                detail_payload['records'].append(record_payload)
            payload.append(detail_payload)
        return payload

    def _build_asian_details_payload(self, structured: StructuredMatchResponse) -> list[dict]:
        payload = []
        for detail in structured.asian_handicap_details:
            detail_payload = detail.model_dump()
            detail_payload['records'] = []
            for record in detail.records:
                record_payload = record.model_dump()
                record_payload['change_time_display'] = self._format_change_time(record.change_time_iso, record.change_time, record.is_initial, record.is_final)
                detail_payload['records'].append(record_payload)
            payload.append(detail_payload)
        return payload

    def _dump_structured_payload_json(self, payload: dict) -> str:
        return json.dumps(payload, ensure_ascii=False, indent=2)

    def _format_anchor_time(self, value: datetime | None) -> str:
        if value is None:
            return '未设置'
        normalized = self._normalize_datetime(value)
        return normalized.astimezone(self.display_timezone).strftime('%Y-%m-%d %H:%M')

    def _format_change_time(self, change_time_iso: str | None, fallback: str, is_initial: bool = False, is_final: bool = False) -> str:
        if not change_time_iso:
            return fallback
        try:
            normalized = self._normalize_datetime(datetime.fromisoformat(change_time_iso))
        except ValueError:
            return fallback
        display_value = normalized.astimezone(self.display_timezone).strftime('%Y-%m-%d %H:%M')
        marker = self._resolve_change_marker(fallback, is_initial, is_final)
        return f'{display_value}{marker}' if marker else display_value

    def _normalize_datetime(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def _resolve_change_marker(self, fallback: str, is_initial: bool = False, is_final: bool = False) -> str:
        if is_initial or '初' in fallback:
            return '(初)'
        if is_final or '终' in fallback:
            return '(终)'
        return ''
