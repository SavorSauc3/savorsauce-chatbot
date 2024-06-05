from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import uuid
import uvicorn
from llama_cpp import Llama

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
conversations_dir = "conversations"
models_dir = "models"
index_file = os.path.join(conversations_dir, "index.json")

# Models
current_model = None  # Changes to default on startup
default_model = "Meta-Llama-3-8B-Instruct-abliterated-v3_q6.gguf"

# Prompts
system_prompt = "You are a sentient, superintelligent artificial general intelligence, here to teach and assist me."

# Ensure the conversations directory and index file exist
os.makedirs(conversations_dir, exist_ok=True)
if not os.path.exists(index_file):
    with open(index_file, 'w') as f:
        json.dump({}, f)

class Message(BaseModel):
    user: str
    text: str

class Conversation(BaseModel):
    name: str

def read_index():
    with open(index_file, 'r') as f:
        return json.load(f)

def write_index(index):
    with open(index_file, 'w') as f:
        json.dump(index, f)

def get_conversation_filename(conversation_id):
    index = read_index()
    filename = index.get(str(conversation_id))
    if filename is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return filename

def is_conversation_name_taken(name):
    index = read_index()
    for filename in index.values():
        file_path = os.path.join(conversations_dir, filename)
        with open(file_path, 'r') as f:
            conversation = json.load(f)
            if conversation["name"] == name:
                return True
    return False

# Initialize the LLAMA model
def init_model(model_name=default_model):
    global current_model
    current_model = model_name
    return Llama(model_path=f"./models/{model_name}")

# Load the model once during startup
llama_model = init_model()

@app.post("/conversations")
async def create_conversation():
    index = read_index()
    new_id = str(uuid.uuid4())
    filename = f"conversation_{new_id}.json"
    file_path = os.path.join(conversations_dir, filename)
    conversation = {"id": new_id, "name": f"conversation_{new_id}", "messages": []}
    with open(file_path, 'w') as f:
        json.dump(conversation, f)
    index[new_id] = filename
    write_index(index)
    return conversation

@app.get("/default_model")
async def get_default_model():
    return {"default_model": default_model}

@app.get("/conversations")
async def list_conversations():
    index = read_index()
    conversations = []
    for conversation_id, filename in index.items():
        try:
            with open(os.path.join(conversations_dir, filename), 'r') as f:
                conversation = json.load(f)
                conversations.append({"id": conversation["id"], "name": conversation["name"]})
        except json.JSONDecodeError:
            print(f"File {filename} is not a valid JSON")
    return conversations

@app.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    print(conversation_id)
    filename = get_conversation_filename(conversation_id)
    file_path = os.path.join(conversations_dir, filename)
    with open(file_path, 'r') as f:
        conversation = json.load(f)
    return conversation

@app.get("/models")
async def list_models():
    models = []
    for filename in os.listdir(models_dir):
        if filename.endswith(".gguf"):
            models.append(filename)
    return models

@app.post("/set_model/{model_name}")
async def set_model(model_name: str):
    global llama_model
    llama_model = init_model(model_name=model_name)
    return {"message": f"LLAMA model set to {model_name}"}

@app.post("/conversations/{conversation_id}/messages/user")
async def add_user_message(conversation_id: str, message: Message):
    filename = get_conversation_filename(conversation_id)
    file_path = os.path.join(conversations_dir, filename)
    with open(file_path, 'r') as f:
        conversation = json.load(f)

    conversation["messages"].append({"user": message.user, "text": message.text})

    with open(file_path, 'w') as f:
        json.dump(conversation, f)
    return conversation

@app.post("/conversations/{conversation_id}/messages/ai")
async def generate_ai_response(conversation_id: str, message: Message):
    filename = get_conversation_filename(conversation_id)
    file_path = os.path.join(conversations_dir, filename)
    with open(file_path, 'r') as f:
        conversation = json.load(f)

    # Format the conversation for llm.create_chat_completion
    formatted_messages = [{"role": "system", "content": system_prompt}]
    for msg in conversation["messages"]:
        role = "user" if msg["user"] != "bot" else "assistant"
        formatted_messages.append({"role": role, "content": msg["text"]})
    
    # Generate a response using the LLAMA model
    try:
        llama_response = llama_model.create_chat_completion(messages=formatted_messages)
        print(llama_response)
        bot_response_text = llama_response["choices"][0]["message"]["content"]
        print(bot_response_text)
        
        # Add bot's response to the conversation
        conversation["messages"].append({"user": "bot", "text": bot_response_text})
    except Exception as e:
        # If an error occurs during response generation, raise an HTTPException
        print(e)
        raise HTTPException(status_code=500, detail=f"Failed to get response from LLAMA: {e}")

    with open(file_path, 'w') as f:
        json.dump(conversation, f)
    return conversation

@app.put("/conversations/{conversation_id}/rename")
async def rename_conversation(conversation_id: str, conversation: Conversation):
    if is_conversation_name_taken(conversation.name):
        raise HTTPException(status_code=400, detail="Conversation name already exists")
    
    index = read_index()
    filename = index.get(conversation_id)
    if not filename:
        raise HTTPException(status_code=404, detail="Conversation not found")

    old_file_path = os.path.join(conversations_dir, filename)
    new_filename = f"{conversation.name}.json"
    new_file_path = os.path.join(conversations_dir, new_filename)
    
    if os.path.exists(new_file_path):
        raise HTTPException(status_code=400, detail="Conversation name already exists")
    
    os.rename(old_file_path, new_file_path)
    index[conversation_id] = new_filename
    write_index(index)
    
    # Load the conversation to update the name
    with open(new_file_path, 'r') as f:
        conv_data = json.load(f)
    conv_data['name'] = conversation.name

    with open(new_file_path, 'w') as f:
        json.dump(conv_data, f)

    return {"id": conversation_id, "name": conversation.name}

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    filename = get_conversation_filename(conversation_id)
    file_path = os.path.join(conversations_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    os.remove(file_path)

    # Remove conversation from index
    index = read_index()
    del index[conversation_id]
    write_index(index)

    return {"message": "Conversation deleted successfully"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)