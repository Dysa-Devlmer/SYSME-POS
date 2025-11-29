# 🤖 AI/ML Features Guide - SYSME POS v2.1

**Complete guide to Artificial Intelligence and Machine Learning capabilities**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Demand Forecasting](#demand-forecasting)
3. [Smart Recommendations](#smart-recommendations)
4. [Proactive Alerts](#proactive-alerts)
5. [AI Dashboard](#ai-dashboard)
6. [API Reference](#api-reference)
7. [Frontend Components](#frontend-components)
8. [Configuration](#configuration)
9. [Best Practices](#best-practices)

---

## 🎯 Overview

SYSME POS v2.1 includes enterprise-grade AI/ML capabilities inspired by JARVIS AI Assistant, providing intelligent automation and predictive analytics for restaurant operations.

### Core AI Systems

1. **Demand Forecasting** - Predict future product demand
2. **Smart Recommendations** - Personalized product suggestions
3. **Proactive Alerts** - Automated monitoring and warnings
4. **Pattern Analysis** - Sales and customer behavior insights

### Key Benefits

- 📈 **Increase Sales** - AI-powered upselling and cross-selling
- 📊 **Reduce Waste** - Accurate demand prediction prevents overstocking
- ⚡ **Proactive Operations** - Get alerted before problems occur
- 🎯 **Personalization** - Tailored recommendations for each customer
- 🧠 **Data-Driven Decisions** - Insights based on historical patterns

---

## 📊 Demand Forecasting

### Overview

Predicts product demand using time-series analysis, seasonality detection, and pattern recognition.

### Features

- **7-Day Predictions** - Rolling forecast for the week ahead
- **Trend Analysis** - Detect increasing, decreasing, or stable patterns
- **Seasonality Detection** - Identify weekly patterns and peak days
- **Confidence Scores** - Know how reliable each prediction is
- **Reorder Recommendations** - Automated stock-out prevention

### How It Works

```
Historical Sales Data (90 days)
         ↓
1. Extract daily quantities
2. Calculate moving averages (MA7)
3. Apply exponential smoothing (EMA)
4. Detect trend via linear regression
5. Identify day-of-week patterns
6. Generate 7-day predictions
         ↓
Forecast with Confidence Scores
```

### Algorithms Used

1. **Moving Average (MA7)** - Smooths short-term fluctuations
2. **Exponential Moving Average (EMA)** - Weights recent data higher
3. **Linear Regression** - Identifies overall trend direction
4. **Seasonality Analysis** - Day-of-week pattern detection

### API Endpoints

```http
GET /api/ai/forecast/:productId?daysAhead=7
```

**Response:**
```json
{
  "success": true,
  "data": {
    "product_id": 42,
    "predictions": [
      {
        "date": "2025-11-22",
        "day_of_week": 5,
        "predicted_quantity": 35,
        "confidence_score": 0.82
      }
    ],
    "trend": "increasing",
    "confidence": "high",
    "historical_avg": 28.5,
    "data_points": 87
  }
}
```

### Reorder Recommendations

```http
GET /api/ai/reorder-recommendations?confidence_threshold=0.6
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "product_id": 15,
      "product_name": "Premium Burger",
      "current_stock": 12,
      "predicted_demand_7d": 45,
      "shortfall": 33,
      "recommended_order_quantity": 40,
      "urgency": 90,
      "confidence": 0.85,
      "trend": "increasing",
      "stock_out_risk": "high"
    }
  ],
  "count": 5
}
```

### Frontend Component

```tsx
import { DemandForecast } from '@/components/ai';

<DemandForecast
  productId={42}
  productName="Premium Burger"
  daysAhead={7}
  onDataLoaded={(data) => console.log(data)}
/>
```

### Best Practices

- ✅ Minimum 14 days of sales history required
- ✅ More data = higher confidence (90+ days ideal)
- ✅ Review forecasts weekly and adjust orders
- ✅ Pay attention to confidence scores
- ✅ Consider external factors (holidays, events)

---

## 🎯 Smart Recommendations

### Overview

AI-powered product recommendation engine using collaborative and content-based filtering.

### Recommendation Types

#### 1. Personalized Recommendations

**For:** Individual customers based on purchase history

**Algorithm:**
- Collaborative filtering (find similar customers)
- Content-based filtering (similar products)
- Hybrid approach (combines both)

**API:**
```http
GET /api/ai/recommendations/:customerId?limit=10
```

#### 2. Frequently Bought Together

**For:** Products commonly purchased together

**Algorithm:**
- Association rule mining
- Minimum support threshold (3+ co-purchases)
- Confidence scoring

**API:**
```http
GET /api/ai/frequently-bought-together/:productId?limit=5
```

#### 3. Upsell Options

**For:** Higher-value alternatives in same category

**Algorithm:**
- Category matching
- Price range filtering (up to 150% of original)
- Popularity ranking

**API:**
```http
GET /api/ai/upsell/:productId?limit=3
```

#### 4. Cross-Sell Suggestions

**For:** Cart-based add-on recommendations

**Algorithm:**
- Analyze all cart items
- Find complementary products
- Score by co-purchase frequency

**API:**
```http
POST /api/ai/cross-sell
{
  "cartItems": [
    { "product_id": 10, "quantity": 2 },
    { "product_id": 15, "quantity": 1 }
  ],
  "limit": 5
}
```

#### 5. Trending Products

**For:** Products with growing demand

**Algorithm:**
- Compare last 7 days vs previous 7 days
- Calculate growth rate
- Filter by positive growth

**API:**
```http
GET /api/ai/trending?limit=10
```

### Frontend Component

```tsx
import { SmartRecommendations } from '@/components/ai';

// Frequently bought together
<SmartRecommendations
  type="frequently-bought"
  currentProductId={42}
  onAddToCart={(product) => addToCart(product)}
/>

// Personalized for customer
<SmartRecommendations
  type="personalized"
  customerId={123}
  onAddToCart={(product) => addToCart(product)}
/>

// Cart-based cross-sell
<SmartRecommendations
  type="cross-sell"
  cartItems={cartItems}
  onAddToCart={(product) => addToCart(product)}
/>
```

### Integration Example (POS)

```tsx
// In POS checkout screen
const CheckoutScreen = () => {
  const { cart, customer } = useCheckout();

  return (
    <div>
      {/* Cart items */}
      <CartItems items={cart} />

      {/* AI Recommendations */}
      <SmartRecommendations
        type="cross-sell"
        cartItems={cart}
        onAddToCart={addToCart}
      />

      {customer && (
        <SmartRecommendations
          type="personalized"
          customerId={customer.id}
          onAddToCart={addToCart}
        />
      )}
    </div>
  );
};
```

### Scoring System

```
Collaborative Score = (bought_by_similar / total_similar) * 0.7
                    + (frequency / 10) * 0.3

Content Score = (popularity / 50) * 0.7
              + (category_match / 5) * 0.3

Combined Score = collaborative_score * 1.5 + content_score
```

---

## 🚨 Proactive Alerts

### Overview

Automated monitoring system that detects issues and generates intelligent alerts before they become problems.

### Alert Types

#### 1. Low Stock Alerts

**Triggers:**
- Stock below reorder point
- Predicted stock-out within 3 days

**Example:**
```json
{
  "type": "low_stock",
  "severity": "high",
  "title": "Low Stock Alert: Premium Burger",
  "message": "Current stock (8 units) below reorder point (15 units)",
  "data": {
    "product_id": 42,
    "current_stock": 8,
    "reorder_point": 15
  },
  "recommended_action": "Order 50 units immediately"
}
```

#### 2. Stock-Out Predictions

**Triggers:**
- AI predicts stock-out within 7 days
- Confidence > 70%

#### 3. Sales Anomalies

**Triggers:**
- Sales drop > 30% from average
- Unusual sales spike

**Example:**
```json
{
  "type": "sales_anomaly",
  "severity": "medium",
  "title": "Sales Drop Detected: Chicken Wings",
  "message": "Sales 45% below average (10 vs 18 units/day)",
  "data": {
    "product_id": 25,
    "current_sales": 10,
    "expected_sales": 18,
    "drop_percentage": 45
  },
  "recommended_action": "Check product quality and pricing"
}
```

#### 4. Expiring Products

**Triggers:**
- Products expiring within 7 days
- Products expiring within 3 days (critical)

### Severity Levels

| Level | Color | Use Case |
|-------|-------|----------|
| **Critical** | 🔴 Red | Immediate action required |
| **High** | 🟠 Orange | Urgent, address within hours |
| **Medium** | 🟡 Yellow | Important, address within day |
| **Low** | 🔵 Blue | Informational, monitor |

### API Endpoints

```http
# Run monitoring and get alerts
GET /api/ai/alerts/monitor

# Get active alerts (with filters)
GET /api/ai/alerts?severity=critical&type=low_stock&limit=20

# Dismiss an alert
PUT /api/ai/alerts/:alertId/dismiss

# Take automated action
POST /api/ai/alerts/:alertId/action
{
  "action": "auto_reorder"
}

# Get alert statistics
GET /api/ai/alerts/statistics?daysBack=30
```

### Frontend Component

```tsx
import { ProactiveAlerts } from '@/components/ai';

<ProactiveAlerts
  showDismissed={false}
  autoRefresh={true}
  refreshInterval={60000}
  maxAlerts={20}
  filterSeverity={['critical', 'high']}
  onAlertClick={(alert) => handleAlert(alert)}
/>
```

### Automated Actions

The system can automatically respond to certain alerts:

```typescript
// Example: Auto-reorder on critical stock alerts
const response = await aiService.takeAlertAction(alertId, 'auto_reorder');

// Available actions:
// - auto_reorder: Create purchase order
// - notify_manager: Send notification
// - adjust_price: Apply dynamic pricing
// - promote_product: Create promotion
```

### Monitoring Schedule

```javascript
// Backend monitoring runs:
// - Every 5 minutes for critical checks
// - Every 15 minutes for inventory
// - Every 30 minutes for sales patterns
// - Every hour for expiring products
```

---

## 📱 AI Dashboard

### Overview

Centralized dashboard displaying all AI/ML insights and metrics.

### Components

1. **Stats Overview**
   - Active alerts count
   - Reorder recommendations
   - Trending products count
   - AI confidence level

2. **Active Alerts Panel**
   - Real-time alert feed
   - Severity filtering
   - Dismiss functionality

3. **Reorder Recommendations**
   - Urgent items highlighted
   - Stock-out risk indicators
   - Recommended quantities

4. **Trending Products**
   - Growth percentage
   - Sales comparison
   - Visual indicators

### API Endpoint

```http
GET /api/ai/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reorder_recommendations": {
      "count": 8,
      "urgent": 3,
      "items": [...]
    },
    "active_alerts": {
      "total": 12,
      "critical": 2,
      "high": 5,
      "items": [...]
    },
    "trending_products": {
      "count": 10,
      "items": [...]
    },
    "alert_statistics": {...}
  }
}
```

### Frontend Component

```tsx
import { AIDashboard } from '@/components/ai';

<AIDashboard />
```

### Auto-Refresh

The dashboard automatically refreshes every 5 minutes to show the latest AI insights.

---

## 🔌 API Reference

### Base URL

```
http://localhost:3000/api/ai
```

### Authentication

All endpoints require JWT authentication (except public endpoints marked below).

```http
Authorization: Bearer <your-jwt-token>
```

### Complete Endpoint List

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/forecast/:productId` | Get demand forecast | ✅ Admin/Manager |
| `GET` | `/reorder-recommendations` | Get reorder suggestions | ✅ Admin/Manager |
| `GET` | `/patterns/sales` | Sales pattern analysis | ✅ Admin/Manager |
| `GET` | `/recommendations/:customerId` | Personalized recommendations | ✅ Yes |
| `GET` | `/frequently-bought-together/:productId` | FBT products | ❌ Public |
| `GET` | `/upsell/:productId` | Upsell options | ❌ Public |
| `POST` | `/cross-sell` | Cross-sell suggestions | ❌ Public |
| `GET` | `/trending` | Trending products | ❌ Public |
| `GET` | `/alerts/monitor` | Run monitoring | ✅ Admin/Manager |
| `GET` | `/alerts` | Get active alerts | ✅ Admin/Manager |
| `PUT` | `/alerts/:alertId/dismiss` | Dismiss alert | ✅ Admin/Manager |
| `POST` | `/alerts/:alertId/action` | Take action | ✅ Admin only |
| `GET` | `/alerts/statistics` | Alert stats | ✅ Admin/Manager |
| `GET` | `/dashboard` | AI dashboard | ✅ Admin/Manager |

---

## 🎨 Frontend Components

### Installation

```bash
# Components are in src/components/ai/
import {
  AIDashboard,
  SmartRecommendations,
  ProactiveAlerts,
  DemandForecast
} from '@/components/ai';
```

### Component Props

#### AIDashboard

```typescript
interface AIDashboardProps {
  // No props - fully self-contained
}
```

#### SmartRecommendations

```typescript
interface SmartRecommendationsProps {
  currentProductId?: number;
  customerId?: number;
  cartItems?: any[];
  onAddToCart?: (product: Product) => void;
  type: 'frequently-bought' | 'upsell' | 'cross-sell' | 'trending' | 'personalized';
}
```

#### ProactiveAlerts

```typescript
interface ProactiveAlertsProps {
  showDismissed?: boolean;        // Default: false
  autoRefresh?: boolean;          // Default: true
  refreshInterval?: number;       // Default: 60000 (1 min)
  maxAlerts?: number;             // Default: 20
  filterSeverity?: string[];      // Default: []
  filterType?: string[];          // Default: []
  onAlertClick?: (alert: Alert) => void;
}
```

#### DemandForecast

```typescript
interface DemandForecastProps {
  productId: number;
  productName?: string;
  daysAhead?: number;             // Default: 7
  onDataLoaded?: (data: ForecastData) => void;
}
```

---

## ⚙️ Configuration

### Backend Configuration

```javascript
// backend/services/ai/demand-forecasting.service.js
const config = {
  historicalDays: 90,           // Days of history to analyze
  movingAverageWindow: 7,       // MA window size
  emaAlpha: 0.3,               // EMA smoothing factor
  minDataPoints: 14,           // Minimum data required
  confidenceThreshold: 0.6     // Minimum confidence
};
```

### Frontend Configuration

```typescript
// src/services/ai.service.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
```

### Environment Variables

```bash
# .env
VITE_API_URL=http://localhost:3000/api
VITE_AI_ENABLED=true
VITE_AI_AUTO_REFRESH=true
VITE_AI_REFRESH_INTERVAL=300000  # 5 minutes
```

---

## 📚 Best Practices

### 1. Data Quality

- ✅ Ensure accurate sales recording
- ✅ Keep product data up-to-date
- ✅ Maintain customer purchase history
- ✅ Record complete order details

### 2. Confidence Thresholds

```
High Confidence (>70%):    Trust predictions, act automatically
Medium Confidence (50-70%): Review before acting
Low Confidence (<50%):      Use as general guidance only
```

### 3. Alert Management

- ✅ Review critical alerts immediately
- ✅ Set up email/SMS notifications for critical alerts
- ✅ Dismiss resolved alerts to keep dashboard clean
- ✅ Monitor alert statistics weekly

### 4. Recommendation Usage

```tsx
// ✅ Good: Context-appropriate recommendations
<SmartRecommendations type="frequently-bought" currentProductId={42} />

// ❌ Bad: Multiple recommendation types fighting for attention
<SmartRecommendations type="frequently-bought" ... />
<SmartRecommendations type="upsell" ... />
<SmartRecommendations type="cross-sell" ... />
<SmartRecommendations type="trending" ... />
```

### 5. Performance Optimization

- Cache forecast results (5-minute TTL)
- Lazy-load AI components
- Paginate alert lists
- Use debouncing for auto-refresh

### 6. Testing

```bash
# Run AI service tests
npm test -- ai.service.test.js

# Test with demo data
npm run seed:demo-data

# Monitor AI performance
curl http://localhost:3000/api/ai/dashboard
```

---

## 🎓 Machine Learning Concepts

### Time Series Forecasting

SYSME POS uses classical time series methods:

1. **Trend Component**: Overall direction (up/down/stable)
2. **Seasonal Component**: Recurring patterns (day-of-week)
3. **Residual Component**: Random variation

**Formula:**
```
Y(t) = Trend(t) + Seasonal(t) + Residual(t)
```

### Collaborative Filtering

Finds patterns in customer behavior:

**User-Based:**
```
"Customers similar to you bought X"
```

**Item-Based:**
```
"Customers who bought A also bought B"
```

**Similarity Metric:**
```
Jaccard Similarity = |A ∩ B| / |A ∪ B|
```

### Content-Based Filtering

Recommends based on item attributes:

```
Score = CategoryMatch × Weight + PriceRange × Weight + PopularityScore × Weight
```

---

## 🚀 Future Enhancements

### Planned Features

- [ ] Deep learning models (LSTM/GRU for forecasting)
- [ ] Customer churn prediction
- [ ] Dynamic pricing optimization
- [ ] Menu optimization (profitability analysis)
- [ ] Ingredient demand forecasting
- [ ] Staff scheduling optimization
- [ ] Voice-activated AI assistant
- [ ] Natural language query interface
- [ ] Anomaly detection (fraud, errors)
- [ ] A/B testing for promotions

---

## 📞 Support

For questions or issues with AI features:

- 📧 Email: support@sysme-pos.com
- 📚 Docs: [AI Features Documentation](./AI-FEATURES-GUIDE.md)
- 🐛 Issues: [GitHub Issues](https://github.com/your-repo/issues)

---

**Last Updated:** November 21, 2025
**Version:** 2.1.0
**AI/ML Status:** ✅ Production Ready
