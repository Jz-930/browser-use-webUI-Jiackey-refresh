# Backend Engineering Log: Local Browser-Use to Private RunPod H100 (Gemma 4 31B)
# 后端工程日志：本地 Browser-Use 连接至私有 RunPod H100 (Gemma 4 31B)

**Date / 日期:** April 23, 2026
**Objective / 目标:** 
Replace costly external LLM providers (e.g., OpenAI, Google Cloud) by deploying a self-hosted, private Google Gemma-4-31b-it model on a RunPod H100 instance, and intercept the Browser-Use desktop client's LLM engine to route all requests securely to the private proxy.
通过在 RunPod H100 实例上部署私有的、自托管的 Google Gemma-4-31b-it 模型来替代昂贵的外部 LLM 提供商（如 OpenAI、Google Cloud），并拦截 Browser-Use 桌面端客户端的 LLM 引擎，将所有请求安全地路由至私有代理。

---

## 1. RunPod Infrastructure Deployment (Backend) / RunPod 基础设施部署（后端）
- **Hardware / 硬件:** 1x RunPod H100 80GB SXM instance (实例).
- **Persistent Storage / 持久化存储:** Mapped `/workspace` volume (150GB) to retain `HF_HOME` downloaded model weights across pod reboots to save bandwidth and startup latency.
  映射 `/workspace` 卷 (150GB)，以在 Pod 重启期间保留 `HF_HOME` 下载的模型权重，从而节省带宽并降低启动延迟。
- **Engine Container / 引擎容器:** Utilized the `vLLM` high-performance inference engine image.
  使用了 `vLLM` 高性能推理引擎镜像。
- **Model Chosen / 所选模型:** `google/gemma-4-31b-it` (A state-of-the-art open-weights model capable of multimodal parsing and complex reasoning required by Browser-Use).
  （一款能够满足 Browser-Use 所需的多模态解析和复杂推理要求的最先进的开源权重模型）。

### vLLM Boot Arguments / vLLM 启动参数
The container was executed using carefully tuned arguments customized for Browser Use:
容器使用了专为 Browser-Use 定制的精心调优的参数进行执行：
```bash
python3 -m vllm.entrypoints.openai.api_server \
  --model google/gemma-4-31b-it \
  --quantization fp8 \
  --max-model-len 262144 \
  --limit-mm-per-prompt '{"image": 2}'
```
- **`--quantization fp8`:** Reduced precision allowed the 31B parameter model to fit comfortably within the 80GB VRAM pool while leaving overhead for the KV cache.
  降低精度，使得 310 亿参数的模型不仅能轻松装入 80GB 的显存池中，还为 KV 缓存留出了空间。
- **`--max-model-len 262144`:** Enabled 256K long-context lengths. This is critical for Browser-Use, which often injects massive accessibility tree (DOM) string representations into the system prompt.
  启用了 256K 长上下文长度。这对于 Browser-Use 至关重要，因为它经常将海量的无障碍树（DOM）字符串表示注入到系统提示词中。
- **`--limit-mm-per-prompt`:** Explicitly authorized multimodal vision processing (up to 2 image tokens per prompt), enabling the model to parse standard screenshots captured by the Chromium proxy.
  明确授权多模态视觉处理（每个 prompt 最多 2 个图像 token），使模型能够解析由 Chromium 代理捕获的标准屏幕截图。

### Network Gateway & Security / 网络网关与安全
- vLLM exposed its HTTP port at `8000`. / vLLM 将其 HTTP 端口暴露在 `8000`。
- Authentication was hardcoded via environment variable: `VLLM_API_KEY=[YOUR_PRIVATE_KEY]`.
  认证通过环境变量硬编码：`VLLM_API_KEY=[YOUR_PRIVATE_KEY]`。
- RunPod automatically spawned a TLS-bearing proxy gateway for port 8000 (e.g., `https://[ID]-8000.proxy.runpod.net`). The exact `/v1` suffix was required to mimic the OpenAI spec perfectly.
  RunPod 自动为 8000 端口生成了自带 TLS 证书的代理网关。必须加上准确的 `/v1` 后缀才能完美模拟 OpenAI 的规范。

---

## 2. Desktop Application Configuration (Frontend WebUI) / 桌面应用配置 (前端 WebUI)
Browser-Use is engineered heavily around the LangChain ecosystem. To route traffic into our customized infrastructure, we leveraged the **OpenAI Protocol Adapter Strategy**.
Browser-Use 深度围绕 LangChain 生态构建。为了将流量路由到我们定制的基础设施，我们采用了 **OpenAI 协议适配器策略**。

