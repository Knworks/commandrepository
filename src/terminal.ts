// src/terminal.ts
import * as vscode from 'vscode';

/**
 * 送信先となるターミナルを解決します。
 * 優先順位: アクティブなターミナル > 再利用設定の既存ターミナル > 新規作成
 * @param reuseExisting 既存ターミナルを再利用するかどうか
 */
export function resolveTerminal(): vscode.Terminal {
    const active = vscode.window.activeTerminal;
    if (active && !active.exitStatus) {
        return active;
    }
    // アクティブが無い場合のみ新規作成
    return vscode.window.createTerminal('Command Repository');
}

/**
 * 設定に基づいてターミナルを取得または作成し、指定されたコマンドを送信します。
 * @param commandText ターミナルで実行するコマンド文字列。
 */
export function sendToTerminal(commandText: string): void {
    const terminal = resolveTerminal();
    terminal.show();
    terminal.sendText(commandText);
}
