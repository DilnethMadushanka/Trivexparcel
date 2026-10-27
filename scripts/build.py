"""Inline src/logic.js into src/page.html -> dist/hariyata.html (the published artifact page)."""
from pathlib import Path
root = Path(__file__).resolve().parent.parent
page = (root / "src/page.html").read_text()
logic = (root / "src/logic.js").read_text()
out = root / "dist/hariyata.html"
out.parent.mkdir(exist_ok=True)
out.write_text(page.replace("/*LOGIC*/", logic))
print(f"built {out.relative_to(root)} ({out.stat().st_size} bytes)")
