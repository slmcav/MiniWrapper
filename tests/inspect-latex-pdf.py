"""Verify that the published PDF is compiled from LaTeX and visually inspectable."""
import hashlib
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path


class BoundsAudit(HTMLParser):
    def __init__(self):
        super().__init__()
        self.page = None
        self.pages = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "page":
            self.page = {"width": float(a["width"]), "height": float(a["height"]), "words": 0}
            self.pages.append(self.page)
        elif tag == "word" and self.page:
            x0, y0, x1, y1 = (float(a[k]) for k in ("xMin", "yMin", "xMax", "yMax"))
            assert 0 <= x0 < x1 <= self.page["width"] + 1, "Horizontal PDF clipping"
            assert 0 <= y0 < y1 <= self.page["height"] + 1, "Vertical PDF clipping"
            self.page["words"] += 1


def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT)


def inspect(directory):
    directory = Path(directory)
    pdfs = list(directory.glob("GLSL-*.pdf"))
    assert len(pdfs) == 1, "Expected exactly one content-addressed scholarly PDF"
    pdf = pdfs[0]
    match = re.fullmatch(r"GLSL-([0-9a-f]{32})_([0-9a-f]{64})\.pdf", pdf.name)
    assert match, "File name must contain UniqueID_fullSHA256"
    actual_hash = hashlib.sha256(pdf.read_bytes()).hexdigest()
    assert actual_hash == match.group(2), "PDF SHA256 does not match filename"
    info = run("pdfinfo", str(pdf))
    assert "Pages:" in info, "Missing PDF page count"
    output = run("pdftotext", "-layout", str(pdf), "-")
    for token in ("Materials and methods", "Data and reproducibility",
                  "Original GLSL source", "Results", "References"):
        assert token.lower() in output.lower(), "Missing paper section: " + token
    images = run("pdfimages", "-list", str(pdf))
    image_count = len(re.findall(r"^\s*\d+\s+\d+\s+image\s+", images, re.MULTILINE))
    assert image_count >= 3, "Three original GPU images not embedded"
    xml = run("pdftotext", "-bbox-layout", str(pdf), "-")
    audit = BoundsAudit()
    audit.feed(xml)
    assert len(audit.pages) >= 2, "Expected a multi-page LaTeX manuscript"
    assert sum(page["words"] for page in audit.pages) > 140, "Insufficient manuscript content"
    assert all(page["words"] > 0 for page in audit.pages), "Blank manuscript page"
    run("pdftoppm", "-f", "1", "-l", "2", "-scale-to", "1400",
        "-png", str(pdf), str(directory / "academic-page"))
    assert (directory / "academic-page-1.png").stat().st_size > 1000
    assert (directory / "academic-page-2.png").stat().st_size > 1000
    log = (directory / "manuscript.log").read_text(encoding="utf-8", errors="replace")
    assert "Output written on manuscript.pdf" in log, "No native pdfLaTeX output log"
    assert "Missing character:" not in log, "Font/glyph substitution detected"
    print("PASS LaTeX PDF:", pdf.name, "pages:", len(audit.pages),
          "text words:", sum(page["words"] for page in audit.pages),
          "image XObjects:", image_count, "sha256:", actual_hash)


if __name__ == "__main__":
    inspect(sys.argv[1] if len(sys.argv) > 1 else "test-results/pdf-render")
