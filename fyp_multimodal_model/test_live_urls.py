"""
Batch Test Live URLs
Tests multiple URLs and generates report
"""

import argparse
import json
import time
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")
from inference_complete import predict_complete_pipeline

# Predefined benign URLs for testing
BENIGN_URLS = [
    "https://www.google.com",
    "https://www.github.com",
    "https://www.wikipedia.org",
    "https://www.microsoft.com",
    "https://www.stackoverflow.com",
    "https://www.reddit.com",
    "https://www.amazon.com",
    "https://www.paypal.com"
]


def test_urls(urls, models_dir="models", timeout=10, device="cpu", output_file=None):
    """
    Test multiple URLs and generate report
    
    Args:
        urls: List of URLs to test
        models_dir: Path to models directory
        timeout: Page fetch timeout
        device: torch device
        output_file: Optional file to save results
    """
    results = []
    
    print("="*70)
    print("BATCH URL TESTING - Live Fetching")
    print("="*70)
    print(f"\nTesting {len(urls)} URLs...\n")
    
    for i, url in enumerate(urls, 1):
        print(f"\n[{i}/{len(urls)}] Testing: {url}")
        print("-" * 70)
        
        try:
            result = predict_complete_pipeline(
                url=url,
                models_dir=models_dir,
                fetch_timeout=timeout,
                device=device
            )
            results.append(result)
            
            # Brief summary
            print(f"\n→ Result: {result['prediction']} ({result['confidence']:.1%} confidence)")
            print(f"→ Modalities: {sum(result['modality_available'].values())}/3")
            
        except Exception as e:
            print(f"\n✗ Error testing {url}: {e}")
            results.append({
                "url": url,
                "error": str(e),
                "prediction": "ERROR"
            })
        
        # Small delay between tests to be respectful
        if i < len(urls):
            time.sleep(2)
    
    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    
    total = len(results)
    benign_count = sum(1 for r in results if r.get('prediction') == 'BENIGN')
    phishing_count = sum(1 for r in results if r.get('prediction') == 'PHISHING')
    error_count = sum(1 for r in results if r.get('prediction') == 'ERROR')
    
    print(f"\nTotal Tested: {total}")
    print(f"  ✓ Predicted BENIGN: {benign_count}")
    print(f"  ⚠  Predicted PHISHING: {phishing_count}")
    print(f"  ✗ Errors: {error_count}")
    
    # Detailed table
    print("\n" + "="*70)
    print("RESULTS TABLE")
    print("="*70)
    print(f"{'#':<4} {'URL':<40} {'Prediction':<12} {'Confidence':<12} {'Modalities'}")
    print("-" * 70)
    
    for i, r in enumerate(results, 1):
        url_short = r['url'][:38] + ".." if len(r['url']) > 40 else r['url']
        pred = r.get('prediction', 'ERROR')
        conf = f"{r.get('confidence', 0):.1%}" if 'confidence' in r else "N/A"
        mods = f"{sum(r['modality_available'].values())}/3" if 'modality_available' in r else "N/A"
        print(f"{i:<4} {url_short:<40} {pred:<12} {conf:<12} {mods}")
    
    # Save to file
    if output_file:
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n✓ Results saved to: {output_file}")
    
    print("="*70)
    
    return results


def main():
    parser = argparse.ArgumentParser(description='Batch test live URLs')
    parser.add_argument('--benign', action='store_true', help='Test predefined benign URLs')
    parser.add_argument('--file', help='File with URLs (one per line)')
    parser.add_argument('--url', action='append', help='Individual URL to test (can use multiple times)')
    parser.add_argument('--models-dir', default='models', help='Models directory')
    parser.add_argument('--timeout', type=int, default=10, help='Page fetch timeout')
    parser.add_argument('--output', help='Save results to JSON file')
    args = parser.parse_args()
    
    # Determine URLs to test
    urls = []
    
    if args.benign:
        urls.extend(BENIGN_URLS)
    
    if args.file:
        with open(args.file, 'r') as f:
            file_urls = [line.strip() for line in f if line.strip() and not line.startswith('#')]
            urls.extend(file_urls)
    
    if args.url:
        urls.extend(args.url)
    
    if not urls:
        # Default to phising_feed.txt if it exists
        default_feed = "data/phising_feed.txt"
        import os
        if os.path.exists(default_feed):
            print(f"No arguments provided. Defaulting to {default_feed}...")
            with open(default_feed, 'r') as f:
                file_urls = [line.strip() for line in f if line.strip() and not line.startswith('#')]
                urls.extend(file_urls)
        else:
            print("Error: No URLs to test!")
            print("Usage:")
            print("  python test_live_urls.py --benign")
            print("  python test_live_urls.py --file data/phising_feed.txt")
            print("  python test_live_urls.py --url https://example.com")
            return
    
    # Run tests
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    test_urls(
        urls=urls,
        models_dir=args.models_dir,
        timeout=args.timeout,
        device=device,
        output_file=args.output
    )


if __name__ == "__main__":
    main()
