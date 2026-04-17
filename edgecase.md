There are a few things that I want you to write it down. Number one is going to be this: "https://mail.google.com/" . Then I used link 2, "https://cms.bahria.edu.pk/", and link 3, "https://app.optichronix.com/admin/admin_login". These are three edge cases, and all of them flagged phishing 

1 st result

{

  "confidence": 0.9989590745382828,

  "detailed_explanation": {

    "shap_fusion": {

      "modality_contributions": {

        "dom": -0.8288707955160656,

        "url": 6.0329857103615305,

        "visual": -3.796529063349041e-14

      },

      "modality_weights": {

        "dom": 0.12079395638863664,

        "url": 0.8792060436113578,

        "visual": 5.53280159691049e-15

      }

    },

    "shap_url_top": [

      {

        "abs_impact": 8.597727213882282,

        "feature": "URLSimilarityIndex",

        "shap_impact": 8.597727213882282,

        "value": 100

      },

      {

        "abs_impact": 2.2001165239820275,

        "feature": "DomainLength",

        "shap_impact": -2.2001165239820275,

        "value": 15

      },

      {

        "abs_impact": 1.6627317427190555,

        "feature": "URLLength",

        "shap_impact": -1.6627317427190555,

        "value": 23

      },

      {

        "abs_impact": 1.4200549662262236,

        "feature": "URLCharProb",

        "shap_impact": 1.4200549662262236,

        "value": 0.01

      },

      {

        "abs_impact": 0.28645014224663695,

        "feature": "TLDLegitimateProb",

        "shap_impact": -0.28645014224663695,

        "value": 0.52

      }

    ]

  },

  "dom_features": {

    "Bank": 0,

    "Crypto": 0,

    "HasForm": 0,

    "HasIframe": 1,

    "HasPasswordField": 1,

    "NoOfExternalImage": 0,

    "NoOfExternalJS": 1,

    "NoOfExternalLinks": 4,

    "NoOfForm": 0,

    "NoOfHiddenInputs": 5,

    "NoOfIframe": 2,

    "NoOfImage": 1,

    "NoOfJS": 23,

    "NoOfLinks": 4,

    "Pay": 0,

    "SuspiciousFormAction": 0

  },

  "explanation": "Verdict: Unsafe. The URL's Urlsimilarityindex appears suspicious. The URL analysis was the strongest signal (98% phishing probability). The model is highly confident (100%) in this assessment. Do not enter any personal information or credentials on this site.",

  "fusion_probability_phishing": 0.9989590745382828,

  "ip_metadata": {

    "geo": {

      "country": "United States",

      "lat": 37.4225,

      "long": -122.085

    },

    "ip": "142.250.203.5"

  },

  "modality_available": {

    "dom": true,

    "url": true,

    "visual": true

  },

  "modality_confidence": {

    "dom": 0.7052456306492839,

    "url": 0.9813161627159226,

    "visual": 0.5707210898399353

  },

  "modality_scores": {

    "dom": 0.7052456306492839,

    "url": 0.9813161627159226,

    "visual": 0.5707210898399353

  },

  "modality_verdicts": {

    "dom": "PHISHING",

    "url": "PHISHING",

    "visual": "PHISHING"

  },

  "page_info": {

    "fetch_success": true,

    "final_url": "https://accounts.google.com/v3/signin/identifier?continue=https%3A%2F%2Fmail.google.com%2Fmail%2Fu%2F0%2F&dsh=S-450894362%3A1776343259081456&emr=1&followup=https%3A%2F%2Fmail.google.com%2Fmail%2Fu%2F0%2F&osid=1&passive=1209600&service=mail&flowName=GlifWebSignIn&flowEntry=ServiceLogin&ifkv=AT1y2_Wal8z64Cy3BUcqUBC4Ho6H6RG_w4EM_0brHGizJFlsRgHuQThghoCwdYbwibMeZDRTE6VyQg",

    "page_title": "Gmail",

    "screenshot_path": "C:\\Users\\PMYLS\\AppData\\Local\\Temp\\phishing_detection_screenshots\\screenshot_1776343266758.png",

    "screenshot_url": "/screenshots/screenshot_1776343266758.png"

  },

  "prediction": "PHISHING",

  "safety_net_triggered": false,

  "shap_values": {

    "fusion_contribution": {

      "dom": 0.12079395638863664,

      "url": 0.8792060436113578,

      "visual": 5.53280159691049e-15

    },

    "url": {

      "DomainLength": -2.2001165239820275,

      "TLDLegitimateProb": -0.28645014224663695,

      "URLCharProb": 1.4200549662262236,

      "URLLength": -1.6627317427190555,

      "URLSimilarityIndex": 8.597727213882282

    }

  },

  "url": "https://mail.google.com"

}

