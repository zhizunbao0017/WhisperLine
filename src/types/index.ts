// src/types/index.ts
// Type definitions for WhisperLine

export type ChapterType = 'period' | 'theme' | 'relationship'; // 阶段型 | 主题型 | 关系型

export type ChapterStatus = 'ongoing' | 'archived'; // 进行中 | 已完结（封存）

export interface Chapter {
  id: string;
  title: string;
  createdAt: number;
  
  // --- 新增核心字段 ---
  type: ChapterType; 
  status: ChapterStatus;
  
  description?: string; // 用户描述或 AI 摘要
  coverImage?: string;  // 封面图文件名 (通过 MediaService 读取)
  
  // 仅 'period' 类型需要
  startDate?: number; // 时间戳
  endDate?: number;   // 时间戳 (仅当 status === 'archived' 时可能有)
  
  // 仅 'relationship' 类型需要
  linkedFocusId?: string; // 关联的 Key Person ID
  
  // --- 保留旧字段以兼容现有代码 ---
  entryIds?: string[]; // 关联的日记条目 ID 列表
  lastUpdated?: string; // ISO 日期字符串（向后兼容）
  sourceId?: string; // 来源 ID（向后兼容）
  keywords?: string[]; // 关键词列表（向后兼容）
}

/**
 * DiaryEntry interface
 * Represents a diary entry that can be associated with a Chapter
 */
export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  contentHTML: string | null;
  mood: string | null;
  weather: any;
  createdAt: string;
  updatedAt: string;
  companionIDs: string[];
  analysis: any;
  themeID: string | null;
  captureType: string | null;
  captureMeta: any;
  chapterId?: string; // Optional: Link to a Chapter
}

