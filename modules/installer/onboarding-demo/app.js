/* ============================================================================
   OpenClaw Elite Wrapper — Practical Installer Wizard Logic
   By 67Lab.ai
   ============================================================================ */

// ── Constants ──────────────────────────────────────────────────────────────
const INSTALL_URL = 'https://clawnexus.com/install';   // Where setup.sh is hosted
const TOTAL_STEPS = 7; // 0-6

// ── State ──────────────────────────────────────────────────────────────────
let currentStep = 0;
let triagePath = 'fresh';  // 'fresh' | 'reconfigure' | 'upgrade' | 'health'
let config = {
    env: null,       // 'vps' | 'local'
    provider: 'anthropic',
    apiKey: '',
    botToken: '',
    adminId: '',
    budget: 5,
    soul: null,      // 'seller' | 'researcher' | 'admin' | 'custom'
};

// ── LLM Provider Metadata ──────────────────────────────────────────────────
const PROVIDER_META = {
    anthropic:  { label: 'Anthropic API Key',   placeholder: 'sk-ant-api03-...', required: true, flag: 'anthropic' },
    openai:     { label: 'OpenAI API Key',      placeholder: 'sk-proj-...',      required: true, flag: 'openai' },
    google:     { label: 'Google AI API Key',   placeholder: 'AIza...',          required: true, flag: 'google' },
    deepseek:   { label: 'DeepSeek API Key',    placeholder: 'sk-...',           required: true, flag: 'deepseek' },
    openrouter: { label: 'OpenRouter API Key',  placeholder: 'sk-or-v1-...',     required: true, flag: 'openrouter' },
    local:      { label: 'Local Model (No Key Needed)', placeholder: 'Not required', required: false, flag: 'local' },
};

// ── Step Navigation ────────────────────────────────────────────────────────
function nextStep() {
    if (currentStep >= TOTAL_STEPS - 1) return;
    const oldStep = document.querySelector(`.step[data-step="${currentStep}"]`);
    currentStep++;
    const newStep = document.querySelector(`.step[data-step="${currentStep}"]`);

    if (oldStep) oldStep.classList.remove('active');
    if (newStep) {
        newStep.classList.add('active');
        newStep.style.animation = 'none';
        newStep.offsetHeight; // trigger reflow
        newStep.style.animation = '';
    }

    updateProgress();
    onStepEnter(currentStep);
}

function prevStep() {
    if (currentStep <= 0) return;
    const oldStep = document.querySelector(`.step[data-step="${currentStep}"]`);
    currentStep--;
    const newStep = document.querySelector(`.step[data-step="${currentStep}"]`);

    if (oldStep) oldStep.classList.remove('active');
    if (newStep) {
        newStep.classList.add('active');
        newStep.style.animation = 'none';
        newStep.offsetHeight;
        newStep.style.animation = '';
    }

    updateProgress();
}

function updateProgress() {
    const pct = (currentStep / (TOTAL_STEPS - 1)) * 100;
    document.getElementById('progressFill').style.width = `${pct}%`;

    document.querySelectorAll('.progress-dot').forEach((dot, i) => {
        dot.classList.remove('completed', 'current');
        if (i < currentStep) dot.classList.add('completed');
        if (i === currentStep) dot.classList.add('current');
    });
}

function buildProgressDots() {
    const container = document.getElementById('progressSteps');
    for (let i = 0; i < TOTAL_STEPS; i++) {
        const dot = document.createElement('div');
        dot.className = 'progress-dot' + (i === 0 ? ' current' : '');
        container.appendChild(dot);
    }
}

// ── Step-Specific Logic ────────────────────────────────────────────────────
function onStepEnter(step) {
    if (step === 1) runDependencyCheck();
    if (step === 2) runAutoDetect();
    if (step === 6) showOutput();
}

// ── Step 0: Triage ─────────────────────────────────────────────────────────
function selectTriage(path) {
    triagePath = path;
    document.querySelectorAll('.triage-card').forEach(c => c.classList.remove('selected'));
    const target = document.getElementById('triage' + path.charAt(0).toUpperCase() + path.slice(1));
    if (target) target.classList.add('selected');
}

function handleTriageNext() {
    if (triagePath === 'fresh') {
        // Full wizard flow: Steps 1-6
        nextStep();
    } else if (triagePath === 'reconfigure') {
        // Skip dependency check, go directly to credentials (Step 3)
        jumpToStep(3);
    } else if (triagePath === 'upgrade' || triagePath === 'health') {
        // Jump directly to output with pre-built commands
        jumpToStep(6);
    }
}

