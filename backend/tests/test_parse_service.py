import unittest
from datetime import datetime, timezone

from app.services.parse_service import ParseService


EUROPEAN_HTML = '''
<table>
  <tbody>
    <tr id="tr12" data-time="1711111111" data-pname="Bet365">
      <td>1</td>
      <td><span class="countryname">英国</span><span>B ! e # t365</span></td>
      <td>1.91</td>
      <td>3.20</td>
      <td>4.10</td>
      <td>1.85</td>
      <td>3.30</td>
      <td>4.25</td>
      <td>-</td>
      <td>52.10</td>
      <td>25.30</td>
      <td>22.60</td>
      <td>0.95</td>
      <td>0.93</td>
      <td>0.91</td>
      <td>92.40</td>
    </tr>
    <tr id="tr13" data-time="1711112222" data-pname="澳门">
      <td>2</td>
      <td><span class="countryname">中国</span><span>澳门</span></td>
      <td>1.88</td>
      <td>3.25</td>
      <td>4.00</td>
      <td>1.86</td>
      <td>3.28</td>
      <td>4.15</td>
      <td>-</td>
      <td>51.20</td>
      <td>25.60</td>
      <td>23.20</td>
      <td>0.94</td>
      <td>0.92</td>
      <td>0.90</td>
      <td>91.80</td>
    </tr>
  </tbody>
</table>
'''

EUROPEAN_CHANGE_HTML_WITH_DUPLICATE_LIVE = '''
<table>
  <tbody>
    <tr>
      <td>2026/04/02 08:47(实时)</td>
      <td>赛前210小时12分</td>
      <td>1.83</td>
      <td>3.75</td>
      <td>4.30</td>
      <td>52.26</td>
      <td>25.50</td>
      <td>22.24</td>
      <td>0.95</td>
      <td>0.95</td>
      <td>0.96</td>
      <td>0.96</td>
    </tr>
    <tr>
      <td>2026/04/01 16:49</td>
      <td>赛前226小时10分</td>
      <td>1.83</td>
      <td>3.75</td>
      <td>4.30</td>
      <td>52.26</td>
      <td>25.50</td>
      <td>22.24</td>
      <td>0.95</td>
      <td>0.95</td>
      <td>0.96</td>
      <td>0.96</td>
    </tr>
    <tr>
      <td>2026/03/31 07:51</td>
      <td>赛前259小时8分</td>
      <td>1.80</td>
      <td>3.75</td>
      <td>4.30</td>
      <td>52.67</td>
      <td>25.28</td>
      <td>22.05</td>
      <td>0.94</td>
      <td>0.96</td>
      <td>0.96</td>
      <td>0.95</td>
    </tr>
  </tbody>
</table>
'''

EUROPEAN_CHANGE_HTML = '''
<table>
  <tbody>
    <tr>
      <td>2026/03/29 09:00</td>
      <td>赛前3小时</td>
      <td>2.10</td>
      <td>3.30</td>
      <td>3.40</td>
      <td>42.10</td>
      <td>27.40</td>
      <td>30.50</td>
      <td>0.95</td>
      <td>0.92</td>
      <td>0.93</td>
      <td>93.50</td>
    </tr>
    <tr>
      <td>2026/03/29 11:00</td>
      <td>赛前1小时</td>
      <td>2.05</td>
      <td>3.35</td>
      <td>3.55</td>
      <td>43.00</td>
      <td>27.00</td>
      <td>30.00</td>
      <td>0.96</td>
      <td>0.93</td>
      <td>0.94</td>
      <td>93.80</td>
    </tr>
  </tbody>
</table>
'''

ASIAN_CHANGE_HTML = '''
<table width="450">
  <tbody>
    <tr>
      <td>2026/03/29 09:30(初)</td>
      <td>赛前2小时30分</td>
      <td>0.92</td>
      <td>平手/半球</td>
      <td>0.94</td>
    </tr>
    <tr>
      <td>2026/03/29 11:30(终)</td>
      <td>赛前30分钟</td>
      <td>0.88</td>
      <td>平手</td>
      <td>1.02</td>
    </tr>
  </tbody>
</table>
'''

EUROPEAN_HTML_WITH_TITLED_NOISE = '''
<table>
  <tbody>
    <tr id="tr30" data-time="1711120000" data-pname="William Hill">
      <td>1</td>
      <td><span class="countryname">英国</span><span title="英国">威!廉.#希!尔</span></td>
      <td>1.91</td>
      <td>3.50</td>
      <td>3.80</td>
      <td>1.80</td>
      <td>3.60</td>
      <td>4.00</td>
      <td>-</td>
      <td>51.28</td>
      <td>25.64</td>
      <td>23.08</td>
      <td>0.94</td>
      <td>0.91</td>
      <td>0.90</td>
      <td>92.40</td>
    </tr>
  </tbody>
</table>
'''

EUROPEAN_HTML_WITH_ENCODED_DATA_PNAME = '''
<table>
  <tbody>
    <tr id="tr31" data-time="1711121111" data-pname="B&lt;span style=&quot;font-size:0&quot;&gt;xx&lt;/span&gt;et365">
      <td>1</td>
      <td><span class="countryname">英国</span><span>Bet365</span></td>
      <td>1.91</td>
      <td>3.20</td>
      <td>4.10</td>
      <td>1.85</td>
      <td>3.30</td>
      <td>4.25</td>
      <td>-</td>
      <td>52.10</td>
      <td>25.30</td>
      <td>22.60</td>
      <td>0.95</td>
      <td>0.93</td>
      <td>0.91</td>
      <td>92.40</td>
    </tr>
  </tbody>
</table>
'''

