from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import json
import os
from dotenv import load_dotenv
from typing import List, Optional

load_dotenv()

app = FastAPI(title="HostelDesk AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"


# ── Request Models ────────────────────────────────────────────

class ComplaintInput(BaseModel):
    topic: str
    details: str

class RewriteInput(BaseModel):
    topic: str
    details: str

class OpenComplaint(BaseModel):
    id: str
    title: str
    topic: str
    details: str

class DuplicateDetectInput(BaseModel):
    new_complaint: ComplaintInput
    open_complaints: List[OpenComplaint]


# ── Helper ────────────────────────────────────────────────────

def chat(system: str, user: str) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        temperature=0.3,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return response.choices[0].message.content.strip()


# ── Endpoints ─────────────────────────────────────────────────

@app.post("/analyze")
async def analyze_complaint(data: ComplaintInput):
    """Categorize, score, and summarize a complaint."""
    system = """You are a hostel complaint analysis assistant.
Given a complaint topic and details, return ONLY valid JSON (no markdown, no explanation) with:
{
  "category": one of ["Maintenance","Food","Hygiene","Security","Internet","Noise","Other"],
  "priority_score": integer 1-10 (10 = most urgent),
  "priority_reason": short one-sentence reason for this priority score,
  "ai_summary": concise 1-2 sentence summary of the complaint
}"""
    user = f"Topic: {data.topic}\nDetails: {data.details}"
    raw = chat(system, user)
    try:
        # Strip markdown fences if present
        clean = raw.strip().strip("```json").strip("```").strip()
        result = json.loads(clean)
        return result
    except Exception:
        raise HTTPException(status_code=500, detail=f"AI parse error: {raw}")


@app.post("/rewrite")
async def rewrite_complaint(data: RewriteInput):
    """Suggest an improved, clearer version of the complaint."""
    system = """You are a writing assistant that helps hostel residents articulate their complaints clearly and professionally.
Given a complaint topic and details, return ONLY valid JSON (no markdown, no explanation) with:
{
  "rewritten_topic": improved topic title (concise, clear),
  "rewritten_details": improved details (professional, specific, actionable, polite)
}"""
    user = f"Topic: {data.topic}\nDetails: {data.details}"
    raw = chat(system, user)
    try:
        clean = raw.strip().strip("```json").strip("```").strip()
        result = json.loads(clean)
        return result
    except Exception:
        raise HTTPException(status_code=500, detail=f"AI parse error: {raw}")


@app.post("/detect-duplicate")
async def detect_duplicate(data: DuplicateDetectInput):
    """Check if a new complaint is similar to any open complaints."""
    if not data.open_complaints:
        return {"is_duplicate": False, "similar_complaint_id": None, "reason": ""}

    complaints_list = "\n".join(
        [f"ID: {c.id} | Topic: {c.topic} | Details: {c.details[:200]}"
         for c in data.open_complaints]
    )

    system = """You are a duplicate detection assistant for a hostel complaint system.
Given a new complaint and a list of open complaints, determine if any open complaint is substantially similar (same issue, same location, same type of problem).
Return ONLY valid JSON (no markdown, no explanation):
{
  "is_duplicate": true or false,
  "similar_complaint_id": "the ID string of the most similar complaint, or null",
  "reason": "brief explanation of why they are similar, or empty string if not similar"
}"""

    user = f"""New complaint:
Topic: {data.new_complaint.topic}
Details: {data.new_complaint.details}

Open complaints:
{complaints_list}"""

    raw = chat(system, user)
    try:
        clean = raw.strip().strip("```json").strip("```").strip()
        result = json.loads(clean)
        return result
    except Exception:
        raise HTTPException(status_code=500, detail=f"AI parse error: {raw}")


@app.get("/health")
async def health():
    return {"status": "ok"}
