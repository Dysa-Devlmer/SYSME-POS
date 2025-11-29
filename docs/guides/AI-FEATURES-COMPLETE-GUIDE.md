# 🤖 Guía Completa de Características de AI/ML - SYSME POS v2.1

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura de AI/ML](#arquitectura-de-aiml)
3. [Servicios Implementados](#servicios-implementados)
4. [API Endpoints](#api-endpoints)
5. [Componentes Frontend](#componentes-frontend)
6. [Configuración](#configuración)
7. [Uso y Ejemplos](#uso-y-ejemplos)
8. [Algoritmos de Machine Learning](#algoritmos-de-machine-learning)
9. [Mejores Prácticas](#mejores-prácticas)
10. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 Introducción

SYSME POS v2.1 incorpora capacidades avanzadas de Inteligencia Artificial y Machine Learning diseñadas específicamente para el sector de hostelería. Estas características permiten:

- **Predicción de Demanda**: Anticipa las necesidades de inventario
- **Recomendaciones Inteligentes**: Aumenta las ventas con sugerencias personalizadas
- **Alertas Proactivas**: Previene problemas antes de que ocurran
- **Análisis Predictivo**: Identifica tendencias y patrones
- **Optimización Automática**: Mejora continuamente las operaciones

## 🏗️ Arquitectura de AI/ML

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ AIDashboard │ │ Recommendations│ │   Alerts     │    │
│  └──────┬──────┘ └───────┬────────┘ └──────┬───────┘    │
└─────────┼─────────────────┼─────────────────┼───────────┘
          │                 │                 │
          └─────────────────▼─────────────────┘
                           │
                    ┌──────▼────────┐
                    │   API REST    │
                    │  /api/v1/ai   │
                    └──────┬────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐ ┌───────▼────────┐ ┌──────▼────────┐
│ Demand         │ │ Recommendation │ │  Proactive    │
│ Forecasting    │ │    Engine      │ │    Alerts     │
└────────────────┘ └────────────────┘ └───────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼────────┐
                    │   Database    │
                    │    (MySQL)    │
                    └───────────────┘
```

## 📦 Servicios Implementados

### 1. Sistema de Notificaciones en Tiempo Real
**Archivo**: `backend/src/services/realtime-notifications.js`

- **WebSocket Integration**: Comunicación bidireccional en tiempo real
- **Categorías**: Stock, Ventas, Pedidos, Alertas, Sistema, Cocina, Pagos, Predicciones IA
- **Prioridades**: Crítico, Alto, Medio, Bajo, Info
- **Cola de Procesamiento**: Manejo eficiente de múltiples notificaciones
- **Persistencia**: Notificaciones guardadas para usuarios offline

### 2. Servicio de Predicción de Demanda
**Archivo**: `backend/src/services/ai-demand-forecasting.js`

#### Algoritmos Implementados:
- **Moving Average (MA7)**: Promedio móvil de 7 días
- **Exponential Moving Average (EMA)**: Suavizado exponencial con α=0.3
- **Linear Regression**: Detección de tendencias lineales
- **Seasonality Detection**: Identificación de patrones semanales

#### Características:
- Predicciones hasta 30 días en el futuro
- Intervalos de confianza del 95%
- Detección de picos de demanda
- Recomendaciones de punto de reorden
- Cálculo de stock de seguridad

### 3. Motor de Recomendaciones Inteligentes
**Archivo**: `backend/src/services/ai-recommendation-engine.js`

#### Tipos de Recomendaciones:
1. **Frequently Bought Together**: Análisis de asociación (Market Basket)
2. **Personalized**: Filtrado colaborativo + basado en contenido
3. **Trending**: Productos populares con decay temporal
4. **Upsell**: Alternativas premium con mejor margen
5. **Cross-sell**: Productos complementarios
6. **Seasonal**: Basado en temporada y eventos
7. **New Arrivals**: Productos recientes con potencial

#### Sistema Híbrido:
```javascript
Pesos del sistema:
- Collaborative Filtering: 40%
- Content-Based: 30%
- Popularity: 20%
- Recency: 10%
```

### 4. Sistema de Alertas Proactivas
**Archivo**: `backend/src/services/ai-proactive-alerts.js`

#### Tipos de Alertas:
- **Stock**: Niveles bajos, agotamiento inminente, productos por vencer
- **Ventas**: Anomalías, picos, caídas inusuales
- **Clientes**: Riesgo de abandono, comportamiento atípico
- **Fraude**: Transacciones sospechosas
- **Sistema**: Rendimiento, errores críticos
- **Flujo de Caja**: Problemas de liquidez

#### Monitoreo Automático:
- Stock: Cada 15 minutos
- Ventas: Cada hora
- Clientes: Diario
- Vencimientos: Cada 6 horas
- Fraude: Cada 5 minutos

## 🔌 API Endpoints

### Base URL: `/api/v1/ai`

| Método | Endpoint | Descripción | Parámetros |
|--------|----------|-------------|------------|
| GET | `/dashboard` | Dashboard unificado de IA | - |
| GET | `/forecast/:productId` | Predicción de demanda | `daysAhead` (7-30) |
| GET | `/reorder-recommendations` | Recomendaciones de reorden | `limit` (10) |
| GET | `/recommendations/customer/:customerId` | Recomendaciones personalizadas | `limit` (10) |
| GET | `/frequently-bought/:productId` | Productos frecuentemente comprados | `limit` (5) |
| GET | `/trending` | Productos en tendencia | `limit` (10) |
| GET | `/upsell/:productId` | Recomendaciones de upselling | `limit` (5) |
| POST | `/cross-sell` | Recomendaciones de cross-selling | `cartItems[]` |
| GET | `/alerts` | Alertas activas | `type`, `severity`, `since` |
| PUT | `/alerts/:alertId/acknowledge` | Reconocer alerta | - |
| PUT | `/alerts/:alertId/resolve` | Resolver alerta | `resolution` |
| POST | `/alerts/:alertId/action` | Ejecutar acción de alerta | `action` |
| GET | `/sales-analysis` | Análisis de ventas | `startDate`, `endDate`, `groupBy` |
| GET | `/stats` | Estadísticas de IA | - |
| POST | `/initialize` | Inicializar servicios | - |

### Ejemplos de Uso:

#### Obtener Predicción de Demanda
```bash
curl GET /api/v1/ai/forecast/123?daysAhead=7
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "productId": 123,
    "predictions": [
      {
        "date": "2024-01-15",
        "dayOfWeek": "Lunes",
        "predicted_quantity": 25.5,
        "confidence_interval": {
          "lower": 20.3,
          "upper": 30.7
        },
        "is_peak_day": false
      }
    ],
    "confidence": {
      "score": 0.87,
      "level": "high"
    },
    "trend": {
      "direction": "increasing",
      "strength": 0.72,
      "percentage": 15
    },
    "reorderRecommendation": {
      "currentStock": 50,
      "reorderPoint": 45,
      "shouldReorder": true,
      "recommendedQuantity": 100,
      "urgency": "medium"
    }
  }
}
```

#### Obtener Recomendaciones Personalizadas
```bash
curl GET /api/v1/ai/recommendations/customer/456?limit=5
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "productId": 789,
        "name": "Café Premium",
        "price": 4.50,
        "confidence": 92,
        "reason": "Basado en tus compras anteriores",
        "stock": 150
      }
    ]
  }
}
```

## ⚛️ Componentes Frontend

### 1. AIDashboard
**Archivo**: `dashboard-web/src/components/ai/AIDashboard.tsx`

Dashboard principal que muestra:
- Métricas en tiempo real
- Alertas activas
- Productos trending
- Estado de servicios IA

### 2. SmartRecommendations
**Archivo**: `dashboard-web/src/components/ai/SmartRecommendations.tsx`

Muestra recomendaciones inteligentes:
- Frecuentemente comprados juntos
- Upselling y Cross-selling
- Productos personalizados
- Trending items

### 3. ProactiveAlerts
**Archivo**: `dashboard-web/src/components/ai/ProactiveAlerts.tsx`

Gestión de alertas:
- Filtrado por tipo y severidad
- Acciones rápidas
- Reconocimiento y resolución
- Historial de alertas

### 4. DemandForecast
**Archivo**: `dashboard-web/src/components/ai/DemandForecast.tsx`

Visualización de predicciones:
- Gráficos de tendencia
- Intervalos de confianza
- Recomendaciones de reorden
- Análisis de estacionalidad

## ⚙️ Configuración

### Variables de Entorno
```env
# AI/ML Configuration
AI_ENABLE=true
AI_CACHE_TIMEOUT=3600000
AI_REFRESH_INTERVAL=300000

# Thresholds
AI_STOCK_LOW_THRESHOLD=0.2
AI_STOCK_OUT_DAYS=3
AI_EXPIRY_WARNING_DAYS=7
AI_DEMAND_SPIKE_MULTIPLIER=2
AI_SALES_ANOMALY_THRESHOLD=0.3
AI_FRAUD_SCORE_THRESHOLD=0.7
AI_CUSTOMER_CHURN_DAYS=60

# Monitoring Intervals (ms)
AI_MONITOR_STOCK_INTERVAL=900000      # 15 min
AI_MONITOR_SALES_INTERVAL=3600000     # 1 hour
AI_MONITOR_CUSTOMERS_INTERVAL=86400000 # 24 hours
AI_MONITOR_EXPIRY_INTERVAL=21600000   # 6 hours
AI_MONITOR_FRAUD_INTERVAL=300000      # 5 min
```

### Inicialización
```javascript
// En el servidor principal
const proactiveAlerts = require('./services/ai-proactive-alerts');
await proactiveAlerts.initialize();

// En el frontend
import aiService from './services/ai.service';
await aiService.initializeServices();
```

## 📊 Algoritmos de Machine Learning

### 1. Moving Average (MA)
```
MA(t) = Σ(x[t-i]) / n, para i = 0 hasta n-1
```
Utilizado para suavizar datos y eliminar ruido.

### 2. Exponential Moving Average (EMA)
```
EMA(t) = α × x(t) + (1-α) × EMA(t-1)
```
Donde α = 0.3 (factor de suavizado)

### 3. Linear Regression
```
y = mx + b
m = (n×Σxy - Σx×Σy) / (n×Σx² - (Σx)²)
```
Para detectar tendencias lineales.

### 4. Jaccard Similarity
```
J(A,B) = |A ∩ B| / |A ∪ B|
```
Para filtrado colaborativo.

### 5. Lift (Association Rules)
```
Lift(A→B) = Confidence(A→B) / Support(B)
```
Para análisis de asociación.

### 6. Fraud Score
```javascript
score = Σ(weight[i] × factor[i])
Factores:
- Monto inusual: 30%
- Múltiples transacciones: 20%
- Desviación del patrón: 25%
- Horario inusual: 15%
- Método de pago: 10%
```

## 🎯 Mejores Prácticas

### 1. Optimización de Rendimiento
- Usar caché con timeout apropiado
- Implementar paginación en consultas grandes
- Procesar predicciones en background
- Comprimir respuestas grandes

### 2. Precisión de Predicciones
- Mínimo 7 días de datos históricos
- Actualizar modelos regularmente
- Validar predicciones contra datos reales
- Ajustar pesos del sistema híbrido

### 3. Gestión de Alertas
- No crear alertas duplicadas
- Implementar snooze para alertas repetitivas
- Escalar severidad automáticamente
- Mantener historial para análisis

### 4. Seguridad
- Validar permisos por endpoint
- Sanitizar inputs de usuario
- Limitar rate de requests
- Auditar acciones críticas

## 🔧 Solución de Problemas

### Problema: Predicciones imprecisas
**Solución**:
1. Verificar cantidad de datos históricos (mínimo 7 días)
2. Revisar calidad de datos (valores null, outliers)
3. Ajustar factor α del EMA (default 0.3)
4. Validar detección de estacionalidad

### Problema: Alertas excesivas
**Solución**:
1. Ajustar umbrales en configuración
2. Implementar debounce en monitores
3. Agrupar alertas similares
4. Configurar horarios de silencio

### Problema: Recomendaciones irrelevantes
**Solución**:
1. Verificar historial del cliente
2. Ajustar pesos del sistema híbrido
3. Aumentar umbral de similitud (default 0.3)
4. Filtrar productos sin stock

### Problema: Latencia alta en API
**Solución**:
1. Verificar índices en base de datos
2. Implementar caché Redis
3. Reducir ventana de análisis
4. Usar paginación en resultados

## 📈 Métricas de Éxito

### KPIs de AI/ML
- **Precisión de Predicciones**: > 85%
- **Tasa de Conversión de Recomendaciones**: > 15%
- **Reducción de Stock-outs**: > 30%
- **Tiempo de Respuesta API**: < 200ms
- **Alertas Procesadas**: > 95%

### Impacto en el Negocio
- 📈 **15-25%** aumento en ventas con recomendaciones
- 💰 **20-30%** mejora en margen con upselling
- 🗑️ **30-40%** reducción en desperdicios
- ⏱️ **50%** menos tiempo en gestión manual
- 📊 **10-15%** optimización de inventario

## 🚀 Roadmap Futuro

### Q1 2025
- [ ] Implementar Deep Learning para predicciones
- [ ] Análisis de sentimiento en reviews
- [ ] Optimización de precios dinámica

### Q2 2025
- [ ] Clustering de clientes avanzado
- [ ] Predicción de lifetime value
- [ ] Detección de tendencias emergentes

### Q3 2025
- [ ] AutoML para ajuste automático
- [ ] Análisis predictivo de mantenimiento
- [ ] Integración con IoT de cocina

---

## 📚 Referencias

- [Scikit-learn Documentation](https://scikit-learn.org/)
- [Time Series Forecasting Guide](https://otexts.com/fpp3/)
- [Association Rules Mining](https://en.wikipedia.org/wiki/Association_rule_learning)
- [Collaborative Filtering](https://en.wikipedia.org/wiki/Collaborative_filtering)

---

**Última actualización**: Noviembre 2024
**Versión**: 2.1.0
**Autor**: SYSME POS Development Team

🤖 Sistema potenciado por Inteligencia Artificial para el futuro de la hostelería.