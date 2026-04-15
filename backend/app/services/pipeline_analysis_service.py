import httpx

from app.models.schemas import (
    AIConfigPayload,
    AIConnectionTestResponse,
    AIProvider,
    AnalysisPreviewResponse,
    AnalysisRunResponse,
    AnalysisStage,
    CleanedMatchResponse,
    MatchPreparationRequest,
    StageAnalysisPreview,
    StageAnalysisResult,
    StageRunResponse,
    StructuredMatchResponse,
)
from app.services.pipeline_prompt_service import PipelinePromptService
from app.services.pipeline_summary_service import PipelineSummaryService


class PipelineAnalysisService:
    def __init__(self) -> None:
        self.prompt_service = PipelinePromptService()
        self.summary_service = PipelineSummaryService()

    def _normalize_endpoint(self, api_endpoint: str) -> str:
        normalized = api_endpoint.strip().rstrip("/")
        return normalized if normalized.endswith("/chat/completions") else normalized + "/chat/completions"

    def _build_completion_payload(self, ai_config: AIConfigPayload, system_prompt: str, user_prompt: str, include_optional_params: bool = True) -> dict:
        model_name = ai_config.model_name.strip()
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        if not include_optional_params:
            return payload
        allow_sampling_params = not (ai_config.provider == AIProvider.DEEPSEEK and "reasoner" in model_name.lower())
        if allow_sampling_params and ai_config.temperature is not None:
            payload["temperature"] = ai_config.temperature
        if ai_config.max_tokens is not None:
            payload["max_tokens"] = ai_config.max_tokens
        if allow_sampling_params and ai_config.top_p is not None:
            payload["top_p"] = ai_config.top_p
        if allow_sampling_params and ai_config.presence_penalty is not None:
            payload["presence_penalty"] = ai_config.presence_penalty
        if allow_sampling_params and ai_config.frequency_penalty is not None:
            payload["frequency_penalty"] = ai_config.frequency_penalty
        return payload

    def _build_completion_attempts(self, ai_config: AIConfigPayload, system_prompt: str, user_prompt: str) -> list[dict]:
        primary_payload = self._build_completion_payload(ai_config, system_prompt, user_prompt)
        fallback_payload = self._build_completion_payload(ai_config, system_prompt, user_prompt, include_optional_params=False)
        return [primary_payload] if primary_payload == fallback_payload else [primary_payload, fallback_payload]

    def _build_headers(self, api_key: str | None) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        cleaned_api_key = api_key.strip() if api_key else ""
        if cleaned_api_key:
            headers["Authorization"] = f"Bearer {cleaned_api_key}"
        return headers

    def _extract_response_error(self, response: httpx.Response) -> str:
        content_type = response.headers.get("content-type", "").lower()
        detail = ""
        if "application/json" in content_type:
            try:
                payload = response.json()
            except ValueError:
                payload = None
            if isinstance(payload, dict):
                error = payload.get("error")
                if isinstance(error, dict):
                    detail = str(error.get("message") or error.get("type") or "").strip()
                elif error:
                    detail = str(error).strip()
                if not detail:
                    detail = str(payload.get("message") or payload.get("detail") or "").strip()
        if not detail:
            detail = response.text.strip()
        return f"模型接口返回 {response.status_code}：{detail}" if detail else f"模型接口返回 {response.status_code}"

    def _resolve_timeout_seconds(self, ai_config: AIConfigPayload, fallback: int) -> int:
        configured = ai_config.timeout_seconds
        if configured is None:
            return fallback
        return max(5, int(configured))

    async def _request_completion(self, endpoint: str, headers: dict[str, str], payloads: list[dict], timeout_seconds: int) -> dict:
        last_error = "模型接口未返回有效响应。"
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            for index, payload in enumerate(payloads):
                try:
                    response = await client.post(endpoint, json=payload, headers=headers)
                    response.raise_for_status()
                    return response.json()
                except httpx.HTTPStatusError as exc:
                    last_error = self._extract_response_error(exc.response)
                    can_retry = exc.response.status_code == 400 and index < len(payloads) - 1
                    if can_retry:
                        continue
                    raise RuntimeError(last_error) from exc
        raise RuntimeError(last_error)

    def _extract_completion_content(self, payload: dict) -> str | None:
        choices = payload.get("choices") or []
        if not choices:
            return None
        message = choices[0].get("message") or {}
        content = message.get("content")
        if isinstance(content, list):
            text_parts = [str(item.get("text", "")).strip() for item in content if isinstance(item, dict) and item.get("text")]
            content = "\n".join(part for part in text_parts if part).strip()
        if isinstance(content, str) and content.strip():
            return content.strip()
        reasoning_content = message.get("reasoning_content")
        if isinstance(reasoning_content, str) and reasoning_content.strip():
            return reasoning_content.strip()
        return None

    async def test_connection(self, ai_config: AIConfigPayload) -> AIConnectionTestResponse:
        endpoint = self._normalize_endpoint(ai_config.api_endpoint)
        if not (ai_config.api_key or "").strip():
            return AIConnectionTestResponse(
                success=False,
                provider=ai_config.provider,
                model_name=ai_config.model_name,
                endpoint=endpoint,
                message="当前未填写 API Key，暂时无法测试模型连接。",
            )

        test_config = ai_config.model_copy(update={"temperature": 0, "max_tokens": 16, "model_name": ai_config.model_name.strip()})
        payloads = self._build_completion_attempts(test_config, "你是一个连接测试助手。", "请只回复 connection ok")
        headers = self._build_headers(ai_config.api_key)

        try:
            data = await self._request_completion(endpoint, headers, payloads, timeout_seconds=self._resolve_timeout_seconds(ai_config, 30))
            content = self._extract_completion_content(data)
            message = "模型接口已连通，可以继续正式分析。" if content else "接口已成功返回，但没有读到有效文本内容。"
            return AIConnectionTestResponse(
                success=bool(content),
                provider=ai_config.provider,
                model_name=ai_config.model_name.strip(),
                endpoint=endpoint,
                message=message,
            )
        except Exception as exc:
            return AIConnectionTestResponse(
                success=False,
                provider=ai_config.provider,
                model_name=ai_config.model_name.strip(),
                endpoint=endpoint,
                message=str(exc),
            )

    def build_preview(
        self,
        request: MatchPreparationRequest,
        structured: StructuredMatchResponse,
        cleaned: CleanedMatchResponse,
        european_result: StageAnalysisResult | None = None,
        asian_base_result: StageAnalysisResult | None = None,
    ) -> AnalysisPreviewResponse:
        return self.prompt_service.build_pipeline_preview(
            request,
            structured,
            cleaned,
            european_result=european_result,
            asian_base_result=asian_base_result,
        )

    def _build_manual_stage_result(
        self,
        stage: AnalysisStage,
        request: MatchPreparationRequest,
        structured: StructuredMatchResponse,
        cleaned: CleanedMatchResponse,
        text: str,
        european_result: StageAnalysisResult | None = None,
        asian_base_result: StageAnalysisResult | None = None,
    ) -> StageAnalysisResult:
        preview = self.prompt_service.build_stage_preview(
            stage,
            request,
            structured,
            cleaned,
            european_result=european_result,
            asian_base_result=asian_base_result,
        )
        normalized_text = text.strip()
        return StageAnalysisResult(
            stage=stage,
            prompt_name=preview.prompt_name,
            success=bool(normalized_text),
            request_preview=preview,
            summary=self.summary_service.build_summary(
                stage,
                request,
                cleaned,
                normalized_text or None,
                european_result=european_result,
                asian_base_result=asian_base_result,
            ) if normalized_text else None,
            raw_response=normalized_text or None,
            error_message=None if normalized_text else "编辑后的阶段文本为空",
        )

    def _resolve_manual_upstream_results(
        self,
        request: MatchPreparationRequest,
        structured: StructuredMatchResponse,
        cleaned: CleanedMatchResponse,
    ) -> tuple[StageAnalysisResult | None, StageAnalysisResult | None]:
        european_text = (request.upstream_stage_texts.european or "").strip()
        european_result = self._build_manual_stage_result(
            AnalysisStage.EUROPEAN,
            request,
            structured,
            cleaned,
            european_text,
        ) if european_text else None

        asian_text = (request.upstream_stage_texts.asian_base or "").strip()
        asian_result = self._build_manual_stage_result(
            AnalysisStage.ASIAN_BASE,
            request,
            structured,
            cleaned,
            asian_text,
            european_result=european_result,
        ) if asian_text else None
        return european_result, asian_result

    async def run_stage(
        self,
        request: MatchPreparationRequest,
        structured: StructuredMatchResponse,
        cleaned: CleanedMatchResponse,
        stage: AnalysisStage,
    ) -> StageRunResponse:
        european_result, asian_base_result = self._resolve_manual_upstream_results(request, structured, cleaned)
        preview = self.prompt_service.build_stage_preview(
            stage,
            request,
            structured,
            cleaned,
            european_result=european_result,
            asian_base_result=asian_base_result,
        )

        prerequisite_error = None
        if stage == AnalysisStage.ASIAN_BASE and european_result is None:
            prerequisite_error = "请先执行欧赔分析，或先填写欧赔阶段编辑结果。"
        elif stage == AnalysisStage.FINAL and european_result is None:
            prerequisite_error = "请先执行欧赔分析，或先填写欧赔阶段编辑结果。"
        elif stage == AnalysisStage.FINAL and asian_base_result is None:
            prerequisite_error = "请先执行亚盘基础分析，或先填写亚盘基础阶段编辑结果。"

        if prerequisite_error:
            stage_result = self._build_pending_stage_result(stage, preview, prerequisite_error)
            return StageRunResponse(
                site=request.site,
                match_key=structured.match_key,
                model_name=request.ai_config.model_name.strip(),
                stage=stage,
                stage_result=stage_result,
                request_preview=self.build_preview(request, structured, cleaned, european_result=european_result, asian_base_result=asian_base_result),
                error_message=prerequisite_error,
            )

        api_key = (request.ai_config.api_key or "").strip()
        if not api_key:
            stage_label = self.prompt_service._get_stage_label(stage)
            stage_result = self._build_pending_stage_result(stage, preview, f"尚未提供 API Key，未执行{stage_label}。")
            return StageRunResponse(
                site=request.site,
                match_key=structured.match_key,
                model_name=request.ai_config.model_name.strip(),
                stage=stage,
                stage_result=stage_result,
                request_preview=self.build_preview(request, structured, cleaned, european_result=european_result, asian_base_result=asian_base_result),
                error_message=stage_result.error_message,
            )

        endpoint = self._normalize_endpoint(request.ai_config.api_endpoint)
        stage_result = await self._run_stage(
            request.ai_config,
            api_key,
            endpoint,
            stage,
            preview,
            request=request,
            cleaned=cleaned,
            european_result=european_result,
            asian_base_result=asian_base_result,
        )
        next_european = stage_result if stage == AnalysisStage.EUROPEAN else european_result
        next_asian = stage_result if stage == AnalysisStage.ASIAN_BASE else asian_base_result
        return StageRunResponse(
            site=request.site,
            match_key=structured.match_key,
            model_name=request.ai_config.model_name.strip(),
            stage=stage,
            stage_result=stage_result,
            request_preview=self.build_preview(request, structured, cleaned, european_result=next_european, asian_base_result=next_asian),
            error_message=None if stage_result.success else stage_result.error_message,
        )

    async def run_analysis(self, request: MatchPreparationRequest, structured: StructuredMatchResponse, cleaned: CleanedMatchResponse) -> AnalysisRunResponse:
        preview = self.build_preview(request, structured, cleaned)
        api_key = (request.ai_config.api_key or "").strip()
        if not api_key:
            european_pending = self._build_pending_stage_result(
                AnalysisStage.EUROPEAN,
                preview.stages[AnalysisStage.EUROPEAN.value],
                "尚未提供 API Key，未执行欧赔分析。",
            )
            asian_pending = self._build_pending_stage_result(
                AnalysisStage.ASIAN_BASE,
                preview.stages[AnalysisStage.ASIAN_BASE.value],
                "尚未提供 API Key，未执行亚盘基础分析。",
            )
            final_pending = self._build_pending_stage_result(
                AnalysisStage.FINAL,
                preview.stages[AnalysisStage.FINAL.value],
                "尚未提供 API Key，未执行最终综合分析。",
            )
            return AnalysisRunResponse(
                site=request.site,
                match_key=structured.match_key,
                model_name=request.ai_config.model_name,
                success=False,
                request_preview=preview,
                european_result=european_pending,
                asian_base_result=asian_pending,
                final_result=final_pending,
                raw_response=None,
                error_message="尚未提供 API Key，已返回分阶段模型输入预览。",
            )

        endpoint = self._normalize_endpoint(request.ai_config.api_endpoint)
        european_result = await self._run_stage(
            request.ai_config,
            api_key,
            endpoint,
            AnalysisStage.EUROPEAN,
            preview.stages[AnalysisStage.EUROPEAN.value],
            request=request,
            cleaned=cleaned,
        )
        asian_result = await self._run_stage(
            request.ai_config,
            api_key,
            endpoint,
            AnalysisStage.ASIAN_BASE,
            preview.stages[AnalysisStage.ASIAN_BASE.value],
            request=request,
            cleaned=cleaned,
            european_result=european_result,
        )
        final_preview = self.prompt_service.build_stage_preview(
            AnalysisStage.FINAL,
            request,
            structured,
            cleaned,
            european_result=european_result,
            asian_base_result=asian_result,
        )
        final_result = await self._run_stage(
            request.ai_config,
            api_key,
            endpoint,
            AnalysisStage.FINAL,
            final_preview,
            request=request,
            cleaned=cleaned,
            european_result=european_result,
            asian_base_result=asian_result,
        )
        final_preview_response = self.build_preview(
            request,
            structured,
            cleaned,
            european_result=european_result,
            asian_base_result=asian_result,
        )

        success = european_result.success and asian_result.success and final_result.success
        return AnalysisRunResponse(
            site=request.site,
            match_key=structured.match_key,
            model_name=request.ai_config.model_name.strip(),
            success=success,
            request_preview=final_preview_response,
            european_result=european_result,
            asian_base_result=asian_result,
            final_result=final_result,
            raw_response=final_result.raw_response,
            error_message=None if success else final_result.error_message or asian_result.error_message or european_result.error_message,
        )

    async def _run_stage(
        self,
        ai_config: AIConfigPayload,
        api_key: str,
        endpoint: str,
        stage: AnalysisStage,
        preview: StageAnalysisPreview,
        request: MatchPreparationRequest,
        cleaned: CleanedMatchResponse,
        european_result: StageAnalysisResult | None = None,
        asian_base_result: StageAnalysisResult | None = None,
    ) -> StageAnalysisResult:
        payloads = self._build_completion_attempts(ai_config, preview.system_prompt, preview.user_prompt)
        try:
            data = await self._request_completion(endpoint, self._build_headers(api_key), payloads, timeout_seconds=self._resolve_timeout_seconds(ai_config, 180))
            content = self._extract_completion_content(data)
            summary = self.summary_service.build_summary(
                stage,
                request,
                cleaned,
                content,
                european_result=european_result,
                asian_base_result=asian_base_result,
            )
            return StageAnalysisResult(
                stage=stage,
                prompt_name=preview.prompt_name,
                success=content is not None,
                request_preview=preview,
                summary=summary,
                raw_response=content,
                error_message=None if content is not None else "模型返回为空",
            )
        except Exception as exc:
            return StageAnalysisResult(
                stage=stage,
                prompt_name=preview.prompt_name,
                success=False,
                request_preview=preview,
                summary=self.summary_service.build_summary(
                    stage,
                    request,
                    cleaned,
                    None,
                    european_result=european_result,
                    asian_base_result=asian_base_result,
                ),
                raw_response=None,
                error_message=str(exc),
            )

    def _build_pending_stage_result(self, stage: AnalysisStage, preview: StageAnalysisPreview, message: str) -> StageAnalysisResult:
        return StageAnalysisResult(
            stage=stage,
            prompt_name=preview.prompt_name,
            success=False,
            request_preview=preview,
            summary=None,
            raw_response=None,
            error_message=message,
        )
