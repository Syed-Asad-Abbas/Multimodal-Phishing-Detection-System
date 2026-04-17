"""
Safe Webpage Fetcher with Selenium
Fetches webpages in headless incognito mode for DOM and screenshot extraction
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException, NoSuchElementException
import undetected_chromedriver as uc
from selenium_stealth import stealth
from bs4 import BeautifulSoup
import time
import random
import os
import tempfile
from PIL import Image


class SafeWebpageFetcher:
    """
    Fetches webpages safely in headless incognito Chrome
    Extracts HTML DOM and captures screenshots
    """
    
    def __init__(self, timeout=20, headless=True):
        """
        Initialize the fetcher
        
        Args:
            timeout: Page load timeout in seconds
            headless: Run Chrome in headless mode
        """
        self.timeout = timeout
        self.headless = headless
        self.driver = None
    
    def _create_driver(self):
        """Create a new Chrome driver with safe settings"""
        options = webdriver.ChromeOptions()
        
        # Incognito mode (private browsing)
        options.add_argument('--incognito')
        
        # Security settings
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        
        # Block popups and notifications
        options.add_argument('--disable-notifications')
        options.add_argument('--disable-popup-blocking')
        
        # Set window size for consistent screenshots
        options.add_argument('--window-size=1920,1080')
        
        if self.headless:
            options.add_argument('--headless=new')
            
        try:
            # Use undetected_chromedriver to bypass Cloudflare/Akamai bot detection.
            # Standard webdriver.Chrome() would be fingerprinted and blocked by WAFs
            # when scanning real phishing sites during the FYP demo.
            driver = uc.Chrome(options=options)
            
            # Apply selenium-stealth on top for additional browser fingerprint masking
            stealth(driver,
                languages=["en-US", "en"],
                vendor="Google Inc.",
                platform="Win32",
                webgl_vendor="Intel Inc.",
                renderer="Intel Iris OpenGL Engine",
                fix_hairline=True,
            )
            
            driver.set_page_load_timeout(self.timeout)
            return driver
        except Exception as e:
            raise RuntimeError(f"Failed to create Chrome driver: {e}\nMake sure Chrome is installed.")

    
    def _is_cloudflare_challenge(self):
        """Check if the current page is a Cloudflare challenge"""
        try:
            page_source = self.driver.page_source.lower()
            title = self.driver.title.lower()
            
            # Common Cloudflare indicators
            cloudflare_titles = ["just a moment...", "attention required!", "security check"]
            cloudflare_texts = ["verify you are human", "checking your browser", "cloudflare"]
            
            if any(t in title for t in cloudflare_titles):
                return True
                
            if any(text in page_source for text in cloudflare_texts):
                # Double check for specific elements to reduce false positives
                if self.driver.find_elements(By.ID, "challenge-running") or \
                   self.driver.find_elements(By.ID, "cf-please-wait"):
                    return True
                    
            # Check for Cloudflare iframe
            if self.driver.find_elements(By.XPATH, "//iframe[contains(@src, 'cloudflare')]"):
                return True
                
            return False
        except Exception:
            return False

    def _click_element_safely(self, element):
        """Click an element using ActionChains with random delays to mimic human behavior"""
        try:
            action = ActionChains(self.driver)
            
            # Move to element with random offset
            action.move_to_element_with_offset(
                element, 
                random.randint(1, 5), 
                random.randint(1, 5)
            )
            action.perform()
            
            # Random short pause
            time.sleep(random.uniform(0.1, 0.3))
            
            # Click
            action.click()
            action.perform()
            return True
        except Exception as e:
            print(f"[Fetcher] Safe click failed: {e}")
            try:
                element.click() # Fallback to standard click
                return True
            except:
                return False

    def _handle_cloudflare(self, retries=1):
        """Attempt to handle Cloudflare challenge with retries"""
        
        for attempt in range(retries + 1):
            print(f"[Fetcher] Checking for Cloudflare challenge (Attempt {attempt+1}/{retries+1})...")
            
            if not self._is_cloudflare_challenge():
                return

            print("[Fetcher] Cloudflare challenge detected! Waiting...")
            
            # 1. Wait for potential auto-redirect (often happens after 5s)
            try:
                WebDriverWait(self.driver, 10).until_not(
                    lambda d: self._is_cloudflare_challenge()
                )
                print("[Fetcher] Cloudflare challenge passed (auto-redirect).")
                return
            except TimeoutException:
                pass
                
            # 2. Try to interact with the checkbox
            print("[Fetcher] Attempting to interact with Cloudflare challenge...")
            
            # Look for iframes first
            iframes = self.driver.find_elements(By.TAG_NAME, "iframe")
            checkbox_found = False
            
            for iframe in iframes:
                try:
                    self.driver.switch_to.frame(iframe)
                    
                    # Try standard checkbox
                    checkbox = self.driver.find_elements(By.XPATH, "//input[@type='checkbox']")
                    if checkbox:
                        print("[Fetcher] Found checkbox in iframe.")
                        self._click_element_safely(checkbox[0])
                        checkbox_found = True
                        time.sleep(2)
                    
                    # Try Shadow DOM (Cloudflare often uses this now)
                    if not checkbox_found:
                        try:
                            # Generic shadow host search
                            shadow_hosts = self.driver.find_elements(By.CSS_SELECTOR, ".ctp-checkbox-container, #challenge-stage")
                            for host in shadow_hosts:
                                shadow_root = self.driver.execute_script('return arguments[0].shadowRoot', host)
                                if shadow_root:
                                    cb = shadow_root.find_element(By.CSS_SELECTOR, "input[type='checkbox']")
                                    if cb:
                                        print("[Fetcher] Found checkbox in Shadow DOM.")
                                        self._click_element_safely(cb)
                                        checkbox_found = True
                                        break
                        except:
                            pass

                    self.driver.switch_to.default_content()
                    if checkbox_found:
                        break
                except:
                    self.driver.switch_to.default_content()
            
            # If no iframe checkbox, look in main content
            if not checkbox_found:
                try:
                    # Look for the "Verify you are human" text container which is sometimes clickable
                    verify_text = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Verify you are human')]")
                    if verify_text:
                        print("[Fetcher] Clicking 'Verify you are human' text area.")
                        self._click_element_safely(verify_text[0])
                except:
                    pass

            # Wait again to see if it cleared
            try:
                WebDriverWait(self.driver, 10).until_not(
                    lambda d: self._is_cloudflare_challenge()
                )
                print("[Fetcher] Cloudflare challenge passed after interaction.")
                return
            except TimeoutException:
                pass
            
            # If failed and we have retries left, refresh and try again
            if attempt < retries:
                print("[Fetcher] Cloudflare challenge persisted. Refreshing page...")
                self.driver.refresh()
                time.sleep(5)
        
        print("[Fetcher] Warning: Failed to clear Cloudflare challenge after retries.")

    def fetch_page(self, url):
        """
        Fetch a webpage and extract HTML + screenshot
        
        Args:
            url: URL to fetch
            
        Returns:
            dict with:
                - success: bool
                - html: HTML content (if success)
                - screenshot_path: path to screenshot (if success)
                - error: error message (if failed)
        """
        try:
            # Create driver
            self.driver = self._create_driver()
            
            print(f"[Fetcher] Loading: {url}")
            
            # Navigate to URL
            self.driver.get(url)
            
            # Handle Cloudflare
            self._handle_cloudflare(retries=1)
            
            # Wait for page to load (basic wait for body)
            try:
                WebDriverWait(self.driver, self.timeout).until(
                    EC.presence_of_element_located((By.TAG_NAME, "body"))
                )
            except TimeoutException:
                print(f"[Fetcher] Warning: Page load timeout, using partial content")
            
            # Small additional wait for dynamic content
            time.sleep(3)
            
            # Get HTML
            html = self.driver.page_source
            
            # Capture screenshot
            screenshot_path = self._capture_screenshot()
            
            result = {
                "success": True,
                "url": url,
                "html": html,
                "screenshot_path": screenshot_path,
                "page_title": self.driver.title,
                "final_url": self.driver.current_url  # In case of redirects
            }
            
            print(f"[Fetcher] [OK] Successfully fetched page")
            print(f"[Fetcher]   Title: {result['page_title'][:50]}...")
            print(f"[Fetcher]   HTML size: {len(html)} bytes")
            print(f"[Fetcher]   Screenshot: {screenshot_path}")
            
            return result
            
        except TimeoutException:
            return {
                "success": False,
                "url": url,
                "error": "Page load timeout"
            }
        except WebDriverException as e:
            return {
                "success": False,
                "url": url,
                "error": f"WebDriver error: {str(e)}"
            }
        except Exception as e:
            return {
                "success": False,
                "url": url,
                "error": f"Unexpected error: {str(e)}"
            }
        finally:
            # Always close driver securely
            if getattr(self, 'driver', None):
                try:
                    self.driver.quit()
                except Exception as cleanup_err:
                    print(f"[Fetcher] Warning: Error during strict driver cleanup: {cleanup_err}")
                finally:
                    self.driver = None
    
    def _capture_screenshot(self):
        """
        Capture screenshot of current page
        
        Returns:
            Path to saved screenshot
        """
        # Create temp directory for screenshots
        temp_dir = tempfile.gettempdir()
        screenshot_dir = os.path.join(temp_dir, 'phishing_detection_screenshots')
        os.makedirs(screenshot_dir, exist_ok=True)
        
        # Generate filename
        timestamp = int(time.time() * 1000)
        filename = f"screenshot_{timestamp}.png"
        filepath = os.path.join(screenshot_dir, filename)
        
        # Capture screenshot
        self.driver.save_screenshot(filepath)
        
        return filepath
    
    def extract_dom_features(self, html):
        """
        Extract DOM features from HTML for DOM modality
        
        Args:
            html: HTML content as string
            
        Returns:
            dict with DOM features
        """
        soup = BeautifulSoup(html, 'html.parser')
        
        features = {}
        
        # Form-related features
        forms = soup.find_all('form')
        features['HasForm'] = 1 if len(forms) > 0 else 0
        features['NoOfForm'] = len(forms)
        
        # Check for password fields
        password_inputs = soup.find_all('input', {'type': 'password'})
        features['HasPasswordField'] = 1 if len(password_inputs) > 0 else 0
        
        # Hidden inputs (often used in phishing)
        hidden_inputs = soup.find_all('input', {'type': 'hidden'})
        features['NoOfHiddenInputs'] = len(hidden_inputs)
        
        # Images
        images = soup.find_all('img')
        features['NoOfImage'] = len(images)
        
        # External images (check if src is external)
        external_images = 0
        for img in images:
            src = img.get('src', '')
            if src.startswith('http://') or src.startswith('https://'):
                external_images += 1
        features['NoOfExternalImage'] = external_images
        
        # JavaScript
        scripts = soup.find_all('script')
        features['NoOfJS'] = len(scripts)
        
        # External scripts
        external_scripts = 0
        for script in scripts:
            src = script.get('src', '')
            if src.startswith('http://') or src.startswith('https://'):
                external_scripts += 1
        features['NoOfExternalJS'] = external_scripts
        
        # Links
        links = soup.find_all('a')
        features['NoOfLinks'] = len(links)
        
        # External links
        external_links = 0
        for link in links:
            href = link.get('href', '')
            if href.startswith('http://') or href.startswith('https://'):
                external_links += 1
        features['NoOfExternalLinks'] = external_links
        
        # iframes (often used in phishing)
        iframes = soup.find_all('iframe')
        features['HasIframe'] = 1 if len(iframes) > 0 else 0
        features['NoOfIframe'] = len(iframes)
        
        # Check for suspicious form actions
        suspicious_form_action = 0
        for form in forms:
            action = form.get('action', '')
            # Check if form action posts to different domain
            if action.startswith('http://') or action.startswith('https://'):
                suspicious_form_action = 1
                break
        features['SuspiciousFormAction'] = suspicious_form_action
        
        # Keyword cues (Bank, Pay, Crypto) - matching training data columns
        text_content = soup.get_text().lower()
        features['Bank'] = 1 if 'bank' in text_content else 0
        features['Pay'] = 1 if 'pay' in text_content else 0
        features['Crypto'] = 1 if 'crypto' in text_content else 0
        
        return features


def test_fetcher():
    """Test the webpage fetcher"""
    fetcher = SafeWebpageFetcher(timeout=20, headless=True)
    
    # Test URLs
    test_urls = [
        "https://www.google.com",
        "https://www.github.com",
        "https://nowsecure.nl", # Cloudflare test site
    ]
    
    for url in test_urls:
        print("\n" + "="*70)
        result = fetcher.fetch_page(url)
        
        if result['success']:
            print(f"[OK] Success: {url}")
            print(f"  Title: {result['page_title']}")
            print(f"  Final URL: {result['final_url']}")
            print(f"  Screenshot: {result['screenshot_path']}")
            
            # Extract DOM features
            dom_features = fetcher.extract_dom_features(result['html'])
            print(f"  DOM Features: {dom_features}")
        else:
            print(f"[FAIL] Failed: {url}")
            print(f"  Error: {result['error']}")


if __name__ == "__main__":
    test_fetcher()
