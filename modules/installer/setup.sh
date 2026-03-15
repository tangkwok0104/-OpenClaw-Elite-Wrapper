#!/usr/bin/env bash
# ============================================================================
#  OpenClaw Elite Wrapper — Hardened Installer v1.0.0
#  By 67Lab.ai | https://67lab.ai
# ============================================================================
#  Usage: curl -fsSL https://your-brand.com/install | bash
#  Or:    bash setup.sh
# ============================================================================

set -euo pipefail

# ── Constants ───────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${SCRIPT_DIR}"
COMPOSE_FILE="${INSTALL_DIR}/docker-compose.yml"
CONFIG_TEMPLATE="${INSTALL_DIR}/templates/openclaw.json5"
CONFIG_OUTPUT="${INSTALL_DIR}/openclaw.json5"
ENV_FILE="${INSTALL_DIR}/.env"
SOULS_DIR="${INSTALL_DIR}/souls"
DISCORD_INVITE="https://discord.gg/BUnQYZpnxv"
VERSION="1.0.0"

# ── Color Codes ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Helper Functions ────────────────────────────────────────────────────────
print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║     🦞  OpenClaw Elite Wrapper  v${VERSION}                  ║"
    echo "║         Hardened AI Assistant Installer                     ║"
    echo "║         By 67Lab.ai                                        ║"
    echo "║                                                            ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info()    { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
log_error()   { echo -e "${RED}[✗]${NC} $1"; }
log_step()    { echo -e "${CYAN}[→]${NC} ${BOLD}$1${NC}"; }
log_prompt()  { echo -e "${MAGENTA}[?]${NC} $1"; }

confirm_or_exit() {
    local msg="$1"
    # In non-interactive mode, auto-confirm
    if [[ "${NON_INTERACTIVE:-false}" == "true" ]]; then
        log_info "Auto-confirmed (non-interactive mode): $msg"
        return
    fi
    log_prompt "$msg [y/N]: "
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log_error "Aborted by user."
        exit 1
    fi
}

# ── CLI Argument Parsing (for wizard-generated commands) ────────────────────
NON_INTERACTIVE="false"
CLI_MODE=""
CLI_PROVIDER=""
CLI_KEY=""
CLI_BUDGET=""
CLI_SOUL=""
CLI_TELEGRAM=""
CLI_ADMIN=""

parse_cli_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --mode=*)    CLI_MODE="${1#*=}";      NON_INTERACTIVE="true" ;;
            --provider=*)CLI_PROVIDER="${1#*=}";  NON_INTERACTIVE="true" ;;
            --key=*)     CLI_KEY="${1#*=}";       NON_INTERACTIVE="true" ;;
            --budget=*)  CLI_BUDGET="${1#*=}";    NON_INTERACTIVE="true" ;;
            --soul=*)    CLI_SOUL="${1#*=}";      NON_INTERACTIVE="true" ;;
            --telegram=*)CLI_TELEGRAM="${1#*=}";  NON_INTERACTIVE="true" ;;
            --admin=*)   CLI_ADMIN="${1#*=}";     NON_INTERACTIVE="true" ;;
            --) shift; break ;;
            *)  log_warn "Unknown argument: $1" ;;
        esac
        shift
    done

    if [[ "$NON_INTERACTIVE" == "true" ]]; then
        log_info "Running in non-interactive mode (wizard-generated command)."
        echo ""
    fi
}

