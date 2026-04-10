import re
from datetime import datetime, timedelta, timezone
from html import unescape

from bs4 import BeautifulSoup
from bs4.element import Tag

from app.models.schemas import AsianHandicapChangeRecord, AsianHandicapRow, EuropeanOddsChangeRecord, EuropeanOddsRow


class ParseService:
    source_timezone = timezone(timedelta(hours=8))
    european_keywords: list[list[str]] = [
        ["澳门", "澳彩"],
        ["威廉", "William Hill"],
        ["立博", "Ladbrokes"],
        ["bwin", "Bwin", "BWIN"],
        ["Coral"],
        ["SNAI"],
        ["bet-at-home", "Bet-at-home"],
        ["Bet365", "bet365", "BET365", "日博"],
        ["betvictor", "Betvictor", "BetVictor", "伟德"],
        ["Easybet", "易胜博"],
        ["Crown", "皇冠"],
        ["Interwetten", "英特"],
        ["Pinnacle", "平博"],
        ["金宝博", "188bet", "188BET"],
    ]
    asian_keywords: list[list[str]] = [
        ["澳门", "澳彩"],
        ["Bet365", "bet365", "BET365", "日博", "365"],
        ["betvictor", "Betvictor", "BetVictor", "伟德"],
        ["Easybet", "易胜博"],
        ["Crown", "皇冠"],
        ["金宝博", "188bet", "188BET"],
        ["Pinnacle", "平博"],
    ]

    def parse_european_odds(self, html: str, selected_companies: list[str] | None = None) -> tuple[EuropeanOddsRow | None, list[EuropeanOddsRow]]:
        soup = BeautifulSoup(self._normalize_table_html(html), 'lxml')
        rows = self._select_rows(soup)
        parsed_rows: list[EuropeanOddsRow] = []

        for row in rows:
            row_id = row.get('id', '')
            if row_id in {'avgObj', 'maxObj', 'minObj', 'filterTips'}:
                continue
            cells = row.find_all('td')
            if len(cells) < 15:
                continue

            institution_id = self._safe_int(row_id.replace('tr', ''))
            institution_name = self._extract_institution_name(cells[1], row.get('data-pname', ''))
            country = self._extract_country(cells[1])
            update_timestamp = self._safe_int(row.get('data-time', '0'))

            initial_home = self._extract_number(cells[2])
            initial_draw = self._extract_number(cells[3])
            initial_away = self._extract_number(cells[4])
            latest_home = self._extract_number(cells[5])
            latest_draw = self._extract_number(cells[6])
            latest_away = self._extract_number(cells[7])
            home_probability = self._extract_number(cells[9])
            draw_probability = self._extract_number(cells[10])
            away_probability = self._extract_number(cells[11])
            kelly_home = self._extract_number(cells[12])
            kelly_draw = self._extract_number(cells[13])
            kelly_away = self._extract_number(cells[14])
            return_rate = self._extract_number(cells[15]) if len(cells) > 15 else 0.0

            final_initial_home = initial_home if initial_home > 0 else latest_home
            final_initial_draw = initial_draw if initial_draw > 0 else latest_draw
            final_initial_away = initial_away if initial_away > 0 else latest_away

            if latest_home <= 0 and latest_draw <= 0 and latest_away <= 0:
                continue

            parsed_rows.append(
                EuropeanOddsRow(
                    institution_id=institution_id,
                    institution_name=institution_name,
                    country=country,
                    initial_home=final_initial_home,
                    initial_draw=final_initial_draw,
                    initial_away=final_initial_away,
                    latest_home=latest_home,
                    latest_draw=latest_draw,
                    latest_away=latest_away,
                    home_probability=home_probability,
                    draw_probability=draw_probability,
                    away_probability=away_probability,
                    kelly_home=kelly_home,
                    kelly_draw=kelly_draw,
                    kelly_away=kelly_away,
                    return_rate=return_rate,
                    update_timestamp=update_timestamp,
                )
            )

        average_row = self._average_european(parsed_rows)
        target_rows = self._filter_rows(parsed_rows, self._resolve_keyword_groups(selected_companies, self.european_keywords))
        return average_row, target_rows

    def parse_asian_handicap(self, html: str, selected_companies: list[str] | None = None) -> tuple[AsianHandicapRow | None, list[AsianHandicapRow]]:
        soup = BeautifulSoup(self._normalize_table_html(html), 'lxml')
        rows = self._select_rows(soup)
        parsed_rows: list[AsianHandicapRow] = []

        for row in rows:
            row_id = row.get('id', '')
            if row_id in {'avgObj', 'maxObj', 'minObj', 'filterTips'}:
                continue
            cells = row.find_all('td')
            if len(cells) < 13:
                continue

            institution_id = self._safe_int(row_id.replace('tr', ''))
            institution_name = self._extract_institution_name(cells[1], row.get('data-pname', ''))
            update_timestamp = self._safe_int(row.get('data-time', '0'))

            initial_home_water = self._extract_number(cells[2])
            initial_handicap = self._extract_text(cells[3])
            initial_away_water = self._extract_number(cells[4])
            latest_home_water = self._extract_number(cells[5])
            latest_handicap = self._extract_text(cells[6])
            latest_away_water = self._extract_number(cells[7])
            kelly_home = self._extract_number(cells[10])
            kelly_away = self._extract_number(cells[11])
            payoff = self._extract_number(cells[12])

            if latest_home_water <= 0 and latest_away_water <= 0:
                continue

            parsed_rows.append(
                AsianHandicapRow(
                    institution_id=institution_id,
                    institution_name=institution_name,
                    initial_home_water=initial_home_water if initial_home_water > 0 else latest_home_water,
                    initial_handicap=initial_handicap if initial_handicap else latest_handicap,
                    initial_away_water=initial_away_water if initial_away_water > 0 else latest_away_water,
                    latest_home_water=latest_home_water,
                    latest_handicap=latest_handicap,
                    latest_away_water=latest_away_water,
                    kelly_home=kelly_home,
                    kelly_away=kelly_away,
                    payoff=payoff,
                    update_timestamp=update_timestamp,
                )
            )

        average_row = self._average_asian(parsed_rows)
        target_rows = self._filter_rows(parsed_rows, self._resolve_keyword_groups(selected_companies, self.asian_keywords))
        return average_row, target_rows

    def parse_european_odds_change(self, html: str) -> list[EuropeanOddsChangeRecord]:
        soup = BeautifulSoup(self._normalize_table_html(html), 'lxml')
        rows = self._select_change_rows(
            soup,
            ['table.okooo_table tbody tr', 'table.listTable tbody tr', 'table.changeTable tbody tr', 'table.datatbl tbody tr', '#changeTable tbody tr', '.changeList tbody tr', 'table tbody tr'],
            minimum_cells=5,
        )
        parsed_rows: list[EuropeanOddsChangeRecord] = []

        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 5:
                continue

            change_time = self._extract_text(cells[0])
            time_before_match = self._extract_text(cells[1]) if len(cells) > 1 else ''

            if not change_time or '时间' in change_time or '变化列表' in change_time:
                continue

            if len(cells) >= 12:
                home_odds = self._extract_number(cells[2])
                draw_odds = self._extract_number(cells[3])
                away_odds = self._extract_number(cells[4])
                home_probability = self._extract_number(cells[5])
                draw_probability = self._extract_number(cells[6])
                away_probability = self._extract_number(cells[7])
                kelly_home = self._extract_number(cells[8])
                kelly_draw = self._extract_number(cells[9])
                kelly_away = self._extract_number(cells[10])
                return_rate = self._extract_number(cells[11])
            else:
                home_odds = self._extract_number(cells[2])
                draw_odds = self._extract_number(cells[3])
                away_odds = self._extract_number(cells[4])
                home_probability, draw_probability, away_probability = self._calc_probabilities(home_odds, draw_odds, away_odds)
                total = (1 / home_odds) + (1 / draw_odds) + (1 / away_odds) if home_odds > 0 and draw_odds > 0 and away_odds > 0 else 0.0
                kelly_home = 0.0
                kelly_draw = 0.0
                kelly_away = 0.0
                return_rate = (1 / total) * 100 if total > 0 else 0.0

            if home_odds <= 0 and draw_odds <= 0 and away_odds <= 0:
                continue

            parsed_rows.append(
                EuropeanOddsChangeRecord(
                    change_time=change_time,
                    change_time_iso=self._parse_change_time_iso(change_time),
                    time_before_match=time_before_match,
                    home_odds=home_odds,
                    draw_odds=draw_odds,
                    away_odds=away_odds,
                    home_probability=home_probability,
                    draw_probability=draw_probability,
                    away_probability=away_probability,
                    kelly_home=kelly_home,
                    kelly_draw=kelly_draw,
                    kelly_away=kelly_away,
                    return_rate=return_rate,
                )
            )

        return self._strip_duplicate_live_european_row(parsed_rows)

    def parse_asian_handicap_change(self, html: str) -> list[AsianHandicapChangeRecord]:
        soup = BeautifulSoup(self._normalize_table_html(html), 'lxml')
        rows = self._select_change_rows(
            soup,
            ["table[width='450'] tbody tr", "table[style*='float:left'] tbody tr", 'table tbody tr'],
            minimum_cells=5,
        )
        parsed_rows: list[AsianHandicapChangeRecord] = []

        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 5:
                continue

            change_time = self._extract_text(cells[0])
            time_before_match = self._extract_text(cells[1])

            if not change_time or '时间' in change_time:
                continue

            home_water = self._extract_number(cells[2])
            handicap = self._extract_text(cells[3])
            away_water = self._extract_number(cells[4])

            if home_water <= 0 and away_water <= 0:
                continue

            parsed_rows.append(
                AsianHandicapChangeRecord(
                    change_time=change_time,
                    change_time_iso=self._parse_change_time_iso(change_time),
                    time_before_match=time_before_match,
                    home_water=home_water,
                    handicap=handicap,
                    away_water=away_water,
                    is_initial=self._contains_marker(change_time, '初'),
                    is_final=self._contains_marker(change_time, '终'),
                )
            )

        return self._strip_duplicate_live_asian_row(parsed_rows)

    def filter_european_odds_change(self, rows: list[EuropeanOddsChangeRecord], start_time: datetime, end_time: datetime | None = None) -> list[EuropeanOddsChangeRecord]:
        return [row for row in rows if self._is_in_time_range(row.change_time_iso, start_time, end_time)]

    def filter_asian_handicap_change(self, rows: list[AsianHandicapChangeRecord], start_time: datetime, end_time: datetime | None = None) -> list[AsianHandicapChangeRecord]:
        return [row for row in rows if self._is_in_time_range(row.change_time_iso, start_time, end_time)]

    def _select_rows(self, soup: BeautifulSoup) -> list[Tag]:
        selectors = ['tr[data-time]', 'tr.fTrObj', "tr[id^='tr']"]
        for selector in selectors:
            rows = soup.select(selector)
            if rows:
                return [row for row in rows if isinstance(row, Tag)]
        return []

    def _select_change_rows(self, soup: BeautifulSoup, selectors: list[str], minimum_cells: int) -> list[Tag]:
        for selector in selectors:
            rows = soup.select(selector)
            filtered_rows = [row for row in rows if isinstance(row, Tag) and not row.find('th') and minimum_cells <= len(row.find_all('td')) and 'titlebg' not in ' '.join(row.get('class', [])) and 'tableh' not in ' '.join(row.get('class', []))]
            if filtered_rows:
                return filtered_rows
        fallback_rows = soup.select('tr')
        return [row for row in fallback_rows if isinstance(row, Tag) and minimum_cells <= len(row.find_all('td'))]

    def _normalize_table_html(self, html: str) -> str:
        html = re.sub(r'data-time=(\d+)', r'data-time="\1"', html)
        html = re.sub(r'data-pname=([^"\s>][^\s>]*)', r'data-pname="\1"', html)
        trimmed = html.strip()
        if trimmed.startswith('<tr') and '<table' not in trimmed:
            return f'<html><body><table><tbody>{html}</tbody></table></body></html>'
        return html

    def _strip_duplicate_live_european_row(self, rows: list[EuropeanOddsChangeRecord]) -> list[EuropeanOddsChangeRecord]:
        if len(rows) < 2 or '实时' not in rows[0].change_time:
            return rows
        first = rows[0]
        second = rows[1]
        first_signature = (
            round(first.home_odds, 4),
            round(first.draw_odds, 4),
            round(first.away_odds, 4),
            round(first.home_probability, 4),
            round(first.draw_probability, 4),
            round(first.away_probability, 4),
            round(first.kelly_home, 4),
            round(first.kelly_draw, 4),
            round(first.kelly_away, 4),
            round(first.return_rate, 4),
        )
        second_signature = (
            round(second.home_odds, 4),
            round(second.draw_odds, 4),
            round(second.away_odds, 4),
            round(second.home_probability, 4),
            round(second.draw_probability, 4),
            round(second.away_probability, 4),
            round(second.kelly_home, 4),
            round(second.kelly_draw, 4),
            round(second.kelly_away, 4),
            round(second.return_rate, 4),
        )
        return rows[1:] if first_signature == second_signature else rows

    def _strip_duplicate_live_asian_row(self, rows: list[AsianHandicapChangeRecord]) -> list[AsianHandicapChangeRecord]:
        if len(rows) < 2 or '实时' not in rows[0].change_time:
            return rows
        first = rows[0]
        second = rows[1]
        first_signature = (
            round(first.home_water, 4),
            first.handicap,
            round(first.away_water, 4),
        )
        second_signature = (
            round(second.home_water, 4),
            second.handicap,
            round(second.away_water, 4),
        )
        return rows[1:] if first_signature == second_signature else rows

    def _extract_institution_name(self, cell: Tag, data_pname: str) -> str:
        cleaned_data_pname = self._clean_institution_name(data_pname)
        if cleaned_data_pname:
            return cleaned_data_pname
        titled = cell.select_one('span[title]')
        if titled and titled.get_text(strip=True):
            visible_title = self._extract_visible_institution_name(titled)
            if visible_title:
                return visible_title
        visible_name = self._extract_visible_institution_name(cell)
        if visible_name:
            return visible_name
        return self._clean_institution_name(self._extract_text(cell))

    def _extract_country(self, cell: Tag) -> str:
        country = cell.select_one('.countryname')
        if country and country.get_text(strip=True):
            return country.get_text(strip=True)
        titled = cell.select_one('span[title]')
        if titled and titled.get('title'):
            return str(titled.get('title')).strip()
        return '-'

    def _extract_number(self, cell: Tag) -> float:
        spans = cell.find_all('span')
        for span in spans:
            style = str(span.get('style', ''))
            if 'font-size:0' in style or 'font-size: 0' in style:
                continue
            value = self._number_from_text(span.get_text(' ', strip=True))
            if value is not None:
                return value
        value = self._number_from_text(cell.get_text(' ', strip=True))
        return value if value is not None else 0.0

    def _number_from_text(self, text: str) -> float | None:
        normalized = text.replace('%', '').replace('↑', '').replace('↓', '').replace('↑', '').replace('↓', '').strip()
        normalized = normalized.replace('\u2191', '').replace('\u2193', '')
        match = re.search(r'-?\d+(?:\.\d+)?', normalized)
        if not match:
            return None
        try:
            return float(match.group(0))
        except ValueError:
            return None

    def _extract_text(self, cell: Tag) -> str:
        return re.sub(r'\s+', ' ', cell.get_text(' ', strip=True)).strip()

    def _calc_probabilities(self, home: float, draw: float, away: float) -> tuple[float, float, float]:
        if home <= 0 or draw <= 0 or away <= 0:
            return 0.0, 0.0, 0.0
        total = (1 / home) + (1 / draw) + (1 / away)
        return (1 / home / total) * 100, (1 / draw / total) * 100, (1 / away / total) * 100

    def _filter_rows(self, rows: list, keyword_groups: list[list[str]]) -> list:
        result = []
        for keywords in keyword_groups:
            normalized_keywords = [self._normalize_keyword_text(keyword) for keyword in keywords]
            matched = next(
                (
                    row
                    for row in rows
                    if any(keyword and keyword in self._normalize_keyword_text(row.institution_name) for keyword in normalized_keywords)
                ),
                None,
            )
            if matched:
                result.append(matched)
        return result

    def _resolve_keyword_groups(self, selected_companies: list[str] | None, default_groups: list[list[str]]) -> list[list[str]]:
        if not selected_companies:
            return default_groups
        resolved_groups: list[list[str]] = []
        for company in selected_companies:
            normalized_company = self._normalize_keyword_text(company)
            if not normalized_company:
                continue
            matched_group = next(
                (
                    keywords
                    for keywords in default_groups
                    if any(normalized_company == self._normalize_keyword_text(keyword) for keyword in keywords)
                ),
                None,
            )
            resolved_groups.append(matched_group or [company])
        return resolved_groups or default_groups

    def _average_european(self, rows: list[EuropeanOddsRow]) -> EuropeanOddsRow | None:
        if not rows:
            return None
        count = len(rows)
        return EuropeanOddsRow(
            institution_id=0,
            institution_name=f'{count}家平均',
            country='-',
            initial_home=sum(row.initial_home for row in rows) / count,
            initial_draw=sum(row.initial_draw for row in rows) / count,
            initial_away=sum(row.initial_away for row in rows) / count,
            latest_home=sum(row.latest_home for row in rows) / count,
            latest_draw=sum(row.latest_draw for row in rows) / count,
            latest_away=sum(row.latest_away for row in rows) / count,
            home_probability=sum(row.home_probability for row in rows) / count,
            draw_probability=sum(row.draw_probability for row in rows) / count,
            away_probability=sum(row.away_probability for row in rows) / count,
            kelly_home=sum(row.kelly_home for row in rows) / count,
            kelly_draw=sum(row.kelly_draw for row in rows) / count,
            kelly_away=sum(row.kelly_away for row in rows) / count,
            return_rate=sum(row.return_rate for row in rows) / count,
            update_timestamp=0,
        )

    def _average_asian(self, rows: list[AsianHandicapRow]) -> AsianHandicapRow | None:
        if not rows:
            return None
        count = len(rows)
        return AsianHandicapRow(
            institution_id=0,
            institution_name=f'{count}家平均',
            initial_home_water=sum(row.initial_home_water for row in rows) / count,
            initial_handicap='-',
            initial_away_water=sum(row.initial_away_water for row in rows) / count,
            latest_home_water=sum(row.latest_home_water for row in rows) / count,
            latest_handicap='-',
            latest_away_water=sum(row.latest_away_water for row in rows) / count,
            kelly_home=sum(row.kelly_home for row in rows) / count,
            kelly_away=sum(row.kelly_away for row in rows) / count,
            payoff=sum(row.payoff for row in rows) / count,
            update_timestamp=0,
        )

    def _extract_visible_institution_name(self, cell: Tag) -> str:
        visible_soup = BeautifulSoup(str(cell), 'lxml')
        for hidden in visible_soup.select(
            '.countryname, '
            'span[style*="font-size:0"], '
            'span[style*="font-size: 0"], '
            'span[style*="font-size:0px"], '
            'span[style*="display:none"], '
            'span[style*="display: none"]'
        ):
            hidden.decompose()
        text = re.sub(r'\s+', ' ', visible_soup.get_text(' ', strip=True)).strip()
        return self._clean_institution_name(text)

    def _clean_institution_name(self, value: str) -> str:
        text = unescape(value or '')
        text = re.sub(
            r'<span[^>]*(?:font-size:\s*0|font-size:\s*0px|display:\s*none)[^>]*>.*?</span>',
            '',
            text,
            flags=re.IGNORECASE | re.DOTALL,
        )
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'[^0-9a-zA-Z\u4e00-\u9fff\s\-]+', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def _normalize_keyword_text(self, value: str) -> str:
        cleaned = self._clean_institution_name(value)
        return re.sub(r'[^0-9a-zA-Z\u4e00-\u9fff]+', '', cleaned).lower()

    def _parse_change_time_iso(self, value: str) -> str | None:
        matched = re.search(r'(\d{4}/\d{1,2}/\d{1,2}\s+\d{1,2}:\d{2})', value)
        if not matched:
            return None
        try:
            parsed = datetime.strptime(matched.group(1), '%Y/%m/%d %H:%M').replace(tzinfo=self.source_timezone)
        except ValueError:
            return None
        return parsed.astimezone(timezone.utc).isoformat()

    def _contains_marker(self, value: str, marker: str) -> bool:
        return bool(re.search(rf'[\(\（]?{re.escape(marker)}[\)\）]?', value))

    def _is_in_time_range(self, change_time_iso: str | None, start_time: datetime, end_time: datetime | None = None) -> bool:
        if not change_time_iso:
            return False
        try:
            change_time = datetime.fromisoformat(change_time_iso)
        except ValueError:
            return False
        if change_time.tzinfo is None:
            change_time = change_time.replace(tzinfo=timezone.utc)
        normalized_start = self._normalize_datetime(start_time)
        normalized_end = self._normalize_datetime(end_time) if end_time else None
        if change_time < normalized_start:
            return False
        if normalized_end and change_time > normalized_end:
            return False
        return True

    def _normalize_datetime(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def _safe_int(self, value: str) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0
