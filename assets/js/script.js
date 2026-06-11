'use strict';

const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreSpan = document.getElementById('finalScore');
const continueButton = document.getElementById('restartButton');

const TETRIS_CANVAS = document.getElementById('tetrisCanvas');

// Game variables

const NEXT_PIECE_CANVAS = document.getElementById('nextPieceCanvas');
const STASHED_PIECE_CANVAS = document.getElementById('stashedPieceCanvas');
const SCORE_DISPLAY = document.getElementById('score');
const HIGH_SCORE_DISPLAY = document.getElementById('highScore');
const LEVEL_DISPLAY = document.getElementById('level');
const START_BUTTON = document.getElementById('startButton');
const CONTROLS_DISPLAY = document.getElementById('controls-display');

const CTX = TETRIS_CANVAS.getContext('2d');
const NEXT_CTX = NEXT_PIECE_CANVAS.getContext('2d');
const STASHED_CTX = STASHED_PIECE_CANVAS.getContext('2d');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // Pixels
const MOVE_DELAY = 1000; // Milliseconds between automatic downward movement

// Input feel / lock-delay tuning (milliseconds)
const DAS = 150;           // delay before horizontal auto-shift starts
const ARR = 40;            // interval between auto-shift steps
const SOFT_DROP_RATE = 50; // interval between soft-drop steps while ArrowDown held
const LOCK_DELAY = 500;    // time a grounded piece waits before locking
const MAX_LOCK_RESETS = 15;// how many move/rotate lock-delay resets are allowed

const HIGH_SCORE_KEY = 'tetrisHighScore';

TETRIS_CANVAS.width = COLS * BLOCK_SIZE;
TETRIS_CANVAS.height = ROWS * BLOCK_SIZE;

NEXT_PIECE_CANVAS.width = 4 * BLOCK_SIZE;
NEXT_PIECE_CANVAS.height = 4 * BLOCK_SIZE;
STASHED_PIECE_CANVAS.width = 4 * BLOCK_SIZE;
STASHED_PIECE_CANVAS.height = 4 * BLOCK_SIZE;

// Tetrominoes with all rotation states (matching Python structure)
const TETROMINOES = {
    'I': {
        shapes: [
            [[1, 1, 1, 1]],
            [[1], [1], [1], [1]]
        ],
        color: 'cyan'
    },
    'T': {
        shapes: [
            [[0, 1, 0], [1, 1, 1]],
            [[1, 0], [1, 1], [1, 0]],
            [[1, 1, 1], [0, 1, 0]],
            [[0, 1], [1, 1], [0, 1]]
        ],
        color: 'purple'
    },
    'L': {
        shapes: [
            [[1, 0, 0], [1, 1, 1]],
            [[1, 1], [1, 0], [1, 0]],
            [[1, 1, 1], [0, 0, 1]],
            [[0, 1], [0, 1], [1, 1]]
        ],
        color: 'orange'
    },
    'J': {
        shapes: [
            [[0, 0, 1], [1, 1, 1]],
            [[1, 0], [1, 0], [1, 1]],
            [[1, 1, 1], [1, 0, 0]],
            [[1, 1], [0, 1], [0, 1]]
        ],
        color: 'blue'
    },
    'S': {
        shapes: [
            [[0, 1, 1], [1, 1, 0]],
            [[1, 0], [1, 1], [0, 1]]
        ],
        color: 'green'
    },
    'Z': {
        shapes: [
            [[1, 1, 0], [0, 1, 1]],
            [[0, 1], [1, 1], [1, 0]]
        ],
        color: 'red'
    },
    'O': {
        shapes: [
            [[1, 1], [1, 1]]
        ],
        color: 'yellow'
    }
};

// SRS Kick Data for 'I' tetromino
const SRS_KICK_DATA_I = {
    '0->1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], // 0 -> R
    '1->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], // R -> 0
    '1->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], // R -> 2
    '2->1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], // 2 -> R
    '2->3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]], // 2 -> L
    '3->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]], // L -> 2
    '3->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]], // L -> 0
    '0->3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]], // 0 -> L
};

// SRS Kick Data for other tetrominoes (J, L, S, T, Z)
const SRS_KICK_DATA_OTHER = {
    '0->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], // 0 -> R
    '1->0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], // R -> 0
    '1->2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]], // R -> 2
    '2->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]], // 2 -> R
    '2->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], // 2 -> L
    '3->2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], // L -> 2
    '3->0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], // L -> 0
    '0->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]], // 0 -> L
};