function jumpToStep(target) {
    const oldStep = document.querySelector(`.step[data-step="${currentStep}"]`);
    currentStep = target;
    const newStep = document.querySelector(`.step[data-step="${currentStep}"]`);

    if (oldStep) oldStep.classList.remove('active');
    if (newStep) {
        newStep.classList.add('active');
        newStep.style.animation = 'none';
        newStep.offsetHeight;
        newStep.style.animation = '';
    }

    updateProgress();
    onStepEnter(currentStep);
}

// ── Step 1: Terminal Animation ─────────────────────────────────────────────
function runDependencyCheck() {
    const body = document.getElementById('depTerminalBody');
    const nav = document.getElementById('depNav');
    body.innerHTML = '<div class="terminal-line prompt" style="opacity:1">$ bash setup.sh</div>';
    nav.style.display = 'none';

    const lines = [
        { text: '', cls: 'dim', delay: 400 },
        { text: '╔══════════════════════════════════════════════════════╗', cls: 'info', delay: 200 },
        { text: '║  🦞  OpenClaw Elite Wrapper  v1.0.0                 ║', cls: 'info', delay: 100 },
        { text: '║      Hardened AI Assistant Installer                ║', cls: 'info', delay: 100 },
        { text: '║      By 67Lab.ai                                   ║', cls: 'info', delay: 100 },
        { text: '╚══════════════════════════════════════════════════════╝', cls: 'info', delay: 400 },
        { text: '', cls: 'dim', delay: 200 },
        { text: '[→] Step 1/6: Checking Dependencies...', cls: 'info', delay: 600 },
        { text: '', cls: 'dim', delay: 200 },
        { text: '[✓] Checking Docker...', cls: 'success', delay: 800 },
        { text: '    Docker version 27.5.1, build 9a8e4e4', cls: 'dim', delay: 400 },
        { text: '[✓] Docker found: Docker version 27.5.1', cls: 'success', delay: 600 },
        { text: '', cls: 'dim', delay: 200 },
        { text: '[✓] Checking Docker Compose...', cls: 'success', delay: 500 },
        { text: '    Docker Compose version v2.32.4', cls: 'dim', delay: 300 },
        { text: '[✓] Docker Compose found: 2.32.4', cls: 'success', delay: 500 },
        { text: '', cls: 'dim', delay: 200 },
        { text: '[✓] Checking curl...', cls: 'success', delay: 400 },
        { text: '[✓] curl found.', cls: 'success', delay: 300 },
        { text: '', cls: 'dim', delay: 200 },
        { text: '[✓] All dependencies satisfied. Ready to proceed.', cls: 'success', delay: 200 },
    ];

    let totalDelay = 0;
    lines.forEach((line) => {
        totalDelay += line.delay;
        setTimeout(() => {
            const el = document.createElement('div');
            el.className = `terminal-line ${line.cls}`;
            el.textContent = line.text;
            body.appendChild(el);
            body.scrollTop = body.scrollHeight;
        }, totalDelay);
    });

    setTimeout(() => {
        nav.style.display = 'flex';
        nav.style.animation = 'fadeSlideIn 0.4s ease forwards';
    }, totalDelay + 400);
}

// ── Step 2: Environment Auto-Detection ─────────────────────────────────────
function runAutoDetect() {
    const banner = document.getElementById('autoDetectBanner');
    const result = document.getElementById('autoDetectResult');
    banner.classList.remove('detected');
    result.textContent = 'Scanning…';

    const phases = [
        { text: 'Checking /proc/cpuinfo…', delay: 600 },
        { text: 'Probing hypervisor…', delay: 900 },
        { text: 'Analysing network interfaces…', delay: 700 },
    ];

    let totalDelay = 0;
    phases.forEach(phase => {
        totalDelay += phase.delay;
        setTimeout(() => {
            result.textContent = phase.text;
        }, totalDelay);
    });

    totalDelay += 500;
    setTimeout(() => {
        result.textContent = 'VPS / Cloud detected (KVM virtualisation)';
        banner.classList.add('detected');
        selectEnv('vps');
    }, totalDelay);
}

// ── Step 2: Environment Selection ──────────────────────────────────────────
function selectEnv(env) {
    config.env = env;
    document.getElementById('envVps').classList.toggle('selected', env === 'vps');
    document.getElementById('envLocal').classList.toggle('selected', env === 'local');
    document.getElementById('envNextBtn').disabled = false;
}

