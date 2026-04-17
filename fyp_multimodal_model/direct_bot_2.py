import os
import sys
import json

sys.path.append(os.path.abspath(r'c:\Users\PMYLS\Desktop\Multimodal-Phishing-Detection-System-main\fyp_multimodal_model'))
from inference_complete import predict_complete_pipeline

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

URLS = [
    "https://www.olx.com.pk",
    "https://www.pakwheels.com",
    "https://www.zameen.com",
    "https://www.siasat.pk",
    "https://defence.pk",
    "https://propakistani.pk",
    "https://techjuice.pk",
    "https://phoneworld.com.pk"
]

MODELS_DIR = "models"
OUTPUT_FILE = "pakistan_websites_results_olx_onward.json"
import torch
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

results = {}

print("Starting direct ML pipeline for remaining websites...")
for i, url in enumerate(URLS):
    print(f"[{i+1}/{len(URLS)}] Directly scanning {url}...")
    try:
        data = predict_complete_pipeline(
            url=url,
            models_dir=MODELS_DIR,
            fetch_timeout=25, 
            device=DEVICE
        )
        if 'explanation' in data:
            del data['explanation']
            
        results[url] = data
        prediction = data.get("prediction", "UNKNOWN")
        fusion_prob = data.get("fusion_probability_phishing", 0)
        modals = sum(data.get("modality_available", {}).values())
        print(f"   -> Result: {prediction} (Prob: {fusion_prob:.2%}, Modals: {modals}/3)")
        
    except Exception as e:
        print(f"   -> Exception: {e}")
        results[url] = {"error": str(e)}
        
    with open(OUTPUT_FILE, "w", encoding='utf-8') as f:
        json.dump(results, f, indent=4)
        
print(f"Done! Results written to {OUTPUT_FILE}")
