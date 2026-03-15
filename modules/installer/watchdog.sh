#!/bin/sh
# ============================================================================
#  OpenClaw Elite Wrapper — Watchdog (SingletonLock Killer)
#  By 67Lab.ai
#
#  This script runs as a sidecar container alongside OpenClaw.
#  It monitors the health of the main container and automatically
#  clears stale Chromium SingletonLock files that cause crash loops.
# ============================================================================

MEMORY_DIR="/watch/memory"
SINGLETON_LOCK="${MEMORY_DIR}/Default/SingletonLock"
OPENCLAW_CONTAINER="elite-lobster"
CHECK_INTERVAL=30           # seconds between health checks
MAX_CONSECUTIVE_FAILURES=3  # restart after N failed checks
FAILURE_COUNT=0

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WATCHDOG] $1"
}

# ── Clean SingletonLock ─────────────────────────────────────────────────────
clean_singleton_lock() {
    if [ -f "${SINGLETON_LOCK}" ]; then
        rm -f "${SINGLETON_LOCK}"
        log "🧹 Cleared stale SingletonLock file."
        return 0
    fi
    return 1
}

# ── Check Container Health ──────────────────────────────────────────────────
check_health() {
    # Method 1: Check if the container process is running
    if ! docker inspect --format='{{.State.Running}}' "${OPENCLAW_CONTAINER}" 2>/dev/null | grep -q "true"; then
        return 1
    fi

    # Method 2: Check the health endpoint if available
    if docker inspect --format='{{.State.Health.Status}}' "${OPENCLAW_CONTAINER}" 2>/dev/null | grep -q "unhealthy"; then
        return 1
    fi

    return 0
}

# ── Restart Container ───────────────────────────────────────────────────────
restart_lobster() {
    log "🔄 Restarting ${OPENCLAW_CONTAINER}..."

    # Step 1: Always clean SingletonLock before restart
    clean_singleton_lock

    # Step 2: Restart the container
    docker restart "${OPENCLAW_CONTAINER}" 2>/dev/null

    if [ $? -eq 0 ]; then
        log "✅ ${OPENCLAW_CONTAINER} restarted successfully."
    else
        log "⚠️  Failed to restart ${OPENCLAW_CONTAINER}. Docker socket may not be accessible."
    fi

    FAILURE_COUNT=0

    # Step 3: Wait for container to initialize before the next check
    sleep 60
}

# ── Main Loop ───────────────────────────────────────────────────────────────
main() {
    log "🦞 Watchdog started. Monitoring ${OPENCLAW_CONTAINER}..."
    log "   Check interval: ${CHECK_INTERVAL}s"
    log "   Max failures before restart: ${MAX_CONSECUTIVE_FAILURES}"

    # Initial cleanup on boot (preventative)
    clean_singleton_lock

    while true; do
        if check_health; then
            # Container is healthy
            if [ ${FAILURE_COUNT} -gt 0 ]; then
                log "💚 ${OPENCLAW_CONTAINER} recovered after ${FAILURE_COUNT} failure(s)."
            fi
            FAILURE_COUNT=0
        else
            # Container is unhealthy or stopped
            FAILURE_COUNT=$((FAILURE_COUNT + 1))
            log "💔 Health check failed (${FAILURE_COUNT}/${MAX_CONSECUTIVE_FAILURES})."

            if [ ${FAILURE_COUNT} -ge ${MAX_CONSECUTIVE_FAILURES} ]; then
                log "🚨 Max failures reached. Initiating recovery..."
                restart_lobster
            fi
        fi

        sleep "${CHECK_INTERVAL}"
    done
}

main
