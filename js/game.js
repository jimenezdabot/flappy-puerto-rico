const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Configuración ---
const GRAVITY = 0.22;
const FLAP = -5.5;
const SPAWN_RATE = 90;
const GAP = 170;

let bird = { x: 80, y: 300, w: 40, h: 30, v: 0, rot: 0 };
let pipes = [];
let score = 0;
let level = 1;
let frames = 0;
let gameOver = false;

// Pseudo-3D: Degradados y sombras
const COLORS = {
    birdBody: '#FFD700',
    birdBelly: '#FFFACD',
    pipeMain: '#228B22',
    pipeShadow: '#006400',
    pipeLight: '#32CD32'
};

function drawBird() {
    ctx.save();
    ctx.translate(bird.x + bird.w/2, bird.y + bird.h/2);
    ctx.rotate(bird.rot);
    
    // Cuerpo con degradado pseudo-3D
    let grad = ctx.createLinearGradient(-bird.w/2, -bird.h/2, bird.w/2, bird.h/2);
    grad.addColorStop(0, COLORS.birdBody);
    grad.addColorStop(1, COLORS.birdBelly);
    ctx.fillStyle = grad;
    
    // Forma redondeada (estilo burbuja)
    ctx.beginPath();
    ctx.ellipse(0, 0, bird.w/2, bird.h/2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Ojo
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(8, -5, 5, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(10, -5, 2, 0, Math.PI*2);
    ctx.fill();
    
    // Pico
    ctx.fillStyle = 'orange';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(25, 4);
    ctx.lineTo(18, 8);
    ctx.fill();
    
    ctx.restore();
}

function drawPipes() {
    pipes.forEach(p => {
        // Efecto 3D en tuberías (Luz y Sombra)
        const drawCyl = (x, y, w, h) => {
            let grad = ctx.createLinearGradient(x, 0, x + w, 0);
            grad.addColorStop(0, COLORS.pipeShadow);
            grad.addColorStop(0.4, COLORS.pipeMain);
            grad.addColorStop(0.6, COLORS.pipeLight);
            grad.addColorStop(1, COLORS.pipeShadow);
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, w, h);
            
            // Borde superior del tubo para efecto 3D
            ctx.fillStyle = COLORS.pipeLight;
            ctx.fillRect(x, y, w, 10);
        };

        drawCyl(p.x, 0, p.w, p.top);
        drawCyl(p.x, p.top + GAP, p.w, canvas.height - (p.top + GAP));
    });
}

function update() {
    if (gameOver) return;

    frames++;
    bird.v += GRAVITY;
    bird.y += bird.v;
    
    // Rotación basada en la velocidad (Efecto Dinámico)
    bird.rot = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, bird.v * 0.1));

    if (frames % SPAWN_RATE === 0) {
        let top = Math.random() * (canvas.height - GAP - 200) + 50;
        pipes.push({ x: canvas.width, w: 60, top: top, passed: false });
    }

    pipes.forEach(p => {
        p.x -= (3 + level * 0.3);
        if (!p.passed && p.x + p.w < bird.x) {
            p.passed = true;
            score++;
            if (score % 5 === 0) level++;
        }
        if (bird.x < p.x + p.w && bird.x + bird.w > p.x &&
            (bird.y < p.top || bird.y + bird.h > p.top + GAP)) {
            gameOver = true;
        }
    });

    if (pipes.length > 0 && pipes[0].x < -100) pipes.shift();
    if (bird.y + bird.h > canvas.height || bird.y < 0) gameOver = true;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fondo: Nubes simples para profundidad
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(100, 100, 40, 0, Math.PI*2);
    ctx.arc(130, 100, 50, 0, Math.PI*2);
    ctx.arc(160, 100, 40, 0, Math.PI*2);
    ctx.fill();

    drawPipes();
    drawBird();
    
    // UI Actualizada
    document.getElementById('score').innerText = `Score: ${score}`;
    document.getElementById('level').innerText = `Nivel: ${level}`;

    if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('¡SANTIAGU!: GAME OVER', canvas.width/2, 300);
        ctx.font = '20px Arial';
        ctx.fillText('Pulsa ESPACIO o TOCA la pantalla', canvas.width/2, 340);
        ctx.textAlign = 'left';
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

const handleInput = () => {
    if (gameOver) {
        bird = { x: 80, y: 300, w: 40, h: 30, v: 0, rot: 0 };
        pipes = [];
        score = 0;
        level = 1;
        gameOver = false;
    } else {
        bird.v = FLAP;
    }
};

window.addEventListener('keydown', (e) => { if (e.code === 'Space') handleInput(); });
window.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(); }, { passive: false });
window.addEventListener('mousedown', handleInput);

loop();
