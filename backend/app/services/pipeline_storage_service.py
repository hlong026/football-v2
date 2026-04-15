from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.models.schemas import CleanedMatchResponse, MatchPreparationRequest, PipelineStoragePaths, StructuredMatchResponse


class PipelineStorageService:
    def __init__(self, root_dir: Path | None = None) -> None:
        self.root_dir = root_dir or (settings.data_dir / "pipeline")
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def save_snapshot(
        self,
        request: MatchPreparationRequest,
        raw_structured: StructuredMatchResponse,
        cleaned_structured: CleanedMatchResponse,
        analysis_inputs: dict[str, Any] | None = None,
        analysis_outputs: dict[str, Any] | None = None,
        run_label: str | None = None,
    ) -> PipelineStoragePaths:
        created_at = datetime.now()
        run_id = created_at.strftime("%H%M%S_%f")
        if run_label:
            run_id = f"{run_id}_{run_label}"
        run_dir = self.root_dir / created_at.strftime("%Y-%m-%d") / request.site.value / raw_structured.match_key / run_id
        run_dir.mkdir(parents=True, exist_ok=True)

        raw_path = run_dir / "raw-structured.json"
        cleaned_path = run_dir / "cleaned-structured.json"
        meta_path = run_dir / "meta.json"
        analysis_input_paths: dict[str, str] = {}
        analysis_output_paths: dict[str, str] = {}

        raw_path.write_text(raw_structured.model_dump_json(indent=2), encoding="utf-8")
        cleaned_payload = cleaned_structured.model_copy(update={"storage_paths": None})
        cleaned_path.write_text(cleaned_payload.model_dump_json(indent=2), encoding="utf-8")
        meta_path.write_text(
            json.dumps(
                {
                    "created_at": created_at.isoformat(),
                    "run_label": run_label,
                    "site": request.site.value,
                    "match_key": raw_structured.match_key,
                    "source_url": raw_structured.source_url,
                    "requested_match_url": str(request.match_url),
                    "bookmaker_selection": request.bookmaker_selection.model_dump(),
                    "prompt_set": request.prompt_set.model_dump(mode="json"),
                    "time_window": {
                        "anchor_start_time": request.anchor_start_time.isoformat(),
                        "anchor_end_time": request.anchor_end_time.isoformat() if request.anchor_end_time else None,
                    },
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        for stage, payload in (analysis_inputs or {}).items():
            file_path = run_dir / f"{stage}-analysis-input.json"
            file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            analysis_input_paths[stage] = str(file_path.resolve())
        for stage, payload in (analysis_outputs or {}).items():
            file_path = run_dir / f"{stage}-analysis-output.json"
            file_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            analysis_output_paths[stage] = str(file_path.resolve())

        return PipelineStoragePaths(
            raw_structured_path=str(raw_path.resolve()),
            cleaned_structured_path=str(cleaned_path.resolve()),
            meta_path=str(meta_path.resolve()),
            analysis_input_paths=analysis_input_paths,
            analysis_output_paths=analysis_output_paths,
        )
