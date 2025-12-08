# 🤝 Contributing to SYSME POS

First off, thank you for considering contributing to SYSME POS! It's people like you that make SYSME POS such a great tool for the restaurant industry.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## 🎯 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Bug Report Template:**

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected behavior**
A clear description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
- OS: [e.g., Windows 11, Ubuntu 22.04]
- Node.js Version: [e.g., 18.17.0]
- Browser: [e.g., Chrome 119]
- SYSME POS Version: [e.g., 2.1.0]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

**Enhancement Template:**

```markdown
**Is your feature request related to a problem?**
A clear description of the problem. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features you've considered.

**Additional context**
Any other context, screenshots, or examples.

**Business value**
How this would benefit users/businesses.
```

### Your First Code Contribution

Unsure where to begin? Look for issues labeled:

- `good first issue` - Simple issues for newcomers
- `help wanted` - Issues where we need community help
- `documentation` - Documentation improvements
- `bug` - Bug fixes needed

### Pull Requests

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🔧 Development Setup

### Prerequisites

- Node.js 18+ LTS
- npm 9+ or yarn 1.22+
- Git
- Code editor (VS Code recommended)

### Initial Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/sysme-pos.git
cd sysme-pos

# Install dependencies
npm install

# Backend setup
cd backend
npm install
node init-database.js

# Start development environment
cd ..
npm run dev
```

### Project Structure

```
sysme-pos/
├── backend/           # Node.js/Express backend
│   ├── controllers/   # Request handlers
│   ├── routes/        # API routes
│   ├── middleware/    # Express middleware
│   ├── services/      # Business logic
│   └── tests/         # Backend tests
├── src/               # React frontend
│   ├── api/          # API clients
│   ├── components/   # React components
│   ├── pages/        # Page components
│   ├── store/        # State management
│   └── utils/        # Utilities
└── docs/             # Documentation
```

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/my-new-feature

# Make changes and test
npm run dev

# Run tests
cd backend && npm test

# Check code style
npm run lint

# Format code
npm run format

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/my-new-feature
```

---

## 💻 Coding Standards

### JavaScript/TypeScript Style

We follow industry best practices:

- **ESLint**: Configured for both backend and frontend
- **Prettier**: For consistent code formatting
- **TypeScript**: Strict mode enabled for frontend

**Key Rules:**
- Use 2 spaces for indentation
- Use single quotes for strings
- Use semicolons
- Max line length: 100 characters
- Use camelCase for variables and functions
- Use PascalCase for classes and components
- Use UPPER_CASE for constants

**Example:**

```javascript
// Good ✅
const calculateTotal = (items) => {
  return items.reduce((sum, item) => sum + item.price, 0);
};

// Bad ❌
function Calculate_Total(items) {
    var total=0
    for(var i=0;i<items.length;i++){
        total=total+items[i].price
    }
    return total
}
```

### React/TypeScript Guidelines

```typescript
// Good ✅
interface ProductProps {
  id: number;
  name: string;
  price: number;
  onSelect: (id: number) => void;
}

const Product: React.FC<ProductProps> = ({ id, name, price, onSelect }) => {
  const handleClick = () => {
    onSelect(id);
  };

  return (
    <div className="product-card" onClick={handleClick}>
      <h3>{name}</h3>
      <p>${price.toFixed(2)}</p>
    </div>
  );
};

export default Product;
```

### Backend API Guidelines

```javascript
// Good ✅
const getProducts = async (req, res, next) => {
  try {
    const { category_id, search, limit = 50, offset = 0 } = req.query;

    // Validate inputs
    if (limit > 100) {
      return res.status(400).json({
        success: false,
        error: { message: 'Limit cannot exceed 100' }
      });
    }

    // Query database
    const products = await dbManager.all(
      'SELECT * FROM products WHERE is_active = 1 LIMIT ? OFFSET ?',
      [limit, offset]
    );

    // Return standardized response
    res.json({
      success: true,
      data: products,
      meta: { limit, offset, total: products.length }
    });
  } catch (error) {
    next(error);
  }
};
```

### Database Queries

```javascript
// Good ✅ - Use parameterized queries
const product = await db.get(
  'SELECT * FROM products WHERE id = ?',
  [productId]
);

// Bad ❌ - SQL injection risk
const product = await db.get(
  `SELECT * FROM products WHERE id = ${productId}`
);
```

---

## 📝 Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples

```bash
# Feature
feat(pos): add split payment support

# Bug fix
fix(inventory): resolve stock count calculation error

# Documentation
docs(api): update authentication endpoint examples

# Refactor
refactor(customers): optimize loyalty points calculation

# Breaking change
feat(auth)!: migrate to JWT refresh tokens

BREAKING CHANGE: Auth endpoints now require refresh token
```