2nd result

{

  "confidence": 0.9999819424925204,

  "detailed_explanation": {

    "shap_fusion": {

      "modality_contributions": {

        "dom": -1.0389038053641397,

        "url": 10.29834606845801,

        "visual": -3.796529063349041e-14

      },

      "modality_weights": {

        "dom": 0.0916363154139328,

        "url": 0.908363684586064,

        "visual": 3.3487213438906922e-15

      }

    },

    "shap_url_top": [

      {

        "abs_impact": 8.965186609421478,

        "feature": "URLSimilarityIndex",

        "shap_impact": 8.965186609421478,

        "value": 100

      },

      {

        "abs_impact": 1.4682868217372658,

        "feature": "URLCharProb",

        "shap_impact": 1.4682868217372658,

        "value": 0.01

      },

      {

        "abs_impact": 0.6842363957155788,

        "feature": "DomainLength",

        "shap_impact": 0.6842363957155788,

        "value": 17

      },

      {

        "abs_impact": 0.5252436266942514,

        "feature": "TLDLegitimateProb",

        "shap_impact": -0.5252436266942514,

        "value": 0.52

      },

      {

        "abs_impact": 0.20050881916058338,

        "feature": "NoOfSubDomain",

        "shap_impact": -0.20050881916058338,

        "value": 2

      }

    ]

  },

  "dom_features": {

    "Bank": 0,

    "Crypto": 0,

    "HasForm": 1,

    "HasIframe": 0,

    "HasPasswordField": 0,

    "NoOfExternalImage": 0,

    "NoOfExternalJS": 0,

    "NoOfExternalLinks": 1,

    "NoOfForm": 1,

    "NoOfHiddenInputs": 6,

    "NoOfIframe": 0,

    "NoOfImage": 0,

    "NoOfJS": 8,

    "NoOfLinks": 9,

    "Pay": 0,

    "SuspiciousFormAction": 0

  },

  "explanation": "Verdict: Unsafe. The URL's Urlsimilarityindex appears suspicious. The URL analysis was the strongest signal (100% phishing probability). The model is highly confident (100%) in this assessment. Do not enter any personal information or credentials on this site.",

  "fusion_probability_phishing": 0.9999819424925204,

  "ip_metadata": {

    "geo": {

      "country": "Pakistan",

      "lat": 33.7233,

      "long": 73.0435

    },

    "ip": "111.68.99.12"

  },

  "modality_available": {

    "dom": true,

    "url": true,

    "visual": true

  },

  "modality_confidence": {

    "dom": 0.970802133971645,

    "url": 0.9997310923918143,

    "visual": 0.6297600865364075

  },

  "modality_scores": {

    "dom": 0.029197866028355002,

    "url": 0.9997310923918143,

    "visual": 0.37023988366127014

  },

  "modality_verdicts": {

    "dom": "BENIGN",

    "url": "PHISHING",

    "visual": "BENIGN"

  },

  "page_info": {

    "fetch_success": true,

    "final_url": "https://cms.bahria.edu.pk/",

    "page_title": "CMS - Bahria University",

    "screenshot_path": "C:\\Users\\PMYLS\\AppData\\Local\\Temp\\phishing_detection_screenshots\\screenshot_1776343349019.png",

    "screenshot_url": "/screenshots/screenshot_1776343349019.png"

  },

  "prediction": "PHISHING",

  "safety_net_triggered": false,

  "shap_values": {

    "fusion_contribution": {

      "dom": 0.0916363154139328,

      "url": 0.908363684586064,

      "visual": 3.3487213438906922e-15

    },

    "url": {

      "DomainLength": 0.6842363957155788,

      "NoOfSubDomain": -0.20050881916058338,

      "TLDLegitimateProb": -0.5252436266942514,

      "URLCharProb": 1.4682868217372658,

      "URLSimilarityIndex": 8.965186609421478

    }

  },

  "url": "https://cms.bahria.edu.pk/"

}

