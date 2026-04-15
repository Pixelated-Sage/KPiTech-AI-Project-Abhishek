import os
import tempfile
from fastapi import APIRouter, UploadFile, HTTPException, Request
from minirag.backend.models.schemas import UploadResponse

router = APIRouter()

@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile, request: Request):
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        if not (file.filename or "").endswith(".pdf"):
            raise HTTPException(400, "Only PDF files accepted")

    contents = await file.read()
    if len(contents) < 100:
        raise HTTPException(422, "File appears empty")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(contents)
        tmp_path = f.name

    try:
        from minirag.backend.main import get_services
        embedder, vector_store, _, _ = get_services(request.app)
        from minirag.backend.services.pdf_extractor import extract_pdf
        from minirag.backend.services.chunker import chunk_document
        import traceback

        try:
            pages = extract_pdf(tmp_path)
            if not pages:
                raise HTTPException(422, "No extractable text found in PDF")
        except Exception as e:
            raise HTTPException(500, f"extract_pdf crashed: {str(e)}\n{traceback.format_exc()}")

        try:
            chunks = chunk_document(
                pages,
                chunk_size=int(os.getenv("CHUNK_SIZE", 512)),
                chunk_overlap=int(os.getenv("CHUNK_OVERLAP", 50)),
            )
            if not chunks:
                raise HTTPException(422, "Document produced no chunks")
        except Exception as e:
            raise HTTPException(500, f"chunk_document crashed: {str(e)}\n{traceback.format_exc()}")

        try:
            embeddings = embedder.embed_texts([c.text for c in chunks])
        except Exception as e:
            raise HTTPException(500, f"embed_texts crashed: {str(e)}\n{traceback.format_exc()}")

        try:
            # Reset collection before adding new document
            vector_store.reset()
            vector_store.create_collection()
            vector_store.add_chunks(chunks, embeddings)
        except Exception as e:
            raise HTTPException(500, f"vector_store crashed: {str(e)}\n{traceback.format_exc()}")

        doc_id = (file.filename or "document").replace(".pdf", "")
        return UploadResponse(
            status="success",
            document_id=doc_id,
            total_pages=len(pages),
            total_chunks=len(chunks),
            embedding_model=embedder.model_name,
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(500, f"Unexpected error: {str(e)}\n{traceback.format_exc()}")
    finally:
        os.unlink(tmp_path)
