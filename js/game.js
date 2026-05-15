const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Constants ---
const GRAVITY = 0.25;
const FLAP = -5.0;
const SPAWN_RATE = 80;
const GAP = 160;
const COLORS = {
    birdBody: '#FFD700', birdBelly: '#FFFACD', 
    pipeMain: '#2E8B57', pipeShadow: '#006400', pipeLight: '#32CD32',
    sky: '#4facfe', sun: '#FFF700'
};

// --- Game State ---
let bird = { x: 80, y: 300, w: 44, h: 32, v: 0, rot: 0 };
let pipes = [];
let score = 0;
let level = 1;
let frames = 0;
let gameOver = true;
let gameStarted = false;

// --- Audio Engine (Web Audio API for ZeroLatency) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, type, duration, volume=0.1) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

const sfx = {
    flap: () => playTone(400, 'triangle', 0.2),
    score: () => playTone(880, 'sine', 0.1),
    hit: () => playTone(150, 'sawtooth', 0.5, 0.2),
    levelUp: () => {
        playTone(523, 'sine', 0.1);
        setTimeout(() => playTone(659, 'sine', 0.1), 100);
        setTimeout(() => playTone(783, 'sine', 0.1), 200);
    }
};

// --- Drawing Logic ---
function drawBird() {
    ctx.save();
    ctx.translate(bird.x + bird.w/2, bird.y + bird.h/2);
    ctx.rotate(bird.rot);
    
    // Body
    let grad = ctx.createRadialGradient(0, 0, 5, 0, 0, bird.w/2);
    grad.addColorStop(0, COLORS.birdBelly);
    grad.addColorStop(1, COLORS.birdBody);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, bird.w/2, bird.h/2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Eye
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(10, -5, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath(); ctx.arc(12, -5, 2, 0, Math.PI*2); ctx.fill();
    
    // Beak
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.moveTo(18, 0); ctx.lineTo(26, 4); ctx.lineTo(18, 8);
    ctx.fill();
    
    ctx.restore();
}

function drawPipes() {
    pipes.forEach(p => {
        const drawCylinder = (x, y, w, h) => {
            let grad = ctx.createLinearGradient(x, 0, x + w, 0);
            grad.addColorStop(0, COLORS.pipeShadow);
            grad.addColorStop(0.4, COLORS.pipeMain);
            grad.addColorStop(0.6, COLORS.pipeLight);
            grad.addColorStop(1, COLORS.pipeShadow);
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = COLORS.pipeLight;
            ctx.fillRect(x, y, w, 8);
        };
        drawCylinder(p.x, 0, p.w, p.top);
        drawCylinder(p.x, p.top + GAP, p.w, canvas.height - (p.top + GAP));
    });
}

function __drawCylinder(x, y, w, h) {
    // Internal helper for logic
}

// Redefining drawPipes to use a helper inside the function
function drawPipesFixed() {
    pipes.forEach(p => {
        const drawSect = (x, y, w, h) => {
            let grad = ctx.createLinearGradient(x, 0, x + w, 0);
            grad.addColorStop(0, COLORS.pipeShadow);
            grad.addColorStop(0.4, COLORS.pipeMain);
            grad.addColorStop(0.6, COLORS.pipeLight);
            grad.addColorStop(1, COLORS.pipeShadow);
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = COLORS.pipeLight;
            ctx.fillRect(x, y, w, 8);
        };
        drawSect(p.x, 0, p.w, p.top);
        drawSect(p.x, p.top + GAP, p.w, canvas.height - (p.top + GAP));
    });
}

function update() {
    if (gameOver || !gameStarted) return;

    frames++;
    bird.v += GRAVITY;
    bird.y += bird.v;
    bird.rot = Math.min(Math.PI/4, Math.max(-Math.PI/4, bird.v * 0.1));

    if (frames % SPAWN_RATE === 0) {
        let top = Math.random() * (canvas.height - GAP - 200) + 50;
        pipes.push({ x: canvas.width, w: 60, top: top, passed: false });
    }

    pipes.forEach(p => {
        p.x -= (3 + level * 0.3);
        if (!p.passed && p.x + p.w < bird.x) {
            p.passed = true;
            score++;
            sfx.score();
            if (score % 5 === 0) {
                level++;
                sfx.levelUp();
            }
        }
        if (bird.x < p.x + p.w && bird.x + bird.w > p.x &&
            (bird.y < p.top || bird.y + bird.h > p.top + GAP)) {
            gameOver = true;
            sfx.hit();
        }
    });

    if (pipes.length > 0 && pipes[0].x < -100) pipes.shift();
    if (bird.y + bird.h > canvas.height || bird.y < 0) {
        gameOver = true;
        sfx.hit();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background detail: Sun
    ctx.fillStyle = COLORS.sun;
    ctx.beginPath(); ctx.arc(320, 60, 30, 0, Math.PI*2); ctx.fill();

    drawPipesFixed();
    drawBird();
    
    document.getElementById('score').innerText = `SC: ${score}`;
    document.getElementById('level').innerText = `LVL: ${level}`;

    if (gameOver) {
        document.getElementById('overlay').classList.remove('hidden');
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

const handleAction = () => {
    if (gameOver) {
        bird = { x: 80, y: 300, w: 44, h: 32, v: 0, rot: 0 };
        pipes = [];
        score = 0;
        level = 1;
        frames = 0;
        gameOver = false;
        document.getElementById('overlay').classList.add('hidden');
    } else if (!gameStarted) {
        gameStarted = true;
        document.getElementById('overlay').classList.add('hidden');
        audioCtx.resume();
    } else {
        bird.v = FLAP;
        sfx.flap();
    }
};

document.getElementById('startBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    handleAction();
});

window.addEventListener('keydown', (e) => { if (e.code === 'Space') handleAction(); });
window.addEventListener('touchstart', (e) => { e.preventDefault(); handleAction(); }, { passive: false });
window.addEventListener('mousedown', handleAction);

loop();
