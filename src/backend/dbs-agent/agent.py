import os
import sys
import json
from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langgraph.prebuilt import create_react_agent
# Imports for RAG
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS

# 1. Load environment variables
load_dotenv("dbs-agent/agent.env")

# Read API key explicitly and fail fast if missing
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GOOGLE_API_KEY or GEMINI_API_KEY must be set in agent.env")

# 2. Initialize the LLM
llm = ChatGoogleGenerativeAI(
    model="models/gemini-2.5-flash",
    temperature=0, 
    max_retries=2,
    google_api_key=api_key,
) 

# NEW: Setup the Vector Database
def setup_vector_db():
    pdf_path = os.getenv("PDF_PATH", "dbs_guidelines.pdf")
    index_path = os.getenv("FAISS_INDEX_PATH", "faiss_index") # The folder where FAISS will save its data
    
    # Initialize the embedding model first (needed for both loading and creating)
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001", 
        google_api_key=api_key
    )

    # 1. Check if we already have a saved index on the hard drive
    if os.path.exists(index_path):
        print(f"Loading existing FAISS index from '{index_path}'...")
        
        # Note: LangChain requires allow_dangerous_deserialization=True 
        # when loading local pickle files for security reasons.
        vectorstore = FAISS.load_local(
            index_path, 
            embeddings, 
            allow_dangerous_deserialization=True 
        )
        
    # 2. If no saved index exists, create a new one from the PDF
    else:
        print(f"No local index found. Parsing '{pdf_path}' and creating new FAISS index...")
        if not os.path.exists(pdf_path):
            print(f"⚠️ Warning: '{pdf_path}' not found. Please place a PDF in the directory to use RAG.")
            return None

        # Load and split the PDF
        loader = PyPDFLoader(pdf_path)
        docs = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(docs)
        
        # Generate embeddings and store in FAISS
        vectorstore = FAISS.from_documents(splits, embeddings)
        
        # Save it locally for next time!
        vectorstore.save_local(index_path)
        print(f"Successfully saved new FAISS index to the '{index_path}' folder.")
        
    return vectorstore.as_retriever(search_kwargs={"k": 2})

# Initialize the retriever globally
retriever = setup_vector_db()

# 3. Define your Tools
def search_medical_guidelines_impl(symptom: str) -> str:
    """Use this helper to search the official DBS medical guidelines PDF for side effects or programming advice."""
    if not retriever:
        return f"System note: Could not search for '{symptom}' because no PDF vector database was initialized."
        
    print(f"\n[Searching Vector DB for: {symptom}]")
    retrieved_docs = retriever.invoke(symptom)
    formatted_context = "\n\n".join([doc.page_content for doc in retrieved_docs])
    
    if not formatted_context.strip():
        return "No relevant information found in the guidelines for this query."
        
    return f"Here is the relevant information extracted from the medical guidelines:\n{formatted_context}"

# Wrap the helper as a langchain tool for agent use
search_medical_guidelines = tool(search_medical_guidelines_impl)
tools = [search_medical_guidelines]

# 4. Define the IMPROVED System Prompt
system_prompt = """You are an expert clinical interpreter for a Bayesian DBS optimization model. 
Your objective is to translate the mathematical state of the model into clear, clinical insights for a neurologist.

You MUST strictly structure your response using EXACTLY these three markdown headers. Do not add conversational filler before or after.

### 1. Mathematical Rationale
Explain why the Bayesian model chose these parameters based on its acquisition function (e.g., exploring high uncertainty vs. exploiting high expected utility).

### 2. Patient Changes
Summarize the objective sensor data and subjective patient satisfaction changes since the last calibration. Highlight any stark contrasts.

### 3. Clinical Considerations
You MUST use the `search_medical_guidelines_impl` tool to look up any newly reported symptoms. 
Synthesize the tool's output with the parameter changes to provide actionable clinical advice (e.g., anatomical structures that might be affected)."""

# 5. Build the Agent using LangGraph
agent = create_react_agent(llm, tools=tools)

# 6. Simulate the Hand-off from your Bayesian Model
mock_bayesian_state = {
  "current_programming": {"frequency": 130, "voltage": 2.5, "pulse_width": 60},
  "proposed_programming": {"frequency": 140, "voltage": 2.7, "pulse_width": 50},
  "bayesian_rationale": "High expected improvement in tremor; low uncertainty in 2.5V region.",
  "patient_deltas": {
    "tremor_reduction": "+30%",
    "new_symptoms": ["Patient reports increased tingling in the right arm." ,"Patient reports sleeping difficulties."]
  }
}

# 7. Run the Agent
print("Thinking...\n" + "-"*40)
user_input = f"Here is the latest output from the Bayesian optimizer: {json.dumps(mock_bayesian_state)}. Please interpret this."

# Allow an offline mock interpreter for local testing
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
        message = chunk["agent"]["messages"][0]
        # Extract just the text content if it's a structured message
        if hasattr(message, "content"):
            content = message.content
            if isinstance(content, list):
                # Extract text from structured content
                for item in content:
                    if isinstance(item, dict) and item.get("type") == "text":
                        print(item.get("text", ""))
            elif isinstance(content, str):
                print(content)
        else:
            print(message)
    elif "tools" in chunk:
        tool_message = chunk['tools']['messages'][0]
        print(f"\n[🔧 Using tool: {tool_message.name}]")