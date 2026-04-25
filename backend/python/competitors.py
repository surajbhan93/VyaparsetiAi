from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

import time
import json
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')


def scrape_google_maps(city, keyword):
    query = f"{keyword} in {city}"

    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--log-level=3")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    driver.execute_script(
        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    )

    url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
    driver.get(url)

    # Wait for feed to load
    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div[role='feed']"))
        )
    except Exception:
        driver.quit()
        return []

    # Scroll to load more results
    try:
        scrollable_div = driver.find_element(By.CSS_SELECTOR, "div[role='feed']")
        for _ in range(20):
            driver.execute_script(
                "arguments[0].scrollTop = arguments[0].scrollHeight", scrollable_div
            )
            time.sleep(1.5)
    except Exception:
        pass

    results = []
    places = driver.find_elements(By.CSS_SELECTOR, "div.Nv2PK")

    for place in places[:70]:
        try:
            driver.execute_script("arguments[0].scrollIntoView(true);", place)
            place.click()
            time.sleep(3.5)  # FIX: 2.5 -> 3.5 for panel to fully load

            data = extract_detail_panel(driver)
            if data.get("name"):
                results.append(data)

        except Exception:
            data = extract_from_list_item(place)
            if data.get("name"):
                results.append(data)

        if len(results) >= 20:
            break

    driver.quit()
    return results


def extract_review_count(driver):
    """
    Try multiple methods to extract review count from Google Maps detail panel.
    Returns review count as string (e.g. "121") or None.
    """
    review_count = None

    # METHOD 1: Loop all spans in F7nice, find one matching "(digits)" pattern
    try:
        spans = driver.find_elements(By.CSS_SELECTOR, "div.F7nice span")
        for span in spans:
            txt = span.text.strip()
            if re.search(r'\(\d[\d,]*\)', txt):
                nums = re.findall(r'\d[\d,]*', txt)
                if nums:
                    review_count = nums[0].replace(',', '')
                break
    except Exception:
        pass

    if review_count:
        return review_count

    # METHOD 2: aria-label with "review" or "rating" keyword
    try:
        aria_spans = driver.find_elements(
            By.CSS_SELECTOR, "div.F7nice span[aria-label]"
        )
        for span in aria_spans:
            label = span.get_attribute("aria-label") or ""
            if "review" in label.lower() or "rating" in label.lower():
                nums = re.findall(r'\d[\d,]*', label)
                if len(nums) >= 2:
                    review_count = nums[-1].replace(',', '')
                    break
                elif len(nums) == 1:
                    review_count = nums[0].replace(',', '')
                    break
    except Exception:
        pass

    if review_count:
        return review_count

    # METHOD 3: Broader search - any button or span containing review count text
    try:
        candidates = driver.find_elements(
            By.CSS_SELECTOR,
            "button[jsaction*='review'], span[aria-label*='review'], span[aria-label*='Review']"
        )
        for el in candidates:
            label = el.get_attribute("aria-label") or el.text or ""
            nums = re.findall(r'\d[\d,]*', label)
            if nums:
                # Take the largest number (usually the review count)
                biggest = max(nums, key=lambda x: int(x.replace(',', '')))
                review_count = biggest.replace(',', '')
                break
    except Exception:
        pass

    return review_count


def extract_detail_panel(driver):
    """Extract full details from the right-side detail panel."""
    result = {
        "name": "",
        "rating": None,
        "review_count": None,
        "category": "",
        "address": "",
        "phone": None,
        "website": None,
        "hours": None,
        "maps_url": driver.current_url,
        "source": "google_maps",
    }

    # Wait for panel to load - FIX: increased to 10s
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "h1.DUwDvf, h1.fontHeadlineLarge")
            )
        )
    except Exception:
        pass

    # Name
    for sel in ["h1.DUwDvf", "h1.fontHeadlineLarge", "h1"]:
        try:
            result["name"] = driver.find_element(By.CSS_SELECTOR, sel).text.strip()
            if result["name"]:
                break
        except Exception:
            pass

    # Rating
    try:
        rating_el = driver.find_element(
            By.CSS_SELECTOR, "div.F7nice span[aria-hidden='true']"
        )
        result["rating"] = rating_el.text.strip()
    except Exception:
        pass

    # Review count - FIX: using improved multi-method extraction
    result["review_count"] = extract_review_count(driver)

    # Category
    try:
        cat_el = driver.find_element(By.CSS_SELECTOR, "button.DkEaL")
        result["category"] = cat_el.text.strip()
    except Exception:
        pass

    # Phone
    try:
        phone_btn = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "button[data-item-id^='phone']")
            )
        )
        result["phone"] = phone_btn.text.strip()
    except Exception:
        result["phone"] = None

    # Website
    try:
        website_btn = driver.find_element(
            By.CSS_SELECTOR, "a[data-item-id='authority']"
        )
        href = website_btn.get_attribute("href") or ""

        if "google.com/url" in href:
            from urllib.parse import unquote
            m = re.search(r"[?&]q=([^&]+)", href)
            if m:
                href = unquote(m.group(1))

        result["website"] = href if href.startswith("http") else None
    except Exception:
        result["website"] = None

    # Address - fallback selectors
    if not result["address"]:
        for sel in [
            "div[data-item-id*='address'] .Io6YTe",
            "span.LrzXr",
            "div.rogA2c .Io6YTe",
        ]:
            try:
                result["address"] = driver.find_element(
                    By.CSS_SELECTOR, sel
                ).text.strip()
                if result["address"]:
                    break
            except Exception:
                pass

    return result


def extract_from_list_item(place):
    """Fallback: extract basic info from list tile (no click)."""
    result = {
        "name": "",
        "rating": None,
        "review_count": None,
        "category": "",
        "address": "",
        "phone": None,
        "website": None,
        "hours": None,
        "maps_url": None,
        "source": "google_maps",
    }

    try:
        result["name"] = place.find_element(
            By.CSS_SELECTOR, ".qBF1Pd"
        ).text.strip()
    except Exception:
        pass

    try:
        result["rating"] = place.find_element(
            By.CSS_SELECTOR, ".MW4etd"
        ).text.strip()
    except Exception:
        pass

    # Review count from list item
    try:
        review_txt = place.find_element(
            By.CSS_SELECTOR, ".UY7F9"
        ).text.strip()
        nums = re.findall(r'\d[\d,]*', review_txt)
        if nums:
            result["review_count"] = nums[0].replace(',', '')
    except Exception:
        pass

    try:
        spans = place.find_elements(By.CSS_SELECTOR, ".W4Efsd span")
        texts = [s.text.strip() for s in spans if s.text.strip()]
        result["address"] = " ".join(texts[:3])
    except Exception:
        pass

    return result


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: competitors.py <city> <keyword>"
        }))
        sys.exit(1)

    city = sys.argv[1]
    keyword = sys.argv[2]

    data = scrape_google_maps(city, keyword)

    print(json.dumps({
        "success": True,
        "competitors": data
    }))