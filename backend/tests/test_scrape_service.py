import unittest

from app.models.schemas import ScrapedPagePayload, SiteType
from app.services.scrape_service import ScrapeService


class ScrapeServiceTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.service = ScrapeService()

    def test_normalize_cookie_pool_deduplicates_and_prioritizes_primary_cookie(self) -> None:
        cookies = self.service._normalize_cookie_pool('foo=1; bar=2', [' foo=1; bar=2 ', 'baz=3'])

        self.assertEqual(cookies, ['foo=1; bar=2', 'baz=3'])

    def test_is_non_critical_match_failure_returns_true_for_405_match_page_with_complete_core_data(self) -> None:
        overview = {
            'failed_pages': [{'key': 'match', 'status_code': 405}],
            'fetched_pages': ['odds', 'asian_handicap', 'history'],
            'parse_summary': {'european_count': 14, 'asian_count': 7},
        }

        self.assertTrue(self.service._is_non_critical_match_failure(overview))

    def test_build_test_overview_builds_parse_summary_from_payloads(self) -> None:
        payloads = {
            'match': ScrapedPagePayload(page_url='https://example.com/match', html_length=10, fetched=False, status_code=405, final_url='https://example.com/match', error_message='405'),
            'odds': ScrapedPagePayload(page_url='https://example.com/odds', html_length=100, fetched=True, status_code=200, final_url='https://example.com/odds', error_message=None),
            'asian_handicap': ScrapedPagePayload(page_url='https://example.com/asian', html_length=100, fetched=True, status_code=200, final_url='https://example.com/asian', error_message=None),
            'history': ScrapedPagePayload(page_url='https://example.com/history', html_length=100, fetched=True, status_code=200, final_url='https://example.com/history', error_message=None),
        }
        raw_html_map = {
            'odds': '''<table><tbody><tr id="tr12" data-time="1711111111" data-pname="Bet365"><td>1</td><td><span>Bet365</span></td><td>1.91</td><td>3.20</td><td>4.10</td><td>1.85</td><td>3.30</td><td>4.25</td><td>-</td><td>52.10</td><td>25.30</td><td>22.60</td><td>0.95</td><td>0.93</td><td>0.91</td><td>92.40</td></tr></tbody></table>''',
            'asian_handicap': '''<table><tbody><tr id="tr21" data-time="1711113333" data-pname="Bet365"><td>1</td><td><span>Bet365</span></td><td>0.92</td><td>半球</td><td>0.94</td><td>0.88</td><td>半球</td><td>0.98</td><td>-</td><td>-</td><td>0.93</td><td>0.91</td><td>0.95</td></tr></tbody></table>''',
        }

        overview = self.service._build_test_overview(SiteType.OKOOO, payloads, raw_html_map)

        self.assertFalse(overview['valid'])
        self.assertEqual(overview['parse_summary']['european_count'], 1)
        self.assertEqual(overview['parse_summary']['asian_count'], 1)
        self.assertEqual(len(overview['failed_pages']), 1)


if __name__ == '__main__':
    unittest.main()
