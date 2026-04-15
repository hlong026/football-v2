import json
from datetime import datetime
from pathlib import Path

from app.core.config import settings
from app.models.schemas import (
    AIConfigPayload,
    AnalysisPromptSetPayload,
    AnalysisSettingsPayload,
    FetchConfigPayload,
    SavedAISettingsResponse,
    SavedAnalysisSettingsResponse,
    SavedFetchSettingsResponse,
)


class SettingsService:
    def __init__(self, file_path: Path | None = None) -> None:
        self.file_path = file_path or settings.data_dir / 'runtime-settings.json'
        self.file_path.parent.mkdir(parents=True, exist_ok=True)

    def _read_payload(self) -> dict:
        if not self.file_path.exists():
            return {}
        try:
            payload = json.loads(self.file_path.read_text(encoding='utf-8'))
        except Exception:
            return {}
        return payload if isinstance(payload, dict) else {}

    def _write_payload(self, payload: dict) -> None:
        self.file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, default=str), encoding='utf-8')

    def _normalize_cookie_pool(self, cookie: str | None, cookies: list[str] | None) -> list[str]:
        normalized = [item.strip() for item in (cookies or []) if item and item.strip()]
        if cookie and cookie.strip() and cookie.strip() not in normalized:
            normalized.insert(0, cookie.strip())
        return normalized

    def load_fetch_settings(self) -> SavedFetchSettingsResponse:
        payload = self._read_payload()
        fetch_payload = payload.get('fetch_settings') if isinstance(payload.get('fetch_settings'), dict) else payload
        if not isinstance(fetch_payload, dict):
            return SavedFetchSettingsResponse(cookie=None, cookies=[], updated_at=None)
        cookie = fetch_payload.get('cookie')
        cookies = fetch_payload.get('cookies')
        normalized = self._normalize_cookie_pool(cookie if isinstance(cookie, str) else None, cookies if isinstance(cookies, list) else None)
        updated_at = fetch_payload.get('updated_at')
        return SavedFetchSettingsResponse(
            cookie=normalized[0] if normalized else None,
            cookies=normalized,
            updated_at=updated_at,
        )

    def save_fetch_settings(self, fetch_config: FetchConfigPayload) -> SavedFetchSettingsResponse:
        normalized = self._normalize_cookie_pool(fetch_config.cookie, fetch_config.cookies)
        result = SavedFetchSettingsResponse(
            cookie=normalized[0] if normalized else None,
            cookies=normalized,
            updated_at=datetime.now(),
        )
        payload = self._read_payload()
        payload['fetch_settings'] = result.model_dump(mode='json')
        self._write_payload(payload)
        return result

    def load_ai_settings(self) -> SavedAISettingsResponse:
        payload = self._read_payload()
        ai_payload = payload.get('ai_settings') if isinstance(payload.get('ai_settings'), dict) else {}
        return SavedAISettingsResponse(
            provider=ai_payload.get('provider', SavedAISettingsResponse.model_fields['provider'].default),
            api_endpoint=ai_payload.get('api_endpoint', SavedAISettingsResponse.model_fields['api_endpoint'].default),
            api_key=ai_payload.get('api_key'),
            model_name=ai_payload.get('model_name', SavedAISettingsResponse.model_fields['model_name'].default),
            temperature=ai_payload.get('temperature', SavedAISettingsResponse.model_fields['temperature'].default),
            max_tokens=ai_payload.get('max_tokens', SavedAISettingsResponse.model_fields['max_tokens'].default),
            top_p=ai_payload.get('top_p', SavedAISettingsResponse.model_fields['top_p'].default),
            presence_penalty=ai_payload.get('presence_penalty', SavedAISettingsResponse.model_fields['presence_penalty'].default),
            frequency_penalty=ai_payload.get('frequency_penalty', SavedAISettingsResponse.model_fields['frequency_penalty'].default),
            timeout_seconds=ai_payload.get('timeout_seconds', SavedAISettingsResponse.model_fields['timeout_seconds'].default),
            updated_at=ai_payload.get('updated_at'),
        )

    def save_ai_settings(self, ai_config: AIConfigPayload) -> SavedAISettingsResponse:
        result = SavedAISettingsResponse(
            provider=ai_config.provider,
            api_endpoint=ai_config.api_endpoint,
            api_key=ai_config.api_key,
            model_name=ai_config.model_name,
            temperature=ai_config.temperature,
            max_tokens=ai_config.max_tokens,
            top_p=ai_config.top_p,
            presence_penalty=ai_config.presence_penalty,
            frequency_penalty=ai_config.frequency_penalty,
            timeout_seconds=ai_config.timeout_seconds,
            updated_at=datetime.now(),
        )
        payload = self._read_payload()
        payload['ai_settings'] = result.model_dump(mode='json')
        self._write_payload(payload)
        return result

    def load_analysis_settings(self) -> SavedAnalysisSettingsResponse:
        payload = self._read_payload()
        analysis_payload = payload.get('analysis_settings') if isinstance(payload.get('analysis_settings'), dict) else {}
        prompt_set = analysis_payload.get('prompt_set')
        prompt_config = analysis_payload.get('prompt_config')
        resolved_prompt_set = prompt_set if isinstance(prompt_set, dict) else {
            'european': prompt_config if isinstance(prompt_config, dict) else {},
            'asian_base': prompt_config if isinstance(prompt_config, dict) else {},
            'final': prompt_config if isinstance(prompt_config, dict) else {},
        }
        return SavedAnalysisSettingsResponse(
            bookmaker_selection=analysis_payload.get('bookmaker_selection', {}),
            prompt_set=resolved_prompt_set,
            prompt_config=prompt_config if isinstance(prompt_config, dict) else None,
            updated_at=analysis_payload.get('updated_at'),
        )

    def save_analysis_settings(self, analysis_settings: AnalysisSettingsPayload) -> SavedAnalysisSettingsResponse:
        result = SavedAnalysisSettingsResponse(
            bookmaker_selection=analysis_settings.bookmaker_selection,
            prompt_set=analysis_settings.prompt_set,
            prompt_config=analysis_settings.prompt_config,
            updated_at=datetime.now(),
        )
        payload = self._read_payload()
        payload['analysis_settings'] = result.model_dump(mode='json')
        self._write_payload(payload)
        return result

    def resolve_fetch_config(self, fetch_config: FetchConfigPayload) -> FetchConfigPayload:
        normalized = self._normalize_cookie_pool(fetch_config.cookie, fetch_config.cookies)
        if normalized:
            return FetchConfigPayload(cookie=normalized[0], cookies=normalized)
        saved = self.load_fetch_settings()
        return FetchConfigPayload(cookie=saved.cookie, cookies=saved.cookies)
