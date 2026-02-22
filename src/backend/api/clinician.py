from fastapi import APIRouter, HTTPException

from .schemas import (
    DbsState,
    DbsTuningRecommendation,
    SimulationRequest,
    SimulationResponse,
    AgentPromptRequest,
    AgentPromptResponse,
)
from .services import (
    get_dbs_state_for_patient,
    get_dbs_tuning_recommendation,
    run_hypothetical_simulation,
    run_agent_prompt,
)


router = APIRouter(prefix="/clinician", tags=["clinician"])


@router.get("/dbs_state/{patient_id}", response_model=DbsState)
async def get_dbs_state(patient_id: str):
    """Get DBS state for a patient including channel configuration and timeseries data."""
    try:
        dbs_state = get_dbs_state_for_patient(patient_id)
        return dbs_state
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve DBS state: {str(e)}")


@router.get("/dbs_tuning/{patient_id}", response_model=DbsTuningRecommendation)
async def get_dbs_tuning(patient_id: str):
    """Get DBS tuning recommendations for a patient."""
    try:
        recommendation = get_dbs_tuning_recommendation(patient_id)
        return recommendation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve DBS tuning recommendation: {str(e)}")


@router.post("/simulate", response_model=SimulationResponse)
async def simulate_hypothetical_parameters(payload: SimulationRequest):
    """Run simulation using a simulation-specific contract and return 3-channel position deviation traces."""
    try:
        return run_hypothetical_simulation(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run simulation: {str(e)}")


@router.post("/agent-prompt", response_model=AgentPromptResponse)
async def clinician_agent_prompt(payload: AgentPromptRequest):
    """Send a free-form prompt to the DBS agent and return cleaned response text."""
    try:
        response_text = run_agent_prompt(payload.prompt)
        return AgentPromptResponse(
            status="ok",
            message="Agent response generated.",
            response_text=response_text,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process agent prompt: {str(e)}")
