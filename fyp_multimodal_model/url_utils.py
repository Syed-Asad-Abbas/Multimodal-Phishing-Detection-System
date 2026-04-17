"""
URL Utilities
Helper functions for URL handling and validation
"""

import requests
import urllib3
import socket
import ssl
from urllib.parse import urlparse

# Suppress insecure request warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def is_url_alive(url, timeout=5):
    """
    Check if a URL is reachable (alive).
    
    Args:
        url: URL to check
        timeout: Request timeout in seconds
        
    Returns:
        bool: True if reachable, False if dead (DNS error, timeout, 404)
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    try:
        # Try HEAD request first (faster)
        response = requests.head(
            url, 
            headers=headers, 
            timeout=timeout, 
            verify=False,
            allow_redirects=True
        )
        
        # 404 is definitely dead
        if response.status_code == 404:
            return False
            
        # 405 Method Not Allowed -> Try GET
        if response.status_code == 405:
            response = requests.get(
                url, 
                headers=headers, 
                timeout=timeout, 
                verify=False,
                stream=True # Don't download content
            )
            response.close()
            if response.status_code == 404:
                return False
                
        return True
        
    except (requests.ConnectionError, requests.Timeout):
        return False
    except Exception as e:
        # For other exceptions (e.g. invalid URL schema), assume dead or invalid
        print(f"[URL Check] Error checking {url}: {e}")
        return False

def get_ssl_trust_score(url, timeout=3):
    """
    Check if the domain has a valid SSL certificate.
    Returns True if valid (supports Case 3 feature weight adjustment).
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme != 'https':
            return False
            
        domain = parsed.netloc.split(':')[0]
        context = ssl.create_default_context()
        
        with socket.create_connection((domain, 443), timeout=timeout) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                # If we get here without an SSLError, the cert is valid 
                # (not expired, matches hostname, issued by trusted CA)
                return True
    except Exception as e:
        print(f"[SSL Check] Warning for {url}: {e}")
        return False
