const ADDRESS = "17 SHAMROCK LANE, APT 4B";
const REVEAL_COST = 5;
const TIME_LIMIT = 90;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const coinsLabel = document.getElementById("coins");
const nextUnlockLabel = document.getElementById("nextUnlock");
const timeLabel = document.getElementById("timeLeft");
const addressMasked = document.getElementById("addressMasked");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const restartButton = document.getElementById("restartButton");

const state = {
  player: { x: canvas.width / 2 - 34, y: canvas.height - 58, w: 68, h: 22, speed: 5.3 },
  coins: [],
  totalCoins: 0,
  coinsSinceUnlock: 0,
  revealCount: 0,
  timeLeft: TIME_LIMIT,
  running: true,
  leftPressed: false,
  rightPressed: false,
  spawnTimer: 0,
  spawnInterval: 420,
  startAt: performance.now(),
};

function getMaskedAddress() {
  const visible = ADDRESS.slice(0, state.revealCount);
  const hidden = ADDRESS
    .slice(state.revealCount)
    .replace(/[A-Z0-9]/gi, "■");
  return visible + hidden;
}

function resetGame() {
  state.player.x = canvas.width / 2 - state.player.w / 2;
  state.coins = [];
  state.totalCoins = 0;
  state.coinsSinceUnlock = 0;
  state.revealCount = 0;
  state.timeLeft = TIME_LIMIT;
  state.running = true;
  state.leftPressed = false;
  state.rightPressed = false;
  state.spawnTimer = 0;
  state.startAt = performance.now();
  overlay.classList.add("hidden");
  updateHud();
}

function updateHud() {
  coinsLabel.textContent = String(state.totalCoins);
  nextUnlockLabel.textContent = String(Math.max(REVEAL_COST - state.coinsSinceUnlock, 0));
  timeLabel.textContent = String(Math.ceil(state.timeLeft));
  addressMasked.textContent = getMaskedAddress();
}

function spawnCoin() {
  const x = 12 + Math.random() * (canvas.width - 24);
  const speed = 1.5 + Math.random() * 2.4;
  state.coins.push({ x, y: -10, r: 7, speed });
}

function catchCoin(index) {
  state.coins.splice(index, 1);
  state.totalCoins += 1;
  state.coinsSinceUnlock += 1;

  if (state.coinsSinceUnlock >= REVEAL_COST) {
    state.revealCount = Math.min(state.revealCount + 1, ADDRESS.length);
    state.coinsSinceUnlock = 0;
  }

  if (state.revealCount >= ADDRESS.length) {
    finishGame(true);
  }
}

function finishGame(won) {
  state.running = false;
  overlay.classList.remove("hidden");
  if (won) {
    overlayTitle.textContent = "🍀 Address Unlocked!";
    overlayText.textContent = `Party location: ${ADDRESS}`;
  } else {
    overlayTitle.textContent = "Time's up!";
    overlayText.textContent = `You revealed: ${ADDRESS.slice(0, state.revealCount)}. Try once more!`;
  }
}

function drawPixelCoin(coin) {
  ctx.fillStyle = "#ffd43b";
  ctx.fillRect(coin.x - coin.r, coin.y - coin.r, coin.r * 2, coin.r * 2);
  ctx.fillStyle = "#fff3bf";
  ctx.fillRect(coin.x - 2, coin.y - 5, 4, 10);
}

function drawPlayer() {
  const p = state.player;
  ctx.fillStyle = "#081c15";
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = "#2b9348";
  ctx.fillRect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);
  ctx.fillStyle = "#95d5b2";
  ctx.fillRect(p.x + p.w / 2 - 6, p.y - 8, 12, 8);
}

function update(deltaMs) {
  if (!state.running) {
    return;
  }

  const elapsed = (performance.now() - state.startAt) / 1000;
  state.timeLeft = Math.max(TIME_LIMIT - elapsed, 0);
  if (state.timeLeft <= 0) {
    finishGame(false);
    return;
  }

  if (state.leftPressed) {
    state.player.x -= state.player.speed;
  }
  if (state.rightPressed) {
    state.player.x += state.player.speed;
  }
  state.player.x = Math.max(0, Math.min(canvas.width - state.player.w, state.player.x));

  state.spawnTimer += deltaMs;
  while (state.spawnTimer >= state.spawnInterval) {
    spawnCoin();
    state.spawnTimer -= state.spawnInterval;
  }

  for (let i = state.coins.length - 1; i >= 0; i -= 1) {
    const coin = state.coins[i];
    coin.y += coin.speed;

    const inBucket =
      coin.x > state.player.x &&
      coin.x < state.player.x + state.player.w &&
      coin.y + coin.r >= state.player.y;

    if (inBucket) {
      catchCoin(i);
      continue;
    }

    if (coin.y - coin.r > canvas.height) {
      state.coins.splice(i, 1);
    }
  }

  updateHud();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.fillRect(0, y, canvas.width, 2);
  }

  for (const coin of state.coins) {
    drawPixelCoin(coin);
  }
  drawPlayer();

  if (!state.running) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
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
  if (touch) {
    moveToClientX(touch.clientX);
  }
  e.preventDefault();
});

restartButton.addEventListener("click", resetGame);

resetGame();
requestAnimationFrame(loop);
