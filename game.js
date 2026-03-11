const INVITE_TEXT = "518 W 27TH ST · MUSIC FOR A WHILE";
const WIN_MESSAGE = "get ready to party w rohit soon at music for a while : ) ";

const PATH_WIDTH = 176;
const PATH_MARGIN = 84;
const PLAYER_Y = 488;
const TRACK_SHIFT = 78;
const TURN_ZONE_TOP = PLAYER_Y - 120;
const TURN_ZONE_BOTTOM = PLAYER_Y + 26;
const POT_ZONE_TOP = PLAYER_Y - 120;
const POT_ZONE_BOTTOM = PLAYER_Y + 20;
const POT_RADIUS = 18;
const POT_JUMP_CLEARANCE = 24;

const BASE_SPEED = 164;
const MAX_SPEED = 260;
const TURN_INTERVAL_MIN = 1.18;
const TURN_INTERVAL_MAX = 1.9;
const POT_INTERVAL_MIN = 1.45;
const POT_INTERVAL_MAX = 2.45;
const FALL_GRAVITY = 1680;
const FALL_SPIN = 3.4;
const JUMP_VELOCITY = 560;
const JUMP_GRAVITY = 1550;

const DECOR_MAX = 24;
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
  y: 24 + Math.random() * (canvas.height - 260),
  r: 28 + Math.random() * 82,
  drift: 0.25 + Math.random() * 0.45,
  phase: index * 0.61 + Math.random(),
}));

const REVEALABLE_TOTAL = [...INVITE_TEXT].reduce(
  (count, char) => (/[A-Z0-9]/i.test(char) ? count + 1 : count),
  0,
);

