"""Render video_demo_plan.md to a PDF via python-markdown + headless Chrome."""
import subprocess
import tempfile
from pathlib import Path

import markdown

HERE = Path(__file__).parent
SRC = HERE / "video_demo_plan.md"
OUT = HERE / "video_demo_plan.pdf"

CSS = """
@page { size: Letter; margin: 0.75in; }
body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
       font-size: 11pt; line-height: 1.5; color: #222; max-width: 7.5in; }
h1 { font-size: 20pt; border-bottom: 2px solid #333; padding-bottom: 4px; }
h2 { font-size: 14pt; margin-top: 22px; color: #1a1a1a; }
h3 { font-size: 12pt; color: #333; }
code { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 10pt;
       background: #f3f1ee; padding: 1px 5px; border-radius: 3px; }
pre { background: #f3f1ee; padding: 10px; border-radius: 6px; overflow-x: auto; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 10pt; }
th, td { border: 1px solid #d8d4cf; padding: 6px 8px; text-align: left;
         vertical-align: top; }
th { background: #efe9e1; }
tr:nth-child(even) { background: #faf7f3; }
hr { border: 0; border-top: 1px solid #d8d4cf; margin: 18px 0; }
ul, ol { padding-left: 22px; }
li { margin: 2px 0; }
strong { color: #5a2a0a; }
"""


def main():
    md_text = SRC.read_text()
    html_body = markdown.markdown(md_text, extensions=["tables", "fenced_code"])
    html = f"<!doctype html><html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{html_body}</body></html>"

    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as f:
        f.write(html)
        html_path = f.name

    subprocess.run([
        "google-chrome", "--headless", "--disable-gpu", "--no-sandbox",
        "--no-pdf-header-footer",
        f"--print-to-pdf={OUT}",
        f"file://{html_path}",
    ], check=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size/1024:.1f} KB)")


if __name__ == "__main__":
    main()
