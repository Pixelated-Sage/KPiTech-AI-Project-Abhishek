import pypdfium2 as pdfium
from dataclasses import dataclass

@dataclass
class PageContent:
    page_number: int
    text: str
    paragraphs: list[str]  # Split by double newline

def extract_pdf(file_path: str) -> list[PageContent]:
    """
    Extract text from PDF using pypdfium2 (much faster than pdfplumber).
    
    Returns a list of PageContent objects, one per page.
    """
    pages = []
    pdf = pdfium.PdfDocument(file_path)
    
    for page_num in range(len(pdf)):
        page = pdf.get_page(page_num)
        text_page = page.get_text_page()
        raw_text = text_page.get_text_range()
        
        if not raw_text or not raw_text.strip():
            continue
            
        # Split into paragraphs (heuristic: double newline)
        paragraphs = [p.strip() for p in raw_text.split("\n\n") if p.strip()]
        
        pages.append(PageContent(
            page_number=page_num + 1,
            text=raw_text.strip(),
            paragraphs=paragraphs
        ))
        
    return pages