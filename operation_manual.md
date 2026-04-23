# Browser-Use (RunPod 专享版) 启动与关闭操作手册
**Browser-Use (RunPod Edition) Operation Manual**

---

## 🇨🇳 中文指南

### 第一部分：如何启动系统 (Start Up)

**步骤 1：唤醒你的 H100 云端大脑 (RunPod)**
1. 登录到 [RunPod 控制台](https://www.runpod.io/console/pods)。
2. 在列表中找到你的 **H100 Pod**，如果它是停止状态，点击 **Start** 按钮将其唤醒。
3. 等待几分钟，点击左下角的 **Logs（运行日志）**，确认系统不断输出类似 `(APIServer) INFO... ` 的内容即可说明模型加载完毕。
4. 确保复制你的专属链接：`https://[你的专属ID]-8000.proxy.runpod.net/v1`。

**步骤 2：启动本地桌面控制端 (Local WebUI)**
1. 在你的 Windows 电脑上，打开包含项目文件的文件夹（即 `h:\browser-use-web-ui\desktop-main\desktop-main`）。
2. 在该文件夹的空白处右键点击，选择 **“在终端中打开” (Open in Terminal)** 或运行 PowerShell。
3. 在弹出的黑框中，输入启动命令并按回车：
   ```powershell
   npm run start
   ```
4. 稍等片刻，会自动变出一个绿色的网页界面。在左侧界面的 `Base URL` 内粘贴你在第 1 步复制的链接。填写 API Key（填写你设置好的私有密码，参考私密文档）。
5. 输入你的任务，点击 **Run**！

---

### 第二部分：如何关闭系统 (Shut Down)

**步骤 1：关闭本地程序**
1. 在浏览器界面里，点击停止任务（Stop）。
2. 关闭那个绿色的网页标签。
3. 回到刚才那个一直跑着代码的黑色终端窗口（PowerShell），在键盘上按下 **`Ctrl + C`**，如果系统问你“是否终止批处理操作 (Y/N)”，输入 **`Y`** 并回车。

**步骤 2：彻底休眠 H100 以停止扣费**
1. 重新回到 [RunPod 控制台](https://www.runpod.io/console/pods)。
2. 找到你的 H100 Pod，点击 **Stop** 按钮。
3. 系统会询问是否保留存储卷，选择保留（这样你的模型和配置就不会丢失）。确认机器进入 "Exited / Stopped" 状态，此时只按极低的存储费扣费，昂贵的 GPU 不再计费。

---
---

## 🇺🇸 English Guide

### Part 1: Starting the System

**Step 1: Wake up your H100 Cloud Brain (RunPod)**
1. Log in to the [RunPod Console](https://www.runpod.io/console/pods).
2. Locate your **H100 Pod** in the instances list. If it is stopped, click the **Start** button to wake it up.
3. Wait a few minutes, then click **Logs** in the bottom left corner. Ensure the system outputs `(APIServer) INFO... ` messages, confirming the vLLM engine has finished loading the Gemma model into the GPU.
4. Copy your dedicated vLLM Proxy URL, making sure it ends with `/v1` (e.g., `https://[Your-ID]-8000.proxy.runpod.net/v1`).

**Step 2: Launch the Local Control Panel (Local WebUI)**
1. On your Windows PC, navigate to your project directory: `h:\browser-use-web-ui\desktop-main\desktop-main`.
2. Right-click on an empty space and select **"Open in Terminal"** (or open PowerShell).
3. Type the following command and press Enter:
   ```powershell
   npm run start
   ```
4. A Gradio Web UI window will automatically open. Paste your RunPod Proxy URL into the `Base URL` field on the left sidebar. Ensure your API Key is filled correctly (Retrieve your private key from the local secrets file).
5. Type in your task instructions and click **Run**!

---

### Part 2: Shutting Down Safely

**Step 1: Close the Local Application**
1. Stop any currently running tasks by clicking the **Stop** button in the Web UI.
2. Close the Web UI browser tab.
3. Go back to the PowerShell terminal window. Press **`Ctrl + C`** on your keyboard. If prompted to "Terminate batch job (Y/N)", type **`Y`** and explicitly hit Enter.

**Step 2: Hibernate the H100 to Stop Billing**
1. Return to the [RunPod Console](https://www.runpod.io/console/pods).
2. Locate your active H100 Pod and click the **Stop** button.
3. The system will ask if you want to keep your network volumes. Keep them! By doing so, your heavy model weights are saved, and you will only be charged a few cents for storage overnight instead of expensive hourly GPU rates. Verify the system says "Exited / Stopped".
