import os
import sys
import re
import json
from pathlib import Path
from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langgraph.prebuilt import create_react_agent
# Imports for RAG
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS

# --- 1. Setup & Initialization ---
AGENT_DIR = Path(__file__).resolve().parent
load_dotenv(AGENT_DIR / "agent.env")
load_dotenv(AGENT_DIR.parent / ".env")

api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GOOGLE_API_KEY or GEMINI_API_KEY must be set (dbs_agent/agent.env or backend .env)")

# Initialize the LLM
llm = ChatGoogleGenerativeAI(
    model="models/gemini-2.5-flash",
    temperature=0, 
    max_retries=2,
    google_api_key=api_key,
) 

# --- 2. Vector Database Setup ---
def setup_vector_db():
    pdf_path = os.getenv("PDF_PATH", str(AGENT_DIR / "dbs_guidelines.pdf"))
    index_path = os.getenv("FAISS_INDEX_PATH", str(AGENT_DIR / "faiss_index")) 
    
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001", # Note: models/text-embedding-004 is recommended for newer deployments
        google_api_key=api_key # type: ignore
    )

    if os.path.exists(index_path):
        return FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True).as_retriever(search_kwargs={"k": 2})
    else:
        print(f"No local index found. Parsing '{pdf_path}'...")
        if not os.path.exists(pdf_path):
            print(f"⚠️ Warning: '{pdf_path}' not found. Vector DB disabled.")
            return None
        loader = PyPDFLoader(pdf_path)
        splits = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200).split_documents(loader.load())
        vectorstore = FAISS.from_documents(splits, embeddings)
        vectorstore.save_local(index_path)
        return vectorstore.as_retriever(search_kwargs={"k": 2})

retriever = setup_vector_db()

# --- 3. Tool Definition ---
def search_medical_guidelines_impl(symptom: str) -> str:
    """Use this helper to search the official DBS medical guidelines PDF for side effects or programming advice."""
    if not retriever:
        return f"System note: Could not search for '{symptom}' because no PDF vector database was initialized."
        
    retrieved_docs = retriever.invoke(symptom)
    formatted_context = "\n\n".join([doc.page_content for doc in retrieved_docs])
    
    if not formatted_context.strip():
        return "No relevant information found in the guidelines for this query."
    return f"Extracted from guidelines:\n{formatted_context}"

search_medical_guidelines = tool(search_medical_guidelines_impl)

# --- 4. The Callable Agent Function ---
def interpret_dbs_parameters(current_programming: dict, proposed_programming: dict, patient_deltas: dict) -> dict:
    """
    Takes the state of the Bayesian Optimizer and patient changes, 
    runs the LangGraph agent, and returns a dictionary containing both 
    the raw output (with scratchpad) and the clean clinical UI output.
    """
    
    system_prompt = """You are a highly specialized clinical AI assistant for Deep Brain Stimulation (DBS) programming. 
    Your sole objective is to interpret the mathematical state of a Bayesian Optimization (BO) model and translate it into safe, actionable insights for a neurologist.

    # CORE CONSTRAINTS & GUARDRAILS
    1. DO NOT make medical diagnoses.
    2. DO NOT suggest parameter combinations that contradict the retrieved medical guidelines.
    3. IF the `search_medical_guidelines_impl` tool yields no results for a symptom, you MUST state: "No specific clinical guidelines were found in the database for this symptom." DO NOT use your general pre-trained knowledge to guess the anatomical cause.
    4. ALWAYS prioritize patient safety over mathematical optimization.

    # REASONING PROCESS
    Before generating your final output, you must think through the problem in a <scratchpad> block. 
    Analyze the parameter shifts, identify the BO's goal (exploration vs. exploitation), check the patient deltas, and plan your tool queries. 

    # REQUIRED OUTPUT FORMAT
    You MUST strictly output your response using the following markdown structure. Do not include conversational filler.

    <scratchpad>
    [Your internal logical reasoning and tool planning goes here. This will be hidden from the final user interface.]
    </scratchpad>

    ### 1. Mathematical & Physiological Rationale
    [Explain the BO's parameter changes. Is it exploring a high-uncertainty region or exploiting a known good region? What is the intended physiological effect?]

    ### 2. Clinical Considerations
    [Synthesize the patient's symptom deltas with the output of the `search_medical_guidelines_impl` tool. Warn the clinician of any anatomical risks.]

    ### 3. Grounding Confidence Score
    [Score: 0%, 50%, or 100%. Explain in one sentence how well the retrieved guidelines map to the patient's specific symptom and the proposed parameters.]
    """

    agent = create_react_agent(llm, tools=[search_medical_guidelines])
    
    # Construct the state payload
    state_payload = {
        "current_programming": current_programming,
        "proposed_programming": proposed_programming,
        "patient_deltas": patient_deltas
    }
    
    user_input = f"Evaluate this Bayesian optimizer output: {json.dumps(state_payload)}"
    final_raw_output = ""
    
    # Stream and capture the response while printing live
    for chunk in agent.stream({"messages": [SystemMessage(content=system_prompt), HumanMessage(content=user_input)]}):
        if "agent" in chunk:
            message = chunk["agent"]["messages"][0]
            text_chunk = ""
            
            # Robustly handle Gemini's potential list-based or string-based content
            if hasattr(message, "content"):
                if isinstance(message.content, list):
                    for item in message.content:
                        if isinstance(item, dict) and item.get("type") == "text":
                            text_chunk += item.get("text", "")
                elif isinstance(message.content, str):
                    text_chunk += message.content
            
            print(f"\n[🤖 Agent Responding...]\n")
            final_raw_output += text_chunk + "\n"
            
        elif "tools" in chunk:
            tool_message = chunk['tools']['messages'][0]
            print(f"\n[🔧 Agent triggered tool: '{tool_message.name}']")

    # --- Post-Processing: Strip the scratchpad for the UI ---
    # This regex removes the <scratchpad>...</scratchpad> block (including newlines)
    clean_ui_output = re.sub(r'<scratchpad>.*?</scratchpad>', '', final_raw_output, flags=re.DOTALL).strip()

    return {
        "raw_response": final_raw_output,
        "clean_ui_response": clean_ui_output
    }

# --- 5. Execution Example ---
if __name__ == "__main__":
    current = {"frequency": 130, "voltage": 2.5, "pulse_width": 60, "phase": 20}
    proposed = {"frequency": 140, "voltage": 2.7, "pulse_width": 50, "phase": 30}
    deltas = {
        "tremor_reduction": "+30%",
        "new_symptoms": ["Patient reports increased tingling in the right arm.", "Patient reports sleeping difficulties."]
    }

    print("Interpreting BO State...\n" + "="*50)
    
    # Run the function
    result = interpret_dbs_parameters(current, proposed, deltas)
    
    print("\n" + "="*50)
    print("FINAL OUTPUT FOR DOCTOR'S UI:")
    print("="*50)
    print(result["clean_ui_response"])
