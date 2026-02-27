const ADDRESS = "518 W 27th St";
const TIME_LIMIT = 90;
const FALLING_EMOJIS = ["🍀", "🌈", "🎉", "🥳", "✨", "🎶", "💚", "🪙", "🍺", "💃"];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const caughtLabel = document.getElementById("caughtCount");
const remainingLabel = document.getElementById("remainingCount");
const timeLabel = document.getElementById("timeLeft");
const addressMasked = document.getElementById("addressMasked");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const restartButton = document.getElementById("restartButton");
const winArt = document.getElementById("winArt");
const tequilaRain = document.getElementById("tequilaRain");

const TARGET_CHARS = [...new Set(ADDRESS.toUpperCase().replace(/[^A-Z0-9]/g, "").split(""))];

const state = {
  player: { x: canvas.width / 2 - 47, y: canvas.height - 66, w: 94, h: 34, speed: 6 },
  drops: [],
  caughtSet: new Set(),
  timeLeft: TIME_LIMIT,
  running: true,
  leftPressed: false,
  rightPressed: false,
  spawnTimer: 0,
  spawnInterval: 520,
  startAt: performance.now(),
};

function isTargetChar(char) {
  return /[A-Z0-9]/.test(char);
}

function getMaskedAddress() {
  return [...ADDRESS].map((char) => {
    if (!isTargetChar(char.toUpperCase())) return char;
    return state.caughtSet.has(char.toUpperCase()) ? char : "■";
  }).join("");
}

function updateHud() {
  caughtLabel.textContent = String(state.caughtSet.size);
  remainingLabel.textContent = String(TARGET_CHARS.length - state.caughtSet.size);
  timeLabel.textContent = String(Math.ceil(state.timeLeft));
  addressMasked.textContent = getMaskedAddress();
}

function resetGame() {
  state.player.x = canvas.width / 2 - state.player.w / 2;
  state.drops = [];
  state.caughtSet.clear();
  state.timeLeft = TIME_LIMIT;
  state.running = true;
  state.leftPressed = false;
  state.rightPressed = false;
  state.spawnTimer = 0;
  state.startAt = performance.now();

  overlay.classList.add("hidden");
  tequilaRain.innerHTML = "";
  winArt.classList.add("hidden");
  updateHud();
}

function randomDropToken() {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  if (Math.random() < 0.24) {
    return {
      value: FALLING_EMOJIS[Math.floor(Math.random() * FALLING_EMOJIS.length)],
      isEmoji: true,
    };
  }

  if (TARGET_CHARS.length && Math.random() < 0.68) {
    return {
      value: TARGET_CHARS[Math.floor(Math.random() * TARGET_CHARS.length)],
      isEmoji: false,
    };
  }

  return {
    value: charset[Math.floor(Math.random() * charset.length)],
    isEmoji: false,
  };
}

function spawnDrop() {
  const token = randomDropToken();
  state.drops.push({
    x: 16 + Math.random() * (canvas.width - 32),
    y: -16,
    speed: 1.7 + Math.random() * 2.2,
    letter: token.value,
    isEmoji: token.isEmoji,
    size: token.isEmoji ? 24 : 22,
  });
}

function catchDrop(index) {
  const drop = state.drops[index];
  state.drops.splice(index, 1);

  if (!drop.isEmoji && TARGET_CHARS.includes(drop.letter)) {
    state.caughtSet.add(drop.letter);
  }

  if (state.caughtSet.size >= TARGET_CHARS.length) {
    finishGame(true);
  }
}

function createTequilaRain() {
  tequilaRain.innerHTML = "";
  for (let i = 0; i < 16; i += 1) {
    const shot = document.createElement("span");
    shot.className = "shot";
    shot.textContent = "🥃";
    shot.style.left = `${Math.random() * 100}%`;
    shot.style.animationDelay = `${Math.random() * 2.6}s`;
    shot.style.animationDuration = `${1.5 + Math.random() * 1.8}s`;
    tequilaRain.appendChild(shot);
  }
}

function finishGame(won) {
  state.running = false;
  overlay.classList.remove("hidden");

  if (won) {
    overlayTitle.textContent = "Congratulations!";
    overlayText.textContent = "get ready to party w rohit soon at music for a while : ) ";
    winArt.classList.remove("hidden");
    createTequilaRain();
  } else {
    overlayTitle.textContent = "Time's up!";
    overlayText.textContent = "Catch one of each address letter before the timer ends.";
    winArt.classList.add("hidden");
  }
}

