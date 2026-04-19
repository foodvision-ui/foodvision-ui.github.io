#!/usr/bin/env python3
"""
Convert markdown files to PDF via headless Chrome.
Pipeline: MD → styled HTML (with pygments code highlighting) → Chrome --print-to-pdf.
"""
import subprocess
import sys
from pathlib import Path

import markdown

HERE = Path(__file__).resolve().parent

STYLE = """
<style>
  @page { size: Letter; margin: 0.8in 0.9in; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
    font-size: 11.5pt;
    line-height: 1.55;
    color: #2b1b12;
    max-width: 7.2in;
    margin: 0 auto;
  }
  h1 {
    font-size: 24pt;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin: 0 0 6pt;
    color: #2b1b12;
    padding-bottom: 8pt;
    border-bottom: 2pt solid #ff6633;
  }
  h2 {
    font-size: 15pt;
    font-weight: 700;
    margin: 18pt 0 6pt;
    color: #2b1b12;
    letter-spacing: -0.01em;
  }
  h3 {
    font-size: 12.5pt;
    font-weight: 700;
    margin: 14pt 0 4pt;
    color: #5a3620;
  }
  h4 {
    font-size: 11.5pt;
    font-weight: 700;
    margin: 10pt 0 3pt;
    color: #5a3620;
  }
  p { margin: 0 0 8pt; }
  ul, ol { margin: 4pt 0 10pt; padding-left: 20pt; }
  li { margin-bottom: 3pt; }
  li > p { margin: 0 0 3pt; }
  strong { color: #2b1b12; font-weight: 700; }
  em { color: #6f4a36; }
  a { color: #ff6633; text-decoration: none; }
  code {
    font-family: 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace;
    font-size: 9.5pt;
    background: #fff1e5;
    color: #7a3d1f;
    padding: 1.5pt 5pt;
    border-radius: 3pt;
  }
  pre {
    background: #fff8f0;
    border: 1px solid #f1dec4;
    border-radius: 6pt;
    padding: 10pt 12pt;
    margin: 8pt 0 12pt;
    overflow: hidden;
    page-break-inside: avoid;
  }
  pre code {
    background: transparent;
    color: #3d291e;
    padding: 0;
    font-size: 9pt;
    line-height: 1.5;
  }
  blockquote {
    margin: 8pt 0;
    padding: 6pt 14pt;
    border-left: 3pt solid #ff6633;
    background: #fff8f0;
    color: #4a3222;
    font-style: italic;
  }
  hr {
    border: none;
    border-top: 1px solid #f1dec4;
    margin: 16pt 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0;
    font-size: 10.5pt;
  }
  th, td {
    border: 1px solid #f1dec4;
    padding: 5pt 8pt;
    text-align: left;
  }
  th { background: #fff1e5; color: #7a3d1f; font-weight: 700; }

  /* Avoid ugly splits */
  h1, h2, h3, h4 { page-break-after: avoid; }
  pre, blockquote { page-break-inside: avoid; }
</style>
"""

FONTS = """
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
"""


def md_to_html(md_path: Path, title: str) -> str:
    md_text = md_path.read_text(encoding="utf-8")
    html_body = markdown.markdown(
        md_text,
        extensions=["fenced_code", "tables", "codehilite", "sane_lists"],
        extension_configs={"codehilite": {"noclasses": True, "pygments_style": "friendly"}},
    )
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{title}</title>
{FONTS}{STYLE}
</head><body>{html_body}</body></html>"""


def html_to_pdf(html_path: Path, pdf_path: Path) -> None:
    cmd = [
        "google-chrome",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        f"file://{html_path}",
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def convert(md_path: Path, pdf_path: Path, title: str) -> None:
    html = md_to_html(md_path, title)
    html_tmp = pdf_path.with_suffix(".html")
    html_tmp.write_text(html, encoding="utf-8")
    html_to_pdf(html_tmp, pdf_path)
    html_tmp.unlink()
    print(f"  {md_path.name}  →  {pdf_path.name}  ({pdf_path.stat().st_size/1024:.1f} KB)")


def main() -> None:
    jobs = [
        (HERE / "demo_plan.md",    HERE / "demo_plan.pdf",    "FoodVision AI — Demo Plan"),
        (HERE / "key_features.md", HERE / "key_features.pdf", "FoodVision AI — Key Features"),
    ]
    for md, pdf, title in jobs:
        convert(md, pdf, title)


if __name__ == "__main__":
    main()
