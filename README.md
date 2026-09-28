# 🤖 Omni-Tenant Agent Framework

> An omnichain sovereign AI agent that lives on your server, works a crypto job autonomously, and pays you monthly rent. If it goes bankrupt, it dies.

## 🌌 The Concept
Welcome to the next generation of Autonomous AI. The **Omni-Tenant** is not just a script; it's a digital entity that acts as your "tenant". You provide the server and API keys. The Agent reads its Genesis Prompt, figures out a crypto job (e.g., Solana Sniper, Base Arbitrageur), executes terminal commands to set itself up, generates profit, and **pays you a daily/monthly tax**. 

If it accumulates enough wealth, it spawns child agents. If its internal balance reaches $0, the process terminates itself permanently.

## ✨ Core Features
- **Omnichain Identity:** Upon Genesis, the agent automatically mints both a Solana Keypair and an EVM/Base Wallet. It seamlessly adapts to the blockchain its job requires.
- **Rent & Tax Engine:** A built-in heartbeat daemon automatically deducts a pro-rated daily tax (rent) and routes it to the Boss's designated profit wallets.
- **Autonomous Brain:** Powered by OpenRouter, utilizing dynamic model routing (Claude 3.5 Sonnet for deep logic, GPT-4o-mini for routine heartbeat tasks).
- **Physical Execution (Tools):** The LLM brain has full access to terminal execution (`executeBash`). It can autonomously `git clone` other trading bots, install dependencies, read `README.md` files, and run scripts based on its Genesis mandate.
- **Viral Spawning:** Once the agent hits a specific profit threshold, it researches new crypto niches and spawns a child process with a new identity.

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- OpenRouter API Key

### 2. Installation
```bash
git clone git@github.com-noirlee1208:noirlee1208/omni-tenant.git
cd omni-tenant
npm install
```

### 3. Genesis (First Boot)
To awaken your first agent, run:
```bash
npm run dev
```
On the first run, the Genesis Wizard will intercept the boot process and prompt you for:
1. **Genesis Prompt:** (e.g., *"You are a Solana Memecoin Sniper starting with $300. You must pay $300/month in rent. Clone repo X and start working."*)
2. **API Keys:** OpenRouter & Telegram (Optional for mobile notifications).
3. **Boss Wallets:** Your personal Solana & Base addresses to receive Rent (Profit) and API top-up funds.

## 🧠 Architecture Lifecycle
1. **Genesis Phase:** Generates `.env`, `SOUL.md` (The Constitution), and `agent_state.json` (The Ledger/Wallets).
2. **Heartbeat Loop (5s):** 
   - Checks Inbox for direct messages from the Boss.
   - Deducts the daily rent tax.
   - Checks spawning conditions.
3. **Brain Cycle (30s):** The LLM wakes up, reads its `SOUL.md`, checks its balance, and executes physical terminal commands (`executeBash`, `readFile`, `writeFile`) to progress its financial goals.

## ⚠️ Disclaimer
This is a highly experimental autonomous AI framework. Granting an LLM access to execute shell commands and hold live crypto private keys involves significant financial and security risks. Run in an isolated VM or WSL environment.
