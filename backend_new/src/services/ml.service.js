const axios = require('axios');
const logger = require('../config/logger');

const ML_API_URL = process.env.ML_API_BASE_URL || 'http://localhost:5001';

const predictUrl = async (url) => {
    try {
        // Making request to ML Backend
        // Endpoint is /api/scan
        const response = await axios.post(`${ML_API_URL}/api/scan`, { url });

        // Map Python response format to Node controller expectations
        const mlData = response.data;

        return {
            ...mlData,
            // Map screenshot path to full URL if available
            screenshot: mlData.page_info?.screenshot_url
                ? `${ML_API_URL}${mlData.page_info.screenshot_url}`
                : null,
            // Ensure ip_metadata is null if missing
            ip_metadata: mlData.ip_metadata || null
        };
    } catch (error) {
        // Bug #4 fix: log at ERROR level so a misconfigured production deployment
        // is immediately visible in logs rather than silently degrading.
        logger.error(`[ML Service] Request failed: ${error.message}`);

        if (error.code === 'ECONNREFUSED') {
            logger.error(
                '[ML Service] CRITICAL: Python ML service is unreachable (ECONNREFUSED). ' +
                'Returning SERVICE_UNAVAILABLE sentinel — scan will be rejected with HTTP 503.'
            );
            return getMockSentinel();
        }
        throw error;
    }
};

// Bug #4 fix: Never return a Benign/Phishing verdict when the ML service is down.
// A bypass exists in the original code: any URL without the word 'phish' would
// always receive a 'Benign' verdict, even against a completely fake result.
//
// Bug #5 fix: All field names and value ranges now exactly match the real Python
// ML response so scan.controller.js never writes undefined/null to the DB:
//   - confidence         → float 0.0–1.0  (was: confidence_score)
//   - fusion_probability_phishing → float 0.0–1.0 (was: phishing_probability 0–100)
//   - _is_mock: true     → sentinel flag for the controller to detect and reject
const getMockSentinel = () => {
    return {
        // --- Core result fields (match real Python ML field names exactly) ---
        prediction: 'UNCERTAIN',
        confidence: 0.0,                          // real field: confidence (float 0-1)
        fusion_probability_phishing: 0.0,         // real field: fusion_probability_phishing (float 0-1)
        safety_net_triggered: false,

        // --- Modality fields ---
        modality_scores:     { url: null, dom: null, visual: null },
        modality_verdicts:   { url: 'N/A', dom: 'N/A', visual: 'N/A' },
        modality_confidence: { url: null, dom: null, visual: null },
        modality_available:  { url: false, dom: false, visual: false },

        // --- Explainability ---
        shap_values: {},
        explanation: 'ML service is currently unavailable. This scan result is not reliable.',

        // --- Page / screenshot ---
        page_info: { fetch_success: false, screenshot_path: null },
        screenshot: null,

        // --- IP / Geo ---
        ip_metadata: null,

        // --- Sentinel flag: controller must detect this and return HTTP 503 ---
        _is_mock: true,
    };
};

module.exports = { predictUrl };

