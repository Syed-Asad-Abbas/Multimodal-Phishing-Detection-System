
import os
from webpage_fetcher import SafeWebpageFetcher

def test_phishing_feed():
    """Test the webpage fetcher with URLs from the phishing feed"""
    feed_path = os.path.join("data", "phising_feed.txt")
    
    if not os.path.exists(feed_path):
        print(f"Error: Feed file not found at {feed_path}")
        return

    with open(feed_path, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]

    print(f"Found {len(urls)} URLs in feed.")
    
    fetcher = SafeWebpageFetcher(timeout=20, headless=True)
    
    results = {
        "success": 0,
        "failed": 0,
        "details": []
    }

    for i, url in enumerate(urls):
        print(f"\n[{i+1}/{len(urls)}] Testing: {url}")
        try:
            result = fetcher.fetch_page(url)
            
            if result['success']:
                print(f"[OK] Success")
                print(f"  Title: {result['page_title']}")
                print(f"  Screenshot: {result['screenshot_path']}")
                results["success"] += 1
                results["details"].append({"url": url, "status": "success", "title": result['page_title']})
            else:
                print(f"[FAIL] Failed")
                print(f"  Error: {result['error']}")
                results["failed"] += 1
                results["details"].append({"url": url, "status": "failed", "error": result['error']})
                
        except Exception as e:
            print(f"[ERROR] Exception processing {url}: {e}")
            results["failed"] += 1
            results["details"].append({"url": url, "status": "error", "error": str(e)})

    print("\n" + "="*50)
    print("SUMMARY")
    print("="*50)
    print(f"Total URLs: {len(urls)}")
    print(f"Success: {results['success']}")
    print(f"Failed: {results['failed']}")

if __name__ == "__main__":
    test_phishing_feed()
