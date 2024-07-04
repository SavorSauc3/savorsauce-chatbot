# About SavorSauce Chatbot
I built this project because I was dissatisfied with many open source aternatives to ChatGPT. Many of them just shove all of the technical things in your face, which may be fine for many people, but I found to be visually displeasing. The other more visually pleasing alternatives made it difficult to edit parameters. This project is more of a middle ground, where the main window is more visually pleasing, while the technical details are not out of reach, and can be easily accessed through various means *Such as the settings panel*.

# Setup (For Developers)
- Clone the repo with `git clone https://github.com/SavorSauc3/savorsauce-chatbot.git` and open up terminal in the directory it creates
- Create a new python environment with `python -m venv chatbot` and activate it using `./chatbot/Scripts/activate`
- Install the dependencies using `pip install -r requirements.txt` **Note: If you want to use GPU with Luminaria, you need to install a specific version of llama-cpp-python so use this command first**
```
pip install llama-cpp-python \
  --index-url https://abetlen.github.io/llama-cpp-python/whl/<cuda-version> // Ex: cu121 for CUDA 12.1
```
- If cloning the repository, you will need to open two terminal windows. First navigate to chatbot-backend directory and type "python main.py" to start up the backend
- Next, use the second terminal window to navigate to chatbot-backend, type "npm start" to open the frontend in the browser

# Building
- To build the app, you first need to compile the main.py into an executable
- Navigate to the chatbot-backend directory and use this command `pyinstaller main.spec`
- After the .exe finishes building, move the build and dist folders to `chatbot-frontend\src\main\bin`
- Now navigate back to chatbot-frontend and use the command `npm run package`
- To distribute, you can use the **Luminaria Setup** file in the dist folder after it builds

# Roadmap
- **Executable Electron Application**: No need to use any command line, or know and technical details! (Complete)
- **Enhanced Search Abilitites** to bypass the llm knowledge cutoff, and recieve more useful information the AI was untrained on (To Do)
- **Advanced Mathematical Computational Ability** using LaTeX to process difficult mathematical equations (To Do)
- **RAG (Retrieval Augmented Generation)** so that the LLM can really get to know you, and your data (To Do)

# Security
- **Your data is entirely private**: This codebase is entirely decentralized, and none of your data will be sent to any private servers to be sold off.
