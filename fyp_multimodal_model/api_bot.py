import requests
import json
import time

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

API_ENDPOINT = "http://localhost:5001/api/scan"
OUTPUT_FILE = "batch_scan_results.json"

results = {}

print("Starting batch scan via API...")
for i, url in enumerate(URLS):
    print(f"[{i+1}/{len(URLS)}] Scanning {url}...", end=" ", flush=True)
    try:
        response = requests.post(API_ENDPOINT, json={"url": url}, timeout=60)
        if response.status_code == 200:
            data = response.json()
            results[url] = data
            prediction = data.get("prediction", "UNKNOWN")
            fusion_prob = data.get("fusion_probability_phishing", 0)
            modality_used = sum(data.get("modality_available", {}).values())
            print(f"Result: {prediction} (Prob: {fusion_prob:.2%}, Modals: {modality_used}/3)")
        else:
            print(f"Failed with status {response.status_code}")
            results[url] = {"error": f"Status {response.status_code}", "details": response.text}
    except Exception as e:
        print(f"Exception: {e}")
        results[url] = {"error": str(e)}
        
    # Write progressively so data isn't lost if interrupted
    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=4)
        
    time.sleep(0.5)

print(f"\nDone! Results saved to {OUTPUT_FILE}")
