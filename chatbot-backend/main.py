import asyncio
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Body
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

async def async_generator(generator):
    for item in generator:
        await asyncio.sleep(0)
        yield item

@app.websocket("/ws/conversations/{conversation_id}/messages/ai")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    await websocket.accept()
    user_message_queue = asyncio.Queue()  # Queue to hold user messages
    is_generating = False
    generation_type = None
    global_message_index = None
    bot_response_text = ""  # To store the in-progress bot response

    async def handle_message(message):
        if message.get('action') == 'message':
            await user_message_queue.put(message['content'])
        elif message.get('action') == 'stop_generation':
            nonlocal is_generating
            is_generating = False
        elif message.get('action') == 'regenerate':
            await regenerate_message(message['messageIndex'])

    async def regenerate_message(message_index):
        nonlocal is_generating, bot_response_text, generation_type, global_message_index
        filename = get_conversation_filename(conversation_id)
        file_path = os.path.join(conversations_dir, filename)
        generation_type = 'regenerate'
        global_message_index = message_index
        with open(file_path, 'r') as f:
            conversation = json.load(f)

        formatted_messages = [{"role": "system", "content": system_prompt}]
        for idx, msg in enumerate(conversation["messages"][:message_index]):
            role = "user" if msg["user"] != "bot" else "assistant"
            formatted_messages.append({"role": role, "content": msg["text"]})

        try:
            llama_response = llama_model.create_chat_completion(messages=formatted_messages, stream=True)
            bot_response_text = ""
            is_generating = True
            async for chunk in async_generator(llama_response):
                if not is_generating:
                    break
                delta = chunk['choices'][0]['delta']
                if 'content' in delta:
                    bot_response_text += delta['content']
                    await websocket.send_text(delta['content'])

            # Overwrite the previous message at the specified index
            conversation["messages"][message_index] = {"user": "bot", "text": bot_response_text}
            with open(file_path, 'w') as f:
                json.dump(conversation, f)

            if is_generating:
                await websocket.send_text('GENERATION_COMPLETE')
                bot_response_text = None
            else:
                await websocket.send_text('GENERATION_STOPPED')
                bot_response_text = None
            is_generating = False

        except Exception as e:
            await websocket.send_text(f"Failed to get response from LLAMA: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get response from LLAMA: {e}")

    async def process_user_messages():
        nonlocal is_generating, bot_response_text, generation_type
        generation_type = 'response'
        while True:
            user_input = await user_message_queue.get()

            filename = get_conversation_filename(conversation_id)
            file_path = os.path.join(conversations_dir, filename)
            with open(file_path, 'r') as f:
                conversation = json.load(f)

            formatted_messages = [{"role": "system", "content": system_prompt}]
            for idx, msg in enumerate(conversation["messages"][:-1]):
                role = "user" if msg["user"] != "bot" else "assistant"
                formatted_messages.append({"role": role, "content": msg["text"]})
            formatted_messages.append({"role": "user", "content": user_input})

            try:
                llama_response = llama_model.create_chat_completion(messages=formatted_messages, stream=True)
                bot_response_text = ""
                is_generating = True
                async for chunk in async_generator(llama_response):
                    if not is_generating:
                        break
                    delta = chunk['choices'][0]['delta']
                    if 'content' in delta:
                        bot_response_text += delta['content']
                        await websocket.send_text(delta['content'])

                # Save the LLM message to the conversation even if stopped
                conversation["messages"].append({"user": "bot", "text": bot_response_text})
                with open(file_path, 'w') as f:
                    json.dump(conversation, f)

                if is_generating:
                    await websocket.send_text('GENERATION_COMPLETE')
                    bot_response_text = None
                else:
                    await websocket.send_text('GENERATION_STOPPED')
                    bot_response_text = None
                is_generating = False

            except Exception as e:
                await websocket.send_text(f"Failed to get response from LLAMA: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to get response from LLAMA: {e}")

    try:
        message_handler_task = asyncio.create_task(process_user_messages())
        while True:
            data = await websocket.receive_text()
            if not data:
                continue
            try:
                message = json.loads(data)
                await handle_message(message)
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON: {e}")
                await websocket.send_text(f"Error decoding JSON: {e}")

    except WebSocketDisconnect:
        print(f"WebSocket disconnected")
    finally:
        message_handler_task.cancel()

        # Save the in-progress bot response when the WebSocket closes
        if bot_response_text:
            filename = get_conversation_filename(conversation_id)
            file_path = os.path.join(conversations_dir, filename)
            with open(file_path, 'r') as f:
                conversation = json.load(f)
            if generation_type == 'response':
                conversation["messages"].append({"user": "bot", "text": bot_response_text})
            elif generation_type == 'regenerate':
                conversation["messages"][global_message_index] = {"user": "bot", "text": bot_response_text}
            with open(file_path, 'w') as f:
                json.dump(conversation, f)
        print(f"Saved in-progress bot response to conversation {conversation_id}")

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

@app.put("/conversations/{conversation_id}/messages/{message_index}")
async def edit_message(conversation_id: str, message_index: int, message: Message = Body(...)):
    filename = get_conversation_filename(conversation_id)
    file_path = os.path.join(conversations_dir, filename)
    
    with open(file_path, 'r') as f:
        conversation = json.load(f)
    
    if message_index < 0 or message_index >= len(conversation["messages"]):
        raise HTTPException(status_code=400, detail="Invalid message index")
    
    conversation["messages"][message_index] = {"user": message.user, "text": message.text}
    
    with open(file_path, 'w') as f:
        json.dump(conversation, f)
    
    return conversation

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
