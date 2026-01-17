import re
import base64
import zipfile
import os

html_path = 'ci-artifacts/playwright-report/index.html'
output_dir = 'extracted_report'

with open(html_path, 'r') as f:
    content = f.read()

# Find the base64 content
match = re.search(r'<script id="playwrightReportBase64" type="application/zip">([^<]+)</script>', content)
if not match:
    # Try div if script not found (Playwright versions vary)
    match = re.search(r'<div id="playwrightReportBase64"[^>]*>([^<]+)</div>', content)

if not match:
    print("Could not find playwrightReportBase64")
    exit(1)

b64_data = match.group(1)
# Remove potential data URI prefix if present (though regex captured inside tags)
if ',' in b64_data[:50]:
    b64_data = b64_data.split(',', 1)[1]

zip_path = 'report.zip'
with open(zip_path, 'wb') as f:
    f.write(base64.b64decode(b64_data))

print(f"Decoded zip to {zip_path}")

with zipfile.ZipFile(zip_path, 'r') as z:
    z.extractall(output_dir)
    print(f"Extracted to {output_dir}")
    for name in z.namelist():
        print(f" - {name}")
