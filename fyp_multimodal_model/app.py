
import os
import sys
import json
from flask import Flask, render_template, request, jsonify, send_from_directory
from inference_complete import predict_complete_pipeline
import torch
from dotenv import load_dotenv

load_dotenv()

# Force UTF-8 output to prevent Windows console crashes when printing emojis or unicode characters
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')


# ─── STARTUP CHECKS ──────────────────────────────────────────────────────────
# Q8: Fail fast if critical environment variables are missing.
# A 'silent failure' during the FYP demo (where LLM explanation is absent)
# is unacceptable — exit with a clear message instead.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
if not GEMINI_API_KEY:
    print(
        "\n[CRITICAL] ❌  GEMINI_API_KEY is not set in .env\n"
        "            The XAI / explanation module will NOT work.\n"
        "            Add GEMINI_API_KEY=<your-key> to fyp_multimodal_model/.env\n"
        "            and restart the server.\n",
        file=sys.stderr,
    )
    # In FYP demo mode we exit to prevent a confusing presentation failure.
    # Remove the next line if you want the server to start anyway with rule-based fallback.
    sys.exit(1)
# ─────────────────────────────────────────────────────────────────────────────

app = Flask(__name__)

# Configuration
MODELS_DIR = "models"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Ensure temp directory for screenshots exists and is accessible
TEMP_SCREENSHOT_DIR = os.path.join(os.environ.get('TEMP', '/tmp'), 'phishing_detection_screenshots')
os.makedirs(TEMP_SCREENSHOT_DIR, exist_ok=True)

import time

def cleanup_old_screenshots(temp_dir, max_age_seconds=600): # 10 minutes
    """Delete screenshots older than max_age_seconds to prevent disk bloat."""
    now = time.time()
    if not os.path.exists(temp_dir): return
    for filename in os.listdir(temp_dir):
        file_path = os.path.join(temp_dir, filename)
        if os.path.isfile(file_path):
            if os.stat(file_path).st_mtime < now - max_age_seconds:
                try:
                    os.remove(file_path)
                    print(f"[CLEANUP] Deleted old screenshot: {filename}")
                except Exception as e:
                    print(f"[CLEANUP] Warning: Could not delete {filename}: {e}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/scan', methods=['POST'])
def scan_url():
    # cleanup_old_screenshots(TEMP_SCREENSHOT_DIR) # User requested to not remove screenshots at all

    data = request.json
    url = data.get('url')
    
    if not url:
        return jsonify({"error": "URL is required"}), 400
    
    try:
        # Run the inference pipeline
        # We use a slightly longer timeout for the web UI to ensure accuracy
        result = predict_complete_pipeline(
            url=url,
            models_dir=MODELS_DIR,
            fetch_timeout=25,
            device=DEVICE
        )
        
        # Process screenshot path for frontend serving
        if result.get('page_info', {}).get('screenshot_path'):
            # We'll serve this via a special route
            full_path = result['page_info']['screenshot_path']
            filename = os.path.basename(full_path)
            result['page_info']['screenshot_url'] = f"/screenshots/{filename}"
            
        return jsonify(result)
        
    except Exception as e:
        print(f"Error processing URL: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/screenshots/<path:filename>')
def serve_screenshot(filename):
    return send_from_directory(TEMP_SCREENSHOT_DIR, filename)

if __name__ == '__main__':
    print(f"Starting Phishing Detection Web UI on http://localhost:5001")
    print(f"Using device: {DEVICE}")
    app.run(debug=True, host='0.0.0.0', port=5001)
