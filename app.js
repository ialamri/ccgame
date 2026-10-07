/*
 * ==========================================
 * C ROBOT QUEST - GAME ENGINE
 * Supports Grid Navigation & Tic-Tac-Toe 2D Arrays
 * Strict C Syntax Enforcement & Smooth Execution
 * ==========================================
 */

// Level & Game State variables
let currentLevelIndex = 0;
let ROWS, COLS, GOAL, hints, currentMode;
let currentHintIndex = 0;

let gameState = {
    robot: { row: 0, col: 0, dir: 1 },
    walls: [],
    coins: [],
    score: 0,
    crashes: 0,
    steps: 0
};

// Tic-Tac-Toe (XO) Board State (3x3)
let xoBoard = [
    [' ', ' ', ' '],
    [' ', ' ', ' '],
    [' ', ' ', ' ']
];

let isRunning = false;
const STEP_DELAY = 350; // Delay in milliseconds

/*
 * ==========================================
 * C STDOUT BUFFER SYSTEM
 * ==========================================
 */
let stdoutBuffer = "";

function writeStdout(text) {
    stdoutBuffer += text;
    const lines = stdoutBuffer.split("\n");
    stdoutBuffer = lines.pop(); 

    for (const line of lines) {
        logC(line, "info");
    }
}

function flushStdout() {
    if (stdoutBuffer.length > 0) {
        logC(stdoutBuffer, "info");
        stdoutBuffer = "";
    }
}

/*
 * ==========================================
 * HELPER FUNCTIONS
 * ==========================================
 */

// Check if a 3x3 2D array is declared in the C code editor
function has3x3ArrayDeclaration() {
    const codeEl = document.getElementById("code");
    if (!codeEl) return false;
    const rawCode = codeEl.value;
    
    return /\b(int|char|float|double)\s+[a-zA-Z_]\w*\s*\[\s*3\s*\]\s*\[\s*3\s*\][ \t]*(=[^;\n]+)?[ \t]*;/.test(rawCode);
}

/*
 * ==========================================
 * LEVEL & GRID MANAGEMENT
 * ==========================================
 */
function populateLevelSelect() {
    const selectEl = document.getElementById("levelSelect");
    if (!selectEl || typeof LEVELS === "undefined") return;

    selectEl.innerHTML = "";
    LEVELS.forEach((level, index) => {
        const option = document.createElement("option");
        option.value = index;
        const formattedIndex = String(index + 1).padStart(2, '0');
        option.textContent = `${formattedIndex}: ${level.title || 'Untitled'}`;
        selectEl.appendChild(option);
    });
}

function loadLevel(levelIndex) {
    if (typeof LEVELS === "undefined" || !LEVELS.length) return;
    if (levelIndex < 0 || levelIndex >= LEVELS.length) return;

    currentLevelIndex = levelIndex;
    const levelData = LEVELS[currentLevelIndex];

    const selectEl = document.getElementById("levelSelect");
    if (selectEl) {
        selectEl.value = currentLevelIndex;
    }

    ROWS = levelData.rows;
    COLS = levelData.cols;
    GOAL = levelData.goal ? { ...levelData.goal } : {};
    hints = levelData.hints || [];
    currentMode = levelData.mode || "robot";
    currentHintIndex = 0;

    gameState = {
        robot: levelData.robot ? { ...levelData.robot } : { row: 0, col: 0, dir: 1 },
        walls: levelData.walls ? levelData.walls.map(w => ({ ...w })) : [],
        coins: levelData.coins ? levelData.coins.map(c => ({ ...c })) : [],
        score: 0,
        crashes: 0,
        steps: 0
    };

    // Load starter code into the editor if available
    const codeEl = document.getElementById("code");
    if (codeEl && levelData.starterCode) {
        codeEl.value = levelData.starterCode;
        updateLineNumbers();
    }

    resetXOBoard();
    createGrid();
    updateHintDisplay();
    clearConsoles();
    logGame(`Loaded ${levelData.title}`, "info");
}

function resetXOBoard() {
    xoBoard = [
        [' ', ' ', ' '],
        [' ', ' ', ' '],
        [' ', ' ', ' ']
    ];
}

function resetGame(showMessage = true) {
    isRunning = false;
    stdoutBuffer = "";
    loadLevel(currentLevelIndex);
    if (showMessage) {
        logGame("Game reset successfully.", "info");
    }
}

