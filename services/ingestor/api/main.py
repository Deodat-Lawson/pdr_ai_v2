import os, json
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from openai import OpenAI
from .db import conn, vec_literal
from .ocr_parse import fetch_pdf, pdf_to_text
from .models import IngestJob
from .chunking import chunk

EMBED_MODEL = "text-embedding-3-large"
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
app = FastAPI(title="PDR Ingestor")

def embed(texts):
    r = client.embeddings.create(model=EMBED_MODEL, input=texts)
    return [d.embedding for d in r.data]

@app.get("/health")
def health():
    c = conn(); c.execute("SELECT 1")
    return {"ok": True}

@app.post("/ingest")
def ingest(job: IngestJob):
    try:
        pdf = fetch_pdf(job.s3_url)
    except Exception as e:
        raise HTTPException(400, f"Download failed: {e}")

    text = pdf_to_text(pdf, force_ocr=job.force_ocr or os.getenv("OCR","false").lower()=="true").replace("\x00"," ").strip()
    if not text: raise HTTPException(422, "No extractable text")

    pieces = chunk(text, 5000, 300)
    vecs = embed([p["text"] for p in pieces])

    c = conn(); cur = c.cursor()
    for i,p, v in enumerate(zip(pieces, vecs)):
        meta = dict(job.meta or {})
        meta["chunk_index"] = i
        cur.execute(
            """INSERT INTO doc_chunks (doc_id, kind, jurisdiction, heading, text, embedding, meta)
               VALUES (%s,%s,%s,%s,%s,%s::vector,%s)""",
            (job.doc_id, job.kind, job.jurisdiction, p["heading"] or job.heading_hint, p["text"], vec_literal(v), json.dumps(job.meta))
        )
    cur.close()
    return JSONResponse({"ok": True, "doc_id": job.doc_id, "chunks": len(pieces)})
