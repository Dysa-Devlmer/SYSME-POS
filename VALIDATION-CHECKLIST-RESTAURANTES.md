# ✅ Checklist de Validación para Restaurantes
## SYSME POS v2.1 - Lista de Verificación Completa

Use este documento para validar que el nuevo sistema SYSME POS v2.1 está listo para reemplazar el sistema antiguo en cada restaurante.

---

## 📋 INFORMACIÓN DEL RESTAURANTE

**Nombre del Restaurante:** ___________________________________

**Ubicación:** ___________________________________

**Fecha de Validación:** ___/___/2025

**Responsable de Validación:** ___________________________________

**Versión del Sistema:** v2.1.0

---

## 🔧 FASE 1: INSTALACIÓN Y CONFIGURACIÓN

### Hardware y Red

- [ ] **Servidor/PC principal** funcionando correctamente
  - Sistema Operativo: Windows 10/11 o Linux
  - RAM mínima: 4GB (Recomendado: 8GB+)
  - Espacio en disco: 20GB+ libres

- [ ] **Red local** configurada y estable
  - Velocidad mínima: 100 Mbps
  - Todos los dispositivos en la misma red
  - IP fija asignada al servidor

- [ ] **Impresora de cocina** conectada y funcionando
  - Tipo: ________________________________
  - IP/Puerto: ___________________________
  - Test de impresión: OK ☐

- [ ] **Impresora de tickets** conectada y funcionando
  - Tipo: ________________________________
  - IP/Puerto: ___________________________
  - Test de impresión: OK ☐

- [ ] **Cajón de dinero** conectado
  - Tipo: Automático ☐ Manual ☐
  - Puerto: ______________________________

- [ ] **Tablets/Dispositivos móviles** (para meseros)
  - Cantidad: ____________________________
  - Conectados a WiFi: OK ☐
  - Dashboard accesible: OK ☐

### Software y Base de Datos

- [ ] **MySQL instalado** y funcionando
  - Versión: _____________________________
  - Base de datos "sysme" creada: OK ☐
  - Migraciones ejecutadas: OK ☐

- [ ] **Node.js instalado**
  - Versión: _____________________________

- [ ] **Redis instalado** (opcional)
  - Instalado: Sí ☐ No ☐
  - Funcionando: OK ☐ N/A ☐

- [ ] **Backend iniciado**
  - Puerto: 3001
  - Health check: http://localhost:3001 → OK ☐

- [ ] **Frontend iniciado**
  - Puerto: 5173 (dev) o 4173 (prod)
  - Dashboard accesible: OK ☐

---

## 👥 FASE 2: CONFIGURACIÓN DE USUARIOS Y ROLES

### Usuarios Creados

- [ ] **Administrador** (Gerente)
  - Usuario: ____________________________
  - Rol: super_admin
  - Puede acceder a todas las funciones: OK ☐

- [ ] **Cajero(s)**
  - Usuario 1: ___________________________
  - Usuario 2: ___________________________
  - Rol: cashier
  - Puede abrir/cerrar caja: OK ☐
  - Puede procesar pagos: OK ☐

- [ ] **Mesero(s)**
  - Usuario 1: ___________________________
  - Usuario 2: ___________________________
  - Usuario 3: ___________________________
  - Rol: waiter
  - Puede crear órdenes: OK ☐
  - Puede asignar mesas: OK ☐

- [ ] **Cocina**
  - Usuario: _____________________________
  - Rol: kitchen
  - Puede ver órdenes de cocina: OK ☐
  - Puede marcar platos como listos: OK ☐

### Permisos Verificados

- [ ] Admin puede ver reportes financieros
- [ ] Cajero NO puede ver reportes de otros cajeros
- [ ] Mesero NO puede eliminar productos
- [ ] Mesero NO puede modificar precios
- [ ] Cocina solo ve órdenes, no precios

---

## 🍽️ FASE 3: CONFIGURACIÓN DE PRODUCTOS Y MENÚ

### Categorías

- [ ] Categorías creadas:
  - Entrantes ☐
  - Platos Principales ☐
  - Bebidas ☐
  - Postres ☐
  - Extras ☐
  - Otras: _____________________________

### Productos

- [ ] **Mínimo 20 productos** cargados
- [ ] Productos con imagen
- [ ] Productos con precio correcto
- [ ] Productos con descripción
- [ ] Productos asignados a categorías correctas
- [ ] Stock configurado (si aplica)
- [ ] IVA configurado correctamente por producto

### Modificadores y Extras

- [ ] Modificadores creados (ej: sin cebolla, picante, etc.)
- [ ] Extras creados (ej: queso extra, pan, etc.)
- [ ] Precios de modificadores correctos
- [ ] Modificadores asignados a productos correctos

