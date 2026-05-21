from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.config import get_settings
from app.db.session import get_db
from app.models import BatchJob, User
from app.schemas.batch import BatchJobOut
from app.services.scoring import log_audit
from app.tasks.batch import process_batch_job

router = APIRouter(prefix="/batches", tags=["batches"])


@router.post("", response_model=BatchJobOut)
def upload_batch(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "loan_officer")),
) -> BatchJob:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Upload a CSV file")

    settings = get_settings()
    job = BatchJob(creator_id=user.id, status="pending", input_filename=file.filename)
    db.add(job)
    db.commit()
    db.refresh(job)

    job_dir = settings.batch_dir / str(job.id)
    job_dir.mkdir(parents=True, exist_ok=True)
    dest = job_dir / "input.csv"
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    log_audit(db, actor=user, action="batch.upload", entity_type="batch_job", entity_id=job.id)
    db.commit()

    process_batch_job.delay(job.id)
    db.refresh(job)  # pick up status/summary written by eager task
    return job


@router.get("", response_model=list[BatchJobOut])
def list_batches(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = 20,
) -> list[BatchJob]:
    q = db.query(BatchJob).order_by(BatchJob.created_at.desc()).limit(limit)
    if user.role not in ("admin", "risk_analyst"):
        q = q.filter(BatchJob.creator_id == user.id)
    return q.all()


@router.get("/{job_id}", response_model=BatchJobOut)
def get_batch(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BatchJob:
    job = db.get(BatchJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Not found")
    if user.role not in ("admin", "risk_analyst") and job.creator_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return job


@router.get("/{job_id}/download")
def download_batch_results(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    job = db.get(BatchJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Not found")
    if user.role not in ("admin", "risk_analyst") and job.creator_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if job.status != "completed" or not job.result_path:
        raise HTTPException(status_code=400, detail="Results not ready")
    path = Path(job.result_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Result file missing")
    return FileResponse(
        path,
        media_type="text/csv",
        filename=f"batch_{job_id}_results.csv",
    )