// ── Step 3: Provider Dropdown ──────────────────────────────────────────────
function updateProviderHint(provider) {
    config.provider = provider;
    const meta = PROVIDER_META[provider] || PROVIDER_META.anthropic;
    document.getElementById('apiKeyLabel').textContent = meta.label;
    document.getElementById('apiKeyInput').placeholder = meta.placeholder;

    const group = document.getElementById('apiKeyGroup');
    const badge = document.getElementById('apiKeyRequired');

    if (!meta.required) {
        group.style.opacity = '0.45';
        group.style.pointerEvents = 'none';
        badge.textContent = 'Skipped';
        badge.className = 'optional-badge';
    } else {
        group.style.opacity = '1';
        group.style.pointerEvents = 'auto';
        badge.textContent = 'Required';
        badge.className = 'required-badge';
    }
}

// ── Step 3: Credential Validation ──────────────────────────────────────────
function validateCredentials() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    const botToken = document.getElementById('botTokenInput').value.trim();
    const adminId = document.getElementById('adminIdInput').value.trim();
    const provider = document.getElementById('llmProviderSelect').value;
    const meta = PROVIDER_META[provider];

    const existingError = document.querySelector('.form-error.visible');
    if (existingError) existingError.classList.remove('visible');

    if (meta.required && !apiKey) {
        showFormError('apiKeyInput', 'API Key is required to continue.');
        return;
    }

    config.provider = provider;
    config.apiKey = meta.required ? apiKey : 'LOCAL_MODEL';
    config.botToken = botToken || 'DISABLED';
    config.adminId = adminId || '0';
    nextStep();
}

function showFormError(inputId, message) {
    const input = document.getElementById(inputId);
    let errorEl = input.closest('.form-group').querySelector('.form-error');
    if (!errorEl) {
        errorEl = document.createElement('p');
        errorEl.className = 'form-error';
        input.closest('.form-group').appendChild(errorEl);
    }
    errorEl.textContent = message;
    errorEl.classList.add('visible');
    input.style.borderColor = 'var(--accent-danger)';
    input.focus();
    setTimeout(() => {
        errorEl.classList.remove('visible');
        input.style.borderColor = '';
    }, 3000);
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.style.color = isPassword ? 'var(--accent-primary)' : 'var(--text-dim)';
}

// ── Step 4: Budget ─────────────────────────────────────────────────────────
function updateBudget(value) {
    config.budget = parseInt(value);
    const display = document.getElementById('budgetValue');
    display.textContent = value;

    const info = document.getElementById('budgetInfo');
    if (parseInt(value) === 0) {
        info.innerHTML = `
            <div class="budget-info-icon">⚠️</div>
            <p><strong style="color: var(--accent-danger)">No limit set.</strong> Your Lobster can spend unlimited amounts on API calls. Use with caution.</p>
        `;
        info.classList.add('warning');
    } else {
        info.innerHTML = `
            <div class="budget-info-icon">🛡️</div>
            <p>Your Lobster will <strong>pause automatically</strong> when it approaches $${value} in API usage for the day.</p>
        `;
        info.classList.remove('warning');
    }

    document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('customBudgetRow').style.display = 'none';
    document.getElementById('presetCustomBtn').classList.remove('active');
}

function setBudget(value) {
    config.budget = value;
    const slider = document.getElementById('budgetSlider');
    slider.value = Math.min(value, parseInt(slider.max));
    document.getElementById('budgetValue').textContent = value;
    updateBudget(value);

    document.getElementById('customBudgetRow').style.display = 'none';
    document.getElementById('presetCustomBtn').classList.remove('active');

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(`$${value}`) || (value === 0 && btn.textContent.includes('No Limit'))) {
            btn.classList.add('active');
        }
    });
}

function toggleCustomBudget() {
    const row = document.getElementById('customBudgetRow');
    const btn = document.getElementById('presetCustomBtn');
    const isOpen = row.style.display !== 'none';

    if (isOpen) {
        row.style.display = 'none';
        btn.classList.remove('active');
    } else {
        row.style.display = 'flex';
        row.style.animation = 'fadeSlideIn 0.3s ease forwards';
        btn.classList.add('active');
        document.querySelectorAll('.preset-btn:not(.preset-custom)').forEach(b => b.classList.remove('active'));
        document.getElementById('customBudgetInput').focus();
    }
}

