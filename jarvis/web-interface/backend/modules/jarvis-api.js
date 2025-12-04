// web-interface/backend/modules/jarvis-api.js
// Módulo de integración entre Panel Web y JARVIS Core

const path = require('path');
const fs = require('fs-extra');

/**
 * API para integrar el Panel Web con los módulos core de JARVIS
 */
class JarvisAPI {
  constructor() {
    this.basePath = path.join(__dirname, '../../../');
    this.dataPath = path.join(this.basePath, 'data');
  }

  /**
   * Get all memories from memory system
   */
  async getMemories(filter = {}) {
    try {
      const memoryDb = fs.readJsonSync(path.join(this.dataPath, 'memory-db.json'));
      let memories = memoryDb.memories || [];

      // Apply filters
      if (filter.type) {
        memories = memories.filter(m => m.type === filter.type);
      }

      if (filter.limit) {
        memories = memories.slice(0, filter.limit);
      }

      return memories;
    } catch (error) {
      console.error('Error getting memories:', error);
      return [];
    }
  }

  /**
   * Add new memory
   */
  async addMemory(content, type = 'general', metadata = {}) {
    try {
      const memoryDb = fs.readJsonSync(path.join(this.dataPath, 'memory-db.json'));

      const newMemory = {
        id: `mem_${Date.now()}`,
        content,
        type,
        metadata,
        timestamp: new Date().toISOString(),
        importance: metadata.importance || 'medium'
      };

      memoryDb.memories.push(newMemory);
      fs.writeJsonSync(path.join(this.dataPath, 'memory-db.json'), memoryDb, { spaces: 2 });

      return newMemory;
    } catch (error) {
      console.error('Error adding memory:', error);
      throw error;
    }
  }

  /**
   * Get all tasks
   */
  async getTasks(filter = {}) {
    try {
      const tasksDb = fs.readJsonSync(path.join(this.dataPath, 'tasks.json'));
      let tasks = tasksDb.tasks || [];

      // Apply filters
      if (filter.status) {
        tasks = tasks.filter(t => t.status === filter.status);
      }

      if (filter.priority) {
        tasks = tasks.filter(t => t.priority === filter.priority);
      }

      return tasks;
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  /**
   * Search across memories and tasks
   */
  async search(query, options = {}) {
    try {
      const results = [];

      // Search in memories
      if (!options.type || options.type === 'memory') {
        const memories = await this.getMemories();
        const memoryResults = memories.filter(m =>
          m.content.toLowerCase().includes(query.toLowerCase())
        );
        results.push(...memoryResults.map(m => ({ ...m, source: 'memory' })));
      }

      // Search in tasks
      if (!options.type || options.type === 'tasks') {
        const tasks = await this.getTasks();
        const taskResults = tasks.filter(t =>
          t.description.toLowerCase().includes(query.toLowerCase())
        );
        results.push(...taskResults.map(t => ({ ...t, source: 'task' })));
      }

      return results;
    } catch (error) {
      console.error('Error searching:', error);
      return [];
    }
  }

  /**
   * Get system stats
   */
  async getStats() {
    try {
      const memoryDb = fs.readJsonSync(path.join(this.dataPath, 'memory-db.json'));
      const tasksDb = fs.readJsonSync(path.join(this.dataPath, 'tasks.json'));

      return {
        memories: {
          total: memoryDb.memories?.length || 0,
          byType: this._countByProperty(memoryDb.memories, 'type')
        },
        tasks: {
          total: tasksDb.tasks?.length || 0,
          byStatus: this._countByProperty(tasksDb.tasks, 'status'),
          byPriority: this._countByProperty(tasksDb.tasks, 'priority')
        },
        system: {
          uptime: process.uptime(),
          version: 'MARK VII'
        }
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {};
    }
  }

  /**
   * Helper: Count items by property
   */
  _countByProperty(items, property) {
    if (!items) return {};

    return items.reduce((acc, item) => {
      const value = item[property] || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = new JarvisAPI();
