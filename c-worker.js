/*
 * ==========================================
 * C ROBOT QUEST - WASM WORKER
 * Isolated C Interpreter Execution Environment
 * ==========================================
 */

importScripts('https://cdn.jsdelivr.net/npm/picoc-wasm@1.0.0/dist/picoc.js');

let isWorkerRunning = false;

self.onmessage = async function (e) {
    const { type, code } = e.data;

    if (type === 'RUN_CODE') {
        isWorkerRunning = true;

        const cHeader = `
            void move_forward();
            void turn_left();
            void turn_right();
        `;

        const fullCode = cHeader + "\n" + code;

        try {
            await PicoC.run(fullCode, {
                stdout: (text) => {
                    self.postMessage({ type: 'LOG_C', data: text });
                },
                bindings: {
                    move_forward: () => executeAction('MOVE_FORWARD'),
                    turn_left: () => executeAction('TURN_LEFT'),
                    turn_right: () => executeAction('TURN_RIGHT')
                }
            });

            self.postMessage({ type: 'EXECUTION_COMPLETE' });
        } catch (err) {
            self.postMessage({ type: 'LOG_ERROR', data: err.message });
        } finally {
            isWorkerRunning = false;
        }
    } else if (type === 'STOP') {
        isWorkerRunning = false;
        self.close(); 
    }
};

function executeAction(actionType) {
    if (!isWorkerRunning) return;

    self.postMessage({ type: 'ROBOT_ACTION', action: actionType });

    const SharedArrayBuffer = new SharedArrayBuffer(4);
    const intArray = new Int32Array(SharedArrayBuffer);
    Atomics.wait(intArray, 0, 0, 350);
}
