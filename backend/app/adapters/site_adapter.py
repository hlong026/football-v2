from abc import ABC, abstractmethod
from urllib.parse import urlparse
import re

from app.models.schemas import SiteType


class SiteAdapter(ABC):
    site: SiteType
    label: str

    @abstractmethod
    def parse_match_url(self, match_url: str) -> dict:
        raise NotImplementedError


class OkoooAdapter(SiteAdapter):
    site = SiteType.OKOOO
    label = "澳客网"

    def parse_match_url(self, match_url: str) -> dict:
        parsed = urlparse(match_url)
        match = re.search(r"/soccer/match/(\d+)", parsed.path)
        if not match:
            raise ValueError("无法从澳客网链接中识别 match_id")
        normalized_host = "www.okooo.com"
        return {
            "host": normalized_host,
            "path": parsed.path,
            "match_id": match.group(1),
            "normalized_url": f"https://{normalized_host}{parsed.path}",
        }


class SiteAdapterFactory:
    _adapters = {
        SiteType.OKOOO: OkoooAdapter(),
    }

    @classmethod
    def get_adapter(cls, site: SiteType) -> SiteAdapter:
        return cls._adapters[site]