3rd Result

{

  "confidence": 0.9999785393618412,

  "detailed_explanation": {

    "shap_fusion": {

      "modality_contributions": {

        "dom": -0.1115793843752782,

        "url": 9.198359295539765,

        "visual": -3.796529063349041e-14

      },

      "modality_weights": {

        "dom": 0.01198497521965375,

        "url": 0.9880150247803422,

        "visual": 4.077931331104826e-15

      }

    },

    "shap_url_top": [

      {

        "abs_impact": 9.80184644733725,

        "feature": "URLSimilarityIndex",

        "shap_impact": 9.80184644733725,

        "value": 100

      },

      {

        "abs_impact": 3.9218537195030243,

        "feature": "URLLength",

        "shap_impact": 3.9218537195030243,

        "value": 45

      },

      {

        "abs_impact": 1.3332000464083757,

        "feature": "URLCharProb",

        "shap_impact": 1.3332000464083757,

        "value": 0.01

      },

      {

        "abs_impact": 1.2851376098716478,

        "feature": "DomainLength",

        "shap_impact": -1.2851376098716478,

        "value": 19

      },

      {

        "abs_impact": 0.2848335390101851,

        "feature": "TLDLegitimateProb",

        "shap_impact": -0.2848335390101851,

        "value": 0.52

      }

    ]

  },

  "dom_features": {

    "Bank": 0,

    "Crypto": 0,

    "HasForm": 1,

    "HasIframe": 0,

    "HasPasswordField": 1,

    "NoOfExternalImage": 0,

    "NoOfExternalJS": 0,

    "NoOfExternalLinks": 0,

    "NoOfForm": 1,

    "NoOfHiddenInputs": 0,

    "NoOfIframe": 0,

    "NoOfImage": 1,

    "NoOfJS": 1,

    "NoOfLinks": 0,

    "Pay": 0,

    "SuspiciousFormAction": 0

  },

  "explanation": "Verdict: Unsafe. The URL's Urlsimilarityindex appears suspicious. The URL analysis was the strongest signal (100% phishing probability). The model is highly confident (100%) in this assessment. Do not enter any personal information or credentials on this site.",

  "fusion_probability_phishing": 0.9999785393618412,

  "ip_metadata": {

    "geo": {

      "country": "Sweden",

      "lat": 59.3293,

      "long": 18.0686

    },

    "ip": "13.49.149.175"

  },

  "modality_available": {

    "dom": true,

    "url": true,

    "visual": true

  },

  "modality_confidence": {

    "dom": 0.7185178544593405,

    "url": 0.9999902727533391,

    "visual": 0.9036195278167725

  },

  "modality_scores": {

    "dom": 0.28148214554065953,

    "url": 0.9999902727533391,

    "visual": 0.09638051688671112

  },

  "modality_verdicts": {

    "dom": "BENIGN",

    "url": "PHISHING",

    "visual": "BENIGN"

  },

  "page_info": {

    "fetch_success": true,

    "final_url": "https://app.optichronix.com/admin/admin_login",

    "page_title": "Rejuvify",

    "screenshot_path": "C:\\Users\\PMYLS\\AppData\\Local\\Temp\\phishing_detection_screenshots\\screenshot_1776343441889.png",

    "screenshot_url": "/screenshots/screenshot_1776343441889.png"

  },

  "prediction": "PHISHING",

  "safety_net_triggered": false,

  "shap_values": {

    "fusion_contribution": {

      "dom": 0.01198497521965375,

      "url": 0.9880150247803422,

      "visual": 4.077931331104826e-15

    },

    "url": {

      "DomainLength": -1.2851376098716478,

      "TLDLegitimateProb": -0.2848335390101851,

      "URLCharProb": 1.3332000464083757,

      "URLLength": 3.9218537195030243,

      "URLSimilarityIndex": 9.80184644733725

    }

  },

  "url": "https://app.optichronix.com/admin/admin_login"

}

