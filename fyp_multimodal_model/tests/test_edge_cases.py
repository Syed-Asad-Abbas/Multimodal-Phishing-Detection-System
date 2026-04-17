import sys
import os
import unittest

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from url_feature_extractor import extract_url_features_dict, extract_url_features_from_string
from url_utils import get_ssl_trust_score

class TestEdgeCases(unittest.TestCase):
    def test_case_1_identity_paradox(self):
        """Test that KNOWN_LEGIT_DOMAINS neutralizes URLSimilarityIndex"""
        features = extract_url_features_dict("https://mail.google.com/")
        self.assertEqual(features["URLSimilarityIndex"], 0.0, "Identity paradox fix failed for mail.google.com")

        typo_features = extract_url_features_dict("https://mail.g00gle.com/")
        self.assertGreater(typo_features["URLSimilarityIndex"], 0.0, "Similarity index was incorrectly neutralized for typosquat")

    def test_case_2_institutional_subdomains(self):
        """Test that institutional TLDs max out trust and zero subdomains"""
        features = extract_url_features_dict("https://cms.bahria.edu.pk/")
        self.assertEqual(features["NoOfSubDomain"], 0, "Institutional subdomains should be set to 0")
        self.assertEqual(features["TLDLegitimateProb"], 0.52, "Institutional TLD should get max legitimate prob")

        normal_features = extract_url_features_dict("https://update.secure.login.paypal.com")
        self.assertGreater(normal_features["NoOfSubDomain"], 0, "Normal subdomains were incorrectly set to 0")

    def test_case_3_ssl_path_adjustments(self):
        """Test that SSL trust reduces path lengths and updates char probability"""
        features_no_ssl = extract_url_features_dict("https://app.optichronix.com/admin/admin_login")
        
        feature_names = [
            "URLLength", "DomainLength", "IsDomainIP", "URLSimilarityIndex", 
            "CharContinuationRate", "TLDLegitimateProb", "URLCharProb", "TLDLength",
            "NoOfSubDomain", "HasObfuscation", "NoOfObfuscatedChar", "ObfuscationRatio"
        ]
        values_ssl = extract_url_features_from_string("https://app.optichronix.com/admin/admin_login", feature_names, ssl_trust=True)
        features_ssl = dict(zip(feature_names, values_ssl))

        self.assertEqual(features_ssl["URLLength"], features_no_ssl["URLLength"] * 0.5, "URLLength not halved on valid SSL")
        self.assertEqual(features_ssl["URLCharProb"], 0.01, "URLCharProb not set to trust level on valid SSL")

    def test_get_ssl_trust_score(self):
        """Test SSL fetching logic"""
        self.assertTrue(get_ssl_trust_score("https://google.com"))
        self.assertFalse(get_ssl_trust_score("http://example.com"))

if __name__ == '__main__':
    unittest.main()
