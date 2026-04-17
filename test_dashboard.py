from playwright.sync_api import sync_playwright
import os

def test_dashboard():
    with sync_playwright() as p:
        # Launch chromium in headless mode
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # URL for the dev server
        url = 'http://localhost:3000'
        print(f"Navigating to {url}...")
        
        try:
            page.goto(url)
            # CRITICAL: Wait for JS to execute and network to be idle
            page.wait_for_load_state('networkidle')
            
            # Take a full page screenshot
            screenshot_path = 'dashboard_test.png'
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"Screenshot saved to {screenshot_path}")
            
            # Check for key dashboard elements
            content = page.content()
            indicators = ["HMSP", "Staff", "Patient", "Attendance", "Payroll"]
            found = [ind for ind in indicators if ind in content]
            print(f"Found elements: {found}")
            
            # Log titles and buttons for reconnaissance
            title = page.title()
            print(f"Page Title: {title}")
            
            buttons = page.locator('button').all_text_contents()
            print(f"Found {len(buttons)} buttons.")
            
        except Exception as e:
            print(f"Error during testing: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    test_dashboard()
