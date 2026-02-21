import os
import sys
import json
from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent

# 1. Load environment variables
load_dotenv("dbs-agent/agent.env")

# Read API key explicitly and fail fast if missing
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GOOGLE_API_KEY or GEMINI_API_KEY must be set in agent.env")

# 2. Initialize the LLM
llm = ChatGoogleGenerativeAI(
    model="models/gemini-2.5-flash",
    temperature=0, # Keep temperature at 0 for deterministic, factual outputs
    max_retries=2,
    google_api_key=api_key,
) 

# 3. Define your Tools
def search_medical_guidelines_impl(symptom: str) -> str:
    """Use this helper to search medical literature for DBS side effects based on patient symptoms."""
    if "tingling" in symptom.lower() or "paresthesia" in symptom.lower():
        return "Clinical Note: Paresthesia (tingling) often indicates current spreading to the medial lemniscus. Decreasing voltage or pulse width is recommended."
    return "No specific adverse guidelines found for this symptom."

# Wrap the helper as a langchain tool for agent use, but keep the implementation callable for local testing
search_medical_guidelines = tool(search_medical_guidelines_impl)
tools = [search_medical_guidelines]

# 4. Define the System Prompt
system_prompt = """You are a clinical interpreter for a Bayesian DBS optimization model. 
Your job is to translate the model's mathematical state into clinical insights.
Always structure your response into three sections:
1. Mathematical Rationale
2. Patient Changes
3. Clinical Considerations (Always use your search_medical_guidelines tool if new symptoms are reported!)"""

# 5. Build the Agent using LangGraph
agent = create_react_agent(llm, tools=tools)

# 6. Simulate the Hand-off from your Bayesian Model
mock_bayesian_state = {
  "current_programming": {"frequency": 130, "voltage": 2.5, "pulse_width": 60},
  "proposed_programming": {"frequency": 130, "voltage": 3.0, "pulse_width": 60},
  "bayesian_rationale": "High expected improvement in tremor; low uncertainty in 3.0V region.",
  "patient_deltas": {
    "tremor_reduction": "+15%",
    "new_symptoms": ["Patient reports mild tingling in the right arm."]
  }
}

# 7. Run the Agent
print("Thinking...\n" + "-"*40)
user_input = f"Here is the latest output from the Bayesian optimizer: {json.dumps(mock_bayesian_state)}. Please interpret this."

# Allow an offline mock interpreter for local testing without external APIs
if os.getenv("USE_MOCK_LLM") == "1":
    print("Running offline mock interpreter (USE_MOCK_LLM=1)")
    print("\nMathematical Rationale\n" + "-"*20)
    print(mock_bayesian_state.get("bayesian_rationale", ""))

    print("\nPatient Changes\n" + "-"*20)
    for k, v in mock_bayesian_state.get("patient_deltas", {}).items():
        print(f"{k}: {v}")

    print("\nClinical Considerations\n" + "-"*20)
    for sym in mock_bayesian_state.get("patient_deltas", {}).get("new_symptoms", []):
        print(f"Symptom: {sym}")
        print("Tool output:", search_medical_guidelines_impl(sym))
        print()
    sys.exit(0)

# Stream the response back and include the system prompt as a SystemMessage
for chunk in agent.stream({
    "messages": [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_input),
    ]
}):
    if "agent" in chunk:
        print(chunk["agent"]["messages"][0].content)
    elif "tools" in chunk:
        print(f"[Agent is using tool: {chunk['tools']['messages'][0].name}]")