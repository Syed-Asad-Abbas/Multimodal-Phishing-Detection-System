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
            // Ensure ip_metadata is null if missing (Python currently doesn't return it)
            ip_metadata: mlData.ip_metadata || null
        };
    } catch (error) {
        logger.error(`ML Service Error: ${error.message}`);
        // If ML service is down, maybe return a mock for now or throw error?
        // While developing Node without running Python, throwing is annoying.
        // I will return a Mock Response if connection refused, marked clearly.
        if (error.code === 'ECONNREFUSED') {
            logger.warn('ML Service unreachable. Returning MOCK data.');
            return getMockPrediction(url);
        }
        throw error;
    }
};

const getMockPrediction = (url) => {
    const isPhish = url.includes('phish');
    return {
        prediction: isPhish ? 'Phishing' : 'Benign',
        confidence_score: 0.95,
        phishing_probability: isPhish ? 95.0 : 5.0,
        shap_values: {
            url: { 'len_url': 0.5, 'has_https': -0.2 },
            dom: { 'iframe_count': 0.1 },
            visual: { 'logo_match': 0 }
        },
        explanation: "This is a mock LLM explanation. The URL looks suspicious due to length.",
        screenshot: "https://via.placeholder.com/800x600?text=Screenshot+Mock",
        ip_metadata: isPhish ? {
            ip: "192.168.1.1",
            geo: { lat: 33.6, long: 73.0, country: "Pakistan" } // Example
        } : null
    };
};

module.exports = { predictUrl };
