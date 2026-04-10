import json
import tempfile
import unittest
from pathlib import Path

from app.models.schemas import AIConfigPayload, AnalysisSettingsPayload, BookmakerSelection, FetchConfigPayload, PromptConfigPayload
from app.services.settings_service import SettingsService


class SettingsServiceTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.file_path = Path(self.temp_dir.name) / 'runtime-settings.json'
        self.service = SettingsService(file_path=self.file_path)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_save_fetch_settings_persists_cookie_pool_to_local_file(self) -> None:
        result = self.service.save_fetch_settings(FetchConfigPayload(cookie='foo=1', cookies=['foo=1', 'bar=2']))

        self.assertTrue(self.file_path.exists())
        payload = json.loads(self.file_path.read_text(encoding='utf-8'))
        fetch_payload = payload['fetch_settings']
        self.assertEqual(result.cookie, 'foo=1')
        self.assertEqual(result.cookies, ['foo=1', 'bar=2'])
        self.assertEqual(fetch_payload['cookie'], 'foo=1')
        self.assertEqual(fetch_payload['cookies'], ['foo=1', 'bar=2'])
        self.assertIsNotNone(fetch_payload['updated_at'])

    def test_resolve_fetch_config_falls_back_to_saved_settings_when_request_is_empty(self) -> None:
        self.service.save_fetch_settings(FetchConfigPayload(cookie='foo=1', cookies=['foo=1', 'bar=2']))

        resolved = self.service.resolve_fetch_config(FetchConfigPayload(cookie=None, cookies=[]))

        self.assertEqual(resolved.cookie, 'foo=1')
        self.assertEqual(resolved.cookies, ['foo=1', 'bar=2'])

    def test_resolve_fetch_config_prefers_request_cookie_over_saved_settings(self) -> None:
        self.service.save_fetch_settings(FetchConfigPayload(cookie='foo=1', cookies=['foo=1']))

        resolved = self.service.resolve_fetch_config(FetchConfigPayload(cookie='baz=3', cookies=['baz=3', 'qux=4']))

        self.assertEqual(resolved.cookie, 'baz=3')
        self.assertEqual(resolved.cookies, ['baz=3', 'qux=4'])

    def test_save_ai_settings_persists_model_config_to_local_file(self) -> None:
        result = self.service.save_ai_settings(
            AIConfigPayload(
                provider='deepseek',
                api_endpoint='https://api.deepseek.com/v1',
                api_key='sk-test',
                model_name='deepseek-chat',
                temperature=0.1,
                max_tokens=4096,
            )
        )

        payload = json.loads(self.file_path.read_text(encoding='utf-8'))
        self.assertEqual(result.model_name, 'deepseek-chat')
        self.assertIn('ai_settings', payload)
        self.assertEqual(payload['ai_settings']['model_name'], 'deepseek-chat')
        self.assertEqual(payload['ai_settings']['api_key'], 'sk-test')
        self.assertIsNotNone(payload['ai_settings']['updated_at'])

    def test_save_analysis_settings_persists_prompt_and_company_scope(self) -> None:
        result = self.service.save_analysis_settings(
            AnalysisSettingsPayload(
                bookmaker_selection=BookmakerSelection(european=['澳门', 'Interwetten'], asian=['澳门', 'Bet365']),
                prompt_config=PromptConfigPayload(prompt_name='default', prompt_text='重点看赔率与凯利背离。'),
            )
        )

        payload = json.loads(self.file_path.read_text(encoding='utf-8'))
        self.assertEqual(result.bookmaker_selection.european, ['澳门', 'Interwetten'])
        self.assertIn('analysis_settings', payload)
        self.assertEqual(payload['analysis_settings']['prompt_config']['prompt_text'], '重点看赔率与凯利背离。')
        self.assertEqual(payload['analysis_settings']['bookmaker_selection']['asian'], ['澳门', 'Bet365'])
        self.assertIsNotNone(payload['analysis_settings']['updated_at'])


if __name__ == '__main__':
    unittest.main()
