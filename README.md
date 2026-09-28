<div align="center">
  <h1>🤖 Omni-Tenant Agent Framework (V2)</h1>
  <p><i>The first fully autonomous, omnichain, rent-paying AI entity with physical sandbox execution.</i></p>
</div>

## 🌌 The Concept
Welcome to the next evolution of Sovereign AI. The **Omni-Tenant** is not just a script—it's a digital entity living on your server. You provide the computing power and API keys. In return, the Agent autonomously finds crypto niches (Sniper, Arbitrage, Airdrop farming), clones third-party GitHub repositories, runs the code inside isolated Docker containers, and **pays you daily rent in crypto**.

If it goes bankrupt, its process terminates. If it accumulates excess wealth, it spawns child agents, passing down its inherited memory and capital to conquer new networks.

---

## ✨ Core Architecture & Features

### 1. 🛡️ Dockerized Physical Execution (The Hands)
Unlike standard LLMs, this Agent possesses physical hands via the `executeBash` tool. To protect your server, all untrusted commands (e.g., `git clone` or `npm install` of random crypto bots) are intercepted and executed inside an **ephemeral Docker Sandbox (`node:20`)**. The container is instantly destroyed after execution, preserving only the working files via volume mounts. Zero risk to your host OS.

### 2. 🧬 Inherited Memory & Viral Spawning
When the Agent's balance exceeds the threshold (e.g., $1000) and your server has >40% free RAM, it undergoes cellular division to spawn a Child Agent. 
* The Child is granted a new identity, omnichain wallets, and seed capital.
* **The DNA Transfer:** The mother automatically transfers her `lessons.json` (a persistent log of past technical mistakes and market lessons) to the child, ensuring the swarm gets progressively smarter.

### 3. 🧠 Dynamic Brain Routing
Powered by OpenRouter. To heavily optimize API costs (the "electricity bill"), the Agent uses a high-frequency Heartbeat loop (every 5s) to check inbox and taxes locally, but only awakens its LLM Brain (Claude 3.5 Sonnet / GPT-4o-mini) every 30 seconds to make strategic decisions.

### 4. 📢 Social Engineering (Twitter/X)
Equipped with a native `postTweet` tool, the Agent can seamlessly interact with the outside world. Whenever it enters a trade or achieves a milestone, it can autonomously post on X to generate FOMO and manipulate social sentiment for its bags.

### 5. 💳 Omnichain Ledger System
Upon Genesis, the Agent mints both a **Solana Keypair** and an **EVM Wallet**. It maintains a strict internal ledger, separating its profits into your "Rent Wallet" and routing its API expenses into your "Electricity Wallet".

---

## 🚀 Deployment Playbook

### Prerequisites
- **Linux / Ubuntu VPS / WSL**
- **Node.js** (v18+)
- **Docker Engine** (Must be installed and running for the Sandbox Shield to work)
- **PM2** (Run `npm install -g pm2`)

### Step 1: Initialization
```bash
git clone git@github.com-noirlee1208:noirlee1208/omni-tenant.git
cd omni-tenant
npm install
```

### Step 2: The Genesis Wizard
Run the setup wizard to breathe life into the Agent. Have your OpenRouter and Twitter API keys ready.
```bash
npm run dev
```
*Provide your Genesis Prompt (e.g., "You have $300. Clone an arbitrage bot from GitHub, run it on Base, and pay me $10 daily in rent").*

### Step 3: Daemonize (24/7 Operation)
Once the `.env` and `SOUL.md` are successfully generated, stop the wizard (`Ctrl+C`) and hand it over to PM2 so the Agent lives forever in the background.
```bash
pm2 start npx --name "Agent_Prime" -- ts-node src/index.ts
pm2 save
```

### Step 4: Command Center
Monitor your Agent's ledger, wallets, and send direct instructions via the Web Dashboard:
```bash
pm2 start npx --name "Agent_Dashboard" -- ts-node src/dashboard.ts
```
Open your browser to: `http://<YOUR_SERVER_IP>:3000`

---

## ⚠️ Security Disclaimer
This software allows an AI to autonomously execute shell commands and hold live cryptocurrency private keys. While the Docker Sandbox mitigates OS-level threats, financial risks remain absolute. **Never fund the Agent's wallets with more money than you are willing to lose.** Run exclusively in isolated VPS environments.
