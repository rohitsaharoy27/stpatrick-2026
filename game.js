const INVITE_TEXT = "518 W 27TH ST · MUSIC FOR A WHILE";
const WIN_MESSAGE = "get ready to party w rohit soon at music for a while : ) ";

const OBSTACLE_WIDTH = 72;
const BASE_GAP_HEIGHT = 188;
const MIN_GAP_HEIGHT = 142;
const BASE_SPEED = 132;
const MAX_SPEED = 208;
const GRAVITY = 980;
const FLAP_VELOCITY = -350;
const DECOR_MAX = 26;

const DECOR_EMOJIS = ["🍀", "✨", "🌈", "🎶", "🎉", "💚", "🪙", "🥳"];
const CELEBRATION_EMOJIS = ["🍀", "✨", "🌈", "🎉", "🎶", "🪩", "💚"];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const passedLabel = document.getElementById("passedCount");
const remainingLabel = document.getElementById("remainingCount");
const bestLabel = document.getElementById("bestCount");
const addressMasked = document.getElementById("addressMasked");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const restartButton = document.getElementById("restartButton");
const winArt = document.getElementById("winArt");
const tequilaRain = document.getElementById("tequilaRain");

const backdropOrbs = Array.from({ length: 9 }, (_, index) => ({
  x: 36 + Math.random() * (canvas.width - 72),
  y: 26 + Math.random() * (canvas.height - 200),
  r: 22 + Math.random() * 72,
  drift: 0.22 + Math.random() * 0.45,
  phase: index * 0.7 + Math.random(),
}));

const REVEALABLE_TOTAL = [...INVITE_TEXT].reduce(
  (count, char) => (/[A-Z0-9]/i.test(char) ? count + 1 : count),
  0,
);

const state = {
  clover: { x: 98, y: canvas.height * 0.45, r: 22, vy: 0 },
  obstacles: [],
  decorDrops: [],
  running: true,
  started: false,
  spawnTimer: 0,
  decorTimer: 0,
  revealedCount: 0,
  passedCount: 0,
  bestCount: 0,
  frameMs: 0,
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function isRevealable(char) {
  return /[A-Z0-9]/i.test(char);
}

function getMaskedInvite() {
  let revealBudget = state.revealedCount;
  return [...INVITE_TEXT]
    .map((char) => {
      if (!isRevealable(char)) return char;
      if (revealBudget > 0) {
        revealBudget -= 1;
        return char;
      }
      return "•";
    })
    .join("");
}

function updateHud() {
  passedLabel.textContent = String(state.passedCount);
  remainingLabel.textContent = String(Math.max(REVEALABLE_TOTAL - state.revealedCount, 0));
  bestLabel.textContent = String(state.bestCount);
  addressMasked.textContent = getMaskedInvite();
}

function createDecorDrop(forcedY = null) {
  const typeRoll = Math.random();
  let token;

  if (typeRoll < 0.38) {
    token = DECOR_EMOJIS[Math.floor(Math.random() * DECOR_EMOJIS.length)];
  } else if (typeRoll < 0.66) {
    token = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  } else {
    token = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
  }

  state.decorDrops.push({
    x: randomBetween(12, canvas.width - 12),
    y: forcedY ?? randomBetween(-canvas.height, canvas.height),
    token,
    size: randomBetween(15, 23),
    speed: randomBetween(22, 46),
    alpha: randomBetween(0.18, 0.48),
    drift: randomBetween(0.4, 1.2),
    spin: randomBetween(-0.8, 0.8),
    rotation: randomBetween(-Math.PI, Math.PI),
  });
}

function resetGame() {
  state.clover.x = 98;
  state.clover.y = canvas.height * 0.45;
  state.clover.vy = 0;
  state.obstacles = [];
  state.decorDrops = [];
  state.running = true;
  state.started = false;
  state.spawnTimer = 0;
  state.decorTimer = 0;
  state.revealedCount = 0;
  state.passedCount = 0;
  state.frameMs = performance.now();

  for (let i = 0; i < DECOR_MAX; i += 1) {
    createDecorDrop(randomBetween(-canvas.height, canvas.height));
  }

  overlay.classList.add("hidden");
  tequilaRain.innerHTML = "";
  winArt.classList.add("hidden");
  restartButton.textContent = "Fly Again";
  updateHud();
}

function spawnObstacle() {
  const gapHeight = Math.max(MIN_GAP_HEIGHT, BASE_GAP_HEIGHT - state.passedCount * 1.25);
  const margin = 72;
  const gapTop = randomBetween(margin, canvas.height - gapHeight - margin);
  const hue = 94 + Math.random() * 58;

  state.obstacles.push({
    x: canvas.width + OBSTACLE_WIDTH,
    gapTop,
    gapHeight,
    hue,
    passed: false,
  });
}

function revealNextCharacter() {
  if (state.revealedCount < REVEALABLE_TOTAL) {
    state.revealedCount += 1;
  }
  if (state.revealedCount >= REVEALABLE_TOTAL) {
    finishGame(true);
  }
}

function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
  if (rh <= 0 || rw <= 0) return false;
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= radius * radius;
}

