import pdfplumber
from dataclasses import dataclass

@dataclass
class PageContent:
    page_number: int
    text: str
    paragraphs: list[str]  # Split by double newline

def extract_pdf(file_path: str) -> list[PageContent]:
    """
    Extract text from PDF, preserving page boundaries and paragraph structure.
    
    Returns a list of PageContent objects, one per page.
    Each page has its text split into paragraphs for location tracking.
    """
    pages = []
    with pdfplumber.open(file_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            raw_text = page.extract_text()
            if not raw_text or not raw_text.strip():
                continue
            
            # Split into paragraphs (double newline = paragraph break)
            paragraphs = [p.strip() for p in raw_text.split("\n\n") if p.strip()]
            
            pages.append(PageContent(
                page_number=page_num,
                text=raw_text.strip(),
                paragraphs=paragraphs
            ))
    
    return pages