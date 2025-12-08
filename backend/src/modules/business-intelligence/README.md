# Business Intelligence Module

## 🧠 Overview

The Business Intelligence (BI) module provides advanced analytics, forecasting, and data-driven insights for the SYSME POS system. It includes machine learning-powered sales forecasting, customer segmentation, menu engineering, anomaly detection, and real-time executive dashboards.

## 🚀 Key Features

### 1. **Sales Forecasting with ML**
- 📈 30-day sales predictions using exponential smoothing
- 📊 Seasonality and trend analysis
- 🎯 Product-level demand forecasting
- 💰 Cash flow predictions
- 📦 Inventory optimization recommendations

### 2. **Menu Engineering (BCG Matrix)**
- ⭐ Star/Puzzle/Plow Horse/Dog classification
- 💲 Optimal pricing recommendations
- 🍔 Combo and bundle suggestions
- 📊 Category performance analysis
- 🔄 Price elasticity calculations

### 3. **Customer RFM Analysis**
- 👥 Customer segmentation (Champions, At Risk, Lost, etc.)
- 📉 Churn prediction with probability scores
- 💎 Lifetime value calculations
- 🎯 Personalized next-best actions
- 📧 Targeted retention campaigns

### 4. **Anomaly Detection**
- 🚨 Fraud detection in real-time
- 💳 Unusual transaction patterns
- 📦 Inventory discrepancies
- 💸 Excessive refunds monitoring
- ⚡ Velocity anomalies detection

### 5. **Executive Dashboard**
- 📊 Real-time KPIs and metrics
- 📈 Sales, operational, and financial metrics
- 🎯 Trend analysis and insights
- ⚠️ Smart alerts and notifications
- 📱 WebSocket-powered live updates

### 6. **AI Recommendation Engine**
- 💡 Business improvement suggestions
- 🎯 Prioritized action items
- 📊 ROI estimations
- 📈 Implementation tracking
- 🔄 Continuous learning

## 📁 Module Structure

```
business-intelligence/
├── index.ts                 # Main module entry point
├── services/
│   ├── ForecastingService.ts      # ML-powered forecasting
│   ├── MenuEngineeringService.ts  # BCG Matrix analysis
│   ├── RFMAnalysisService.ts      # Customer segmentation
│   ├── AnomalyDetectionService.ts # Fraud & anomaly detection
│   ├── DashboardService.ts        # Executive metrics
│   └── RecommendationEngine.ts    # AI recommendations
├── routes/
│   ├── analytics.routes.ts    # Analytics endpoints
│   ├── forecasting.routes.ts  # Forecasting endpoints
│   ├── dashboard.routes.ts    # Dashboard endpoints
│   └── reports.routes.ts      # Report generation
├── websocket/
│   └── bi.websocket.ts        # Real-time updates
└── README.md                  # This file
```

## 🔌 API Endpoints

### Dashboard & Metrics
- `GET /api/v1/business-intelligence/dashboard/metrics` - Get dashboard metrics
- `GET /api/v1/business-intelligence/dashboard/executive-summary` - Executive summary
- `GET /api/v1/business-intelligence/dashboard/recommendations` - Get AI recommendations

### Forecasting
- `GET /api/v1/business-intelligence/forecasting/sales` - Sales forecast (30 days)
- `GET /api/v1/business-intelligence/forecasting/sales/product/:id` - Product forecast
- `GET /api/v1/business-intelligence/forecasting/inventory` - Inventory recommendations
- `GET /api/v1/business-intelligence/forecasting/cash-flow` - Cash flow prediction

### Menu Analytics
- `GET /api/v1/business-intelligence/analytics/menu/analysis` - BCG Matrix analysis
- `GET /api/v1/business-intelligence/analytics/menu/categories` - Category performance
- `GET /api/v1/business-intelligence/analytics/menu/pricing` - Price optimization
- `GET /api/v1/business-intelligence/analytics/menu/combos` - Combo recommendations

### Customer Analytics
- `GET /api/v1/business-intelligence/analytics/customers/rfm` - RFM analysis
- `GET /api/v1/business-intelligence/analytics/customers/segments` - Customer segments
- `GET /api/v1/business-intelligence/analytics/customers/churn` - Churn predictions
- `GET /api/v1/business-intelligence/analytics/customers/retention-campaigns` - Campaigns

### Anomaly Detection
- `GET /api/v1/business-intelligence/forecasting/anomalies` - Detect anomalies
- `GET /api/v1/business-intelligence/forecasting/anomalies/summary` - Anomaly summary
- `PUT /api/v1/business-intelligence/forecasting/anomalies/:id/status` - Update status

### Reports
- `GET /api/v1/business-intelligence/reports/comprehensive` - Full business report
- `GET /api/v1/business-intelligence/reports/sales-performance` - Sales report
- `GET /api/v1/business-intelligence/reports/customer-analytics` - Customer report
- `GET /api/v1/business-intelligence/reports/menu-optimization` - Menu report
- `GET /api/v1/business-intelligence/reports/operational-efficiency` - Operations report

## 🔄 WebSocket Events

### Subscribe Events
```javascript
// Subscribe to dashboard updates
socket.emit('subscribe:dashboard', { period: 'today' });

// Subscribe to anomaly detection
socket.emit('subscribe:anomalies');

// Subscribe to forecast updates
socket.emit('subscribe:forecasts');
```

