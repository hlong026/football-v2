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
    StructuredMatchResponse,
)
from app.services.pipeline_prompt_service import PipelinePromptService


class AnalysisService:
    def __init__(self) -> None:
        self.prompt_service = PipelinePromptService()

    def _normalize_endpoint(self, api_endpoint: str) -> str:
        return api_endpoint.strip().rstrip('/') + '/chat/completions'

    def _build_completion_payload(self, ai_config: AIConfigPayload, system_prompt: str, user_prompt: str, include_optional_params: bool = True) -> dict:
        model_name = ai_config.model_name.strip()
        payload = {
            'model': model_name,
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt},
            ],
        }
        if not include_optional_params:
            return payload
        allow_sampling_params = not (ai_config.provider == AIProvider.DEEPSEEK and 'reasoner' in model_name.lower())
        if allow_sampling_params and ai_config.temperature is not None:
            payload['temperature'] = ai_config.temperature
        if ai_config.max_tokens is not None:
            payload['max_tokens'] = ai_config.max_tokens
        if allow_sampling_params and ai_config.top_p is not None:
            payload['top_p'] = ai_config.top_p
        if allow_sampling_params and ai_config.presence_penalty is not None:
            payload['presence_penalty'] = ai_config.presence_penalty
        if allow_sampling_params and ai_config.frequency_penalty is not None:
            payload['frequency_penalty'] = ai_config.frequency_penalty
        return payload

    def _build_completion_attempts(self, ai_config: AIConfigPayload, system_prompt: str, user_prompt: str) -> list[dict]:
        primary_payload = self._build_completion_payload(ai_config, system_prompt, user_prompt)
        fallback_payload = self._build_completion_payload(ai_config, system_prompt, user_prompt, include_optional_params=False)
        return [primary_payload] if primary_payload == fallback_payload else [primary_payload, fallback_payload]

    def _build_headers(self, api_key: str | None) -> dict[str, str]:
        headers = {'Content-Type': 'application/json'}
        cleaned_api_key = api_key.strip() if api_key else ''
        if cleaned_api_key:
            headers['Authorization'] = f'Bearer {cleaned_api_key}'
        return headers

    def _extract_response_error(self, response: httpx.Response) -> str:
        content_type = response.headers.get('content-type', '').lower()
        detail = ''
        if 'application/json' in content_type:
            try:
                payload = response.json()
            except ValueError:
                payload = None
            if isinstance(payload, dict):
                error = payload.get('error')
                if isinstance(error, dict):
                    detail = str(error.get('message') or error.get('type') or '').strip()
                elif error:
                    detail = str(error).strip()
                if not detail:
                    detail = str(payload.get('message') or payload.get('detail') or '').strip()
        if not detail:
            detail = response.text.strip()
        return f'模型接口返回 {response.status_code}：{detail}' if detail else f'模型接口返回 {response.status_code}'

    def _resolve_timeout_seconds(self, ai_config: AIConfigPayload, fallback: int) -> int:
        configured = ai_config.timeout_seconds
        if configured is None:
            return fallback
        return max(5, int(configured))

    async def _request_completion(self, endpoint: str, headers: dict[str, str], payloads: list[dict], timeout_seconds: int) -> dict:
        last_error = '模型接口未返回有效响应。'
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
        choices = payload.get('choices') or []
        if not choices:
            return None
        message = choices[0].get('message') or {}
        content = message.get('content')
        if isinstance(content, list):
            text_parts = [str(item.get('text', '')).strip() for item in content if isinstance(item, dict) and item.get('text')]
            content = '\n'.join(part for part in text_parts if part).strip()
        if isinstance(content, str) and content.strip():
            return content.strip()
        reasoning_content = message.get('reasoning_content')
        if isinstance(reasoning_content, str) and reasoning_content.strip():
            return reasoning_content.strip()
        return None

    async def test_connection(self, ai_config: AIConfigPayload) -> AIConnectionTestResponse:
        endpoint = self._normalize_endpoint(ai_config.api_endpoint)
        if not (ai_config.api_key or '').strip():
            return AIConnectionTestResponse(
                success=False,
                provider=ai_config.provider,
                model_name=ai_config.model_name,
                endpoint=endpoint,
                message='当前未填写 API Key，暂时无法测试模型连接。',
            )

        test_config = ai_config.model_copy(update={'temperature': 0, 'max_tokens': 16, 'model_name': ai_config.model_name.strip()})
        payloads = self._build_completion_attempts(test_config, '你是一个连接测试助手。', '请只回复 connection ok')
        headers = self._build_headers(ai_config.api_key)

        try:
            data = await self._request_completion(endpoint, headers, payloads, timeout_seconds=self._resolve_timeout_seconds(ai_config, 30))
            content = self._extract_completion_content(data)
            message = '模型接口已连通，可以继续正式分析。' if content else '接口已返回成功，但未读到有效内容。'
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

    def build_preview(self, request: MatchPreparationRequest, structured: StructuredMatchResponse, cleaned: CleanedMatchResponse) -> AnalysisPreviewResponse:
        return AnalysisPreviewResponse(
            site=request.site,
            match_key=structured.match_key,
            model_name=request.ai_config.model_name,
            prompt_name=request.prompt_config.prompt_name,
            system_prompt=self.prompt_service.build_system_prompt(request),
            user_prompt=self.prompt_service.build_user_prompt(request, structured, cleaned),
            structured_payload=self.prompt_service.build_structured_payload(request, structured, cleaned),
        )

    async def run_analysis(self, request: MatchPreparationRequest, structured: StructuredMatchResponse, cleaned: CleanedMatchResponse) -> AnalysisRunResponse:
        preview = self.build_preview(request, structured, cleaned)
        api_key = (request.ai_config.api_key or '').strip()
        if not api_key:
            return AnalysisRunResponse(
                site=request.site,
                match_key=structured.match_key,
                model_name=request.ai_config.model_name,
                prompt_name=request.prompt_config.prompt_name,
                success=False,
                request_preview=preview,
                error_message='尚未提供 API Key，已返回模型输入预览。',
            )

        endpoint = self._normalize_endpoint(request.ai_config.api_endpoint)
        payloads = self._build_completion_attempts(request.ai_config, preview.system_prompt, preview.user_prompt)

        try:
            data = await self._request_completion(endpoint, self._build_headers(api_key), payloads, timeout_seconds=self._resolve_timeout_seconds(request.ai_config, 180))
            content = self._extract_completion_content(data)

            return AnalysisRunResponse(
                site=request.site,
                match_key=structured.match_key,
                model_name=request.ai_config.model_name.strip(),
                prompt_name=request.prompt_config.prompt_name,
                success=content is not None,
                request_preview=preview,
                raw_response=content,
                error_message=None if content is not None else '模型返回为空',
            )
        except Exception as exc:
            return AnalysisRunResponse(
                site=request.site,
                match_key=structured.match_key,
                model_name=request.ai_config.model_name.strip(),
                prompt_name=request.prompt_config.prompt_name,
                success=False,
                request_preview=preview,
                error_message=str(exc),
            )
