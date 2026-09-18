"""
RICE — Phase 3: long-term memory + reflection.

ReAct loop with four research tools (web, arXiv, Wikipedia, Hacker
News) plus a memory layer: before answering, it retrieves relevant
past Q&As; after answering, it writes a self-critique and stores the
new Q&A + critique for next time. See memory.py for the storage
backend and its deployment caveat.

Still framework-free. Groq primary, Gemini fallback.
"""

import os
import json
import arxiv
import memory
import requests
import math
import re
import concurrent.futures
from dotenv import load_dotenv
from openai import OpenAI
from duckduckgo_search import DDGS

load_dotenv()

_background_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

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
            timeout=6,
        )
        search_resp.raise_for_status()
        results = search_resp.json().get("query", {}).get("search", [])
        if not results:
            return "No Wikipedia article found."
        title = results[0]["title"]

        summary_resp = requests.get(
            f"https://en.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(title)}",
            timeout=6,
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
            timeout=6,
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


# --- Tool 5: Python Interpreter / Code Runner ---------------------------
def python_interpreter(code: str) -> str:
    """Executes Python code in a safe, restricted namespace for math,
    data manipulation, algorithms, string operations, and date math."""
    try:
        safe_globals = {
            "__builtins__": {
                "abs": abs, "all": all, "any": any, "bin": bin, "bool": bool,
                "chr": chr, "dict": dict, "dir": dir, "divmod": divmod, "enumerate": enumerate,
                "filter": filter, "float": float, "format": format, "frozenset": frozenset,
                "hex": hex, "int": int, "isinstance": isinstance, "len": len, "list": list,
                "map": map, "max": max, "min": min, "oct": oct, "ord": ord, "pow": pow,
                "range": range, "repr": repr, "reversed": reversed, "round": round,
                "set": set, "slice": slice, "sorted": sorted, "str": str, "sum": sum,
                "tuple": tuple, "type": type, "zip": zip, "print": print
            },
            "math": math,
            "json": json,
            "re": re,
        }
        local_scope = {}
        try:
            val = eval(code.strip(), safe_globals, local_scope)
            if val is not None:
                return f"Result: {val}"
        except SyntaxError:
            pass

        exec(code, safe_globals, local_scope)
        if "result" in local_scope:
            return f"Result: {local_scope['result']}"
        elif local_scope:
            last_item = list(local_scope.items())[-1]
            return f"{last_item[0]} = {last_item[1]}"
        return "Code executed successfully (no return value)."
    except Exception as e:
        return f"Python interpreter error: {e}"


# --- Tool 6: Fetch Web Page Content -------------------------------------
def fetch_web_page(url: str, max_chars: int = 2500) -> str:
    """Fetches text content from a specific web URL and strips HTML tags.
    Use this to read full articles, blog posts, or documentation pages
    found via web_search or hackernews_search."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=6)
        resp.raise_for_status()
        html = resp.text
        html = re.sub(r'<script.*?>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r'<style.*?>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', html)
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        clean_text = "\n".join(lines)
        if len(clean_text) > max_chars:
            clean_text = clean_text[:max_chars] + f"\n... [truncated to {max_chars} chars]"
        return clean_text if clean_text else "Page loaded but contained no readable text."
    except Exception as e:
        return f"Failed to fetch webpage: {e}"


# --- Tool 7: PyPI Package Search ----------------------------------------
def pypi_search(package_name: str) -> str:
    """Looks up Python package details, version, summary, home page, and license
    from the official PyPI API."""
    try:
        clean_name = package_name.strip().lower().replace("_", "-")
        resp = requests.get(f"https://pypi.org/pypi/{clean_name}/json", timeout=6)
        if resp.status_code == 404:
            return f"PyPI package '{package_name}' not found."
        resp.raise_for_status()
        info = resp.json().get("info", {})
        name = info.get("name", package_name)
        version = info.get("version", "unknown")
        summary = info.get("summary", "No summary provided.")
        home_page = info.get("home_page") or info.get("project_url") or f"https://pypi.org/project/{name}/"
        license_info = info.get("license") or "Not specified"
        return f"Package: {name} v{version}\nSummary: {summary}\nLicense: {license_info}\nLink: {home_page}"
    except Exception as e:
        return f"PyPI lookup failed: {e}"


# --- Tool 8: Quick Math Calculator --------------------------------------
def quick_calculator(expression: str) -> str:
    """Evaluates mathematical expressions fast and safely (e.g. '2**10 * sqrt(144) + log10(100)')."""
    try:
        allowed_names = {
            k: v for k, v in math.__dict__.items() if not k.startswith("__")
        }
        allowed_names.update({"abs": abs, "round": round, "min": min, "max": max, "pow": pow})
        expr_clean = expression.replace("^", "**")
        result = eval(expr_clean, {"__builtins__": None}, allowed_names)
        return f"{expression} = {result}"
    except Exception as e:
        return f"Calculator error: {e}"



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
    """Try Groq (openai/gpt-oss-120b) first — fast and generous free tier.
    On any error (rate limit, outage), fall back to Gemini's free tier (gemini-flash-latest)."""
    try:
        return groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=messages,
            tools=tools,
        )
    except Exception as e:
        print(f"[Groq unavailable ({e}), falling back to Gemini]")
        return gemini_client.chat.completions.create(
            model="gemini-flash-latest",
            messages=messages,
            tools=tools,
        )


# --- The ReAct loop, now with 3 tools and multi-step support -------------


