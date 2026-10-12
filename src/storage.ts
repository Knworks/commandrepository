// src/storage.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { CommandRepositoryData, Category, Command, TreeItemData } from './types';

/**
 * デフォルトのデータ構造。
 * ファイルが存在しない場合や、読み込みに失敗した場合に使用されます。
 */
const DEFAULT_DATA: CommandRepositoryData = {
  version: 1,
  categories: []
};

/**
 * コマンドデータ（カテゴリとコマンド）をJSONファイルとして永続化し、
 * CRUD（作成、読み取り、更新、削除）操作を管理します。
 */
export class StorageManager {
  private storagePath: string | null = null;
  private data: CommandRepositoryData = JSON.parse(JSON.stringify(DEFAULT_DATA));

  constructor() {
    // コンストラクタではI/Oを行わない（呼び出し側で明示的に load する）
  }

  /**
   * 設定からストレージファイルの絶対パスを解決します。
   * @returns 解決されたファイルパス。解決できない場合はnull。
   */
  private async resolveStoragePath(): Promise<string | null> {
    const raw = (vscode.workspace.getConfiguration('commandRepository').get<string>('storagePath') || '').trim();
    if (!raw) {
      // 未設定時はパス解決不可（表示もしない）
      return null;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    // 変数置換: ${workspaceFolder}, ${env:VARNAME}
    let resolvedDir = raw;
    if (workspaceFolders) {
      resolvedDir = resolvedDir.replace(/\${workspaceFolder}/g, workspaceFolders[0].uri.fsPath);
    }
    resolvedDir = resolvedDir.replace(/\${env:([A-Za-z_][A-Za-z0-9_]*)}/g, (_m, p1) => process.env[p1] ?? '');

    // 相対パスはワークスペースルート相対とする
    if (!path.isAbsolute(resolvedDir) && workspaceFolders) {
      resolvedDir = path.join(workspaceFolders[0].uri.fsPath, resolvedDir);
    }

    const filePath = path.join(resolvedDir, 'commandrepository.json');
    return filePath;
  }

  /**
   * 設定（保存ディレクトリ）が有効に設定されているかどうか。
   */
  public isConfigured(): boolean {
    const raw = (vscode.workspace.getConfiguration('commandRepository').get<string>('storagePath') || '').trim();
    return raw.length > 0;
  }

  /**
   * ストレージファイルが存在することを保証します。
   * ファイルが存在しない場合は、ディレクトリを作成し、デフォルトデータでファイルを初期化します。
   * @param filePath 確認するファイルのパス。
   */
  private async ensureFileExists(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
    }
  }

