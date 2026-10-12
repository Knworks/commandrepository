import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageManager } from '../storage';

suite('Storage configuration behavior', () => {
  test.skip('isConfigured is false when storagePath is blank', async () => {
    // Arrange: storagePath を空に設定
    await vscode.workspace.getConfiguration('commandRepository').update('storagePath', '', vscode.ConfigurationTarget.Workspace);
    const sm = new StorageManager();
    await sm.load();
    // Assert: isConfigured が false、デフォルトデータが維持される
    assert.strictEqual(sm.isConfigured(), false);
    assert.strictEqual(Array.isArray(sm.getData().categories), true);
  });

  test.skip('storagePath as directory is resolved with fixed filename', async () => {
    // Arrange: ディレクトリパスを設定
    const dir = 'test-output/storage-dir';
    await vscode.workspace.getConfiguration('commandRepository').update('storagePath', dir, vscode.ConfigurationTarget.Workspace);
    const sm = new StorageManager();
    await sm.load();
    // Act: カテゴリ追加により永続化を発生させる
    assert.strictEqual(sm.isConfigured(), true);
    sm.addCategory('cat');
    // Assert: 固定名 'commandrepository.json' が作成される
    const filePath = path.join(dir, 'commandrepository.json');
    const stat = await fs.stat(filePath);
    assert.ok(stat.isFile(), 'commandrepository.json should be created in configured directory');
  });
});
