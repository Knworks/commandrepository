// src/executorViewProvider.ts
import * as vscode from 'vscode';
import { getNonce } from './utils';

/**
 * ユーザーが任意のコマンドを入力し、実行するためのWebviewを提供します。
 */
export class ExecutorViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'commandExecutor';

    private _view?: vscode.WebviewView;
    private _pendingInput: string | undefined;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    /**
     * Webviewビューを解決し、HTMLコンテンツとイベントリスナーを設定します。
     * @param webviewView Webviewビューの参照。
     * @param context Webviewビューが解決されるコンテキスト。
     * @param _token キャンセルトークン。
     */
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        // 参照することで未使用パラメータ警告を回避
        void _context; void _token;
        this._view = webviewView;

        // Webviewのオプションを設定
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri, // node_modulesを許可するためにルートを追加
            ]
        };

        // WebviewのHTMLコンテンツを設定
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Webviewからのメッセージをリッスン
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                // 'executeCommand'メッセージを受け取ったら、コマンドを実行
                case 'executeCommand':
                    vscode.commands.executeCommand('commandRepository.executeFromInput', data.value);
                    break;
            }
        });

        // 未反映の入力があれば初期反映
        if (this._pendingInput !== undefined) {
            try {
                this._view?.webview.postMessage({ type: 'setInput', value: this._pendingInput });
            } finally {
                this._pendingInput = undefined;
            }
        }
    }

    /**
     * 実行テキストボックスへ入力値を設定します（未表示時は保留して初期表示で反映）。
     */
    public setInput(value: string) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'setInput', value });
        } else {
            this._pendingInput = value;
        }
    }

    /**
     * Webviewに表示するHTMLコンテンツを生成します。
     * @param webview Webviewのインスタンス。
     * @returns 生成されたHTML文字列。
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        // 必要なリソースのURIを生成
        const toolkitUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'webview-ui-toolkit', 'dist', 'toolkit.js'));
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'executor.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'executor.css'));
        
        // セキュリティ向上のため、インラインスクリプトの実行を許可するnonceを生成
        const nonce = getNonce();
        
        // アイコンのURIを生成
        const executeIconUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'images', 'execute16.png'));

        return `<!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <!-- コンテンツセキュリティポリシー(CSP)を設定 -->
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                
                <!-- スタイルシートとVS Code UI Toolkitを読み込み -->
                <link href="${styleUri}" rel="stylesheet">
                <link href="${codiconsUri}" rel="stylesheet">
                <script type="module" nonce="${nonce}" src="${toolkitUri}"></script>
                
                <title>コマンド実行</title>
            </head>
            <body>
                <textarea id="command-input" placeholder="Enter the command..."></textarea>
                <div class="button-row">
                    <!-- クリアボタン (Codiconを使用) -->
                    <vscode-button id="clear-button" appearance="secondary">
                        <span slot="start" class="codicon codicon-clear-all"></span>
                    </vscode-button>
                    <!-- 実行ボタン -->
                    <vscode-button id="execute-button">
                        <span slot="start"><img src="${executeIconUri}" alt="Execute" width="16" height="16"/></span>
                    </vscode-button>
                </div>
                
                <!-- メインのスクリプトとインラインスクリプトを読み込み -->
                <script nonce="${nonce}" src="${scriptUri}"></script>
                <script nonce="${nonce}">
                    // クリアボタンのクリックイベント
                    document.getElementById('clear-button').addEventListener('click', function() {
                        document.getElementById('command-input').value = '';
                    });
                </script>
            </body>
            </html>`;
    }
}
