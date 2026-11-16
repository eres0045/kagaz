"""Kagaz Day-2 live verification: real Chromium against the deployed
GitHub Pages demo (https://eres0045.github.io/kagaz/).

Run:
  ~/workspace/.venvs/pw/bin/python scripts/smoke-live.py
Requires Playwright Chromium. On this VM public URLs need the local
CONNECT forwarder (see ~/workspace/tmp-connect-fwd.mjs) — start it
first and pass PROXY=http://127.0.0.1:18080.
"""
import json
import os
import sys
from playwright.sync_api import sync_playwright

URL = "https://eres0045.github.io/kagaz/"
PROXY = os.environ.get("PROXY")

with sync_playwright() as p:
    launch_kwargs = {}
    if PROXY:
        launch_kwargs["proxy"] = {"server": PROXY}
    browser = p.chromium.launch(**launch_kwargs)
    page = browser.new_page(ignore_https_errors=True)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto(URL, wait_until="networkidle")
    page.wait_for_selector("text=Kagaz", timeout=30000)
    assert "Demo mode" in page.content(), "demo banner missing"
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
    page.click("text=Show original")
    assert "aarav.sharma@example.com" in page.locator("pre").first.inner_text(), "restore toggle did not restore"
    page.click("text=Show redacted")
    page.click("text=Test on-device extraction")
    page.wait_for_selector("text=Extraction unavailable", timeout=15000)
    print("LIVE SMOKE OK")
    print("page errors:", json.dumps(errors))
    if errors:
        sys.exit(1)
    browser.close()