function drawLetterDrop(drop) {
  const tileSize = drop.isEmoji ? 28 : 24;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(drop.x - tileSize / 2, drop.y - tileSize / 2, tileSize, tileSize);
  ctx.fillStyle = drop.isEmoji ? "#fff8db" : TARGET_CHARS.includes(drop.letter) ? "#ffd43b" : "#d1d5db";
  ctx.fillRect(drop.x - tileSize / 2 + 2, drop.y - tileSize / 2 + 2, tileSize - 4, tileSize - 4);
  ctx.fillStyle = "#111827";
  ctx.font = drop.isEmoji
    ? "18px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif"
    : "bold 14px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(drop.letter, drop.x, drop.y + (drop.isEmoji ? 0 : 1));
}

function drawPlayer() {
  const p = state.player;
  const coinY = p.y + 2;
  const rimY = p.y + 10;
  const bodyY = p.y + 14;

  ctx.fillStyle = "#f59f00";
  for (let i = 0; i < 7; i += 1) {
    ctx.fillRect(p.x + 10 + i * 11, coinY + (i % 2 === 0 ? 0 : 2), 8, 6);
  }
  ctx.fillRect(p.x + 8, rimY, p.w - 16, 8);

  ctx.fillStyle = "#212529";
  ctx.fillRect(p.x + 10, bodyY, p.w - 20, p.h - 12);
  ctx.fillStyle = "#343a40";
  ctx.fillRect(p.x + 14, bodyY + 4, p.w - 28, p.h - 16);
  ctx.fillStyle = "#495057";
  ctx.fillRect(p.x + 4, bodyY + 8, 6, 10);
  ctx.fillRect(p.x + p.w - 10, bodyY + 8, 6, 10);
}

function update(deltaMs) {
  if (!state.running) return;

  const elapsed = (performance.now() - state.startAt) / 1000;
  state.timeLeft = Math.max(TIME_LIMIT - elapsed, 0);
  if (state.timeLeft <= 0) {
    finishGame(false);
    return;
  }

  if (state.leftPressed) state.player.x -= state.player.speed;
  if (state.rightPressed) state.player.x += state.player.speed;
  state.player.x = Math.max(0, Math.min(canvas.width - state.player.w, state.player.x));

  state.spawnTimer += deltaMs;
  while (state.spawnTimer >= state.spawnInterval) {
    spawnDrop();
    state.spawnTimer -= state.spawnInterval;
  }

  for (let i = state.drops.length - 1; i >= 0; i -= 1) {
    const drop = state.drops[i];
    drop.y += drop.speed;

    const inCatcher =
      drop.x >= state.player.x &&
      drop.x <= state.player.x + state.player.w &&
      drop.y + 10 >= state.player.y;

    if (inCatcher) {
      catchDrop(i);
      continue;
    }

    if (drop.y - 12 > canvas.height) {
      state.drops.splice(i, 1);
    }
  }

  updateHud();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.fillRect(0, y, canvas.width, 2);
  }

  for (const drop of state.drops) {
    drawLetterDrop(drop);
  }

  drawPlayer();

  if (!state.running) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

let lastFrame = performance.now();
function loop(now) {
  const deltaMs = now - lastFrame;
  lastFrame = now;
  update(deltaMs);
  draw();
  requestAnimationFrame(loop);
}

function moveToClientX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const ratio = canvas.width / rect.width;
  state.player.x = (clientX - rect.left) * ratio - state.player.w / 2;
}

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") state.leftPressed = true;
  if (e.key === "ArrowRight") state.rightPressed = true;
});
window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft") state.leftPressed = false;
  if (e.key === "ArrowRight") state.rightPressed = false;
});

canvas.addEventListener("mousemove", (e) => moveToClientX(e.clientX));
canvas.addEventListener("touchmove", (e) => {
  const touch = e.touches[0];
  if (touch) moveToClientX(touch.clientX);
  e.preventDefault();
});

restartButton.addEventListener("click", resetGame);

resetGame();
requestAnimationFrame(loop);
