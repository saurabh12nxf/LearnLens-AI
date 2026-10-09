import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import openai

from vector_store import VectorStore

load_dotenv()


class RAGService:
    """
    Core RAG Engine for LearnLens AI:
    Orchestrates retrieval (semantic vs baseline) and grounded answer generation
    with explicit page-level citations.
    """

    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.model_name = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

        self.openai_client = None
        if self.api_key and self.api_key != "your_openai_api_key_here":
            try:
                self.openai_client = openai.OpenAI(
                    api_key=self.api_key,
                    max_retries=0,
                    timeout=4.0,
                )
            except Exception as e:
                print(f"[RAGService] Notice: OpenAI client init warning: {e}")

    def generate_grounded_answer(
        self,
        question: str,
        resource_id: Optional[int] = None,
        top_k: int = 4,
        retrieval_method: str = "semantic",
    ) -> Dict[str, Any]:
        """
        Executes the full RAG pipeline:
        1. Query -> Vector / Keyword Search
        2. Retrieve top-K chunks with page numbers and scores
        3. Formulate strict academic prompt
        4. Synthesize grounded answer with source attribution
        """
        # Step 1 & 2: Retrieval
        if retrieval_method == "keyword_baseline":
            retrieved_chunks = self.vector_store.search_keyword_baseline(
                query=question,
                resource_id=resource_id,
                top_k=top_k,
            )
        else:
            retrieved_chunks = self.vector_store.search_semantic(
                query=question,
                resource_id=resource_id,
                top_k=top_k,
            )

        if not retrieved_chunks:
            return {
                "question": question,
                "answer": "No relevant content was found in the uploaded learning material for this question.",
                "citations": [],
                "retrieval_method": retrieval_method,
                "chunks_used": 0,
                "model_used": "none",
            }

        # Format context excerpts with page attribution
        context_blocks = []
        citations = []

        for idx, chunk in enumerate(retrieved_chunks, 1):
            page = chunk.get("page_number", 1)
            doc_title = chunk.get("document_title", "Uploaded Document")
            score = chunk.get("similarity_score", 0.0)
            text = chunk.get("text", "")

            context_blocks.append(
                f"[Source {idx} | Document: '{doc_title}' | Page {page} | Score: {score}]\n{text}"
            )

            citations.append({
                "source_index": idx,
                "document_title": doc_title,
                "document_filename": chunk.get("document_filename", ""),
                "page_number": page,
                "similarity_score": score,
                "text_snippet": text[:200] + ("..." if len(text) > 200 else ""),
            })

        combined_context = "\n\n---\n\n".join(context_blocks)

        system_prompt = (
            "You are LearnLens AI, an academic personalized learning assistant. "
            "Your task is to answer the student's question accurately and faithfully "
            "based SOLELY on the provided context excerpts from their study materials.\n\n"
            "RULES:\n"
            "1. Ground your answer strictly in the facts provided in the excerpts.\n"
            "2. If the context does not contain enough information to answer the question, "
            "state clearly: 'The provided study materials do not contain sufficient information to answer this question.'\n"
            "3. Cite the exact page number(s) (e.g., [Page X]) whenever explaining concepts.\n"
            "4. Keep explanations educational, structured, and easy to understand."
        )

        user_prompt = (
            f"STUDY MATERIAL EXCERPTS:\n\n{combined_context}\n\n"
            f"STUDENT QUESTION: {question}\n\n"
            "GROUNDED ANSWER (with Page citations):"
        )

        answer_text = ""
        model_used = self.model_name

        # Step 3: LLM Answer Generation with graceful fallback
        if self.openai_client:
            try:
                response = self.openai_client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.2,
                    max_tokens=600,
                )
                answer_text = response.choices[0].message.content.strip()
            except Exception as e:
                print(f"[RAGService] OpenAI API call failed ({e}). Falling back to grounded extractive synthesis.")
                answer_text = self._extractive_fallback_answer(question, retrieved_chunks)
                model_used = "learnlens-grounded-synthesizer (offline fallback)"
        else:
            answer_text = self._extractive_fallback_answer(question, retrieved_chunks)
            model_used = "learnlens-grounded-synthesizer (offline fallback)"

        return {
            "question": question,
            "answer": answer_text,
            "citations": citations,
            "retrieval_method": retrieval_method,
            "chunks_used": len(retrieved_chunks),
            "model_used": model_used,
        }

    def _extractive_fallback_answer(self, question: str, chunks: List[Dict[str, Any]]) -> str:
        """
        Deterministic, grounded fallback that synthesizes the most relevant
        sentences from top retrieved chunks. Ensures the system works 100% reliably
        even without OpenAI credits or when offline.
        """
        top_chunks = chunks[:3]
        pages_referenced = sorted(list(set(c["page_number"] for c in top_chunks)))
        pages_str = ", ".join(f"Page {p}" for p in pages_referenced)

        answer_lines = [
            f"Based on the learning material ({pages_str}):",
            "",
        ]

        for i, c in enumerate(top_chunks, 1):
            chunk_text = c["text"].strip()
            # Pick first 2-3 most informative sentences
            sentences = [s.strip() for s in chunk_text.replace("\n", " ").split(".") if len(s.strip()) > 15]
            summary_snippet = ". ".join(sentences[:3])
            if summary_snippet and not summary_snippet.endswith("."):
                summary_snippet += "."

            answer_lines.append(f"• **From Page {c['page_number']}**: {summary_snippet}")

        answer_lines.append("")
        answer_lines.append(f"*(Grounded from {len(top_chunks)} document excerpts via {chunks[0]['retrieval_method']} search)*")
        return "\n".join(answer_lines)
