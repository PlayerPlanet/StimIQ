def run_agent_prompt(prompt: str) -> str:
    """
    Run a free-form clinician prompt through the DBS agent and return clean text output.
    """
    from dbs_agent.agent import run_clinical_agent_prompt

    result = run_clinical_agent_prompt(prompt)
    return result.get("clean_ui_response", "").strip()


def generate_patient_analysis(patient_id: str, prom_data: list[dict], patient_name: str | None = None) -> str:
    """
    Generate an AI analysis of a patient's PROM data for use in a doctor-facing PDF report.
    Returns clean text analysis from the DBS agent.
    """
    from dbs_agent.agent import run_clinical_agent_prompt

    if not prom_data:
        return "No PROM data provided for analysis."

    # Format PROM data into a readable summary for the agent
    prom_summary_lines = []
    for entry in prom_data:
        date_str = entry.get("test_date", "Unknown date")
        scores = [entry[f"q{i}"] for i in range(1, 11) if f"q{i}" in entry]
        avg = sum(scores) / len(scores) if scores else 0
        score_str = ", ".join(str(s) for s in scores)
        prom_summary_lines.append(f"  - {date_str}: scores [{score_str}], avg={avg:.1f}/7")

    prom_summary = "\n".join(prom_summary_lines)

    name_clause = f" for patient {patient_name}" if patient_name else ""
    prompt = (
        f"Generate a concise clinical summary{name_clause} based on the following Patient-Reported Outcome Measures "
        f"(PROM) data from a Deep Brain Stimulation (DBS) patient. Each assessment contains 10 questions scored 1–7:\n\n"
        f"Question mapping:\n"
        f"  Q1: Overall mood\n"
        f"  Q2: Anxiety level\n"
        f"  Q3: Tremor presence\n"
        f"  Q4: Rigidity/stiffness\n"
        f"  Q5: New or unusual symptoms\n"
        f"  Q6: Satisfaction with daily functioning\n"
        f"  Q7: Quality of life\n"
        f"  Q8: DBS treatment effectiveness\n"
        f"  Q9: DBS side effects\n"
        f"  Q10: Physical well-being\n\n"
        f"PROM assessments (most recent first):\n{prom_summary}\n\n"
        f"Please provide:\n"
        f"1. A brief summary of trends in mood, tremor, and quality of life\n"
        f"2. Notable changes or concerns that the doctor should be aware of\n"
        f"3. Any patterns in DBS treatment effectiveness or side effects\n"
        f"4. Overall assessment suitable for a clinical handout\n\n"
        f"Keep the response concise and clinically focused, suitable for a patient to hand to their doctor."
    )

    result = run_clinical_agent_prompt(prompt)
    return result.get("clean_ui_response", "").strip()
