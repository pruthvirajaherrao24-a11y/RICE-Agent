"""
RICE Agent API Server — FastAPI interface connecting the ReAct research engine
with the Next.js Frontend.
"""

import os
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import agent

app = FastAPI(
    title="RICE Agent API",
    description="Multi-source research agent API using GPT-4o / Groq fallback, arXiv, DuckDuckGo, and Wikipedia.",
    version="0.2.0"
)

# Enable CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    query: str
    max_steps: Optional[int] = 6

class SearchToolRequest(BaseModel):
    query: str
    max_results: Optional[int] = 5

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "RICE Research Agent Engine",
        "version": "0.2.0",
        "tools": ["web_search", "arxiv_search", "wikipedia_search"]
    }

@app.post("/api/research")
def execute_research(req: ResearchRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")
    
    try:
        result = agent.run_agent_with_details(req.query.strip(), max_steps=req.max_steps or 6)
        
        # Build bullet summary from steps log if available
        bullets = []
        for step in result.get("steps", []):
            bullets.append(f"Tool executed: {step['tool']} with query '{step['args'].get('query', '')}'")
        if not bullets:
            bullets = ["Synthesized response directly using AI model knowledge"]

        return {
            "status": "success",
            "query": req.query.strip(),
            "answer": result.get("answer", ""),
            "steps": result.get("steps", []),
            "bullets": bullets,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tools/web-search")
def web_search_endpoint(req: SearchToolRequest):
    return {"query": req.query, "result": agent.web_search(req.query, req.max_results or 5)}

@app.post("/api/tools/arxiv-search")
def arxiv_search_endpoint(req: SearchToolRequest):
    return {"query": req.query, "result": agent.arxiv_search(req.query, req.max_results or 5)}

@app.post("/api/tools/wiki-search")
def wiki_search_endpoint(req: SearchToolRequest):
    return {"query": req.query, "result": agent.wikipedia_search(req.query)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