def reflect(user_query: str, answer: str) -> str:
    """One extra LLM call: a short self-critique of the answer just
    given. This is what gets stored alongside the answer and surfaced
    next time a similar question comes in — the actual mechanism
    behind 'self-learning' rather than a separate system bolted on.
    Never raises: a failed reflection just means nothing extra gets
    stored, not a broken answer."""
    try:
        critique_messages = [
            {
                "role": "system",
                "content": (
                    "Briefly critique the answer below in 1-2 sentences: "
                    "what's missing, what could be sharper, or what "
                    "assumption might be wrong. If it's genuinely solid "
                    "as-is, say so in one sentence instead of inventing "
                    "a flaw."
                ),
            },
            {
                "role": "user",
                "content": f"Question: {user_query}\n\nAnswer: {answer}",
            },
        ]
        response = call_llm(critique_messages, tools=None)
        return response.choices[0].message.content or ""
    except Exception:
        return ""


def _save_reflection_async(user_query: str, answer: str):
    """Helper to run reflection and memory storage in the background without blocking the user response."""
    try:
        reflection = reflect(user_query, answer)
        memory.store(user_query, answer, reflection)
    except Exception as e:
        print(f"[Async memory persistence error: {e}]")


def _run_agent_loop(user_query: str, max_steps: int = 6, doc_context: dict = None):
    """Internal: runs the ReAct loop and returns (answer, steps_log).
    steps_log is a list of {"tool": name, "args": {...}, "result": str}
    for every tool call made along the way — this is what lets
    run_agent_with_details() report back which sources it actually used.

    Phase 3: retrieves relevant past memory before the loop starts,
    and reflects on/stores the answer in the background after returning.
    Supports attached document parsing & multi-format document analysis."""
    past_context = memory.retrieve(user_query)

    messages = [
        {
            "role": "system",
            "content": (
                "You are RICE, an elite research & reasoning agent with specialized tools: "
                "web_search (general/broad info), arxiv_search (academic papers), "
                "wikipedia_search (factual background/definitions), and hackernews_search "
                "(current tech/AI news, sorted by recency).\n\n"
                "GUIDELINES FOR RESPONSE & FORMATTING:\n"
                "1. Provide structured, highly professional, clean Markdown responses.\n"
                "2. Structure your final answer with clear sections:\n"
                "   - **Executive Summary**: A concise 2-3 sentence direct answer.\n"
                "   - **Key Analysis & Insights**: Bullet points highlighting core findings, technical details, or comparisons.\n"
                "   - **Sources & Evidence**: Cite tools/links where relevant.\n"
                "3. If an attached document is provided, analyze it thoroughly, summarize key data, and cross-reference with tools if needed.\n"
                "4. Be objective, thorough, and clear."
            ),
        }
    ]

    if doc_context and doc_context.get("text"):
        doc_info = doc_context.get("metadata", {})
        doc_text = doc_context["text"]
        if len(doc_text) > 8000:
            doc_text = doc_text[:8000] + f"\n... [truncated to 8000 chars out of {len(doc_context['text'])} Total]"

        messages.append(
            {
                "role": "system",
                "content": (
                    f"ATTACHED DOCUMENT FOR ANALYSIS:\n"
                    f"Filename: {doc_info.get('filename', 'Document')}\n"
                    f"Type: {doc_info.get('type', 'Document')}\n"
                    f"Stats: {doc_info.get('page_count', 1)} pages | {doc_info.get('word_count', 0)} words\n\n"
                    f"EXTRACTED CONTENT:\n"
                    f"{doc_text}\n"
                    f"[End of Attached Document]\n\n"
                    "Analyze the attached document content to address the user query. Synthesize data, cite sections, and cross-reference with tools when useful."
                ),
            }
        )

    if past_context:
        messages.append(
            {
                "role": "system",
                "content": (
                    "Relevant context from past sessions (may or may "
                    "not be directly relevant to this question — use "
                    "your judgment, don't force a connection that "
                    "isn't there):\n\n" + "\n---\n".join(past_context)
                ),
            }
        )

    messages.append({"role": "user", "content": user_query})

    steps_log = []
    tool_usage_count = {}
    nudged_tools = set()
    answer = None

    for _ in range(max_steps):
        response = call_llm(messages, tools=TOOLS)
        message = response.choices[0].message

        if not message.tool_calls:
            answer = message.content
            break

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

    if answer is None:
        # max_steps exhausted: force one last tools-off call so the
        # model synthesizes its best answer from whatever's in the
        # transcript, instead of returning a dead-end message.
        try:
            final = call_llm(messages, tools=None)
            answer = final.choices[0].message.content
        except Exception:
            answer = "Reached max steps without a final answer — try a narrower question."

    # Run reflection and memory persistence asynchronously in background thread so user response is instant
    _background_executor.submit(_save_reflection_async, user_query, answer)

    return answer, steps_log



def run_agent(user_query: str, max_steps: int = 6, doc_context: dict = None) -> str:
    """Plain-string interface — kept for the standalone CLI below and
    for anything that just wants the answer text."""
    answer, _ = _run_agent_loop(user_query, max_steps, doc_context=doc_context)
    return answer


def run_agent_with_details(user_query: str, max_steps: int = 6, doc_context: dict = None) -> dict:
    """Dict interface for server.py: {"answer": str, "steps": [...]}.
    Each step records which tool ran, what arguments the LLM gave it,
    and what it returned — this is what powers the "Copy Data" /
    step-by-step view in the frontend."""
    answer, steps_log = _run_agent_loop(user_query, max_steps, doc_context=doc_context)
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