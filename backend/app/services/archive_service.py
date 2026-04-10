import json
from datetime import datetime
from pathlib import Path

from app.core.config import settings
from app.models.schemas import ArchivedAnalysisRecord, ArchivedRecordItem


class ArchiveService:
    def __init__(self, root_dir: Path | None = None) -> None:
        self.root_dir = root_dir or settings.archive_dir
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def _build_display_title(self, payload: dict) -> tuple[str | None, str | None, str | None]:
        scraped_payload = payload.get('scraped_payload') if isinstance(payload.get('scraped_payload'), dict) else {}
        request_payload = payload.get('request_payload') if isinstance(payload.get('request_payload'), dict) else {}
        home_team = scraped_payload.get('home_team') if isinstance(scraped_payload.get('home_team'), str) else None
        away_team = scraped_payload.get('away_team') if isinstance(scraped_payload.get('away_team'), str) else None
        if home_team and away_team:
            return f'{home_team} vs {away_team}', home_team, away_team
        matchup = request_payload.get('matchup') if isinstance(request_payload.get('matchup'), str) else None
        if matchup:
            return matchup, home_team, away_team
        return None, home_team, away_team

    def save_record(self, record: ArchivedAnalysisRecord) -> Path:
        day_dir = self.root_dir / record.created_at.strftime("%Y-%m-%d") / record.site.value
        day_dir.mkdir(parents=True, exist_ok=True)
        timestamp = record.created_at.strftime("%H%M%S")
        file_path = day_dir / f"{timestamp}_{record.match_key}.json"
        file_path.write_text(record.model_dump_json(indent=2), encoding="utf-8")
        return file_path

    def list_records(self, limit: int = 100) -> list[ArchivedRecordItem]:
        items: list[ArchivedRecordItem] = []
        for file_path in sorted(self.root_dir.rglob("*.json"), reverse=True):
            try:
                payload = json.loads(file_path.read_text(encoding="utf-8"))
                relative_path = file_path.relative_to(self.root_dir).as_posix()
                display_title, home_team, away_team = self._build_display_title(payload)
                items.append(
                    ArchivedRecordItem(
                        file_name=file_path.name,
                        site=payload.get("site", "unknown"),
                        match_key=payload.get("match_key", "unknown"),
                        display_title=display_title,
                        home_team=home_team,
                        away_team=away_team,
                        created_at=payload.get("created_at", datetime.now().isoformat()),
                        absolute_path=str(file_path.resolve()),
                        relative_path=relative_path,
                    )
                )
            except Exception:
                continue
            if len(items) >= limit:
                break
        return items

    def get_record(self, relative_path: str) -> dict:
        normalized = relative_path.replace('\\', '/').lstrip('/')
        file_path = (self.root_dir / normalized).resolve()
        if self.root_dir.resolve() not in file_path.parents:
            raise ValueError("归档路径不合法")
        if not file_path.exists() or file_path.suffix.lower() != '.json':
            raise FileNotFoundError("归档记录不存在")
        return json.loads(file_path.read_text(encoding="utf-8"))
