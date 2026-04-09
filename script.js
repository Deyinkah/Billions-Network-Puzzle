"use strict";

// Config and state
const CONFIG = {
  GRID_SIZES: { Easy: 3, Medium: 4, Hard: 5, Expert: 6 },
  HINT_SECONDS: 3,
  HINT_COST: 50,
  RESET_COST: 100,
  DEFAULT_IMAGE_URL: "img/billions-logo.jpg",
  DEFAULT_DIFFICULTY: "Medium",
};

const CORRECT_FLASH_MS = 10000; // flash duration for correct cell after removal

let PUZZLE_DATA = null;
const S = {
  started: false,
  startTime: 0,
  timerHandle: null,
  seconds: 0,
  hints: 0,
  resets: 0,
  placed: 0,
  total: 0,
  grid: CONFIG.GRID_SIZES[CONFIG.DEFAULT_DIFFICULTY],
  imgURL: CONFIG.DEFAULT_IMAGE_URL,
  todayKey: "",
  difficulty: CONFIG.DEFAULT_DIFFICULTY,
};

const el = {
  board: document.getElementById("board"),
  tray: document.getElementById("tray"),
  ref: document.getElementById("refimg"),
  overlay: document.getElementById("hintOverlay"),
  time: document.getElementById("time"),
  score: document.getElementById("score"),
  chipDate: document.getElementById("chipDate"),
  chipDiff: document.getElementById("chipDiff"),
  piecesLeft: document.getElementById("piecesLeft"),
  dayKey: document.getElementById("dayKey"),
  resets: document.getElementById("resets"),
  hints: document.getElementById("hints"),
  toast: document.getElementById("toast"),
  backdrop: document.getElementById("backdrop"),
  winStats: document.getElementById("winStats"),
};

// Data loading
function loadPuzzleData() {
  return fetch("puzzle-data.json")
    .then((res) => res.json())
    .then((data) => {
      PUZZLE_DATA = data.days;
    });
}

// UTC-safe daily key using 06:00 UTC cutoff
function getPuzzleDateKeyUTC() {
  const now = new Date();
  if (now.getUTCHours() >= 6) return now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return yesterday.toISOString().slice(0, 10);
}

function selectDailyImage() {
  S.todayKey = getPuzzleDateKeyUTC();
  const entry = PUZZLE_DATA.find((d) => d.date === S.todayKey);
  S.imgURL = entry ? entry.img : CONFIG.DEFAULT_IMAGE_URL;
  S.difficulty = entry ? entry.difficulty : CONFIG.DEFAULT_DIFFICULTY;
  S.grid = CONFIG.GRID_SIZES[S.difficulty] || CONFIG.GRID_SIZES[CONFIG.DEFAULT_DIFFICULTY];

  if (el.chipDate) el.chipDate.textContent = `Daily — ${S.todayKey}`;
  if (el.dayKey) el.dayKey.textContent = S.todayKey;
  if (el.chipDiff) el.chipDiff.textContent = `Difficulty: ${S.difficulty} (${S.grid}×${S.grid})`;
  if (el.ref) el.ref.style.backgroundImage = `url("${S.imgURL}")`;
  if (el.overlay) el.overlay.style.backgroundImage = `url("${S.imgURL}")`;
}

// Utilities
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Build board and tray
function buildBoard() {
  el.board.innerHTML = "";
  el.tray.innerHTML = "";
  el.board.style.gridTemplateColumns = `repeat(${S.grid}, 1fr)`;
  el.board.style.gridTemplateRows = `repeat(${S.grid}, 1fr)`;

  const total = S.grid * S.grid;
  S.total = total;
  S.placed = 0;
  el.piecesLeft.textContent = total;

  for (let i = 0; i < total; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = String(i);
    cell.addEventListener("dragover", onDragOver);
    cell.addEventListener("drop", onDrop);
    el.board.appendChild(cell);
  }

  const indices = shuffle([...Array(total).keys()]);
  indices.forEach((idx) => {
    const piece = makePiece(idx);
    el.tray.appendChild(piece);
  });

  el.tray.addEventListener("dragover", onTrayDragOver, { passive: false });
  el.tray.addEventListener("drop", onTrayDrop, { passive: false });
  updateTrayState();
}