function applyCustomBudget() {
    const input = document.getElementById('customBudgetInput');
    const val = parseInt(input.value);
    if (isNaN(val) || val < 0) return;

    config.budget = val;
    document.getElementById('budgetValue').textContent = val;

    const slider = document.getElementById('budgetSlider');
    slider.value = Math.min(val, parseInt(slider.max));

    const info = document.getElementById('budgetInfo');
    if (val === 0) {
        info.innerHTML = `
            <div class="budget-info-icon">⚠️</div>
            <p><strong style="color: var(--accent-danger)">No limit set.</strong> Your Lobster can spend unlimited amounts on API calls. Use with caution.</p>
        `;
        info.classList.add('warning');
    } else {
        info.innerHTML = `
            <div class="budget-info-icon">🛡️</div>
            <p>Your Lobster will <strong>pause automatically</strong> when it approaches $${val} in API usage for the day.</p>
        `;
        info.classList.remove('warning');
    }
}

// ── Step 5: Soul Selection ─────────────────────────────────────────────────
function selectSoul(soul) {
    config.soul = soul;
    document.querySelectorAll('.soul-card').forEach(c => c.classList.remove('selected'));
    document.getElementById(`soul${soul.charAt(0).toUpperCase() + soul.slice(1)}`).classList.add('selected');
    document.getElementById('soulNextBtn').disabled = false;
}

// ── OS Detection ───────────────────────────────────────────────────────────
let detectedOS = 'linux'; // 'windows' | 'macos' | 'linux'

function detectUserOS() {
    const ua = navigator.userAgent.toLowerCase();
    const platform = (navigator.platform || '').toLowerCase();

    if (platform.includes('win') || ua.includes('windows')) {
        detectedOS = 'windows';
    } else if (platform.includes('mac') || ua.includes('macintosh')) {
        detectedOS = 'macos';
    } else {
        detectedOS = 'linux';
    }
    return detectedOS;
}

const OS_META = {
    windows: { icon: '🪟', label: 'Windows',       badge: '.ps1', file: 'openclaw-elite-install.ps1', mime: 'application/x-powershell' },
    macos:   { icon: '🍎', label: 'macOS',          badge: '.sh',  file: 'openclaw-elite-install.sh',  mime: 'application/x-shellscript' },
    linux:   { icon: '🐧', label: 'Linux',          badge: '.sh',  file: 'openclaw-elite-install.sh',  mime: 'application/x-shellscript' },
};

// ══════════════════════════════════════════════════════════════════════════
//  STEP 6: PRACTICAL OUTPUT — OS-Aware Command Generator
// ══════════════════════════════════════════════════════════════════════════

function showOutput() {
    detectUserOS();
    populateOSBanner();

    if (triagePath === 'upgrade') {
        showUpgradeOutput();
        return;
    }
    if (triagePath === 'health') {
        showHealthCheckOutput();
        return;
    }

    // Fresh install or Reconfigure
    const isReconfigure = triagePath === 'reconfigure';

    // Populate summary
    const providerLabels = {
        anthropic: 'Claude', openai: 'GPT', google: 'Gemini',
        deepseek: 'DeepSeek', openrouter: 'OpenRouter', local: 'Local LLM'
    };
    const soulLabels = {
        seller: '🏪 Seller', researcher: '🔬 Researcher',
        admin: '📋 Admin', custom: '⚙️ Custom'
    };

    const modeText = config.env === 'vps'
        ? `☁️ VPS · ${providerLabels[config.provider] || config.provider}`
        : `🏠 Local · ${providerLabels[config.provider] || config.provider}`;

    document.getElementById('sumMode').textContent = modeText;
    document.getElementById('sumBudget').textContent = config.budget === 0 ? '⚠️ No limit' : `$${config.budget}/day`;
    document.getElementById('sumSoul').textContent = soulLabels[config.soul] || config.soul || '—';

    // Build the command (platform-aware)
    const cmd = detectedOS === 'windows' ? buildPowerShellOneLiner() : buildInstallCommand();
    document.getElementById('outputCode').textContent = cmd;

    // Update output label per OS
    if (detectedOS === 'windows') {
        document.getElementById('outputLabel').textContent = '⚡ PowerShell Install Command';
    } else {
        document.getElementById('outputLabel').textContent = '📋 One-Liner Install Command';
    }

    // Update download button label
    const osMeta = OS_META[detectedOS];
    document.getElementById('downloadLabel').textContent = `Download ${osMeta.badge} Script`;

    // Description + instructions (context-aware)
    populateInstructions(isReconfigure);

    // Show sections with staggered reveal
    progressiveReveal();
}

