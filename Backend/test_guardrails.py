"""Verify the two new guardrails: (1) a nudge gets injected after a
tool is called repeatedly, and (2) hitting max_steps forces a real
synthesized answer instead of the old dead-end message."""
import json
from types import SimpleNamespace
from unittest.mock import patch
import agent


def tool_call_response(name, args, call_id):
    tc = SimpleNamespace(id=call_id, function=SimpleNamespace(name=name, arguments=json.dumps(args)))
    message = SimpleNamespace(content=None, tool_calls=[tc])
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def final_response(text):
    message = SimpleNamespace(content=text, tool_calls=None)
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


# --- Test 1: nudge fires after repeated same-tool use ---
captured = {"messages": None}
counter = {"n": 0}

def fake_call_llm_repetitive(messages, tools=None):
    captured["messages"] = messages  # same list object, mutated in place
    counter["n"] += 1
    if counter["n"] <= 5:
        return tool_call_response("web_search", {"query": f"AI news variant {counter['n']}"}, f"c{counter['n']}")
    return final_response("Best-effort answer after nudge.")

with patch.object(agent, "web_search", return_value="No results found."), \
     patch.object(agent.memory, "retrieve", return_value=[]), \
     patch.object(agent.memory, "store"), \
     patch.object(agent, "reflect", return_value=""):
    agent.TOOL_FUNCTIONS["web_search"] = agent.web_search
    with patch.object(agent, "call_llm", side_effect=fake_call_llm_repetitive):
        answer, steps = agent._run_agent_loop("gimme todays latest ai news", max_steps=10)
        nudges = [m for m in captured["messages"] if m.get("role") == "system" and "called web_search" in m.get("content", "")]
        assert len(nudges) == 1, f"expected exactly 1 nudge, got {len(nudges)}"
        assert answer == "Best-effort answer after nudge."
        print("PASS: nudge is injected exactly once after web_search is called repeatedly, and the loop still reaches a real answer")

# --- Test 2: max_steps exhausted forces a real synthesized answer ---
def fake_call_llm_never_stops(messages, tools=None):
    if tools:
        return tool_call_response("web_search", {"query": "keeps searching"}, "cX")
    return final_response("Synthesized from partial results despite no clean answer.")

with patch.object(agent, "web_search", return_value="No results found."), \
     patch.object(agent.memory, "retrieve", return_value=[]), \
     patch.object(agent.memory, "store"), \
     patch.object(agent, "reflect", return_value=""):
    with patch.object(agent, "call_llm", side_effect=fake_call_llm_never_stops):
        answer, steps = agent._run_agent_loop("impossible query", max_steps=4)
        assert answer == "Synthesized from partial results despite no clean answer.", answer
        assert answer != "Reached max steps without a final answer — try a narrower question."
        print("PASS: exhausting max_steps triggers a forced tools=None synthesis call instead of the old dead-end message")