import json
from typing import Any

from app.models.schemas import (
    AnalysisPreviewResponse,
    AnalysisStage,
    CleanedMatchResponse,
    MatchPreparationRequest,
    StageAnalysisPreview,
    StageAnalysisResult,
    StructuredMatchResponse,
)


class PipelinePromptService:
    display_timezone_label = "北京时间 (UTC+08:00)"

    def build_pipeline_preview(
        self,
        request: MatchPreparationRequest,
        structured: StructuredMatchResponse,
        cleaned: CleanedMatchResponse,
        european_result: StageAnalysisResult | None = None,
        asian_base_result: StageAnalysisResult | None = None,
    ) -> AnalysisPreviewResponse:
        stages = {
            AnalysisStage.EUROPEAN.value: self.build_stage_preview(
                AnalysisStage.EUROPEAN,
                request,
                structured,
                cleaned,
            ),
            AnalysisStage.ASIAN_BASE.value: self.build_stage_preview(
                AnalysisStage.ASIAN_BASE,
                request,
                structured,
                cleaned,
                european_result=european_result,
            ),
            AnalysisStage.FINAL.value: self.build_stage_preview(
                AnalysisStage.FINAL,
                request,
                structured,
                cleaned,
                european_result=european_result,
                asian_base_result=asian_base_result,
            ),
        }
        return AnalysisPreviewResponse(
            site=request.site,
            match_key=structured.match_key,
            model_name=request.ai_config.model_name,
            stages=stages,
        )

    def build_stage_preview(
        self,
        stage: AnalysisStage,
        request: MatchPreparationRequest,
        structured: StructuredMatchResponse,
        cleaned: CleanedMatchResponse,
        european_result: StageAnalysisResult | None = None,
        asian_base_result: StageAnalysisResult | None = None,
    ) -> StageAnalysisPreview:
        prompt_config = self._get_stage_prompt(request, stage)
        structured_payload = self.build_structured_payload(
            stage,
            request,
            cleaned,
            european_result=european_result,
            asian_base_result=asian_base_result,
        )
        return StageAnalysisPreview(
            stage=stage,
            prompt_name=prompt_config.prompt_name,
            system_prompt=self.build_system_prompt(stage),
            user_prompt=self.build_user_prompt(
                stage,
                request,
                structured,
                cleaned,
                structured_payload,
                european_result=european_result,
                asian_base_result=asian_base_result,
            ),
            structured_payload=structured_payload,
        )

    def build_system_prompt(self, stage: AnalysisStage) -> str:
        stage_statement = {
            AnalysisStage.EUROPEAN: "你当前只负责欧赔阶段分析。",
            AnalysisStage.ASIAN_BASE: "你当前只负责亚盘基础阶段分析。",
            AnalysisStage.FINAL: "你当前负责最终综合阶段分析，需要整合前序结论与当前亚盘清洗数据。",
        }[stage]
        return (
            f"{stage_statement}"
            "只能基于当前请求里这一场比赛的清洗后分层数据和已提供的上游阶段结论进行分析。"
            "禁止引入其他比赛、外部新闻、数据库、训练语料中的隐含事实或主观猜测。"
            f"所有时间统一按 {self.display_timezone_label} 理解与表述。"
            "如果某项数据没有提供，必须明确说明缺失，不能脑补。"
        )

    def build_user_prompt(
        self,
        stage: AnalysisStage,
        request: MatchPreparationRequest,
        structured: StructuredMatchResponse,
        cleaned: CleanedMatchResponse,
        structured_payload: dict[str, Any],
        european_result: StageAnalysisResult | None = None,
        asian_base_result: StageAnalysisResult | None = None,
    ) -> str:
        prompt_config = self._get_stage_prompt(request, stage)
        custom_prompt = prompt_config.prompt_text.strip() or self._get_default_stage_instruction(stage)
        stage_label = self._get_stage_label(stage)
        upstream_text = ""
        if stage == AnalysisStage.ASIAN_BASE:
            upstream_text = (
                "\n上游阶段结论说明：\n"
                f"- 欧赔阶段结论：{self._get_stage_result_text(european_result)}\n"
            )
        if stage == AnalysisStage.FINAL:
            upstream_text = (
                "\n上游阶段结论说明：\n"
                f"- 欧赔阶段结论：{self._get_stage_result_text(european_result)}\n"
                f"- 亚盘基础阶段结论：{self._get_stage_result_text(asian_base_result)}\n"
            )
        return (
            f"当前分析阶段：{stage_label}\n"
            f"用户分析要求：{custom_prompt}\n"
            f"站点：{request.site.value}\n"
            f"比赛键值：{structured.match_key}\n"
            f"比赛对阵：{cleaned.matchup or '-'}\n"
            f"比赛链接：{structured.source_url}\n"
            f"起始时间：{cleaned.time_window.requested_start_time_display}\n"
            f"结束时间：{cleaned.time_window.requested_end_time_display or '未设置'}\n"
            f"分析范围：{cleaned.analysis_scope}\n"
            f"{upstream_text}"
            "以下是本阶段送入模型的结构化 JSON：\n"
            f"{self._dump_structured_payload_json(structured_payload)}\n"
            "请严格围绕该阶段目标输出结论。"
        )

    def build_structured_payload(
        self,
        stage: AnalysisStage,
        request: MatchPreparationRequest,
        cleaned: CleanedMatchResponse,
        european_result: StageAnalysisResult | None = None,
        asian_base_result: StageAnalysisResult | None = None,
    ) -> dict[str, Any]:
        common_payload = {
            "site": cleaned.site.value,
            "match_key": cleaned.match_key,
            "matchup": cleaned.matchup,
            "source_url": cleaned.source_url,
            "requested_match_url": cleaned.requested_match_url,
            "time_window": cleaned.time_window.model_dump(mode="json"),
            "analysis_scope": cleaned.analysis_scope,
        }
        if stage == AnalysisStage.EUROPEAN:
            return {
                **common_payload,
                "bookmaker_selection": {
                    "european": request.bookmaker_selection.european,
                },
                "company_mappings": [
                    item.model_dump(mode="json")
                    for item in cleaned.company_mappings
                    if item.market == "european"
                ],
                "stats": {
                    "requested_company_count": cleaned.stats.requested_european_company_count,
                    "matched_company_count": cleaned.stats.matched_european_company_count,
                    "record_count": cleaned.stats.cleaned_european_record_count,
                    "dropped_first_row_count": cleaned.stats.dropped_european_first_row_count,
                },
                "european": [item.model_dump(mode="json") for item in cleaned.european],
            }
        if stage == AnalysisStage.ASIAN_BASE:
            return {
                **common_payload,
                "upstream_results": {
                    "european": self._serialize_stage_result(european_result, "等待欧赔阶段执行"),
                },
                "bookmaker_selection": {
                    "asian": request.bookmaker_selection.asian,
                },
                "reference_european": {
                    "bookmaker_selection": {
                        "european": request.bookmaker_selection.european,
                    },
                    "company_mappings": [
                        item.model_dump(mode="json")
                        for item in cleaned.company_mappings
                        if item.market == "european"
                    ],
                    "european": [item.model_dump(mode="json") for item in cleaned.european],
                },
                "company_mappings": [
                    item.model_dump(mode="json")
                    for item in cleaned.company_mappings
                    if item.market == "asian_handicap"
                ],
                "stats": {
                    "requested_company_count": cleaned.stats.requested_asian_company_count,
                    "matched_company_count": cleaned.stats.matched_asian_company_count,
                    "record_count": cleaned.stats.cleaned_asian_record_count,
                },
                "asian_handicap": [item.model_dump(mode="json") for item in cleaned.asian_handicap],
            }
        return {
            **common_payload,
            "upstream_results": {
                "european": self._serialize_stage_result(european_result, "等待欧赔阶段执行"),
                "asian_base": self._serialize_stage_result(asian_base_result, "等待亚盘基础阶段执行"),
            },
            "asian_handicap": [item.model_dump(mode="json") for item in cleaned.asian_handicap],
            "final_goal": "基于欧赔结论、亚盘基础结论与清洗后的亚盘数据，输出体现最终分析目的的综合结论。",
        }

    def _serialize_stage_result(self, result: StageAnalysisResult | None, fallback: str) -> dict[str, Any]:
        if result is None:
            return {"status": "pending", "content": fallback}
        return {
            "status": "success" if result.success else "error",
            "content": result.raw_response or result.error_message or fallback,
            "prompt_name": result.prompt_name,
        }

    def _get_stage_prompt(self, request: MatchPreparationRequest, stage: AnalysisStage):
        if stage == AnalysisStage.EUROPEAN:
            return request.prompt_set.european
        if stage == AnalysisStage.ASIAN_BASE:
            return request.prompt_set.asian_base
        return request.prompt_set.final

    def _get_stage_label(self, stage: AnalysisStage) -> str:
        if stage == AnalysisStage.EUROPEAN:
            return "欧赔分析"
        if stage == AnalysisStage.ASIAN_BASE:
            return "亚盘基础分析"
        return "最终综合分析"

    def _get_default_stage_instruction(self, stage: AnalysisStage) -> str:
        defaults = {
            AnalysisStage.EUROPEAN: "请基于清洗后的欧赔数据，分析概率、凯利指数和赔付率在指定时间与指定机构范围内的变化，并给出欧赔阶段结论。",
            AnalysisStage.ASIAN_BASE: "请基于清洗后的亚盘数据，分析主盘变化、主客水位变化和盘口节奏，给出亚盘基础阶段结论。",
            AnalysisStage.FINAL: "请结合欧赔阶段结论、亚盘基础阶段结论和清洗后的亚盘数据，输出面向最终业务目标的综合判断。",
        }
        return defaults[stage]

    def _get_stage_result_text(self, result: StageAnalysisResult | None) -> str:
        if result is None:
            return "尚未执行"
        return result.raw_response or result.error_message or "无可用结论"

    def _dump_structured_payload_json(self, payload: dict[str, Any]) -> str:
        return json.dumps(payload, ensure_ascii=False, indent=2)
