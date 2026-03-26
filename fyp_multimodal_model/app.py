
import os
import json
from flask import Flask, render_template, request, jsonify, send_from_directory
from inference_complete import predict_complete_pipeline
import torch
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Configuration
MODELS_DIR = "models"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Ensure temp directory for screenshots exists and is accessible
TEMP_SCREENSHOT_DIR = os.path.join(os.environ.get('TEMP', '/tmp'), 'phishing_detection_screenshots')
os.makedirs(TEMP_SCREENSHOT_DIR, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/scan', methods=['POST'])
def scan_url():
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
