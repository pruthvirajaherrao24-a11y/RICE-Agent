"""
RICE — Phase 2: multi-source research tools.

Same ReAct loop as Phase 1, now with three research tools instead of
one: web search (DuckDuckGo), academic papers (arXiv), and factual
grounding (Wikipedia). The LLM decides which tool(s) fit a given
question — nothing here forces a specific tool for a specific question.

Still framework-free, still GPT-4o via GitHub Models with a Groq
fallback on rate limits.
"""

import os
import json
import arxiv
import requests
from dotenv import load_dotenv
from openai import OpenAI
from duckduckgo_search import DDGS

load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

groq_client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY,
)

# Gemini exposes an OpenAI-compatible endpoint, so the same client
# class works — only the base_url, key, and model name change.
gemini_client = OpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    api_key=GEMINI_API_KEY,
)

GEMINI_MODEL = "gemini-3.5-flash-lite"  # Confirmed working model

# --- Tool 1: web search (unchanged from Phase 1) -----------------------


def web_search(query: str, max_results: int = 5) -> str:
    """General web search via DuckDuckGo — free, no API key."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
    except Exception as e:
        return f"Web search failed: {e}"

    if not results:
        return "No results found."

    lines = []
    for r in results:
        lines.append(
            f"- {r.get('title', '')}: {r.get('body', '')} ({r.get('href', '')})"
        )
    return "\n".join(lines)


# --- Tool 2: arXiv (new) ------------------------------------------------


def arxiv_search(query: str, max_results: int = 5) -> str:
    """Academic paper search via arXiv — free, no API key. Use for
    research-grade / technical questions where peer-reviewed or
    pre-print sources matter more than general web opinion."""
    try:
        search = arxiv.Search(
            query=query,
            max_results=max_results,
            sort_by=arxiv.SortCriterion.Relevance,
        )
        client = arxiv.Client()
        results = list(client.results(search))
    except Exception as e:
        return f"arXiv search failed: {e}"

    if not results:
        return "No papers found."

    lines = []
    for r in results:
        authors = ", ".join(a.name for a in r.authors[:3])
        if len(r.authors) > 3:
            authors += " et al."
        summary = r.summary.replace("\n", " ")[:220]
        lines.append(
            f"- {r.title} ({r.published.year}) — {authors}: {summary}... ({r.entry_id})"
        )
    return "\n".join(lines)


# --- Tool 3: Wikipedia (new) --------------------------------------------


def wikipedia_search(query: str) -> str:
    """Fast factual/background grounding via Wikipedia's own REST API —
    free, no API key, no third-party wrapper library needed."""
    try:
        search_resp = requests.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "list": "search",
                "srsearch": query,
                "format": "json",
                "srlimit": 1,
            },
            timeout=8,
        )
        search_resp.raise_for_status()
        results = search_resp.json().get("query", {}).get("search", [])
        if not results:
            return "No Wikipedia article found."
        title = results[0]["title"]

        summary_resp = requests.get(
            f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(title)}",
            timeout=8,
        )
        summary_resp.raise_for_status()
        data = summary_resp.json()
        extract = data.get("extract", "No summary available.")
        url = data.get("content_urls", {}).get("desktop", {}).get("page", "")
        return f"{title}: {extract} ({url})"
    except Exception as e:
        return f"Wikipedia search failed: {e}"


# --- Tool registry -------------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the general web for current, broad, or opinion-adjacent information.",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "arxiv_search",
            "description": "Search arXiv for academic papers and research-grade technical information.",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "wikipedia_search",
            "description": "Look up factual background or definitions on a topic via Wikipedia.",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        },
    },
]

TOOL_FUNCTIONS = {
    "web_search": web_search,
    "arxiv_search": arxiv_search,
    "wikipedia_search": wikipedia_search,
}

# --- LLM calling, with automatic fallback --------------------------------


def message_to_dict(message) -> dict:
    msg = {"role": "assistant", "content": message.content}
    if message.tool_calls:
        msg["tool_calls"] = [
            {
                "id": tc.id,
                "type": "function",
                "function": {
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                },
            }
            for tc in message.tool_calls
        ]
    return msg


def call_llm(messages, tools=None):
    """Try Groq (openai/gpt-oss-120b) first — fast and generous free
    tier. On any error (rate limit, outage), fall back to Gemini's
    free tier, a genuinely separate provider on separate infrastructure."""
    try:
        return groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=messages,
            tools=tools,
        )
    except Exception as e:
        print(f"[Groq unavailable ({e}), falling back to Gemini]")
        return gemini_client.chat.completions.create(
            model=GEMINI_MODEL,
            messages=messages,
            tools=tools,
        )


# --- The ReAct loop, now with 3 tools and multi-step support -------------


def _run_agent_loop(user_query: str, max_steps: int = 10):
    """Internal: runs the ReAct loop and returns (answer, steps_log).
    steps_log is a list of {"tool": name, "args": {...}, "result": str}
    for every tool call made along the way — this is what lets
    run_agent_with_details() report back which sources it actually used.

    On the final step we inject a "stop and answer" instruction so the
    agent always returns a real answer rather than the fallback message."""
    system_prompt = (
        "You are RICE, a research agent with three tools: "
        "web_search (general/current info), arxiv_search "
        "(academic papers), and wikipedia_search (factual "
        "background). Use whichever fit the question — you can "
        "call more than one if a question needs both academic "
        "and general context. If sources disagree, say so "
        "explicitly instead of picking one silently. "
        "Once you have enough information, synthesize a clear, "
        "well-structured answer directly without calling more tools."
    )
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_query},
    ]

    steps_log = []

    for step in range(max_steps):
        # On the last step, force the model to stop calling tools and answer.
        is_last_step = step == max_steps - 1
        if is_last_step and steps_log:
            messages.append({
                "role": "user",
                "content": (
                    "You have gathered enough information. "
                    "Please now provide your final, complete answer "
                    "based on all research done so far. Do NOT call any more tools."
                ),
            })
            response = call_llm(messages, tools=None)  # No tools on final forced step
        else:
            response = call_llm(messages, tools=TOOLS)

        message = response.choices[0].message

        if not message.tool_calls:
            # Model returned a direct answer — we're done.
            return message.content or "No answer generated.", steps_log

        messages.append(message_to_dict(message))

        for tool_call in message.tool_calls:
            func_name = tool_call.function.name
            args = json.loads(tool_call.function.arguments or "{}")
            func = TOOL_FUNCTIONS.get(func_name)

            result = func(**args) if func else f"Unknown tool: {func_name}"
            steps_log.append({"tool": func_name, "args": args, "result": result})

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result,
                }
            )

    # Fallback: ask the model to summarize with no tools at all.
    messages.append({
        "role": "user",
        "content": "Summarize all findings so far into a final answer.",
    })
    try:
        final_response = call_llm(messages, tools=None)
        return final_response.choices[0].message.content or "Research complete — see steps for details.", steps_log
    except Exception:
        return "Research complete — see steps for details.", steps_log


def run_agent(user_query: str, max_steps: int = 10) -> str:
    """Plain-string interface — kept for the standalone CLI below and
    for anything that just wants the answer text."""
    answer, _ = _run_agent_loop(user_query, max_steps)
    return answer


def run_agent_with_details(user_query: str, max_steps: int = 10) -> dict:
    """Dict interface for server.py: {"answer": str, "steps": [...]}.
    Each step records which tool ran, what arguments the LLM gave it,
    and what it returned — this is what powers the "Copy Data" /
    step-by-step view in the frontend."""
    answer, steps_log = _run_agent_loop(user_query, max_steps)
    return {"answer": answer, "steps": steps_log}


if __name__ == "__main__":
    print("RICE (Phase 2) — type a question, or 'quit' to exit.\n")
    while True:
        query = input("You: ").strip()
        if not query:
            continue
        if query.lower() in ("quit", "exit"):
            break
        answer = run_agent(query)
        print(f"\nRICE: {answer}\n")