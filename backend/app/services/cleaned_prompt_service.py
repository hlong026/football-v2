import json

from app.models.schemas import CleanedMatchResponse, MatchPreparationRequest, StructuredMatchResponse


class PromptService:
    display_timezone_label = "北京时间 (UTC+08:00)"

    def build_system_prompt(self, request: MatchPreparationRequest) -> str:
        return (
            "你只能基于当前请求中的这一场比赛和已经提供的二次清洗后分层数据完成分析。"
            "严禁引入其他比赛、外部新闻、历史数据库、训练语料中的隐含事实、主观臆测或虚构内容。"
            "如果某项数据没有提供，必须明确说明缺失，不得脑补。"
            f"所有时间锚点和机构变化时间统一按 {self.display_timezone_label} 理解与表述。"
            "如果用户提供了自定义分析要求，必须以用户要求为最高优先级。"
        )

    def build_user_prompt(
        self,
        request: MatchPreparationRequest,
        structured: StructuredMatchResponse,
        cleaned: CleanedMatchResponse,
    ) -> str:
        structured_payload = self.build_structured_payload(request, structured, cleaned)
        custom_prompt = request.prompt_config.prompt_text.strip()
        effective_prompt = custom_prompt or "当前用户没有填写额外提示词，请直接基于清洗后的分层数据输出分析结论。"
        return (
            f"用户分析要求：{effective_prompt}\n"
            f"站点：{request.site.value}\n"
            f"比赛键值：{structured.match_key}\n"
            f"比赛对阵：{cleaned.matchup or '-'}\n"
            f"比赛链接：{structured.source_url}\n"
            f"时间口径：以下起始/终止时间与机构变化时间统一按 {self.display_timezone_label} 展示\n"
            f"起始时间：{cleaned.time_window.requested_start_time_display}\n"
            f"终止时间：{cleaned.time_window.requested_end_time_display or '未设置'}\n"
            f"分析范围：{cleaned.analysis_scope}\n"
            "以下是本次分析使用的二次清洗后分层数据（JSON）：\n"
            f"{self._dump_structured_payload_json(structured_payload)}\n"
            "请严格以“用户分析要求”为准，并且只能基于以上这场比赛的清洗后分层数据完成分析。"
        )

    def build_structured_payload(
        self,
        request: MatchPreparationRequest,
        structured: StructuredMatchResponse,
        cleaned: CleanedMatchResponse,
    ) -> dict:
        return cleaned.model_dump(mode="json", exclude={"storage_paths"})

    def _dump_structured_payload_json(self, payload: dict) -> str:
        return json.dumps(payload, ensure_ascii=False, indent=2)
