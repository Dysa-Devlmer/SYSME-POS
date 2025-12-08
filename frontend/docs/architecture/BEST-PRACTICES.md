# 💡 SYSME POS - Best Practices & Code Style Guide

Comprehensive guide for writing clean, maintainable code in SYSME POS.

---

## 📋 Table of Contents

- [General Principles](#general-principles)
- [JavaScript/TypeScript](#javascripttypescript)
- [React Components](#react-components)
- [Backend Development](#backend-development)
- [Database Practices](#database-practices)
- [Security Best Practices](#security-best-practices)
- [Performance Optimization](#performance-optimization)
- [Testing Guidelines](#testing-guidelines)
- [Git Workflow](#git-workflow)
- [Code Review Checklist](#code-review-checklist)

---

## 🎯 General Principles

### SOLID Principles

1. **Single Responsibility Principle (SRP)**
   - Each function/class should have one reason to change
   - One function = one task

   ```javascript
   // ❌ Bad - Multiple responsibilities
   function processOrder(order) {
     validateOrder(order);
     calculateTotal(order);
     updateInventory(order);
     sendEmail(order);
     generateReceipt(order);
   }

   // ✅ Good - Separated concerns
   function processOrder(order) {
     const validatedOrder = validateOrder(order);
     const total = calculateTotal(validatedOrder);
     return { order: validatedOrder, total };
   }

   function fulfillOrder(order) {
     updateInventory(order);
     sendConfirmationEmail(order);
     return generateReceipt(order);
   }
   ```

2. **Don't Repeat Yourself (DRY)**
   ```javascript
   // ❌ Bad - Repetition
   const totalCash = orders.filter(o => o.payment === 'cash')
     .reduce((sum, o) => sum + o.total, 0);
   const totalCard = orders.filter(o => o.payment === 'card')
     .reduce((sum, o) => sum + o.total, 0);

   // ✅ Good - Reusable function
   const sumByPaymentMethod = (orders, method) =>
     orders
       .filter(o => o.payment === method)
       .reduce((sum, o) => sum + o.total, 0);

   const totalCash = sumByPaymentMethod(orders, 'cash');
   const totalCard = sumByPaymentMethod(orders, 'card');
   ```

3. **KISS (Keep It Simple, Stupid)**
   ```javascript
   // ❌ Bad - Over-engineered
   const isEligibleForDiscount = (customer) => {
     const loyalty = customer.loyalty_points || 0;
     const orders = customer.total_orders || 0;
     const status = customer.status || 'regular';

     return (loyalty >= 1000 && orders >= 10) ||
            (loyalty >= 500 && status === 'premium') ||
            (orders >= 20 && status !== 'blocked');
   };

   // ✅ Good - Simple and clear
   const isEligibleForDiscount = (customer) => {
     return customer.loyalty_points >= 500 ||
            customer.total_orders >= 10;
   };
   ```

---

## 📜 JavaScript/TypeScript

### Naming Conventions

```javascript
// ✅ Variables and functions: camelCase
const totalAmount = 100;
function calculateTotal() { }

// ✅ Classes: PascalCase
class OrderProcessor { }

// ✅ Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

// ✅ Private properties: _prefix
class Product {
  _internalId = null;

  get id() {
    return this._internalId;
  }
}

// ✅ Boolean variables: is/has/should prefix
const isActive = true;
const hasPermission = false;
const shouldUpdate = true;

// ✅ Arrays: plural nouns
const products = [];
const orders = [];
const customers = [];
```

### Modern JavaScript

```javascript
// ✅ Use const/let, never var
const API_URL = 'http://localhost:3000';
let counter = 0;

// ✅ Arrow functions for callbacks
const doubled = numbers.map(n => n * 2);
const filtered = products.filter(p => p.price > 100);

// ✅ Destructuring
const { name, price } = product;
const [first, second] = array;

// ✅ Spread operator
const newOrder = { ...order, status: 'completed' };
const allItems = [...cart, ...wishlist];

// ✅ Template literals
const message = `Order ${orderId} total: $${total}`;

// ✅ Optional chaining
const city = customer?.address?.city ?? 'Unknown';

// ✅ Nullish coalescing
const quantity = order.quantity ?? 1;

// ✅ Async/await instead of promises
// ❌ Bad
function getProducts() {
  return fetch('/api/products')
    .then(res => res.json())
    .then(data => data.products)
    .catch(err => console.error(err));
}

// ✅ Good
async function getProducts() {
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    return data.products;
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
}
```

### Error Handling

```javascript
// ✅ Always use try-catch with async/await
async function createOrder(orderData) {
  try {
    const order = await OrderService.create(orderData);
    return { success: true, data: order };
  } catch (error) {
    logger.error('Order creation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ✅ Throw meaningful errors
if (!product) {
  throw new Error(`Product not found: ${productId}`);
}

// ✅ Custom error classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

throw new ValidationError('Price must be positive', 'price');
```

---

## ⚛️ React Components

### Component Structure

```jsx
// ✅ Proper component structure
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useProducts } from '../hooks/useProducts';
import { Button } from '../components/common';
import './ProductList.css';

/**
 * ProductList Component
 * Displays a list of products with search and filter
 */
export function ProductList({ category, onSelect }) {
  // 1. Hooks
  const [search, setSearch] = useState('');
  const { products, loading, error } = useProducts({ category, search });

  // 2. Effects
  useEffect(() => {
    // Track page view
    analytics.track('ProductList Viewed', { category });
  }, [category]);

  // 3. Event handlers
  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handleProductClick = (product) => {
    onSelect?.(product);
  };

  // 4. Render helpers
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (products.length === 0) return <div>No products found</div>;

  // 5. Main render
  return (
    <div className="product-list">
      <input
        type="search"
        value={search}
        onChange={handleSearch}
        placeholder="Search products..."
      />

      <div className="product-grid">
        {products.map(product => (
          <ProductCard
            key={product.product_id}
            product={product}
            onClick={() => handleProductClick(product)}
          />
        ))}
      </div>
    </div>
  );
}

// 6. PropTypes
ProductList.propTypes = {
  category: PropTypes.number,
  onSelect: PropTypes.func
};

// 7. Default props
ProductList.defaultProps = {
  category: null,
  onSelect: null
};
```

### Component Best Practices

```jsx
// ✅ Small, focused components
// ❌ Bad - Too much in one component
function Dashboard() {
  return (
    <div>
      {/* 500 lines of JSX */}
    </div>
  );
}

// ✅ Good - Broken into smaller components
function Dashboard() {
  return (
    <div className="dashboard">
      <DashboardHeader />
      <QuickStats />
      <SalesChart />
      <RecentOrders />
      <TopProducts />
    </div>
  );
}

// ✅ Extract complex logic to custom hooks
// ❌ Bad - Complex logic in component
function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/products')
      .then(res => res.json())
      .then(data => setProducts(data))
      .finally(() => setLoading(false));
  }, []);

  // ...
}

// ✅ Good - Custom hook
function useProducts(filters = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await ProductService.getAll(filters);
        setProducts(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [JSON.stringify(filters)]);

  return { products, loading, error };
}

// ✅ Memoize expensive computations
import { useMemo } from 'react';

function OrderSummary({ orders }) {
  const statistics = useMemo(() => ({
    total: orders.reduce((sum, o) => sum + o.total, 0),
    count: orders.length,
    average: orders.reduce((sum, o) => sum + o.total, 0) / orders.length
  }), [orders]);

  return <div>{/* Use statistics */}</div>;
}

// ✅ Use callback for event handlers passed as props
import { useCallback } from 'react';

function ProductList({ onSelect }) {
  const handleSelect = useCallback((product) => {
    onSelect(product);
  }, [onSelect]);

  return (
    <div>
      {products.map(p => (
        <Product key={p.id} onSelect={handleSelect} />
      ))}
    </div>
  );
}
```

---

## 🔧 Backend Development

### Controller Pattern

```javascript
// ✅ Proper controller structure
class ProductsController {
  /**
   * Get all products
   * GET /api/products
   */
  async getAll(req, res, next) {
    try {
      // 1. Extract and validate parameters
      const {
        page = 1,
        limit = 20,
        category,
        search,
        sort = 'name',
        order = 'asc'
      } = req.query;

      // 2. Business logic (delegate to service)
      const result = await ProductService.getProducts({
        page: parseInt(page),
        limit: parseInt(limit),
        category: category ? parseInt(category) : null,
        search,
        sort,
        order
      });

      // 3. Response
      return res.json({
        success: true,
        data: result.products,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      // 4. Error handling (delegate to middleware)
      next(error);
    }
  }

  /**
   * Create product
   * POST /api/products
   */
  async create(req, res, next) {
    try {
      // Validation already done by middleware
      const productData = req.body;

      // Business logic
      const product = await ProductService.createProduct(
        productData,
        req.user.user_id
      );

      // Audit log
      await AuditService.log({
        user_id: req.user.user_id,
        action: 'CREATE',
        table: 'products',
        record_id: product.product_id,
        changes: JSON.stringify(productData)
      });

      // Response
      return res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
```

### Service Layer

```javascript
// ✅ Business logic in services
class ProductService {
  static async getProducts(filters) {
    const { page, limit, category, search, sort, order } = filters;

    // Build query
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category_id = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (name LIKE ? OR sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY ${sort} ${order}`;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    // Execute query
    const products = db.prepare(query).all(...params);

    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1' +
      (category ? ' AND category_id = ?' : '') +
      (search ? ' AND (name LIKE ? OR sku LIKE ?)' : '');

    const countParams = [];
    if (category) countParams.push(category);
    if (search) countParams.push(`%${search}%`, `%${search}%`);

    const { total } = db.prepare(countQuery).get(...countParams);

    return {
      products,
      page,
      limit,
      total
    };
  }

  static async createProduct(productData, userId) {
    // Validation
    if (!productData.name) {
      throw new ValidationError('Product name is required', 'name');
    }

    if (productData.price <= 0) {
      throw new ValidationError('Price must be greater than 0', 'price');
    }

    // Check for duplicate SKU
    const existing = db.prepare(
      'SELECT product_id FROM products WHERE sku = ?'
    ).get(productData.sku);

    if (existing) {
      throw new ConflictError(`Product with SKU ${productData.sku} already exists`);
    }

    // Create product
    const result = db.prepare(`
      INSERT INTO products (
        name, sku, price, cost, category_id,
        description, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      productData.name,
      productData.sku,
      productData.price,
      productData.cost || 0,
      productData.category_id,
      productData.description || null,
      productData.is_active ?? true,
      userId
    );

    // Return created product
    return db.prepare(
      'SELECT * FROM products WHERE product_id = ?'
    ).get(result.lastInsertRowid);
  }
}
```

---

## 🗄️ Database Practices

### Query Optimization

```sql
-- ❌ Bad - No indexes, SELECT *
SELECT * FROM orders
WHERE customer_id = 123
AND created_at >= '2025-01-01';

-- ✅ Good - Specific columns, indexed fields
SELECT
  order_id,
  total_amount,
  status,
  created_at
FROM orders
WHERE customer_id = 123
AND created_at >= '2025-01-01'
ORDER BY created_at DESC
LIMIT 50;

-- Index: idx_orders_customer_date (customer_id, created_at)
```

### Transactions

```javascript
// ✅ Always use transactions for multiple operations
async function createOrderWithItems(orderData, items) {
  const db = getDatabase();

  // Begin transaction
  db.exec('BEGIN TRANSACTION');

  try {
    // 1. Create order
    const orderResult = db.prepare(`
      INSERT INTO orders (customer_id, total_amount, status)
      VALUES (?, ?, ?)
    `).run(orderData.customer_id, orderData.total, 'pending');

    const orderId = orderResult.lastInsertRowid;

    // 2. Create order items
    const insertItem = db.prepare(`
      INSERT INTO order_details (order_id, product_id, quantity, price)
      VALUES (?, ?, ?, ?)
    `);

    for (const item of items) {
      insertItem.run(orderId, item.product_id, item.quantity, item.price);
    }

    // 3. Update inventory
    const updateInventory = db.prepare(`
      UPDATE inventory_items
      SET quantity = quantity - ?
      WHERE product_id = ?
    `);

    for (const item of items) {
      updateInventory.run(item.quantity, item.product_id);
    }

    // Commit transaction
    db.exec('COMMIT');

    return orderId;
  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK');
    throw error;
  }
}
```

### Prepared Statements

```javascript
// ❌ Bad - SQL injection vulnerability
const email = req.body.email;
const query = `SELECT * FROM users WHERE email = '${email}'`;
const user = db.prepare(query).get();

// ✅ Good - Parameterized query
const email = req.body.email;
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

// ✅ Good - Named parameters
const user = db.prepare(
  'SELECT * FROM users WHERE email = :email AND status = :status'
).get({ email, status: 'active' });
```

---

## 🔒 Security Best Practices

### Input Validation

```javascript
// ✅ Always validate input
const Joi = require('joi');

const createProductSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  sku: Joi.string().pattern(/^[A-Z0-9-]+$/).required(),
  price: Joi.number().positive().required(),
  cost: Joi.number().positive().optional(),
  category_id: Joi.number().integer().positive().required(),
  description: Joi.string().max(1000).optional(),
  is_active: Joi.boolean().optional()
});

// In middleware
function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        }
      });
    }

    req.body = value;
    next();
  };
}
```

### Authentication & Authorization

```javascript
// ✅ Verify JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Access token required' }
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token' }
    });
  }
}

// ✅ Check permissions
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required' }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions' }
      });
    }

    next();
  };
}

// Usage
router.post('/products',
  authenticateToken,
  requireRole('admin', 'manager'),
  validateRequest(createProductSchema),
  ProductsController.create
);
```

### Password Hashing

```javascript
const bcrypt = require('bcrypt');

// ✅ Hash passwords
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// ✅ Verify passwords
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Usage in login
async function login(email, password) {
  const user = db.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).get(email);

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Generate JWT
  const token = jwt.sign(
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { user, token };
}
```

---

## ⚡ Performance Optimization

### Frontend Performance

```jsx
// ✅ Code splitting
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Reports = lazy(() => import('./pages/Reports'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Suspense>
  );
}

// ✅ Virtualize long lists
import { FixedSizeList } from 'react-window';

function ProductList({ products }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ProductCard product={products[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={products.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// ✅ Debounce search input
import { useMemo } from 'react';
import { debounce } from 'lodash';

function SearchInput({ onSearch }) {
  const debouncedSearch = useMemo(
    () => debounce(onSearch, 300),
    [onSearch]
  );

  return (
    <input
      type="search"
      onChange={(e) => debouncedSearch(e.target.value)}
    />
  );
}
```

### Backend Performance

```javascript
// ✅ Cache frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCategories() {
  const cacheKey = 'categories';
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const categories = db.prepare('SELECT * FROM categories').all();

  cache.set(cacheKey, {
    data: categories,
    timestamp: Date.now()
  });

  return categories;
}

// ✅ Batch database queries
async function getOrdersWithDetails(orderIds) {
  // ❌ Bad - N+1 queries
  const orders = [];
  for (const id of orderIds) {
    const order = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(id);
    const details = db.prepare('SELECT * FROM order_details WHERE order_id = ?').all(id);
    orders.push({ ...order, details });
  }

  // ✅ Good - 2 queries total
  const orders = db.prepare(
    `SELECT * FROM orders WHERE order_id IN (${orderIds.map(() => '?').join(',')})`
  ).all(...orderIds);

  const details = db.prepare(
    `SELECT * FROM order_details WHERE order_id IN (${orderIds.map(() => '?').join(',')})`
  ).all(...orderIds);

  // Group details by order
  const detailsByOrder = details.reduce((acc, detail) => {
    if (!acc[detail.order_id]) acc[detail.order_id] = [];
    acc[detail.order_id].push(detail);
    return acc;
  }, {});

  return orders.map(order => ({
    ...order,
    details: detailsByOrder[order.order_id] || []
  }));
}
```

---

## 🧪 Testing Guidelines

### Unit Tests

```javascript
// ✅ Test structure: Arrange, Act, Assert
describe('ProductService', () => {
  describe('createProduct', () => {
    it('should create a product with valid data', async () => {
      // Arrange
      const productData = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 100,
        category_id: 1
      };

      // Act
      const product = await ProductService.createProduct(productData, 1);

      // Assert
      expect(product).toBeDefined();
      expect(product.name).toBe('Test Product');
      expect(product.sku).toBe('TEST-001');
      expect(product.price).toBe(100);
    });

    it('should throw error for duplicate SKU', async () => {
      // Arrange
      const productData = {
        name: 'Test Product',
        sku: 'EXISTING-SKU',
        price: 100,
        category_id: 1
      };

      // Act & Assert
      await expect(
        ProductService.createProduct(productData, 1)
      ).rejects.toThrow('SKU already exists');
    });

    it('should throw error for invalid price', async () => {
      // Arrange
      const productData = {
        name: 'Test Product',
        sku: 'TEST-002',
        price: -10,
        category_id: 1
      };

      // Act & Assert
      await expect(
        ProductService.createProduct(productData, 1)
      ).rejects.toThrow('Price must be greater than 0');
    });
  });
});
```

---

## 🔄 Git Workflow

### Commit Messages

```bash
# ✅ Format: <type>(<scope>): <subject>

# Types:
feat: New feature
fix: Bug fix
docs: Documentation changes
style: Code style (formatting, missing semi-colons, etc.)
refactor: Code refactoring
test: Adding tests
chore: Maintenance tasks

# Examples:
git commit -m "feat(products): add bulk import functionality"
git commit -m "fix(auth): resolve token expiration issue"
git commit -m "docs(api): update product endpoints documentation"
git commit -m "test(inventory): add unit tests for stock adjustment"
```

### Branch Naming

```bash
# ✅ Format: <type>/<short-description>

# Types:
feature/ - New features
bugfix/ - Bug fixes
hotfix/ - Urgent production fixes
release/ - Release branches
docs/ - Documentation updates

# Examples:
git checkout -b feature/product-variants
git checkout -b bugfix/inventory-calculation
git checkout -b hotfix/critical-login-issue
git checkout -b docs/api-documentation
```

---

## ✅ Code Review Checklist

### General
- [ ] Code follows project style guide
- [ ] No console.log or commented code
- [ ] Meaningful variable/function names
- [ ] Proper error handling
- [ ] No hardcoded values (use constants)

### Security
- [ ] Input validation present
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Proper authentication/authorization
- [ ] Sensitive data not exposed

### Performance
- [ ] No unnecessary re-renders (React)
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Appropriate caching used
- [ ] Large lists virtualized

### Testing
- [ ] Unit tests included
- [ ] Tests cover edge cases
- [ ] All tests passing
- [ ] Coverage threshold met

### Documentation
- [ ] JSDoc comments for functions
- [ ] README updated if needed
- [ ] API documentation updated
- [ ] Breaking changes documented

---

**Last Updated:** November 20, 2025
**Version:** 2.1.0
