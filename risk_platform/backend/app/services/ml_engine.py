from __future__ import annotations

import sys
from pathlib import Path

from app.core.config import get_settings

_engine = None


def get_inference_engine():
    """Lazy singleton; requires exported artifacts under risk_platform/artifacts/v1."""
    global _engine
    if _engine is not None:
        return _engine
    root = Path(__file__).resolve().parents[4]
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))
    from risk_platform.ml_runtime.inference import InferenceEngine

    s = get_settings()
    art = s.artifacts_path if s.artifacts_dir is None else Path(s.artifacts_dir)
    _engine = InferenceEngine(art)
    return _engine