### Receive Events
```javascript
// Dashboard metrics update
socket.on('dashboard:metrics', (metrics) => {
  // Handle dashboard update
});

// Anomaly detected
socket.on('anomaly:detected', (anomaly) => {
  // Handle new anomaly
});

// Forecast updated
socket.on('forecast:updated', (forecast) => {
  // Handle forecast update
});

// Critical alert
socket.on('alert:critical', (alert) => {
  // Handle critical alert
});
```

## 💻 Frontend Integration

### Installation
```javascript
import biService from './services/biService';
```

### Basic Usage
```javascript
// Initialize WebSocket connection
biService.initializeWebSocket(authToken);

// Get dashboard metrics
const metrics = await biService.getDashboardMetrics('today');

// Get sales forecast
const forecast = await biService.getSalesForecast(30);

// Get menu analysis
const menuAnalysis = await biService.getMenuAnalysis();

// Subscribe to real-time updates
biService.subscribeToDashboard('today', (metrics) => {
  console.log('Dashboard updated:', metrics);
});

// Get AI recommendations
const recommendations = await biService.getRecommendations();

// Export reports
await biService.exportReport('customers', 'csv');
```

## 🎯 Key Metrics Tracked

### Sales Metrics
- Today/Yesterday/WTD/MTD/YTD sales
- Growth rate
- Average ticket size
- Conversion rate

### Operational Metrics
- Order accuracy
- Service speed
- Table turnover
- Labor cost %
- Food cost %
- Waste %

### Customer Metrics
- New customers
- Returning rate
- Satisfaction score
- Lifetime value
- Churn rate

### Financial Metrics
- Gross margin
- Net margin
- Cash flow
- Revenue per employee
- Break-even point

## 🔮 Machine Learning Models

### Sales Forecasting
- **Algorithm**: Exponential Smoothing with Seasonality
- **Features**: Historical sales, day of week, month, holidays
- **Output**: Daily predictions with confidence intervals

### Customer Segmentation
- **Algorithm**: RFM Scoring (Recency, Frequency, Monetary)
- **Segments**: 11 distinct customer segments
- **Output**: Segment assignment and recommendations

### Anomaly Detection
- **Algorithm**: Statistical outlier detection
- **Types**: Fraud, refunds, discounts, inventory, patterns
- **Output**: Anomaly severity and confidence scores

### Menu Engineering
- **Algorithm**: BCG Matrix Classification
- **Dimensions**: Profitability vs Popularity
- **Output**: Item classification and optimization strategies

## 📊 Report Types

### 1. Comprehensive Business Report
Complete overview including all metrics, forecasts, and recommendations

### 2. Sales Performance Report
Detailed sales analysis with forecasts and trends

### 3. Customer Analytics Report
RFM analysis, segmentation, and retention strategies

### 4. Menu Optimization Report
BCG matrix, pricing recommendations, combo suggestions

### 5. Operational Efficiency Report
Productivity metrics, anomalies, and improvement areas

## ⚙️ Configuration

### Environment Variables
```env
# BI Module Settings
BI_FORECAST_DAYS=30
BI_ANOMALY_THRESHOLD=3.0
BI_AUTO_UPDATE_INTERVAL=300000
BI_MODEL_TRAINING_SCHEDULE="0 2 * * *"
```

### Initialization
```javascript
// In server.js
import biRoutes, { initializeBIModule, biWebSocket } from './modules/business-intelligence/index.js';

// Initialize module
initializeBIModule();

// Initialize WebSocket
biWebSocket.initializeWebSocket(io);

// Mount routes
app.use('/api/v1/business-intelligence', authenticate, biRoutes);
```

## 🔒 Security

- All endpoints require authentication
- Role-based access control (admin for certain operations)
- Rate limiting on API endpoints
- Data sanitization and validation
- Secure WebSocket connections

## 📈 Performance

- Caching for frequently accessed metrics
- Optimized database queries with indexes
- Background job processing for heavy computations
- WebSocket for real-time updates (reduces polling)
- Lazy loading of historical data

## 🧪 Testing

```bash
# Run tests
npm test -- business-intelligence

# Test specific service
npm test -- ForecastingService

# Integration tests
npm run test:integration -- business-intelligence
```

## 📚 Dependencies

- **better-sqlite3**: Database operations
- **socket.io**: Real-time WebSocket communication
- **Statistical algorithms**: Built-in ML implementations
- **Express**: REST API framework

## 🚦 Status Codes

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

## 🎨 Use Cases

1. **Restaurant Manager**: Monitor daily performance, get alerts for anomalies
2. **Owner**: View executive dashboard, make data-driven decisions
3. **Marketing**: Target customer segments, run retention campaigns
4. **Operations**: Optimize menu, reduce waste, improve efficiency
5. **Finance**: Forecast cash flow, track margins, predict revenue

## 📞 Support

For issues or questions about the Business Intelligence module:
- Check the logs in `/logs/bi-module.log`
- Review WebSocket connection status
- Verify database connectivity
- Contact the development team

## 🔄 Updates

The BI module continuously improves through:
- Daily model retraining
- Real-time anomaly detection
- Continuous metric updates
- Feedback loop from implementations

---

**Version**: 1.0.0
**Last Updated**: December 2024
**Author**: SYSME Development Team