function createGrid() {
    const grid = document.getElementById("grid");
    if (!grid) return;

    grid.innerHTML = "";

    if (currentMode === "xo") {
        grid.classList.add("xo-grid");

        // Check whether the player declared a 3x3 2D array in C
        const isArrayDeclared = has3x3ArrayDeclaration();

        if (!isArrayDeclared) {
            grid.style.gridTemplateColumns = "1fr";
            grid.style.gridTemplateRows = "1fr";

            const lockedNotice = document.createElement("div");
            lockedNotice.className = "xo-locked-notice";
            lockedNotice.innerHTML = `
                <div class="lock-icon">🔒</div>
                <p>Board Locked!</p>
                <small>Declare a 3x3 array in C first</small>
            `;
            grid.appendChild(lockedNotice);
            updateStatsDisplay();
            return;
        }
    } else {
        grid.classList.remove("xo-grid");
    }

    grid.style.gridTemplateColumns = `repeat(${COLS}, 58px)`;
    grid.style.gridTemplateRows = `repeat(${ROWS}, 58px)`;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            cell.dataset.row = r;
            cell.dataset.col = c;

            if (currentMode === "xo") {
                cell.classList.add("xo-cell");
                const symbol = xoBoard[r][c];

                if (symbol !== ' ') {
                    cell.textContent = symbol;
                    cell.classList.add(symbol === 'X' ? 'player-x' : 'robot-o');
                } else {
                    // Show matrix coordinates inside empty cells
                    const coordHint = document.createElement("span");
                    coordHint.className = "cell-coord";
                    //coordHint.textContent = `[${r}][${c}]`;
                    cell.appendChild(coordHint);

                    // Allow clicking cell to insert play command into code editor
                    cell.addEventListener("click", () => {
                        insertPlayCommand(r, c);
                    });
                }
            } else {
                if (isWall(r, c)) {
                    cell.classList.add("wall");
                } else if (GOAL.row === r && GOAL.col === c) {
                    cell.classList.add("goal");
                    cell.innerHTML = "🏁";
                } else if (isCoin(r, c)) {
                    cell.classList.add("coin");
                    cell.innerHTML = "🪙";
                }

                if (r === gameState.robot.row && c === gameState.robot.col) {
                    const robotEl = document.createElement("div");
                    robotEl.className = "robot";
                    robotEl.textContent = "🤖";
                    robotEl.style.transform = `rotate(${gameState.robot.dir * 90}deg)`;
                    cell.appendChild(robotEl);
                }
            }

            grid.appendChild(cell);
        }
    }

    updateStatsDisplay();
}

// Insert play(r, c) command into the code editor on click
function insertPlayCommand(r, c) {
    const codeEl = document.getElementById("code");
    if (!codeEl || isRunning) return;

    const command = `play(${r}, ${c});`;
    
    if (!codeEl.value.includes(command)) {
        if (codeEl.value.includes("return 0;")) {
            codeEl.value = codeEl.value.replace("return 0;", `    ${command}\n    return 0;`);
        } else {
            codeEl.value += `\n${command}`;
        }
        if (typeof updateLineNumbers === "function") {
            updateLineNumbers();
        }
        logGame(`Added ${command} to editor`, "info");
    }
}

function isWall(r, c) {
    return gameState.walls.some(w => w.row === r && w.col === c);
}

function isCoin(r, c) {
    return gameState.coins.some(coin => coin.row === r && coin.col === c);
}

function updateStatsDisplay() {
    const scoreEl = document.getElementById("scoreDisplay");
    const movesEl = document.getElementById("movesDisplay");
    const crashesEl = document.getElementById("crashesDisplay");
    const stepsEl = document.getElementById("stepsDisplay");

    if (scoreEl) scoreEl.textContent = `Score: ${gameState.score}`;
    if (movesEl) movesEl.textContent = `Steps: ${gameState.steps}`;
    if (crashesEl) crashesEl.textContent = `Crashes: ${gameState.crashes}`;
    if (stepsEl) stepsEl.textContent = `Mode: ${currentMode.toUpperCase()}`;
}

/*
 * ==========================================
 * ROBOT NAVIGATION ACTIONS
 * ==========================================
 */

