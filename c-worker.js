/*
 * ==========================================
 * C ROBOT QUEST - WASM WORKER
 * Isolated C Interpreter Execution Environment
 * ==========================================
 */

// استيراد مكتبة PicoC Wasm (يمكن وضع الملف محلياً أو استدعاؤه عبر CDN)
importScripts('https://cdn.jsdelivr.net/npm/picoc-wasm@1.0.0/dist/picoc.js');

let isWorkerRunning = false;

// استقبال كود C من الواجهة الرئيسية
self.onmessage = async function (e) {
    const { type, code } = e.data;

    if (type === 'RUN_CODE') {
        isWorkerRunning = true;

        // تجهيز البيئة والحقن البرمجي للدوال المخصصة قبل كود المستخدم
        const cHeader = `
            void move_forward();
            void turn_left();
            void turn_right();
        `;

        const fullCode = cHeader + "\n" + code;

        try {
            // تشغيل مفسر PicoC
            await PicoC.run(fullCode, {
                // إعادة توجيه المخرجات القياسية (puts / printf)
                stdout: (text) => {
                    self.postMessage({ type: 'LOG_C', data: text });
                },
                // تعريف الدوال الخاصة بالتحكم بالروبوت
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
        self.close(); // إنهاء الـ Worker فوراً في حال الإيقاف الاضطراري
    }
};

// إرسال أمر الحركة للواجهة وانتظار انتهاء الأنيميشن قبل الاستمرار
function executeAction(actionType) {
    if (!isWorkerRunning) return;

    // إرسال طلب الحركة إلى app.js
    self.postMessage({ type: 'ROBOT_ACTION', action: actionType });

    // مزامنة التنفيذ: إيقاف الـ Worker مؤقتاً لتزامن أنيميشن المتصفح
    const SharedArrayBuffer = new SharedArrayBuffer(4);
    const intArray = new Int32Array(SharedArrayBuffer);
    Atomics.wait(intArray, 0, 0, 350); // وقت التأخير يطابق STEP_DELAY
}