function createTequilaRain() {
  tequilaRain.innerHTML = "";
  for (let i = 0; i < 18; i += 1) {
    const shot = document.createElement("span");
    shot.className = "shot";
    shot.textContent = CELEBRATION_EMOJIS[Math.floor(Math.random() * CELEBRATION_EMOJIS.length)];
    shot.style.left = `${Math.random() * 100}%`;
    shot.style.animationDelay = `${Math.random() * 2.2}s`;
    shot.style.animationDuration = `${1.8 + Math.random() * 1.7}s`;
    tequilaRain.appendChild(shot);
  }
}

function finishGame(won) {
  if (!state.running) return;
  state.running = false;
  state.started = false;
  state.bestCount = Math.max(state.bestCount, state.passedCount);
  updateHud();
  overlay.classList.remove("hidden");

  if (won) {
    overlayTitle.textContent = "Congrats, Clover Pilot!";
    overlayText.textContent = WIN_MESSAGE;
    winArt.textContent = "🍀😊🌈";
    winArt.classList.remove("hidden");
    restartButton.textContent = "Play Again";
    createTequilaRain();
  } else {
    overlayTitle.textContent = "Clover Bonked a Gate";
    overlayText.textContent = "Tap Play Again, then keep your rhythm through the gap.";
    winArt.classList.add("hidden");
    tequilaRain.innerHTML = "";
    restartButton.textContent = "Try Again";
  }
}

function flap() {
  if (!state.running) return;
  if (!state.started) state.started = true;
  state.clover.vy = FLAP_VELOCITY;
}

function updateDecorDrops(dt) {
  state.decorTimer += dt;
  if (state.decorDrops.length < DECOR_MAX && state.decorTimer > 0.14) {
    createDecorDrop(-18);
    state.decorTimer = 0;
  }

  for (const drop of state.decorDrops) {
    drop.y += drop.speed * dt;
    drop.x += Math.sin((state.frameMs * drop.drift) / 760) * 0.35;
    drop.rotation += drop.spin * dt;

    if (drop.y - drop.size > canvas.height) {
      drop.y = -drop.size - Math.random() * 80;
      drop.x = randomBetween(12, canvas.width - 12);
    }
  }
}

