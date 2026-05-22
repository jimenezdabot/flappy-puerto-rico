const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Config ---
const GRAVITY = 0.22;
const FLAP = -5.2;
const SPAWN_RATE = 85;
const GAP = 170;

let bird = { x: 80, y: 300, w: 46, h: 32, v: 0, rot: 0 };
let pipes = [];
let score = 0;
let level = 1;
let frames = 0;
let gameOver = true;

const COLORS = {
    birdGold: '#FFD700', birdBelly: '#FFFACD', 
    pipeGreen: '#2ecc71', pipeDeep: '#27ae60', pipeLight: '#C0DFB1',
    skyTop: '#4facfe', skyBottom: '#00f2fe', sun: '#fff700'
};

// --- Audio System (Sintetizado) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const playTone = (f, t, d, v = 0.1) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = t; osc.frequency.setValueAtTime(f, audioCtx.currentTime);
    gain.gain.setValueAtTime(v, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + d);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + d);
};

const sfx = {
    flap: () => playTone(380, 'triangle', 0.15),
    point: () => playTone(880, 'sine', 0.15),
    crash: () => playTone(120, 'sawtooth', 0.4, 0.2),
    level: () => { playTone(523, 'sine', 0.1); setTimeout(() => playTone(659, 'sine', 0.1), 100); }
};

function drawBird() {
    ctx.save();
    ctx.translate(bird.x + bird.w/2, bird.y + bird.h/2);
    ctx.rotate(bird.rot);
    
    // Cuerpo con degradado radial
    let grad = ctx.createRadialGradient(0, 0, 5, 0, 0, bird.w/2);
    grad.addColorStop(0, COLORS.birdBelly);
    grad.addColorStop(1, COLORS.birdGold);
    ctx.fillStyle = grad;
    
    ctx.beginPath();
    ctx.ellipse(0, 0, bird.w/2, bird.h/2, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#B8860B'; ctx.lineWidth = 2; ctx.stroke();
    
    // Ojo profesional
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(12, -5, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath(); ctx.arc(14, -5, 3, 0, Math.PI*2); ctx.fill();
    
    // Pico
    ctx.fillStyle = '#E67E22';
    ctx.beginPath();
    ctx.moveTo(20, 0); ctx.lineTo(30, 4); ctx.lineTo(20, 8);
    ctx.fill();
    
    ctx.restore();
}

function drawPipes() {
    pipes.forEach(p => {
        const drawSect = (x, y, w, h) => {
            let grad = ctx.createLinearGradient(x, 0, x + w, 0);
            grad.addColorStop(0, COLORS.pipeDeep);
            grad.addColorStop(0.4, COLORS.pipeGreen);
            grad.addColorStop(0.6, COLORS.pipeGreen);
            grad.addColorStop(1, COLORS.pipeDeep);
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = COLORS.pipeLight;
            ctx.fillRect(x, y, w, 12);
        };
        drawSect(p.x, 0, p.w, p.top);
        drawSect(p.x, p.top + GAP, p.w, canvas.height - (p.top + GAP));
    });
}

function update() {
    if (gameOver) return;

    frames++;
    bird.v += GRAVITY;
    bird.y += bird.v;
    bird.rot = Math.min(Math.PI/4, Math.max(-Math.PI/4, bird.v * 0.1));

    if (frames % SPAWN_RATE === 0) {
        let top = Math.random() * (canvas.height - GAP - 200) + 50;
        pipes.push({ x: canvas.width, w: 65, top: top, passed: false });
    }

    pipes.forEach(p => {
        p.x -= (3 + level * 0.4);
        if (!p.passed && p.x + p.w < bird.x) {
            p.passed = true;
            score++;
            sfx.point();
            if (score % 5 === 0) { level++; sfx.level(); }
        }
        if (bird.x < p.x + p.w && bird.x + bird.w > p.x &&
            (bird.y < p.top || bird.y + bird.h > p.top + GAP)) {
            gameOver = true;
            sfx.crash();
        }
    });

    if (pipes.length > 0 && pipes[0].x < -100) pipes.shift();
    if (bird.y + bird.h > canvas.height || bird.y < 0) {
        gameOver = true;
        sfx.crash();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background Gradient
    let skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, COLORS.skyTop);
    skyGrad.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0,0, canvas.width, canvas.height);

    // Sun
    ctx.fillStyle = COLORS.sun;
    ctx.beginPath(); ctx.arc(320, 80, 40, 0, Math.PI*2); ctx.fill();

    drawPipes();
    drawBird();
    
    document.getElementById('score').innerText = `SCORE: ${score}`;
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

const handleInput = () => {
    if (gameOver) {
        bird = { x: 80, y: 300, w: 44, h: 32, v: 0, rot: 0 };
        pipes = []; score = 0; level = 1; frames = 0;
        gameOver = false;
        document.getElementById('overlay').classList.add('hidden');
    } else {
        bird.v = FLAP;
        sfx.flap();
    }
};

document.getElementById('startBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    audioCtx.resume();
    handleInput();
});

window.addEventListener('keydown', (e) => { if (e.code === 'Space') handleInput(); });
window.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(); }, { passive: false });
window.addEventListener('mousedown', handleInput);

loop();