function makePiece(correctIndex) {
  const piece = document.createElement("div");
  piece.className = "piece";
  piece.draggable = true;
  piece.id = `piece-${correctIndex}`;
  piece.dataset.correct = String(correctIndex);

  const n = S.grid;
  const col = correctIndex % n;
  const row = Math.floor(correctIndex / n);
  const bgSize = `${n * 100}% ${n * 100}%`;
  const bgPos = `${(col / (n - 1)) * 100}% ${(row / (n - 1)) * 100}%`;
  piece.style.backgroundImage = `url("${S.imgURL}")`;
  piece.style.backgroundSize = bgSize;
  piece.style.backgroundPosition = bgPos;

  piece.addEventListener("dragstart", onDragStart);
  piece.addEventListener("dragend", onDragEnd);
  addTouchSupport(piece);
  return piece;
}

// Desktop drag & drop
let dragData = { id: null, fromTray: false, fromCell: null, fromCellWasCorrect: false };

function onDragStart(e) {
  if (!S.started) startTimer();
  dragData.id = this.id;
  const parent = this.parentElement;
  dragData.fromTray = parent === el.tray;
  dragData.fromCell = parent.classList.contains("cell") ? parent : null;
  dragData.fromCellWasCorrect = false;
  if (dragData.fromCell) {
    const shouldIndex = parseInt(dragData.fromCell.dataset.index, 10);
    const correctIndex = parseInt(this.dataset.correct, 10);
    dragData.fromCellWasCorrect = shouldIndex === correctIndex;
  }
  e.dataTransfer.setData("text/plain", this.id);
  this.classList.add("dragging");
}
function onDragEnd() {
  this.classList.remove("dragging");
  dragData = { id: null, fromTray: false, fromCell: null, fromCellWasCorrect: false };
}
function onDragOver(e) { e.preventDefault(); }
function onDrop(e) {
  e.preventDefault();
  const id = e.dataTransfer.getData("text/plain");
  const piece = document.getElementById(id);
  if (!piece) return;
  placePieceIntoCell(piece, this);
}
function onTrayDragOver(e) { e.preventDefault(); }
function onTrayDrop(e) {
  e.preventDefault();
  const id = e.dataTransfer.getData("text/plain");
  const piece = document.getElementById(id);
  if (!piece) return;
  const prevCell = dragData.fromCell;
  const wasCorrect = dragData.fromCellWasCorrect;
  el.tray.appendChild(piece);
  if (prevCell && wasCorrect) flashCell(prevCell);
  recomputeProgress();
  updateTrayState();
}

// Touch support
function addTouchSupport(piece) {
  let moved = false;
  let fromCell = null;
  let dragGhost = null;

  piece.addEventListener(
    "touchstart",
    function (e) {
      if (!S.started) startTimer();
      moved = false;
      fromCell = piece.parentElement.classList.contains("cell") ? piece.parentElement : null;
      piece._fromCellWasCorrect = false;
      if (fromCell) {
        const shouldIndex = parseInt(fromCell.dataset.index, 10);
        const correctIndex = parseInt(piece.dataset.correct, 10);
        piece._fromCellWasCorrect = shouldIndex === correctIndex;
      }

      const rect = piece.getBoundingClientRect();
      dragGhost = piece.cloneNode(true);
      dragGhost.classList.add("dragging");
      Object.assign(dragGhost.style, {
        position: "fixed",
        left: rect.left + "px",
        top: rect.top + "px",
        zIndex: 1000,
        width: rect.width + "px",
        height: rect.height + "px",
        pointerEvents: "none",
      });
      document.body.appendChild(dragGhost);
    },
    { passive: false }
  );

  piece.addEventListener(
    "touchmove",
    function (e) {
      moved = true;
      e.preventDefault();
      const touch = e.touches[0];
      if (dragGhost) {
        dragGhost.style.left = touch.clientX - dragGhost.offsetWidth / 2 + "px";
        dragGhost.style.top = touch.clientY - dragGhost.offsetHeight / 2 + "px";
      }
    },
    { passive: false }
  );

  piece.addEventListener(
    "touchend",
    function (e) {
      if (dragGhost) {
        document.body.removeChild(dragGhost);
        dragGhost = null;
      }
      if (!moved) return;
      const touch = e.changedTouches[0];
      let dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
      if (dropTarget) dropTarget = dropTarget.closest(".cell, #tray");

      if (fromCell && dropTarget && dropTarget.classList.contains("cell")) {
        toast("Return this piece to the tray before placing it in another cell.");
        return;
      }
      if (dropTarget && dropTarget.classList.contains("cell")) {
        placePieceIntoCell(piece, dropTarget);
      } else {
        const prevCell = fromCell;
        const wasCorrect = piece._fromCellWasCorrect;
        el.tray.appendChild(piece);
        if (prevCell && wasCorrect) flashCell(prevCell);
        recomputeProgress();
        updateTrayState();
      }
    },
    { passive: false }
  );
}

