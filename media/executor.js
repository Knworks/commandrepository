// media/executor.js

// @ts-ignore
const vscode = acquireVsCodeApi();

const commandInput = document.getElementById('command-input');
const executeButton = document.getElementById('execute-button');

// 拡張からの入力反映メッセージを受け取る
window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg && msg.type === 'setInput') {
        commandInput.value = msg.value || '';
    }
});

function executeCommand() {
    const commandText = commandInput.value;
    if (commandText) {
        vscode.postMessage({
            type: 'executeCommand',
            value: commandText
        });
    }
}

executeButton.addEventListener('click', executeCommand);

commandInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault(); // デフォルトの改行動作をキャンセル
        executeCommand();
    }
});
