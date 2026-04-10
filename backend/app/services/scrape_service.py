import asyncio
import random
import re

import httpx
from bs4 import BeautifulSoup

from app.adapters.site_adapter import SiteAdapterFactory
from app.core.config import settings
from app.models.schemas import ScrapeMatchResponse, ScrapedPagePayload, SiteType
from app.services.parse_service import ParseService


BROWSER_PROFILES: tuple[dict[str, str], ...] = (
    {
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
        "sec_ch_ua": '"Google Chrome";v="132", "Chromium";v="132", "Not_A Brand";v="24"',
        "sec_ch_ua_platform": '"Windows"',
        "accept_language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7",
    },
    {
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
        "sec_ch_ua": '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "sec_ch_ua_platform": '"Windows"',
        "accept_language": "zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7",
    },
    {
        "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
        "sec_ch_ua": "",
        "sec_ch_ua_platform": "",
        "accept_language": "zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3",
    },
)


class ScrapeService:
    def __init__(self) -> None:
        self._cookie_cursor = 0
        self._parse_service = ParseService()

    async def scrape_match(self, site: SiteType, match_url: str, cookie: str | None = None, cookies: list[str] | None = None) -> ScrapeMatchResponse:
        parsed, payloads, _ = await self.fetch_pages(site, match_url, cookie=cookie, cookies=cookies)
        match_key = parsed.get("match_id") or "unknown"
        return ScrapeMatchResponse(
            site=site,
            match_key=str(match_key),
            source_url=match_url,
            pages=payloads,
            parsed=parsed,
        )

    async def fetch_change_pages(
        self,
        site: SiteType,
        match_url: str,
        european_ids: list[int] | None = None,
        asian_ids: list[int] | None = None,
        cookie: str | None = None,
        cookies: list[str] | None = None,
    ) -> tuple[dict[str, ScrapedPagePayload], dict[str, str]]:
        adapter = SiteAdapterFactory.get_adapter(site)
        parsed = adapter.parse_match_url(match_url)
        cookie_pool = self._normalize_cookie_pool(cookie, cookies)
        session_profile = self._pick_browser_profile()
        change_requests = self._build_okooo_change_requests(parsed, european_ids=european_ids, asian_ids=asian_ids)

        payloads: dict[str, ScrapedPagePayload] = {}
        raw_html_map: dict[str, str] = {}
        if not change_requests:
            return payloads, raw_html_map

        async with httpx.AsyncClient(
            timeout=settings.request_timeout_seconds,
            follow_redirects=True,
        ) as client:
            await self._warm_up_session(client, session_profile, cookie_pool[0] if cookie_pool else None)
            for key, page_url, referer in change_requests:
                active_cookie = self._next_cookie(cookie_pool)
                try:
                    response = await client.get(page_url, headers=self._build_navigate_headers(active_cookie, referer, session_profile))
                    html = self._decode_html(response)
                    title = self._extract_title(html)
                    response.raise_for_status()
                    blocked_reason = self._detect_detail_block_reason(html, str(response.url))
                    if blocked_reason:
                        payloads[key] = ScrapedPagePayload(
                            page_url=page_url,
                            html_length=len(html),
                            fetched=False,
                            title=title,
                            status_code=response.status_code,
                            final_url=str(response.url),
                            error_message=blocked_reason,
                        )
                        continue
                    raw_html_map[key] = html
                    payloads[key] = ScrapedPagePayload(
                        page_url=page_url,
                        html_length=len(html),
                        fetched=True,
                        title=title,
                        status_code=response.status_code,
                        final_url=str(response.url),
                        error_message=None,
                    )
                    await self._sleep_between(700, 1600)
                except httpx.HTTPStatusError as exc:
                    payloads[key] = ScrapedPagePayload(
                        page_url=page_url,
                        html_length=0,
                        fetched=False,
                        title=None,
                        status_code=exc.response.status_code if exc.response else None,
                        final_url=str(exc.response.url) if exc.response else page_url,
                        error_message=self._describe_http_error(exc),
                    )
                except httpx.TimeoutException:
                    payloads[key] = ScrapedPagePayload(
                        page_url=page_url,
                        html_length=0,
                        fetched=False,
                        title=None,
                        status_code=None,
                        final_url=page_url,
                        error_message="请求超时，站点响应过慢或连接被拦截。",
                    )
                except httpx.RequestError as exc:
                    payloads[key] = ScrapedPagePayload(
                        page_url=page_url,
                        html_length=0,
                        fetched=False,
                        title=None,
                        status_code=None,
                        final_url=page_url,
                        error_message=f"请求异常：{exc}",
                    )
                except Exception as exc:
                    payloads[key] = ScrapedPagePayload(
                        page_url=page_url,
                        html_length=0,
                        fetched=False,
                        title=None,
                        status_code=None,
                        final_url=page_url,
                        error_message=f"抓取异常：{exc}",
                    )

        return payloads, raw_html_map

    async def test_cookie(
        self,
        site: SiteType,
        match_url: str,
        cookie: str | None = None,
        cookies: list[str] | None = None,
        selected_european_companies: list[str] | None = None,
        selected_asian_companies: list[str] | None = None,
    ) -> dict:
        cookie_pool = self._normalize_cookie_pool(cookie, cookies)
        parsed, payloads, raw_html_map = await self.fetch_pages(site, match_url, cookie=cookie, cookies=cookies)
        overview = self._build_test_overview(
            site,
            payloads,
            raw_html_map,
            selected_european_companies=selected_european_companies,
            selected_asian_companies=selected_asian_companies,
        )
        non_critical_match_failure = self._is_non_critical_match_failure(overview)
        cookie_diagnostics: list[dict] = []
        for index, cookie_item in enumerate(cookie_pool, start=1):
            _, single_payloads, single_raw_html_map = await self.fetch_pages(
                site,
                match_url,
                cookie=cookie_item,
                cookies=[cookie_item],
            )
            cookie_diagnostics.append(
                self._build_cookie_diagnostic(
                    site=site,
                    cookie_value=cookie_item,
                    index=index,
                    payloads=single_payloads,
                    raw_html_map=single_raw_html_map,
                    selected_european_companies=selected_european_companies,
                    selected_asian_companies=selected_asian_companies,
                )
            )
        suggestions: list[str] = []
        if not cookie_pool:
            suggestions.append("当前没有填写Cookie，建议先从浏览器复制已登录的澳客Cookie再测试。")
        if any(item.get("status_code") in {401, 403} for item in overview["failed_pages"]):
            suggestions.append("出现401/403，通常表示Cookie失效、权限不足，或被站点风控拦截。")
        if non_critical_match_failure:
            suggestions.append("当前比赛主页面返回 405，但欧赔页、亚盘页、历史页已抓取成功，且结构化赔率完整，当前链接仍可继续分析。")
        if any("登录" in (item.get("error_message") or "") or "验证" in (item.get("error_message") or "") for item in overview["failed_pages"]):
            suggestions.append("返回内容像登录页或验证页，建议更换Cookie，或稍后再试。")
        if overview["parse_summary"]["odds_fetched"] and overview["parse_summary"]["european_count"] < 10:
            suggestions.append(f"欧赔 AJAX 已抓到，但当前只识别出 {overview['parse_summary']['european_count']} 家目标机构，说明页面结构或机构名仍有干扰。")
        if overview["parse_summary"]["asian_fetched"] and overview["parse_summary"]["asian_count"] < 5:
            suggestions.append(f"亚盘 AJAX 已抓到，但当前只识别出 {overview['parse_summary']['asian_count']} 家目标机构，说明页面结构或机构名仍有干扰。")
        healthy_cookie_count = sum(1 for item in cookie_diagnostics if item["valid"])
        if cookie_pool and healthy_cookie_count == 0:
            suggestions.append("当前 Cookie 池里没有可稳定访问关键页的 Cookie，建议整体更换。")
        elif len(cookie_pool) > 1 and healthy_cookie_count < len(cookie_pool):
            suggestions.append(f"当前 Cookie 池里有 {healthy_cookie_count} / {len(cookie_pool)} 个 Cookie 可用，建议优先保留状态更稳定的 Cookie。")
        if not suggestions and overview["failed_pages"] and not non_critical_match_failure:
            suggestions.append("Cookie可能部分有效，但核心赔率页仍被限制，建议增加更多Cookie轮询或降低请求频率。")
        if not overview["failed_pages"] or non_critical_match_failure:
            suggestions.append("所有关键页面都已抓取成功，可以继续做结构化解析和正式分析。")
        return {
            "valid": overview["valid"],
            "match_key": str(parsed.get("match_id") or "unknown"),
            "cookie_count": len(cookie_pool),
            "healthy_cookie_count": healthy_cookie_count,
            "fetched_pages": overview["fetched_pages"],
            "failed_pages": overview["failed_pages"],
            "pages": overview["pages"],
            "parse_summary": overview["parse_summary"],
            "cookie_diagnostics": cookie_diagnostics,
            "suggestions": suggestions,
        }

    async def fetch_pages(self, site: SiteType, match_url: str, cookie: str | None = None, cookies: list[str] | None = None) -> tuple[dict, dict[str, ScrapedPagePayload], dict[str, str]]:
        adapter = SiteAdapterFactory.get_adapter(site)
        parsed = adapter.parse_match_url(match_url)
        pages = self._build_okooo_pages(parsed)
        cookie_pool = self._normalize_cookie_pool(cookie, cookies)
        session_profile = self._pick_browser_profile()

        payloads: dict[str, ScrapedPagePayload] = {}
        raw_html_map: dict[str, str] = {}
        async with httpx.AsyncClient(
            timeout=settings.request_timeout_seconds,
            follow_redirects=True,
        ) as client:
            await self._warm_up_session(client, session_profile, cookie_pool[0] if cookie_pool else None)
            for key, page_url in pages.items():
                active_cookie = self._next_cookie(cookie_pool)
                try:
                    response, html, title = await self._fetch_page(
                        client=client,
                        key=key,
                        page_url=page_url,
                        parsed=parsed,
                        cookie=active_cookie,
                        profile=session_profile,
                    )
                    response.raise_for_status()
                    blocked_reason = self._detect_block_reason(html, str(response.url))
                    if blocked_reason:
                        payloads[key] = ScrapedPagePayload(
                            page_url=page_url,
                            html_length=len(html),
                            fetched=False,
                            title=title or self._extract_title(html),
                            status_code=response.status_code,
                            final_url=str(response.url),
                            error_message=blocked_reason,
                        )
                        continue
                    raw_html_map[key] = html
                    payloads[key] = ScrapedPagePayload(
                        page_url=page_url,
                        html_length=len(html),
                        fetched=True,
                        title=title or self._extract_title(html),
                        status_code=response.status_code,
                        final_url=str(response.url),
                        error_message=None,
                    )
                except httpx.HTTPStatusError as exc:
                    payloads[key] = ScrapedPagePayload(
                        page_url=page_url,
                        html_length=0,
                        fetched=False,
                        title=None,
                        status_code=exc.response.status_code if exc.response else None,
                        final_url=str(exc.response.url) if exc.response else page_url,
                        error_message=self._describe_http_error(exc),
                    )
                except httpx.TimeoutException:
                    payloads[key] = ScrapedPagePayload(
                        page_url=page_url,
                        html_length=0,
                        fetched=False,
                        title=None,
                        status_code=None,
                        final_url=page_url,
                        error_message="请求超时，站点响应过慢或连接被拦截。",
                    )
                except httpx.RequestError as exc:
                    payloads[key] = ScrapedPagePayload(
                        page_url=page_url,
                        html_length=0,
                        fetched=False,
                        title=None,
                        status_code=None,
                        final_url=page_url,
                        error_message=f"请求异常：{exc}",
                    )
                except Exception as exc:
                    payloads[key] = ScrapedPagePayload(
                        page_url=page_url,
                        html_length=0,
                        fetched=False,
                        title=None,
                        status_code=None,
                        final_url=page_url,
                        error_message=f"抓取异常：{exc}",
                    )

        return parsed, payloads, raw_html_map

    def _build_okooo_pages(self, parsed: dict) -> dict[str, str]:
        match_id = parsed["match_id"]
        base = f"https://www.okooo.com/soccer/match/{match_id}"
        return {
            "match": f"{base}/",
            "odds": f"{base}/odds/",
            "asian_handicap": f"{base}/ah/",
            "history": f"{base}/history/",
        }

    def _build_okooo_change_requests(self, parsed: dict, european_ids: list[int] | None = None, asian_ids: list[int] | None = None) -> list[tuple[str, str, str]]:
        match_id = parsed["match_id"]
        base = f"https://www.okooo.com/soccer/match/{match_id}"
        requests: list[tuple[str, str, str]] = []
        seen_keys: set[str] = set()
        for institution_id in european_ids or []:
            normalized_id = int(institution_id)
            if normalized_id <= 0:
                continue
            key = f"odds_change_{normalized_id}"
            if key in seen_keys:
                continue
            seen_keys.add(key)
            requests.append((key, f"{base}/odds/change/{normalized_id}/", f"{base}/odds/"))
        for institution_id in asian_ids or []:
            normalized_id = int(institution_id)
            if normalized_id <= 0:
                continue
            key = f"asian_handicap_change_{normalized_id}"
            if key in seen_keys:
                continue
            seen_keys.add(key)
            requests.append((key, f"{base}/ah/change/{normalized_id}/", f"{base}/ah/"))
        return requests

    async def _fetch_page(
        self,
        client: httpx.AsyncClient,
        key: str,
        page_url: str,
        parsed: dict,
        cookie: str | None,
        profile: dict[str, str],
    ) -> tuple[httpx.Response, str, str | None]:
        match_id = parsed["match_id"]
        base = f"https://www.okooo.com/soccer/match/{match_id}"
        if key == "odds":
            return await self._fetch_ajax_page(
                client=client,
                main_url=f"{base}/odds/",
                ajax_url=f"{base}/odds/ajax/?page=0&all=1&companytype=BaijiaBooks&type=0",
                main_referer=f"{base}/",
                ajax_referer=f"{base}/odds/",
                cookie=cookie,
                profile=profile,
            )
        if key == "asian_handicap":
            return await self._fetch_ajax_page(
                client=client,
                main_url=f"{base}/ah/",
                ajax_url=f"{base}/ah/ajax/?page=0&all=1&companytype=BaijiaBooks&type=0",
                main_referer=f"{base}/",
                ajax_referer=f"{base}/ah/",
                cookie=cookie,
                profile=profile,
            )
        referer = self._resolve_referer(key, match_id)
        response = await client.get(page_url, headers=self._build_navigate_headers(cookie, referer, profile))
        html = self._decode_html(response)
        return response, html, self._extract_title(html)

    async def _fetch_ajax_page(
        self,
        client: httpx.AsyncClient,
        main_url: str,
        ajax_url: str,
        main_referer: str,
        ajax_referer: str,
        cookie: str | None,
        profile: dict[str, str],
    ) -> tuple[httpx.Response, str, str | None]:
        main_response = await client.get(main_url, headers=self._build_navigate_headers(cookie, main_referer, profile))
        main_response.raise_for_status()
        main_html = self._decode_html(main_response)
        title = self._extract_title(main_html)
        await self._sleep_between(900, 1800)
        ajax_response = await client.get(ajax_url, headers=self._build_ajax_headers(cookie, ajax_referer, profile))
        ajax_html = self._decode_html(ajax_response)
        return ajax_response, ajax_html, title

    async def _warm_up_session(
        self,
        client: httpx.AsyncClient,
        profile: dict[str, str],
        cookie: str | None,
    ) -> None:
        warmup_steps = (
            ("https://www.okooo.com/", "https://www.okooo.com/"),
            ("https://www.okooo.com/soccer/", "https://www.okooo.com/"),
        )
        for url, referer in warmup_steps:
            try:
                await client.get(url, headers=self._build_navigate_headers(cookie, referer, profile))
            except httpx.HTTPError:
                continue
            await self._sleep_between(700, 1600)

    async def _sleep_between(self, min_ms: int, max_ms: int) -> None:
        await asyncio.sleep(random.randint(min_ms, max_ms) / 1000)

    def _pick_browser_profile(self) -> dict[str, str]:
        return random.choice(BROWSER_PROFILES)

    def _resolve_referer(self, key: str, match_id: str) -> str:
        base = f"https://www.okooo.com/soccer/match/{match_id}"
        referer_map = {
            "match": "https://www.okooo.com/soccer/",
            "history": f"{base}/odds/",
        }
        return referer_map.get(key, "https://www.okooo.com/")

    def _build_navigate_headers(self, cookie: str | None, referer: str, profile: dict[str, str]) -> dict[str, str]:
        headers = {
            "User-Agent": profile["user_agent"],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": profile["accept_language"],
            "Cache-Control": "max-age=0",
            "Connection": "keep-alive",
            "Referer": referer,
            "Upgrade-Insecure-Requests": "1",
        }
        if profile["sec_ch_ua"]:
            headers["Sec-Ch-Ua"] = profile["sec_ch_ua"]
            headers["Sec-Ch-Ua-Mobile"] = "?0"
            headers["Sec-Ch-Ua-Platform"] = profile["sec_ch_ua_platform"]
            headers["Sec-Fetch-Dest"] = "document"
            headers["Sec-Fetch-Mode"] = "navigate"
            headers["Sec-Fetch-Site"] = "same-origin"
            headers["Sec-Fetch-User"] = "?1"
        if cookie and cookie.strip():
            headers["Cookie"] = cookie.strip()
        return headers

    def _build_ajax_headers(self, cookie: str | None, referer: str, profile: dict[str, str]) -> dict[str, str]:
        headers = {
            "User-Agent": profile["user_agent"],
            "Accept": "text/html, */*; q=0.01",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": profile["accept_language"],
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Pragma": "no-cache",
            "Referer": referer,
            "X-Requested-With": "XMLHttpRequest",
        }
        if profile["sec_ch_ua"]:
            headers["Sec-Ch-Ua"] = profile["sec_ch_ua"]
            headers["Sec-Ch-Ua-Mobile"] = "?0"
            headers["Sec-Ch-Ua-Platform"] = profile["sec_ch_ua_platform"]
            headers["Sec-Fetch-Dest"] = "empty"
            headers["Sec-Fetch-Mode"] = "cors"
            headers["Sec-Fetch-Site"] = "same-origin"
        if cookie and cookie.strip():
            headers["Cookie"] = cookie.strip()
        return headers

    def _decode_html(self, response: httpx.Response) -> str:
        raw = response.content
        encodings = [response.encoding, "utf-8", "gb18030", "gbk"]
        for encoding in encodings:
            if not encoding:
                continue
            try:
                return raw.decode(encoding)
            except UnicodeDecodeError:
                continue
        return raw.decode("utf-8", errors="ignore")

    def _extract_title(self, html: str) -> str | None:
        soup = BeautifulSoup(html, 'lxml')
        if soup.title and soup.title.text:
            return re.sub(r"\s+", " ", soup.title.text).strip()
        return None

    def _normalize_cookie_pool(self, cookie: str | None, cookies: list[str] | None) -> list[str]:
        normalized = [item.strip() for item in (cookies or []) if item and item.strip()]
        if cookie and cookie.strip() and cookie.strip() not in normalized:
            normalized.insert(0, cookie.strip())
        return normalized

    def _build_test_overview(
        self,
        site: SiteType,
        payloads: dict[str, ScrapedPagePayload],
        raw_html_map: dict[str, str],
        selected_european_companies: list[str] | None = None,
        selected_asian_companies: list[str] | None = None,
    ) -> dict:
        fetched_pages = [key for key, page in payloads.items() if page.fetched]
        failed_pages = [
            {
                "key": key,
                "page_url": page.page_url,
                "status_code": page.status_code,
                "final_url": page.final_url,
                "error_message": page.error_message,
            }
            for key, page in payloads.items()
            if not page.fetched
        ]
        parse_summary = self._build_parse_summary(
            site,
            raw_html_map,
            selected_european_companies=selected_european_companies,
            selected_asian_companies=selected_asian_companies,
        )
        fetched_page_set = set(fetched_pages)
        core_pages_ready = {"odds", "asian_handicap", "history"}.issubset(fetched_page_set)
        match_payload = payloads.get("match")
        match_ready = bool(match_payload and match_payload.fetched)
        match_failed_with_405 = bool(match_payload and not match_payload.fetched and match_payload.status_code == 405)
        parse_ready = parse_summary.get("european_count", 0) >= 14 and parse_summary.get("asian_count", 0) >= 7
        valid = core_pages_ready and (match_ready or (match_failed_with_405 and parse_ready))
        return {
            "valid": valid,
            "fetched_pages": fetched_pages,
            "failed_pages": failed_pages,
            "pages": {key: page.model_dump() for key, page in payloads.items()},
            "parse_summary": parse_summary,
        }

    def _is_non_critical_match_failure(self, overview: dict) -> bool:
        failed_pages = overview.get("failed_pages") or []
        if len(failed_pages) != 1:
            return False
        failed_page = failed_pages[0]
        if failed_page.get("key") != "match":
            return False
        if failed_page.get("status_code") != 405:
            return False
        parse_summary = overview.get("parse_summary") or {}
        fetched_pages = set(overview.get("fetched_pages") or [])
        return {
            "odds",
            "asian_handicap",
            "history",
        }.issubset(fetched_pages) and parse_summary.get("european_count", 0) >= 14 and parse_summary.get("asian_count", 0) >= 7

    def _build_cookie_diagnostic(
        self,
        site: SiteType,
        cookie_value: str,
        index: int,
        payloads: dict[str, ScrapedPagePayload],
        raw_html_map: dict[str, str],
        selected_european_companies: list[str] | None = None,
        selected_asian_companies: list[str] | None = None,
    ) -> dict:
        overview = self._build_test_overview(
            site,
            payloads,
            raw_html_map,
            selected_european_companies=selected_european_companies,
            selected_asian_companies=selected_asian_companies,
        )
        total_pages = len(payloads) or 1
        fetched_count = len(overview["fetched_pages"])
        failed_pages = overview["failed_pages"]
        latest_failure = failed_pages[-1] if failed_pages else None
        return {
            "index": index,
            "label": f"Cookie {index}",
            "cookie_preview": self._mask_cookie(cookie_value),
            "valid": overview["valid"],
            "success_rate": round(fetched_count / total_pages, 4),
            "fetched_page_count": fetched_count,
            "failed_page_count": len(failed_pages),
            "parse_summary": overview["parse_summary"],
            "last_error": latest_failure.get("error_message") if latest_failure else None,
            "last_failed_page": latest_failure.get("key") if latest_failure else None,
            "failed_pages": failed_pages,
        }

    def _mask_cookie(self, cookie_value: str) -> str:
        normalized = cookie_value.strip()
        if not normalized:
            return "未填写"
        segments = [item.strip() for item in normalized.split(";") if item.strip()]
        visible_segments: list[str] = []
        for segment in segments[:2]:
            if "=" not in segment:
                visible_segments.append(segment[:6] + "***")
                continue
            key, value = segment.split("=", 1)
            masked_value = value[:4] + "***" if value else "***"
            visible_segments.append(f"{key}={masked_value}")
        if len(segments) > 2:
            visible_segments.append("...")
        return "; ".join(visible_segments)

    def _next_cookie(self, cookies: list[str]) -> str | None:
        if not cookies:
            return None
        selected = cookies[self._cookie_cursor % len(cookies)]
        self._cookie_cursor += 1
        return selected

    def _describe_http_error(self, exc: httpx.HTTPStatusError) -> str:
        response = exc.response
        if response is None:
            return "请求失败，未拿到有效响应。"
        if response.status_code == 403:
            return "站点返回403，通常是Cookie失效、权限不足或触发风控。"
        if response.status_code == 401:
            return "站点返回401，通常表示当前Cookie未登录或已过期。"
        if response.status_code == 429:
            return "站点返回429，请求过于频繁，建议更换Cookie或稍后再试。"
        return f"站点返回HTTP {response.status_code}。"

    def _detect_block_reason(self, html: str, final_url: str) -> str | None:
        if self._is_empty_ajax_needing_login(html):
            return "AJAX 返回空数据且标记 needLogin=1，当前 Cookie 未登录或已失效，请用浏览器登录澳客网后重新复制 Cookie。"
        if self._contains_valid_data_markers(html):
            return None
        normalized_html = html.lower()
        normalized_url = final_url.lower()
        body_text = re.sub(r"<[^>]+>", " ", html)
        normalized_body = re.sub(r"\s+", " ", body_text).lower()
        if self._contains_valid_content_signals(normalized_html, normalized_body):
            return None
        blocked_signals = ["验证码", "安全验证", "访问过于频繁", "请先登录", "登录后查看", "风控"]
        if any(signal in body_text for signal in blocked_signals):
            return "页面内容疑似被风控或要求登录，当前Cookie可能无效。"
        if any(keyword in normalized_url for keyword in ["login", "passport", "signin"]):
            return "请求被跳转到登录页，当前Cookie可能无效或已过期。"
        if any(keyword in normalized_html for keyword in ["captcha", "geetest", "secverify"]):
            return "页面内容疑似验证码或校验页，建议更换Cookie后重试。"
        verify_phrases = [
            "verify you are human",
            "security verification",
            "please verify",
            "human verification",
            "robot check",
        ]
        if any(phrase in normalized_body for phrase in verify_phrases):
            return "页面内容疑似验证码或校验页，建议更换Cookie后重试。"
        return None

    def _detect_detail_block_reason(self, html: str, final_url: str) -> str | None:
        if self._is_empty_ajax_needing_login(html):
            return "详情页返回空数据且标记 needLogin=1，当前 Cookie 未登录或已失效。"
        normalized_html = html.lower()
        normalized_url = final_url.lower()
        body_text = re.sub(r"<[^>]+>", " ", html)
        normalized_body = re.sub(r"\s+", " ", body_text).lower()
        if re.search(r'\d{4}/\d{1,2}/\d{1,2}\s+\d{1,2}:\d{2}', html) and '<td' in normalized_html:
            return None
        blocked_signals = ["验证码", "安全验证", "访问过于频繁", "请先登录", "登录后查看", "风控"]
        if any(signal in body_text for signal in blocked_signals):
            return "详情页内容疑似被风控或要求登录，当前 Cookie 可能无效。"
        if any(keyword in normalized_url for keyword in ["login", "passport", "signin"]):
            return "详情页请求被跳转到登录页，当前 Cookie 可能无效或已过期。"
        if any(keyword in normalized_html for keyword in ["captcha", "geetest", "secverify"]):
            return "详情页内容疑似验证码或校验页，建议更换 Cookie 后重试。"
        verify_phrases = [
            "verify you are human",
            "security verification",
            "please verify",
            "human verification",
            "robot check",
        ]
        if any(phrase in normalized_body for phrase in verify_phrases):
            return "详情页内容疑似验证码或校验页，建议更换 Cookie 后重试。"
        return None

    def _is_empty_ajax_needing_login(self, html: str) -> bool:
        stripped = html.strip()
        if len(stripped) > 500:
            return False
        return "needLogin" in stripped and ("data_str = '[]'" in stripped or "data_str='[]'" in stripped)

    def _contains_valid_data_markers(self, html: str) -> bool:
        normalized_html = html.lower()
        return any(marker in normalized_html for marker in ["data-time=", "ftrobj", "<tr id=\"tr", "<tr id='tr"])

    def _contains_valid_content_signals(self, normalized_html: str, normalized_body: str) -> bool:
        content_keywords = ["直播", "阵容", "技术统计", "交锋", "积分榜", "分析", "近期战绩", "比赛历史"]
        matched_keywords = sum(1 for keyword in content_keywords if keyword in normalized_body)
        content_markers = ["match_data", "team_battle", "history", "analysis", "live", "lineup"]
        matched_markers = sum(1 for marker in content_markers if marker in normalized_html)
        return matched_keywords >= 2 or matched_markers >= 2

    def _build_parse_summary(
        self,
        site: SiteType,
        raw_html_map: dict[str, str],
        selected_european_companies: list[str] | None = None,
        selected_asian_companies: list[str] | None = None,
    ) -> dict[str, int | bool]:
        european_count = 0
        asian_count = 0
        if site == SiteType.OKOOO:
            if raw_html_map.get("odds"):
                _, european_rows = self._parse_service.parse_european_odds(
                    raw_html_map["odds"],
                    selected_companies=selected_european_companies,
                )
                european_count = len(european_rows)
            if raw_html_map.get("asian_handicap"):
                _, asian_rows = self._parse_service.parse_asian_handicap(
                    raw_html_map["asian_handicap"],
                    selected_companies=selected_asian_companies,
                )
                asian_count = len(asian_rows)
        return {
            "odds_fetched": bool(raw_html_map.get("odds")),
            "asian_fetched": bool(raw_html_map.get("asian_handicap")),
            "european_count": european_count,
            "asian_count": asian_count,
        }