const state = {
  clover: {
    x: canvas.width / 2,
    y: PLAYER_Y,
    r: 24,
    vx: 0,
    vy: 0,
    rot: 0,
    jumpHeight: 0,
    jumpVy: 0,
  },
  beer: {
    x: canvas.width / 2,
    y: PLAYER_Y + 86,
  },
  trackCenterX: canvas.width / 2,
  trackTargetX: canvas.width / 2,
  turns: [],
  pots: [],
  decorDrops: [],
  running: true,
  started: false,
  falling: false,
  spawnTimer: 0,
  nextTurnDelay: TURN_INTERVAL_MAX,
  potSpawnTimer: 0,
  nextPotDelay: POT_INTERVAL_MAX,
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

let pointerStartX = null;
let pointerStartY = null;

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

function playSfxTurn() {
  if (!musicState.context) return;
  const now = musicState.context.currentTime;
  scheduleTone(90, now, 0.13, "triangle", 0.11, 2500);
  scheduleTone(94, now + 0.06, 0.14, "square", 0.07, 2800);
}

function playSfxJump() {
  if (!musicState.context) return;
  const now = musicState.context.currentTime;
  scheduleTone(86, now, 0.1, "square", 0.11, 2600);
  scheduleTone(90, now + 0.06, 0.1, "triangle", 0.07, 2800);
}

function playSfxPotClear() {
  if (!musicState.context) return;
  const now = musicState.context.currentTime;
  scheduleTone(93, now, 0.09, "triangle", 0.09, 2600);
}

function playSfxMiss() {
  if (!musicState.context) return;
  const now = musicState.context.currentTime;
  scheduleTone(47, now, 0.2, "sawtooth", 0.15, 900);
}

function playSfxWin() {
  if (!musicState.context) return;
  const now = musicState.context.currentTime;
  [84, 88, 91, 96].forEach((midi, index) => {
    scheduleTone(midi, now + index * 0.08, 0.22, "triangle", 0.1, 2600);
  });
}

function scheduleFestiveLoop() {
  if (!musicState.context || !musicState.started) return;

  const lookAheadSeconds = 0.9;
  while (musicState.nextTime < musicState.context.currentTime + lookAheadSeconds) {
    const stepPattern = FESTIVE_PATTERN[musicState.step % FESTIVE_PATTERN.length];
    scheduleTone(stepPattern.bass, musicState.nextTime, MUSIC_STEP_SECONDS * 0.88, "sine", 0.066, 960);
    scheduleTone(stepPattern.lead, musicState.nextTime, MUSIC_STEP_SECONDS * 0.82, "triangle", 0.09, 1920);

    if (musicState.step % 2 === 0) {
      scheduleTone(stepPattern.lead + 12, musicState.nextTime, MUSIC_STEP_SECONDS * 0.45, "square", 0.032, 3200);
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

  if (typeRoll < 0.4) {
    token = DECOR_EMOJIS[Math.floor(Math.random() * DECOR_EMOJIS.length)];
  } else if (typeRoll < 0.68) {
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

function resetGame() {
  state.clover.x = canvas.width / 2;
  state.clover.y = PLAYER_Y;
  state.clover.vx = 0;
  state.clover.vy = 0;
  state.clover.rot = 0;
  state.clover.jumpHeight = 0;
  state.clover.jumpVy = 0;

  state.beer.x = canvas.width / 2;
  state.beer.y = PLAYER_Y + 86;

  state.trackCenterX = canvas.width / 2;
  state.trackTargetX = canvas.width / 2;
  state.turns = [];
  state.pots = [];
  state.decorDrops = [];
  state.running = true;
  state.started = false;
  state.falling = false;
  state.spawnTimer = 0;
  state.nextTurnDelay = randomBetween(TURN_INTERVAL_MIN, TURN_INTERVAL_MAX);
  state.potSpawnTimer = 0;
  state.nextPotDelay = randomBetween(POT_INTERVAL_MIN, POT_INTERVAL_MAX);
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
  restartButton.textContent = "Run Again";
  updateHud();
}

function chooseNextTurnDirection() {
  if (state.trackTargetX <= PATH_MARGIN + 18) return 1;
  if (state.trackTargetX >= canvas.width - PATH_MARGIN - 18) return -1;
  return Math.random() < 0.5 ? -1 : 1;
}

function spawnTurn() {
  state.turns.push({
    y: -90,
    dir: chooseNextTurnDirection(),
    centerX: state.trackTargetX,
    resolved: false,
    flash: 0,
  });
}

function spawnPot() {
  state.pots.push({
    y: -72,
    x: state.trackTargetX + randomBetween(-18, 18),
    r: POT_RADIUS,
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
  state.falling = false;
  state.bestCount = Math.max(state.bestCount, state.passedCount);
  updateHud();
  overlay.classList.remove("hidden");

  if (won) {
    overlayTitle.textContent = "Congrats, Clover Runner!";
    overlayText.textContent = WIN_MESSAGE;
    winArt.textContent = "🍀🏃🌈";
    winArt.classList.remove("hidden");
    restartButton.textContent = "Play Again";
    createTequilaRain();
    playSfxWin();
  } else {
    overlayTitle.textContent = "You Fell Off the Path";
    overlayText.textContent = "The pint was right behind you. Nail every turn to stay on track.";
    winArt.classList.add("hidden");
    tequilaRain.innerHTML = "";
    restartButton.textContent = "Try Again";
  }
}

function startFall(direction) {
  if (state.falling || !state.running) return;
  state.falling = true;
  state.started = false;
  state.clover.vx = direction * randomBetween(150, 245) + randomBetween(-35, 35);
  state.clover.vy = randomBetween(-120, -40);
  playSfxMiss();
}

function resolveTurn(turn) {
  if (turn.resolved) return;

  turn.resolved = true;
  turn.flash = 1;
  state.passedCount += 1;
  state.bestCount = Math.max(state.bestCount, state.passedCount);
  state.trackTargetX = clamp(
    state.trackTargetX + turn.dir * TRACK_SHIFT,
    PATH_MARGIN,
    canvas.width - PATH_MARGIN,
  );
  playSfxTurn();
  revealNextCharacter();
}

function attemptTurn(direction) {
  startFestiveMusic();
  if (!state.running) return;

  if (!state.started && !state.falling) {
    state.started = true;
  }

  if (state.falling) return;

  const activeTurn = state.turns.find(
    (turn) => !turn.resolved && turn.y >= TURN_ZONE_TOP && turn.y <= TURN_ZONE_BOTTOM,
  );

  if (!activeTurn) return;

  if (activeTurn.dir === direction) {
    resolveTurn(activeTurn);
  } else {
    startFall(direction);
  }
}

function attemptJump() {
  startFestiveMusic();
  if (!state.running || state.falling) return;

  if (!state.started) {
    state.started = true;
  }

  if (state.clover.jumpHeight > 1) return;

  state.clover.jumpVy = JUMP_VELOCITY;
  playSfxJump();
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

  state.beer.x += (state.clover.x - state.beer.x) * Math.min(1, dt * 4.8);
  state.beer.y += (PLAYER_Y + 86 - state.beer.y) * Math.min(1, dt * 5.2);
  state.beer.y += Math.sin(state.frameMs / 180) * 0.7;

  if (state.falling) {
    state.clover.vy += FALL_GRAVITY * dt;
    state.clover.x += state.clover.vx * dt;
    state.clover.y += state.clover.vy * dt;
    state.clover.rot += FALL_SPIN * dt;

    state.beer.x += (state.clover.x - state.beer.x) * Math.min(1, dt * 2.4);
    state.beer.y += (state.clover.y + 72 - state.beer.y) * Math.min(1, dt * 2.8);

    if (
      state.clover.y > canvas.height + 90 ||
      state.clover.x < -80 ||
      state.clover.x > canvas.width + 80
    ) {
      finishGame(false);
      return;
    }

    updateHud();
    return;
  }

  if (!state.started) {
    state.clover.x += (state.trackCenterX - state.clover.x) * Math.min(1, dt * 6);
    state.clover.jumpHeight = 0;
    state.clover.jumpVy = 0;
    state.clover.y = PLAYER_Y + Math.sin(state.frameMs / 240) * 1.7;
    state.clover.rot = 0;
    updateHud();
    return;
  }

  const speed = Math.min(MAX_SPEED, BASE_SPEED + state.passedCount * 3.4);
  state.trackCenterX += (state.trackTargetX - state.trackCenterX) * Math.min(1, dt * 3.9);
  state.clover.x += (state.trackCenterX - state.clover.x) * Math.min(1, dt * 6.2);
  state.clover.jumpVy -= JUMP_GRAVITY * dt;
  state.clover.jumpHeight = Math.max(0, state.clover.jumpHeight + state.clover.jumpVy * dt);
  if (state.clover.jumpHeight <= 0) {
    state.clover.jumpHeight = 0;
    state.clover.jumpVy = 0;
  }

  const runBob = state.clover.jumpHeight <= 0.1 ? Math.sin(state.frameMs / 95) * 0.8 : 0;
  state.clover.y = PLAYER_Y - state.clover.jumpHeight + runBob;
  state.clover.rot = Math.sin(state.frameMs / 180) * 0.03 - state.clover.jumpVy * 0.00055;

  state.spawnTimer += dt;
  if (state.spawnTimer >= state.nextTurnDelay) {
    spawnTurn();
    state.spawnTimer = 0;
    const speedTightening = state.passedCount * 0.01;
    state.nextTurnDelay = clamp(
      randomBetween(TURN_INTERVAL_MIN, TURN_INTERVAL_MAX) - speedTightening,
      0.88,
      TURN_INTERVAL_MAX,
    );
  }

  state.potSpawnTimer += dt;
  if (state.potSpawnTimer >= state.nextPotDelay) {
    spawnPot();
    state.potSpawnTimer = 0;
    const speedTightening = state.passedCount * 0.01;
    state.nextPotDelay = clamp(
      randomBetween(POT_INTERVAL_MIN, POT_INTERVAL_MAX) - speedTightening,
      0.95,
      POT_INTERVAL_MAX,
    );
  }

  for (let i = state.pots.length - 1; i >= 0; i -= 1) {
    const pot = state.pots[i];
    pot.y += speed * dt;
    pot.x += (state.trackCenterX - pot.x) * Math.min(1, dt * 0.7);

    const scale = clamp((pot.y - 50) / (PLAYER_Y - 50), 0.45, 1.25);
    const radius = pot.r * scale;
    const nearPlayer = Math.abs(pot.y - PLAYER_Y) < radius + 18;
    const overlapping = Math.abs(pot.x - state.clover.x) < radius * 0.86;

    if (!pot.passed && nearPlayer && overlapping) {
      const needsClearance = POT_JUMP_CLEARANCE + radius * 0.3;
      if (state.clover.jumpHeight < needsClearance) {
        startFall(pot.x < state.clover.x ? -1 : 1);
        break;
      }
    }

    if (!pot.passed && pot.y > POT_ZONE_BOTTOM) {
      pot.passed = true;
      playSfxPotClear();
    }

    if (pot.y > canvas.height + 64) {
      state.pots.splice(i, 1);
    }
  }

  for (let i = state.turns.length - 1; i >= 0; i -= 1) {
    const turn = state.turns[i];
    turn.y += speed * dt;

    if (turn.flash > 0) {
      turn.flash = Math.max(0, turn.flash - dt * 3);
    }

    if (!turn.resolved && turn.y > TURN_ZONE_BOTTOM) {
      startFall(turn.dir);
      break;
    }

    if (turn.y > canvas.height + 64) {
      state.turns.splice(i, 1);
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
}

function drawTrack() {
  const cx = state.trackCenterX;
  const topY = 46;
  const topWidth = PATH_WIDTH * 0.52;
  const bottomWidth = PATH_WIDTH;

  ctx.fillStyle = "rgba(10, 28, 22, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const trackGradient = ctx.createLinearGradient(0, topY, 0, canvas.height);
  trackGradient.addColorStop(0, "#324c40");
  trackGradient.addColorStop(0.56, "#1f352d");
  trackGradient.addColorStop(1, "#172923");
  ctx.fillStyle = trackGradient;

  ctx.beginPath();
  ctx.moveTo(cx - topWidth / 2, topY);
  ctx.lineTo(cx + topWidth / 2, topY);
  ctx.lineTo(cx + bottomWidth / 2, canvas.height);
  ctx.lineTo(cx - bottomWidth / 2, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#f1cc6b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - topWidth / 2, topY);
  ctx.lineTo(cx - bottomWidth / 2, canvas.height);
  ctx.moveTo(cx + topWidth / 2, topY);
  ctx.lineTo(cx + bottomWidth / 2, canvas.height);
  ctx.stroke();

  const dashOffset = (state.frameMs * 0.28) % 58;
  for (let y = topY + dashOffset; y < canvas.height; y += 58) {
    const t = (y - topY) / (canvas.height - topY);
    const dashW = 5 + t * 10;
    const dashH = 10 + t * 18;
    ctx.fillStyle = "rgba(255, 245, 207, 0.86)";
    ctx.fillRect(cx - dashW / 2, y, dashW, dashH);
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

function drawRoadPot(pot) {
  if (pot.y < -80 || pot.y > canvas.height + 80) return;

  const scale = clamp((pot.y - 50) / (PLAYER_Y - 50), 0.45, 1.25);
  const potWidth = pot.r * 2.2 * scale;
  const potHeight = pot.r * 1.25 * scale;
  const left = pot.x - potWidth / 2;
  const top = pot.y - potHeight / 2;

  ctx.fillStyle = "#f7b500";
  const coinCount = 7;
  for (let i = 0; i < coinCount; i += 1) {
    const coinX = left + 6 + i * (potWidth - 12) / (coinCount - 1);
    const coinY = top + (i % 2 === 0 ? -5 : -2) * scale;
    ctx.beginPath();
    ctx.arc(coinX, coinY, 3.7 * scale, 0, Math.PI * 2);
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
  ctx.lineWidth = 1.8;
  ctx.strokeRect(left + 1.5, top + 3, potWidth - 3, potHeight - 5);
}

function drawTurnMarker(turn) {
  if (turn.y < -50 || turn.y > canvas.height + 30) return;

  const scale = clamp((turn.y - 40) / (PLAYER_Y - 40), 0.45, 1.2);
  const markerW = 72 * scale;
  const markerH = 34 * scale;
  const arrow = turn.dir < 0 ? "←" : "→";
  const x = turn.centerX;
  const y = turn.y;
  const glowAlpha = turn.flash > 0 ? 0.42 * turn.flash : 0.12;

  ctx.fillStyle = turn.dir < 0 ? "rgba(96, 206, 255, 0.76)" : "rgba(255, 208, 102, 0.78)";
  ctx.fillRect(x - markerW / 2, y - markerH / 2, markerW, markerH);

  ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 + glowAlpha})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - markerW / 2, y - markerH / 2, markerW, markerH);

  ctx.fillStyle = "#0f1e1c";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${16 * scale}px "Avenir Next", "Trebuchet MS", sans-serif`;
  ctx.fillText(arrow, x, y);
}

function drawPintOfBeer() {
  const x = state.beer.x;
  const y = state.beer.y;
  const width = 36;
  const height = 50;
  const left = x - width / 2;
  const top = y - height / 2;

  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  ctx.fillRect(left + 2, top, width - 4, 12);

  const beerGradient = ctx.createLinearGradient(0, top + 8, 0, top + height);
  beerGradient.addColorStop(0, "#f9d973");
  beerGradient.addColorStop(0.45, "#e8a62d");
  beerGradient.addColorStop(1, "#b46a18");
  ctx.fillStyle = beerGradient;
  ctx.fillRect(left + 2, top + 8, width - 4, height - 10);

  ctx.strokeStyle = "rgba(230, 247, 255, 0.8)";
  ctx.lineWidth = 2;
  ctx.strokeRect(left + 1, top + 1, width - 2, height - 2);

  ctx.strokeStyle = "rgba(229, 246, 255, 0.8)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(left + width + 3, top + 26, 9, -1.2, 1.2);
  ctx.stroke();
}

function drawClover() {
  const clover = state.clover;
  const runSwing =
    !state.falling && state.started && state.clover.jumpHeight < 2
      ? Math.sin(state.frameMs * 0.02)
      : 0;

  ctx.save();
  ctx.translate(clover.x, clover.y);
  ctx.rotate(clover.rot);

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

  const legLift = runSwing * 4;
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

function drawStartPrompt() {
  if (!state.running || state.started || state.falling) return;

  ctx.fillStyle = "rgba(10, 24, 26, 0.36)";
  ctx.fillRect(30, canvas.height * 0.36, canvas.width - 60, 92);
  ctx.strokeStyle = "rgba(250, 255, 235, 0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, canvas.height * 0.36, canvas.width - 60, 92);

  ctx.fillStyle = "#effff0";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = 'bold 21px "Avenir Next", "Trebuchet MS", sans-serif';
  ctx.fillText("Swipe To Turn + Jump", canvas.width / 2, canvas.height * 0.41);
  ctx.font = '14px "Avenir Next", "Trebuchet MS", sans-serif';
  ctx.fillText("Turn left/right, swipe up to jump pots", canvas.width / 2, canvas.height * 0.457);
}

function draw() {
  drawBackground(state.frameMs);
  drawTrack();
  drawDecorDrops();

  for (const pot of state.pots) {
    drawRoadPot(pot);
  }

  for (const turn of state.turns) {
    drawTurnMarker(turn);
  }

  drawPintOfBeer();
  drawClover();
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
  draw();
  requestAnimationFrame(loop);
}

function gestureFromPointer(clientX, clientY, startX, startY) {
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const deltaX = clientX - startX;
  const deltaY = clientY - startY;

  if (deltaY <= -24 && Math.abs(deltaY) > Math.abs(deltaX)) {
    return "jump";
  }

  if (Math.abs(deltaX) >= 22) {
    return deltaX < 0 ? "left" : "right";
  }
  return clientX < centerX ? "left" : "right";
}

function handlePrimaryDown(event) {
  event.preventDefault();
  startFestiveMusic();
  if (event.pointerId !== undefined && canvas.setPointerCapture) {
    canvas.setPointerCapture(event.pointerId);
  }
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
}

function handlePrimaryUp(event) {
  event.preventDefault();
  const startX = pointerStartX ?? event.clientX;
  const startY = pointerStartY ?? event.clientY;
  pointerStartX = null;
  pointerStartY = null;
  const gesture = gestureFromPointer(event.clientX, event.clientY, startX, startY);
  if (gesture === "jump") {
    attemptJump();
  } else {
    attemptTurn(gesture === "left" ? -1 : 1);
  }
}

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    attemptTurn(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    attemptTurn(1);
  } else if (event.code === "Space" || event.key === "ArrowUp") {
    event.preventDefault();
    attemptJump();
  }
});

if (window.PointerEvent) {
  canvas.addEventListener("pointerdown", handlePrimaryDown);
  canvas.addEventListener("pointerup", handlePrimaryUp);
  canvas.addEventListener("pointercancel", () => {
    pointerStartX = null;
    pointerStartY = null;
  });
} else {
  canvas.addEventListener("mousedown", (event) => {
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    handlePrimaryUp(event);
  });
  canvas.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      pointerStartX = touch.clientX;
      pointerStartY = touch.clientY;
      startFestiveMusic();
      event.preventDefault();
    },
    { passive: false },
  );
  canvas.addEventListener(
    "touchend",
    (event) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      const gesture = gestureFromPointer(
        touch.clientX,
        touch.clientY,
        pointerStartX ?? touch.clientX,
        pointerStartY ?? touch.clientY,
      );
      pointerStartX = null;
      pointerStartY = null;
      if (gesture === "jump") {
        attemptJump();
      } else {
        attemptTurn(gesture === "left" ? -1 : 1);
      }
      event.preventDefault();
    },
    { passive: false },
  );
}

restartButton.addEventListener("click", () => {
  startFestiveMusic();
  resetGame();
});

resetGame();
requestAnimationFrame(loop);