const LINE_SCORES = { 1: 40, 2: 100, 3: 300, 4: 1200 };

let board = [];
let level = 1;
let score = 0;
let highScore = loadHighScore();
let linesClearedCount = 0;
let currentMoveDelay = MOVE_DELAY;
let fallingTetrominoQueue = []; // upcoming pieces only (current piece is held separately)
let currentTetrominoShapeName;
let currentTetrominoRotationIndex;
let currentTetrominoShape;
let tetrominoPos = [0, 0];
let holdUsed = false; // whether the hold/swap (Z) has been used for the current piece
let stashedTetromino = null;
let gameOver = false;
let running = false; // true only while a game is actually in progress
let showGhost = true; // toggles ghost-piece visibility
let paused = false;
let lastMoveTime = 0;
let animationFrameId;

// Input state
let upKeyPressed = false;   // rotation debounce
let leftHeld = false;
let rightHeld = false;
let softDropping = false;
let dasDirection = 0;       // -1 left, 0 none, 1 right
let dasStart = 0;
let arrLast = 0;
let softLast = 0;

// Lock-delay state
let lockTimer = null;       // timestamp when the piece became grounded, or null
let lockResets = 0;

function loadHighScore() {
    try {
        return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
    } catch (e) {
        return 0;
    }
}

function saveHighScore(value) {
    try {
        localStorage.setItem(HIGH_SCORE_KEY, String(value));
    } catch (e) {
        /* storage unavailable (private mode, etc.) — ignore */
    }
}

function addScore(points) {
    score += points;
    SCORE_DISPLAY.textContent = score;
    if (score > highScore) {
        highScore = score;
        HIGH_SCORE_DISPLAY.textContent = highScore;
        saveHighScore(highScore);
    }
}

function initBoard() {
    board = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
}

// Fisher-Yates shuffle (in place)
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 7-bag randomizer: each bag contains exactly one of every tetromino.
function refillQueue() {
    while (fallingTetrominoQueue.length <= 7) {
        fallingTetrominoQueue.push(...shuffle(Object.keys(TETROMINOES)));
    }
}

function generateTetrominoQueue() {
    fallingTetrominoQueue = [];
    refillQueue();
}

// Where a freshly spawned/swapped piece should start.
function spawnPosFor(name, shape) {
    const x = Math.floor(COLS / 2) - Math.floor(shape[0].length / 2) - (name === 'I' ? 1 : 0);
    return [x, -2];
}

function setCurrentPiece(name) {
    currentTetrominoShapeName = name;
    currentTetrominoRotationIndex = 0;
    currentTetrominoShape = TETROMINOES[name].shapes[0];
    tetrominoPos = spawnPosFor(name, currentTetrominoShape);
    lockTimer = null;
    lockResets = 0;
}

function spawnNewTetromino() {
    setCurrentPiece(fallingTetrominoQueue.shift());
    refillQueue();
    holdUsed = false; // hold becomes available again for the new piece

    // Check for immediate game over (spawn collision)
    if (checkCollision(currentTetrominoShape, tetrominoPos)) {
        endGame();
    }
}

function drawBlock(x, y, color, context = CTX) {
    context.fillStyle = color;
    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    context.strokeStyle = 'black';
    context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function drawBoard() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] !== 0) {
                drawBlock(c, r, board[r][c]);
            } else {
                // Draw empty cells with a lighter border for grid effect
                CTX.strokeStyle = '#505050';
                CTX.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }
}

function drawTetromino(tetromino, pos, color) {
    for (let r = 0; r < tetromino.length; r++) {
        for (let c = 0; c < tetromino[r].length; c++) {
            if (tetromino[r][c] === 1) {
                drawBlock(pos[0] + c, pos[1] + r, color, CTX);
            }
        }
    }
}

