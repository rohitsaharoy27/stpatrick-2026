const INVITE_TEXT = "518 W 27TH ST · MUSIC FOR A WHILE";
const WIN_MESSAGE = "get ready to party w rohit soon at music for a while : ) ";

const BASE_SPEED = 220;
const MAX_SPEED = 470;
const GRAVITY = 1900;
const JUMP_VELOCITY = -640;

const DECOR_MAX = 26;
const GROUND_TOP = 542;
const GROUND_HEIGHT = 98;
const CLOVER_RADIUS = 24;
const POT_RADIUS_MIN = 20;
const POT_RADIUS_MAX = 28;

const BOX_SIZE = 30;
const BOX_INTERVAL_MIN = 2.1;
const BOX_INTERVAL_MAX = 3.8;
const STAR_DURATION = 4.8;

const DECOR_EMOJIS = ["🍀", "✨", "🌈", "🎶", "🎉", "💚", "🪙", "🥳"];
const CELEBRATION_EMOJIS = ["🍀", "✨", "🌈", "🎉", "🎶", "🪩", "💚"];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const MUSIC_STEP_SECONDS = 0.24;
const FESTIVE_PATTERN = [
  { lead: 79, bass: 52 },
  { lead: 81, bass: 52 },
  { lead: 83, bass: 55 },
  { lead: 81, bass: 55 },
  { lead: 79, bass: 57 },
  { lead: 81, bass: 57 },
  { lead: 84, bass: 59 },
  { lead: 83, bass: 59 },
  { lead: 81, bass: 52 },
  { lead: 83, bass: 52 },
  { lead: 84, bass: 55 },
  { lead: 86, bass: 55 },
  { lead: 84, bass: 57 },
  { lead: 83, bass: 57 },
  { lead: 81, bass: 55 },
  { lead: 79, bass: 52 },
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

const backdropOrbs = Array.from({ length: 10 }, (_, index) => ({
  x: 34 + Math.random() * (canvas.width - 68),
  y: 26 + Math.random() * (canvas.height - 240),
  r: 26 + Math.random() * 82,
  drift: 0.25 + Math.random() * 0.45,
  phase: index * 0.61 + Math.random(),
}));

const REVEALABLE_TOTAL = [...INVITE_TEXT].reduce(
  (count, char) => (/[A-Z0-9]/i.test(char) ? count + 1 : count),
  0,
);

const state = {
  clover: {
    x: 94,
    y: GROUND_TOP - CLOVER_RADIUS,
    r: CLOVER_RADIUS,
    vy: 0,
    onGround: true,
  },
  pots: [],
  boxes: [],
  decorDrops: [],
  running: true,
  started: false,
  spawnTimer: 0,
  boxSpawnTimer: 0,
  nextBoxDelay: BOX_INTERVAL_MAX,
  decorTimer: 0,
  revealedCount: 0,
  passedCount: 0,
  bestCount: 0,
  frameMs: 0,
  starTimer: 0,
};

const musicState = {
  context: null,
  masterGain: null,
  started: false,
  step: 0,
  nextTime: 0,
  timerId: null,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

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
  musicState.masterGain.gain.value = 0.2;
  musicState.masterGain.connect(musicState.context.destination);
}

function scheduleTone(midi, startAt, duration, type, volume, lowpass = 2000) {
  if (!musicState.context || !musicState.masterGain) return;

  const osc = musicState.context.createOscillator();
  const gain = musicState.context.createGain();
  const filter = musicState.context.createBiquadFilter();

  osc.type = type;
  osc.frequency.setValueAtTime(midiToFrequency(midi), startAt);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(lowpass, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.016);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(musicState.masterGain);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.04);
}

function playSfxJump() {
  if (!musicState.context) return;
  const now = musicState.context.currentTime;
  scheduleTone(88, now, 0.12, "square", 0.13, 2800);
  scheduleTone(93, now + 0.08, 0.12, "triangle", 0.08, 2400);
}

function playSfxPass() {
  if (!musicState.context) return;
  const now = musicState.context.currentTime;
  scheduleTone(91, now, 0.1, "triangle", 0.11, 2600);
}

