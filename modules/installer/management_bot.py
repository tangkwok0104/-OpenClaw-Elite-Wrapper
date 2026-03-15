"""
OpenClaw Elite Wrapper — Telegram Management Bot
=================================================
By 67Lab.ai

A lightweight sidecar bot that allows the admin to manage their
OpenClaw instance remotely via Telegram commands.

Usage:
    python management_bot.py

Environment Variables (from .env):
    TELEGRAM_BOT_TOKEN       - The bot token from @BotFather
    ADMIN_TELEGRAM_USER_ID   - Your Telegram User ID (admin only)

Commands:
    /status   - Check Lobster health
    /patch    - Apply security updates
    /reset    - Fix crashes (clear SingletonLock)
    /budget N - Set daily budget limit
    /logs     - View recent logs
    /stop     - Stop the Lobster
    /start    - Start the Lobster
    /help     - Show available commands
"""

import os
import subprocess
import logging
from pathlib import Path

# ── Configuration ───────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent.resolve()
LOBSTER_CLI = SCRIPT_DIR / "lobster.sh"
ENV_FILE = SCRIPT_DIR / ".env"

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
ADMIN_USER_ID = int(os.getenv("ADMIN_TELEGRAM_USER_ID", "0"))

# ── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [MGMT-BOT] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Dependency Check ────────────────────────────────────────────────────────
try:
    from telegram import Update
    from telegram.ext import (
        Application,
        CommandHandler,
        ContextTypes,
    )
except ImportError:
    logger.error(
        "python-telegram-bot is not installed. "
        "Install it with: pip install python-telegram-bot>=20.0"
    )
    raise SystemExit(1)


# ── Security: Admin-Only Decorator ──────────────────────────────────────────
def admin_only(func):
    """Decorator to restrict commands to the admin user only."""
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        if user_id != ADMIN_USER_ID:
            logger.warning(f"Unauthorized access attempt from user {user_id}")
            await update.message.reply_text(
                "⛔ Unauthorized. This bot is restricted to the admin only."
            )
            return
        return await func(update, context)
    return wrapper


# ── Run lobster.sh Command ──────────────────────────────────────────────────
def run_lobster(command: str) -> str:
    """Execute a lobster.sh command and return the output."""
    try:
        result = subprocess.run(
            ["bash", str(LOBSTER_CLI), command],
            capture_output=True,
            text=True,
            timeout=120,
            cwd=str(SCRIPT_DIR),
        )
        output = result.stdout.strip()
        if result.returncode != 0 and result.stderr:
            output += f"\n\n⚠️ Errors:\n{result.stderr.strip()}"
        return output or "(No output)"
    except subprocess.TimeoutExpired:
        return "⏱️ Command timed out after 120 seconds."
    except Exception as e:
        return f"❌ Error: {str(e)}"


# ── Command Handlers ────────────────────────────────────────────────────────

@admin_only
async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Check Lobster health and resource usage."""
    await update.message.reply_text("🔍 Checking status...")
    output = run_lobster("status")
    await update.message.reply_text(f"🦞 Lobster Status:\n\n{output}")


@admin_only
async def cmd_patch(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Apply security updates."""
    await update.message.reply_text("🔧 Applying security patch... This may take a minute.")
    output = run_lobster("patch")
    await update.message.reply_text(f"✅ Patch Result:\n\n{output}")


@admin_only
async def cmd_reset(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Fix crashes by clearing SingletonLock and restarting."""
    await update.message.reply_text("🔄 Emergency reset in progress...")
    output = run_lobster("reset")
    await update.message.reply_text(f"✅ Reset Complete:\n\n{output}")


@admin_only
async def cmd_budget(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Set daily budget limit."""
    args = context.args
    if not args or len(args) < 1:
        await update.message.reply_text(
            "Usage: /budget <amount>\nExample: /budget 10"
        )
        return

    amount = args[0]
    await update.message.reply_text(f"💰 Setting budget to ${amount}/day...")
    output = run_lobster(f"budget {amount}")
    await update.message.reply_text(f"✅ Budget Updated:\n\n{output}")


@admin_only
async def cmd_logs(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """View recent container logs."""
    await update.message.reply_text("📜 Fetching logs...")
    output = run_lobster("logs")
    # Telegram has a 4096 character limit
    if len(output) > 4000:
        output = output[-4000:]
    await update.message.reply_text(f"📜 Recent Logs:\n\n{output}")


@admin_only
async def cmd_stop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Stop the Lobster."""
    await update.message.reply_text("🛑 Stopping the Lobster...")
    output = run_lobster("stop")
    await update.message.reply_text(f"🛑 Stop Result:\n\n{output}")


@admin_only
async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start the Lobster."""
    await update.message.reply_text("🚀 Starting the Lobster...")
    output = run_lobster("start")
    await update.message.reply_text(f"🚀 Start Result:\n\n{output}")


@admin_only
async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show available commands."""
    help_text = (
        "🦞 *Lobster Management Bot*\n"
        "━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "/status  — Check health & resources\n"
        "/patch   — Apply security updates\n"
        "/reset   — Fix crashes (clear locks)\n"
        "/budget N — Set daily spend limit\n"
        "/logs    — View recent logs\n"
        "/stop    — Stop all services\n"
        "/start   — Start all services\n"
        "/help    — Show this message\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━\n"
        "_by 67Lab.ai_"
    )
    await update.message.reply_text(help_text, parse_mode="Markdown")


# ── Main ────────────────────────────────────────────────────────────────────
def main():
    if not BOT_TOKEN or BOT_TOKEN == "DISABLED":
        logger.error("TELEGRAM_BOT_TOKEN is not set. Management Bot cannot start.")
        raise SystemExit(1)

    if ADMIN_USER_ID == 0:
        logger.warning(
            "ADMIN_TELEGRAM_USER_ID is not set. "
            "The bot will reject ALL commands for security."
        )

    logger.info(f"Starting Management Bot...")
    logger.info(f"Admin User ID: {ADMIN_USER_ID}")
    logger.info(f"Lobster CLI: {LOBSTER_CLI}")

    app = Application.builder().token(BOT_TOKEN).build()

    # Register command handlers
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("patch", cmd_patch))
    app.add_handler(CommandHandler("reset", cmd_reset))
    app.add_handler(CommandHandler("budget", cmd_budget))
    app.add_handler(CommandHandler("logs", cmd_logs))
    app.add_handler(CommandHandler("stop", cmd_stop))
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))

    logger.info("✅ Management Bot is online. Waiting for commands...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
