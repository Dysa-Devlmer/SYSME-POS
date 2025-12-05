// =====================================================
// Products Controller Tests
// =====================================================

const request = require('supertest');
const { app } = require('../../server');

describe('Products Controller', () => {
  let authToken;

  beforeAll(async () => {
    // Login to get auth token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'admin123'
      });

    authToken = response.body.data.token;
  });

  describe('GET /api/products', () => {
    it('should get all products', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter products by category', async () => {
      const response = await request(app)
        .get('/api/products?category_id=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should search products', async () => {
      const response = await request(app)
        .get('/api/products?search=pizza')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/products', () => {
    it('should create a new product', async () => {
      const newProduct = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100.00,
        cost: 50.00,
        category_id: 1,
        unit_of_measure: 'unit'
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProduct);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('product_id');
    });

    it('should reject product without required fields', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Incomplete Product'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update a product', async () => {
      const response = await request(app)
        .put('/api/products/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Product Name',
          price: 150.00
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete a product', async () => {
      // First create a product to delete
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Product to Delete',
          sku: 'DEL-001',
          price: 100.00,
          cost: 50.00,
          unit_of_measure: 'unit'
        });

      const productId = createResponse.body.data.product_id;

      // Now delete it
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
