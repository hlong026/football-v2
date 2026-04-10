import unittest
from datetime import datetime

from app.models.schemas import (
    AIConfigPayload,
    AsianHandicapChangeRecord,
    AsianHandicapRow,
    AsianHandicapDetail,
    BookmakerSelection,
    EuropeanOddsRow,
    EuropeanOddsChangeRecord,
    EuropeanOddsDetail,
    FetchConfigPayload,
    MatchPreparationRequest,
    PromptConfigPayload,
    ScrapedPagePayload,
    SiteType,
    StructuredMatchResponse,
)
from app.services.prompt_service import PromptService


class PromptServiceTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.service = PromptService()
        self.request = MatchPreparationRequest(
            site=SiteType.OKOOO,
            match_url='https://www.okooo.com/soccer/match/1296053/odds/',
            anchor_start_time=datetime.fromisoformat('2026-03-19T12:58:00+08:00'),
            anchor_end_time=datetime.fromisoformat('2026-04-10T12:58:00+08:00'),
            bookmaker_selection=BookmakerSelection(
                european=['澳门', 'William Hill'],
                asian=['澳门', 'Bet365'],
            ),
            ai_config=AIConfigPayload(),
            prompt_config=PromptConfigPayload(prompt_text='', prompt_name='default'),
            fetch_config=FetchConfigPayload(cookie='foo=1', cookies=['foo=1']),
        )
        self.structured = StructuredMatchResponse(
            site=SiteType.OKOOO,
            match_key='1296053',
            source_url='https://www.okooo.com/soccer/match/1296053/odds/',
            home_team='阿森纳',
            away_team='曼彻斯特城',
            parsed={
                'host': 'www.okooo.com',
                'path': '/soccer/match/1296053/odds/',
                'match_id': '1296053',
            },
            pages={
                'match': ScrapedPagePayload(
                    page_url='https://www.okooo.com/soccer/match/1296053/',
                    html_length=100,
                    fetched=True,
                    title='比赛详情',
                    status_code=200,
                    final_url='https://www.okooo.com/soccer/match/1296053/',
                    error_message=None,
                ),
                'odds': ScrapedPagePayload(
                    page_url='https://www.okooo.com/soccer/match/1296053/odds/',
                    html_length=100,
                    fetched=True,
                    title='欧赔',
                    status_code=200,
                    final_url='https://www.okooo.com/soccer/match/1296053/odds/ajax/?page=0&all=1',
                    error_message=None,
                ),
            },
            average_european_odds=EuropeanOddsRow(
                institution_id=0,
                institution_name='平均值',
                country='',
                initial_home=2.02,
                initial_draw=3.30,
                initial_away=3.55,
                latest_home=1.98,
                latest_draw=3.25,
                latest_away=3.70,
                home_probability=47.10,
                draw_probability=28.60,
                away_probability=24.30,
                kelly_home=0.96,
                kelly_draw=0.94,
                kelly_away=0.98,
                return_rate=92.10,
                update_timestamp=1710417600,
            ),
            european_odds=[
                EuropeanOddsRow(
                    institution_id=1,
                    institution_name='澳门',
                    country='中国澳门',
                    initial_home=2.05,
                    initial_draw=3.25,
                    initial_away=3.45,
                    latest_home=1.91,
                    latest_draw=3.25,
                    latest_away=4.10,
                    home_probability=49.30,
                    draw_probability=27.20,
                    away_probability=23.50,
                    kelly_home=0.95,
                    kelly_draw=0.93,
                    kelly_away=0.99,
                    return_rate=93.40,
                    update_timestamp=1712811480,
                )
            ],
            average_asian_handicap=AsianHandicapRow(
                institution_id=0,
                institution_name='平均值',
                initial_home_water=0.94,
                initial_handicap='平手',
                initial_away_water=0.92,
                latest_home_water=0.90,
                latest_handicap='平手/半球',
                latest_away_water=0.98,
                kelly_home=0.95,
                kelly_away=0.97,
                payoff=91.80,
                update_timestamp=1712811480,
            ),
            asian_handicap=[
                AsianHandicapRow(
                    institution_id=2,
                    institution_name='Bet365',
                    initial_home_water=0.92,
                    initial_handicap='平手',
                    initial_away_water=0.96,
                    latest_home_water=0.88,
                    latest_handicap='平手/半球',
                    latest_away_water=1.00,
                    kelly_home=0.94,
                    kelly_away=0.98,
                    payoff=92.30,
                    update_timestamp=1712811480,
                )
            ],
            european_odds_details=[
                EuropeanOddsDetail(
                    institution_id=1,
                    institution_name='澳门',
                    page=ScrapedPagePayload(
                        page_url='https://www.okooo.com/soccer/match/1296053/odds/change/1/',
                        html_length=100,
                        fetched=True,
                        title='欧赔详情',
                        status_code=200,
                        final_url='https://www.okooo.com/soccer/match/1296053/odds/change/1/',
                        error_message=None,
                    ),
                    all_records_count=2,
                    matched_records_count=1,
                    records=[
                        EuropeanOddsChangeRecord(
                            change_time='2026/03/19 04:58',
                            change_time_iso='2026-03-18T20:58:00+00:00',
                            time_before_match='-',
                            home_odds=1.91,
                            draw_odds=3.25,
                            away_odds=4.10,
                            home_probability=0.0,
                            draw_probability=0.0,
                            away_probability=0.0,
                            kelly_home=0.0,
                            kelly_draw=0.0,
                            kelly_away=0.0,
                            return_rate=0.0,
                        )
                    ],
                )
            ],
            asian_handicap_details=[
                AsianHandicapDetail(
                    institution_id=2,
                    institution_name='Bet365',
                    page=ScrapedPagePayload(
                        page_url='https://www.okooo.com/soccer/match/1296053/ah/change/2/',
                        html_length=100,
                        fetched=True,
                        title='亚盘详情',
                        status_code=200,
                        final_url='https://www.okooo.com/soccer/match/1296053/ah/change/2/',
                        error_message=None,
                    ),
                    all_records_count=2,
                    matched_records_count=1,
                    records=[
                        AsianHandicapChangeRecord(
                            change_time='2026/04/10 12:58(终)',
                            change_time_iso='2026-04-10T04:58:00+00:00',
                            time_before_match='-',
                            home_water=0.92,
                            handicap='平手',
                            away_water=0.96,
                            is_initial=False,
                            is_final=True,
                        )
                    ],
                )
            ],
        )

    def test_build_system_prompt_locks_scope_without_forcing_methodology(self) -> None:
        prompt = self.service.build_system_prompt(self.request)

        self.assertIn('你只能基于当前请求中的这一场比赛和已提供的结构化数据完成分析', prompt)
        self.assertIn('严禁引入其他比赛、外部新闻、历史数据库、训练语料中的隐含事实', prompt)
        self.assertIn('如果用户提供了自定义分析要求，必须以用户要求为最高优先级', prompt)
        self.assertNotIn('请严格按照以下方法论完成全方位分析', prompt)

    def test_build_system_prompt_uses_custom_prompt_as_primary_instruction(self) -> None:
        request = self.request.model_copy(update={
            'prompt_config': PromptConfigPayload(prompt_text='重点解释盘口和赔率冲突。', prompt_name='custom')
        })

        prompt = self.service.build_system_prompt(request)

        self.assertIn('你只能基于当前请求中的这一场比赛和已提供的结构化数据完成分析', prompt)
        self.assertIn('如果用户提供了自定义分析要求，必须以用户要求为最高优先级', prompt)
        self.assertNotIn('重点解释盘口和赔率冲突。', prompt)

    def test_build_user_prompt_and_payload_describe_single_match_scope(self) -> None:
        user_prompt = self.service.build_user_prompt(self.request, self.structured)
        payload = self.service.build_structured_payload(self.request, self.structured)

        self.assertIn('时间口径：以下起始/终止时间与机构变化时间统一按北京时间（UTC+08:00）展示', user_prompt)
        self.assertIn('比赛对阵：阿森纳 vs 曼彻斯特城', user_prompt)
        self.assertIn('起始时间：2026-03-19 12:58', user_prompt)
        self.assertIn('终止时间：2026-04-10 12:58', user_prompt)
        self.assertIn('分析范围：仅针对比赛 1296053 的当前输入页面及其同场页面链路', user_prompt)
        self.assertIn('用户分析要求：当前用户没有填写额外提示词，请直接基于完整结构化数据输出分析结论。', user_prompt)
        self.assertIn('以下是本次分析使用的完整结构化数据（JSON，已包含欧赔/亚盘主表字段与机构详情记录完整字段）：', user_prompt)
        self.assertIn('"european_odds": [', user_prompt)
        self.assertIn('"asian_handicap": [', user_prompt)
        self.assertIn('"page_context": [', user_prompt)
        self.assertIn('"european_odds_details": [', user_prompt)
        self.assertIn('"asian_handicap_details": [', user_prompt)
        self.assertIn('"country": "中国澳门"', user_prompt)
        self.assertIn('"home_probability": 49.3', user_prompt)
        self.assertNotIn('"initial_home_probability"', user_prompt)
        self.assertIn('"kelly_home": 0.95', user_prompt)
        self.assertIn('"return_rate": 93.4', user_prompt)
        self.assertIn('"payoff": 92.3', user_prompt)
        self.assertIn('"update_timestamp": 1712811480', user_prompt)
        self.assertIn('"change_time_display": "2026-03-19 04:58"', user_prompt)
        self.assertIn('"change_time_display": "2026-04-10 12:58(终)"', user_prompt)
        self.assertIn('请严格以“用户分析要求”为准，并且只能基于以上这一场比赛的完整结构化数据完成分析。', user_prompt)
        self.assertEqual(payload['requested_match_url'], 'https://www.okooo.com/soccer/match/1296053/odds/')
        self.assertIn('仅针对比赛 1296053 的当前输入页面及其同场页面链路', payload['analysis_scope'])
        self.assertEqual(payload['time_display_timezone'], '北京时间（UTC+08:00）')
        self.assertEqual(payload['home_team'], '阿森纳')
        self.assertEqual(payload['away_team'], '曼彻斯特城')
        self.assertEqual(payload['matchup'], '阿森纳 vs 曼彻斯特城')
        self.assertEqual(payload['anchor_start_time'], '2026-03-19T12:58:00+08:00')
        self.assertEqual(payload['anchor_end_time'], '2026-04-10T12:58:00+08:00')
        self.assertEqual(payload['anchor_start_time_display'], '2026-03-19 12:58')
        self.assertEqual(payload['anchor_end_time_display'], '2026-04-10 12:58')
        self.assertEqual(payload['european_odds_details'][0]['records'][0]['change_time'], '2026/03/19 04:58')
        self.assertEqual(payload['european_odds_details'][0]['records'][0]['change_time_display'], '2026-03-19 04:58')
        self.assertEqual(payload['asian_handicap_details'][0]['records'][0]['change_time'], '2026/04/10 12:58(终)')
        self.assertEqual(payload['asian_handicap_details'][0]['records'][0]['change_time_display'], '2026-04-10 12:58(终)')
        self.assertEqual(len(payload['page_context']), 2)
        self.assertEqual(payload['parsed_request']['match_id'], '1296053')


if __name__ == '__main__':
    unittest.main()