/**
 * Show the OS detection banner at the top of Step 6.
 */
function populateOSBanner() {
    const meta = OS_META[detectedOS];
    document.getElementById('osIcon').textContent = meta.icon;
    document.getElementById('osValue').textContent = meta.label;
    document.getElementById('osBadge').textContent = meta.badge;

    // If user chose VPS → the command runs on Linux regardless of desktop OS
    if (config.env === 'vps') {
        document.getElementById('osIcon').textContent = '🐧';
        document.getElementById('osValue').textContent = 'Linux (your VPS)';
        document.getElementById('osBadge').textContent = '.sh';
    }
}

/**
 * Populate the instructions card based on platform + triage path.
 */
function populateInstructions(isReconfigure) {
    const isVPS = config.env === 'vps';

    if (isReconfigure) {
        document.getElementById('outputDesc').textContent = 'Run this on the machine where OpenClaw is already installed.';
        document.getElementById('instructionsTitle').textContent = 'How to Reconfigure';
        document.getElementById('instructionsList').innerHTML = `
            <li>SSH into your VPS (or open Terminal locally) where OpenClaw is installed</li>
            <li><code>cd</code> into your OpenClaw Elite Wrapper directory</li>
            <li>Paste the command above — it will update your <code>.env</code> and <code>openclaw.json5</code></li>
            <li>Run <code>./lobster.sh reset</code> to apply the new configuration</li>
        `;
        return;
    }

    if (isVPS) {
        document.getElementById('outputDesc').textContent = 'Copy this command and paste it into your VPS terminal via SSH.';
        document.getElementById('instructionsTitle').textContent = 'How to Run (VPS)';
        document.getElementById('instructionsList').innerHTML = `
            <li>Open your VPS provider's panel and launch the <strong>SSH terminal</strong> (or use <code>ssh root@your-server-ip</code>)</li>
            <li>Paste the command above and press <strong>Enter</strong></li>
            <li>The script will install Docker (if missing), configure your Lobster, and start all services</li>
            <li>When complete, you'll see the success banner with <code>./lobster.sh</code> commands</li>
        `;
    } else if (detectedOS === 'windows') {
        document.getElementById('outputDesc').textContent = 'Open PowerShell as Administrator and paste this command.';
        document.getElementById('instructionsTitle').textContent = 'How to Run (Windows)';
        document.getElementById('instructionsList').innerHTML = `
            <li>Press <strong>Win + X</strong> and select <strong>"Terminal (Admin)"</strong> or <strong>"PowerShell (Admin)"</strong></li>
            <li>Paste the command above and press <strong>Enter</strong></li>
            <li>If prompted, type <code>Y</code> to allow the script to run</li>
            <li>The script will check for Docker Desktop, install dependencies, and start your Lobster</li>
            <li>When complete, you'll see the success banner in your terminal</li>
        `;
    } else if (detectedOS === 'macos') {
        document.getElementById('outputDesc').textContent = 'Open Terminal and paste this command.';
        document.getElementById('instructionsTitle').textContent = 'How to Run (macOS)';
        document.getElementById('instructionsList').innerHTML = `
            <li>Open <strong>Terminal</strong> (press <code>⌘ + Space</code>, type "Terminal", hit Enter)</li>
            <li>Paste the command above and press <strong>Enter</strong></li>
            <li>If prompted for your password, type it (it won't show characters — that's normal)</li>
            <li>The script will install Docker (if missing), configure your Lobster, and start all services</li>
        `;
    } else {
        document.getElementById('outputDesc').textContent = 'Open your Terminal and paste this command.';
        document.getElementById('instructionsTitle').textContent = 'How to Run (Linux)';
        document.getElementById('instructionsList').innerHTML = `
            <li>Open your <strong>Terminal</strong> application</li>
            <li>Paste the command above and press <strong>Enter</strong></li>
            <li>The script will install Docker (if missing), configure your Lobster, and start all services</li>
            <li>When complete, you'll see the success banner with <code>./lobster.sh</code> commands</li>
        `;
    }
}

/**
 * Staggered reveal — sections animate in sequentially to avoid information overload.
 */
function progressiveReveal() {
    const sections = [
        'osBanner', 'configSummary', 'outputPanel', 'outputActions',
        'instructionsCard', 'commandsCard', 'discordCta'
    ];

    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(12px)';
        }
    });

    sections.forEach((id, i) => {
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el && el.style.display !== 'none') {
                el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }
        }, 120 * i);
    });
}