async function apiMoveForward() {
    if (!isRunning) return false;

    if (currentMode === "xo") {
        gameState.crashes++;
        updateStatsDisplay();
        logGame("Error: move_forward() cannot be used in XO mode!", "error");
        return false;
    }

    await sleep(STEP_DELAY);

    const dRow = [-1, 0, 1, 0];
    const dCol = [0, 1, 0, -1];

    const nextRow = gameState.robot.row + dRow[gameState.robot.dir];
    const nextCol = gameState.robot.col + dCol[gameState.robot.dir];

    if (nextRow < 0 || nextRow >= ROWS || nextCol < 0 || nextCol >= COLS || isWall(nextRow, nextCol)) {
        gameState.crashes++;
        logGame("Robot collided with an obstacle!", "error");
        triggerCrashEffect();
        await sleep(650);
        updateStatsDisplay();
        return false;
    }

    gameState.robot.row = nextRow;
    gameState.robot.col = nextCol;
    gameState.steps++;

    const coinIndex = gameState.coins.findIndex(c => c.row === nextRow && c.col === nextCol);
    if (coinIndex !== -1) {
        gameState.score += 10;
        gameState.coins.splice(coinIndex, 1);
        logGame("+10 Points! Coin collected 🪙", "success");
    }

    createGrid();
    return true;
}

async function apiTurnLeft() {
    if (!isRunning) return;

    if (currentMode === "xo") {
        gameState.crashes++;
        updateStatsDisplay();
        logGame("Error: turn_left() cannot be used in XO mode!", "error");
        return;
    }

    await sleep(STEP_DELAY);
    gameState.robot.dir = (gameState.robot.dir + 3) % 4;
    createGrid();
    logGame("Robot turned left.", "info");
}

async function apiTurnRight() {
    if (!isRunning) return;

    if (currentMode === "xo") {
        gameState.crashes++;
        updateStatsDisplay();
        logGame("Error: turn_right() cannot be used in XO mode!", "error");
        return;
    }

    await sleep(STEP_DELAY);
    gameState.robot.dir = (gameState.robot.dir + 1) % 4;
    createGrid();
    logGame("Robot turned right.", "info");
}

function triggerCrashEffect() {
    const robotEl = document.querySelector(".robot");
    if (!robotEl) return;

    const cell = robotEl.parentElement;
    const crashDirections = ["crash-up", "crash-right", "crash-down", "crash-left"];
    const dirClass = crashDirections[gameState.robot.dir];

    robotEl.classList.add(dirClass);
    if (cell) cell.classList.add("crash-front", dirClass);

    setTimeout(() => {
        if (robotEl) robotEl.classList.remove(dirClass);
        if (cell) cell.classList.remove("crash-front", dirClass);
    }, 650);
}

/*
 * ==========================================
 * TIC-TAC-TOE (XO) ACTIONS
 * ==========================================
 */

async function apiPlayMove(row, col) {
    if (!isRunning) return false;

    if (currentMode !== "xo") {
        gameState.crashes++;
        updateStatsDisplay();
        logGame("Error: play() command is only available in Tic-Tac-Toe (XO) levels!", "error");
        return false;
    }

    // 1. Verify 3x3 array declaration in C source code
    if (!has3x3ArrayDeclaration()) {
        gameState.crashes++;
        updateStatsDisplay();
        logGame("Error: You must declare a 3x3 array in C first! (e.g., char board[3][3];)", "error");
        return false;
    }

    // 2. Enforce required first move location
    const requiredFirstMove = LEVELS[currentLevelIndex]?.requiredFirstMove || { row: 1, col: 1 };
    const isFirstMove = gameState.steps === 0;

    if (isFirstMove && (row !== requiredFirstMove.row || col !== requiredFirstMove.col)) {
        gameState.crashes++;
        updateStatsDisplay();
        logGame(`Error: First move MUST be placed at row ${requiredFirstMove.row}, col ${requiredFirstMove.col}!`, "error");
        return false;
    }

    // Standard boundary check
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
        gameState.crashes++;
        updateStatsDisplay();
        logGame(`Invalid move (${row}, ${col})! Coordinates out of bounds.`, "error");
        return false;
    }

    // Standard occupied cell check
    if (xoBoard[row][col] !== ' ') {
        gameState.crashes++;
        updateStatsDisplay();
        logGame(`Cell [${row}][${col}] is already taken!`, "error");
        return false;
    }

    // Execute Player ('X') Move
    xoBoard[row][col] = 'X';
    gameState.steps++;
    createGrid();
    logGame(`Player placed 'X' at board[${row}][${col}]`, "info");
    await sleep(STEP_DELAY);

    if (checkXOWin('X')) {
        logGame("🎉 Player wins! 3-in-a-row achieved!", "success");
        return true;
    }

    if (isBoardFull()) {
        logGame("🤝 It's a Tie! No one won.", "info");
        isRunning = false;
        setTimeout(() => alert("🤝 It's a Tie! No one won."), 100);
        return false;
    }

    // Execute Robot ('O') Move
    const robotMove = getRobotAIMove();
    if (robotMove) {
        xoBoard[robotMove.row][robotMove.col] = 'O';
        createGrid();
        logGame(`Robot placed 'O' at board[${robotMove.row}][${robotMove.col}]`, "error");
        await sleep(STEP_DELAY);

        if (checkXOWin('O')) {
            const msg = "🤖 Robot wins! Try another strategy.";
            logGame(msg, "error");
            isRunning = false;
            setTimeout(() => alert(msg), 100);
            return false;
        }

        if (isBoardFull()) {
            logGame("🤝 It's a Tie! No one won.", "info");
            isRunning = false;
            setTimeout(() => alert("🤝 It's a Tie! No one won."), 100);
            return false;
        }
    }

    return true;
}

