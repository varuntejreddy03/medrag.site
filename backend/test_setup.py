#!/usr/bin/env python3
"""
Quick setup test script for MedRAG backend
Run this to verify your installation and configuration
"""

import asyncio
import sys
import os
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

async def test_imports():
    """Test that all required modules can be imported"""
    print("🔍 Testing imports...")
    
    try:
        import fastapi
        print(f"✅ FastAPI {fastapi.__version__}")
    except ImportError as e:
        print(f"❌ FastAPI import failed: {e}")
        return False
    
    try:
        import redis
        print(f"✅ Redis")
    except ImportError as e:
        print(f"❌ Redis import failed: {e}")
        return False
    
    try:
        import faiss
        print(f"✅ FAISS")
    except ImportError as e:
        print(f"❌ FAISS import failed: {e}")
        return False
    
    try:
        import networkx as nx
        print(f"✅ NetworkX {nx.__version__}")
    except ImportError as e:
        print(f"❌ NetworkX import failed: {e}")
        return False
    
    try:
        from app.config import settings
        print(f"✅ App configuration loaded")
    except ImportError as e:
        print(f"❌ App config import failed: {e}")
        return False
    
    return True

async def test_data_files():
    """Test that required data files exist"""
    print("\n📁 Testing data files...")
    
    from app.config import settings
    
    files_to_check = [
        ("FAISS Index", settings.faiss_index_path),
        ("Embeddings", settings.embeddings_path),
        ("Case Metadata", settings.case_metadata_path),
        ("Knowledge Graph", settings.knowledge_graph_path),
        ("Disease Ontology", settings.disease_ontology_path),
        ("Triplets", settings.triplets_path),
        ("Embedding Config", settings.embedding_config_path)
    ]
    
    all_exist = True
    for name, path in files_to_check:
        if os.path.exists(path):
            size = os.path.getsize(path)
            print(f"✅ {name}: {path} ({size:,} bytes)")
        else:
            print(f"❌ {name}: {path} (NOT FOUND)")
            all_exist = False
    
    return all_exist

async def test_redis_connection():
    """Test Redis connection"""
    print("\n🔗 Testing Redis connection...")
    
    try:
        import redis
        from app.config import settings
        
        r = redis.from_url(settings.redis_url)
        r.ping()
        print(f"✅ Redis connected: {settings.redis_url}")
        return True
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print("💡 Make sure Redis is running: docker run -d -p 6379:6379 redis:7-alpine")
        return False

async def test_faiss_client():
    """Test FAISS client initialization"""
    print("\n🔍 Testing FAISS client...")
    
    try:
        from app.core.faiss_client import faiss_client
        await faiss_client.initialize()
        
        stats = faiss_client.get_stats()
        if stats["status"] == "initialized":
            print(f"✅ FAISS initialized: {stats['total_vectors']} vectors, {stats['cases_loaded']} cases")
            return True
        else:
            print(f"❌ FAISS not initialized: {stats}")
            return False
    except Exception as e:
        print(f"❌ FAISS client failed: {e}")
        return False

async def test_kg_client():
    """Test Knowledge Graph client initialization"""
    print("\n🕸️ Testing Knowledge Graph client...")
    
    try:
        from app.core.kg_client import kg_client
        await kg_client.initialize()
        
        stats = kg_client.get_stats()
        if stats["status"] == "initialized":
            print(f"✅ KG initialized: {stats['nodes']} nodes, {stats['edges']} edges")
            return True
        else:
            print(f"❌ KG not initialized: {stats}")
            return False
    except Exception as e:
        print(f"❌ KG client failed: {e}")
        return False

async def test_llm_client():
    """Test LLM client"""
    print("\n🤖 Testing LLM client...")
    
    try:
        from app.core.llm_client import llm_client
        
        # Test with a simple prompt
        result = await llm_client.generate_diagnosis("Patient has chest pain")
        
        if "differential_diagnosis" in result:
            print(f"✅ LLM client working: {len(result['differential_diagnosis'])} diagnoses generated")
            return True
        else:
            print(f"❌ LLM client returned invalid response: {result}")
            return False
    except Exception as e:
        print(f"❌ LLM client failed: {e}")
        return False

async def test_api_startup():
    """Test API can start up"""
    print("\n🚀 Testing API startup...")
    
    try:
        from app.main import app
        print("✅ FastAPI app created successfully")
        
        # Test that we can create the app without errors
        return True
    except Exception as e:
        print(f"❌ API startup failed: {e}")
        return False

async def run_all_tests():
    """Run all tests"""
    print("🧪 MedRAG Backend Setup Test")
    print("=" * 50)
    
    tests = [
        ("Imports", test_imports),
        ("Data Files", test_data_files),
        ("Redis Connection", test_redis_connection),
        ("FAISS Client", test_faiss_client),
        ("Knowledge Graph Client", test_kg_client),
        ("LLM Client", test_llm_client),
        ("API Startup", test_api_startup)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results[test_name] = result
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results[test_name] = False
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary:")
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status} {test_name}")
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Your MedRAG backend is ready to go!")
        print("\n🚀 Next steps:")
        print("  1. Start the API: uvicorn app.main:app --reload")
        print("  2. Start Celery worker: celery -A app.core.tasks worker --loglevel=info")
        print("  3. Visit http://localhost:8000/docs for API documentation")
    else:
        print(f"\n⚠️  {total - passed} tests failed. Please fix the issues above.")
        print("\n💡 Common fixes:")
        print("  - Install missing dependencies: pip install -r requirements.txt")
        print("  - Start Redis: docker run -d -p 6379:6379 redis:7-alpine")
        print("  - Check data file paths in .env")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)