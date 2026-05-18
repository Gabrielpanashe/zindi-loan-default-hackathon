from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "loan_risk",
    broker=settings.broker_url,
    backend=settings.result_backend,
    include=["app.tasks.batch"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_always_eager=settings.celery_task_always_eager,
    task_eager_propagates=settings.celery_task_always_eager,
)
