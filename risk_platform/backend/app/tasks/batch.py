from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

from app.celery_app import celery_app
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import BatchJob
from app.services.scoring_core import score_dataframe_with_policy

ROOT = Path(__file__).resolve().parents[4]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@celery_app.task(name="app.tasks.batch.process_batch_job", bind=True)
def process_batch_job(self, job_id: int) -> dict:
    settings = get_settings()
    with SessionLocal() as db:
        job = db.get(BatchJob, job_id)
        if not job:
            return {"error": "job not found"}
        job.status = "running"
        db.commit()

        job_dir = settings.batch_dir / str(job_id)
        input_path = job_dir / "input.csv"
        output_path = job_dir / "results.csv"

        try:
            df = pd.read_csv(input_path)
            scored, policy = score_dataframe_with_policy(df, db, settings, explain=False, top_k=3)

            out_rows = []
            tier_counts = {"low": 0, "medium": 0, "high": 0}
            rec_counts = {"approve": 0, "manual_review": 0, "reject": 0}
            pd_sum = 0.0
            for r in scored:
                tier_counts[r["risk_tier"]] = tier_counts.get(r["risk_tier"], 0) + 1
                rec_counts[r["recommendation"]] = rec_counts.get(r["recommendation"], 0) + 1
                pd_sum += r["probability_default"]
                out_rows.append(
                    {
                        "ID": r.get("ID"),
                        "row_index": r["row_index"],
                        "probability_default": round(r["probability_default"], 6),
                        "recommendation": r["recommendation"],
                        "risk_tier": r["risk_tier"],
                    }
                )

            pd.DataFrame(out_rows).to_csv(output_path, index=False)
            summary = {
                "rows": len(scored),
                "avg_probability_default": pd_sum / max(len(scored), 1),
                "risk_tier_counts": tier_counts,
                "recommendation_counts": rec_counts,
                "policy": {
                    "approve_pd_max": policy.approve_pd_max,
                    "review_pd_max": policy.review_pd_max,
                },
            }

            job.status = "completed"
            job.result_path = str(output_path)
            job.summary = summary
            job.completed_at = datetime.utcnow()
            job.error_message = None
            db.commit()
            return summary
        except Exception as exc:
            job.status = "failed"
            job.error_message = str(exc)[:2000]
            job.completed_at = datetime.utcnow()
            db.commit()
            raise
