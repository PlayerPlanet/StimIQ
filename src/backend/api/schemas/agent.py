from typing import Optional
from pydantic import BaseModel, Field


class AgentPromptRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)


class AgentPromptResponse(BaseModel):
    status: str
    message: str
    response_text: str


class PromDataEntry(BaseModel):
    test_date: str
    q1: int
    q2: int
    q3: int
    q4: int
    q5: int
    q6: int
    q7: int
    q8: int
    q9: int
    q10: int


class PatientAnalysisRequest(BaseModel):
    patient_id: str = Field(..., min_length=1, max_length=64)
    prom_data: list[PromDataEntry] = Field(..., min_length=1)
    patient_name: Optional[str] = Field(default=None, max_length=200)


class PatientAnalysisResponse(BaseModel):
    status: str
    analysis_text: str
