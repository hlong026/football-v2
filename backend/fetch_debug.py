import httpx
import asyncio
import json
from app.services.scrape_service import ScrapeService
from app.services.parse_service import ParseService

async def main():
    svc = ScrapeService()
    # Use saved cookies from settings
    from app.services.settings_service import SettingsService
    ss = SettingsService()
    saved = ss.load_fetch_settings()
    cookies = saved.cookies
    cookie = saved.cookie

    for mid in ["1296044", "1296041"]:
      print(f"\n{'='*40}")
      print(f"TESTING MATCH {mid}")
      print(f"{'='*40}")
      parsed, payloads, raw_html_map = await svc.fetch_pages(
        "okooo",
        f"https://www.okooo.com/soccer/match/{mid}/odds/",
        cookie=cookie,
        cookies=cookies,
      )

      print("=== FETCHED PAGES ===")
      for key, p in payloads.items():
          print(f"  {key}: fetched={p.fetched}, html_len={p.html_length}, status={p.status_code}")
      for key in ("odds", "asian_handicap"):
          html = raw_html_map.get(key, "")
          if html:
              print(f"  {key} first 300: {html[:300]}")
      ps = ParseService()
      eu = ["澳门","William Hill","Ladbrokes","bwin","Coral","SNAI","Bet365","Interwetten","Pinnacle","betvictor","Easybet","Crown","金宝博","bet-at-home"]
      ah = ["澳门","Bet365","betvictor","Easybet","Crown","金宝博","Pinnacle"]
      if raw_html_map.get("odds"):
          _, rows = ps.parse_european_odds(raw_html_map["odds"], selected_companies=eu)
          print(f"  EU filtered: {len(rows)}")
      if raw_html_map.get("asian_handicap"):
          _, rows = ps.parse_asian_handicap(raw_html_map["asian_handicap"], selected_companies=ah)
          print(f"  AH filtered: {len(rows)}")
      import time; time.sleep(3)  # avoid rate limiting

asyncio.run(main())