function playSfxCrash() {
  if (!musicState.context) return;
  const now = musicState.context.currentTime;
  scheduleTone(46, now, 0.2, "sawtooth", 0.14, 900);
}

function playSfxWin() {
  if (!musicState.context) return;
  const now = musicState.context.currentTime;
  [84, 88, 91, 96].forEach((midi, index) => {
    scheduleTone(midi, now + index * 0.08, 0.22, "triangle", 0.1, 2600);
  });
}

function playSfxStar() {
  if (!musicState.context) return;
  const now = musicState.context.currentTime;
  scheduleTone(96, now, 0.12, "triangle", 0.12, 3000);
  scheduleTone(100, now + 0.07, 0.16, "square", 0.08, 3200);
  scheduleTone(103, now + 0.13, 0.2, "triangle", 0.07, 3400);
}

function scheduleFestiveLoop() {
  if (!musicState.context || !musicState.started) return;

  const lookAheadSeconds = 0.9;
  while (musicState.nextTime < musicState.context.currentTime + lookAheadSeconds) {
    const stepPattern = FESTIVE_PATTERN[musicState.step % FESTIVE_PATTERN.length];
    scheduleTone(stepPattern.bass, musicState.nextTime, MUSIC_STEP_SECONDS * 0.88, "sine", 0.065, 950);
    scheduleTone(stepPattern.lead, musicState.nextTime, MUSIC_STEP_SECONDS * 0.82, "triangle", 0.085, 1900);

    if (musicState.step % 2 === 0) {
      scheduleTone(stepPattern.lead + 12, musicState.nextTime, MUSIC_STEP_SECONDS * 0.45, "square", 0.03, 3200);
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
    musicState.context.resume().catch(() => {});
  }

  if (musicState.started) return;

  musicState.started = true;
  musicState.step = 0;
  musicState.nextTime = musicState.context.currentTime + 0.04;
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
    x: randomBetween(10, canvas.width - 10),
    y: forcedY ?? randomBetween(-canvas.height, canvas.height),
    token,
    size: randomBetween(14, 22),
    speed: randomBetween(18, 40),
    alpha: randomBetween(0.2, 0.46),
    drift: randomBetween(0.35, 1.2),
    spin: randomBetween(-0.8, 0.8),
    rotation: randomBetween(-Math.PI, Math.PI),
  });
}

function spawnPot() {
  const radius = randomBetween(POT_RADIUS_MIN, POT_RADIUS_MAX);
  const y = GROUND_TOP - radius * 0.72;
  state.pots.push({
    x: canvas.width + radius + 18,
    y,
    r: radius,
    passed: false,
  });
}

