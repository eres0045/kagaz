"""Kagaz Day-1 smoke test: real Chromium, demo mode, full pipeline in-browser.

Run: npm run dev (in one shell), then:
  ~/workspace/.venvs/pw/bin/python scripts/smoke-browser.py
Requires Playwright Chromium (see the spike notes for the VM setup).
"""
import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto("http://127.0.0.1:5173/  # or [::1] if Vite binds IPv6", wait_until="networkidle")
    page.wait_for_selector("text=Kagaz", timeout=15000)
    assert "Demo mode" in page.content(), "demo banner missing"
    # In Playwright Chromium the Prompt API exists and reports "downloadable"
    # (echo stub — see SPIKE.md §2a); in a non-Chrome browser it is "unsupported".
    assert "Nano: downloadable" in page.content() or "Nano: unsupported" in page.content(), "Nano status chip missing"
    page.click("text=Sample: Job offer letter")
    page.click("text=Redact & analyse")
    page.wait_for_selector("text=9 items redacted", timeout=15000)
    content = page.content()
    assert "Demo · local stub" in content, "demo engine chip missing"
    assert "[EMAIL_1]" in content, "redacted placeholder not shown"
    assert "aarav.sharma@example.com" not in page.locator("pre").first.inner_text(), "secret leaked into redacted view"
    assert "4 · Dossier" in content, "dossier section missing"
    assert "Checklist" in content, "dossier checklist missing"
    # Original/restore toggle works and restores locally
    page.click("text=Show original")
    assert "aarav.sharma@example.com" in page.locator("pre").first.inner_text(), "restore toggle did not restore"
    page.click("text=Show redacted")
    # On-device-only path must fail honestly (Nano unavailable in Chromium)
    page.click("text=Test on-device extraction")
    page.wait_for_selector("text=Extraction unavailable", timeout=15000)
    print("SMOKE OK")
    print("page errors:", json.dumps(errors))
    browser.close()