### Menús Especiales

- [ ] Menú del día configurado
- [ ] Menú ejecutivo configurado
- [ ] Promociones configuradas
- [ ] Combos configurados

---

## 🪑 FASE 4: CONFIGURACIÓN DE MESAS Y ZONAS

### Zonas del Restaurante

- [ ] Zonas creadas:
  - Sala Principal: ___ mesas
  - Terraza: ___ mesas
  - Barra: ___ mesas
  - VIP/Reservados: ___ mesas
  - Otras: _____________________________

### Mesas Configuradas

- [ ] **Total de mesas:** _____
- [ ] Mesas numeradas correctamente
- [ ] Capacidad de cada mesa configurada
- [ ] Mesas asignadas a zonas
- [ ] Estados funcionando:
  - Disponible ☐
  - Ocupada ☐
  - Reservada ☐
  - En limpieza ☐

### Visualización

- [ ] Mapa de mesas visible
- [ ] Colores de estado claros
- [ ] Fácil selección de mesas
- [ ] Vista responsive en tablets

---

## 💰 FASE 5: SISTEMA DE CAJA Y PAGOS

### Apertura de Caja

- [ ] Proceso de apertura funciona
- [ ] Fondo inicial se registra correctamente
- [ ] Múltiples cajas soportadas
- [ ] Turnos configurados

### Métodos de Pago

- [ ] **Efectivo** funciona
  - Cálculo de cambio correcto ☐
  - Registro en caja correcto ☐

- [ ] **Tarjeta de crédito** funciona
  - Registro en caja correcto ☐
  - Comisión calculada (si aplica) ☐

- [ ] **Tarjeta de débito** funciona
  - Registro en caja correcto ☐

- [ ] **Transferencia** funciona
  - Registro en caja correcto ☐

- [ ] **Otros** (Vale, Yape, etc.)
  - Método: _____________________________
  - Funciona: OK ☐

### Descuentos y Propinas

- [ ] Descuento por monto funciona
- [ ] Descuento por porcentaje funciona
- [ ] Propina se registra correctamente
- [ ] Propina se suma al total
- [ ] Descuentos requieren autorización (si configurado)

### Cierre de Caja

- [ ] Proceso de cierre funciona
- [ ] Reporte Z se genera correctamente
- [ ] Total efectivo calculado correctamente
- [ ] Total tarjeta calculado correctamente
- [ ] Diferencias detectadas correctamente
- [ ] Cierre requiere autorización de supervisor

---

## 🧾 FASE 6: TICKETS E IMPRESIÓN

### Impresión de Tickets Cliente

- [ ] Ticket se imprime automáticamente al pagar
- [ ] Formato del ticket correcto
- [ ] Datos de empresa/restaurante correctos
- [ ] Lista de productos legible
- [ ] Totales correctos
- [ ] IVA desglosado correctamente
- [ ] Código QR (si aplica)
- [ ] Número de ticket único

### Impresión de Tickets Cocina

- [ ] Ticket se imprime al enviar orden
- [ ] Formato legible para cocina
- [ ] Hora de la orden visible
- [ ] Mesa indicada claramente
- [ ] Modificadores visibles
- [ ] Prioridad indicada (si aplica)
- [ ] Separación por categorías (entrantes, principales, etc.)

### Re-impresión

- [ ] Se puede re-imprimir tickets de cliente
- [ ] Se puede re-imprimir tickets de cocina
- [ ] Histórico de tickets accesible

---

## 🍳 FASE 7: FLUJO COMPLETO DE ÓRDENES

### Creación de Órdenes

- [ ] **Orden en mesa** funciona:
  1. Seleccionar mesa ☐
  2. Agregar productos ☐
  3. Agregar modificadores ☐
  4. Agregar extras ☐
  5. Ver subtotal en tiempo real ☐
  6. Enviar a cocina ☐

- [ ] **Orden para llevar** funciona:
  1. Crear sin mesa ☐
  2. Agregar productos ☐
  3. Proceso de pago inmediato ☐
  4. Ticket de salida ☐

- [ ] **Orden en barra** funciona
- [ ] **Orden delivery** funciona (si aplica)

### Modificación de Órdenes

- [ ] Se puede agregar productos a orden existente
- [ ] Se puede eliminar productos de orden
- [ ] Se puede modificar cantidad
- [ ] Cambios se reflejan en cocina
- [ ] Requiere autorización (si configurado)

### División de Cuentas

- [ ] Dividir en partes iguales funciona
- [ ] Dividir por productos funciona
- [ ] División personalizada funciona
- [ ] Pagos parciales funcionan

### Transferencia de Órdenes

