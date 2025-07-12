import { INoteService } from './interfaces';
import { INoteRepository, Note } from '../repositories/interfaces';

/**
 * 笔记服务实现
 */
export class NoteService implements INoteService {
  private noteRepository: INoteRepository;

  constructor(noteRepository: INoteRepository) {
    this.noteRepository = noteRepository;
  }

  /**
   * 获取所有笔记
   */
  async getAllNotes(userId: string): Promise<Note[]> {
    return await this.noteRepository.getAll(userId);
  }

  /**
   * 搜索笔记
   */
  async searchNotes(query: string, userId: string): Promise<Note[]> {
    if (!query.trim()) {
      return [];
    }
    
    return await this.noteRepository.search(query, userId);
  }

  /**
   * 创建新笔记
   */
  async createNote(content: string, userId: string): Promise<Note> {
    if (!content.trim()) {
      throw new Error('Note content cannot be empty');
    }

    const noteData = {
      content: content.trim(),
      pinned: false
    };

    return await this.noteRepository.create(noteData, userId);
  }

  /**
   * 更新笔记
   */
  async updateNote(noteId: number, content: string, userId: string): Promise<void> {
    if (!content.trim()) {
      throw new Error('Note content cannot be empty');
    }

    // 使用NoteRepository的特殊方法来更新内容
    const noteRepo = this.noteRepository as any;
    if (noteRepo.updateContent) {
      await noteRepo.updateContent(noteId, content.trim(), userId);
    } else {
      await this.noteRepository.update(noteId, { content: content.trim() }, userId);
    }
  }

  /**
   * 删除笔记
   */
  async deleteNote(noteId: number, userId: string): Promise<void> {
    await this.noteRepository.delete(noteId, userId);
  }

  /**
   * 切换笔记置顶状态
   */
  async toggleNotePin(noteId: number, userId: string): Promise<void> {
    // 获取当前笔记
    const note = await this.noteRepository.getById(noteId, userId);
    
    if (!note) {
      throw new Error('Note not found');
    }

    // 切换置顶状态
    const newPinnedState = !note.pinned;
    await this.noteRepository.togglePin(noteId, newPinnedState, userId);
  }
} 