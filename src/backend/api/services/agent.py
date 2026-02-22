def run_agent_prompt(prompt: str) -> str:
    """
    Run a free-form clinician prompt through the DBS agent and return clean text output.
    """
    from dbs_agent.agent import run_clinical_agent_prompt

    result = run_clinical_agent_prompt(prompt)
    return result.get("clean_ui_response", "").strip()
