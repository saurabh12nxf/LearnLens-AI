import os
import sys
import argparse
import fitz  # PyMuPDF
from dotenv import load_dotenv

from database import init_db, SessionLocal
from document_processor import DocumentProcessor
from vector_store import VectorStore
from rag_service import RAGService

load_dotenv()


def create_sample_pdf(output_path: str):
    """
    Creates a sample 3-page Data Structures & Algorithms PDF using PyMuPDF
    to test the RAG pipeline end-to-end immediately.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = fitz.open()

    # Page 1: Binary Search Trees
    p1 = doc.new_page(width=612, height=792)
    text_p1 = (
        "Chapter 1: Binary Search Trees & Tree Traversal\n\n"
        "A Binary Search Tree (BST) is a node-based binary tree data structure with specific properties.\n"
        "The left subtree of a node contains only nodes with keys lesser than the node's key.\n"
        "The right subtree of a node contains only nodes with keys greater than the node's key.\n"
        "Both the left and right subtrees must also be binary search trees.\n\n"
        "Time Complexity for BST operations:\n"
        "- Search: Average case is O(log n), but worst case is O(n) when the tree is unbalanced (skewed).\n"
        "- Insertion: Average case is O(log n), worst case is O(n).\n"
        "- Deletion: Average case is O(log n), worst case is O(n).\n\n"
        "Tree traversals include In-order, Pre-order, and Post-order traversal.\n"
        "In-order traversal of a binary search tree visits nodes in ascending sorted numerical order.\n"
        "Balanced variants such as AVL trees and Red-Black trees guarantee O(log n) worst-case time."
    )
    p1.insert_text((50, 70), text_p1, fontsize=11)
    p1.insert_text((500, 750), "Page 1", fontsize=10)

    # Page 2: Recursion & Divide-and-Conquer
    p2 = doc.new_page(width=612, height=792)
    text_p2 = (
        "Chapter 2: Recursion and Divide & Conquer\n\n"
        "Recursion is a problem-solving technique where a function calls itself to solve smaller subproblems.\n"
        "Every recursive algorithm must contain two fundamental components:\n"
        "1. Base Case: The condition under which the function terminates without calling itself.\n"
        "2. Recursive Step: The rule that reduces the problem towards the base case.\n\n"
        "Without a proper base case, recursion results in infinite calls and a stack overflow error.\n\n"
        "Divide and Conquer Algorithms:\n"
        "This paradigm divides the problem into sub-problems, solves them recursively, and combines results.\n"
        "Classic examples include Merge Sort and Quick Sort.\n"
        "Merge Sort has a guaranteed time complexity of O(n log n) and requires O(n) auxiliary space.\n"
        "Call stack memory consumption is directly proportional to the maximum recursion depth."
    )
    p2.insert_text((50, 70), text_p2, fontsize=11)
    p2.insert_text((500, 750), "Page 2", fontsize=10)

    # Page 3: Dynamic Programming vs Recursion
    p3 = doc.new_page(width=612, height=792)
    text_p3 = (
        "Chapter 3: Dynamic Programming & Memoization\n\n"
        "Dynamic Programming (DP) is an optimization technique used for problems with overlapping subproblems\n"
        "and optimal substructure properties.\n\n"
        "Difference between Plain Recursion and Dynamic Programming:\n"
        "Plain recursion recomputes solutions to identical subproblems repeatedly, causing exponential\n"
        "time complexity O(2^n), as observed in the naive Fibonacci sequence.\n"
        "Dynamic programming saves solutions to already solved subproblems in memory to avoid redundant work.\n\n"
        "Two main implementation approaches:\n"
        "1. Top-Down Approach (Memoization): Uses recursion but stores results in a lookup table (cache).\n"
        "2. Bottom-Up Approach (Tabulation): Solves smallest subproblems first iteratively and builds up.\n\n"
        "Dynamic programming reduces exponential time algorithms to polynomial time, typically O(n) or O(n^2)."
    )
    p3.insert_text((50, 70), text_p3, fontsize=11)
    p3.insert_text((500, 750), "Page 3", fontsize=10)

    doc.save(output_path)
    doc.close()
    print(f"Sample academic PDF generated at: {output_path}")


def run_demo(pdf_path: str = None, user_query: str = None):
    print("=" * 70)
    print("LearnLens AI - Core Pillar 1: RAG System Live Demonstration")
    print("=" * 70)

    # 1. Initialize DB
    print("\n[1/5] Initializing Database & pgvector...")
    init_db()
    db = SessionLocal()

    # 2. Prepare PDF
    if not pdf_path:
        default_pdf = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "data", "sample_dsa_notes.pdf")
        )
        if not os.path.exists(default_pdf):
            print(f"\n[2/5] Creating sample 3-page DSA academic textbook at {default_pdf}...")
            # Check if reportlab is available
            try:
                create_sample_pdf(default_pdf)
            except ImportError:
                print("Notice: reportlab not installed, generating PDF via PyMuPDF...")
                import fitz
                doc = fitz.open()
                # Page 1
                p1 = doc.new_page()
                p1.insert_text((50, 70), "Chapter 1: Binary Search Trees & Tree Traversal\n\nA Binary Search Tree (BST) is a node-based binary tree data structure with specific properties.\nThe left subtree of a node contains only nodes with keys lesser than the node's key.\nThe right subtree of a node contains only nodes with keys greater than the node's key.\n\nTime Complexity for BST operations:\n- Search: Average case is O(log n), but worst case is O(n) when the tree is unbalanced.\n- Insertion: Average case is O(log n), worst case is O(n).\nIn-order traversal of a binary search tree visits nodes in ascending sorted numerical order.", fontsize=12)
                # Page 2
                p2 = doc.new_page()
                p2.insert_text((50, 70), "Chapter 2: Recursion and Divide & Conquer\n\nRecursion is a problem-solving technique where a function calls itself to solve smaller subproblems.\nEvery recursive algorithm must contain two fundamental components:\n1. Base Case: The condition under which the function terminates without calling itself.\n2. Recursive Step: The rule that reduces the problem towards the base case.\nWithout a proper base case, recursion results in infinite calls and a stack overflow error.", fontsize=12)
                # Page 3
                p3 = doc.new_page()
                p3.insert_text((50, 70), "Chapter 3: Dynamic Programming & Memoization\n\nDynamic Programming (DP) is an optimization technique used for problems with overlapping subproblems.\nDifference between Plain Recursion and Dynamic Programming:\nPlain recursion recomputes solutions to identical subproblems repeatedly, causing exponential time O(2^n).\nDynamic programming stores solutions to already solved subproblems in memory to avoid redundant work.\nTwo main approaches are Top-Down (Memoization) and Bottom-Up (Tabulation).", fontsize=12)
                doc.save(default_pdf)
                doc.close()
                print(f"Sample PDF created at {default_pdf}")
        pdf_path = default_pdf
    else:
        pdf_path = os.path.abspath(pdf_path)

    print(f"\n[2/5] Target Learning Resource: {pdf_path}")

    # 3. Document Processing (Extraction & Chunking)
    print("\n[3/5] Extracting text and chunking with sliding window (PyMuPDF)...")
    processor = DocumentProcessor(chunk_size=512, chunk_overlap=50)
    processed_doc = processor.process_pdf(pdf_path)
    print(f"   -> Extracted {processed_doc['page_count']} pages")
    print(f"   -> Created {processed_doc['chunk_count']} semantic chunks")

    # 4. Ingestion into pgvector
    print("\n[4/5] Generating embeddings (all-MiniLM-L6-v2) & storing in PostgreSQL...")
    store = VectorStore(db)
    resource = store.store_document(
        title=os.path.basename(pdf_path).replace(".pdf", ""),
        filename=os.path.basename(pdf_path),
        file_path=pdf_path,
        file_size=os.path.getsize(pdf_path),
        page_count=processed_doc["page_count"],
        chunks=processed_doc["chunks"],
    )
    print(f"   -> Document saved to Database with ID: {resource.id}")

    # 5. RAG Question Answering
    print("\n[5/5] Testing Grounded Question Answering...")
    rag = RAGService(store)

    test_queries = [
        "What is a Binary Search Tree and what is the average search time complexity?",
        "What is the difference between recursion and dynamic programming?",
    ]
    if user_query:
        test_queries = [user_query]

    for q in test_queries:
        print("\n" + "-" * 70)
        print(f"STUDENT QUESTION: {q}")
        print("-" * 70)

        # Run Semantic Search
        res_semantic = rag.generate_grounded_answer(
            question=q,
            resource_id=resource.id,
            top_k=3,
            retrieval_method="semantic",
        )

        print(f"\n[MODEL / SYNTHESIZER]: {res_semantic['model_used']}")
        print(f"[RETRIEVAL METHOD]: {res_semantic['retrieval_method']}")
        print(f"\nGROUNDED ANSWER:\n{res_semantic['answer']}")

        print("\nCITATIONS / SOURCES USED:")
        for cit in res_semantic["citations"]:
            print(f"  • Source {cit['source_index']}: Page {cit['page_number']} | Similarity: {cit['similarity_score']:.4f}")
            print(f"    Snippet: \"{cit['text_snippet'][:120]}...\"")

        # Academic Baseline Comparison (PRD Section 9 & 10)
        res_baseline = rag.generate_grounded_answer(
            question=q,
            resource_id=resource.id,
            top_k=3,
            retrieval_method="keyword_baseline",
        )
        print(f"\n[BASELINE COMPARISON (Keyword Search)]:")
        print(f"  Top Keyword Source: Page {res_baseline['citations'][0]['page_number'] if res_baseline['citations'] else 'None'}")
        print(f"  Keyword Overlap Score: {res_baseline['citations'][0]['similarity_score'] if res_baseline['citations'] else 0.0}")

    db.close()
    print("\n" + "=" * 70)
    print("🎉 CORE PILLAR 1 DEMO COMPLETED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LearnLens AI - RAG Demo")
    parser.add_argument("--pdf", type=str, help="Path to PDF to index and query", default=None)
    parser.add_argument("--query", type=str, help="Question to ask", default=None)
    args = parser.parse_args()

    run_demo(pdf_path=args.pdf, user_query=args.query)
