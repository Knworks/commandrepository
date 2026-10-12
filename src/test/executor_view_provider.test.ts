import * as assert from 'assert';
import * as vscode from 'vscode';
import { ExecutorViewProvider } from '../executorViewProvider';

class MockWebview /* not implementing interface to avoid TS2420 */ {
  html = '';
  options: vscode.WebviewOptions = {} as any;
  cspSource = '';
  private messages: any[] = [];
  asWebviewUri(uri: vscode.Uri): vscode.Uri { return uri; }
  onDidReceiveMessage = (() => ({ dispose() {} })) as any;
  postMessage(message: any): Thenable<boolean> { this.messages.push(message); return Promise.resolve(true); }
  setState(): void {}
  getState(): any { return undefined; }
  get posted() { return this.messages; }
}

class MockWebviewView /* not implementing interface to avoid TS2420 */ {
  title?: string | undefined;
  description?: string | undefined;
  badge?: vscode.ViewBadge | undefined;
  visible = true;
  active = true;
  webview: MockWebview = new MockWebview();
  onDidChangeVisibility = (() => ({ dispose() {} })) as any;
  onDidDispose = (() => ({ dispose() {} })) as any;
  show(): void {}
  dispose(): void {}
}

suite('ExecutorViewProvider', () => {
  test('setInput before resolve is delivered after resolve', async () => {
    // Arrange: プロバイダを作成し、resolve前に入力を設定
    const prov = new ExecutorViewProvider(vscode.Uri.file(process.cwd()));
    // set input before webview initialized
    prov.setInput('echo hi');
    const view = new MockWebviewView();
    // Act: Webview を解決して初期メッセージ配送をトリガー
    prov.resolveWebviewView(view as any, {} as any, {} as any);
    // Assert: setInput の内容が 'setInput' メッセージとして postMessage されている
    const msgs = (view.webview as MockWebview).posted;
    assert.ok(msgs.find(m => m.type === 'setInput' && m.value === 'echo hi'));
  });
});
