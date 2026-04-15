from __future__ import annotations

import re

from app.models.schemas import AnalysisStage, CleanedMatchResponse, MatchPreparationRequest, StageAnalysisResult, StageAnalysisSummary


class PipelineSummaryService:
    def build_summary(
        self,
        stage: AnalysisStage,
        request: MatchPreparationRequest,
        cleaned: CleanedMatchResponse,
        content: str | None,
        european_result: StageAnalysisResult | None = None,
        asian_base_result: StageAnalysisResult | None = None,
    ) -> StageAnalysisSummary:
        text = (content or "").strip()
        lines = self._extract_lines(text)
        direction = self._detect_direction(text)
        statement = lines[0] if lines else None
        time_scope_summary = f"{cleaned.time_window.requested_start_time_display} 至 {cleaned.time_window.requested_end_time_display or '最新'}"

        if stage == AnalysisStage.EUROPEAN:
            return StageAnalysisSummary(
                direction=direction,
                statement=statement,
                european_view=statement,
                key_points=self._pick_key_points(lines),
                key_evidence=self._pick_evidence(lines),
                risk_level=self._detect_risk_level(text),
                risk_notes=self._pick_risk_notes(lines),
                action_advice=self._pick_advice(lines),
                time_scope_summary=time_scope_summary,
                company_scope_summary=self._build_company_scope(request.bookmaker_selection.european),
            )

        if stage == AnalysisStage.ASIAN_BASE:
            return StageAnalysisSummary(
                direction=direction,
                statement=statement,
                asian_base_view=statement,
                key_points=self._pick_key_points(lines),
                key_evidence=self._pick_evidence(lines),
                risk_level=self._detect_risk_level(text),
                risk_notes=self._pick_risk_notes(lines),
                action_advice=self._pick_advice(lines),
                time_scope_summary=time_scope_summary,
                company_scope_summary=self._build_company_scope(request.bookmaker_selection.asian),
            )

        european_view = european_result.summary.european_view if european_result and european_result.summary else self._extract_stage_text(european_result)
        asian_view = asian_base_result.summary.asian_base_view if asian_base_result and asian_base_result.summary else self._extract_stage_text(asian_base_result)
        final_direction = direction or self._merge_direction(
            european_result.summary.direction if european_result and european_result.summary else None,
            asian_base_result.summary.direction if asian_base_result and asian_base_result.summary else None,
        )
        return StageAnalysisSummary(
            direction=final_direction,
            statement=statement,
            final_direction=final_direction,
            final_statement=statement,
            european_view=european_view,
            asian_base_view=asian_view,
            cross_market_consensus=self._detect_consensus(final_direction, european_result, asian_base_result, text),
            key_points=self._pick_key_points(lines),
            key_evidence=self._pick_evidence(lines),
            risk_level=self._detect_risk_level(text),
            risk_notes=self._pick_risk_notes(lines),
            action_advice=self._pick_advice(lines),
            time_scope_summary=time_scope_summary,
            company_scope_summary=(
                f"欧赔机构：{self._build_company_scope(request.bookmaker_selection.european)}；"
                f"亚盘机构：{self._build_company_scope(request.bookmaker_selection.asian)}"
            ),
        )

    def _extract_lines(self, text: str) -> list[str]:
        normalized = text.replace("\r\n", "\n")
        lines = []
        for raw_line in normalized.split("\n"):
            line = re.sub(r"^[#>*\-\d.\s]+", "", raw_line).strip()
            if not line:
                continue
            lines.append(line)
        unique_lines: list[str] = []
        for line in lines:
            if line not in unique_lines:
                unique_lines.append(line)
        return unique_lines

    def _detect_direction(self, text: str) -> str | None:
        if not text:
            return None
        if re.search(r"观望|等待|谨慎|回避", text):
            return "观望"
        home_score = len(re.findall(r"偏主|主队|主胜|主不败|让胜|主方向|主队方向", text))
        away_score = len(re.findall(r"偏客|客队|客胜|客不败|让负", text))
        draw_score = len(re.findall(r"偏平|平局|防平|走平", text))
        if max(home_score, away_score, draw_score) == 0:
            return None
        if draw_score > home_score and draw_score >= away_score:
            return "偏平"
        return "偏主" if home_score >= away_score else "偏客"

    def _pick_key_points(self, lines: list[str]) -> list[str]:
        return lines[:3]

    def _pick_evidence(self, lines: list[str]) -> list[str]:
        evidence = [line for line in lines if re.search(r"概率|凯利|赔付|盘口|水位|升盘|降盘|分歧|一致|背离", line)]
        return evidence[:5] or lines[:3]

    def _pick_risk_notes(self, lines: list[str]) -> list[str]:
        risks = [line for line in lines if re.search(r"风险|谨慎|防|波动|反转|干扰|分歧", line)]
        return risks[:3]

    def _pick_advice(self, lines: list[str]) -> str | None:
        for line in lines:
            if re.search(r"建议|方向|可跟|观望|防守|防平|优先", line):
                return line
        return lines[0] if lines else None

    def _detect_risk_level(self, text: str) -> str | None:
        if not text:
            return None
        if re.search(r"高风险|回避|强烈谨慎|分歧明显|反转风险", text):
            return "高"
        if re.search(r"谨慎|防范|需防|存在分歧|波动", text):
            return "中"
        return "低"

    def _build_company_scope(self, companies: list[str]) -> str:
        return "、".join(companies) if companies else "未指定"

    def _merge_direction(self, european_direction: str | None, asian_direction: str | None) -> str | None:
        if european_direction == asian_direction:
            return european_direction
        if european_direction and asian_direction:
            return asian_direction
        return european_direction or asian_direction

    def _detect_consensus(
        self,
        final_direction: str | None,
        european_result: StageAnalysisResult | None,
        asian_base_result: StageAnalysisResult | None,
        text: str,
    ) -> str:
        european_direction = european_result.summary.direction if european_result and european_result.summary else None
        asian_direction = asian_base_result.summary.direction if asian_base_result and asian_base_result.summary else None
        if re.search(r"背离|冲突|分歧", text):
            return "明显背离"
        if european_direction and asian_direction and european_direction == asian_direction:
            return "一致"
        if final_direction and (european_direction or asian_direction):
            return "部分一致"
        return "待确认"

    def _extract_stage_text(self, result: StageAnalysisResult | None) -> str | None:
        if result is None:
            return None
        return result.raw_response or result.error_message