// AI Opponent Decision Tree using Minimax Algorithm
function getRobotAIMove() {
    let bestScore = -Infinity;
    let bestMove = null;

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (xoBoard[r][c] === ' ') {
                xoBoard[r][c] = 'O';
                let score = minimax(xoBoard, 0, false);
                xoBoard[r][c] = ' ';
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = { row: r, col: c };
                }
            }
        }
    }
    return bestMove;
}

function minimax(board, depth, isMaximizing) {
    if (checkXOWin('O')) return 10 - depth;
    if (checkXOWin('X')) return depth - 10;
    if (isBoardFull()) return 0;

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (board[r][c] === ' ') {
                    board[r][c] = 'O';
                    let score = minimax(board, depth + 1, false);
                    board[r][c] = ' ';
                    bestScore = Math.max(score, bestScore);
                }
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (board[r][c] === ' ') {
                    board[r][c] = 'X';
                    let score = minimax(board, depth + 1, true);
                    board[r][c] = ' ';
                    bestScore = Math.min(score, bestScore);
                }
            }
        }
        return bestScore;
    }
}

function isBoardFull() {
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (xoBoard[r][c] === ' ') return false;
        }
    }
    return true;
}

function checkXOWin(symbol) {
    const b = xoBoard;
    for (let i = 0; i < 3; i++) {
        if (b[i][0] === symbol && b[i][1] === symbol && b[i][2] === symbol) return true;
        if (b[0][i] === symbol && b[1][i] === symbol && b[2][i] === symbol) return true;
    }
    if (b[0][0] === symbol && b[1][1] === symbol && b[2][2] === symbol) return true;
    if (b[0][2] === symbol && b[1][1] === symbol && b[2][0] === symbol) return true;
    return false;
}

/*
 * ==========================================
 * C CODE TRANSPILER & EXECUTION
 * Supports C Arrays, Strict Syntax, and Non-Blocking Loops
 * ==========================================
 */

function normalizeLoopBraces(code) {
    return code.replace(/(while|for)\s*\(([^)]+)\)\s*(?!\{)([^\s;][^;]*;)/g, "$1 ($2) { $3 }");
}