/**
 * Toggle the instructions card open/closed.
 */
function toggleInstructions() {
    const list = document.getElementById('instructionsList');
    const toggle = document.getElementById('instructionsToggle');
    if (list.style.display === 'none') {
        list.style.display = '';
        toggle.textContent = '▼';
    } else {
        list.style.display = 'none';
        toggle.textContent = '▶';
    }
}

/**
 * Build the one-liner install command (bash — for Linux/macOS).
 */
function buildInstallCommand() {
    const parts = [`curl -fsSL ${INSTALL_URL} | bash -s --`];
    parts.push(`--mode=${config.env || 'vps'}`);
    parts.push(`--provider=${config.provider}`);

    if (config.apiKey && config.apiKey !== 'LOCAL_MODEL') {
        const masked = config.apiKey.substring(0, 8) + '...' + config.apiKey.substring(config.apiKey.length - 4);
        parts.push(`--key="${masked}"`);
    } else if (config.provider === 'local') {
        parts.push('--key=LOCAL');
    }

    parts.push(`--budget=${config.budget}`);
    parts.push(`--soul=${config.soul || 'admin'}`);

    if (config.botToken && config.botToken !== 'DISABLED') {
        parts.push('--telegram=CONFIGURED');
    }

    return parts.join(' \\\n    ');
}

/**
 * Build the PowerShell one-liner (for Windows users).
 */
function buildPowerShellOneLiner() {
    const keyDisplay = (config.apiKey && config.apiKey !== 'LOCAL_MODEL')
        ? config.apiKey.substring(0, 8) + '...' + config.apiKey.substring(config.apiKey.length - 4)
        : 'LOCAL';

    return `irm ${INSTALL_URL} | iex; `
         + `Install-OpenClaw `
         + `-Mode ${config.env || 'vps'} `
         + `-Provider ${config.provider} `
         + `-Key "${keyDisplay}" `
         + `-Budget ${config.budget} `
         + `-Soul ${config.soul || 'admin'}`;
}

/**
 * Build the FULL command (with real key) for clipboard.
 */
function buildFullInstallCommand() {
    if (detectedOS === 'windows' && config.env !== 'vps') {
        return buildFullPowerShellCommand();
    }

    const parts = [`curl -fsSL ${INSTALL_URL} | bash -s --`];
    parts.push(`--mode=${config.env || 'vps'}`);
    parts.push(`--provider=${config.provider}`);

    if (config.apiKey && config.apiKey !== 'LOCAL_MODEL') {
        parts.push(`--key="${config.apiKey}"`);
    } else if (config.provider === 'local') {
        parts.push('--key=LOCAL');
    }

    parts.push(`--budget=${config.budget}`);
    parts.push(`--soul=${config.soul || 'admin'}`);

    if (config.botToken && config.botToken !== 'DISABLED') {
        parts.push(`--telegram="${config.botToken}"`);
    }
    if (config.adminId && config.adminId !== '0') {
        parts.push(`--admin=${config.adminId}`);
    }

    return parts.join(' \\\n    ');
}

function buildFullPowerShellCommand() {
    const key = (config.apiKey && config.apiKey !== 'LOCAL_MODEL') ? config.apiKey : 'LOCAL';
    return `irm ${INSTALL_URL} | iex; `
         + `Install-OpenClaw `
         + `-Mode ${config.env || 'vps'} `
         + `-Provider ${config.provider} `
         + `-Key "${key}" `
         + `-Budget ${config.budget} `
         + `-Soul ${config.soul || 'admin'}`;
}

/**
 * Upgrade path — show a simple patch command.
 */
function showUpgradeOutput() {
    document.getElementById('outputDesc').textContent = 'Run this on the machine where OpenClaw is installed.';
    document.getElementById('outputCode').textContent =
`# SSH into your VPS first, then:
cd /path/to/openclaw-elite-wrapper
./lobster.sh patch

# This will:
#   1. Pull the latest Docker image
#   2. Clear any SingletonLock issues
#   3. Restart all containers with the new version`;

    document.getElementById('instructionsTitle').textContent = 'How to Upgrade';
    document.getElementById('instructionsList').innerHTML = `
        <li>SSH into the machine running your Lobster</li>
        <li><code>cd</code> into the directory where you originally installed the wrapper</li>
        <li>Run <code>./lobster.sh patch</code> — this pulls the latest image and restarts</li>
        <li>Verify with <code>./lobster.sh status</code> to confirm it's healthy</li>
    `;

    // Hide UI sections that don't apply to Upgrade
    document.getElementById('configSummary').style.display = 'none';
    document.getElementById('commandsCard').style.display = 'none';
    document.getElementById('outputActions').style.display = 'none';

    progressiveReveal();
}

