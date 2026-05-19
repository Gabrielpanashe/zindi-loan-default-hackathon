"""
Multilingual AI chat assistant for loan applicants.
Currently uses rule-based responses (mock mode).
To upgrade to Claude API: set ANTHROPIC_API_KEY and uncomment the claude block below.
"""
from __future__ import annotations

import os
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatContext(BaseModel):
    pd: float
    risk_tier: str
    recommendation: str
    narratives: list[str] = []


class ChatRequest(BaseModel):
    message: str
    language: Literal["en", "sn", "nd"] = "en"
    context: ChatContext


class ChatResponse(BaseModel):
    reply: str


def _mock_reply(message: str, language: str, ctx: ChatContext) -> str:
    msg = message.lower()
    pd = round(ctx.pd, 1)
    tier = ctx.risk_tier
    rec = ctx.recommendation.replace("_", " ")
    driver = ctx.narratives[0].rstrip(".") if ctx.narratives else "your financial profile"

    if language == "sn":
        if any(k in msg for k in ["rendi", "score", "%", "percent", "zvinoreva"]):
            return (f"Rendi yako ye {pd}% inoreva kuti mwero wekurega kubhadhara uri "
                    f"{'pamusoro' if tier == 'high' else 'pakati' if tier == 'medium' else 'pasi'}. "
                    f"Mutongo: {rec}. Mhosva huru: {driver}.")
        if any(k in msg for k in ["vandudzira", "kugadziridza", "improve", "better"]):
            return ("Kuti rendi yako idzike: (1) Deredza ndarama yaunokumbira, "
                    "(2) Bhadharira chikwereti chimwe, (3) Ratidza mhosho yakakurira.")
        return f"Ndiri pano kukubatsira nezve rendi yako ye {pd}%. Ndiudze zvaunoda kuziva!"

    if language == "nd":
        if any(k in msg for k in ["score", "%", "percent", "iskhala", "isikhala"]):
            return (f"Isikhala sakho se-{pd}% sithi ingozi yokwehluleka ukukhokhela "
                    f"{'iphezulu' if tier == 'high' else 'emaphakathi' if tier == 'medium' else 'iphansi'}. "
                    f"Isinqumo: {rec}. Imbangela enkulu: {driver}.")
        if any(k in msg for k in ["improve", "thuthukisa", "better", "nciphisa"]):
            return ("Ukuze isikhala sakho sehle: (1) Nciphisa imali oyicelayo, "
                    "(2) Khokha isikwelede esisodwa, (3) Bonisa umholo omkhulu.")
        return f"Ngiyakusiza nganoma imibuzo mayelana nesikhala sakho se-{pd}%. Ngitshele!"

    # English
    if any(k in msg for k in ["mean", "score", "%", "percent", "what is"]):
        return (f"Your default probability of {pd}% means your risk level is {tier}. "
                f"The AI recommends: {rec}. Main driver: {driver}.")
    if any(k in msg for k in ["improve", "better", "qualify", "how", "change"]):
        return ("To improve your score: (1) Reduce the loan amount, "
                "(2) Pay off an existing obligation, (3) Demonstrate higher stable income.")
    if any(k in msg for k in ["why", "reason", "factor", "shap", "driver"]):
        drivers = " | ".join(ctx.narratives[:3]) or "No drivers available"
        return f"Top factors: {drivers}"
    if any(k in msg for k in ["hello", "hi", "help", "mhoro", "sawubona"]):
        return (f"Hello! I'm your CreditRiskAI assistant. Your risk score is {pd}% ({tier}). "
                "Ask me anything about your assessment or how to improve your chances!")
    return (f"I can help you understand your {pd}% risk score. "
            "Try asking: 'Why is my score high?' or 'How can I improve?'")


@router.post("", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    _: User = Depends(get_current_user),
) -> ChatResponse:
    # ── Upgrade path: uncomment below and set ANTHROPIC_API_KEY ──────────────
    # api_key = os.getenv("ANTHROPIC_API_KEY")
    # if api_key:
    #     import anthropic
    #     client = anthropic.Anthropic(api_key=api_key)
    #     lang_names = {"en": "English", "sn": "ChiShona", "nd": "IsiNdebele"}
    #     system = (
    #         f"You are a financial inclusion assistant for CreditRiskAI in Zimbabwe. "
    #         f"The applicant's loan assessment: PD={body.context.pd:.1f}%, "
    #         f"risk_tier={body.context.risk_tier}, decision={body.context.recommendation}. "
    #         f"Top drivers: {'; '.join(body.context.narratives[:3])}. "
    #         f"Reply ONLY in {lang_names[body.language]}. Max 3 sentences. Be empathetic and constructive."
    #     )
    #     msg = client.messages.create(
    #         model="claude-haiku-4-5-20251001", max_tokens=256,
    #         system=system, messages=[{"role": "user", "content": body.message}]
    #     )
    #     return ChatResponse(reply=msg.content[0].text)
    # ─────────────────────────────────────────────────────────────────────────

    reply = _mock_reply(body.message, body.language, body.context)
    return ChatResponse(reply=reply)
