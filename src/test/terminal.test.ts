import * as assert from 'assert';
import * as vscode from 'vscode';
// テスト対象の関数をインポート
import { resolveTerminal } from '../terminal';

suite('Terminal selection behavior', () => {
  teardown(async () => {
    // 開いているターミナルをすべて閉じる（テスト汚染回避）
    for (const t of vscode.window.terminals) {
      try { t.dispose(); } catch { /* ignore */ }
    }
    await new Promise(r => setTimeout(r, 50));
  });

  test('Uses active terminal when available', async () => {
    // Arrange: 2つのターミナルを開き、後に開いた方をアクティブにする
    const t1 = vscode.window.createTerminal('T1');
    t1.show();
    await new Promise(r => setTimeout(r, 100));

    const t2 = vscode.window.createTerminal('T2');
    t2.show();
    await new Promise(r => setTimeout(r, 100));

    // Act: 解決関数を呼び出す
    const resolved = resolveTerminal();
    // Assert: 現在アクティブなターミナル（T2）が選択される
    assert.strictEqual(resolved.name, 'T2', 'should select currently active terminal');
  });

  test('Creates new terminal when no active exists', async () => {
    // Arrange: すべてのターミナルを閉じて、アクティブが無い状態にする
    for (const t of vscode.window.terminals) {
      try { t.dispose(); } catch { /* ignore */ }
    }
    await new Promise(r => setTimeout(r, 50));

    // Act: 解決関数を呼び出す
    const resolved = resolveTerminal();
    // Assert: 新しいターミナルが作成される
    assert.ok(resolved, 'should create a new terminal');
  });
});