/**
 * Health check path — show diagnostic commands.
 */
function showHealthCheckOutput() {
    document.getElementById('outputDesc').textContent = 'Run these commands to diagnose issues with your Lobster.';
    document.getElementById('outputCode').textContent =
`# SSH into your VPS first, then:
cd /path/to/openclaw-elite-wrapper

# 1. Check overall status
./lobster.sh status

# 2. View recent logs for errors
./lobster.sh logs

# 3. If container is crashed / stuck:
./lobster.sh reset

# 4. Nuclear option — full restart:
docker compose --env-file .env down
docker compose --env-file .env up -d

# 5. Check disk space (common issue):
df -h`;

    document.getElementById('instructionsTitle').textContent = 'Troubleshooting Guide';
    document.getElementById('instructionsList').innerHTML = `
        <li><strong>Container not running?</strong> → <code>./lobster.sh reset</code> clears the SingletonLock and restarts</li>
        <li><strong>Out of memory?</strong> → Check <code>./lobster.sh status</code> for RAM usage, consider upgrading VPS</li>
        <li><strong>Port 8080 in use?</strong> → Run <code>lsof -ti:8080 | xargs kill</code> then <code>./lobster.sh start</code></li>
        <li><strong>API key expired?</strong> → Edit <code>.env</code>, update the key, then <code>./lobster.sh reset</code></li>
        <li><strong>Still stuck?</strong> → Join <a href="https://discord.gg/BUnQYZpnxv" target="_blank">ClawNexus Discord</a> for community help</li>
    `;

    document.getElementById('configSummary').style.display = 'none';
    document.getElementById('commandsCard').style.display = 'none';
    document.getElementById('outputActions').style.display = 'none';

    progressiveReveal();
}

// ── Copy / Download Actions ────────────────────────────────────────────────
function copyInstallCommand() {
    const fullCmd = (triagePath === 'fresh' || triagePath === 'reconfigure')
        ? buildFullInstallCommand()
        : document.getElementById('outputCode').textContent;

    navigator.clipboard.writeText(fullCmd).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.querySelector('span').textContent = 'Copied!';
        btn.style.color = 'var(--accent-success)';
        showToast('📋 Command copied to clipboard (with your real API key)');
        setTimeout(() => {
            btn.querySelector('span').textContent = 'Copy';
            btn.style.color = '';
        }, 2000);
    });
}