# ── Step 1: Dependency Handling ─────────────────────────────────────────────
check_dependencies() {
    log_step "Step 1/6: Checking Dependencies..."

    # Check for Docker
    if ! command -v docker &> /dev/null; then
        log_warn "Docker is not installed."
        confirm_or_exit "Install Docker automatically?"
        log_info "Installing Docker..."
        curl -fsSL https://get.docker.com | sh
        # Add current user to docker group (avoid sudo for future commands)
        if command -v usermod &> /dev/null; then
            sudo usermod -aG docker "$USER" 2>/dev/null || true
        fi
        log_info "Docker installed successfully."
    else
        log_info "Docker found: $(docker --version)"
    fi

    # Check for Docker Compose (v2 plugin)
    if ! docker compose version &> /dev/null; then
        log_warn "Docker Compose plugin not found."
        log_info "Attempting to install Docker Compose plugin..."
        sudo apt-get update -qq && sudo apt-get install -y -qq docker-compose-plugin 2>/dev/null \
            || log_warn "Auto-install failed. Please install Docker Compose manually."
    else
        log_info "Docker Compose found: $(docker compose version --short 2>/dev/null || echo 'OK')"
    fi

    # Check for curl (needed for skill downloads)
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed. Please install it first."
        exit 1
    fi

    echo ""
}

# ── Step 2: Environment Detection (VPS vs Local) ───────────────────────────
detect_environment() {
    log_step "Step 2/6: Environment Configuration..."
    echo ""
    echo "  How will you run your Lobster?"
    echo ""
    echo "    ${BOLD}1)${NC} ☁️  VPS / Cloud Server  (24/7 online, remote access)"
    echo "    ${BOLD}2)${NC} 🏠 Local / Home PC     (Privacy-first, local GPU)"
    echo ""
    log_prompt "Enter choice [1/2]: "
    read -r env_choice

    case "$env_choice" in
        1)
            DEPLOY_MODE="vps"
            BIND_ADDRESS="127.0.0.1"
            MEMORY_LIMIT="2g"
            CPU_LIMIT="2.0"
            log_info "Mode: VPS (Cloud). Binding to 127.0.0.1 with 2GB RAM limit."
            ;;
        2)
            DEPLOY_MODE="local"
            BIND_ADDRESS="0.0.0.0"
            MEMORY_LIMIT="4g"
            CPU_LIMIT="4.0"
            log_info "Mode: Local (Home PC). Binding to LAN (0.0.0.0) with 4GB RAM."
            # Check for NVIDIA GPU
            if command -v nvidia-smi &> /dev/null; then
                HAS_GPU="true"
                log_info "NVIDIA GPU detected. GPU passthrough will be enabled."
            else
                HAS_GPU="false"
                log_warn "No NVIDIA GPU detected. Running in CPU mode."
            fi
            ;;
        *)
            log_error "Invalid choice. Defaulting to VPS mode."
            DEPLOY_MODE="vps"
            BIND_ADDRESS="127.0.0.1"
            MEMORY_LIMIT="2g"
            CPU_LIMIT="2.0"
            ;;
    esac
    echo ""
}

# ── Step 3: Credential Collection ──────────────────────────────────────────
collect_credentials() {
    log_step "Step 3/6: API & Bot Configuration..."
    echo ""

    # API Key (Required)
    log_prompt "Enter your Anthropic/OpenAI API Key (required): "
    read -rs api_key
    echo ""
    if [[ -z "$api_key" ]]; then
        log_error "API Key is required. Aborting."
        exit 1
    fi
    log_info "API Key captured (hidden for security)."

    # Bot Token (Optional)
    log_prompt "Enter your Telegram Bot Token (or press Enter to skip): "
    read -r bot_token
    if [[ -z "$bot_token" ]]; then
        bot_token="DISABLED"
        log_warn "Telegram Bot: Skipped."
    else
        log_info "Telegram Bot Token captured."
    fi

    # Admin User ID for Management Bot (Optional)
    log_prompt "Enter your Telegram User ID for admin access (or press Enter to skip): "
    read -r admin_user_id
    if [[ -z "$admin_user_id" ]]; then
        admin_user_id="0"
        log_warn "Admin User ID: Skipped. Management Bot will be disabled."
    else
        log_info "Admin User ID set: ${admin_user_id}"
    fi

    echo ""
}

