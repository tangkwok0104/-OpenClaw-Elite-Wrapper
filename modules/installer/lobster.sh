#!/usr/bin/env bash
# ============================================================================
#  OpenClaw Elite Wrapper — Lobster CLI (Day 2 Operations)
#  By 67Lab.ai
#
#  Usage: ./lobster.sh <command> [args]
#
#  Commands:
#    status          — Check container health and resource usage
#    patch           — Pull latest image and restart (security update)
#    reset           — Clear SingletonLock and restart (fix crashes)
#    install-skill   — Download and install a .md skill file
#    budget <amount> — Update the daily spending limit
#    logs            — Show recent container logs
#    stop            — Gracefully stop the Lobster
#    start           — Start the Lobster
#    version         — Show version info
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
ENV_FILE="${SCRIPT_DIR}/.env"
CONFIG_FILE="${SCRIPT_DIR}/openclaw.json5"
SKILLS_DIR="${SCRIPT_DIR}/data/skills"
MEMORY_DIR="${SCRIPT_DIR}/data/memory"
VERSION="1.0.0"
CONTAINER_NAME="elite-lobster"

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_ok()   { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }
log_err()  { echo -e "${RED}[✗]${NC} $1"; }
log_info() { echo -e "${CYAN}[→]${NC} $1"; }

# ── Commands ────────────────────────────────────────────────────────────────

cmd_status() {
    echo -e "${BOLD}🦞 Lobster Status${NC}"
    echo "────────────────────────────────────────"

    # Container status
    local state
    state=$(docker inspect --format='{{.State.Status}}' "${CONTAINER_NAME}" 2>/dev/null || echo "not found")
    local health
    health=$(docker inspect --format='{{.State.Health.Status}}' "${CONTAINER_NAME}" 2>/dev/null || echo "unknown")

    if [[ "$state" == "running" ]]; then
        log_ok "Container: ${GREEN}Running${NC}"
    else
        log_err "Container: ${RED}${state}${NC}"
    fi

    if [[ "$health" == "healthy" ]]; then
        log_ok "Health:    ${GREEN}Healthy${NC}"
    elif [[ "$health" == "unhealthy" ]]; then
        log_err "Health:    ${RED}Unhealthy${NC}"
    else
        log_warn "Health:    ${YELLOW}${health}${NC}"
    fi

    # Resource usage
    echo ""
    echo -e "${BOLD}Resource Usage:${NC}"
    docker stats "${CONTAINER_NAME}" --no-stream --format "  CPU: {{.CPUPerc}}  |  Memory: {{.MemUsage}}  |  Net I/O: {{.NetIO}}" 2>/dev/null \
        || log_warn "Could not fetch resource stats."

    # Budget
    if [[ -f "${ENV_FILE}" ]]; then
        local budget
        budget=$(grep "MAX_DAILY_SPEND_USD" "${ENV_FILE}" | cut -d'=' -f2)
        echo ""
        echo -e "  ${BOLD}Budget Limit:${NC} \$${budget}/day"
    fi

    echo "────────────────────────────────────────"
}

cmd_patch() {
    log_info "Pulling latest OpenClaw image..."
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" pull

    log_info "Clearing SingletonLock (preventative)..."
    rm -f "${MEMORY_DIR}/Default/SingletonLock" 2>/dev/null || true

    log_info "Restarting containers..."
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d

    log_ok "Security patch applied! Running latest version."
}

cmd_reset() {
    log_info "Emergency Reset: Clearing SingletonLock..."
    rm -f "${MEMORY_DIR}/Default/SingletonLock" 2>/dev/null || true

    log_info "Restarting the Lobster..."
    docker restart "${CONTAINER_NAME}"

    log_ok "Reset complete. Your Lobster should be back online."
}

cmd_install_skill() {
    local skill_url="$1"

    if [[ -z "$skill_url" ]]; then
        log_err "Usage: ./lobster.sh install-skill <url>"
        log_err "  Example: ./lobster.sh install-skill https://example.com/real-estate-skill.md"
        exit 1
    fi

    # Determine filename from URL
    local filename
    filename=$(basename "$skill_url")

    # Validate it's a .md file
    if [[ "$filename" != *.md ]]; then
        log_err "Only .md skill files are allowed. Got: ${filename}"
        exit 1
    fi

    # Create skills directory if needed
    mkdir -p "${SKILLS_DIR}"

    log_info "Downloading skill: ${filename}..."
    curl -fsSL "$skill_url" -o "${SKILLS_DIR}/${filename}"

    if [[ $? -eq 0 ]]; then
        log_ok "Skill installed: ${SKILLS_DIR}/${filename}"
        log_info "Restart the Lobster to load the new skill: ./lobster.sh reset"
    else
        log_err "Failed to download skill from: ${skill_url}"
        exit 1
    fi
}

