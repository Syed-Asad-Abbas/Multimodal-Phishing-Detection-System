# ML Service API Contract

This document details the API exposed by the Flask-based Multimodal Phishing Detection Service.

## Base URL
`http://localhost:5001`

---

## Endpoints

### 1. Scan URL
Initiates a full multimodal analysis of a URL.

- **Path:** `/api/scan`
- **Method:** `POST`
- **Authentication:** None (Public)

#### Request Body
**Content-Type:** `application/json`

```json
{
  "url": "https://example.com/login"
}
```

#### Success Response (200 OK)
**Content-Type:** `application/json`

```json
{
  "url": "https://example.com/login",
  "prediction": "PHISHING",
  "confidence": 0.985,
  "fusion_probability_phishing": 0.985,
  
  "modality_scores": {
    "url": 0.99,
    "dom": 0.85,
    "visual": 0.92
  },
  
  "modality_verdicts": {
    "url": "PHISHING",
    "dom": "PHISHING", 
    "visual": "PHISHING"
  },
  
  "modality_confidence": {
    "url": 0.99,
    "dom": 0.85,
    "visual": 0.92
  },
  
  "modality_available": {
    "url": true,
    "dom": true,
    "visual": true
  },
  
  "page_info": {
    "fetch_success": true,
    "page_title": "Example Login Page",
    "final_url": "https://example.com/login",
    "screenshot_path": "C:\\Temp\\phishing_detection_screenshots\\screenshot_123.png",
    "screenshot_url": "/screenshots/screenshot_123.png"
  },
  
  "dom_features": {
    "HasForm": 1,
    "HasPasswordField": 1,
    "NoOfImage": 5
    // ... potentially other features
  },

  "ip_metadata": {
    "ip": "192.0.2.1",
    "geo": {
      "country": "United States",
      "lat": 37.7749,
      "long": -122.4194
    }
  },
  
  "explanation": "The URL is flagged as phishing due to suspicious patterns in the domain structure (length > 70 chars) and the presence of a login form on a non-HTTPS page.",
  
  "shap_values": {
    "url": {
      "len_url": 0.5,
      "path_depth": 0.2
    },
    "fusion_contribution": {
      "url_score": 0.4,
      "dom_score": 0.3,
      "visual_score": 0.3
    }
  }
}
```

#### Error Response (400 Bad Request)
Returned if the URL is missing or invalid.

```json
{
  "error": "URL is required"
}
```

#### Error Response (500 Internal Server Error)
Returned if the inference pipeline crashes.

```json
{
  "error": "Detailed error message..."
}
```

---

### 2. Get Screenshot
Serves the captured screenshot of the analyzed page.

- **Path:** `/screenshots/<filename>`
- **Method:** `GET`
- **Example:** 