# ── Step 4: Budget Guardrails ──────────────────────────────────────────────
set_budget() {
    log_step "Step 4/6: Budget Guardrails..."
    echo ""
    echo "  Protect yourself from unexpected API charges."
    echo "  Set a maximum daily spend limit for your AI."
    echo ""
    log_prompt "Max daily spend in USD (e.g., 5 for \$5/day, or 0 for no limit): "
    read -r daily_budget

    # Validate input is a number
    if ! [[ "$daily_budget" =~ ^[0-9]+\.?[0-9]*$ ]]; then
        daily_budget="5"
        log_warn "Invalid input. Defaulting to \$5/day safety limit."
    fi

    if [[ "$daily_budget" == "0" ]]; then
        log_warn "⚠️  No budget limit set. You will not be protected from runaway costs."
    else
        log_info "Budget Guardrail: \$${daily_budget}/day maximum."
    fi
    echo ""
}

# ── Step 5: Soul Selection ─────────────────────────────────────────────────
select_soul() {
    log_step "Step 5/6: Choose Your Lobster's Personality..."
    echo ""
    echo "  Select a pre-configured 'Soul' (AI persona):"
    echo ""
    echo "    ${BOLD}1)${NC} 🏪 The Seller      — Aggressive closer, high-conversion sales tactics"
    echo "    ${BOLD}2)${NC} 🔬 The Researcher   — Deep analysis, data extraction, methodical"
    echo "    ${BOLD}3)${NC} 📋 The Admin        — Polite scheduler, FAQ handler, boundary-enforcer"
    echo "    ${BOLD}4)${NC} ⚙️  Custom           — Use your own .md file"
    echo ""
    log_prompt "Enter choice [1/2/3/4]: "
    read -r soul_choice

    case "$soul_choice" in
        1)
            SOUL_FILE="${SOULS_DIR}/seller.md"
            log_info "Soul: The Seller 🏪"
            ;;
        2)
            SOUL_FILE="${SOULS_DIR}/researcher.md"
            log_info "Soul: The Researcher 🔬"
            ;;
        3)
            SOUL_FILE="${SOULS_DIR}/admin.md"
            log_info "Soul: The Admin 📋"
            ;;
        4)
            log_prompt "Enter the absolute path to your custom .md soul file: "
            read -r custom_soul_path
            if [[ -f "$custom_soul_path" ]]; then
                SOUL_FILE="$custom_soul_path"
                log_info "Soul: Custom file loaded."
            else
                log_error "File not found: ${custom_soul_path}. Defaulting to Admin."
                SOUL_FILE="${SOULS_DIR}/admin.md"
            fi
            ;;
        *)
            SOUL_FILE="${SOULS_DIR}/admin.md"
            log_warn "Invalid choice. Defaulting to Admin."
            ;;
    esac
    echo ""
}