cmd_budget() {
    local new_budget="$1"

    if [[ -z "$new_budget" ]]; then
        log_err "Usage: ./lobster.sh budget <amount>"
        log_err "  Example: ./lobster.sh budget 10    (sets \$10/day limit)"
        exit 1
    fi

    if ! [[ "$new_budget" =~ ^[0-9]+\.?[0-9]*$ ]]; then
        log_err "Invalid amount: ${new_budget}. Must be a number."
        exit 1
    fi

    # Update .env
    if [[ -f "${ENV_FILE}" ]]; then
        if grep -q "MAX_DAILY_SPEND_USD" "${ENV_FILE}"; then
            sed -i.bak "s/MAX_DAILY_SPEND_USD=.*/MAX_DAILY_SPEND_USD=${new_budget}/" "${ENV_FILE}" 2>/dev/null || \
            sed -i '' "s/MAX_DAILY_SPEND_USD=.*/MAX_DAILY_SPEND_USD=${new_budget}/" "${ENV_FILE}"
            rm -f "${ENV_FILE}.bak"
        else
            echo "MAX_DAILY_SPEND_USD=${new_budget}" >> "${ENV_FILE}"
        fi
    fi

    # Update openclaw.json5
    if [[ -f "${CONFIG_FILE}" ]]; then
        sed -i.bak "s/\"maxDailySpendUSD\": [0-9.]*/\"maxDailySpendUSD\": ${new_budget}/" "${CONFIG_FILE}" 2>/dev/null || \
        sed -i '' "s/\"maxDailySpendUSD\": [0-9.]*/\"maxDailySpendUSD\": ${new_budget}/" "${CONFIG_FILE}"
        rm -f "${CONFIG_FILE}.bak"
    fi

    log_ok "Budget updated: \$${new_budget}/day."
    log_info "Restart the Lobster for changes to take effect: ./lobster.sh reset"
}

cmd_logs() {
    log_info "Showing last 50 lines of Lobster logs..."
    docker logs "${CONTAINER_NAME}" --tail 50 2>&1
}

cmd_stop() {
    log_info "Stopping the Lobster..."
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" stop
    log_ok "All services stopped."
}

cmd_start() {
    log_info "Starting the Lobster..."
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d
    log_ok "All services started."
}

cmd_version() {
    echo -e "${BOLD}🦞 OpenClaw Elite Wrapper${NC} v${VERSION}"
    echo "   by 67Lab.ai"
    echo ""
    docker inspect --format='Image: {{.Config.Image}}' "${CONTAINER_NAME}" 2>/dev/null || true
}

cmd_help() {
    echo -e "${BOLD}🦞 Lobster CLI${NC} — OpenClaw Elite Wrapper v${VERSION}"
    echo ""
    echo "Usage: ./lobster.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  status              Check container health and resource usage"
    echo "  patch               Pull latest image and apply security updates"
    echo "  reset               Clear crashes (SingletonLock) and restart"
    echo "  install-skill <url> Download and install a .md skill file"
    echo "  budget <amount>     Update daily spending limit (USD)"
    echo "  logs                Show recent container logs"
    echo "  stop                Gracefully stop all services"
    echo "  start               Start all services"
    echo "  version             Show version info"
    echo "  help                Show this help message"
    echo ""
}

# ── Main Router ─────────────────────────────────────────────────────────────
case "${1:-help}" in
    status)         cmd_status ;;
    patch)          cmd_patch ;;
    reset)          cmd_reset ;;
    install-skill)  cmd_install_skill "${2:-}" ;;
    budget)         cmd_budget "${2:-}" ;;
    logs)           cmd_logs ;;
    stop)           cmd_stop ;;
    start)          cmd_start ;;
    version)        cmd_version ;;
    help|--help|-h) cmd_help ;;
    *)
        log_err "Unknown command: ${1}"
        cmd_help
        exit 1
        ;;
esac
