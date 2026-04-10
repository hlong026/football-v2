import asyncio
import json

from app.services.parse_service import ParseService
from app.services.scrape_service import ScrapeService
from app.services.settings_service import SettingsService

EU_TARGETS = [
    '澳门',
    'William Hill',
    'Ladbrokes',
    'bwin',
    'Coral',
    'SNAI',
    'Bet365',
    'Interwetten',
    'Pinnacle',
    'betvictor',
    'Easybet',
    'Crown',
    '金宝博',
    'bet-at-home',
]

AH_TARGETS = [
    '澳门',
    'Bet365',
    'betvictor',
    'Easybet',
    'Crown',
    '金宝博',
    'Pinnacle',
]


def contains_target(parse_service: ParseService, target: str, names: list[str]) -> bool:
    target_normalized = parse_service._normalize_keyword_text(target)
    for name in names:
        name_normalized = parse_service._normalize_keyword_text(name)
        if target_normalized and target_normalized in name_normalized:
            return True
    return False


async def main() -> None:
    settings = SettingsService().load_fetch_settings()
    scrape_service = ScrapeService()
    parse_service = ParseService()

    _, payloads, raw_html_map = await scrape_service.fetch_pages(
        'okooo',
        'https://www.okooo.com/soccer/match/1292872/odds/',
        cookie=settings.cookie,
        cookies=settings.cookies,
    )

    _, european_all_rows = parse_service.parse_european_odds(raw_html_map.get('odds', ''), selected_companies=None)
    _, asian_all_rows = parse_service.parse_asian_handicap(raw_html_map.get('asian_handicap', ''), selected_companies=None)

    european_names = [row.institution_name for row in european_all_rows]
    asian_names = [row.institution_name for row in asian_all_rows]

    missing_european = [target for target in EU_TARGETS if not contains_target(parse_service, target, european_names)]
    missing_asian = [target for target in AH_TARGETS if not contains_target(parse_service, target, asian_names)]

    result = {
        'fetched_pages': {key: {'fetched': value.fetched, 'status_code': value.status_code, 'html_length': value.html_length} for key, value in payloads.items()},
        'european_all_count': len(european_names),
        'european_names': european_names,
        'asian_all_count': len(asian_names),
        'asian_names': asian_names,
        'missing_european_targets': missing_european,
        'missing_asian_targets': missing_asian,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


asyncio.run(main())
