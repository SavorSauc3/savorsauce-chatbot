import asyncio
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Body, Query, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import os
import json
import uuid
import uvicorn
import shutil
import subprocess
from llama_cpp import Llama

# Define paths and directories
conversations_dir = "conversations"
models_dir = "models"
model_metadata_file = os.path.join(models_dir, "model_metadata.json")
index_file = os.path.join(conversations_dir, "index.json")
settings_file_path = "app_settings.json"

# Ensure directories exist
os.makedirs(conversations_dir, exist_ok=True)
os.makedirs(models_dir, exist_ok=True)

# Initialize settings if file does not exist
if not os.path.exists(settings_file_path):
    settings = {
        "conversations_dir": conversations_dir,
        "models_dir": models_dir,
        "model_metadata_file": model_metadata_file,
        "index_file": index_file,
        "theme": "quartz",
        "default_model": {},
        "load_on_startup": False,
        "chat_params": {
            "system_prompt": "Your system prompt here",
            "temperature": 0.2,
            "top_p": 0.95,
            "top_k": 40
        }
    }
    with open(settings_file_path, 'w') as f:
        json.dump(settings, f, indent=2)

# Load settings from app_settings.json
with open(settings_file_path, 'r') as f:
    settings = json.load(f)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load settings again (redundant, removed in revised code)
# with open('app_settings.json', 'r') as f:
#     settings = json.load(f)

# Directories and settings
conversations_dir = settings['conversations_dir']
models_dir = settings['models_dir']
model_metadata_file = settings['model_metadata_file']
index_file = settings['index_file']

class LlamaModel(BaseModel):
    model_name: str
    use_cuda: bool
    n_gpu_layers: int
    context_length: int

# Models
current_model = LlamaModel(model_name="No model selected", use_cuda=False, n_gpu_layers=0, context_length=512)  # Changes to default on startup (if enabled)
default_model = settings['default_model']
load_on_startup = settings['load_on_startup']

llama_model = None

# Ensure the conversations directory and index file exist
os.makedirs(conversations_dir, exist_ok=True)
if not os.path.exists(index_file):
    with open(index_file, 'w') as f:
        json.dump({}, f)

if not os.path.exists(model_metadata_file):
    with open(model_metadata_file, 'w') as f:
        json.dump({}, f)

class Message(BaseModel):
    user: str
    text: str

class Conversation(BaseModel):
    name: str

class Theme(BaseModel):
    themePath: str

# Define a Pydantic model for the request body
class LoadOnStartupRequest(BaseModel):
    load_on_startup: bool

class DeleteModelRequest(BaseModel):
    path: str

class ChatParams(BaseModel):
    system_prompt: str = None
    temperature: float = 0.2
    top_p: float = 0.95
    top_k: int = 40

class FilePath(BaseModel):
    path: str

# CHAT PARAMETERS
chat_params = ChatParams(system_prompt=settings['chat_params']['system_prompt'])

@app.post("/update-theme")
async def update_theme(theme: Theme):
    try:
        # Read the current app settings
        with open(settings_file_path, "r") as f:
            app_settings = json.load(f)

        # Update the theme in the settings, storing it in lowercase
        app_settings["theme"] = theme.themePath.lower()

        # Write the updated settings back to the file
        with open(settings_file_path, "w") as f:
            json.dump(app_settings, f, indent=4)

        return {"message": "Theme updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update theme: {str(e)}")

@app.post("/load_from_path")
async def load_from_path(request: Request):
    data = await request.json()
    paths = data.get('paths', [])
    
    if not paths:
        raise HTTPException(status_code=400, detail="Paths are required")

    results = []

    with open(model_metadata_file, 'r+') as f:
        metadata = json.load(f)

    for path in paths:
        name = os.path.basename(path).split('.')[0]
        if name in metadata:
            results.append({"message": f"Model '{name}' already exists and was skipped."})
            continue
        try:
            # Update models.json file
            with open(model_metadata_file, 'r+') as f:
                metadata[name] = {"path": path}
                f.seek(0)
                json.dump(metadata, f, indent=2)
                f.truncate()

            results.append({"message": f"Model '{name}' loaded from path '{path}' successfully."})
        except Exception as e:
            print(e)
            raise HTTPException(status_code=500, detail=f"Failed to load model '{name}' from path '{path}': {str(e)}")
    
    return results

