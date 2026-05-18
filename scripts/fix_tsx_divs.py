"""Replace mistaken <motion> tags with <div> in frontend TSX."""
import pathlib

TAG = "div"
for p in pathlib.Path("risk_platform/frontend/src").rglob("*.tsx"):
    t = p.read_text(encoding="utf-8")
    if "motion" not in t:
        continue
    t = t.replace("<motion", f"<{TAG}")
    t = t.replace("</motion>", f"</{TAG}>")
    p.write_text(t, encoding="utf-8")
    print("fixed", p)