ASIAN_HTML = '''
<table>
  <tbody>
    <tr id="tr21" data-time="1711113333" data-pname="Bet365">
      <td>1</td>
      <td><span>B ! e # t365</span></td>
      <td>0.92</td>
      <td>半球</td>
      <td>0.94</td>
      <td>0.88</td>
      <td>半球</td>
      <td>0.98</td>
      <td>-</td>
      <td>-</td>
      <td>0.93</td>
      <td>0.91</td>
      <td>0.95</td>
    </tr>
    <tr id="tr22" data-time="1711114444" data-pname="澳门">
      <td>2</td>
      <td><span>澳门</span></td>
      <td>0.90</td>
      <td>平手/半球</td>
      <td>0.96</td>
      <td>0.87</td>
      <td>半球</td>
      <td>0.99</td>
      <td>-</td>
      <td>-</td>
      <td>0.92</td>
      <td>0.90</td>
      <td>0.94</td>
    </tr>
  </tbody>
</table>
'''


class ParseServiceTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.service = ParseService()

    def test_parse_european_odds_recognizes_target_companies_with_noisy_names(self) -> None:
        average_row, rows = self.service.parse_european_odds(EUROPEAN_HTML)
        institution_names = {row.institution_name for row in rows}

        self.assertIsNotNone(average_row)
        self.assertEqual(len(rows), 2)
        self.assertEqual(institution_names, {'Bet365', '澳门'})
        bet365_row = next(row for row in rows if row.institution_name == 'Bet365')
        self.assertAlmostEqual(bet365_row.initial_home, 1.91)
        self.assertAlmostEqual(average_row.latest_draw, (3.30 + 3.28) / 2)

    def test_parse_european_odds_filters_rows_by_selected_companies(self) -> None:
        average_row, rows = self.service.parse_european_odds(EUROPEAN_HTML, selected_companies=['Bet365'])

        self.assertIsNotNone(average_row)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].institution_name, 'Bet365')

    def test_parse_european_odds_prefers_clean_data_pname_over_noisy_title_text(self) -> None:
        _, rows = self.service.parse_european_odds(EUROPEAN_HTML_WITH_TITLED_NOISE, selected_companies=['William Hill'])

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].institution_name, 'William Hill')

    def test_parse_european_odds_decodes_encoded_data_pname_and_removes_hidden_noise(self) -> None:
        _, rows = self.service.parse_european_odds(EUROPEAN_HTML_WITH_ENCODED_DATA_PNAME, selected_companies=['Bet365'])

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].institution_name, 'Bet365')

    def test_parse_asian_handicap_recognizes_target_companies_with_noisy_names(self) -> None:
        average_row, rows = self.service.parse_asian_handicap(ASIAN_HTML)
        institution_names = {row.institution_name for row in rows}

        self.assertIsNotNone(average_row)
        self.assertEqual(len(rows), 2)
        self.assertEqual(institution_names, {'Bet365', '澳门'})
        macau_row = next(row for row in rows if row.institution_name == '澳门')
        self.assertEqual(macau_row.latest_handicap, '半球')
        self.assertAlmostEqual(average_row.latest_home_water, (0.88 + 0.87) / 2)

    def test_parse_asian_handicap_filters_rows_by_selected_companies(self) -> None:
        average_row, rows = self.service.parse_asian_handicap(ASIAN_HTML, selected_companies=['澳门'])

        self.assertIsNotNone(average_row)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].institution_name, '澳门')

    def test_parse_european_odds_change_and_filter_by_time_range(self) -> None:
        rows = self.service.parse_european_odds_change(EUROPEAN_CHANGE_HTML)

        self.assertEqual(len(rows), 2)
        filtered = self.service.filter_european_odds_change(
            rows,
            datetime(2026, 3, 29, 2, 0, tzinfo=timezone.utc),
            datetime(2026, 3, 29, 3, 5, tzinfo=timezone.utc),
        )
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0].change_time, '2026/03/29 11:00')

    def test_parse_european_odds_change_removes_duplicate_live_row(self) -> None:
        rows = self.service.parse_european_odds_change(EUROPEAN_CHANGE_HTML_WITH_DUPLICATE_LIVE)

        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0].change_time, '2026/04/01 16:49')
        self.assertEqual(rows[1].change_time, '2026/03/31 07:51')

    def test_parse_asian_handicap_change_and_filter_by_time_range(self) -> None:
        rows = self.service.parse_asian_handicap_change(ASIAN_CHANGE_HTML)

        self.assertEqual(len(rows), 2)
        self.assertTrue(rows[0].is_initial)
        self.assertTrue(rows[1].is_final)
        filtered = self.service.filter_asian_handicap_change(
            rows,
            datetime(2026, 3, 29, 1, 0, tzinfo=timezone.utc),
            datetime(2026, 3, 29, 2, 0, tzinfo=timezone.utc),
        )
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0].handicap, '平手/半球')


if __name__ == '__main__':
    unittest.main()