function update(dt) {
  state.frameMs += dt * 1000;
  updateDecorDrops(dt);

  if (!state.running) return;

  if (!state.started) {
    state.clover.y = canvas.height * 0.45 + Math.sin(state.frameMs / 260) * 4;
    state.clover.vy = 0;
    updateHud();
    return;
  }

  const speed = Math.min(MAX_SPEED, BASE_SPEED + state.passedCount * 2.1);

  state.spawnTimer += dt;
  const spawnEvery = Math.max(1.13, 1.68 - state.passedCount * 0.018);
  while (state.spawnTimer >= spawnEvery) {
    spawnObstacle();
    state.spawnTimer -= spawnEvery;
  }

  state.clover.vy += GRAVITY * dt;
  state.clover.y += state.clover.vy * dt;

  const hitRadius = state.clover.r * 0.78;
  if (state.clover.y - hitRadius <= 0 || state.clover.y + hitRadius >= canvas.height) {
    finishGame(false);
    return;
  }

  for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = state.obstacles[i];
    obstacle.x -= speed * dt;

    const topCollision = circleRectCollision(
      state.clover.x,
      state.clover.y,
      hitRadius,
      obstacle.x,
      0,
      OBSTACLE_WIDTH,
      obstacle.gapTop,
    );

    const bottomY = obstacle.gapTop + obstacle.gapHeight;
    const bottomCollision = circleRectCollision(
      state.clover.x,
      state.clover.y,
      hitRadius,
      obstacle.x,
      bottomY,
      OBSTACLE_WIDTH,
      canvas.height - bottomY,
    );

    if (topCollision || bottomCollision) {
      finishGame(false);
      return;
    }

    if (!obstacle.passed && obstacle.x + OBSTACLE_WIDTH < state.clover.x - hitRadius) {
      obstacle.passed = true;
      state.passedCount += 1;
      state.bestCount = Math.max(state.bestCount, state.passedCount);
      revealNextCharacter();
      if (!state.running) return;
    }

    if (obstacle.x + OBSTACLE_WIDTH < -12) {
      state.obstacles.splice(i, 1);
    }
  }

  updateHud();
}