// Placement helpers
function flashCell(cell) {
  if (!cell) return;
  if (cell._flashTimer) {
    clearTimeout(cell._flashTimer);
    cell._flashTimer = null;
  }
  cell.classList.add("flash-correct");
  cell._flashTimer = setTimeout(() => {
    cell.classList.remove("flash-correct");
    cell._flashTimer = null;
  }, CORRECT_FLASH_MS);
}

function placePieceIntoCell(piece, targetCell) {
  if (targetCell._flashTimer) {
    clearTimeout(targetCell._flashTimer);
    targetCell._flashTimer = null;
  }
  targetCell.classList.remove("flash-correct");

  if (dragData.fromCell && dragData.fromCell !== targetCell) {
    toast("Return this piece to the tray before placing it in another cell.");
    return false;
  }
  const occupant = targetCell.querySelector(".piece");
  if (occupant) {
    toast("Cell already filled, insert in another cell.");
    return false;
  }
  targetCell.appendChild(piece);
  updateTrayState();
  maybeWin();
  return true;
}

// Progress / win / score
function recomputeProgress() {
  let correct = 0;
  const cells = Array.from(el.board.querySelectorAll(".cell"));
  for (const cell of cells) {
    const p = cell.querySelector(".piece");
    if (!p) {
      cell.classList.remove("correct");
      continue;
    }
    const shouldIndex = parseInt(cell.dataset.index, 10);
    const correctIndex = parseInt(p.dataset.correct, 10);
    cell.classList.remove("flash-correct");
    if (cell._flashTimer) {
      clearTimeout(cell._flashTimer);
      cell._flashTimer = null;
    }
    if (shouldIndex === correctIndex) {
      cell.classList.add("correct");
      correct++;
    } else {
      cell.classList.remove("correct");
    }
  }
  S.placed = correct;
  el.piecesLeft.textContent = S.total - S.placed;
  return correct === S.total;
}

function maybeWin() { if (recomputeProgress()) win(); }