function checkCollision(tetromino, pos) {
    for (let r = 0; r < tetromino.length; r++) {
        for (let c = 0; c < tetromino[r].length; c++) {
            if (tetromino[r][c] === 1) {
                let boardX = pos[0] + c;
                let boardY = pos[1] + r;

                // Check boundaries
                if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                    return true;
                }
                // Check collision with existing blocks (only if within board bounds)
                if (boardY >= 0 && board[boardY][boardX] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Reset the lock-delay countdown when the player moves/rotates a grounded piece.
function bumpLockDelay() {
    if (lockTimer !== null && lockResets < MAX_LOCK_RESETS) {
        lockTimer = null; // grounded check next frame will restart the countdown
        lockResets++;
    }
}

function getRotatedTetrominoData(shapeName, currentRotationIndex) {
    const shapes = TETROMINOES[shapeName].shapes;
    const nextRotationIndex = (currentRotationIndex + 1) % shapes.length;
    return { shape: shapes[nextRotationIndex], index: nextRotationIndex };
}

function tryRotate() {
    const { shape: nextShape, index: nextRotationIndex } = getRotatedTetrominoData(currentTetrominoShapeName, currentTetrominoRotationIndex);

    const kickData = currentTetrominoShapeName === 'I' ? SRS_KICK_DATA_I : SRS_KICK_DATA_OTHER;
    const kickKey = `${currentTetrominoRotationIndex}->${nextRotationIndex}`;
    const kickOffsets = kickData[kickKey] || [[0, 0]];

    for (const [dx, dy] of kickOffsets) {
        const newPos = [tetrominoPos[0] + dx, tetrominoPos[1] + dy];
        if (!checkCollision(nextShape, newPos)) {
            currentTetrominoShape = nextShape;
            currentTetrominoRotationIndex = nextRotationIndex;
            tetrominoPos = newPos;
            bumpLockDelay();
            return true;
        }
    }
    return false;
}

function moveTetromino(dx, dy) {
    const newPos = [tetrominoPos[0] + dx, tetrominoPos[1] + dy];
    if (!checkCollision(currentTetrominoShape, newPos)) {
        tetrominoPos = newPos;
        if (dy > 0) {
            // Falling resets lock-delay state entirely.
            lockTimer = null;
            lockResets = 0;
        } else {
            bumpLockDelay();
        }
        return true;
    }
    return false;
}

function dropTetrominoHard() {
    const initialY = tetrominoPos[1];
    while (moveTetromino(0, 1)) {
        // Keep moving down
    }
    addScore((tetrominoPos[1] - initialY) * 2); // Score for hard drop
    lockPiece();
}

function getGhostPos() {
    let ghostY = tetrominoPos[1];
    while (!checkCollision(currentTetrominoShape, [tetrominoPos[0], ghostY + 1])) {
        ghostY++;
    }
    return [tetrominoPos[0], ghostY];
}

function drawGhostTetromino(tetromino, pos) {
    CTX.globalAlpha = 0.3; // Set translucency
    for (let r = 0; r < tetromino.length; r++) {
        for (let c = 0; c < tetromino[r].length; c++) {
            if (tetromino[r][c] === 1) {
                drawBlock(pos[0] + c, pos[1] + r, 'lightgray', CTX);
            }
        }
    }
    CTX.globalAlpha = 1.0; // Reset alpha
}

function lockPiece() {
    for (let r = 0; r < currentTetrominoShape.length; r++) {
        for (let c = 0; c < currentTetrominoShape[r].length; c++) {
            if (currentTetrominoShape[r][c] === 1) {
                let boardX = tetrominoPos[0] + c;
                let boardY = tetrominoPos[1] + r;
                if (boardY < 0) {
                    // Piece locked above the visible board -> game over.
                    endGame();
                    return;
                }
                board[boardY][boardX] = TETROMINOES[currentTetrominoShapeName].color;
            }
        }
    }
    clearLines();
    spawnNewTetromino();
}

function clearLines() {
    let linesClearedThisTurn = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(cell => cell !== 0)) {
            // Line is full, remove it and add a new empty line at the top
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(0));
            linesClearedThisTurn++;
            r++; // Recheck the same row index as rows shifted down
        }
    }

    if (linesClearedThisTurn > 0) {
        addScore((LINE_SCORES[linesClearedThisTurn] || 0) * level);
        linesClearedCount += linesClearedThisTurn;
        level = 1 + Math.floor(linesClearedCount / 10);
        currentMoveDelay = Math.max(100, MOVE_DELAY - (level - 1) * 50);
        LEVEL_DISPLAY.textContent = level;
    }
}

// Hold / swap (Z). Swaps the current piece with the stash, once per piece.
function holdPiece() {
    if (holdUsed) return;
    if (stashedTetromino === null) {
        stashedTetromino = currentTetrominoShapeName;
        setCurrentPiece(fallingTetrominoQueue.shift());
        refillQueue();
    } else {
        const previous = currentTetrominoShapeName;
        setCurrentPiece(stashedTetromino);
        stashedTetromino = previous;
    }
    holdUsed = true;
}

function drawTetrominoPreview(tetromino, context, color) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    const pieceWidthBlocks = tetromino[0].length;
    const pieceHeightBlocks = tetromino.length;

    // Calculate total pixel dimensions of the tetromino
    const pieceWidthPixels = pieceWidthBlocks * BLOCK_SIZE;
    const pieceHeightPixels = pieceHeightBlocks * BLOCK_SIZE;

    // Calculate pixel offset to center the tetromino within the canvas
    const offsetX = (context.canvas.width - pieceWidthPixels) / 2;
    const offsetY = (context.canvas.height - pieceHeightPixels) / 2;

    for (let r = 0; r < pieceHeightBlocks; r++) {
        for (let c = 0; c < pieceWidthBlocks; c++) {
            if (tetromino[r][c] === 1) {
                // Draw block at its position relative to the tetromino's top-left,
                // plus the overall pixel offset for centering.
                drawBlock(offsetX / BLOCK_SIZE + c, offsetY / BLOCK_SIZE + r, color, context);
            }
        }
    }
}

