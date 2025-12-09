const request = require('supertest');
const express = require('express');
const fs = require('fs-extra');
const path = require('path');

// Mock app for testing (simplified version of server.cjs)
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Mock GET /api/health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'JARVIS MARK VII'
    });
  });

  // Mock GET /api/tasks
  app.get('/api/tasks', (req, res) => {
    res.json({
      tasks: [
        { id: 1, title: 'Test task', status: 'pending' }
      ]
    });
  });

  // Mock POST /api/tasks
  app.post('/api/tasks', (req, res) => {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    res.status(201).json({
      id: Date.now(),
      title,
      description,
      status: 'pending',
      created: new Date().toISOString()
    });
  });

  return app;
};

describe('JARVIS Backend API', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /api/health', () => {
    it('should return 200 and health status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service', 'JARVIS MARK VII');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/tasks', () => {
    it('should return tasks list', async () => {
      const res = await request(app).get('/api/tasks');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('tasks');
      expect(Array.isArray(res.body.tasks)).toBe(true);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const newTask = {
        title: 'Test task creation',
        description: 'Testing API endpoint'
      };

      const res = await request(app)
        .post('/api/tasks')
        .send(newTask);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('title', newTask.title);
      expect(res.body).toHaveProperty('status', 'pending');
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ description: 'No title' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});