function fmt(s) {
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${String(m).padStart(2, "0")}:${ss}`;
}

function score() {
  // Preserve original arithmetic (even if simplified) to avoid changing logic
  const raw =
    1000 -
    S.seconds -
    (((CONFIG.HINT_COST * S.hints) / CONFIG.HINT_COST) * CONFIG.HINT_COST) / CONFIG.HINT_COST -
    CONFIG.RESET_COST * S.resets;
  return Math.max(Math.round(raw), 0, 1000);
}

function toast(msg, ms = 1600) {
  const statsMsg = document.getElementById("stats-msg");
  if (!el.toast) return;
  el.toast.textContent = msg;
  if (statsMsg) statsMsg.classList.add("hidden");
  el.toast.classList.add("show");
  if (el.toast._hideTimer) clearTimeout(el.toast._hideTimer);
  el.toast._hideTimer = setTimeout(() => {
    el.toast.classList.remove("show");
    if (statsMsg) statsMsg.classList.remove("hidden");
  }, ms);
}

function startTimer() {
  S.started = true;
  S.startTime = Date.now();
  S.timerHandle = setInterval(() => {
    S.seconds = Math.floor((Date.now() - S.startTime) / 1000);
    el.time.textContent = fmt(S.seconds);
    el.score.textContent = String(score());
  }, 250);
}
function stopTimer() { clearInterval(S.timerHandle); S.timerHandle = null; }

function hint() {
  S.hints++;
  el.hints.textContent = S.hints;
  el.overlay.classList.add("show");
  const old = parseInt(el.score.textContent, 10) || 1000;
  el.score.textContent = String(Math.max(old - CONFIG.HINT_COST, 0, 1000));
  setTimeout(() => el.overlay.classList.remove("show"), CONFIG.HINT_SECONDS * 1000);
}

function reset() {
  S.resets++;
  el.resets.textContent = S.resets;
  stopTimer();
  S.started = false;
  S.seconds = 0;
  el.time.textContent = "00:00";
  el.score.textContent = String(
    Math.max((parseInt(el.score.textContent, 10) || 1000) - CONFIG.RESET_COST, 0, 1000)
  );
  buildBoard();
  toast("Puzzle reset.");
}

function win() {
  stopTimer();
  const bd = document.getElementById("backdrop");
  bd.style.display = "flex";
  bd.setAttribute("aria-hidden", "false");
}

// Share (exact format, cleaned)
function shareExact() {
  const entry = PUZZLE_DATA && S && S.todayKey ? PUZZLE_DATA.find((d) => d.date === S.todayKey) : null;
  const username = entry && entry.username ? entry.username : "billions_ntwk";
  const shareURL = `${window.location.origin}/share/${S.todayKey}.html`;

  const lines = [
    "I just solved today's Billions Community Daily Puzzle! 🎉",
    `featuring @${username}`,
    "",
    "Solve it here: " + shareURL,
    "",
    "#Billions #BillionsCommunityGames",
  ];
  const text = lines.join("\n");
  const enc = encodeURIComponent(text);

  const webIntent = `https://x.com/intent/tweet?text=${enc}`;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    const appCandidates = [`twitter://post?message=${enc}`, `x://post?message=${enc}`];
    let i = 0;
    const tryOpen = () => {
      if (i >= appCandidates.length) {
        window.location.href = webIntent;
        return;
      }
      const url = appCandidates[i++];
      const start = Date.now();
      window.location.href = url;
      setTimeout(() => {
        if (document.visibilityState === "visible" && Date.now() - start < 1500) tryOpen();
      }, 700);
    };
    tryOpen();
  } else {
    const w = 650, h = 600;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 3;
    const win = window.open(webIntent, "_blank", `popup=yes,width=${w},height=${h},left=${left},top=${top}`);
    if (!win) window.location.href = webIntent;
  }
}

// Events / boot
document.getElementById("hintBtn").addEventListener("click", hint);
document.getElementById("resetBtn").addEventListener("click", reset);
document.getElementById("shareBtn").addEventListener("click", shareExact);
document.getElementById("closeWin").addEventListener("click", () => {
  const bd = document.getElementById("backdrop");
  bd.style.display = "none";
  bd.setAttribute("aria-hidden", "true");
});

(function boot() {
  loadPuzzleData().then(() => {
    selectDailyImage();
    buildBoard();
  });
})();

// Help FAB
(function helpInit() {
  const fab = document.getElementById("helpFab");
  const sheet = document.getElementById("helpSheet");
  const closeBtn = document.getElementById("helpClose");
  if (!fab || !sheet || !closeBtn) return;
  const open = () => { sheet.classList.add("show"); sheet.setAttribute("aria-hidden", "false"); };
  const close = () => { sheet.classList.remove("show"); sheet.setAttribute("aria-hidden", "true"); };
  fab.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  sheet.addEventListener("click", (e) => { if (!e.target.closest(".help-sheet__panel")) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && sheet.classList.contains("show")) close(); });
})();

function updateTrayState() {
  const hasPieces = el.tray.querySelectorAll(".piece").length > 0;
  el.tray.classList.toggle("empty", !hasPieces);
}