function drawBackground(nowMs) {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#0a4f55");
  sky.addColorStop(0.52, "#156f6b");
  sky.addColorStop(1, "#0a2f3f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const orb of backdropOrbs) {
    const driftX = Math.sin(nowMs * 0.00035 * orb.drift + orb.phase) * 12;
    const driftY = Math.cos(nowMs * 0.00025 * orb.drift + orb.phase) * 8;
    const orbGradient = ctx.createRadialGradient(
      orb.x + driftX,
      orb.y + driftY,
      4,
      orb.x + driftX,
      orb.y + driftY,
      orb.r,
    );
    orbGradient.addColorStop(0, "rgba(255, 255, 255, 0.15)");
    orbGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = orbGradient;
    ctx.fillRect(orb.x - orb.r + driftX, orb.y - orb.r + driftY, orb.r * 2, orb.r * 2);
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  for (let y = 46; y < canvas.height; y += 66) {
    const wobble = Math.sin(nowMs * 0.0015 + y * 0.02) * 4;
    ctx.fillRect(0, y + wobble, canvas.width, 1.4);
  }
}

function drawDecorDrops() {
  for (const drop of state.decorDrops) {
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.rotate(drop.rotation);
    ctx.globalAlpha = drop.alpha;
    ctx.fillStyle = "rgba(247, 255, 244, 0.95)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${drop.size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Courier New", monospace`;
    ctx.fillText(drop.token, 0, 0);
    ctx.restore();
  }
}

function drawGateBlock(x, y, width, height, hue) {
  if (height <= 0) return;

  const bodyGradient = ctx.createLinearGradient(x, y, x + width, y);
  bodyGradient.addColorStop(0, `hsl(${hue}, 88%, 48%)`);
  bodyGradient.addColorStop(0.5, `hsl(${Math.max(hue - 16, 0)}, 94%, 63%)`);
  bodyGradient.addColorStop(1, `hsl(${Math.max(hue - 38, 0)}, 85%, 36%)`);

  ctx.fillStyle = bodyGradient;
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.fillRect(x + 7, y + 6, width - 14, Math.max(4, Math.min(8, height - 10)));

  ctx.strokeStyle = "rgba(8, 30, 30, 0.52)";
  ctx.lineWidth = 2.8;
  ctx.strokeRect(x + 1.5, y + 1.5, width - 3, height - 3);
}

function drawObstacle(obstacle) {
  const topHeight = obstacle.gapTop;
  const bottomY = obstacle.gapTop + obstacle.gapHeight;
  const bottomHeight = canvas.height - bottomY;

  drawGateBlock(obstacle.x, 0, OBSTACLE_WIDTH, topHeight, obstacle.hue);
  drawGateBlock(obstacle.x, bottomY, OBSTACLE_WIDTH, bottomHeight, obstacle.hue);

  ctx.fillStyle = "rgba(255, 247, 199, 0.8)";
  ctx.fillRect(obstacle.x - 5, Math.max(0, topHeight - 12), OBSTACLE_WIDTH + 10, 12);
  ctx.fillRect(obstacle.x - 5, bottomY, OBSTACLE_WIDTH + 10, 12);
}

function drawClover(nowMs) {
  const clover = state.clover;
  const hover = !state.started ? Math.sin(nowMs / 170) * 1.2 : 0;
  const angle = Math.max(-0.42, Math.min(0.52, clover.vy / 420));

  ctx.save();
  ctx.translate(clover.x, clover.y + hover);
  ctx.rotate(angle);

  ctx.strokeStyle = "#2b8a3e";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, clover.r * 0.45);
  ctx.quadraticCurveTo(6, clover.r + 10, -2, clover.r + 17);
  ctx.stroke();

  const leafRadius = clover.r * 0.58;
  const spread = clover.r * 0.55;
  const leaves = [
    [-spread, 0],
    [spread, 0],
    [0, -spread],
    [0, spread],
  ];

  for (const [leafX, leafY] of leaves) {
    const leafGradient = ctx.createRadialGradient(leafX - 2, leafY - 4, 3, leafX, leafY, leafRadius);
    leafGradient.addColorStop(0, "#7ff7a3");
    leafGradient.addColorStop(1, "#26a152");
    ctx.fillStyle = leafGradient;
    ctx.beginPath();
    ctx.arc(leafX, leafY, leafRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#2d7f3f";
  ctx.beginPath();
  ctx.arc(0, 0, clover.r * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#173f24";
  ctx.beginPath();
  ctx.arc(-5, -3, 2.4, 0, Math.PI * 2);
  ctx.arc(5, -3, 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#173f24";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 1.5, 7, 0.18, Math.PI - 0.18);
  ctx.stroke();

  ctx.restore();
}

function drawStartPrompt() {
  if (!state.running || state.started) return;
  ctx.fillStyle = "rgba(10, 24, 26, 0.36)";
  ctx.fillRect(34, canvas.height * 0.36, canvas.width - 68, 88);
  ctx.strokeStyle = "rgba(250, 255, 235, 0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(34, canvas.height * 0.36, canvas.width - 68, 88);

  ctx.fillStyle = "#effff0";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = 'bold 22px "Avenir Next", "Trebuchet MS", sans-serif';
  ctx.fillText("Tap To Start", canvas.width / 2, canvas.height * 0.41);
  ctx.font = '14px "Avenir Next", "Trebuchet MS", sans-serif';
  ctx.fillText("Flap through each gate to unlock the invite", canvas.width / 2, canvas.height * 0.455);
}

function draw(nowMs) {
  drawBackground(nowMs);
  drawDecorDrops();

  for (const obstacle of state.obstacles) {
    drawObstacle(obstacle);
  }

  drawClover(nowMs);
  drawStartPrompt();

  if (!state.running) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

let lastFrame = performance.now();
function loop(nowMs) {
  const dt = Math.min((nowMs - lastFrame) / 1000, 0.034);
  lastFrame = nowMs;
  update(dt);
  draw(nowMs);
  requestAnimationFrame(loop);
}

function handlePrimaryInput(event) {
  event.preventDefault();
  flap();
}

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.code === "Space" || event.key === "ArrowUp") {
    event.preventDefault();
    flap();
  }
});

if (window.PointerEvent) {
  canvas.addEventListener("pointerdown", handlePrimaryInput);
} else {
  canvas.addEventListener("mousedown", handlePrimaryInput);
  canvas.addEventListener("touchstart", handlePrimaryInput, { passive: false });
}

restartButton.addEventListener("click", resetGame);

resetGame();
requestAnimationFrame(loop);
