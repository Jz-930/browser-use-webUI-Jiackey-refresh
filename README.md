# Browser-Use WebUI: The 100% Self-Hosted Proxy Edition

This repository is an enhanced, robust modification of the standard [Browser-Use WebUI](https://github.com/browser-use/web-ui), specifically optimized and hardened for users who wish to deploy powerful open-weights agents (like **Google Gemma-4**, **DeepSeek**, or **Qwen**) on their *own* private hardware, such as a **RunPod H100**, instead of relying on expensive corporate APIs.

> **Why this fork?** The standard application defaults heavily to OpenAI and Anthropic endpoint architectures. We have surgically modified the `openai` adapter logic underneath to function as a **Universal Plug**, suppressing internal `gpt-4o` tracking/vision fallbacks that traditionally break custom hosted models. This prevents `404` proxy loops when routing data back home.

---

## 🌟 Key Features

1. **True Autonomous Failsafe**: Stripped out hidden secondary LLM calls that historically panic unverified API keys, allowing standard HTTP tunnels via the `openai` shape.
2. **First-Class Open-Weight Support**: Tuned to directly embrace UI routing for multi-billion parameter arrays (including `google/gemma-4-31b-it` and heavily customized logic backends).
3. **No External Leaks**: Send DOMs and agent logs to *your* hosted server without giving third parties a scrape.

---

## 🚀 How to Use It

### 1. Build Your Own Brain (vLLM Backend)
First, you'll need the "engine". Rent a high-performance slice on a provider like RunPod (e.g. an H100 GPU) and start it using the `vLLM` proxy method. 
It helps to set a strong custom key limit. Example boot argument for Gemma 4:
```bash
python3 -m vllm.entrypoints.openai.api_server \
  --model google/gemma-4-31b-it \
  --quantization fp8 \
  --max-model-len 262144 \
  --limit-mm-per-prompt '{"image": 2}'
```
Remember to save your provided proxy/IP address (e.g., `https://[YOUR_INSTANCE_ID]-8000.proxy.runpod.net/v1`).

### 2. Connect the UI
1. Install the environment on your local Windows/Mac PC.
   ```bash
   npm install
   npm run start
   ```
2. When the Gradio Web UI emerges, look to the Left Panel.
3. Keep the Provider as `openai` (This is our universal adapter shape).
4. Fill in:
   - **Model Name:** Type the exact model architecture you loaded earlier (e.g. `google/gemma-4-31b-it`).
   - **Base URL:** Paste your custom proxy endpoint here.
   - **API Key:** Paste your secure password.

### 3. About the "Planner" (Optional)
If you decide you do not need the planner, simply delete the entry in the Planner LLM Provider. Our hardened codebase guarantees it will dynamically shrink and default back to your master model without secretly bouncing default fallback payloads into the void.

---

## 🛠 Generic Adaptation
If you decide you no longer want to use RunPod or you purchase your own local homelab rig, nothing in this project locks you into Cloud usage. Change your **Base URL** in the Gradio UI from the `.runpod.net` wrapper to your localized API loopback `http://localhost:8000/v1` and keep working seamlessly!

## 📜 Acknowledgements
Original system architecture based on [Browser-Use](https://github.com/browser-use/browser-use) community repositories, fortified for ultimate privacy enthusiasts.