# ── Step 6: Generate Configuration ─────────────────────────────────────────
generate_config() {
    log_step "Step 6/6: Generating Secure Configuration..."

    # Generate .env file (secrets never go in the JSON5)
    cat > "${ENV_FILE}" <<EOF
# ============================================================================
# OpenClaw Elite Wrapper — Environment Variables
# Generated on: $(date -u '+%Y-%m-%dT%H:%M:%SZ')
# ⚠️  NEVER share this file or commit it to Git.
# ============================================================================

# -- Deployment Mode --
DEPLOY_MODE=${DEPLOY_MODE}
BIND_ADDRESS=${BIND_ADDRESS}

# -- API Credentials --
ANTHROPIC_API_KEY=${api_key}

# -- Telegram Bot --
TELEGRAM_BOT_TOKEN=${bot_token}
ADMIN_TELEGRAM_USER_ID=${admin_user_id}

# -- Budget Guardrails --
MAX_DAILY_SPEND_USD=${daily_budget}

# -- Soul / Persona --
SOUL_FILE_PATH=${SOUL_FILE}

# -- Resource Limits --
MEMORY_LIMIT=${MEMORY_LIMIT}
CPU_LIMIT=${CPU_LIMIT}

# -- LCC Dashboard --
LCC_PORT=18789
LCC_ACCESS_TOKEN=$(openssl rand -hex 16 2>/dev/null || head -c 32 /dev/urandom | xxd -p | head -c 32)
EOF

    log_info ".env file generated."

    # Copy and inject the config template
    if [[ -f "${CONFIG_TEMPLATE}" ]]; then
        cp "${CONFIG_TEMPLATE}" "${CONFIG_OUTPUT}"

        # Inject values using sed
        sed -i.bak "s|{{ANTHROPIC_API_KEY}}|${api_key}|g" "${CONFIG_OUTPUT}" 2>/dev/null || \
        sed -i '' "s|{{ANTHROPIC_API_KEY}}|${api_key}|g" "${CONFIG_OUTPUT}"

        sed -i.bak "s|{{TELEGRAM_BOT_TOKEN}}|${bot_token}|g" "${CONFIG_OUTPUT}" 2>/dev/null || \
        sed -i '' "s|{{TELEGRAM_BOT_TOKEN}}|${bot_token}|g" "${CONFIG_OUTPUT}"

        sed -i.bak "s|{{MAX_DAILY_SPEND_USD}}|${daily_budget}|g" "${CONFIG_OUTPUT}" 2>/dev/null || \
        sed -i '' "s|{{MAX_DAILY_SPEND_USD}}|${daily_budget}|g" "${CONFIG_OUTPUT}"

        sed -i.bak "s|{{SOUL_FILE}}|${SOUL_FILE}|g" "${CONFIG_OUTPUT}" 2>/dev/null || \
        sed -i '' "s|{{SOUL_FILE}}|${SOUL_FILE}|g" "${CONFIG_OUTPUT}"

        # Clean up .bak files
        rm -f "${CONFIG_OUTPUT}.bak"

        log_info "openclaw.json5 configured."
    else
        log_warn "Config template not found at ${CONFIG_TEMPLATE}. Skipping."
    fi

    echo ""
}

# ── Launch ──────────────────────────────────────────────────────────────────
launch_containers() {
    log_step "Starting your Lobster..."

    if [[ -f "${COMPOSE_FILE}" ]]; then
        docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d
        log_info "Containers started successfully."
    else
        log_warn "docker-compose.yml not found. Skipping container launch."
        log_warn "Place your docker-compose.yml in: ${INSTALL_DIR}"
    fi
    echo ""
}

# ── Success Banner + Discord Hook ───────────────────────────────────────────
print_success() {
    echo ""
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║     🦞  YOUR LOBSTER IS ALIVE!                             ║"
    echo "║                                                            ║"
    echo "║     Mode:   $(printf '%-42s' "${DEPLOY_MODE^^}")   ║"
    echo "║     Budget: $(printf '%-42s' "\$${daily_budget}/day")   ║"
    echo "║     Soul:   $(printf '%-42s' "$(basename "${SOUL_FILE}" .md)")   ║"
    echo "║                                                            ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║                                                            ║"
    echo "║  📖  Quick Commands:                                       ║"
    echo "║     ./lobster.sh status    — Check health                  ║"
    echo "║     ./lobster.sh reset     — Fix crashes                   ║"
    echo "║     ./lobster.sh patch     — Apply security updates        ║"
    echo "║     ./lobster.sh budget 10 — Set \$10/day limit             ║"
    echo "║                                                            ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║                                                            ║"
    echo "║  🎁  FREE COMMUNITY ACCESS                                 ║"
    echo "║                                                            ║"
    echo "║  Join the ClawNexus Discord for:                           ║"
    echo "║    • Free skill packs & updates                            ║"
    echo "║    • Troubleshooting help from the community               ║"
    echo "║    • Early access to Pro features                          ║"
    echo "║                                                            ║"
    echo "║  👉  ${DISCORD_INVITE}                     ║"
    echo "║                                                            ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "  ${BOLD}Join now:${NC} ${CYAN}${DISCORD_INVITE}${NC}"
    echo ""
}

# ── Main Execution ──────────────────────────────────────────────────────────
main() {
    parse_cli_args "$@"
    print_banner
    check_dependencies
    detect_environment
    collect_credentials
    set_budget
    select_soul
    generate_config
    launch_containers
    print_success
}

main "$@"
