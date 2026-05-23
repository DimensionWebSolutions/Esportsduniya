/* ============================================
   ESPORTSDUNIYA — AI Radio Component
   Text-to-Speech Commentary Engine
   ============================================ */

export function createAIRadio() {
    const container = document.createElement('div');
    container.className = 'ai-radio-player glass-card';
    container.id = 'ai-radio';
    container.innerHTML = `
    <div class="radio-header">
      <div class="radio-icon">🎙️</div>
      <div class="radio-info">
        <div class="radio-title">AI Live Commentary</div>
        <div class="radio-status" id="radio-status">OFF AIR</div>
      </div>
      <button class="radio-toggle" id="radio-toggle" aria-label="Toggle Commentary">
        <span class="play-icon">▶</span>
      </button>
    </div>
    <div class="radio-visualizer" id="radio-visualizer">
      <div class="bar"></div><div class="bar"></div><div class="bar"></div>
      <div class="bar"></div><div class="bar"></div>
    </div>
  `;
    return container;
}

let speechQueue = [];
let isPlaying = false;
let synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let currentUtterance = null;
let isSpeaking = false;

export function initAIRadio() {
    const toggle = document.getElementById('radio-toggle');
    const status = document.getElementById('radio-status');
    const viz = document.getElementById('radio-visualizer');

    if (!toggle) return;

    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
        toggle.disabled = true;
        status.textContent = 'TTS UNAVAILABLE';
        status.style.color = 'var(--text-muted)';
        return;
    }

    // Load voices
    let voices = [];
    const loadVoices = () => {
        voices = synth.getVoices();
    };
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }

    toggle.addEventListener('click', () => {
        if (isPlaying) {
            stopRadio();
        } else {
            startRadio();
        }
    });

    function startRadio() {
        isPlaying = true;
        toggle.innerHTML = '⏸'; // Pause icon
        toggle.classList.add('active');
        status.textContent = 'ON AIR • LIVE';
        status.style.color = 'var(--accent-fire)';
        viz.style.opacity = '1';

        const currentNarrative = document.getElementById('ai-narrative-text')?.textContent?.trim();
        queueCommentary(
            currentNarrative ||
            "Welcome to Esports duniya Live Radio. I'm your AI commentator, bringing you the action as it happens."
        );
    }

    function stopRadio() {
        isPlaying = false;
        toggle.innerHTML = '▶'; // Play icon
        toggle.classList.remove('active');
        status.textContent = 'OFF AIR';
        status.style.color = 'var(--text-muted)';
        viz.style.opacity = '0.3';
        synth.cancel();
        speechQueue = [];
        isSpeaking = false;
    }

    window.addEventListener('beforeunload', () => {
        synth.cancel();
    });
}

export function queueCommentary(text) {
    if (!isPlaying || !text) return;

    // Don't queue if too many already (avoid lag)
    if (speechQueue.length > 3) speechQueue.shift();

    speechQueue.push(cleanCommentary(text));
    speakNext();
}

function speakNext() {
    if (!isPlaying || isSpeaking || speechQueue.length === 0) return;
    const text = speechQueue.shift();

    const utter = new SpeechSynthesisUtterance(text);
    currentUtterance = utter;
    isSpeaking = true;

    // Select a good voice (prefer English, slightly faster)
    const voices = synth.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha')) || voices[0];

    utter.voice = preferredVoice;
    utter.rate = 1.1; // Slightly faster for excitement
    utter.pitch = 1.0;
    utter.volume = 1.0;

    // Visualizer animation during speech
    utter.onstart = () => {
        const viz = document.getElementById('radio-visualizer');
        const status = document.getElementById('radio-status');
        if (viz) viz.classList.add('speaking');
        if (status) status.textContent = 'ON AIR • SPEAKING';
    };
    utter.onend = () => {
        const viz = document.getElementById('radio-visualizer');
        const status = document.getElementById('radio-status');
        if (viz) viz.classList.remove('speaking');
        if (status && isPlaying) status.textContent = 'ON AIR • LIVE';
        isSpeaking = false;
        currentUtterance = null;
        speakNext();
    };
    utter.onerror = () => {
        const status = document.getElementById('radio-status');
        if (status && isPlaying) status.textContent = 'ON AIR • RETRYING';
        isSpeaking = false;
        currentUtterance = null;
        speakNext();
    };

    synth.speak(utter);
}

function cleanCommentary(text) {
    return String(text)
        .replace(/\s+/g, ' ')
        .replace(/[🔥🎉⚡🤖🔍🧠😏]/g, '')
        .trim()
        .slice(0, 1200);
}
