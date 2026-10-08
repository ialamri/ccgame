/*
 * ==========================================
 * C ROBOT QUEST - GAME LEVELS DATA
 * ==========================================
 */

const LEVELS = [
    {
        id: 1,
        title: "The Beginning",
        mode: "robot",
        rows: 5,
        cols: 7,
        goal: { row: 2, col: 6 },
        robot: { row: 2, col: 0, dir: 1 }, // 0: Up, 1: Right, 2: Down, 3: Left
        walls: [
            { row: 1, col: 3 },
            { row: 2, col: 3 },
            { row: 3, col: 4 },
            { row: 4, col: 3 }
        ],
        coins: [
            { row: 2, col: 2 }
        ],
        starterCode: `#include <stdio.h>\n\nint main() {\n    // Move forward towards the goal\n    move_forward();\n    \n    return 0;\n}`,
        hints: [
            '<span class="command">move_forward();</span> → Move Forward\n<span class="command">turn_left();</span> → Turn Left\n<span class="command">turn_right();</span> → Turn Right',
            'Use loops like <span class="command">while(...)</span> or <span class="command">for(...)</span> to navigate efficiently!'
        ]
    },
    {
        id: 2,
        title: "Turning Corners",
        mode: "robot",
        rows: 6,
        cols: 6,
        goal: { row: 5, col: 5 },
        robot: { row: 0, col: 0, dir: 1 },
        walls: [
            { row: 0, col: 2 },
            { row: 1, col: 2 },
            { row: 2, col: 2 }
        ],
        coins: [
            { row: 0, col: 1 },
            { row: 3, col: 3 }
        ],
        starterCode: `#include <stdio.h>\n\nint main() {\n    // Navigate around obstacles\n    \n    return 0;\n}`,
        hints: [
            'Avoid obstacles by using <span class="command">turn_right();</span> at the right position.',
            'Combine loops with movement commands to clear the path.'
        ]
    },
    {
        id: 3,
        title: "Tic-Tac-Toe",
        mode: "xo",
        rows: 3,
        cols: 3,
        requiredFirstMove: { row: 1, col: 1 },
        goal: { winCondition: "3_in_a_row" },
        robot: { symbol: 'O' },
        player: { symbol: 'X' },
        walls: [],
        coins: [],
        starterCode: `#include <stdio.h>\n\nint main() {\n    // 1. Declare a 3x3 array\n    \n    \n    // 2. Play at center position\n    \n    \n    return 0;\n}`,
        hints: [
            'First, declare a 3x3 array in C: <br><span class="command">data_type array_name[Row_size][Col_size];</span>',
            'Your first move <strong>must</strong> claim the center square: <span class="command">play(1, 1);</span>',
            'Continue playing using 2D array positions (index 0 to 2): <span class="command">play(row, col);</span>'
        ]
    }
];