function transpileCToJS(cCode) {
    // 1. Preserve string literals from being modified
    const strings = [];
    let jsCode = cCode.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
        strings.push(match);
        return `__STR_${strings.length - 1}__`;
    });

    // 2. Remove C header includes and normalize single-line loops
    jsCode = jsCode.replace(/#include\s*<[^>]+>/g, "");
    jsCode = jsCode.replace(/#include\s*"[^"]+"/g, "");
    jsCode = normalizeLoopBraces(jsCode);

    // 3. Extract body of main() function
    const mainMatch = jsCode.match(/int\s+main\s*\([^)]*\)\s*\{([\s\S]*)\}/);
    if (mainMatch) {
        jsCode = mainMatch[1];
    }

    // 4. Transpile 2D C arrays: char board[3][3];
    jsCode = jsCode.replace(
        /\b(int|float|double|char|long|short)\s+([a-zA-Z_]\w*)\s*\[\s*([^\]]+)\s*\]\s*\[\s*([^\]]+)\s*\]\s*;/g,
        "let $2 = Array.from({length: $3}, () => new Array($4).fill(' '));"
    );

    // 5. Transpile initialized 1D C arrays: int arr[3] = {0};
    jsCode = jsCode.replace(/\b(int|float|double|char|long|short)\s+([a-zA-Z_]\w*)\s*\[[^\]]*\]\s*=\s*\{([^}]*)\}\s*;/g, "let $2 = [$3];");

    // 6. Transpile uninitialized 1D C arrays: int arr[3];
    jsCode = jsCode.replace(/\b(int|float|double|char|long|short)\s+([a-zA-Z_]\w*)\s*\[\s*([^\]]+)\s*\]\s*;/g, "let $2 = new Array($3).fill(0);");

    // 7. Remove C return statements and replace primitive data types with JS 'let'
    jsCode = jsCode.replace(/return\s+[^;]*;/g, "");
    jsCode = jsCode.replace(/\b(int|float|double|char|long|short)\b/g, "let");

    // 8. Transpile Tic-Tac-Toe move commands
    jsCode = jsCode.replace(/\bplay\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)\s*;/g, "if (!(await api.play($1, $2))) return;");

    // 9. Transpile Robot navigation commands
    jsCode = jsCode.replace(/\bmove_forward\s*\(\s*\)\s*;/g, "if (!(await api.moveForward())) return;");
    jsCode = jsCode.replace(/\bturn_left\s*\(\s*\)\s*;/g, "await api.turnLeft();");
    jsCode = jsCode.replace(/\bturn_right\s*\(\s*\)\s*;/g, "await api.turnRight();");

    // 10. Transpile standard I/O functions (puts, printf)
    jsCode = jsCode.replace(/\bputs\s*\(\s*(.*)\s*\)\s*;/g, "api.puts($1);");
    jsCode = jsCode.replace(/\bprintf\s*\(\s*(.*)\s*\)\s*;/g, "api.printf($1);");

    // 11. Inject thread yielding into loops to prevent browser tab freezing
    jsCode = jsCode.replace(/(while|for)\s*\(([^)]+)\)\s*\{/g, "$1 ($2) { if (!api.checkRunning()) break; await api.yieldThread(); ");

    // 12. Restore string literals
    jsCode = jsCode.replace(/__STR_(\d+)__/g, (_, id) => strings[id]);

    const scopeHeader = `
        const puts = (val) => api.puts(val);
        const printf = (...args) => api.printf(...args);
    `;

    return scopeHeader + jsCode;
}

async function runCode() {
    if (isRunning) return;

    const codeEl = document.getElementById("code");
    if (!codeEl) return;

    if (currentMode === "xo" && !has3x3ArrayDeclaration()) {
        clearConsoles();
        logGame("Execution error: You must declare a 3x3 array in C first! (e.g., char board[3][3];)", "error");
        return;
    }

    const rawCode = codeEl.value;
    clearConsoles();
    stdoutBuffer = "";
    logGame("Executing C code...", "info");

    isRunning = true;

    try {
        const jsCode = transpileCToJS(rawCode);

        const api = {
            moveForward: apiMoveForward,
            turnLeft: apiTurnLeft,
            turnRight: apiTurnRight,
            play: (r, c) => apiPlayMove(r, c),
            checkRunning: () => isRunning,
            yieldThread: () => sleep(10),
            
            puts: (msg) => writeStdout(String(msg) + "\n"),
            printf: (fmt, ...args) => {
                if (typeof fmt !== 'string') {
                    writeStdout(String(fmt));
                    return;
                }
                let i = 0;
                let res = fmt.replace(/\\n/g, "\n").replace(/%[difs]|%[0-9]*\.[0-9]*[difs]/g, () => args[i++] ?? '');
                writeStdout(res);
            }
        };

        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const executeCode = new AsyncFunction("api", jsCode);

        await executeCode(api);
        flushStdout();

        if (currentMode === "robot" && gameState.robot.row === GOAL.row && gameState.robot.col === GOAL.col) {
            logGame("🎉 Goal reached successfully!", "success");
            triggerNextLevel();
        } else if (currentMode === "xo" && checkXOWin('X')) {
            logGame("🎉 Level Completed! You defeated the Robot at XO!", "success");
            triggerNextLevel();
        } else if (isRunning) {
            logGame("Program finished execution.", "info");
        }

    } catch (err) {
        flushStdout();
        logGame("Execution error: Check C syntax or missing semicolons ';'.", "error");
        logC(err.message, "error");
    } finally {
        isRunning = false;
    }
}

