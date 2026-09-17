"""Sanity-check the response-parsing logic in arxiv_search and
wikipedia_search against realistic fake API responses, since this
sandbox can't reach arxiv.org or wikipedia.org directly."""
from unittest.mock import patch, MagicMock
from datetime import datetime
import agent


# --- arxiv_search parsing ---
class FakeAuthor:
    def __init__(self, name): self.name = name

class FakeResult:
    title = "Surface codes for the future of quantum computing"
    published = datetime(2023, 5, 1)
    authors = [FakeAuthor("A. Kitaev"), FakeAuthor("J. Preskill")]
    summary = "This paper reviews surface code architectures " * 5
    entry_id = "http://arxiv.org/abs/2305.00001"

with patch.object(agent.arxiv, "Client") as MockClient:
    MockClient.return_value.results.return_value = [FakeResult()]
    out = agent.arxiv_search("surface codes")
    assert "Surface codes for the future" in out
    assert "Kitaev" in out
    assert "2305.00001" in out
    print("PASS: arxiv_search formats real-shaped results correctly")

# --- wikipedia_search parsing ---
fake_search_resp = MagicMock()
fake_search_resp.json.return_value = {"query": {"search": [{"title": "Quantum error correction"}]}}
fake_search_resp.raise_for_status.return_value = None

fake_summary_resp = MagicMock()
fake_summary_resp.json.return_value = {
    "extract": "Quantum error correction protects quantum information from errors.",
    "content_urls": {"desktop": {"page": "https://en.wikipedia.org/wiki/Quantum_error_correction"}},
}
fake_summary_resp.raise_for_status.return_value = None

with patch.object(agent.requests, "get", side_effect=[fake_search_resp, fake_summary_resp]):
    out = agent.wikipedia_search("quantum error correction")
    assert "Quantum error correction protects" in out
    assert "en.wikipedia.org" in out
    print("PASS: wikipedia_search formats real-shaped results correctly")
