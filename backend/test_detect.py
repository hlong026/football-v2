from app.services.scrape_service import ScrapeService

svc = ScrapeService()

# Simulate the AJAX response for match 1296044
html = """        <script>
    var data_str = '[]';
    var static_str = '{}';    var pageData = eval("(" + data_str + ")");
    var checkAjaxDataOver = 1;
    var needLogin = '1';
    </script>"""

print("Testing _is_empty_ajax_needing_login:")
print("  result:", svc._is_empty_ajax_needing_login(html))

print("\nTesting _detect_block_reason:")
print("  result:", svc._detect_block_reason(html, "https://www.okooo.com/soccer/match/1296044/odds/ajax/"))
