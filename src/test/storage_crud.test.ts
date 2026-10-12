import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { StorageManager } from '../storage';

suite('StorageManager CRUD', () => {
  const baseDir = path.join(process.cwd(), 'tmp-tests', 'storage-crud');

  async function cleanup() {
    try { await fs.rm(baseDir, { recursive: true, force: true }); } catch { /* noop */ }
  }

  setup(async () => {
    await cleanup();
    await vscode.workspace.getConfiguration('commandRepository').update('storagePath', baseDir, vscode.ConfigurationTarget.Global);
  });

  teardown(async () => {
    await cleanup();
  });

  test('addCategory/addCommand/update/delete work end-to-end', async () => {
    // Arrange: StorageManager を既定設定でロードし、空の状態から開始する
    const sm = new StorageManager();
    await sm.load();
    // Act: カテゴリを1件追加
    sm.addCategory('catA');
    // Assert: カテゴリが1件追加され、ラベルが一致する
    assert.strictEqual(sm.getData().categories.length, 1);
    const cat = sm.getData().categories[0];
    assert.strictEqual(cat.label, 'catA');
    
    // Act: コマンドを追加（parameter/description を含む）
    sm.addCommand(cat.id, { label: 'ls', command: 'ls', parameter: '-la', description: 'list files' });
    // Assert: コマンドが1件追加され、付随情報が保持されている
    assert.strictEqual(sm.getData().categories[0].children.length, 1);
    const cmd = sm.getData().categories[0].children[0];
    assert.strictEqual(cmd.parameter, '-la');
    assert.strictEqual(cmd.description, 'list files');
    
    // Act: コマンドの説明を更新
    sm.updateItem({ ...cmd, type: 'command', categoryId: cat.id } as any, { description: 'updated' } as any);
    // Assert: 説明が更新されている
    assert.strictEqual(sm.getData().categories[0].children[0].description, 'updated');
    
    // Act: カテゴリ名を更新
    sm.updateItem({ ...cat, type: 'category' } as any, { label: 'catZ' } as any);
    // Assert: カテゴリ名が更新されている
    assert.strictEqual(sm.getData().categories[0].label, 'catZ');
    
    // Act: コマンドを削除
    sm.deleteItem(cmd.id);
    // Assert: コマンドが削除され、子要素が0になる
    assert.strictEqual(sm.getData().categories[0].children.length, 0);
    
    // Act: カテゴリを削除
    sm.deleteItem(cat.id);
    // Assert: カテゴリ配列が空になる
    assert.strictEqual(sm.getData().categories.length, 0);
    
    // Assert: ストレージファイルが作成されている（永続化が行われた）
    const file = path.join(baseDir, 'commandrepository.json');
    const stat = await fs.stat(file);
    assert.ok(stat.isFile());
  });
});
