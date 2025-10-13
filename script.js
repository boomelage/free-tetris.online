const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreSpan = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

const TETRIS_CANVAS = document.getElementById('tetrisCanvas');

// Game variables

const NEXT_PIECE_CANVAS = document.getElementById('nextPieceCanvas');
const CURRENT_PIECE_PREVIEW_CANVAS = document.getElementById('currentPiecePreviewCanvas');
const SCORE_DISPLAY = document.getElementById('score');
const LEVEL_DISPLAY = document.getElementById('level');
const START_BUTTON = document.getElementById('startButton');
const CONTROLS_DISPLAY = document.getElementById('controls-display');

const CTX = TETRIS_CANVAS.getContext('2d');
const NEXT_CTX = NEXT_PIECE_CANVAS.getContext('2d');
const CURRENT_PREVIEW_CTX = CURRENT_PIECE_PREVIEW_CANVAS.getContext('2d');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30; // Pixels
const MOVE_DELAY = 500; // Milliseconds between automatic downward movement

TETRIS_CANVAS.width = COLS * BLOCK_SIZE;
TETRIS_CANVAS.height = ROWS * BLOCK_SIZE;

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

let board = [];
let level = 1;
let score = 0;
let linesClearedCount = 0;
let currentMoveDelay = MOVE_DELAY;
let fallingTetrominoQueue = [];
let currentTetrominoShapeName;
let currentTetrominoRotationIndex;
let currentTetrominoShape;
let tetrominoPos = [0, 0];
let hasChanged = false; // For 'Z' key swap
let gameOver = false;
let paused = false;
let lastMoveTime = 0;
let animationFrameId;
let upKeyPressed = false; // For rotation debounce

function initBoard() {
    board = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));
}

function generateTetrominoQueue() {
    const allTetrominoTypes = Object.keys(TETROMINOES);
    // Fill with 14 random pieces initially
    fallingTetrominoQueue = Array(14).fill(0).map(() => allTetrominoTypes[Math.floor(Math.random() * allTetrominoTypes.length)]);
}

function spawnNewTetromino() {
    // Remove the first piece from the queue
    fallingTetrominoQueue.shift();

    // Replenish the queue if it's getting low (e.g., less than 7 pieces left)
    if (fallingTetrominoQueue.length <= 7) {
        const allTetrominoTypes = Object.keys(TETROMINOES);
        const newTetrominoes = Array(7).fill(0).map(() => allTetrominoTypes[Math.floor(Math.random() * allTetrominoTypes.length)]);
        fallingTetrominoQueue.push(...newTetrominoes);
    }

    currentTetrominoShapeName = fallingTetrominoQueue[0];
    currentTetrominoRotationIndex = 0;
    currentTetrominoShape = TETROMINOES[currentTetrominoShapeName].shapes[currentTetrominoRotationIndex];

    // Initial position
    if (currentTetrominoShapeName === 'I') {
        tetrominoPos = [Math.floor(COLS / 2) - Math.floor(currentTetrominoShape[0].length / 2) - 1, -2];
    } else {
        tetrominoPos = [Math.floor(COLS / 2) - Math.floor(currentTetrominoShape[0].length / 2), -2];
    }

    hasChanged = false; // Reset change tracker for the new block

    // Check for immediate game over (spawn collision)
    if (checkCollision(currentTetrominoShape, tetrominoPos)) {
        gameOver = true;
        cancelAnimationFrame(animationFrameId);
        showGameOverScreen(score);
    }
}

