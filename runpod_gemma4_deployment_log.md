# Backend Engineering Log: Local Browser-Use to Private RunPod H100 (Gemma 4 31B)
**Date:** April 23, 2026
**Objective:** Replace costly external LLM providers (e.g., OpenAI, Google Cloud) by deploying a self-hosted, private Google Gemma-4-31b-it model on a RunPod H100 instance, and intercept the Browser-Use desktop client's LLM engine to route all requests securely to the private proxy.

## 1. RunPod Infrastructure Deployment (Backend)
- **Hardware:** 1x RunPod H100 80GB SXM instance.
- **Persistent Storage:** Mapped `/workspace` volume (150GB) to retain `HF_HOME` downloaded model weights across pod reboots to save bandwidth and startup latency.
- **Engine Container:** Utilized the `vLLM` high-performance inference engine image.
- **Model Chosen:** `google/gemma-4-31b-it` (A state-of-the-art open-weights model capable of multimodal parsing and complex reasoning required by Browser-Use).

### vLLM Boot Arguments
The container was executed using carefully tuned arguments customized for Browser Use:
```bash
python3 -m vllm.entrypoints.openai.api_server \
  --model google/gemma-4-31b-it \
  --quantization fp8 \
  --max-model-len 262144 \
  --limit-mm-per-prompt '{"image": 2}'
```
- **`--quantization fp8`:** Reduced precision allowed the 31B parameter model to fit comfortably within the 80GB VRAM pool while leaving overhead for the KV cache.
- **`--max-model-len 262144`:** Enabled 256K long-context lengths. This is critical for Browser-Use, which often injects massive accessibility tree (DOM) string representations into the system prompt.
- **`--limit-mm-per-prompt`:** Explicitly authorized multimodal vision processing (up to 2 image tokens per prompt), enabling the model to parse standard screenshots captured by the Chromium proxy.

### Network Gateway & Security
- vLLM exposed its HTTP port at `8000`.
- Authentication was hardcoded via environment variable: `VLLM_API_KEY=[YOUR_PRIVATE_KEY]`. 
- RunPod automatically spawned a TLS-bearing proxy gateway for port 8000 (e.g., `https://[ID]-8000.proxy.runpod.net`). The exact `/v1` suffix was required to mimic the OpenAI spec perfectly.

## 2. Desktop Application Configuration (Frontend WebUI)
Browser-Use is engineered heavily around the LangChain ecosystem. To route traffic into our customized infrastructure, we leveraged the **OpenAI Protocol Adapter Strategy**.

- **Why OpenAI Provider Interface?** The Google or Anthropic SDKs strictly enforce routing data to their corporate servers. By using the `langchain-openai` interface, we took advantage of its configuration flexibility (`base_url`). Since vLLM natively mimics an OpenAI API structure (`/v1/chat/completions`), passing an overwritten proxy address completely redirected the request pool to the H100.
- **Configuration Bindings:** 
   - **Provider:** `openai`
   - **Base URL:** `https://[ID]-8000.proxy.runpod.net/v1`
   - **Model Name:** `google/gemma-4-31b-it`
   - **API Key:** Custom token defined earlier.

## 3. The `gpt-4o` 404 Routing Bug Analysis
Despite successful connection tests to the main model (returning HTTP 200 OK), the Browser-Use Agent's "Planner" fallback module crashed, yielding a `404 Not Found` (Error: The model `gpt-4o` does not exist on this server).

### Root Cause
- Gradio's standard Dropdown behaviors inside the WebUI automatically seeded default fallback arrays (where `gpt-4o` is index `[0]` in the `openai` provider dictionary).
- Upon modifying configurations for the multi-agent system (`BrowserUseAgent` initializes a Main LLM, an Extraction LLM, and an optional Planner LLM), uninstantiated variables would inherit the library's hardcoded fallback state (`gpt-4o`), bypassing user string inputs if `Enter` actions were interrupted during state changes.
- Because `gpt-4o` weights did not exist in the vLLM manifest on the H100, the RunPod rejected the generation request, violently collapsing the orchestrator.

### Engineering Solution
Instead of fighting the UI dropdown mechanics, we eradicated the disease at its source code. 

1. **`llm_provider.py` Override:** 
   Modified the LangChain bridge constructor `get_llm_model` to enforce `kwargs.get("model_name", "google/gemma-4-31b-it")`. This guaranteed that any lost variables would implicitly default to Gemma rather than OpenAI's payload string.
2. **`config.py` Defaults Re-prioritization:** 
   Injected `"google/gemma-4-31b-it"` directly into the `openai` tuple array at index `0`. This structurally prevented the UI logic from ever rendering `gpt-4o` as an invisible pre-populated fallback, aligning the software perfectly with our customized H100 endpoint.

## 4. Final Assessment
The system is now fully unlocked. The "OpenAI Adapter" method applied to a customized local codebase ensures that any custom, uncensored, or exploratory model (DeepSeek, LLaMa, or private proprietary variants) can be hot-swapped onto the H100 and autonomously control the machine's browsers without hitting restrictive corporate firewalls.