### Commit Message Best Practices

✅ **Good:**
```
feat(pos): add table transfer functionality

- Allow servers to transfer orders between tables
- Update order history with transfer audit log
- Add permission check for table transfers

Closes #123
```

❌ **Bad:**
```
fixed stuff
```

---

## 🔀 Pull Request Process

### Before Submitting

1. **Update Documentation**: If you've changed APIs, update the README
2. **Add Tests**: Ensure new features have test coverage
3. **Run Tests**: `npm test` must pass
4. **Lint Code**: `npm run lint` must pass with no errors
5. **Update Changelog**: Add entry to CHANGELOG.md

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
- [ ] Dependent changes merged

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #(issue number)
```

### Review Process

1. **Automated Checks**: CI/CD pipeline must pass
2. **Code Review**: At least one maintainer approval required
3. **Testing**: Changes must be tested
4. **Documentation**: Must be updated if needed

### After Approval

- Maintainers will merge your PR
- Your contribution will be credited in the changelog
- PR will be linked in the next release notes

---

## 🧪 Testing Guidelines

### Backend Testing (Jest + Supertest)

```javascript
describe('Products API', () => {
  let authToken;

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    authToken = response.body.data.token;
  });

  it('should get all products', async () => {
    const response = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should create a product', async () => {
    const newProduct = {
      name: 'Test Product',
      sku: 'TEST-001',
      price: 10.99,
      cost: 5.00
    };

    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send(newProduct);

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('product_id');
  });
});
```

### Frontend Testing (Vitest + React Testing Library)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Product from './Product';

describe('Product Component', () => {
  it('renders product information', () => {
    const product = {
      id: 1,
      name: 'Test Product',
      price: 10.99
    };

    render(<Product {...product} onSelect={vi.fn()} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$10.99')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    const product = { id: 1, name: 'Test', price: 10 };

    render(<Product {...product} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Test'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
```

### Test Coverage Requirements

- **Minimum Coverage**: 70% overall
- **Critical Paths**: 90%+ coverage
- **New Features**: Must include tests
- **Bug Fixes**: Add regression tests

---

## 📚 Documentation

### Code Documentation

Use JSDoc for JavaScript/TypeScript:

```javascript
/**
 * Calculate the total amount for an order including taxes and discounts
 * @param {Object} order - The order object
 * @param {Array} order.items - Array of order items
 * @param {number} order.discount - Discount percentage (0-100)
 * @param {number} order.taxRate - Tax rate as decimal (e.g., 0.15 for 15%)
 * @returns {number} Total amount including tax and discount
 * @throws {Error} If order items are invalid
 */
const calculateOrderTotal = (order) => {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new Error('Order must contain at least one item');
  }

  const subtotal = order.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  const discountAmount = subtotal * (order.discount / 100);
  const afterDiscount = subtotal - discountAmount;
  const tax = afterDiscount * order.taxRate;

  return afterDiscount + tax;
};
```

### API Documentation

Update OpenAPI/Swagger specs when adding endpoints:

```yaml
/api/products:
  get:
    summary: Get all products
    tags:
      - Products
    parameters:
      - name: category_id
        in: query
        schema:
          type: integer
      - name: search
        in: query
        schema:
          type: string
    responses:
      200:
        description: Successful response
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  type: array
                  items:
                    $ref: '#/components/schemas/Product'
```

---

## 🌍 Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Pull Requests**: Code contributions

### Getting Help

1. Check existing documentation
2. Search closed issues
3. Ask in GitHub Discussions
4. Create a new issue if needed

### Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in the changelog
- Added to GitHub contributors list

---

## 📊 Project Roadmap

See our [Project Roadmap](https://github.com/your-repo/projects) for upcoming features and priorities.

**Current Focus:**
- v2.1: Current stable release
- v2.2: AI & Intelligence features (Q1 2026)
- v2.3: Mobile applications (Q2 2026)
- v2.4: Advanced integrations (Q3 2026)

---

## 🏆 Recognition

Thank you to all our contributors! Your efforts make SYSME POS better for everyone.

### Top Contributors
<!-- This will be automatically updated -->

### Hall of Fame
<!-- Notable contributions will be listed here -->

---

## 📄 License

By contributing to SYSME POS, you agree that your contributions will be licensed under the MIT License.

---

## ❓ Questions?

Don't hesitate to ask questions! We're here to help:

- Open a GitHub Discussion
- Comment on relevant issues
- Reach out to maintainers

---

**Thank you for contributing to SYSME POS! 🎉**

Together, we're building the best open-source restaurant management system.
