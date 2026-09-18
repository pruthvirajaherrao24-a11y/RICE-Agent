"""Quick API smoke-test for RICE Agent v0.3.0"""
import requests
import json

BASE = "http://localhost:8000"

# -- 1. JSON Parse --
print("=== Parse JSON ===")
jdata = b'{"project": "RICE Agent", "phases": [1,2,3], "status": "active"}'
files = {"file": ("config.json", jdata, "application/json")}
r = requests.post(f"{BASE}/api/documents/parse", files=files, timeout=10)
d = r.json()
print("Status:", d.get("status"))
print("Type  :", d.get("metadata", {}).get("type"))
print("Text  :", d.get("text", "")[:120])

# -- 2. Research + Document Context --
print("\n=== Research + Doc Context ===")
payload = {
    "query": "Summarize the key tools mentioned in this document.",
    "max_steps": 2,
    "doc_text": "RICE Agent tools: web_search, arxiv_search, wikipedia_search, hackernews_search. Memory: ChromaDB. Reflection: GPT-based.",
    "doc_name": "project_summary.txt",
    "doc_type": "Plain Text",
}
r2 = requests.post(f"{BASE}/api/research", json=payload, timeout=90)
d2 = r2.json()
print("Status :", d2.get("status"))
print("Answer :", str(d2.get("answer", ""))[:300])
print("Bullets:", d2.get("bullets", []))
