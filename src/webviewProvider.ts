// src/webviewProvider.ts
import * as vscode from 'vscode';
import { TreeItemData } from './types';
import { getNonce } from './utils';

export class DetailsViewProvider implements vscode.WebviewViewProvider {

    public static readonly viewType = 'commandRepositoryDetails';

    private _view?: vscode.WebviewView;
    // 状態保持は不要なため削除（常に渡されたアイテムを即時表示）

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        // 参照することで未使用パラメータ警告を回避
        void _context; void _token;
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'media'),
                vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'webview-ui-toolkit', 'dist'),
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // 読み取り専用ビューのため、受信メッセージは未使用
        webviewView.webview.onDidReceiveMessage(() => { /* noop */ });
    }

    public updateView(item: TreeItemData | 'placeholder') {
        if (this._view) {
            this._view.show?.(true); // Focus the view
            if (typeof item === 'string' || item.type === 'category') {
                this._view.webview.postMessage({ type: 'placeholder' });
            } else {
                this._view.webview.postMessage({ type: 'update', item });
            }
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const toolkitUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'webview-ui-toolkit', 'dist', 'toolkit.js'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));
        const nonce = getNonce();


        return `<!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script type="module" nonce="${nonce}" src="${toolkitUri}"></script>
                <link href="${styleUri}" rel="stylesheet">
                <title>Command Details</title>
            </head>
            <body>
                <div id="view-container">
                    <!-- Read-only View -->
                    <div id="read-only-view" class="view">
                        <p id="type-ro" class="type-badge"></p>
                        <p id="command-container-ro"><strong>Command:</strong> <code id="command-ro"></code></p>
                        <p id="parameter-container-ro"><strong>Parameter:</strong> <code id="parameter-ro"></code></p>
                        <p id="description-container-ro"><strong>Description:</strong> <span id="description-ro"></span></p>
                    </div>

                    <!-- Placeholder for edit view (not used) -->
                    <div id="edit-view" class="view" style="display:none;"></div>
                    <p id="placeholder" class="view" style="display:none;">Select an item in the Command Explorer to see its details.</p>
                </div>

                <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;;
    }
}

// getNonce は utils からインポートして使用