function drawControls() {
    const controls = [
        "←/↓/→: Move",
        "↑: Rotate",
        "Space: Hard Drop",
        "Z: Swap Piece",
        "P: Pause/Unpause",
        "G: Toggle Ghost"
    ];
    CONTROLS_DISPLAY.innerHTML = controls.map(c => `<p>${c}</p>`).join('');
}

function render() {
    CTX.clearRect(0, 0, TETRIS_CANVAS.width, TETRIS_CANVAS.height);
    drawBoard();
    if (showGhost) {
        drawGhostTetromino(currentTetrominoShape, getGhostPos());
    }
    drawTetromino(currentTetrominoShape, tetrominoPos, TETROMINOES[currentTetrominoShapeName].color);

    // Draw the next tetromino (front of the upcoming queue)
    const nextPieceShapeName = fallingTetrominoQueue[0];
    drawTetrominoPreview(TETROMINOES[nextPieceShapeName].shapes[0], NEXT_CTX, TETROMINOES[nextPieceShapeName].color);

    // Draw the stashed tetromino
    if (stashedTetromino !== null) {
        drawTetrominoPreview(TETROMINOES[stashedTetromino].shapes[0], STASHED_CTX, TETROMINOES[stashedTetromino].color);
    } else {
        STASHED_CTX.clearRect(0, 0, STASHED_PIECE_CANVAS.width, STASHED_PIECE_CANVAS.height);
    }
}

// Apply held-key auto-shift (DAS/ARR) and soft drop for the current frame.
function processAutoShift(now) {
    if (dasDirection !== 0 && now - dasStart >= DAS && now - arrLast >= ARR) {
        if (moveTetromino(dasDirection, 0)) {
            arrLast = now;
        }
    }
    if (softDropping && now - softLast >= SOFT_DROP_RATE) {
        if (moveTetromino(0, 1)) {
            addScore(1);
        }
        softLast = now;
    }
}

