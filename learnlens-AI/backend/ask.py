import sys
import argparse
import os
from database import SessionLocal, init_db, LearningResource
from document_processor import DocumentProcessor
from vector_store import VectorStore
from rag_service import RAGService

def main():
    parser = argparse.ArgumentParser(description="LearnLens AI - Instant PDF Q&A Tool")
    parser.add_argument("question", nargs="?", type=str, help="Question to ask")
    parser.add_argument("--pdf", type=str, help="Optional: PDF file path to upload/index first", default=None)
    parser.add_argument("--method", choices=["semantic", "keyword_baseline"], default="semantic", help="Retrieval method")
    parser.add_argument("--top-k", type=int, default=3, help="Number of chunks to retrieve")
    args = parser.parse_args()

    init_db()
    db = SessionLocal()
    store = VectorStore(db)
    rag = RAGService(store)

    doc_id = None
    if args.pdf:
        pdf_path = os.path.abspath(args.pdf)
        if not os.path.exists(pdf_path):
            print(f"Error: PDF not found at {pdf_path}")
            sys.exit(1)
        
        print(f"📄 Processing and indexing '{os.path.basename(pdf_path)}'...")
        processor = DocumentProcessor(chunk_size=512, chunk_overlap=50)
        processed = processor.process_pdf(pdf_path)
        
        resource = store.store_document(
            title=os.path.splitext(os.path.basename(pdf_path))[0],
            filename=os.path.basename(pdf_path),
            file_path=pdf_path,
            file_size=os.path.getsize(pdf_path),
            page_count=processed["page_count"],
            chunks=processed["chunks"]
        )
        doc_id = resource.id
        print(f"✅ Indexed {processed['page_count']} pages into {processed['chunk_count']} chunks (Document ID: {doc_id})")

    if not args.question:
        # If no question provided via CLI arguments, ask interactively
        print("\nEnter your question (or type 'exit' to quit):")
        while True:
            try:
                q = input("\n🎓 Student Question > ").strip()
                if not q or q.lower() in ["exit", "quit", "q"]:
                    break
                
                res = rag.generate_grounded_answer(
                    question=q,
                    resource_id=doc_id,
                    top_k=args.top_k,
                    retrieval_method=args.method
                )
                print("\n" + "=" * 60)
                print("💡 GROUNDED ANSWER:")
                print("=" * 60)
                print(res["answer"])
                print("\n📚 SOURCES & CITATIONS:")
                for c in res["citations"]:
                    print(f"  • Page {c['page_number']} | Document: '{c['document_title']}' | Score: {c['similarity_score']}")
                    print(f"    Excerpt: \"{c['text_snippet'][:100]}...\"")
                print("=" * 60)
            except (KeyboardInterrupt, EOFError):
                break
    else:
        res = rag.generate_grounded_answer(
            question=args.question,
            resource_id=doc_id,
            top_k=args.top_k,
            retrieval_method=args.method
        )
        print("\n" + "=" * 60)
        print(f"🎓 QUESTION: {args.question}")
        print("=" * 60)
        print("💡 GROUNDED ANSWER:")
        print(res["answer"])
        print("\n📚 SOURCES & CITATIONS:")
        for c in res["citations"]:
            print(f"  • Page {c['page_number']} | Document: '{c['document_title']}' | Score: {c['similarity_score']}")
            print(f"    Excerpt: \"{c['text_snippet'][:100]}...\"")
        print("=" * 60)

    db.close()

if __name__ == "__main__":
    main()
