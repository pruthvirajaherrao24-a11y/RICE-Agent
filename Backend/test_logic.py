"""Verify multi-tool dispatch and the multi-step loop, with real
network calls mocked out — no API keys or internet needed."""
import json
from types import SimpleNamespace
from unittest.mock import patch
import agent


def tool_call_response(name, args):
    tc = SimpleNamespace(
        id=f"call_{name}",
        function=SimpleNamespace(name=name, arguments=json.dumps(args)),
    )
    message = SimpleNamespace(content=None, tool_calls=[tc])
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def final_response(text):
    message = SimpleNamespace(content=text, tool_calls=None)
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


# Simulate: step 1 calls arxiv_search, step 2 calls wikipedia_search,
# step 3 gives the final answer. Tests multi-step + multiple distinct
# tools in one conversation, not just one tool once.
call_sequence = [
    tool_call_response("arxiv_search", {"query": "surface codes"}),
    tool_call_response("wikipedia_search", {"query": "quantum error correction"}),
    final_response("Synthesized answer using both sources."),
]
call_index = {"n": 0}


def fake_call_llm(messages, tools=None):
    resp = call_sequence[call_index["n"]]
    call_index["n"] += 1
    return resp


with patch.object(agent, "arxiv_search", return_value="mocked arxiv results") as mock_arxiv:
    with patch.object(agent, "wikipedia_search", return_value="mocked wiki results") as mock_wiki:
        # Rebuild TOOL_FUNCTIONS so it points at the mocked functions
        agent.TOOL_FUNCTIONS["arxiv_search"] = agent.arxiv_search
        agent.TOOL_FUNCTIONS["wikipedia_search"] = agent.wikipedia_search
        with patch.object(agent, "call_llm", side_effect=fake_call_llm):
            result = agent.run_agent("compare quantum error correction approaches")

            assert result == "Synthesized answer using both sources.", result
            assert call_index["n"] == 3, "expected exactly 3 LLM calls"
            mock_arxiv.assert_called_once_with(query="surface codes")
            mock_wiki.assert_called_once_with(query="quantum error correction")
            print("PASS: multi-step loop calls arxiv_search then wikipedia_search then answers")
            print("PASS: each tool receives the correct arguments from the LLM's tool call")
