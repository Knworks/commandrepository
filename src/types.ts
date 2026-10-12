// src/types.ts

export interface Command {
  id: string;
  label: string;
  command: string;
  parameter?: string;
  description?: string;
}

export interface Category {
  id: string;
  label: string;
  children: Command[];
}

export interface CommandRepositoryData {
  version: number;
  categories: Category[];
}

// TreeViewで使うための型。CategoryかCommandを判別するプロパティを持たせる
export type TreeItemData = (Category & { type: 'category' }) | (Command & { type: 'command', categoryId: string });
