from langchain_text_splitters import RecursiveCharacterTextSplitter
from dataclasses import dataclass

@dataclass
class Chunk:
    chunk_id: str          # "chunk_001"
    text: str              # The actual chunk content
    page_number: int       # Which page this came from
    paragraph_index: int   # Which paragraph on that page
    chunk_index: int       # Global index across all chunks

def chunk_document(pages: list[PageContent],
                   chunk_size: int = 512,
                   chunk_overlap: int = 50) -> list[Chunk]:
    """
    Split extracted pages into overlapping chunks with location metadata.
    
    The key insight: we chunk WITHIN each page to preserve page attribution.
    If we concatenated all pages first, we'd lose which page each chunk came from.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )
    
    chunks = []
    global_index = 0
    
    for page in pages:
        for para_idx, paragraph in enumerate(page.paragraphs):
            # Split this paragraph into chunks (usually 1, unless very long)
            splits = splitter.split_text(paragraph)
            
            for split in splits:
                if len(split.strip()) < 50:  # Skip tiny fragments
                    continue
                    
                chunks.append(Chunk(
                    chunk_id=f"chunk_{global_index:04d}",
                    text=split.strip(),
                    page_number=page.page_number,
                    paragraph_index=para_idx + 1,  # 1-indexed for display
                    chunk_index=global_index,
                ))
                global_index += 1
    
    return chunks