"""
Fetch Reputation Data (Three Buckets Strategy)

1. Downloads Tranco Top 1M (Benign Whitelist)
2. Defines Spamhaus Blacklist
3. Generates:
    - data/tld_reputation.json (TLD counts from Tranco)
    - data/ngram_frequency.json (Char N-gram model from Tranco)
"""

import os
import json
import requests
import zipfile
import io
import re
from collections import Counter, defaultdict

# --- CONFIG ---
TRANCO_URL = "https://tranco-list.eu/top-1m.csv.zip"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
TLD_FILE = os.path.join(DATA_DIR, "tld_reputation.json")
NGRAM_FILE = os.path.join(DATA_DIR, "ngram_frequency.json")
SPAMHAUS_BLACKLIST = [
    'mil', 'aero', 'bt', 'int', 'gal', 'na', 'ruhr', 'lb', 'band', 'koeln', 'bayern', 'cab', 'eco', 'ad', 'ls', 'rugby', 'dm', 'wales', 'ky', 'bf', 'game', 'cu', 'auto', 'supply', 'va', 'kn', 'movie', 'scot', 'bike', 'sport', 'aw', 'bn', 'tt', 'pg', 'codes', 'cars', 'istanbul', 'mv', 'clothing', 'ni', 'bank', 'bm', 'et', 'vlaanderen', 'cymru', 'tatar', 'cleaning', 'bj', 'sz', 'care', 'garden', 'jobs', 'ngo', 'mc', 'post', 'cern', 'corsica', 'bb', 'reviews', 'om', 'nagoya', 'pf', 'kiwi', 'radio', 'ss', 'tips', 'vi', 'google', 'camp', 'delivery', 'sm', 'yoga', 'theater', 'flights', 'town', 'rentals', 'youtube', 'earth', 'ck', 'menu', 'community', 'gives', 'holiday', 'bi', 'beer', 'taipei', 'crs', 'furniture', 'mo', 'citic', 'gallery', 'sharp', 'faith', 'foundation', 'tattoo', 'tirol', 'lgbt', 'nrw', 'fashion', 'vegas', 'wf', 'training', 'fj', 'diamonds', 'golf', 'mp', 'aq', 'ye', 'gold', 'neustar', 'fk', 'basketball', 'mortgage', 'barcelona', 'bs', 'ski', 'kitchen', 'associates', 'guitars', 'mma', 'car', 'computer', 'show', 'schule', 'toys', 'nc', 'weber', 'mq', 'shoes', 'ntt', 'madrid', 'film', 'ne',
    # Common abusive TLDs traditionally known (adding for safety)
    'top', 'xyz', 'gq', 'tk', 'ml', 'ga', 'cf', 'cn', 'rest', 'zip', 'fun', 'online', 'site'
]

def download_tranco():
    print(f"Downloading Tranco list from {TRANCO_URL}...")
    try:
        r = requests.get(TRANCO_URL, stream=True)
        r.raise_for_status()
        z = zipfile.ZipFile(io.BytesIO(r.content))
        # Usually contains one csv file like 'top-1m.csv'
        csv_filename = z.namelist()[0]
        print(f"Extracting {csv_filename}...")
        
        # Read the CSV content directly
        with z.open(csv_filename) as f:
            content = f.read().decode('utf-8')
            
        return content.splitlines()
    except Exception as e:
        print(f"Error downloading Tranco: {e}")
        return []

def process_data(lines):
    print(f"Processing {len(lines)} domains...")
    
    tld_counts = Counter()
    unigram_counts = Counter()
    bigram_counts = Counter()
    trigram_counts = Counter()
    total_chars = 0
    total_bigrams = 0
    total_trigrams = 0
    
    # Process top 50,000 for N-grams (sufficient for model, faster)
    # Process ALL for TLDs
    
    for i, line in enumerate(lines):
        parts = line.strip().split(',')
        if len(parts) < 2: continue
        
        rank = parts[0]
        domain = parts[1].lower()
        
        # 1. TLD Stats
        if '.' in domain:
            tld = domain.split('.')[-1]
            tld_counts[tld] += 1
            
        # 2. N-gram Stats (Top 50k only to keep file size small but representative)
        if i < 70000:
            # Clean domain (remove TLD for n-gram logic to focus on name?) 
            # Actually, standard practice is to score the whole string or just the domain part.
            # Let's score the domain part (excluding TLD) if possible, or usually just the string.
            # Let's stick to the domain string provided.
            
            # Update counts
            total_chars += len(domain)
            unigram_counts.update(domain)
            
            if len(domain) >= 2:
                total_bigrams += len(domain) - 1
                bigrams = [domain[j:j+2] for j in range(len(domain)-1)]
                bigram_counts.update(bigrams)
                
            if len(domain) >= 3:
                total_trigrams += len(domain) - 2
                trigrams = [domain[j:j+3] for j in range(len(domain)-2)]
                trigram_counts.update(trigrams)
                
        if i % 100000 == 0:
            print(f"  Processed {i} lines...")

    # Calculate Probabilities
    print("Calculating probabilities...")
    
    # TLD Data
    tld_data = {
        "whitelist_counts": dict(tld_counts),
        "blacklist": list(set(SPAMHAUS_BLACKLIST)), # Dedup
        "total_whitelist_domains": len(lines)
    }
    
    # N-gram Data (Normalize to probabilities)
    ngram_data = {
        "unigrams": {k: v/total_chars for k,v in unigram_counts.items()},
        "bigrams": {k: v/total_bigrams for k,v in bigram_counts.items()},
        "trigrams": {k: v/total_trigrams for k,v in trigram_counts.items()},
        "min_prob": 1e-7 # Floor probability
    }
    
    return tld_data, ngram_data

def save_json(data, filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w') as f:
        json.dump(data, f) # No indent to save space, or indent=2 for readability
    print(f"Saved {filepath}")

def main():
    lines = download_tranco()
    if not lines:
        print("Failed to get data.")
        return
        
    tld_data, ngram_data = process_data(lines)
    
    save_json(tld_data, TLD_FILE)
    save_json(ngram_data, NGRAM_FILE)
    print("Done!")

if __name__ == "__main__":
    main()
