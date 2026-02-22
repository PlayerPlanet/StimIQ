from pydantic import BaseModel, Field


class AgentPromptRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)


class AgentPromptResponse(BaseModel):
    status: str
    message: str
    response_text: str
