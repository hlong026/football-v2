import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import MethodType

from app.models.schemas import ScrapedPagePayload, SiteType
from app.services.structured_match_service import StructuredMatchService


class StructuredMatchServiceCacheTestCase(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.service = StructuredMatchService()
        self.service.cache_dir = Path(self.temp_dir.name)
        self.service.cache_dir.mkdir(parents=True, exist_ok=True)

    async def asyncTearDown(self) -> None:
        self.temp_dir.cleanup()

    async def test_build_structured_match_reuses_recent_cached_fetch(self) -> None:
        fetch_call_count = 0
        pages = {
            'match': ScrapedPagePayload(page_url='https://example.com/match', html_length=100, fetched=True, title='直播详情-阿森纳vs曼彻斯特城-英联杯 25/26', status_code=200, final_url='https://example.com/match', error_message=None),
            'odds': ScrapedPagePayload(page_url='https://example.com/odds', html_length=100, fetched=True, title='欧赔-阿森纳vs曼彻斯特城-英联杯 25/26', status_code=200, final_url='https://example.com/odds', error_message=None),
            'asian_handicap': ScrapedPagePayload(page_url='https://example.com/ah', html_length=100, fetched=True, title='亚盘-阿森纳vs曼彻斯特城-英联杯 25/26', status_code=200, final_url='https://example.com/ah', error_message=None),
            'history': ScrapedPagePayload(page_url='https://example.com/history', html_length=100, fetched=True, title='阿森纳vs曼彻斯特城比赛历史_数据分析-澳客', status_code=200, final_url='https://example.com/history', error_message=None),
        }
        raw_html_map = {
            'odds': '''<table><tbody><tr id="tr12" data-time="1711111111" data-pname="Bet365"><td>1</td><td><span>Bet365</span></td><td>1.91</td><td>3.20</td><td>4.10</td><td>1.85</td><td>3.30</td><td>4.25</td><td>-</td><td>52.10</td><td>25.30</td><td>22.60</td><td>0.95</td><td>0.93</td><td>0.91</td><td>92.40</td></tr></tbody></table>''',
            'asian_handicap': '''<table><tbody><tr id="tr21" data-time="1711113333" data-pname="Bet365"><td>1</td><td><span>Bet365</span></td><td>0.92</td><td>半球</td><td>0.94</td><td>0.88</td><td>半球</td><td>0.98</td><td>-</td><td>-</td><td>0.93</td><td>0.91</td><td>0.95</td></tr></tbody></table>''',
        }

        async def fake_fetch_pages(_scrape_service, site: SiteType, match_url: str, cookie=None, cookies=None):
            nonlocal fetch_call_count
            fetch_call_count += 1
            return {'match_id': '1234567'}, pages, raw_html_map

        async def fake_fetch_change_pages(_scrape_service, site: SiteType, match_url: str, european_ids=None, asian_ids=None, cookie=None, cookies=None):
            detail_pages = {
                'odds_change_12': ScrapedPagePayload(page_url='https://example.com/odds/change/12', html_length=100, fetched=True, status_code=200, final_url='https://example.com/odds/change/12', error_message=None),
                'asian_handicap_change_21': ScrapedPagePayload(page_url='https://example.com/ah/change/21', html_length=100, fetched=True, status_code=200, final_url='https://example.com/ah/change/21', error_message=None),
            }
            detail_html = {
                'odds_change_12': '''<table><tbody><tr><td>2026/03/29 09:00</td><td>赛前3小时</td><td>1.91</td><td>3.20</td><td>4.10</td><td>52.10</td><td>25.30</td><td>22.60</td><td>0.95</td><td>0.93</td><td>0.91</td><td>92.40</td></tr></tbody></table>''',
                'asian_handicap_change_21': '''<table width="450"><tbody><tr><td>2026/03/29 09:30</td><td>赛前2小时30分</td><td>0.92</td><td>半球</td><td>0.94</td></tr></tbody></table>''',
            }
            return detail_pages, detail_html

        self.service.scrape_service.fetch_pages = MethodType(fake_fetch_pages, self.service.scrape_service)
        self.service.scrape_service.fetch_change_pages = MethodType(fake_fetch_change_pages, self.service.scrape_service)

        first = await self.service.build_structured_match(
            SiteType.OKOOO,
            'https://www.okooo.com/soccer/match/1234567/odds/',
            anchor_start_time=datetime(2026, 3, 29, 0, 0, tzinfo=timezone.utc),
            anchor_end_time=datetime(2026, 3, 29, 2, 0, tzinfo=timezone.utc),
        )
        second = await self.service.build_structured_match(
            SiteType.OKOOO,
            'https://www.okooo.com/soccer/match/1234567/odds/',
            anchor_start_time=datetime(2026, 3, 29, 0, 0, tzinfo=timezone.utc),
            anchor_end_time=datetime(2026, 3, 29, 2, 0, tzinfo=timezone.utc),
        )

        self.assertEqual(fetch_call_count, 1)
        self.assertEqual(first.match_key, '1234567')
        self.assertEqual(second.match_key, '1234567')
        self.assertEqual(second.home_team, '阿森纳')
        self.assertEqual(second.away_team, '曼彻斯特城')
        self.assertEqual(len(second.european_odds), 1)
        self.assertEqual(len(second.asian_handicap), 1)
        self.assertEqual(len(second.european_odds_details), 1)
        self.assertEqual(len(second.asian_handicap_details), 1)
        self.assertEqual(second.european_odds_details[0].matched_records_count, 1)
        self.assertEqual(second.asian_handicap_details[0].matched_records_count, 1)

    async def test_load_cached_fetch_removes_stale_cache_file(self) -> None:
        cache_file = self.service._resolve_cache_file(SiteType.OKOOO, 'https://www.okooo.com/soccer/match/1234567/odds/')
        cache_payload = {
            'cached_at': '2000-01-01T00:00:00+00:00',
            'parsed': {'match_id': '1234567'},
            'pages': {
                'odds': ScrapedPagePayload(page_url='https://example.com/odds', html_length=100, fetched=True, status_code=200, final_url='https://example.com/odds', error_message=None).model_dump(mode='json'),
                'asian_handicap': ScrapedPagePayload(page_url='https://example.com/ah', html_length=100, fetched=True, status_code=200, final_url='https://example.com/ah', error_message=None).model_dump(mode='json'),
            },
            'raw_html_map': {
                'odds': '<html></html>',
                'asian_handicap': '<html></html>',
            },
        }
        cache_file.write_text(json.dumps(cache_payload, ensure_ascii=False), encoding='utf-8')

        cached = self.service._load_cached_fetch(SiteType.OKOOO, 'https://www.okooo.com/soccer/match/1234567/odds/')

        self.assertIsNone(cached)
        self.assertFalse(cache_file.exists())


if __name__ == '__main__':
    unittest.main()