function downloadInstallScript() {
    // VPS mode always gets .sh (runs on Linux), local Windows gets .ps1
    const usePS1 = (detectedOS === 'windows' && config.env !== 'vps');
    const script = usePS1 ? generatePowerShellScript() : generateInstallScript();
    const meta = usePS1
        ? { file: 'openclaw-elite-install.ps1', mime: 'application/x-powershell', ext: '.ps1' }
        : { file: 'openclaw-elite-install.sh',  mime: 'application/x-shellscript', ext: '.sh' };

    const blob = new Blob([script], { type: meta.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = meta.file;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (usePS1) {
        showToast(`📥 ${meta.file} downloaded — right-click → "Run with PowerShell"`);
    } else if (config.env === 'vps') {
        showToast(`📥 ${meta.file} downloaded — transfer to your VPS via SCP`);
    } else {
        showToast(`📥 ${meta.file} downloaded — open Terminal and run: chmod +x ${meta.file} && ./${meta.file}`);
    }
}

/**
 * Generate a pre-filled bash install script for Linux/macOS.
 */
function generateInstallScript() {
    return `#!/usr/bin/env bash
# ============================================================================
#  OpenClaw Elite Wrapper — Pre-Configured Installer
#  Generated by the Setup Wizard on ${new Date().toISOString().split('T')[0]}
#  By 67Lab.ai | https://67lab.ai
# ============================================================================
#
#  Transfer this file to your VPS:
#    scp openclaw-elite-install.sh root@your-server-ip:~
#
#  Then run:
#    chmod +x openclaw-elite-install.sh && ./openclaw-elite-install.sh
#
# ============================================================================

set -euo pipefail

# ── Your Configuration (from the Setup Wizard) ─────────────────────────────
DEPLOY_MODE="${config.env || 'vps'}"
LLM_PROVIDER="${config.provider}"
API_KEY="${config.apiKey}"
DAILY_BUDGET="${config.budget}"
SOUL="${config.soul || 'admin'}"
BOT_TOKEN="${config.botToken || 'DISABLED'}"
ADMIN_ID="${config.adminId || '0'}"

# ── Fetch and run the main installer with your config ──────────────────────
echo "🦞 OpenClaw Elite Wrapper — Starting pre-configured install..."
echo "   Mode: $DEPLOY_MODE | Provider: $LLM_PROVIDER | Budget: \\$$DAILY_BUDGET/day"
echo ""

curl -fsSL ${INSTALL_URL} | bash -s -- \\
    --mode="$DEPLOY_MODE" \\
    --provider="$LLM_PROVIDER" \\
    --key="$API_KEY" \\
    --budget="$DAILY_BUDGET" \\
    --soul="$SOUL" \\
    --telegram="$BOT_TOKEN" \\
    --admin="$ADMIN_ID"
`;
}

/**
 * Generate a pre-filled PowerShell install script for Windows.
 */
function generatePowerShellScript() {
    return `# ============================================================================
#  OpenClaw Elite Wrapper — Pre-Configured Installer (Windows)
#  Generated by the Setup Wizard on ${new Date().toISOString().split('T')[0]}
#  By 67Lab.ai | https://67lab.ai
# ============================================================================
#
#  HOW TO RUN:
#    1. Right-click this file → "Run with PowerShell"
#    2. OR open PowerShell as Admin and run:
#       .\\openclaw-elite-install.ps1
#
# ============================================================================

$ErrorActionPreference = "Stop"

# ── Your Configuration (from the Setup Wizard) ─────────────────────────────
$DEPLOY_MODE   = "${config.env || 'local'}"
$LLM_PROVIDER  = "${config.provider}"
$API_KEY       = "${config.apiKey}"
$DAILY_BUDGET  = "${config.budget}"
$SOUL          = "${config.soul || 'admin'}"
$BOT_TOKEN     = "${config.botToken || 'DISABLED'}"
$ADMIN_ID      = "${config.adminId || '0'}"

# ── Pre-flight: Check for Docker Desktop ───────────────────────────────────
Write-Host ""
Write-Host "🦞 OpenClaw Elite Wrapper — Starting pre-configured install..." -ForegroundColor Cyan
Write-Host "   Mode: $DEPLOY_MODE | Provider: $LLM_PROVIDER | Budget: $$DAILY_BUDGET/day"
Write-Host ""

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed." -ForegroundColor Red
    Write-Host "   Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    Write-Host "   After installing, restart your computer and run this script again." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# ── Download and execute the installer via WSL or direct curl ──────────────
if (Get-Command wsl -ErrorAction SilentlyContinue) {
    Write-Host "✅ WSL detected — running installer via WSL..." -ForegroundColor Green
    wsl bash -c "curl -fsSL ${INSTALL_URL} | bash -s -- --mode=$DEPLOY_MODE --provider=$LLM_PROVIDER --key='$API_KEY' --budget=$DAILY_BUDGET --soul=$SOUL --telegram='$BOT_TOKEN' --admin=$ADMIN_ID"
} else {
    Write-Host "⚠️  WSL not available — downloading installer..." -ForegroundColor Yellow
    $installerPath = Join-Path $env:TEMP "openclaw-setup.sh"
    Invoke-WebRequest -Uri "${INSTALL_URL}" -OutFile $installerPath
    Write-Host "📄 Installer saved to: $installerPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To complete installation, please install WSL:" -ForegroundColor Yellow
    Write-Host "   wsl --install" -ForegroundColor White
    Write-Host "   Then run: wsl bash $installerPath --mode=$DEPLOY_MODE --provider=$LLM_PROVIDER --key='$API_KEY' --budget=$DAILY_BUDGET --soul=$SOUL" -ForegroundColor White
    Read-Host "Press Enter to exit"
}
`;
}

// ── Generic Utilities ──────────────────────────────────────────────────────
function copyCommand(cmd) {
    navigator.clipboard.writeText(cmd).then(() => showToast(`Copied: ${cmd}`));
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2500);
}

// ── Particle Background ────────────────────────────────────────────────────
function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 50;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 1.5 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.3 + 0.05;
            this.hue = 240 + Math.random() * 40;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 70%, 60%, ${this.opacity})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }

    function drawLines() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(99, 102, 241, ${0.06 * (1 - dist / 120)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        drawLines();
        requestAnimationFrame(animate);
    }

    animate();
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    buildProgressDots();
    initParticles();
});