- **Why OpenAI Provider Interface? / 为什么选择 OpenAI 接口？**
  The Google or Anthropic SDKs strictly enforce routing data to their corporate servers. By using the `langchain-openai` interface, we took advantage of its configuration flexibility (`base_url`). Since vLLM natively mimics an OpenAI API structure (`/v1/chat/completions`), passing an overwritten proxy address completely redirected the request pool to the H100.
  Google 或 Anthropic 的 SDK 严格强制将数据路由到它们的企业服务器。通过使用 `langchain-openai` 接口，我们利用了其配置的灵活性（`base_url`）。由于 vLLM 原生模拟了 OpenAI API 的结构（`/v1/chat/completions`），只要传入一个覆写的代理地址就能将请求池完全重定向至 H100。
- **Configuration Bindings / 配置绑定:** 
   - **Provider:** `openai`
   - **Base URL:** `https://[ID]-8000.proxy.runpod.net/v1`
   - **Model Name:** `google/gemma-4-31b-it`
   - **API Key:** Custom token defined earlier. (早前定义的私有令牌)

---

## 3. The `gpt-4o` 404 Routing Bug Analysis / `gpt-4o` 404 路由漏洞分析
Despite successful connection tests to the main model (returning HTTP 200 OK), the Browser-Use Agent's "Planner" fallback module crashed, yielding a `404 Not Found` (Error: The model `gpt-4o` does not exist on this server).
尽管主模型的连接测试成功（返回 HTTP 200 OK），Browser-Use Agent 的“Planner（计划员）”回退模块却发生崩溃，产生 `404 Not Found`（错误：该服务器上不存在名为 `gpt-4o` 的模型）。

### Root Cause / 根本原因
- Gradio's standard Dropdown behaviors inside the WebUI automatically seeded default fallback arrays (where `gpt-4o` is index `[0]` in the `openai` provider dictionary).
  WebUI 中的 Gradio 标准下拉菜单行为会自动播种默认的回退数组（其中 `gpt-4o` 位于 `openai` 提供商字典的索引 `[0]` 处）。
- Upon modifying configurations for the multi-agent system (`BrowserUseAgent` initializes a Main LLM, an Extraction LLM, and an optional Planner LLM), uninstantiated variables would inherit the library's hardcoded fallback state (`gpt-4o`), bypassing user string inputs if `Enter` actions were interrupted during state changes.
  在修改多智能体系统的配置（`BrowserUseAgent` 会初始化 Main LLM、Extraction LLM 和可选的 Planner LLM）时，如果状态改变时用户的 `Enter` 动作被打断，未实例化的变量便会继承代码库中硬编码的回退状态（`gpt-4o`），从而绕过用户输入的字符串。
- Because `gpt-4o` weights did not exist in the vLLM manifest on the H100, the RunPod rejected the generation request, violently collapsing the orchestrator.
  由于 H100 上的 vLLM 清单中不存在 `gpt-4o` 的权重，RunPod 拒绝了生成请求，导致整个协调器彻底崩溃。

### Engineering Solution / 工程解决方案
Instead of fighting the UI dropdown mechanics, we eradicated the disease at its source code.
我们没有在 UI 的下拉机制上反复纠缠，而是直接从源代码层面根除了这一顽疾。

1. **`llm_provider.py` Override / 重写 `llm_provider.py`:** 
   Modified the LangChain bridge constructor `get_llm_model` to enforce `kwargs.get("model_name", "google/gemma-4-31b-it")`. This guaranteed that any lost variables would implicitly default to Gemma rather than OpenAI's payload string.
   修改了 LangChain 的桥接构造器 `get_llm_model`，强制执行 `kwargs.get("model_name", "google/gemma-4-31b-it")`。这保证了任何丢失的变量都能隐式默认指向 Gemma，而不是 OpenAI 的载荷字符串。
2. **`config.py` Defaults Re-prioritization / `config.py` 默认优先级洗牌:** 
   Injected `"google/gemma-4-31b-it"` directly into the `openai` tuple array at index `0`. This structurally prevented the UI logic from ever rendering `gpt-4o` as an invisible pre-populated fallback, aligning the software perfectly with our customized H100 endpoint.
   将 `"google/gemma-4-31b-it"` 直接注入到 `openai` 元组数组的索引 `0` 处。这从结构上防止了 UI 逻辑将 `gpt-4o` 渲染成不可见的预填充回退项，使得软件与我们定制的 H100 端点完美对齐。

---

## 4. Final Assessment / 总结评估
The system is now fully unlocked. The "OpenAI Adapter" method applied to a customized local codebase ensures that any custom, uncensored, or exploratory model (DeepSeek, LLaMa, or private proprietary variants) can be hot-swapped onto the H100 and autonomously control the machine's browsers without hitting restrictive corporate firewalls.
该系统现已被完全解锁。应用在定制化本地代码库上的“OpenAI 适​​配器”方法确保了：任何自定义的、无审查的或探索性的模型（如 DeepSeek、LLaMa 或私有的专有变体）都可以通过 H100 进行热插拔，并能够自主控制计算机的浏览器，而不会受到限制性企业级防火墙的干扰。
