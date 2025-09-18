// --------- DOM & state
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false; // turn off any blur scaling

const respawnBtn = document.getElementById('respawnBtn');
const startMenu = document.getElementById('startMenu');
const startBtn = document.getElementById('startBtn');
const gameWrap = document.getElementById('gameWrap');

let width = 0, height = 0, pixelRatio = window.devicePixelRatio || 1;

// Game state
let pollution = [], renewables = [], score = 0;
let startTime = 0, elapsed = 0;
let gameOver = false, gameRunning = false;
let keys = {};
const player = { x: 0, y: 0, size: 22, speed: 5 };

// Hide canvas & respawn initially
respawnBtn.style.display = 'none';
canvas.style.display = 'none';
startMenu.style.display = 'block';

// Audio
const menuMusic = new Audio('assets/music/menu.mp3'); menuMusic.loop = true; menuMusic.volume = 0.65;
const gameMusic = new Audio('assets/music/game.mp3'); gameMusic.loop = true; gameMusic.volume = 0.0;
const sfxCollect = new Audio('assets/sounds/collect.mp3');
const sfxHit = new Audio('assets/sounds/hit.mp3');
const sfxGameOver = new Audio('assets/sounds/gameover.mp3');

function safePlay(a){ try{ a.play(); } catch(e){} }
function fadeIn(audio, duration=800){ if(!audio) return; audio.volume=0; safePlay(audio); let step=0.05; const iv=setInterval(()=>{ audio.volume=Math.min(1,audio.volume+step); if(audio.volume>=0.99) clearInterval(iv); }, Math.max(10,duration/20)); }
function fadeOut(audio, duration=600){ if(!audio) return; let step=0.05; const iv=setInterval(()=>{ audio.volume=Math.max(0,audio.volume-step); if(audio.volume<=0.01){ try{audio.pause();audio.currentTime=0;}catch(e){} clearInterval(iv);} }, Math.max(10,duration/20)); }

// Input
window.addEventListener('resize', resizeCanvas);
document.addEventListener('keydown', e => keys[e.key] = true);
document.addEventListener('keyup', e => keys[e.key] = false);

startBtn.addEventListener('click', async () => {
  try {
    if (gameWrap.requestFullscreen) await gameWrap.requestFullscreen();
  } catch (err) {}
  resizeCanvas();
  startGame();
});

respawnBtn.addEventListener('click', () => {
  resetGame();
  gameRunning = true;
  respawnBtn.style.display = 'none';
});

function resizeCanvas(){
  const pr = window.devicePixelRatio || 1;
  pixelRatio = pr;

  if (document.fullscreenElement) {
    width = window.innerWidth;
    height = window.innerHeight;
  } else {
    width = Math.floor(Math.min(window.innerWidth * 0.95, 1100));
    height = Math.floor(Math.min(window.innerHeight * 0.72, 720));
  }

  // Set canvas size in REAL pixels for sharpness
  canvas.width = width * pr;
  canvas.height = height * pr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(pr, 0, 0, pr, 0, 0);

  player.x = Math.min(Math.max(player.x, player.size), width - player.size);
  player.y = Math.min(Math.max(player.y, player.size), height - player.size);
}

document.addEventListener('fullscreenchange', resizeCanvas);

function startGame(){
  startMenu.style.display = 'none';
  canvas.style.display = 'block';

  fadeOut(menuMusic, 600);
  fadeIn(gameMusic, 900);

  resetGame();
  gameRunning = true;
}

function spawnObjects(){
  if (!gameRunning) return;
  const difficulty = Math.min(1 + score / 100, 4);
  if (Math.random() < 0.02 * difficulty) pollution.push({ x: Math.random() * width, y: -20, size: 20, speed: 2 + Math.random() * 2 * difficulty });
  if (Math.random() < 0.015 * difficulty) renewables.push({ x: Math.random() * width, y: -20, size: 15, speed: 2 + Math.random() });
}

function resetGame(){
  pollution = []; renewables = []; score = 0; startTime = Date.now(); elapsed = 0; gameOver = false;
  player.x = width / 2; player.y = height - Math.max(80, player.size * 4);
  fadeIn(gameMusic, 600);
}

function update(){
  if (!gameRunning || gameOver) return;

  elapsed = Math.floor((Date.now() - startTime) / 1000);

  if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.x -= player.speed;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) player.x += player.speed;
  if (keys['ArrowUp'] || keys['w'] || keys['W']) player.y -= player.speed;
  if (keys['ArrowDown'] || keys['s'] || keys['S']) player.y += player.speed;

  player.x = Math.max(player.size, Math.min(width - player.size, player.x));
  player.y = Math.max(player.size, Math.min(height - player.size, player.y));

  spawnObjects();

  for (const p of pollution) p.y += p.speed;
  pollution = pollution.filter(p => p.y < height + 80);

  for (const r of renewables) r.y += r.speed;
  renewables = renewables.filter(r => r.y < height + 80);

  checkCollisions();
}

function checkCollisions(){
  for (const p of pollution) {
    const d = Math.hypot(player.x - p.x, player.y - p.y);
    if (d < player.size + p.size) {
      try { sfxHit.currentTime = 0; sfxHit.play(); } catch (e) {}
      try { sfxGameOver.play(); } catch (e) {}
      fadeOut(gameMusic, 700);
      gameOver = true;
      gameRunning = false;
      respawnBtn.style.display = 'block';
      return;
    }
  }

  for (let i = renewables.length - 1; i >= 0; i--) {
    const r = renewables[i];
    const d = Math.hypot(player.x - r.x, player.y - r.y);
    if (d < player.size + r.size) {
      try { sfxCollect.currentTime = 0; sfxCollect.play(); } catch (e) {}
      score += 10; renewables.splice(i, 1);
    }
  }
}

