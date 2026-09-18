"""
Phase 3 memory layer for RICE.

Dev backend: ChromaDB, persisted on disk at ./chroma_db, using a local
Sentence-Transformers model (all-MiniLM-L6-v2) for embeddings. This
means embedding is free and instant — no API call, no rate limit,
no cost — and only the actual LLM calls touch Groq/Gemini quota.

DEPLOYMENT NOTE (read this before you deploy):
Free hosting tiers (Render/Railway) wipe local disk on every redeploy
or cold start, so ./chroma_db will NOT survive deployment. Before going
live, swap this file's internals to Supabase's pgvector. retrieve() and
store() below are the seam to swap behind — as long as their signatures
stay the same, agent.py never needs to change.
"""

import time

import chromadb
from chromadb.utils import embedding_functions

_CHROMA_PATH = "./chroma_db"
_COLLECTION_NAME = "rice_memory"

_client = None
_collection = None


def _get_collection():
    """Lazily create the client/collection on first use. This means
    the embedding model only downloads (once, ~80MB, needs internet)
    the first time memory is actually touched, not on import — and
    it lets tests swap in a fake embedding function before that
    first call."""
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=_CHROMA_PATH)
        embed_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        _collection = _client.get_or_create_collection(
            name=_COLLECTION_NAME, embedding_function=embed_fn
        )
    return _collection


def retrieve(query: str, n_results: int = 3) -> list[str]:
    """Return up to n_results past memory entries relevant to query,
    most relevant first. Returns [] on a fresh install with nothing
    stored yet — that's expected, not an error, and callers should
    treat it as 'no extra context available' rather than fail."""
    try:
        collection = _get_collection()
        count = collection.count()
        if count == 0:
            return []
        results = collection.query(
            query_texts=[query], n_results=min(n_results, count)
        )
        return results.get("documents", [[]])[0]
    except Exception:
        return []


def store(user_query: str, answer: str, reflection: str = "") -> None:
    """Persist this Q&A (plus optional self-critique) for future
    retrieval. Failures here are swallowed on purpose — a memory
    write failing should never take down an answer that already
    succeeded."""
    try:
        doc = f"Q: {user_query}\nA: {answer}"
        if reflection:
            doc += f"\nReflection: {reflection}"
        collection = _get_collection()
        collection.add(
            documents=[doc],
            ids=[f"mem_{int(time.time() * 1000)}"],
            metadatas=[{"query": user_query, "ts": time.time()}],
        )
    except Exception:
        pass


def reset() -> None:
    """Wipe all stored memory. Useful for local testing only — never
    call this from production code paths."""
    global _client, _collection
    if _collection is not None:
        _client.delete_collection(_COLLECTION_NAME)
        _collection = None
    _get_collection()