@app.post("/delete_model")
async def delete_model(request: DeleteModelRequest):
    path = request.path
    try:
        # Load the metadata file
        with open(model_metadata_file, 'r') as f:
            metadata = json.load(f)

        if path in metadata:
            model_data = metadata[path]
            model_path = model_data['path']

            # If model_path is None, delete the model directory from models_dir
            if model_path is None:
                model_path = os.path.join(models_dir, f"{path}.gguf")
                if os.path.exists(model_path):
                    shutil.rmtree(model_path)
            
            # Remove the entry from metadata
            del metadata[path]
            
            # Write the updated metadata back to the file
            with open(model_metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)

            return {"message": f"Model '{path}' deleted successfully."}
        else:
            raise HTTPException(status_code=404, detail=f"Model '{path}' not found in metadata")

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Failed to delete model '{path}': {str(e)}")

@app.post("/upload")
async def upload_model(files: list[UploadFile] = File(...)):
    with open(model_metadata_file, 'r') as f:
        metadata = json.load(f)

    for file in files:
        model_name = file.filename.split('.')[0]
        if model_name in metadata:
            continue
        file_location = Path(models_dir) / file.filename
        with open(file_location, "wb") as f:
            shutil.copyfileobj(file.file, f)
        metadata[model_name] = {"path": None}
    
    with open(model_metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    return {"message": "Files uploaded successfully!"}

@app.get("/current_theme", response_model=Theme)
async def get_current_theme():
    try:
        # Read the current app settings
        with open(settings_file_path, "r") as f:
            app_settings = json.load(f)

        # Get the current theme from the settings
        theme_path = app_settings.get("theme")
        
        if not theme_path:
            raise HTTPException(status_code=404, detail="Theme not found")

        return {"themePath": theme_path}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Failed to fetch current theme: {str(e)}")
    
@app.get("/chat_params", response_model=ChatParams)
async def get_chat_params():
    return chat_params

@app.put("/chat_params", response_model=ChatParams)
async def edit_chat_params(params: ChatParams):
    global chat_params
    chat_params = params

    # Update the settings in app_settings.json
    with open('app_settings.json', 'r') as settings_file:
        settings = json.load(settings_file)

    settings['chat_params']['system_prompt'] = chat_params.system_prompt

    with open('app_settings.json', 'w') as settings_file:
        json.dump(settings, settings_file)

    return chat_params


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

def initialize_metadata_file():
    # Initialize an empty metadata file if it doesn't exist
    with open(model_metadata_file, 'w') as json_file:
        json.dump({}, json_file)

# Initialize the LLAMA model
def init_model(model_name, use_cuda, n_gpu_layers, context_length):
    global current_model

    # Check if model metadata exists in the JSON file
    if not os.path.exists(model_metadata_file):
        initialize_metadata_file()
    
    with open(model_metadata_file, 'r') as json_file:
        metadata = json.load(json_file)

    # Initialize the model path based on metadata
    if model_name in metadata and 'path' in metadata[model_name] and metadata[model_name]['path'] is not None:
        model_path = metadata[model_name]['path']
    else:
        model_path = f"./{models_dir}/{model_name}.gguf"

    # Check if model path exists
    if not os.path.exists(model_path):
        raise ValueError(f"Model path '{model_path}' does not exist.")

    # Initialize the model with appropriate arguments
    model_kwargs = {
        "model_path": model_path,
        "verbose": True
    }

    if use_cuda:
        model_kwargs["n_gpu_layers"] = n_gpu_layers if n_gpu_layers is not None else -1

    if context_length is not None:
        model_kwargs["n_ctx"] = context_length

    model = Llama(**model_kwargs)

    current_model = LlamaModel(model_name=model_name,
                               use_cuda=use_cuda,
                               n_gpu_layers= 0 if n_gpu_layers is None else n_gpu_layers,
                               context_length=context_length)
    
    if not get_metadata(model_name):
        model_metadata = model.metadata

        # Convert string numbers to integers
        model_metadata = convert_strings_to_ints(model_metadata)

        # Check if metadata already exists and only update non-path attributes
        if model_name in metadata:
            existing_metadata = metadata[model_name]
            if 'path' in existing_metadata:
                model_metadata['path'] = existing_metadata['path']

        # Update metadata
        metadata[model_name] = model_metadata

        # Write updated metadata back to the file
        with open(model_metadata_file, 'w') as json_file:
            json.dump(metadata, json_file, indent=2)

    return model

def convert_strings_to_ints(d):
    """
    Recursively convert string representations of numbers to integers in a dictionary.
    """
    for key, value in d.items():
        if isinstance(value, str) and value.isdigit():
            d[key] = int(value)
        elif isinstance(value, dict):
            d[key] = convert_strings_to_ints(value)
    return d


def get_metadata(model_name):
    try:
        with open(model_metadata_file, 'r') as json_file:
            metadata = json.load(json_file)
            model_metadata = metadata.get(model_name, None)
            
            if model_metadata and len(model_metadata) == 1 and 'path' in model_metadata:
                return None  # Return None if only 'path' attribute exists
            
            return model_metadata
        
    except FileNotFoundError:
        return None

@app.get("/{model_name}/metadata")
async def get_model_metadata(model_name: str):
    model_metadata = get_metadata(model_name)
    return model_metadata

# Load the model once during startup
if load_on_startup:
    llama_model = init_model(model_name=settings['model_name'], use_cuda=settings['use_cuda'], n_gpu_layers=settings['n_gpu_layers'], context_length=settings['context_length'])

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

@app.put("/settings/load_on_startup")
async def set_load_on_startup(request: LoadOnStartupRequest):
    global load_on_startup
    load_on_startup = request.load_on_startup
    with open('app_settings.json', 'r') as settings_file:
        settings = json.load(settings_file)
    settings['load_on_startup'] = load_on_startup
    with open('app_settings.json', 'w') as settings_file:
        json.dump(settings, settings_file)
    return {"load_on_startup": load_on_startup}

@app.get("/settings/load_on_startup")
async def get_load_on_startup():
    global load_on_startup
    return {"load_on_startup": load_on_startup}

@app.post("/default_model/{model_name}")
async def edit_default_model(model_name: str, use_cuda: bool = False, n_gpu_layers: int = Query(None), context_length: int = Query(None)):
    global default_model
    default_model = {
        "model_name": model_name,
        "use_cuda": use_cuda,
        "n_gpu_layers": n_gpu_layers,
        "context_length": context_length
    }
    with open('app_settings.json', 'r') as settings_file:
        settings = json.load(settings_file)
    settings['default_model'] = default_model
    with open('app_settings.json', 'w') as settings_file:
        json.dump(settings, settings_file)
    return {"default_model": default_model}

@app.get("/default_model")
async def get_default_model():
    global default_model
    return {"default_model": default_model}

@app.get("/current_model")
async def get_current_model():
    return {"current_model": current_model, "model_metadata": get_metadata(current_model.model_name)}

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
    
    # Calculate the total length of all messages
    total_length = sum(message['length'] for message in conversation['messages'])
    
    # Add total_length to the response
    response = {
        "conversation": conversation,
        "total_length": total_length
    }
    
    return response

@app.get("/models")
async def list_models():
    try:
        with open(model_metadata_file, 'r') as f:
            metadata = json.load(f)
        
        # Extract model names from metadata keys where path attribute is None or path exists
        model_names_to_remove = []
        model_names = []
        
        for model_name, model_data in metadata.items():
            if model_data['path'] is None:
                default_path = f"./{models_dir}/{model_name}.gguf"
                if os.path.exists(default_path):
                    model_names.append(model_name)
                else:
                    model_names_to_remove.append(model_name)
            elif os.path.exists(model_data['path']):
                model_names.append(model_name)
            else:
                model_names_to_remove.append(model_name)

        # Remove entries from metadata
        for model_name in model_names_to_remove:
            del metadata[model_name]

        # Write updated metadata back to the file if any entries were removed
        if len(model_names_to_remove) > 0:
            with open(model_metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
        
        return model_names
    
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Failed to list models")

@app.get("/check_cuda")
async def check_cuda():
    try:
        cuda_installed = is_cuda_installed()
        return {"cuda_installed": cuda_installed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check CUDA installation: {str(e)}")

def is_cuda_installed():
    try:
        result = subprocess.run(['nvcc', '--version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode == 0:
            return True
        else:
            return False
    except FileNotFoundError:
        # nvcc command is not found
        return False

@app.post("/set_model/{model_name}")
async def set_model(model_name: str, use_cuda: bool = False, n_gpu_layers: int = Query(None), context_length: int = Query(None)):
    global llama_model
    llama_model = init_model(model_name=model_name, use_cuda=use_cuda, n_gpu_layers=n_gpu_layers, context_length=context_length)
    return {"message": f"LLAMA model set to {model_name}"}

@app.post("/eject-model")
async def eject_model():
    global llama_model, current_model
    try:
        # Check if llama_model exists
        if llama_model is None:
            raise HTTPException(status_code=400, detail="No model to eject from memory.")

        # Simulate the model ejection
        llama_model = None
        current_model = None
        return {"message": "Model successfully ejected from memory"}
    
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"Failed to eject model: {str(e)}")


@app.post("/conversations/{conversation_id}/messages/user")
async def add_user_message(conversation_id: str, message: Message):
    filename = get_conversation_filename(conversation_id)
    file_path = os.path.join(conversations_dir, filename)
    with open(file_path, 'r') as f:
        conversation = json.load(f)

    message_length = count_prompt_tokens(llama_model, message.text)

    conversation["messages"].append({"user": message.user, "text": message.text, "length": message_length})

    with open(file_path, 'w') as f:
        json.dump(conversation, f)
    return conversation

async def async_generator(generator):
    for item in generator:
        await asyncio.sleep(0)  # Yield control to the event loop
        yield item

def count_prompt_tokens(model: Llama, text: str):
    tokenized_text = model.tokenize(text.encode('utf-8'))
    prompt_length = len(tokenized_text)
    return prompt_length

@app.get("/conversations/{conversation_id}/tokens")
async def get_total_tokens(conversation_id: str):
    filename = get_conversation_filename(conversation_id)
    file_path = os.path.join(conversations_dir, filename)
    
    with open(file_path, 'r') as f:
        conversation = json.load(f)
    
    # Calculate the total length of all messages
    total_length = sum(message['length'] for message in conversation['messages'])

    return total_length


@app.websocket("/ws/conversations/{conversation_id}/messages/ai")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    global chat_params
    await websocket.accept()
    user_message_queue = asyncio.Queue()  # Queue to hold user messages
    is_generating = False
    generation_type = None
    global_message_index = None
    bot_response_text = ""  # To store the in-progress bot response

    async def handle_message(message):
        nonlocal generation_type, is_generating
        if message.get('action') == 'message':
            print("Recieved message from user")
            await user_message_queue.put(message['content'])
        elif message.get('action') == 'stop_generation':
            print("Recieved stop generation signal")
            is_generating = False
        elif message.get('action') == 'regenerate':
            generation_type = 'regenerate'
            print("Recieved regenerate signal")
            await regenerate_message(message['messageIndex'])

    async def regenerate_message(message_index):
        nonlocal is_generating, bot_response_text, generation_type, global_message_index
        filename = get_conversation_filename(conversation_id)
        file_path = os.path.join(conversations_dir, filename)
        global_message_index = message_index
        with open(file_path, 'r') as f:
            conversation = json.load(f)

        formatted_messages = [{"role": "system", "content": chat_params.system_prompt}]
        for idx, msg in enumerate(conversation["messages"][:message_index]):
            role = "user" if msg["user"] != "bot" else "assistant"
            formatted_messages.append({"role": role, "content": msg["text"]})

        try:
            llama_response = llama_model.create_chat_completion(messages=formatted_messages,
                                                                temperature=chat_params.temperature,
                                                                top_p=chat_params.top_p,
                                                                top_k=chat_params.top_k,
                                                                stream=True)
            bot_response_text = ""
            is_generating = True
            async for chunk in async_generator(llama_response):
                if not is_generating:
                        break
                delta = chunk['choices'][0]['delta']
                if 'content' in delta:
                    bot_response_text += delta['content']
                    await websocket.send_text(delta['content'])

            
            message_length = count_prompt_tokens(llama_model, bot_response_text)
            # Overwrite the previous message at the specified index
            conversation["messages"][message_index] = {"user": "bot", "text": bot_response_text, "length": message_length}
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

            formatted_messages = [{"role": "system", "content": chat_params.system_prompt}]
            for idx, msg in enumerate(conversation["messages"][:-1]):
                role = "user" if msg["user"] != "bot" else "assistant"
                formatted_messages.append({"role": role, "content": msg["text"]})
            formatted_messages.append({"role": "user", "content": user_input})

            try:
                llama_response = llama_model.create_chat_completion(messages=formatted_messages,
                                                                temperature=chat_params.temperature,
                                                                top_p=chat_params.top_p,
                                                                top_k=chat_params.top_k,
                                                                stream=True)
                bot_response_text = ""
                is_generating = True
                async for chunk in async_generator(llama_response):
                    if not is_generating:
                        break
                    delta = chunk['choices'][0]['delta']
                    if 'content' in delta:
                        bot_response_text += delta['content']
                        await websocket.send_text(delta['content'])

                message_length = count_prompt_tokens(llama_model, bot_response_text)
                # Save the LLM message to the conversation even if stopped
                conversation["messages"].append({"user": "bot", "text": bot_response_text, "length": message_length})
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
        if not generation_type:
            message_handler_task = asyncio.create_task(process_user_messages())
        elif generation_type == 'regenerate':
            message_handler_task = asyncio.create_task(regenerate_message())
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
                message_length = count_prompt_tokens(llama_model, bot_response_text)
                conversation["messages"].append({"user": "bot", "text": bot_response_text, "length": message_length})
            elif generation_type == 'regenerate':
                message_length = count_prompt_tokens(llama_model, bot_response_text)
                conversation["messages"][global_message_index] = {"user": "bot", "text": bot_response_text, "length": message_length}
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
    message_length = count_prompt_tokens(llama_model, message.text)
    conversation["messages"][message_index] = {"user": message.user, "text": message.text, "length": message_length}
    
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
