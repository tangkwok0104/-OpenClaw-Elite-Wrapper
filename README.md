# OpenClaw Elite Wrapper
> A hardened, productized installer for OpenClaw AI agents.  
> By [67Lab.ai](https://67lab.ai) — *"Don't install OpenClaw. Install a Secure, Private AI Assistant."*

---

## 🚀 Quick Start

```bash
# One-liner installation
curl -fsSL https://your-brand.com/install | bash

# Or clone and run manually
git clone https://github.com/your-org/OpenClawEliteWrapper.git
cd OpenClawEliteWrapper/modules/installer
bash setup.sh
```

The installer will walk you through:
1. ✅ **Dependency Check** — Auto-installs Docker if missing
2. ☁️ **Environment** — Choose VPS (Cloud) or Local (Home PC)
3. 🔑 **Credentials** — API Key, Bot Token, Admin User ID
4. 💰 **Budget** — Set your daily spending limit
5. 🎭 **Soul** — Pick a personality (Seller, Researcher, Admin)
6. 🦞 **Launch** — Docker containers start automatically

---

## ⚙️ Compatibility

| Component | Tested Version | Notes |
|---|---|---|
| **OpenClaw** | `latest` as of **March 2026** | We pin to `:latest` — if you encounter issues, check the [OpenClaw releases](https://github.com/openclaw/openclaw/releases) for breaking changes |
| **Docker** | 27.5.1+ | Older versions may work but are untested |
| **Docker Compose** | v2.32.4+ | Must support `docker compose` (V2 syntax) |
| **OS** | Ubuntu 22.04+ / macOS 13+ | Windows via WSL2 is supported |

> [!WARNING]
> This wrapper was built and tested against OpenClaw as of **March 2026**. If an upstream OpenClaw update introduces breaking changes, pin to a known-good version by editing `docker-compose.yml`:
> ```yaml
> image: openclaw/openclaw:v1.2.3  # Replace with last working tag
> ```

---

## 📦 What's Inside

| File | Purpose |
|---|---|
| `setup.sh` | The 10-second hardened installer |
| `docker-compose.yml` | "The Cage" — non-root, resource-limited sandbox |
| `lobster.sh` | CLI for Day 2 operations (patch, reset, budget) |
| `watchdog.sh` | SingletonLock killer & auto-restart daemon |
| `management_bot.py` | Telegram bot for remote server management |
| `templates/openclaw.json5` | Pre-hardened config with dangerous tools disabled |
| `souls/` | Pre-written AI personas (Seller, Researcher, Admin) |
| `lcc_dashboard/` | Glassmorphism web UI health dashboard |

---

## 🛡️ Security Features

- **Non-Root Execution** — The AI runs as user `1000:1000`, cannot touch host files
- **Tool Whitelisting** — `exec`, `shell`, and `sudo` disabled by default
- **Logic Spine** — Blocks `curl`, `wget`, `nc` to prevent data exfiltration
- **Budget Guardrails** — Hard daily spend limits to prevent bill shock
- **Resource Limits** — Memory and CPU caps to prevent runaway loops
- **SingletonLock Watchdog** — Auto-clears Chrome locks that cause crash loops

---

## 🎮 Day 2: Managing Your Lobster

### Via CLI (`lobster.sh`)
```bash
./lobster.sh status          # Check health
./lobster.sh patch           # Apply security updates
./lobster.sh reset           # Fix crashes
./lobster.sh budget 10       # Set $10/day limit
./lobster.sh install-skill <url>  # Add a new skill
./lobster.sh logs            # View logs
```

### Via Telegram
Send commands to your Management Bot:
- `/status` — Health check
- `/patch` — Security update
- `/reset` — Fix crashes
- `/budget 10` — Set budget

### Via Dashboard
Open `http://your-ip:18789` for the Lobster Command Center UI.

---

## 🎭 Soul Templates

| Soul | Best For | Personality |
|---|---|---|
| 🏪 Seller | Sales bots, lead follow-up | Aggressive closer, urgency-driven |
| 🔬 Researcher | Market research, data analysis | Methodical, source-citing, objective |
| 📋 Admin | Scheduling, customer service | Polite, organized, boundary-aware |

---

## 🤝 Community

Join the **ClawNexus Discord** for free skill packs, troubleshooting, and updates:

👉 **https://discord.gg/BUnQYZpnxv**

---

## 📄 License

© 2026 67Lab.ai. All rights reserved.
