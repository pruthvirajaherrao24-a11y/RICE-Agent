# RICE — Phase 2: multi-source research

Same ReAct loop as Phase 1, now choosing between three tools instead
of one.

## Setup

```bash
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # fill in your keys
python agent.py
```

## What's new vs Phase 1

- `arxiv_search(query)` — searches arXiv for academic papers, using the
  `arxiv` package (talks to export.arxiv.org, free, no key).
- `wikipedia_search(query)` — calls Wikipedia's own REST API directly
  via `requests` (no third-party wrapper library, one less thing that
  can break).
- The system prompt now tells the model it can call more than one tool
  per question — try asking something that genuinely needs both, e.g.
  "what does current research say about X, and give me the basic
  definition too."

## Try it

```
You: compare recent approaches to quantum error correction, and explain what error correction means in simple terms
```

Watch for it calling arxiv_search *and* wikipedia_search in the same
conversation — that's the multi-step reasoning pillar working, not just
multi-tool.

## Testing without API keys

`test_logic.py` and `test_tools.py` mock every external call (LLM and
search APIs both) so you can verify the dispatch logic and response
parsing without spending any quota or needing internet:

```bash
GITHUB_TOKEN=dummy GROQ_API_KEY=dummy python test_logic.py
GITHUB_TOKEN=dummy GROQ_API_KEY=dummy python test_tools.py
```

## Next (Phase 3)

Long-term memory with ChromaDB — so answers persist across runs instead
of starting blank every time you restart `agent.py`.
