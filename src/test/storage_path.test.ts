import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { StorageManager } from '../storage';

suite('StorageManager path resolution', () => {
  const ws = () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

  test('relative directory resolves under workspace or stays relative when no workspace', async () => {
    // Arrange: 相対パスの設定を書き込み
    const rel = 'tmp-tests/path-rel';
    await vscode.workspace.getConfiguration('commandRepository').update('storagePath', rel, vscode.ConfigurationTarget.Global);
    const sm = new StorageManager();
    // Act: 解決されたディレクトリを取得
    const dir = await sm.getResolvedDirectory();
    // Assert: ワークスペースがあれば絶対パス、なければ相対パスとして解決される
    assert.ok(dir, 'resolved directory should not be null');
    const got = dir!.replace(/\\/g, '/');
    const expectedAbs = path.join(ws(), rel).replace(/\\/g, '/');
    if (path.isAbsolute(dir!)) {
      assert.strictEqual(got.startsWith(expectedAbs), true, `expected absolute path starting with ${expectedAbs}, got ${got}`);
    } else {
      assert.strictEqual(got, rel.replace(/\\/g, '/'));
    }
  });

  test('env var substitution works (absolute or relative as above)', async () => {
    // Arrange: 環境変数を使った設定を書き込み
    process.env.CR_TMP_DIR = 'tmp-tests/path-env';
    await vscode.workspace.getConfiguration('commandRepository').update('storagePath', '${env:CR_TMP_DIR}', vscode.ConfigurationTarget.Global);
    const sm = new StorageManager();
    // Act: 解決されたディレクトリを取得
    const dir = await sm.getResolvedDirectory();
    // Assert: 環境変数が展開され、ワークスペース有無に応じて絶対/相対となる
    assert.ok(dir, 'resolved directory should not be null');
    const got = dir!.replace(/\\/g, '/');
    const rel = process.env.CR_TMP_DIR!;
    const expectedAbs = path.join(ws(), rel).replace(/\\/g, '/');
    if (path.isAbsolute(dir!)) {
      assert.strictEqual(got.startsWith(expectedAbs), true, `expected absolute path starting with ${expectedAbs}, got ${got}`);
    } else {
      assert.strictEqual(got, rel.replace(/\\/g, '/'));
    }
  });
});
