const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Configuración del Juego
const GRAVITY = 0.25;
const FLAP = -4.5;
const SPAWN_RATE = 90; // frames entre obstáculos
const GAP = 150;

let bird = { x: 50, y: 300, w: 34, h: 24, v: 0 };
let pipes = [];
let score = 0;
let level = 1;
let frames = 0;
let gameOver = false;

// Colores representativos de PR (Sustitutos de imágenes para asegurar funcionalidad inmediata)
const COLORS = {
    bird: '#FFD700', // Cotorra (Amarillo)
    pipe: '#2E8B57', // Palmeras/Soy (Verde)
    bg: '#70C5FF'    // Cielo
};

function drawBird() {
    ctx.fillStyle = COLORS.bird;
    ctx.fillRect(bird.x, bird.y, bird.w, bird.h);
    // Ojo
    ctx.fillStyle = 'black';
    ctx.fillRect(bird.x + 25, bird.y + 5, 4, 4);
}

function drawPipes() {
    ctx.fillStyle = COLORS.pipe;
    pipes.forEach(p => {
        // Tubo superior
        ctx.fillRect(p.x, 0, p.w, p.top);
        // Tubo inferior
        ctx.fillRect(p.x, p.top + GAP, p.w, canvas.height - (p.top + GAP));
    });
}

function update() {
    if (gameOver) return;

    frames++;
    bird.v += GRAVITY;
    bird.y += bird.v;

    if (frames % SPAWN_RATE === 0) {
        let top = Math.random() * (canvas.height - GAP - 100) + 50;
        pipes.push({ x: canvas.width, w: 50, top: top, passed: false });
    }

    pipes.forEach(p => {
        p.x -= 2 + (level * 0.2); // Aumenta velocidad con el nivel
        if (!p.passed && p.x + p.w < bird.x) {
            p.passed = true;
            score++;
            if (score % 5 === 0) level++; // Sube nivel cada 5 puntos
        }
        // Colisiones
        if (bird.x < p.x + p.w && bird.x + bird.w > p.x &&
            (bird.y < p.top || bird.y + bird.h > p.top + GAP)) {
            gameOver = true;
        }
    });

    if (pipes.length > 0 && pipes[0].x < -50) pipes.shift();
    if (bird.y + bird.h > canvas.height || bird.y < 0) gameOver = true;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPipes();
    drawBird();
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score} | Level: ${level}`, 10, 30);

    if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.fillText('GAME OVER', 130, 300);
        ctx.font = '20px Arial';
        ctx.fillText('Pulsa Barra Espaciadora para reiniciar', 60, 340);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (gameOver) {
            bird = { x: 50, y: 300, w: 34, h: 24, v: 0 };
            pipes = [];
            score = 0;
            level = 1;
            gameOver = false;
        } else {
            bird.v = FLAP;
        }
    }
});

loop();
