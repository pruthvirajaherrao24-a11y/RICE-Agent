"""
RICE Document Parser Module — Extract text and metadata from PDF, DOCX, CSV, TXT, JSON, MD & Log files.
"""

import os
import io
import csv
import json
from typing import Dict, Any

def parse_document(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """Parses raw document bytes based on file extension and returns extracted text and metadata."""
    ext = os.path.splitext(filename)[1].lower()
    
    metadata = {
        "filename": filename,
        "extension": ext,
        "size_bytes": len(file_bytes),
        "page_count": 1,
        "word_count": 0,
        "char_count": 0,
        "type": "Text Document"
    }

    extracted_text = ""

    try:
        if ext == ".pdf":
            import pypdf
            metadata["type"] = "PDF Document"
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            metadata["page_count"] = len(reader.pages)
            text_pages = []
            for idx, page in enumerate(reader.pages):
                txt = page.extract_text() or ""
                text_pages.append(f"[--- Page {idx + 1} ---]\n{txt}")
            extracted_text = "\n\n".join(text_pages)

        elif ext in [".docx", ".doc"]:
            import docx
            metadata["type"] = "Word Document"
            doc = docx.Document(io.BytesIO(file_bytes))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            extracted_text = "\n".join(paragraphs)

        elif ext == ".csv":
            metadata["type"] = "CSV Spreadsheet"
            content = file_bytes.decode("utf-8", errors="ignore")
            reader = csv.reader(io.StringIO(content))
            rows = list(reader)
            if rows:
                header = rows[0]
                metadata["columns"] = header
                metadata["row_count"] = len(rows) - 1
                preview_lines = [f"Header: {', '.join(header)}", f"Total Rows: {len(rows) - 1}\nSample Rows:"]
                for r in rows[1:10]:
                    preview_lines.append(", ".join(r))
                extracted_text = "\n".join(preview_lines) + f"\n\nFull Content:\n{content}"
            else:
                extracted_text = content

        elif ext == ".json":
            metadata["type"] = "JSON Data File"
            content = file_bytes.decode("utf-8", errors="ignore")
            try:
                data = json.loads(content)
                extracted_text = json.dumps(data, indent=2)
            except Exception:
                extracted_text = content

        else:
            # Plain text, markdown, log, code, etc.
            metadata["type"] = "Plain Text / Code"
            extracted_text = file_bytes.decode("utf-8", errors="ignore")

    except Exception as e:
        extracted_text = f"[Document Extraction Error for {filename}: {str(e)}]"

    metadata["char_count"] = len(extracted_text)
    metadata["word_count"] = len(extracted_text.split())

    return {
        "status": "success",
        "metadata": metadata,
        "text": extracted_text
    }
