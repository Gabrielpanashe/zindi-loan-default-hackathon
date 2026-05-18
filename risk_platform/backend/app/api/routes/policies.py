from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models import User
from app.services.scoring import ensure_default_policy

router = APIRouter(prefix="/policies", tags=["policies"])


class PolicyOut(BaseModel):
    id: int
    name: str
    approve_pd_max: float
    review_pd_max: float

    model_config = {"from_attributes": True}


class PolicyUpdate(BaseModel):
    approve_pd_max: float = Field(ge=0, le=1)
    review_pd_max: float = Field(ge=0, le=1)
    name: str | None = Field(default=None, max_length=128)


@router.get("", response_model=PolicyOut)
def get_policy(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PolicyOut:
    p = ensure_default_policy(db)
    return PolicyOut.model_validate(p)


@router.put("", response_model=PolicyOut)
def update_policy(
    body: PolicyUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin")),
) -> PolicyOut:
    if body.approve_pd_max > body.review_pd_max:
        raise HTTPException(status_code=400, detail="approve_pd_max must be <= review_pd_max")
    p = ensure_default_policy(db)
    p.approve_pd_max = body.approve_pd_max
    p.review_pd_max = body.review_pd_max
    if body.name:
        p.name = body.name
    db.add(p)
    db.commit()
    db.refresh(p)
    return PolicyOut.model_validate(p)