  /**
   * ストレージファイルからデータを非同期に読み込み、メモリにロードします。
   */
  public async load(): Promise<void> {
    this.storagePath = await this.resolveStoragePath();
    if (!this.storagePath) {
      this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
      return;
    }

    await this.ensureFileExists(this.storagePath);

    try {
      const content = await fs.readFile(this.storagePath, 'utf-8');
      this.data = JSON.parse(content) as CommandRepositoryData;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load command: ${error instanceof Error ? error.message : String(error)}`);
      this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  }

  /**
   * 現在メモリにあるデータをストレージファイルに保存します。
   */
  public async save(): Promise<void> {
    if (this.storagePath) {
        try {
            await fs.writeFile(this.storagePath, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save commands: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
  }
  
  /**
   * 解決済みの保存ディレクトリを返します（未設定なら null）。
   */
  public async getResolvedDirectory(): Promise<string | null> {
    const file = await this.resolveStoragePath();
    if (!file) {return null;}
    return path.dirname(file);
  }

  /**
   * 現在のコマンドリポジトリのデータを取得します。
   * @returns コマンドリポジトリのデータ。
   */
  public getData(): CommandRepositoryData {
    return this.data;
  }

  // --- CRUD Operations ---

  /**
   * 新しいカテゴリを追加します。
   * @param label 新しいカテゴリの名前。
   */
  public addCategory(label: string): void {
    const newCategory: Category = { id: uuidv4(), label, children: [] };
    this.data.categories.push(newCategory);
    this.save();
  }

  /**
   * 指定されたカテゴリに新しいコマンドを追加します。
   * @param categoryId コマンドを追加するカテゴリのID。
   * @param commandData 追加するコマンドのデータ（IDを除く）。
   */
  public addCommand(categoryId: string, commandData: Omit<Command, 'id'>): void {
    const category = this.data.categories.find(c => c.id === categoryId);
    if (category) {
      const newCommand: Command = { id: uuidv4(), ...commandData };
      category.children.push(newCommand);
      this.save();
    }
  }

  /**
   * 指定されたIDを持つアイテム（カテゴリまたはコマンド）を検索します。
   * @param itemId 検索するアイテムのID。
   * @returns 見つかったアイテムと、それがコマンドの場合は親カテゴリのオブジェクト。見つからない場合はnull。
   */
  private _findItem(itemId: string): { item: Category | Command, parent?: Category } | null {
    // カテゴリとして検索
    const category = this.data.categories.find(c => c.id === itemId);
    if (category) {
      return { item: category };
    }
    // コマンドとして検索
    for (const parentCategory of this.data.categories) {
      const command = parentCategory.children.find(c => c.id === itemId);
      if (command) {
        return { item: command, parent: parentCategory };
      }
    }
    return null;
  }

  /**
   * カテゴリまたはコマンドの情報を更新します。
   * @param item 更新するアイテムのデータ。
   * @param newValues 新しい値。
   */
  public updateItem(item: TreeItemData, newValues: Partial<Omit<Category, 'id' | 'children'>> | Partial<Omit<Command, 'id'>>) {
    const found = this._findItem(item.id);
    if (found) {
      Object.assign(found.item, newValues);
      this.save();
    }
  }

  /**
   * 指定されたIDのアイテム（カテゴリまたはコマンド）を削除します。
   * @param itemId 削除するアイテムのID。
   */
  public deleteItem(itemId: string): void {
    const found = this._findItem(itemId);
    if (!found) {return;}

    // アイテムがコマンドの場合、親カテゴリのchildrenから削除
    if (found.parent) {
      const commandIndex = found.parent.children.findIndex(c => c.id === itemId);
      if (commandIndex > -1) {
        found.parent.children.splice(commandIndex, 1);
      }
    } 
    // アイテムがカテゴリの場合、ルートのcategoriesから削除
    else {
      const categoryIndex = this.data.categories.findIndex(c => c.id === itemId);
      if (categoryIndex > -1) {
        this.data.categories.splice(categoryIndex, 1);
      }
    }
    this.save();
  }

  /**
   * 指定アイテム（カテゴリまたはコマンド）の順序を上下に移動します。
   * @param itemId アイテムID
   * @param direction 'up' | 'down'
   * @returns 実際に移動された場合は true、移動不要/不可なら false
   */
  public moveItem(itemId: string, direction: 'up' | 'down'): boolean {
    const found = this._findItem(itemId);
    if (!found) { return false; }

    const delta = direction === 'up' ? -1 : 1;

    if (found.parent) {
      // Command を親カテゴリ内で移動
      const arr = found.parent.children;
      const idx = arr.findIndex(c => c.id === itemId);
      if (idx < 0) { return false; }
      const next = idx + delta;
      if (next < 0 || next >= arr.length) { return false; }
      const [moved] = arr.splice(idx, 1);
      arr.splice(next, 0, moved);
    } else {
      // Category を categories 配列で移動
      const arr = this.data.categories;
      const idx = arr.findIndex(c => c.id === itemId);
      if (idx < 0) { return false; }
      const next = idx + delta;
      if (next < 0 || next >= arr.length) { return false; }
      const [moved] = arr.splice(idx, 1);
      arr.splice(next, 0, moved);
    }

    this.save();
    return true;
  }
}
