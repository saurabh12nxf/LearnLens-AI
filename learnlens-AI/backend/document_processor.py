import os
import re
from typing import List, Dict, Any
import fitz  # PyMuPDF


class DocumentProcessor:
    """
    Handles PDF text extraction and semantic chunking with metadata preservation.
    Tracks exact page numbers so every retrieved chunk can be cited accurately.
    """

    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    @staticmethod
    def clean_text(raw_text: str) -> str:
        """Cleans extracted text by normalizing spaces and fixing broken line breaks."""
        if not raw_text:
            return ""
        # Replace carriage returns and multiple newlines
        cleaned = raw_text.replace("\r\n", "\n").replace("\r", "\n")
        # Replace non-breaking spaces
        cleaned = cleaned.replace("\xa0", " ")
        # Collapse excessive newlines into paragraph breaks
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        # Collapse multiple horizontal whitespaces into single space
        cleaned = re.sub(r"[ \t]+", " ", cleaned)
        return cleaned.strip()

    def extract_text_from_pdf(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Extracts text from each page of a PDF using PyMuPDF.

        Returns a list of dicts:
        [
            {"page_number": 1, "text": "Page content...", "char_count": 450},
            ...
        ]
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found at: {file_path}")

        pages_data = []
        doc = fitz.open(file_path)

        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_text = page.get_text("text")
            cleaned = self.clean_text(page_text)

            pages_data.append({
                "page_number": page_idx + 1,  # 1-indexed for human readability
                "text": cleaned,
                "char_count": len(cleaned),
            })

        doc.close()
        return pages_data

    def chunk_document(self, pages_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Chunks the document using a sliding window approach with overlap.
        Preserves exact page numbers for each chunk.

        Returns list of chunks:
        [
            {
                "chunk_index": 0,
                "page_number": 1,
                "text": "Chunk text content...",
                "length": 502
            },
            ...
        ]
        """
        chunks = []
        global_chunk_idx = 0

        for page_info in pages_data:
            page_num = page_info["page_number"]
            page_text = page_info["text"]

            if not page_text or len(page_text.strip()) == 0:
                continue

            # If page is shorter than chunk_size, keep it as a single chunk
            if len(page_text) <= self.chunk_size:
                chunks.append({
                    "chunk_index": global_chunk_idx,
                    "page_number": page_num,
                    "text": page_text,
                    "length": len(page_text),
                })
                global_chunk_idx += 1
                continue

            # Sliding window chunking with sentence/paragraph boundary preference
            start = 0
            text_length = len(page_text)

            while start < text_length:
                end = start + self.chunk_size

                # If this is the last piece, take all remaining text
                if end >= text_length:
                    chunk_slice = page_text[start:text_length].strip()
                    if chunk_slice:
                        chunks.append({
                            "chunk_index": global_chunk_idx,
                            "page_number": page_num,
                            "text": chunk_slice,
                            "length": len(chunk_slice),
                        })
                        global_chunk_idx += 1
                    break

                # Look for natural breaking points (period, exclamation, question mark, newline)
                best_break = -1
                for punct in [". ", "?\n", "!\n", ".\n", "\n\n", "\n", " "]:
                    pos = page_text.rfind(punct, start + self.chunk_size // 2, end)
                    if pos != -1:
                        best_break = pos + len(punct)
                        break

                if best_break != -1 and best_break > start:
                    chunk_slice = page_text[start:best_break].strip()
                    advance = best_break - self.chunk_overlap
                else:
                    chunk_slice = page_text[start:end].strip()
                    advance = end - self.chunk_overlap

                if chunk_slice:
                    chunks.append({
                        "chunk_index": global_chunk_idx,
                        "page_number": page_num,
                        "text": chunk_slice,
                        "length": len(chunk_slice),
                    })
                    global_chunk_idx += 1

                start = max(advance, start + 1)

        return chunks

    def process_pdf(self, file_path: str) -> Dict[str, Any]:
        """Convenience method that extracts pages and chunks the document in one call."""
        pages = self.extract_text_from_pdf(file_path)
        chunks = self.chunk_document(pages)
        return {
            "file_path": file_path,
            "filename": os.path.basename(file_path),
            "page_count": len(pages),
            "chunk_count": len(chunks),
            "pages": pages,
            "chunks": chunks,
        }