- [ ] Transferir orden entre mesas funciona
- [ ] Unir mesas funciona
- [ ] Separar mesas funciona

---

## 👨‍🍳 FASE 8: MÓDULO DE COCINA

### Recepción de Órdenes

- [ ] Órdenes llegan a cocina en tiempo real
- [ ] Orden de llegada visible (más antigua primero)
- [ ] Hora de orden visible
- [ ] Mesa identificada claramente
- [ ] Prioridad visible (si aplica)

### Gestión de Órdenes en Cocina

- [ ] Marcar plato como "En preparación"
- [ ] Marcar plato como "Listo"
- [ ] Platos por categoría separados
- [ ] Notificación visual de nuevas órdenes
- [ ] Sonido de alerta (opcional)

### Tiempos

- [ ] Tiempo de preparación visible
- [ ] Alertas por demora
- [ ] Estadísticas de tiempo promedio

---

## 📊 FASE 9: REPORTES Y ANALYTICS

### Reportes del Día

- [ ] Ventas del día
  - Total general ☐
  - Por método de pago ☐
  - Por cajero ☐
  - Por mesero ☐

- [ ] Productos más vendidos
  - Top 10 productos ☐
  - Por categoría ☐

- [ ] Ocupación de mesas
  - Promedio de ocupación ☐
  - Tiempo promedio por mesa ☐

- [ ] Reporte de caja
  - Entrada/salida efectivo ☐
  - Gastos registrados ☐

### Reportes Históricos

- [ ] Ventas por período (semanal, mensual)
- [ ] Comparativa vs período anterior
- [ ] Gráficos visuales
- [ ] Exportación a Excel/PDF
- [ ] Filtros por fecha funcional

### Dashboard en Tiempo Real

- [ ] Ventas del día actualizadas
- [ ] Mesas ocupadas vs disponibles
- [ ] Órdenes pendientes en cocina
- [ ] Rendimiento del sistema

---

## 🔐 FASE 10: SEGURIDAD Y BACKUP

### Autenticación y Sesiones

- [ ] Login requiere credenciales
- [ ] Sesión expira después de inactividad
- [ ] No se puede acceder sin login
- [ ] Logout funciona correctamente
- [ ] Cambio de contraseña funciona

### Auditoría

- [ ] Cambios en productos registrados
- [ ] Modificaciones de precios auditadas
- [ ] Eliminaciones registradas
- [ ] Cambios en órdenes auditados
- [ ] Accesos registrados

### Backup

- [ ] Backup automático configurado
  - Frecuencia: __________________________
  - Ubicación: ___________________________

- [ ] Backup manual funciona
- [ ] Restauración probada: OK ☐
- [ ] Backup en ubicación externa/nube: OK ☐

---

## ⚡ FASE 11: PERFORMANCE Y ESTABILIDAD

### Velocidad

- [ ] Dashboard carga en menos de 3 segundos
- [ ] Búsqueda de productos en menos de 1 segundo
- [ ] Crear orden en menos de 500ms
- [ ] Procesar pago en menos de 2 segundos
- [ ] Sin lag en hora punta

### Carga Simultánea

- [ ] Probado con 5 usuarios simultáneos: OK ☐
- [ ] Probado con 10 usuarios simultáneos: OK ☐
- [ ] Probado en hora punta real: OK ☐
- [ ] No hay errores con múltiples cajas abiertas: OK ☐

### Estabilidad

- [ ] Sistema corrió 8 horas sin problemas
- [ ] Sistema corrió 24 horas sin problemas
- [ ] No hay memory leaks
- [ ] No hay desconexiones de BD
- [ ] Logs sin errores críticos

---

## 🔄 FASE 12: INTEGRACIÓN CON SISTEMA ANTIGUO

### Migración de Datos

- [ ] Productos migrados correctamente
  - Cantidad: _____ productos
  - Precios correctos: OK ☐
  - Categorías correctas: OK ☐

- [ ] Clientes migrados (si aplica)
  - Cantidad: _____ clientes

- [ ] Histórico de ventas migrado (opcional)
  - Período: Desde ___/___/___ hasta ___/___/___

### Período de Transición

- [ ] Ambos sistemas corriendo en paralelo
  - Duración: ___ días/semanas
  - Datos sincronizados: OK ☐

- [ ] Personal capacitado en ambos sistemas
- [ ] Plan de rollback documentado
- [ ] Backup del sistema antiguo realizado

---

## 👥 FASE 13: CAPACITACIÓN DEL PERSONAL

### Gerente/Administrador

- [ ] Apertura y cierre de caja
- [ ] Creación y edición de productos
- [ ] Gestión de usuarios y roles
- [ ] Generación de reportes
- [ ] Resolución de problemas básicos
- [ ] Backup y restauración

