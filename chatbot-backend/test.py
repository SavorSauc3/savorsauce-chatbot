from llama_cpp import Llama

llm = Llama(
    model_path="./models\Meta-Llama-3-8B-Instruct-abliterated-v3_q6.gguf",
    chat_format="llama-3",
    n_ctx=4096,
    n_threads=8,
    n_gpu_layers=-1,
)

output = llm.create_chat_completion(
    messages=[
        { "role": "system", "content": "You are a story writing assistant." },
        {
            "role": "user",
            "content": "Write a story about llamas."
        }
    ],
    stream=True
)

for chunk in output:
    delta = chunk['choices'][0]['delta']
    if 'role' in delta:
        print(delta['role'], end=': ')
    elif 'content' in delta:
        print(delta['content'], end='')