function spawnMysteryBox() {
  state.boxes.push({
    x: canvas.width + BOX_SIZE + 24,
    y: GROUND_TOP - 112 + randomBetween(-10, 12),
    size: BOX_SIZE,
    hit: false,
    bump: 0,
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
    shot.style.animationDelay = `${Math.random() * 2.3}s`;
    shot.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
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
    overlayTitle.textContent = "Congrats, Clover Runner!";
    overlayText.innerHTML = `${WIN_MESSAGE}<br><strong>Address:</strong> ${INVITE_TEXT}`;
    winArt.textContent = "🍀😊🏃";
    winArt.classList.remove("hidden");
    restartButton.textContent = "Run Again";
    createTequilaRain();
    playSfxWin();
  } else {
    overlayTitle.textContent = "You Hit a Pot of Gold";
    overlayText.textContent = "Jump the pots and hit mystery boxes to get star mode.";
    winArt.classList.add("hidden");
    tequilaRain.innerHTML = "";
    restartButton.textContent = "Try Again";
    playSfxCrash();
  }
}

function jump() {
  if (!state.running) return;
  if (!state.started) state.started = true;
  if (!state.clover.onGround) return;

  state.clover.vy = JUMP_VELOCITY;
  state.clover.onGround = false;
  playSfxJump();
}

function resetGame() {
  state.clover.x = 94;
  state.clover.y = GROUND_TOP - state.clover.r;
  state.clover.vy = 0;
  state.clover.onGround = true;
  state.pots = [];
  state.boxes = [];
  state.decorDrops = [];
  state.running = true;
  state.started = false;
  state.spawnTimer = 0;
  state.boxSpawnTimer = 0;
  state.nextBoxDelay = randomBetween(BOX_INTERVAL_MIN, BOX_INTERVAL_MAX);
  state.decorTimer = 0;
  state.revealedCount = 0;
  state.passedCount = 0;
  state.frameMs = performance.now();
  state.starTimer = 0;

  for (let i = 0; i < DECOR_MAX; i += 1) {
    createDecorDrop(randomBetween(-canvas.height, canvas.height));
  }

  overlay.classList.add("hidden");
  tequilaRain.innerHTML = "";
  winArt.classList.add("hidden");
  restartButton.textContent = "Run Again";
  updateHud();
}

function updateDecorDrops(dt) {
  state.decorTimer += dt;
  if (state.decorDrops.length < DECOR_MAX && state.decorTimer > 0.14) {
    createDecorDrop(-16);
    state.decorTimer = 0;
  }

  for (const drop of state.decorDrops) {
    drop.y += drop.speed * dt;
    drop.x += Math.sin((state.frameMs * drop.drift) / 760) * 0.32;
    drop.rotation += drop.spin * dt;

    if (drop.y - drop.size > canvas.height) {
      drop.y = -drop.size - Math.random() * 90;
      drop.x = randomBetween(10, canvas.width - 10);
    }
  }
}

function update(dt) {
  state.frameMs += dt * 1000;
  updateDecorDrops(dt);

  if (!state.running) return;

  if (!state.started) {
    state.clover.y = GROUND_TOP - state.clover.r + Math.sin(state.frameMs / 280) * 2.3;
    state.clover.vy = 0;
    state.clover.onGround = true;
    updateHud();
    return;
  }

  const speed = Math.min(MAX_SPEED, BASE_SPEED + state.passedCount * 5.2);

  state.spawnTimer += dt;
  const spawnEvery = Math.max(0.52, 1.08 - state.passedCount * 0.02);
  while (state.spawnTimer >= spawnEvery) {
    spawnPot();
    state.spawnTimer -= spawnEvery;
  }

  state.boxSpawnTimer += dt;
  while (state.boxSpawnTimer >= state.nextBoxDelay) {
    spawnMysteryBox();
    state.boxSpawnTimer -= state.nextBoxDelay;
    state.nextBoxDelay = clamp(
      randomBetween(BOX_INTERVAL_MIN, BOX_INTERVAL_MAX) - state.passedCount * 0.02,
      1.35,
      BOX_INTERVAL_MAX,
    );
  }

  const previousTop = state.clover.y - state.clover.r;
  state.clover.vy += GRAVITY * dt;
  state.clover.y += state.clover.vy * dt;

  const floorY = GROUND_TOP - state.clover.r;
  if (state.clover.y >= floorY) {
    state.clover.y = floorY;
    state.clover.vy = 0;
    state.clover.onGround = true;
  } else {
    state.clover.onGround = false;
  }

  if (state.starTimer > 0) {
    state.starTimer = Math.max(0, state.starTimer - dt);
  }

  const currentTop = state.clover.y - state.clover.r;
  for (let i = state.boxes.length - 1; i >= 0; i -= 1) {
    const box = state.boxes[i];
    box.x -= speed * dt;

    if (box.bump > 0) {
      box.bump = Math.max(0, box.bump - dt * 4);
    }

    if (!box.hit) {
      const half = box.size / 2;
      const horizontal = Math.abs(state.clover.x - box.x) < state.clover.r * 0.74 + half - 2;
      const boxBottom = box.y + half;
      const movingUp = state.clover.vy < 0;

      if (
        horizontal &&
        movingUp &&
        previousTop > boxBottom &&
        currentTop <= boxBottom &&
        state.clover.y > box.y
      ) {
        box.hit = true;
        box.bump = 1;
        state.starTimer = STAR_DURATION;
        state.clover.vy = Math.max(state.clover.vy, 90);
        playSfxStar();
      }
    }

    if (box.x + box.size / 2 < -24) {
      state.boxes.splice(i, 1);
    }
  }

  for (let i = state.pots.length - 1; i >= 0; i -= 1) {
    const pot = state.pots[i];
    pot.x -= speed * dt;

    const collided = circleCircleCollision(
      state.clover.x,
      state.clover.y + 2,
      state.clover.r * 0.72,
      pot.x,
      pot.y - 2,
      pot.r * 0.68,
    );

    if (collided && state.starTimer <= 0) {
      finishGame(false);
      return;
    }

    if (!pot.passed && pot.x + pot.r < state.clover.x - state.clover.r * 0.65) {
      pot.passed = true;
      state.passedCount += 1;
      state.bestCount = Math.max(state.bestCount, state.passedCount);
      revealNextCharacter();
      playSfxPass();
      if (!state.running) return;
    }

    if (pot.x + pot.r < -18) {
      state.pots.splice(i, 1);
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

  const glow = ctx.createRadialGradient(canvas.width * 0.78, 74, 12, canvas.width * 0.78, 74, 190);
  glow.addColorStop(0, "rgba(255, 224, 128, 0.32)");
  glow.addColorStop(1, "rgba(255, 224, 128, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height * 0.45);

  for (const orb of backdropOrbs) {
    const driftX = Math.sin(nowMs * 0.00034 * orb.drift + orb.phase) * 12;
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

  ctx.fillStyle = "rgba(255, 243, 196, 0.08)";
  for (let y = 54; y < canvas.height * 0.72; y += 66) {
    const wobble = Math.sin(nowMs * 0.00135 + y * 0.018) * 4;
    ctx.fillRect(0, y + wobble, canvas.width, 1.2);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '16px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  for (let i = 0; i < 8; i += 1) {
    const x = 34 + i * 42 + Math.sin(nowMs * 0.0008 + i) * 7;
    const y = 84 + (i % 3) * 66 + Math.cos(nowMs * 0.0011 + i * 0.5) * 10;
    ctx.globalAlpha = 0.11;
    ctx.fillText("☘", x, y);
  }
  ctx.globalAlpha = 1;
}

function drawGround(nowMs) {
  ctx.fillStyle = "#0a5526";
  ctx.fillRect(0, GROUND_TOP, canvas.width, GROUND_HEIGHT);

  ctx.fillStyle = "#117537";
  ctx.fillRect(0, GROUND_TOP + 8, canvas.width, 16);

  const stripeShift = (nowMs * 0.16) % 48;
  for (let x = -48 + stripeShift; x < canvas.width + 60; x += 48) {
    ctx.fillStyle = "rgba(39, 118, 58, 0.62)";
    ctx.beginPath();
    ctx.moveTo(x, GROUND_TOP + 1);
    ctx.lineTo(x + 24, GROUND_TOP + 1);
    ctx.lineTo(x + 12, GROUND_TOP + 22);
    ctx.closePath();
    ctx.fill();
  }
}

function drawDecorDrops() {
  for (const drop of state.decorDrops) {
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.rotate(drop.rotation);
    ctx.globalAlpha = drop.alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${drop.size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Courier New", monospace`;
    ctx.fillText(drop.token, 0, 0);
    ctx.restore();
  }
}

function drawPotOfGold(pot) {
  const potWidth = pot.r * 2.2;
  const potHeight = pot.r * 1.25;
  const left = pot.x - potWidth / 2;
  const top = pot.y - potHeight / 2;

  ctx.fillStyle = "#f7b500";
  const coinCount = 7;
  for (let i = 0; i < coinCount; i += 1) {
    const coinX = left + 6 + i * (potWidth - 12) / (coinCount - 1);
    const coinY = top + (i % 2 === 0 ? -5 : -2);
    ctx.beginPath();
    ctx.arc(coinX, coinY, 4.2, 0, Math.PI * 2);
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

function drawMysteryBox(box) {
  const y = box.y - box.bump * 9;
  const half = box.size / 2;
  const left = box.x - half;
  const top = y - half;

  const boxGradient = ctx.createLinearGradient(left, top, left, top + box.size);
  if (box.hit) {
    boxGradient.addColorStop(0, "#ab9868");
    boxGradient.addColorStop(1, "#7f6d44");
  } else {
    boxGradient.addColorStop(0, "#ffd45f");
    boxGradient.addColorStop(1, "#f0a116");
  }
  ctx.fillStyle = boxGradient;
  ctx.fillRect(left, top, box.size, box.size);

  ctx.strokeStyle = "rgba(51, 36, 9, 0.85)";
  ctx.lineWidth = 2;
  ctx.strokeRect(left + 1, top + 1, box.size - 2, box.size - 2);

  ctx.fillStyle = box.hit ? "#fff7d1" : "#5b3a09";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${box.hit ? 16 : 18}px "Avenir Next", "Trebuchet MS", sans-serif`;
  ctx.fillText(box.hit ? "★" : "?", box.x, y + 1);
}

function drawClover(nowMs) {
  const clover = state.clover;
  const runSwing = state.clover.onGround && state.started ? Math.sin(nowMs * 0.02) : 0;
  const angle = state.clover.onGround ? runSwing * 0.1 : Math.max(-0.35, Math.min(0.28, clover.vy / 520));

  ctx.save();
  ctx.translate(clover.x, clover.y);
  ctx.rotate(angle);

  if (state.starTimer > 0) {
    const pulse = 0.7 + Math.sin(nowMs * 0.02) * 0.25;
    ctx.strokeStyle = `rgba(255, 233, 138, ${0.65 * pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, clover.r + 9 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '14px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⭐", -clover.r - 7, -clover.r - 6);
    ctx.fillText("⭐", clover.r + 6, -clover.r - 8);
  }

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
    leafGradient.addColorStop(0, "#8fffad");
    leafGradient.addColorStop(1, "#22a04f");
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

  const legLift = state.clover.onGround && state.started ? Math.sin(nowMs * 0.03) * 4 : 0;
  ctx.strokeStyle = "#1f6a36";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-5, clover.r * 0.75);
  ctx.lineTo(-7, clover.r + 10 - legLift);
  ctx.moveTo(5, clover.r * 0.75);
  ctx.lineTo(8, clover.r + 10 + legLift);
  ctx.stroke();

  ctx.restore();
}

function drawStarBadge() {
  if (state.starTimer <= 0) return;

  ctx.fillStyle = "rgba(255, 229, 130, 0.88)";
  ctx.fillRect(canvas.width - 112, 14, 98, 30);
  ctx.strokeStyle = "rgba(85, 58, 13, 0.75)";
  ctx.lineWidth = 2;
  ctx.strokeRect(canvas.width - 112, 14, 98, 30);
  ctx.fillStyle = "#3f2c09";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = 'bold 13px "Avenir Next", "Trebuchet MS", sans-serif';
  ctx.fillText(`⭐ ${state.starTimer.toFixed(1)}s`, canvas.width - 63, 29);
}

function drawStartPrompt() {
  if (!state.running || state.started) return;

  ctx.fillStyle = "rgba(10, 24, 26, 0.36)";
  ctx.fillRect(32, canvas.height * 0.36, canvas.width - 64, 90);
  ctx.strokeStyle = "rgba(250, 255, 235, 0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(32, canvas.height * 0.36, canvas.width - 64, 90);

  ctx.fillStyle = "#effff0";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = 'bold 22px "Avenir Next", "Trebuchet MS", sans-serif';
  ctx.fillText("Tap To Run", canvas.width / 2, canvas.height * 0.41);
  ctx.font = '14px "Avenir Next", "Trebuchet MS", sans-serif';
  ctx.fillText("Jump pots, bonk mystery boxes for star power", canvas.width / 2, canvas.height * 0.456);
}

function draw(nowMs) {
  drawBackground(nowMs);
  drawDecorDrops();
  drawGround(nowMs);

  for (const box of state.boxes) {
    drawMysteryBox(box);
  }

  for (const pot of state.pots) {
    drawPotOfGold(pot);
  }

  drawClover(nowMs);
  drawStarBadge();
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
  jump();
}

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.code === "Space" || event.key === "ArrowUp") {
    event.preventDefault();
    startFestiveMusic();
    jump();
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
