
import sys

def test_imports():
    """Test that all packages installed correctly"""
    print("Testing package imports...")
    
    try:
        import fastapi
        print("✅ FastAPI imported successfully")
    except ImportError as e:
        print(f"❌ FastAPI import failed: {e}")
        return False
    
    try:
        import uvicorn
        print("✅ Uvicorn imported successfully")
    except ImportError as e:
        print(f"❌ Uvicorn import failed: {e}")
        return False
    
    try:
        from sentence_transformers import SentenceTransformer
        print("✅ Sentence Transformers imported successfully")
    except ImportError as e:
        print(f"❌ Sentence Transformers import failed: {e}")
        return False
    
    try:
        import groq
        print("✅ Groq imported successfully")
    except ImportError as e:
        print(f"❌ Groq import failed: {e}")
        return False
    
    try:
        import fitz  # PyMuPDF
        print("✅ PyMuPDF imported successfully")
    except ImportError as e:
        print(f"❌ PyMuPDF import failed: {e}")
        return False
    
    try:
        import sqlalchemy
        print("✅ SQLAlchemy imported successfully")
    except ImportError as e:
        print(f"❌ SQLAlchemy import failed: {e}")
        return False
    
    try:
        import psycopg2
        print("✅ psycopg2 imported successfully")
    except ImportError as e:
        print(f"❌ psycopg2 import failed: {e}")
        return False
    
    return True

def test_database():
    """Test database connection"""
    print("\nTesting database connection...")
    
    try:
        import psycopg2
        from dotenv import load_dotenv
        import os
        
        load_dotenv()
        
        # Connect to database
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        cursor = conn.cursor()
        
        # Test query
        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()
        print(f"✅ Database connected successfully")
        print(f"   PostgreSQL version: {db_version[0][:50]}...")
        
        # Test pgvector extension
        cursor.execute("SELECT * FROM pg_extension WHERE extname = 'vector';")
        vector_ext = cursor.fetchone()
        if vector_ext:
            print("✅ pgvector extension is installed")
        else:
            print("❌ pgvector extension not found")
            return False
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_embedding_model():
    """Test embedding model"""
    print("\nTesting embedding model...")
    
    try:
        from sentence_transformers import SentenceTransformer
        
        model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ Embedding model loaded successfully")
        
        # Test encoding
        test_text = "This is a test sentence"
        embedding = model.encode([test_text])
        print(f"✅ Test encoding successful (dimension: {len(embedding[0])})")
        
        return True
        
    except Exception as e:
        print(f"❌ Embedding model test failed: {e}")
        return False

def test_groq():
    """Test Groq API key configuration"""
    print("\nTesting Groq API setup...")
    
    try:
        import groq
        from dotenv import load_dotenv
        import os
        
        load_dotenv()
        groq_key = os.getenv('GROQ_API_KEY')
        
        if not groq_key or groq_key == "your_groq_api_key_here":
            print("⚠️  GROQ_API_KEY is not yet set in .env (add your free key from https://console.groq.com)")
            print("   (System will use built-in grounded synthesizer until key is set)")
            return True
        
        print(f"✅ Groq API key found (starts with: {groq_key[:10]}...)")
        return True
        
    except Exception as e:
        print(f"❌ Groq setup failed: {e}")
        return False

def main():
    print("=" * 60)
    print("LearnLens AI - Environment Setup Verification")
    print("=" * 60)
    
    results = []
    
    # Run all tests
    results.append(("Package Imports", test_imports()))
    results.append(("Database Connection", test_database()))
    results.append(("Embedding Model", test_embedding_model()))
    results.append(("Groq API", test_groq()))
    
    # Summary
    print("\n" + "=" * 60)
    print("SETUP VERIFICATION SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:.<40} {status}")
        if not result:
            all_passed = False
    
    print("=" * 60)
    
    if all_passed:
        print("\n🎉 ALL TESTS PASSED! Your environment is ready!")
        print("\nNext steps:")
        print("1. Review LEARNLENS_IMPLEMENTATION_PLAN.md")
        print("2. Start building the document processor (Day 3-4)")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please fix the issues above.")
        print("\nCommon solutions:")
        print("- Reinstall failed packages: pip install <package-name>")
        print("- Check database is running: sudo systemctl status postgresql")
        print("- Verify .env file has correct values")
        return 1

if __name__ == "__main__":
    sys.exit(main())