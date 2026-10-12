import * as assert from 'assert';
import * as vscode from 'vscode';
import { CommandExplorerProvider } from '../treeViewProvider';
import { StorageManager } from '../storage';
import { TreeItemData } from '../types';
import * as path from 'path';

class MockStorageManager extends StorageManager {
  private mock = {
    version: 1,
    categories: [
      {
        id: 'cat1',
        label: 'Category 1',
        children: [
          { id: 'c1', label: 'cmd1', command: 'echo 1', description: 'd1' },
          { id: 'c2', label: 'cmd2', command: 'echo 2', parameter: '--help' },
        ],
      },
    ],
  };
  override getData() { return this.mock as any; }
}

const mockContext = {
  asAbsolutePath: (p: string) => path.resolve(process.cwd(), p),
} as any;

suite('CommandExplorerProvider', () => {
  test('getChildren returns categories at root and commands under a category', async () => {
    // Arrange: モックStorageとコンテキストでプロバイダを作成
    const provider = new CommandExplorerProvider(new MockStorageManager(), mockContext);
    // Act: ルートの子要素（カテゴリ）→カテゴリの子要素（コマンド）を取得
    const root = await provider.getChildren();
    assert.strictEqual(root.length, 1);
    assert.strictEqual(root[0].type, 'category');
    const commands = await provider.getChildren(root[0]);
    // Assert: カテゴリ直下に2つのコマンドがあり、型が'command'である
    assert.strictEqual(commands.length, 2);
    assert.strictEqual(commands[0].type, 'command');
  });

  test('getTreeItem sets contextValue depending on parameter existence', () => {
    // Arrange: parameter 無/有 の2種類のコマンドを準備
    const provider = new CommandExplorerProvider(new MockStorageManager(), mockContext);
    const cmdNoParam: TreeItemData = { id: 'x', label: 'l', command: 'c', type: 'command', categoryId: 'cat1' } as any;
    const cmdHasParam: TreeItemData = { id: 'y', label: 'l', command: 'c', parameter: 'p', type: 'command', categoryId: 'cat1' } as any;
    // Act: TreeItem を取得
    const item1 = provider.getTreeItem(cmdNoParam);
    const item2 = provider.getTreeItem(cmdHasParam);
    // Assert: parameter 有無で contextValue が切り替わる
    assert.strictEqual(item1.contextValue, 'commandNoParam');
    assert.strictEqual(item2.contextValue, 'commandHasParam');
  });

  test('getTreeItem uses persisted collapsed state for categories', async () => {
    // Arrange: cat1 を折りたたみとして設定
    const provider = new CommandExplorerProvider(new MockStorageManager(), mockContext);
    provider.setCollapsedCategoryIds(['cat1']);
    const root = await provider.getChildren();
    // Act: TreeItem を生成
    const item = provider.getTreeItem(root[0]);
    // Assert: 折りたたみ状態が反映される
    assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
  });

  test('filter forces category expansion regardless of persisted state', async () => {
    // Arrange: cat1 を折りたたみとして設定し、フィルタを有効化
    const provider = new CommandExplorerProvider(new MockStorageManager(), mockContext);
    provider.setCollapsedCategoryIds(['cat1']);
    provider.setFilterText('cmd1');
    const root = await provider.getChildren();
    // Act
    const item = provider.getTreeItem(root[0]);
    // Assert: フィルタ時は常に展開
    assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
  });
});