function gameLoop(currentTime) {
    if (gameOver || paused) {
        return;
    }

    processAutoShift(currentTime);

    if (currentTime - lastMoveTime > currentMoveDelay) {
        moveTetromino(0, 1); // gravity; locking is handled by the lock-delay below
        lastMoveTime = currentTime;
    }

    // Lock delay: a grounded piece waits LOCK_DELAY before it actually locks,
    // and that countdown is reset (up to MAX_LOCK_RESETS) by moves/rotations.
    const grounded = checkCollision(currentTetrominoShape, [tetrominoPos[0], tetrominoPos[1] + 1]);
    if (grounded) {
        if (lockTimer === null) {
            lockTimer = currentTime;
        } else if (currentTime - lockTimer >= LOCK_DELAY) {
            lockPiece();
        }
    } else {
        lockTimer = null;
    }

    render();

    if (!gameOver && !paused) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function clearInputState() {
    upKeyPressed = false;
    leftHeld = false;
    rightHeld = false;
    softDropping = false;
    dasDirection = 0;
}

function resetGame() {
    gameOverScreen.classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    cancelAnimationFrame(animationFrameId);
    initBoard();
    score = 0;
    level = 1;
    linesClearedCount = 0;
    currentMoveDelay = MOVE_DELAY;
    gameOver = false;
    paused = false;
    holdUsed = false;
    stashedTetromino = null; // Clear stashed tetromino on game reset
    lockTimer = null;
    lockResets = 0;
    clearInputState();
    SCORE_DISPLAY.textContent = score;
    HIGH_SCORE_DISPLAY.textContent = highScore;
    LEVEL_DISPLAY.textContent = level;
    generateTetrominoQueue();
    spawnNewTetromino();
    lastMoveTime = performance.now(); // Reset lastMoveTime for accurate timing
    running = true;
    animationFrameId = requestAnimationFrame(gameLoop);
    START_BUTTON.style.display = 'none'; // Hide the start button when game begins
}

function endGame() {
    gameOver = true;
    running = false;
    cancelAnimationFrame(animationFrameId);
    showGameOverScreen(score);
}

function showGameOverScreen(finalScore) {
    gameOverScreen.classList.remove('hidden');
    finalScoreSpan.textContent = finalScore;
    document.getElementById('game-container').classList.add('hidden');
}

function restartGame() {
    running = false;
    gameOverScreen.classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    drawStartScreen();
}

function drawStartScreen() {
    CTX.clearRect(0, 0, TETRIS_CANVAS.width, TETRIS_CANVAS.height);
    CTX.fillStyle = 'black';
    CTX.fillRect(0, 0, TETRIS_CANVAS.width, TETRIS_CANVAS.height);
    CTX.fillStyle = 'green';
    CTX.font = '30px "Courier New", monospace';
    CTX.textAlign = 'center';
    CTX.fillText('Press Start', TETRIS_CANVAS.width / 2, TETRIS_CANVAS.height / 2);
    NEXT_CTX.clearRect(0, 0, NEXT_PIECE_CANVAS.width, NEXT_PIECE_CANVAS.height);
    STASHED_CTX.clearRect(0, 0, STASHED_PIECE_CANVAS.width, STASHED_PIECE_CANVAS.height);
    START_BUTTON.style.display = 'block';
}

function togglePause() {
    paused = !paused;
    if (paused) {
        clearInputState(); // avoid keys "sticking" across the pause
    } else {
        lastMoveTime = performance.now(); // Reset timer on unpause
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// Event Listeners
document.addEventListener('keydown', e => {
    if (!running) return; // ignore input on the start / game-over screens

    if (e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
    }

    if (paused) return; // Ignore other inputs if paused

    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            if (!e.repeat) {
                moveTetromino(-1, 0);
                leftHeld = true;
                dasDirection = -1;
                dasStart = performance.now();
                arrLast = dasStart;
            }
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (!e.repeat) {
                moveTetromino(1, 0);
                rightHeld = true;
                dasDirection = 1;
                dasStart = performance.now();
                arrLast = dasStart;
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (!e.repeat) {
                if (moveTetromino(0, 1)) {
                    addScore(1); // Soft drop score
                }
                softDropping = true;
                softLast = performance.now();
                lastMoveTime = performance.now(); // Reset timer after manual drop
            }
            break;
        case 'ArrowUp':
            e.preventDefault();
            if (!upKeyPressed) {
                tryRotate();
                upKeyPressed = true;
            }
            break;
        case ' ': // Spacebar for hard drop
            e.preventDefault(); // Prevent page scrolling
            if (!e.repeat) {
                dropTetrominoHard();
            }
            break;
        case 'z': // Z key for swap
        case 'Z':
            if (!e.repeat) {
                holdPiece();
            }
            break;
        case 'g': // G key to toggle ghost piece
        case 'G':
            if (!e.repeat) {
                showGhost = !showGhost;
            }
            break;
    }

    // Redraw immediately after any key press to reflect changes
    render();
});

document.addEventListener('keyup', e => {
    switch (e.key) {
        case 'ArrowUp':
            upKeyPressed = false;
            break;
        case 'ArrowLeft':
            leftHeld = false;
            if (rightHeld) {
                dasDirection = 1;
                dasStart = performance.now();
                arrLast = dasStart;
            } else {
                dasDirection = 0;
            }
            break;
        case 'ArrowRight':
            rightHeld = false;
            if (leftHeld) {
                dasDirection = -1;
                dasStart = performance.now();
                arrLast = dasStart;
            } else {
                dasDirection = 0;
            }
            break;
        case 'ArrowDown':
            softDropping = false;
            break;
    }
});

START_BUTTON.addEventListener('click', () => {
    resetGame();
});

continueButton.addEventListener('click', () => {
    restartGame();
});

// Initial setup
HIGH_SCORE_DISPLAY.textContent = highScore;
drawControls();
drawStartScreen();
