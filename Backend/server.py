"""
RICE Agent API Server — FastAPI interface connecting the ReAct research engine
with the Next.js Frontend. Supports Multi-Format Document Parsing & Analysis (PDF, DOCX, CSV, TXT, JSON, MD, LOG).
"""

import os
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import agent
import document_parser

app = FastAPI(
    title="RICE Agent API",
    description="Multi-source research agent API using Groq / Gemini fallback with document analysis (PDF, DOCX, CSV, TXT, JSON, MD).",
    version="0.3.0"
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
    doc_text: Optional[str] = None
    doc_name: Optional[str] = None
    doc_type: Optional[str] = None

class SearchToolRequest(BaseModel):
    query: str
    max_results: Optional[int] = 5

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "RICE Research Agent Engine",
        "version": "0.3.0",
        "tools": ["web_search", "arxiv_search", "wikipedia_search", "hackernews_search", "document_analysis"]
    }

@app.post("/api/documents/parse")
async def parse_document_endpoint(file: UploadFile = File(...)):
    """Parses uploaded document files (PDF, DOCX, CSV, TXT, JSON, MD, LOG) and returns extracted text + metadata."""
    try:
        content = await file.read()
        res = document_parser.parse_document(content, file.filename)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse document: {str(e)}")

@app.post("/api/research")
def execute_research(req: ResearchRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")
    
    try:
        doc_context = None
        if req.doc_text:
            doc_context = {
                "text": req.doc_text,
                "metadata": {
                    "filename": req.doc_name or "Attached Document",
                    "type": req.doc_type or "Document",
                    "word_count": len(req.doc_text.split()),
                }
            }

        result = agent.run_agent_with_details(
            req.query.strip(),
            max_steps=req.max_steps or 6,
            doc_context=doc_context
        )
        
        # Build bullet summary from steps log if available
        bullets = []
        if doc_context:
            bullets.append(f"Analyzed attached document '{req.doc_name or 'Document'}'")
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
