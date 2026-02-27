const INVITE_TEXT = "518 W 27TH ST · MUSIC FOR A WHILE";
const WIN_MESSAGE = "get ready to party w rohit soon at music for a while : ) ";

const OBSTACLE_WIDTH = 72;
const OBSTACLE_HITBOX_WIDTH = 46;
const POT_RADIUS = 19;
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
const MUSIC_STEP_SECONDS = 0.24;
const FESTIVE_PATTERN = [
  { lead: 76, bass: 52 },
  { lead: 79, bass: 52 },
  { lead: 81, bass: 55 },
  { lead: 79, bass: 55 },
  { lead: 76, bass: 57 },
  { lead: 79, bass: 57 },
  { lead: 83, bass: 59 },
  { lead: 81, bass: 59 },
  { lead: 79, bass: 52 },
  { lead: 81, bass: 52 },
  { lead: 83, bass: 55 },
  { lead: 84, bass: 55 },
  { lead: 83, bass: 57 },
  { lead: 81, bass: 57 },
  { lead: 79, bass: 55 },
  { lead: 76, bass: 52 },
];

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

const musicState = {
  context: null,
  masterGain: null,
  started: false,
  step: 0,
  nextTime: 0,
  timerId: null,
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function ensureMusicGraph() {
  if (musicState.context) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  musicState.context = new AudioContextClass();
  musicState.masterGain = musicState.context.createGain();
  musicState.masterGain.gain.value = 0.075;
  musicState.masterGain.connect(musicState.context.destination);
}

function scheduleTone(midi, startAt, duration, type, volume) {
  if (!musicState.context || !musicState.masterGain) return;

  const osc = musicState.context.createOscillator();
  const gain = musicState.context.createGain();
  const filter = musicState.context.createBiquadFilter();

  osc.type = type;
  osc.frequency.setValueAtTime(midiToFrequency(midi), startAt);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(type === "sine" ? 760 : 1950, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(musicState.masterGain);

  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

function scheduleFestiveLoop() {
  if (!musicState.context || !musicState.started) return;

  const lookAheadSeconds = 0.7;
  while (musicState.nextTime < musicState.context.currentTime + lookAheadSeconds) {
    const stepPattern = FESTIVE_PATTERN[musicState.step % FESTIVE_PATTERN.length];
    scheduleTone(stepPattern.bass, musicState.nextTime, MUSIC_STEP_SECONDS * 0.92, "sine", 0.045);
    scheduleTone(stepPattern.lead, musicState.nextTime, MUSIC_STEP_SECONDS * 0.86, "triangle", 0.055);

    if (musicState.step % 2 === 0) {
      scheduleTone(stepPattern.lead + 12, musicState.nextTime, MUSIC_STEP_SECONDS * 0.5, "square", 0.018);
    }

    musicState.step += 1;
    musicState.nextTime += MUSIC_STEP_SECONDS;
  }

  musicState.timerId = window.setTimeout(scheduleFestiveLoop, 120);
}

function startFestiveMusic() {
  ensureMusicGraph();
  if (!musicState.context || !musicState.masterGain) return;

  if (musicState.context.state === "suspended") {
    musicState.context.resume();
  }

  if (musicState.started) return;

  musicState.started = true;
  musicState.step = 0;
  musicState.nextTime = musicState.context.currentTime + 0.05;
  scheduleFestiveLoop();
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

function circleCircleCollision(x1, y1, r1, x2, y2, r2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const maxDistance = r1 + r2;
  return dx * dx + dy * dy <= maxDistance * maxDistance;
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
    const hitboxX = obstacle.x + (OBSTACLE_WIDTH - OBSTACLE_HITBOX_WIDTH) / 2;
    const bottomY = obstacle.gapTop + obstacle.gapHeight;

    const topCollision = circleRectCollision(
      state.clover.x,
      state.clover.y,
      hitRadius,
      hitboxX,
      0,
      OBSTACLE_HITBOX_WIDTH,
      obstacle.gapTop,
    );

    const bottomCollision = circleRectCollision(
      state.clover.x,
      state.clover.y,
      hitRadius,
      hitboxX,
      bottomY,
      OBSTACLE_HITBOX_WIDTH,
      canvas.height - bottomY,
    );

    const topPotCollision = circleCircleCollision(
      state.clover.x,
      state.clover.y,
      hitRadius,
      obstacle.x + OBSTACLE_WIDTH / 2,
      obstacle.gapTop - 9,
      POT_RADIUS,
    );

    const bottomPotCollision = circleCircleCollision(
      state.clover.x,
      state.clover.y,
      hitRadius,
      obstacle.x + OBSTACLE_WIDTH / 2,
      bottomY + 9,
      POT_RADIUS,
    );

    if (topCollision || bottomCollision || topPotCollision || bottomPotCollision) {
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
  sky.addColorStop(0, "#062c15");
  sky.addColorStop(0.46, "#0f5a2c");
  sky.addColorStop(1, "#08361e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glow = ctx.createRadialGradient(canvas.width * 0.78, 72, 12, canvas.width * 0.78, 72, 190);
  glow.addColorStop(0, "rgba(255, 224, 128, 0.32)");
  glow.addColorStop(1, "rgba(255, 224, 128, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.45);

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
    orbGradient.addColorStop(0, "rgba(255, 239, 171, 0.16)");
    orbGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = orbGradient;
    ctx.fillRect(orb.x - orb.r + driftX, orb.y - orb.r + driftY, orb.r * 2, orb.r * 2);
  }

  ctx.fillStyle = "rgba(9, 61, 30, 0.72)";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(0, canvas.height * 0.78);
  ctx.bezierCurveTo(
    canvas.width * 0.22,
    canvas.height * 0.71,
    canvas.width * 0.45,
    canvas.height * 0.86,
    canvas.width * 0.66,
    canvas.height * 0.76,
  );
  ctx.bezierCurveTo(canvas.width * 0.82, canvas.height * 0.7, canvas.width * 0.93, canvas.height * 0.75, canvas.width, canvas.height * 0.72);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(17, 84, 42, 0.85)";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(0, canvas.height * 0.86);
  ctx.bezierCurveTo(
    canvas.width * 0.2,
    canvas.height * 0.8,
    canvas.width * 0.52,
    canvas.height * 0.92,
    canvas.width * 0.72,
    canvas.height * 0.83,
  );
  ctx.bezierCurveTo(canvas.width * 0.88, canvas.height * 0.77, canvas.width * 0.94, canvas.height * 0.84, canvas.width, canvas.height * 0.81);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 243, 196, 0.08)";
  for (let y = 54; y < canvas.height * 0.72; y += 66) {
    const wobble = Math.sin(nowMs * 0.00135 + y * 0.018) * 4;
    ctx.fillRect(0, y + wobble, canvas.width, 1.2);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '16px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  for (let i = 0; i < 8; i += 1) {
    const x = 32 + i * 44 + Math.sin(nowMs * 0.0008 + i) * 7;
    const y = 84 + (i % 3) * 66 + Math.cos(nowMs * 0.0011 + i * 0.5) * 10;
    ctx.globalAlpha = 0.11;
    ctx.fillText("☘", x, y);
  }
  ctx.globalAlpha = 1;
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

function drawRainbowStream(centerX, startY, endY, hueShift) {
  if (endY <= startY) return;

  const rainbowOffsets = [0, 22, 46, 96, 140, 186];
  const baseWidth = OBSTACLE_HITBOX_WIDTH + 12;
  const streamHeight = endY - startY;

  ctx.save();
  ctx.lineCap = "round";

  for (let i = 0; i < rainbowOffsets.length; i += 1) {
    const wobble = Math.sin(state.frameMs * 0.0018 + i * 0.72 + centerX * 0.04) * 4.4;
    ctx.strokeStyle = `hsla(${(hueShift + rainbowOffsets[i]) % 360}, 92%, 58%, 0.9)`;
    ctx.lineWidth = Math.max(baseWidth - i * 4.2, 4);
    ctx.beginPath();
    ctx.moveTo(centerX, startY);
    ctx.bezierCurveTo(
      centerX + wobble,
      startY + streamHeight * 0.34,
      centerX - wobble,
      endY - streamHeight * 0.34,
      centerX,
      endY,
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawPotOfGold(centerX, centerY) {
  const potWidth = 44;
  const potHeight = 24;
  const left = centerX - potWidth / 2;
  const top = centerY - potHeight / 2;

  ctx.fillStyle = "#f7b500";
  for (let i = 0; i < 7; i += 1) {
    const coinX = left + 7 + i * 5.2;
    const coinY = top + (i % 2 === 0 ? -4 : -2);
    ctx.beginPath();
    ctx.arc(coinX, coinY, 4.1, 0, Math.PI * 2);
    ctx.fill();
  }

  const potGradient = ctx.createLinearGradient(left, top + 4, left + potWidth, top + potHeight);
  potGradient.addColorStop(0, "#343a40");
  potGradient.addColorStop(1, "#111318");
  ctx.fillStyle = potGradient;
  ctx.fillRect(left + 2, top + 4, potWidth - 4, potHeight - 6);

  ctx.fillStyle = "#4a5058";
  ctx.fillRect(left + 6, top + 10, potWidth - 12, potHeight - 12);

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.fillRect(left + 5, top + 6, potWidth - 10, 2.5);

  ctx.strokeStyle = "rgba(8, 14, 18, 0.64)";
  ctx.lineWidth = 2;
  ctx.strokeRect(left + 1.5, top + 3, potWidth - 3, potHeight - 5);
}

function drawObstacle(obstacle) {
  const centerX = obstacle.x + OBSTACLE_WIDTH / 2;
  const topPotY = obstacle.gapTop - 9;
  const bottomPotY = obstacle.gapTop + obstacle.gapHeight + 9;

  drawRainbowStream(centerX, 0, topPotY - POT_RADIUS * 0.45, obstacle.hue);
  drawRainbowStream(centerX, bottomPotY + POT_RADIUS * 0.45, canvas.height, obstacle.hue + 40);
  drawPotOfGold(centerX, topPotY);
  drawPotOfGold(centerX, bottomPotY);
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
  startFestiveMusic();
  flap();
}

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.code === "Space" || event.key === "ArrowUp") {
    event.preventDefault();
    startFestiveMusic();
    flap();
  }
});

if (window.PointerEvent) {
  canvas.addEventListener("pointerdown", handlePrimaryInput);
} else {
  canvas.addEventListener("mousedown", handlePrimaryInput);
  canvas.addEventListener("touchstart", handlePrimaryInput, { passive: false });
}

restartButton.addEventListener("click", () => {
  startFestiveMusic();
  resetGame();
});

resetGame();
requestAnimationFrame(loop);
