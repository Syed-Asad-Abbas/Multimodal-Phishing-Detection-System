
import os
import sys
import json
from inference_complete import predict_complete_pipeline

def test_full_pipeline():
    """Test the full inference pipeline with URLs from the phishing feed"""
    feed_path = os.path.join("data", "phising_feed.txt")
    
    if not os.path.exists(feed_path):
        print(f"Error: Feed file not found at {feed_path}")
        return

    with open(feed_path, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]

    print(f"Found {len(urls)} URLs in feed.")
    
    results_summary = {
        "total": 0,
        "phishing": 0,
        "benign": 0,
        "errors": 0,
        "details": []
    }

    # Create results directory
    os.makedirs("results", exist_ok=True)
    
    for i, url in enumerate(urls):
        print(f"\n[{i+1}/{len(urls)}] Processing: {url}")
        try:
            # Run the complete pipeline
            # We use a shorter timeout for the test to proceed faster
            result = predict_complete_pipeline(url, fetch_timeout=20)
            
            results_summary["total"] += 1
            if result["prediction"] == "PHISHING":
                results_summary["phishing"] += 1
            else:
                results_summary["benign"] += 1
                
            results_summary["details"].append({
                "url": url,
                "prediction": result["prediction"],
                "confidence": result["confidence"],
                "modalities": result["modality_available"]
            })
            
        except Exception as e:
            print(f"[ERROR] Failed to process {url}: {e}")
            results_summary["errors"] += 1
            results_summary["details"].append({
                "url": url,
                "error": str(e)
            })

    # Save summary
    with open("results/phishing_feed_test_results.json", "w") as f:
        json.dump(results_summary, f, indent=2)

    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Total URLs: {results_summary['total']}")
    print(f"Phishing:   {results_summary['phishing']}")
    print(f"Benign:     {results_summary['benign']}")
    print(f"Errors:     {results_summary['errors']}")
    print(f"Results saved to results/phishing_feed_test_results.json")

if __name__ == "__main__":
    test_full_pipeline()