function triggerNextLevel() {
    if (typeof LEVELS !== "undefined" && currentLevelIndex + 1 < LEVELS.length) {
        setTimeout(() => {
            logGame("Moving to next level...", "info");
            loadLevel(currentLevelIndex + 1);
        }, 2000);
    }
}

/*
 * ==========================================
 * CONSOLE & UI CONTROLS
 * ==========================================
 */
function switchConsole(tab) {
    const gameConsole = document.getElementById("gameConsole");
    const cConsole = document.getElementById("cConsole");
    const gameTab = document.getElementById("gameTab");
    const cTab = document.getElementById("cTab");

    if (!gameConsole || !cConsole) return;

    if (tab === 'game') {
        gameConsole.classList.add("active");
        cConsole.classList.remove("active");
        if (gameTab) gameTab.classList.add("active");
        if (cTab) cTab.classList.remove("active");
    } else if (tab === 'c') {
        cConsole.classList.add("active");
        gameConsole.classList.remove("active");
        if (cTab) cTab.classList.add("active");
        if (gameTab) gameTab.classList.remove("active");
    }
}

function nextHint() {
    if (hints && currentHintIndex < hints.length - 1) {
        currentHintIndex++;
        updateHintDisplay();
    }
}

function previousHint() {
    if (hints && currentHintIndex > 0) {
        currentHintIndex--;
        updateHintDisplay();
    }
}

function updateHintDisplay() {
    const hintText = document.getElementById("hintText");
    const hintCounter = document.getElementById("hintCounter");
    if (hintText && hints && hints.length > 0) {
        hintText.innerHTML = hints[currentHintIndex];
        if (hintCounter) hintCounter.textContent = `${currentHintIndex + 1} / ${hints.length}`;
    } else {
        if (hintText) hintText.innerHTML = "No hints available.";
        if (hintCounter) hintCounter.textContent = "0 / 0";
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function clearConsoles() {
    const gameConsole = document.getElementById("gameConsole");
    const cConsole = document.getElementById("cConsole");
    if (gameConsole) gameConsole.innerHTML = "";
    if (cConsole) cConsole.innerHTML = "";
}

function logGame(message, type = "") {
    const consoleEl = document.getElementById("gameConsole");
    if (!consoleEl) return;
    const p = document.createElement("p");
    p.className = `console-line ${type}`;
    p.textContent = `> ${message}`;
    consoleEl.appendChild(p);
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

function logC(message, type = "") {
    const consoleEl = document.getElementById("cConsole");
    if (!consoleEl) return;
    const p = document.createElement("p");
    p.className = `console-line ${type}`;
    p.textContent = `> ${message}`;
    consoleEl.appendChild(p);
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

function updateLineNumbers() {
    const code = document.getElementById("code");
    const lineNumbers = document.getElementById("lineNumbers");
    if (!code || !lineNumbers) return;

    const lineCount = code.value.split("\n").length;
    lineNumbers.innerHTML = Array.from(
        { length: lineCount },
        (_, index) => index + 1
    ).join("<br>");
}

// Global Event Listeners & Initialization
document.addEventListener("DOMContentLoaded", () => {
    populateLevelSelect();
    loadLevel(0);

    const levelSelect = document.getElementById("levelSelect");
    if (levelSelect) {
        levelSelect.addEventListener("change", (e) => {
            loadLevel(parseInt(e.target.value, 10));
        });
    }

    const editor = document.getElementById("code");
    const lineNumbers = document.getElementById("lineNumbers");

    if (editor) {
        updateLineNumbers();

        editor.addEventListener("input", () => {
            updateLineNumbers();
            if (currentMode === "xo") {
                createGrid();
            }
        });

        editor.addEventListener("scroll", () => {
            if (lineNumbers) lineNumbers.scrollTop = editor.scrollTop;
        });

        editor.addEventListener("keydown", (e) => {
            if (e.key === "Tab") {
                e.preventDefault();
                const start = editor.selectionStart;
                const end = editor.selectionEnd;
                editor.value = editor.value.substring(0, start) + "    " + editor.value.substring(end);
                editor.selectionStart = editor.selectionEnd = start + 4;
                updateLineNumbers();
            }
            if (e.ctrlKey && e.key === "Enter") {
                runCode();
            }
        });
    }
});