### Cajeros

- [ ] Login/Logout
- [ ] Apertura de caja
- [ ] Creación de órdenes
- [ ] Procesamiento de pagos
- [ ] Descuentos y propinas
- [ ] Cierre de caja
- [ ] Re-impresión de tickets

### Meseros

- [ ] Login/Logout
- [ ] Selección de mesas
- [ ] Creación de órdenes
- [ ] Modificación de órdenes
- [ ] División de cuentas
- [ ] Transferencia de órdenes
- [ ] Uso en tablet

### Cocina

- [ ] Ver órdenes pendientes
- [ ] Marcar platos como listos
- [ ] Priorización de órdenes
- [ ] Re-impresión de tickets cocina

### Tiempo de Capacitación

- [ ] Gerente: ___ horas (Recomendado: 4-6h)
- [ ] Cajeros: ___ horas (Recomendado: 3-4h)
- [ ] Meseros: ___ horas (Recomendado: 2-3h)
- [ ] Cocina: ___ horas (Recomendado: 1-2h)

---

## 🧪 FASE 14: PRUEBAS DE ACEPTACIÓN

### Escenario 1: Día Típico

**Descripción:** Simular un día completo de operación

- [ ] Apertura de caja (9:00 AM)
- [ ] Primera orden (desayuno)
- [ ] Hora punta almuerzo (12:00 - 14:00)
  - 10+ órdenes simultáneas
  - Múltiples meseros
  - División de cuentas
- [ ] Tarde tranquila
- [ ] Hora punta cena (20:00 - 22:00)
  - 15+ órdenes simultáneas
- [ ] Cierre de caja (23:00 PM)

**Resultado:** Exitoso ☐ Con problemas ☐

**Observaciones:** _________________________________________________

### Escenario 2: Problemas Comunes

- [ ] Falta de luz momentánea
  - Sistema se recupera: OK ☐
  - Datos no se pierden: OK ☐

- [ ] Falla de impresora
  - Sistema no se cuelga: OK ☐
  - Se puede re-imprimir después: OK ☐

- [ ] Error en orden
  - Se puede modificar: OK ☐
  - Se puede cancelar: OK ☐

- [ ] Cliente paga y se va antes de imprimir ticket
  - Se puede re-imprimir: OK ☐

### Escenario 3: Fin de Semana/Evento Especial

- [ ] Probado en fin de semana: OK ☐
- [ ] Probado en evento especial: OK ☐
- [ ] Soporta carga máxima: OK ☐

---

## ✅ FASE 15: APROBACIÓN FINAL

### Firma del Gerente/Administrador

**Nombre:** _______________________________________________

**Firma:** ________________________________________________

**Fecha:** ___/___/2025

**Comentarios:**
________________________________________________________________________
________________________________________________________________________
________________________________________________________________________

### Firma del Personal Operativo

**Jefe de Cocina:** _______________________________________

**Encargado de Turno:** ____________________________________

**Fecha:** ___/___/2025

### Decisión Final

**Sistema aprobado para producción:** Sí ☐ No ☐

**Fecha de go-live:** ___/___/2025

**Observaciones finales:**
________________________________________________________________________
________________________________________________________________________
________________________________________________________________________

---

## 📞 SOPORTE POST-IMPLEMENTACIÓN

**Contacto de Soporte Técnico:**
- Nombre: _________________________________________________
- Teléfono: _______________________________________________
- Email: __________________________________________________
- Horario: ________________________________________________

**Plan de Soporte:**
- Primeras 2 semanas: Soporte on-site diario
- Semanas 3-4: Soporte on-site 3 veces por semana
- Mes 2: Soporte remoto + visitas semanales
- Mes 3+: Soporte remoto + visitas mensuales

**Problemas Reportados Post-Implementación:**

| Fecha | Problema | Solución | Estado |
|-------|----------|----------|--------|
|       |          |          |        |
|       |          |          |        |
|       |          |          |        |

---

## 📊 MÉTRICAS DE ÉXITO

### Objetivos Mes 1

- [ ] 95%+ disponibilidad del sistema
- [ ] 0 pérdidas de datos
- [ ] 100% del personal capacitado
- [ ] Tiempo promedio de orden < 3 minutos
- [ ] Satisfacción del personal > 80%

### Objetivos Mes 3

- [ ] 99%+ disponibilidad del sistema
- [ ] Reducción del 30% en errores de orden
- [ ] Aumento del 20% en eficiencia de meseros
- [ ] Reportes financieros precisos al 100%
- [ ] Sistema completamente adoptado

---

**Versión del Checklist:** 2.1.0
**Última Actualización:** Enero 2025
**Documento:** VALIDATION-CHECKLIST-RESTAURANTES.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