function drawBlock(x, y, color, context = CTX, stroke = false) {
    context.fillStyle = color;
    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    context.strokeStyle = 'black';
    if (stroke) {
        context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    } else {
        context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
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

function drawTetromino(tetromino, pos, color, context = CTX) {
    for (let r = 0; r < tetromino.length; r++) {
        for (let c = 0; c < tetromino[r].length; c++) {
            if (tetromino[r][c] === 1) {
                drawBlock(pos[0] + c, pos[1] + r, color, context);
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
            return true;
        }
    }
    return false;
}

function moveTetromino(dx, dy) {
    const newPos = [tetrominoPos[0] + dx, tetrominoPos[1] + dy];
    if (!checkCollision(currentTetrominoShape, newPos)) {
        tetrominoPos = newPos;
        return true;
    }
    return false;
}

function dropTetrominoHard() {
    let initialY = tetrominoPos[1];
    while (moveTetromino(0, 1)) {
        // Keep moving down
    }
    const rowsDropped = tetrominoPos[1] - initialY;
    score += rowsDropped * 2; // Score for hard drop
    SCORE_DISPLAY.textContent = score;
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
    for (let r = 0; r < tetromino.length; r++) {
        for (let c = 0; c < tetromino[r].length; c++) {
            if (tetromino[r][c] === 1) {
                // Draw with a transparent or outlined style
                CTX.strokeStyle = 'lightgray'; // Changed to lightgray
                CTX.lineWidth = 2;
                CTX.strokeRect((pos[0] + c) * BLOCK_SIZE, (pos[1] + r) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                CTX.lineWidth = 1; // Reset to default
            }
        }
    }
}

function lockPiece() {
    for (let r = 0; r < currentTetrominoShape.length; r++) {
        for (let c = 0; c < currentTetrominoShape[r].length; c++) {
            if (currentTetrominoShape[r][c] === 1) {
                let boardX = tetrominoPos[0] + c;
                let boardY = tetrominoPos[1] + r;
                if (boardY < 0) {
                    // This should ideally be caught by spawn collision, but as a safeguard
                    gameOver = true;
                    cancelAnimationFrame(animationFrameId);
                    showGameOverScreen(score);
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
        // Scoring based on Python version
        if (linesClearedThisTurn === 1) score += 40 * level;
        else if (linesClearedThisTurn === 2) score += 100 * level;
        else if (linesClearedThisTurn === 3) score += 300 * level;
        else if (linesClearedThisTurn === 4) score += 1200 * level;

        linesClearedCount += linesClearedThisTurn;
        level = 1 + Math.floor(linesClearedCount / 10);
        currentMoveDelay = Math.max(100, MOVE_DELAY - (level - 1) * 50);

        SCORE_DISPLAY.textContent = score;
        LEVEL_DISPLAY.textContent = level;
    }
}

function drawTetrominoPreview(tetromino, context, color) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    // Calculate center offset for preview
    const pieceWidth = tetromino[0].length;
    const pieceHeight = tetromino.length;
    const startX = Math.floor((context.canvas.width / BLOCK_SIZE - pieceWidth) / 2);
    const startY = Math.floor((context.canvas.height / BLOCK_SIZE - pieceHeight) / 2);

    for (let r = 0; r < pieceHeight; r++) {
        for (let c = 0; c < pieceWidth; c++) {
            if (tetromino[r][c] === 1) {
                drawBlock(startX + c, startY + r, color, context);
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
    ];
    CONTROLS_DISPLAY.innerHTML = controls.map(c => `<p>${c}</p>`).join('');
}

function gameLoop(currentTime) {
    if (gameOver || paused) {
        return;
    }

    if (currentTime - lastMoveTime > currentMoveDelay) {
        if (!moveTetromino(0, 1)) {
            lockPiece();
        }
        lastMoveTime = currentTime;
    }

    // Clear and redraw everything
    CTX.clearRect(0, 0, TETRIS_CANVAS.width, TETRIS_CANVAS.height);
    drawBoard();
    const ghostPos = getGhostPos();
    drawGhostTetromino(currentTetrominoShape, ghostPos, TETROMINOES[currentTetrominoShapeName].color);
    drawTetromino(currentTetrominoShape, tetrominoPos, TETROMINOES[currentTetrominoShapeName].color);

    // Draw previews
    const nextPieceShapeName = fallingTetrominoQueue[1];
    const nextPieceShape = TETROMINOES[nextPieceShapeName].shapes[0]; // Always show initial rotation for next
    drawTetrominoPreview(nextPieceShape, NEXT_CTX, TETROMINOES[nextPieceShapeName].color);

    drawTetrominoPreview(currentTetrominoShape, CURRENT_PREVIEW_CTX, TETROMINOES[currentTetrominoShapeName].color);

    if (!gameOver && !paused) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

function resetGame() {
    gameOverScreen.classList.add('hidden');
    cancelAnimationFrame(animationFrameId);
    initBoard();
    score = 0;
    level = 1;
    linesClearedCount = 0;
    currentMoveDelay = MOVE_DELAY;
    gameOver = false;
    paused = false;
    hasChanged = false;
    upKeyPressed = false;
    SCORE_DISPLAY.textContent = score;
    LEVEL_DISPLAY.textContent = level;
    generateTetrominoQueue();
    spawnNewTetromino();
    lastMoveTime = performance.now(); // Reset lastMoveTime for accurate timing
    animationFrameId = requestAnimationFrame(gameLoop);
}

function showGameOverScreen(finalScore) {
    gameOverScreen.classList.remove('hidden');
    finalScoreSpan.textContent = finalScore;
    document.getElementById('game-container').classList.add('hidden');
}

function restartGame() {
    gameOverScreen.classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    resetGame();
}

// Event Listeners
document.addEventListener('keydown', e => {
    if (gameOver) return;

    if (e.key === 'p' || e.key === 'P') {
        paused = !paused;
        if (!paused) {
            lastMoveTime = performance.now(); // Reset timer on unpause
            requestAnimationFrame(gameLoop);
        }
        return;
    }

    if (paused) return; // Ignore other inputs if paused

    switch (e.key) {
        case 'ArrowLeft':
            moveTetromino(-1, 0);
            break;
        case 'ArrowRight':
            moveTetromino(1, 0);
            break;
        case 'ArrowDown':
            if (moveTetromino(0, 1)) {
                score += 1; // Soft drop score
                SCORE_DISPLAY.textContent = score;
            } else {
                lockPiece();
            }
            lastMoveTime = performance.now(); // Reset timer after manual drop
            break;
        case 'ArrowUp':
            if (!upKeyPressed) {
                tryRotate();
                upKeyPressed = true;
            }
            break;
        case ' ': // Spacebar for hard drop
            e.preventDefault(); // Prevent page scrolling
            dropTetrominoHard();
            break;
        case 'z': // Z key for swap
        case 'Z':
            if (!hasChanged) {
                // Swap current with next in queue
                const currentShape = currentTetrominoShapeName;
                const nextShapeInQueue = fallingTetrominoQueue[1];

                fallingTetrominoQueue[0] = nextShapeInQueue;
                fallingTetrominoQueue[1] = currentShape;

                // Re-spawn the new current piece
                currentTetrominoShapeName = fallingTetrominoQueue[0];
                currentTetrominoRotationIndex = 0;
                currentTetrominoShape = TETROMINOES[currentTetrominoShapeName].shapes[currentTetrominoRotationIndex];

                // Recalculate tetromino_pos after swap
                if (currentTetrominoShapeName === 'I') {
                    tetrominoPos = [Math.floor(COLS / 2) - Math.floor(currentTetrominoShape[0].length / 2) - 1, 0];
                } else {
                    tetrominoPos = [Math.floor(COLS / 2) - Math.floor(currentTetrominoShape[0].length / 2), 0];
                }
                hasChanged = true;
            }
            break;
    }
    // Redraw immediately after any key press to reflect changes
    CTX.clearRect(0, 0, TETRIS_CANVAS.width, TETRIS_CANVAS.height);
    drawBoard();
    const ghostPos = getGhostPos();
    drawGhostTetromino(currentTetrominoShape, ghostPos, TETROMINOES[currentTetrominoShapeName].color);
    drawTetromino(currentTetrominoShape, tetrominoPos, TETROMINOES[currentTetrominoShapeName].color);
});

document.addEventListener('keyup', e => {
    if (e.key === 'ArrowUp') {
        upKeyPressed = false;
    }
});

START_BUTTON.addEventListener('click', () => {
    resetGame();
});

restartButton.addEventListener('click', restartGame);

// Initial setup
drawControls();
// Display a simple start screen initially
CTX.fillStyle = 'black';
CTX.fillRect(0, 0, TETRIS_CANVAS.width, TETRIS_CANVAS.height);
CTX.fillStyle = 'green'; // Changed to green
CTX.font = '30px "Courier New", monospace'; // Changed font
CTX.textAlign = 'center';
CTX.fillText('Press Start', TETRIS_CANVAS.width / 2, TETRIS_CANVAS.height / 2);