function draw(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#030712');
  g.addColorStop(1, '#0c0e19');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // Player (stronger glow)
  ctx.save();
  ctx.shadowBlur = 40;
  ctx.shadowColor = '#00ffe0';
  ctx.fillStyle = '#00fff0';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Pollution (more vibrant red)
  for (const p of pollution) {
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#ff2222';
    ctx.fillStyle = '#ff4a4a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Renewables (brighter green)
  for (const r of renewables) {
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#33ff88';
    ctx.fillStyle = '#66ff99';
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Crisp HUD
  ctx.fillStyle = 'white';
  ctx.font = `${Math.max(16, width / 50)}px 'Segoe UI',sans-serif`;
  ctx.fillText(`Score: ${score}`, 20, 30);
  ctx.fillText(`Time: ${elapsed}s`, 20, 60);
}

let last = performance.now();
function loop(now){
  update();
  draw();
  last = now;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

try { menuMusic.play().catch(()=>{}); } catch (e) {}
window.addEventListener('load', () => { startMenu.style.display = 'block'; resizeCanvas(); });

// --- FIX: Ensure menu music plays after first user interaction ---
document.addEventListener('click', function enableAudioOnce() {
  if (!gameRunning) { // ✅ only play if game hasn't started yet
    fadeIn(menuMusic, 1200);
  }
  document.removeEventListener('click', enableAudioOnce);
});

/* ---------- EXTRA POLISH: PARTICLES + SCREEN SHAKE + PARALLAX ---------- */

// Particle system
let particles = [];

function spawnParticles(x, y, color = "#66ff99") {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x, y,
      dx: (Math.random() - 0.5) * 4,
      dy: (Math.random() - 0.5) * 4,
      life: 1,
      color
    });
  }
}

// Override collect behavior to add particles (safe patch)
const oldCheckCollisions = checkCollisions;
checkCollisions = function () {
  const prevScore = score;
  oldCheckCollisions();
  if (score > prevScore) {
    spawnParticles(player.x, player.y, "#66ff99");
  }
};

// Screen shake variables
let shakeTime = 0;
function screenShake() {
  shakeTime = 10; // frames to shake
}
const oldDraw = draw;
draw = function () {
  if (shakeTime > 0) {
    const dx = (Math.random() - 0.5) * 10;
    const dy = (Math.random() - 0.5) * 10;
    ctx.save();
    ctx.translate(dx, dy);
    shakeTime--;
    oldDraw();
    ctx.restore();
  } else {
    oldDraw();
  }

  // Draw particles after everything else
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    p.x += p.dx;
    p.y += p.dy;
    p.life -= 0.03;
  });
  particles = particles.filter(p => p.life > 0);
  ctx.globalAlpha = 1;
};

// Hook into Game Over to trigger shake
const oldCheckCollisions2 = oldCheckCollisions;
checkCollisions = function () {
  const before = gameOver;
  oldCheckCollisions2();
  if (!before && gameOver) screenShake();
};

// Background parallax stars
let stars = Array.from({ length: 60 }, () => ({
  x: Math.random() * width,
  y: Math.random() * height,
  size: Math.random() * 2 + 1,
  speed: Math.random() * 0.3 + 0.1
}));

// Extend draw background with stars
const oldDrawBackground = oldDraw;
draw = function () {
  // Move stars
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > height) { s.y = 0; s.x = Math.random() * width; }
  });

  // Draw dark background
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "white";
  stars.forEach(s => {
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Draw rest of game
  oldDrawBackground();
};
// End of extra polish


/* ---------- PLAYER GLOW PULSE ANIMATION ---------- */
let pulseTime = 0;

const oldDrawPlayer = draw; 
draw = function () {
  pulseTime += 0.05;
  const pulse = 1 + Math.sin(pulseTime) * 0.15; // subtle breathing effect

  ctx.save();
  ctx.shadowBlur = 40 * pulse;
  ctx.shadowColor = '#00ffe0';
  ctx.fillStyle = '#00fff0';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Call original draw for the rest of the game
  oldDrawPlayer();
};


// --- MUTE / UNMUTE BUTTON HANDLER ---
const muteBtn = document.getElementById('muteBtn');
let isMuted = false;

muteBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  muteBtn.classList.toggle('muted', isMuted);
  muteBtn.textContent = isMuted ? "🔇" : "🔊";

  // Toggle all audio objects
  [menuMusic, gameMusic, sfxCollect, sfxHit, sfxGameOver].forEach(a => a.muted = isMuted);
});
// added mute unmute toggle button
/* ---------- END OF PLAYER GLOW PULSE ANIMATION ---------- */
/* ---------- SOUND MANAGEMENT (NEW FILE: sound.js) ---------- */
// Moved sound functions to sound.js for better organization
/* ---------- END OF SOUND MANAGEMENT ---------- */
// Note: Remember to include sound.js in your HTML file after game.js
/* ---------- END OF EXTRA POLISH ---------- */

/* ---------- END OF GAME CODE ---------- */

