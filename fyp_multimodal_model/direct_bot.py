import os
import sys
import json
import time

sys.path.append(os.path.abspath(r'c:\Users\PMYLS\Desktop\Multimodal-Phishing-Detection-System-main\fyp_multimodal_model'))
from inference_complete import predict_complete_pipeline

# Force UTF-8 stdout
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

URLS = [
    "https://www.dawn.com",
    "https://tribune.com.pk",
    "https://www.thenews.com.pk",
    "https://www.jang.com.pk",
    "https://www.bolnews.com",
    "https://www.aaj.tv",
    "https://www.pakistantoday.com.pk",
    "https://www.nation.com.pk",
    "https://www.dailytimes.com.pk",
    "https://www.urdupoint.com",
    "https://www.daraz.pk",
    "https://www.telemart.pk",
    "https://www.shophive.com",
    "https://www.goto.com.pk",
    "https://www.priceoye.pk",
    "https://www.symbios.pk",
    "https://www.homeappliances.pk",
    "https://www.ishopping.pk",
    "https://www.mega.pk",
    "https://www.homeshopping.pk",
    "https://www.pakistan.gov.pk",
    "https://www.nadra.gov.pk",
    "https://www.fbr.gov.pk",
    "https://www.punjab.gov.pk",
    "https://www.sbp.org.pk",
    "https://www.hec.gov.pk",
    "https://www.mofa.gov.pk",
    "https://www.pmd.gov.pk",
    "https://www.kp.gov.pk",
    "https://www.gop.pk",
    "https://www.pu.edu.pk",
    "https://www.nust.edu.pk",
    "https://www.aiou.edu.pk",
    "https://www.lums.edu.pk",
    "https://www.uet.edu.pk",
    "https://www.vu.edu.pk",
    "https://www.comsats.edu.pk",
    "https://www.iub.edu.pk",
    "https://www.rozee.pk",
    "https://www.mustakbil.com",
    "https://www.jobz.pk",
    "https://www.pakistanjobsbank.com",
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
OUTPUT_FILE = "pakistan_websites_results.json"
import torch
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

results = {}

print("Starting direct ML pipeline batch scan...")
for i, url in enumerate(URLS):
    print(f"[{i+1}/{len(URLS)}] Directly scanning {url}...")
    try:
        data = predict_complete_pipeline(
            url=url,
            models_dir=MODELS_DIR,
            fetch_timeout=15, 
            device=DEVICE
        )
        # Drop the verbose explanations for faster saving if preferred, or keep them.
        if 'explanation' in data:
            del data['explanation']
            
        results[url] = data
        prediction = data.get("prediction", "UNKNOWN")
        fusion_prob = data.get("fusion_probability_phishing", 0)
        print(f"   -> Result: {prediction} (Prob: {fusion_prob:.2%})")
        
    except Exception as e:
        print(f"   -> Exception: {e}")
        results[url] = {"error": str(e)}
        
    with open(OUTPUT_FILE, "w", encoding='utf-8') as f:
        json.dump(results, f, indent=4)
        
print(f"Done! Results written to {OUTPUT_FILE}")
