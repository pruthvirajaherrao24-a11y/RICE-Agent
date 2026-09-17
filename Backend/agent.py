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


# --- Tool 4: Hacker News (new) ------------------------------------------


def hackernews_search(query: str, max_results: int = 5) -> str:
    """Current tech/AI/startup news via Hacker News's free Algolia
    search API — no key needed. Sorted by date, not relevance, since
    'today's news' needs recency, not just topical match."""
    try:
        resp = requests.get(
            "https://hn.algolia.com/api/v1/search_by_date",
            params={"query": query, "tags": "story", "hitsPerPage": max_results},
            timeout=8,
        )
        resp.raise_for_status()
        hits = resp.json().get("hits", [])
    except Exception as e:
        return f"Hacker News search failed: {e}"

    if not hits:
        return "No Hacker News stories found."

    lines = []
    for h in hits:
        title = h.get("title") or h.get("story_title") or "(untitled)"
        url = h.get("url") or h.get("story_url") or f"https://news.ycombinator.com/item?id={h.get('objectID')}"
        points = h.get("points", 0)
        comments = h.get("num_comments", 0)
        date = (h.get("created_at") or "")[:10]
        lines.append(f"- {title} ({date}, {points} points, {comments} comments) ({url})")
    return "\n".join(lines)


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
    {
        "type": "function",
        "function": {
            "name": "hackernews_search",
            "description": "Search current tech, AI, and startup news and discussion on Hacker News, sorted by recency. Use this for 'today's/latest/recent' tech or AI news questions instead of web_search.",
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
    "hackernews_search": hackernews_search,
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
            model="gemini-2.0-flash-lite",
            messages=messages,
            tools=tools,
        )


# --- The ReAct loop, now with 3 tools and multi-step support -------------


def _run_agent_loop(user_query: str, max_steps: int = 6):
    """Internal: runs the ReAct loop and returns (answer, steps_log).
    steps_log is a list of {"tool": name, "args": {...}, "result": str}
    for every tool call made along the way — this is what lets
    run_agent_with_details() report back which sources it actually used."""
    messages = [
        {
            "role": "system",
            "content": (
                "You are RICE, a research agent with four tools: "
                "web_search (general/current info), arxiv_search "
                "(academic papers), wikipedia_search (factual "
                "background), and hackernews_search (current tech/AI/"
                "startup news, sorted by recency). For 'today's/latest/"
                "recent' tech or AI news specifically, prefer "
                "hackernews_search over web_search — it's built for "
                "recency, not just topical relevance. Use whichever "
                "tools fit the question — you can call more than one "
                "if a question needs multiple kinds of context. If "
                "sources disagree, say so explicitly instead of "
                "picking one silently. Otherwise answer directly, "
                "briefly, and clearly."
            ),
        },
        {"role": "user", "content": user_query},
    ]

    steps_log = []
    tool_usage_count = {}
    nudged_tools = set()

    for _ in range(max_steps):
        response = call_llm(messages, tools=TOOLS)
        message = response.choices[0].message

        if not message.tool_calls:
            return message.content, steps_log

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

            tool_usage_count[func_name] = tool_usage_count.get(func_name, 0) + 1

        # Guardrail: if a tool has been called 2+ times and it hasn't
        # helped, nudge the model to stop retrying it and either switch
        # tools or answer with what it already has. This is the exact
        # fix for the "called web_search 6 times, never answered" bug.
        for func_name, count in tool_usage_count.items():
            if count >= 2 and func_name not in nudged_tools:
                nudged_tools.add(func_name)
                messages.append(
                    {
                        "role": "system",
                        "content": (
                            f"You've called {func_name} {count} times. "
                            "Rewording the same query rarely helps — if it "
                            "hasn't returned useful results, either try a "
                            "genuinely different tool, or answer now using "
                            "whatever you've already gathered, noting any "
                            "limitations. Do not call the same tool again "
                            "with a minor rewording."
                        ),
                    }
                )

    # max_steps exhausted: force one last tools-off call so the model
    # synthesizes its best answer from whatever's in the transcript,
    # instead of returning a dead-end message with nothing useful in it.
    try:
        final = call_llm(messages, tools=None)
        return final.choices[0].message.content, steps_log
    except Exception:
        return "Reached max steps without a final answer — try a narrower question.", steps_log


def run_agent(user_query: str, max_steps: int = 6) -> str:
    """Plain-string interface — kept for the standalone CLI below and
    for anything that just wants the answer text."""
    answer, _ = _run_agent_loop(user_query, max_steps)
    return answer


def run_agent_with_details(user_query: str, max_steps: int = 6) -> dict:
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