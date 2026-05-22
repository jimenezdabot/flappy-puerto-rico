(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // --- Game Model / State Machine ---
  const GAME_STATE = Object.freeze({
    MENU: 'menu',
    RUNNING: 'running',
    PAUSED: 'paused',
    GAMEOVER: 'gameover'
  });

  const CONFIG = Object.freeze({
    gravity: 520, // px/s^2 (tuned for playability)
    flapVelocity: -300, // px/s
    spawnEveryS: 1.25,
    gapPx: 170,
    pipeW: 65,
    baseSpeed: 150, // px/s
    speedPerLevel: 16, // px/s
    levelEvery: 5,
    pipeMarginTop: 50,
    pipeMarginBottom: 150,
    bird: { x: 80, w: 46, h: 32 }
  });

  // --- UI ---
  const el = {
    score: document.getElementById('score'),
    level: document.getElementById('level'),
    best: document.getElementById('best'),
    overlay: document.getElementById('overlay'),
    overlayTitle: document.getElementById('overlayTitle'),
    overlaySubtitle: document.getElementById('overlaySubtitle'),
    overlayHint: document.getElementById('overlayHint'),
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    muteBtn: document.getElementById('muteBtn'),
    fsBtn: document.getElementById('fsBtn')
  };

  function saveBest(best) {
    try {
      localStorage.setItem('flappypr_best', String(best));
    } catch (_) {}
  }

  function loadBest() {
    try {
      const v = Number(localStorage.getItem('flappypr_best') || 0);
      return Number.isFinite(v) ? v : 0;
    } catch (_) {
      return 0;
    }
  }

  let state = {
    mode: GAME_STATE.MENU,
    bird: { x: CONFIG.bird.x, y: 300, w: CONFIG.bird.w, h: CONFIG.bird.h, v: 0, rot: 0 },
    pipes: [],
    score: 0,
    best: loadBest(),
    level: 1,
    t: 0,
    spawnTimer: 0,
    invulnS: 0,
    muted: false
  };

  // --- Colors / Visuals ---
  const COLORS = {
    birdGold: '#FFD700',
    birdBelly: '#FFFACD',
    pipeGreen: '#2ecc71',
    pipeDeep: '#27ae60',
    pipeLight: '#C0DFB1',
    skyTop: '#4facfe',
    skyBottom: '#00f2fe',
    sun: '#fff700'
  };

  // --- Audio (lazy) ---
  let audioCtx = null;
  function ensureAudio() {
    if (state.muted) return null;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  const playTone = (f, t, d, v = 0.1) => {
    const a = ensureAudio();
    if (!a) return;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = t;
    osc.frequency.setValueAtTime(f, a.currentTime);
    gain.gain.setValueAtTime(v, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + d);
    osc.connect(gain);
    gain.connect(a.destination);
    osc.start();
    osc.stop(a.currentTime + d);
  };

  const sfx = {
    flap: () => playTone(380, 'triangle', 0.15),
    point: () => playTone(880, 'sine', 0.15),
    crash: () => playTone(120, 'sawtooth', 0.4, 0.2),
    level: () => {
      playTone(523, 'sine', 0.1);
      setTimeout(() => playTone(659, 'sine', 0.1), 100);
    }
  };

  // --- Helpers ---
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function resetRun() {
    state.pipes = [];
    state.score = 0;
    state.level = 1;
    state.t = 0;
    state.spawnTimer = 0;
    state.invulnS = 1.0;
    state.bird = {
      x: CONFIG.bird.x,
      y: canvas.height * 0.5,
      w: CONFIG.bird.w,
      h: CONFIG.bird.h,
      v: 0,
      rot: 0
    };
  }

  function spawnPipe() {
    const usableH =
      canvas.height - CONFIG.gapPx - CONFIG.pipeMarginTop - CONFIG.pipeMarginBottom;
    const top = CONFIG.pipeMarginTop + Math.random() * Math.max(10, usableH);
    state.pipes.push({ x: canvas.width + 10, w: CONFIG.pipeW, top, passed: false });
  }

  function currentSpeedPxS() {
    return CONFIG.baseSpeed + (state.level - 1) * CONFIG.speedPerLevel;
  }

  function intersects(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function setOverlay(mode, opts = {}) {
    if (mode === 'hide') {
      el.overlay.classList.add('hidden');
      return;
    }
    el.overlay.classList.remove('hidden');
    el.overlayTitle.textContent = opts.title || 'CARIBBEAN SKIES';
    el.overlaySubtitle.textContent =
      opts.subtitle || 'The Ultimate Cotorra Experience 🇵🇷';
    el.overlayHint.textContent = opts.hint || 'Tap / Click / Space to flap';
    el.startBtn.textContent = opts.button || 'Start flight';
  }

  function onGameOver() {
    if (state.mode !== GAME_STATE.RUNNING) return;
    state.mode = GAME_STATE.GAMEOVER;
    sfx.crash();

    if (state.score > state.best) {
      state.best = state.score;
      saveBest(state.best);
    }

    setOverlay('show', {
      title: 'GAME OVER',
      subtitle: `Score: ${state.score}   •   Best: ${state.best}`,
      hint: 'Tap / Click / Space to retry',
      button: 'Retry'
    });
  }

  // --- Simulation ---
  function update(dt) {
    if (state.mode !== GAME_STATE.RUNNING) return;

    state.t += dt;
    state.spawnTimer += dt;

    const bird = state.bird;

    // short grace period after starting / retrying
    state.invulnS = Math.max(0, state.invulnS - dt);

    bird.v += CONFIG.gravity * dt;
    bird.y += bird.v * dt;
    bird.rot = clamp(bird.v / 1200, -Math.PI / 4, Math.PI / 4);

    if (state.spawnTimer >= CONFIG.spawnEveryS) {
      state.spawnTimer = 0;
      spawnPipe();
    }

    const speed = currentSpeedPxS();

    for (const p of state.pipes) {
      p.x -= speed * dt;

      if (!p.passed && p.x + p.w < bird.x) {
        p.passed = true;
        state.score++;
        sfx.point();
        if (state.score % CONFIG.levelEvery === 0) {
          state.level++;
          sfx.level();
        }
      }

      const topRect = { x: p.x, y: 0, w: p.w, h: p.top };
      const botRect = {
        x: p.x,
        y: p.top + CONFIG.gapPx,
        w: p.w,
        h: canvas.height - (p.top + CONFIG.gapPx)
      };

      if (state.invulnS <= 0) {
        if (intersects(bird, topRect) || intersects(bird, botRect)) {
          onGameOver();
          return;
        }
      }
    }

    state.pipes = state.pipes.filter((p) => p.x > -120);

    if (state.invulnS <= 0) {
      if (bird.y + bird.h > canvas.height || bird.y < 0) {
        onGameOver();
      }
    }
  }

  // --- Rendering ---
  function drawBird() {
    const bird = state.bird;
    ctx.save();
    ctx.translate(bird.x + bird.w / 2, bird.y + bird.h / 2);
    ctx.rotate(bird.rot);

    // Body
    const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, bird.w / 2);
    grad.addColorStop(0, COLORS.birdBelly);
    grad.addColorStop(1, COLORS.birdGold);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.ellipse(0, 0, bird.w / 2, bird.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(12, -5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(14, -5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#E67E22';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(30, 4);
    ctx.lineTo(20, 8);
    ctx.fill();

    ctx.restore();
  }

  function drawPipes() {
    for (const p of state.pipes) {
      const drawSect = (x, y, w, h) => {
        const grad = ctx.createLinearGradient(x, 0, x + w, 0);
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
      drawSect(p.x, p.top + CONFIG.gapPx, p.w, canvas.height - (p.top + CONFIG.gapPx));
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, COLORS.skyTop);
    skyGrad.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sun
    ctx.fillStyle = COLORS.sun;
    ctx.beginPath();
    ctx.arc(320, 80, 40, 0, Math.PI * 2);
    ctx.fill();

    drawPipes();
    drawBird();

    el.score.innerText = `SCORE: ${state.score}`;
    el.level.innerText = `LVL: ${state.level}`;
    el.best.innerText = `BEST: ${state.best}`;
  }

  // --- Input / Actions ---
  function flap() {
    if (state.mode !== GAME_STATE.RUNNING) return;
    state.bird.v = CONFIG.flapVelocity;
    sfx.flap();
  }

  function startOrRetry() {
    ensureAudio();
    resetRun();
    state.mode = GAME_STATE.RUNNING;

    // Give an initial lift so starting doesn't feel like an instant drop.
    state.bird.v = CONFIG.flapVelocity * 0.85;

    setOverlay('hide');
  }

  function togglePause() {
    if (state.mode === GAME_STATE.RUNNING) {
      state.mode = GAME_STATE.PAUSED;
      setOverlay('show', {
        title: 'PAUSED',
        subtitle: `Score: ${state.score}   •   Best: ${state.best}`,
        hint: 'Press P or tap PAUSE to resume',
        button: 'Resume'
      });
      el.startBtn.textContent = 'Resume';
    } else if (state.mode === GAME_STATE.PAUSED) {
      state.mode = GAME_STATE.RUNNING;
      setOverlay('hide');
    }
  }

  function handlePrimaryInput() {
    if (state.mode === GAME_STATE.MENU || state.mode === GAME_STATE.GAMEOVER) {
      startOrRetry();
      return;
    }
    if (state.mode === GAME_STATE.PAUSED) {
      togglePause();
      return;
    }
    flap();
  }

  function setMuted(next) {
    state.muted = next;
    el.muteBtn.textContent = state.muted ? 'SFX: OFF' : 'SFX: ON';
  }

  async function toggleFullscreen() {
    const container = document.getElementById('game-container');
    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (_) {
      // ignore
    }
  }

  // --- Bindings ---
  el.startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handlePrimaryInput();
  });
  el.pauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePause();
  });
  el.muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setMuted(!state.muted);
  });
  el.fsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFullscreen();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      handlePrimaryInput();
    }
    if (e.code === 'KeyP') {
      e.preventDefault();
      togglePause();
    }
    if (e.code === 'KeyM') {
      e.preventDefault();
      setMuted(!state.muted);
    }
  });

  window.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      handlePrimaryInput();
    },
    { passive: false }
  );
  // Only flap on actual canvas clicks (avoid accidental double-inputs from UI/buttons)
  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    handlePrimaryInput();
  });

  // --- Main Loop ---
  let lastTs = null;
  function loop(ts) {
    if (lastTs == null) lastTs = ts;
    const dt = Math.min(0.033, (ts - lastTs) / 1000);
    lastTs = ts;

    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  // --- Boot ---
  setOverlay('show', {
    title: 'CARIBBEAN SKIES',
    subtitle: 'The Ultimate Cotorra Experience 🇵🇷',
    hint: 'Tap / Click / Space to start',
    button: 'Start flight'
  });

  draw();
  requestAnimationFrame(loop);
})();
