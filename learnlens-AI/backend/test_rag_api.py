import os
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_api():
    print("Testing FastAPI Endpoints for LearnLens AI...")

    # 1. Health check
    res = client.get("/")
    assert res.status_code == 200, f"Root check failed: {res.text}"
    print("✅ Root API:", res.json())

    # 2. List documents
    res = client.get("/api/documents")
    assert res.status_code == 200, f"List documents failed: {res.text}"
    docs = res.json()
    print(f"✅ Found {len(docs)} documents in database.")
    for d in docs[:3]:
        print(f"   - Doc ID {d['id']}: '{d['title']}' ({d['page_count']} pages, {d['chunk_count']} chunks)")

    # 3. Query RAG via HTTP POST /api/query
    query_payload = {
        "question": "What is the average time complexity of searching a binary search tree?",
        "top_k": 3,
        "retrieval_method": "semantic"
    }
    res = client.post("/api/query", json=query_payload)
    assert res.status_code == 200, f"Query failed: {res.text}"
    data = res.json()
    print("\n✅ POST /api/query successful!")
    print(f"   Question: {data['question']}")
    print(f"   Answer:\n{data['answer']}")
    print(f"   Citations count: {len(data['citations'])}")
    for c in data['citations']:
        print(f"     -> Page {c['page_number']} (Score: {c['similarity_score']}): {c['text_snippet'][:80]}...")

    print("\n🎉 ALL API ENDPOINTS VERIFIED AND WORKING!")

if __name__ == "__main__":
    test_api()
