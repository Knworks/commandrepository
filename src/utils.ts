// src/utils.ts

/**
 * Webviewのセキュリティポリシー（CSP）で使用するランダムな文字列（nonce）を生成します。
 * @returns 32文字のランダムな英数字の文字列。
 */
export function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
