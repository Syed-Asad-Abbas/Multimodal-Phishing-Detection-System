
from url_utils import is_url_alive
import time

def test_liveness():
    """Test the liveness check with various URLs"""
    
    test_cases = [
        ("https://www.google.com", True, "Known alive site"),
        ("https://www.example.com", True, "Example.com (200 OK)"),
        ("https://this-domain-definitely-does-not-exist-12345.com", False, "Non-existent domain"),
        ("https://httpbin.org/status/404", False, "404 page"),
        ("https://httpbin.org/status/200", True, "200 OK"),
        ("https://httpbin.org/status/403", True, "403 Forbidden (should be considered alive)"),
    ]
    
    print("Running Liveness Check Tests...")
    print("="*60)
    
    passed = 0
    for url, expected, desc in test_cases:
        print(f"Testing: {url} ({desc})")
        start = time.time()
        result = is_url_alive(url)
        duration = time.time() - start
        
        status = "PASS" if result == expected else "FAIL"
        if status == "PASS":
            passed += 1
            
        print(f"  Result: {result} (Expected: {expected})")
        print(f"  Time: {duration:.2f}s")
        print(f"  Status: [{status}]")
        print("-" * 40)
        
    print(f"\nSummary: {passed}/{len(test_cases)} tests passed.")

if __name__ == "__main__":
    test_liveness()
