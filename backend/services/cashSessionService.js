/**
 * Cash Session Service con integración JARVIS
 * Manejo avanzado de sesiones de caja con IA y analytics
 */

const db = require('../config/database');
const logger = require('../utils/logger');
const { emitToJarvis } = require('../jarvis-integration/initialize-jarvis');

class CashSessionService {
    constructor() {
        this.currentSessions = new Map();
    }

    /**
     * Abrir nueva sesión de caja
     */
    async openSession(userId, initialAmount, terminalId = 'POS-01') {
        const trx = await db.transaction();

        try {
            // Verificar que no haya una sesión abierta
            const existingSession = await trx('cash_sessions')
                .where({ user_id: userId, status: 'open' })
                .first();

            if (existingSession) {
                throw new Error('Ya existe una sesión de caja abierta para este usuario');
            }

            // Crear nueva sesión
            const sessionData = {
                user_id: userId,
                terminal_id: terminalId,
                opening_amount: initialAmount,
                current_amount: initialAmount,
                status: 'open',
                opened_at: new Date(),
                opening_notes: '',

                // Nuevos campos para analytics
                expected_cash: initialAmount,
                actual_cash: initialAmount,
                difference: 0,

                // Contadores
                sales_count: 0,
                refunds_count: 0,

                // Totales por método de pago
                cash_total: 0,
                card_total: 0,
                transfer_total: 0,
                other_total: 0,

                // Métricas
                average_ticket: 0,
                max_sale: 0,
                min_sale: null
            };

            const [sessionId] = await trx('cash_sessions').insert(sessionData);
            sessionData.id = sessionId;

            // Registrar en el log de sesiones
            await trx('cash_session_logs').insert({
                session_id: sessionId,
                user_id: userId,
                action: 'OPEN',
                amount: initialAmount,
                notes: `Sesión abierta con $${initialAmount}`,
                created_at: new Date()
            });

            await trx.commit();

            // Almacenar en memoria para acceso rápido
            this.currentSessions.set(userId, sessionData);

            // Notificar a JARVIS
            emitToJarvis('cashSession:opened', {
                id: sessionId,
                userId,
                terminalId,
                initialAmount,
                timestamp: new Date()
            });

            logger.info(`Sesión de caja abierta: ${sessionId} por usuario ${userId}`);

            return {
                success: true,
                session: sessionData,
                message: 'Sesión de caja abierta exitosamente'
            };

        } catch (error) {
            await trx.rollback();
            logger.error('Error abriendo sesión de caja:', error);
            throw error;
        }
    }

    /**
     * Cerrar sesión de caja con arqueo
     */
    async closeSession(userId, closingData) {
        const trx = await db.transaction();

        try {
            // Obtener sesión actual
            const session = await trx('cash_sessions')
                .where({ user_id: userId, status: 'open' })
                .first();

            if (!session) {
                throw new Error('No hay sesión de caja abierta para este usuario');
            }

            // Calcular totales y diferencias
            const sessionSummary = await this.calculateSessionSummary(session.id, trx);

            // Calcular diferencia de arqueo
            const expectedTotal = session.opening_amount + sessionSummary.totalSales - sessionSummary.totalRefunds;
            const actualTotal = closingData.countedCash || expectedTotal;
            const difference = actualTotal - expectedTotal;

            // Actualizar sesión
            const updateData = {
                status: 'closed',
                closed_at: new Date(),
                closing_amount: actualTotal,
                expected_cash: expectedTotal,
                actual_cash: actualTotal,
                difference: difference,
                closing_notes: closingData.notes || '',

                // Actualizar totales
                sales_count: sessionSummary.salesCount,
                refunds_count: sessionSummary.refundsCount,
                cash_total: sessionSummary.cashTotal,
                card_total: sessionSummary.cardTotal,
                transfer_total: sessionSummary.transferTotal,
                other_total: sessionSummary.otherTotal,
                average_ticket: sessionSummary.averageTicket,
                max_sale: sessionSummary.maxSale,
                min_sale: sessionSummary.minSale,

                // Detalles de arqueo
                bills_100000: closingData.bills_100000 || 0,
                bills_50000: closingData.bills_50000 || 0,
                bills_20000: closingData.bills_20000 || 0,
                bills_10000: closingData.bills_10000 || 0,
                bills_5000: closingData.bills_5000 || 0,
                bills_2000: closingData.bills_2000 || 0,
                bills_1000: closingData.bills_1000 || 0,
                coins_500: closingData.coins_500 || 0,
                coins_100: closingData.coins_100 || 0,
                coins_50: closingData.coins_50 || 0,
                coins_10: closingData.coins_10 || 0
            };

            await trx('cash_sessions')
                .where({ id: session.id })
                .update(updateData);

            // Registrar en el log
            await trx('cash_session_logs').insert({
                session_id: session.id,
                user_id: userId,
                action: 'CLOSE',
                amount: actualTotal,
                notes: `Sesión cerrada. Diferencia: $${difference}`,
                created_at: new Date()
            });

            // Generar reporte de cierre
            const closingReport = await this.generateClosingReport(session.id, trx);

            // Guardar reporte
            await trx('cash_session_reports').insert({
                session_id: session.id,
                report_type: 'closing',
                report_data: JSON.stringify(closingReport),
                generated_at: new Date()
            });

            await trx.commit();

            // Limpiar de memoria
            this.currentSessions.delete(userId);

            // Notificar a JARVIS con datos completos
            emitToJarvis('cashSession:closed', {
                id: session.id,
                userId,
                startTime: session.opened_at,
                endTime: new Date(),
                summary: sessionSummary,
                difference,
                closingReport
            });

            logger.info(`Sesión de caja cerrada: ${session.id} con diferencia de $${difference}`);

            return {
                success: true,
                session: { ...session, ...updateData },
                summary: sessionSummary,
                report: closingReport,
                difference,
                message: difference === 0 ?
                    'Sesión cerrada exitosamente. Arqueo cuadrado.' :
                    `Sesión cerrada con diferencia de $${difference}`
            };

        } catch (error) {
            await trx.rollback();
            logger.error('Error cerrando sesión de caja:', error);
            throw error;
        }
    }

    /**
     * Registrar movimiento de caja
     */
    async registerMovement(sessionId, movementData) {
        const trx = await db.transaction();

        try {
            // Verificar que la sesión esté abierta
            const session = await trx('cash_sessions')
                .where({ id: sessionId, status: 'open' })
                .first();

            if (!session) {
                throw new Error('Sesión de caja no encontrada o cerrada');
            }

            // Crear movimiento
            const movement = {
                session_id: sessionId,
                type: movementData.type, // 'entry', 'withdrawal', 'adjustment'
                amount: movementData.amount,
                reason: movementData.reason,
                description: movementData.description,
                authorized_by: movementData.authorizedBy,
                created_at: new Date()
            };

            const [movementId] = await trx('cash_movements').insert(movement);

            // Actualizar monto actual de la sesión
            const amountChange = movementData.type === 'withdrawal' ?
                -Math.abs(movementData.amount) : Math.abs(movementData.amount);

            await trx('cash_sessions')
                .where({ id: sessionId })
                .increment('current_amount', amountChange);

            // Registrar en log
            await trx('cash_session_logs').insert({
                session_id: sessionId,
                user_id: session.user_id,
                action: movementData.type.toUpperCase(),
                amount: movementData.amount,
                notes: movementData.description,
                created_at: new Date()
            });

            await trx.commit();

            // Notificar a JARVIS
            emitToJarvis('cashMovement:registered', {
                sessionId,
                movementId,
                type: movementData.type,
                amount: movementData.amount,
                timestamp: new Date()
            });

            logger.info(`Movimiento de caja registrado: ${movementData.type} de $${movementData.amount}`);

            return {
                success: true,
                movementId,
                newBalance: session.current_amount + amountChange
            };

        } catch (error) {
            await trx.rollback();
            logger.error('Error registrando movimiento de caja:', error);
            throw error;
        }
    }

    /**
     * Calcular resumen de sesión
     */
    async calculateSessionSummary(sessionId, trx = db) {
        try {
            // Obtener todas las ventas de la sesión
            const sales = await trx('sales')
                .where({ session_id: sessionId })
                .select('*');

            // Calcular totales por método de pago
            const paymentTotals = {
                cash: 0,
                card: 0,
                transfer: 0,
                other: 0
            };

            let totalSales = 0;
            let totalRefunds = 0;
            let maxSale = 0;
            let minSale = null;

            for (const sale of sales) {
                if (sale.status === 'completed') {
                    totalSales += sale.total;

                    // Actualizar máximo y mínimo
                    if (sale.total > maxSale) maxSale = sale.total;
                    if (minSale === null || sale.total < minSale) minSale = sale.total;

                    // Sumar por método de pago
                    switch (sale.payment_method) {
                        case 'cash':
                            paymentTotals.cash += sale.total;
                            break;
                        case 'card':
                        case 'credit_card':
                        case 'debit_card':
                            paymentTotals.card += sale.total;
                            break;
                        case 'transfer':
                        case 'bank_transfer':
                            paymentTotals.transfer += sale.total;
                            break;
                        default:
                            paymentTotals.other += sale.total;
                    }
                } else if (sale.status === 'refunded') {
                    totalRefunds += sale.total;
                }
            }

            // Obtener movimientos de caja
            const movements = await trx('cash_movements')
                .where({ session_id: sessionId })
                .select('*');

            let totalEntries = 0;
            let totalWithdrawals = 0;

            for (const movement of movements) {
                if (movement.type === 'entry') {
                    totalEntries += movement.amount;
                } else if (movement.type === 'withdrawal') {
                    totalWithdrawals += movement.amount;
                }
            }

            const salesCount = sales.filter(s => s.status === 'completed').length;
            const refundsCount = sales.filter(s => s.status === 'refunded').length;

            return {
                salesCount,
                refundsCount,
                totalSales,
                totalRefunds,
                netSales: totalSales - totalRefunds,
                cashTotal: paymentTotals.cash,
                cardTotal: paymentTotals.card,
                transferTotal: paymentTotals.transfer,
                otherTotal: paymentTotals.other,
                averageTicket: salesCount > 0 ? totalSales / salesCount : 0,
                maxSale,
                minSale,
                totalEntries,
                totalWithdrawals,
                movements: movements.length
            };

        } catch (error) {
            logger.error('Error calculando resumen de sesión:', error);
            throw error;
        }
    }

    /**
     * Generar reporte de cierre detallado
     */
    async generateClosingReport(sessionId, trx = db) {
        try {
            const session = await trx('cash_sessions')
                .where({ id: sessionId })
                .first();

            const summary = await this.calculateSessionSummary(sessionId, trx);

            // Obtener desglose por hora
            const hourlyBreakdown = await trx('sales')
                .where({ session_id: sessionId, status: 'completed' })
                .select(
                    trx.raw('HOUR(created_at) as hour'),
                    trx.raw('COUNT(*) as count'),
                    trx.raw('SUM(total) as total')
                )
                .groupBy('hour')
                .orderBy('hour');

            // Obtener top productos vendidos
            const topProducts = await trx('sale_items')
                .join('sales', 'sale_items.sale_id', 'sales.id')
                .join('products', 'sale_items.product_id', 'products.id')
                .where({ 'sales.session_id': sessionId, 'sales.status': 'completed' })
                .select(
                    'products.name',
                    'products.sku',
                    trx.raw('SUM(sale_items.quantity) as quantity_sold'),
                    trx.raw('SUM(sale_items.subtotal) as revenue')
                )
                .groupBy('products.id')
                .orderBy('revenue', 'desc')
                .limit(10);

            // Obtener desglose por categoría
            const categoryBreakdown = await trx('sale_items')
                .join('sales', 'sale_items.sale_id', 'sales.id')
                .join('products', 'sale_items.product_id', 'products.id')
                .join('categories', 'products.category_id', 'categories.id')
                .where({ 'sales.session_id': sessionId, 'sales.status': 'completed' })
                .select(
                    'categories.name as category',
                    trx.raw('COUNT(DISTINCT sales.id) as transactions'),
                    trx.raw('SUM(sale_items.subtotal) as revenue')
                )
                .groupBy('categories.id')
                .orderBy('revenue', 'desc');

            // Obtener desglose de propinas si aplica
            const tips = await trx('tips')
                .join('sales', 'tips.sale_id', 'sales.id')
                .where({ 'sales.session_id': sessionId })
                .select(
                    trx.raw('SUM(tips.amount) as total_tips'),
                    trx.raw('COUNT(*) as tips_count'),
                    trx.raw('AVG(tips.amount) as average_tip')
                )
                .first();

            const report = {
                sessionId,
                terminal: session.terminal_id,
                openedAt: session.opened_at,
                closedAt: session.closed_at || new Date(),
                duration: this.calculateDuration(session.opened_at, session.closed_at || new Date()),

                // Resumen financiero
                financial: {
                    openingAmount: session.opening_amount,
                    closingAmount: session.closing_amount,
                    expectedCash: session.expected_cash,
                    actualCash: session.actual_cash,
                    difference: session.difference,
                    ...summary
                },

                // Desglose por método de pago
                paymentMethods: {
                    cash: {
                        amount: summary.cashTotal,
                        percentage: (summary.cashTotal / summary.totalSales * 100).toFixed(2)
                    },
                    card: {
                        amount: summary.cardTotal,
                        percentage: (summary.cardTotal / summary.totalSales * 100).toFixed(2)
                    },
                    transfer: {
                        amount: summary.transferTotal,
                        percentage: (summary.transferTotal / summary.totalSales * 100).toFixed(2)
                    },
                    other: {
                        amount: summary.otherTotal,
                        percentage: (summary.otherTotal / summary.totalSales * 100).toFixed(2)
                    }
                },

                // Analytics
                analytics: {
                    hourlyBreakdown,
                    topProducts,
                    categoryBreakdown,
                    peakHour: this.findPeakHour(hourlyBreakdown),
                    averageTransactionTime: await this.calculateAverageTransactionTime(sessionId, trx)
                },

                // Propinas
                tips: tips || { total_tips: 0, tips_count: 0, average_tip: 0 },

                // Métricas de rendimiento
                performance: {
                    transactionsPerHour: summary.salesCount / this.calculateHours(session.opened_at, session.closed_at || new Date()),
                    averageTicket: summary.averageTicket,
                    conversionRate: await this.calculateConversionRate(sessionId, trx)
                },

                // Alertas y observaciones
                alerts: this.generateAlerts(session, summary),

                // Metadata
                generatedAt: new Date(),
                generatedBy: 'SYSME-JARVIS Integration'
            };

            return report;

        } catch (error) {
            logger.error('Error generando reporte de cierre:', error);
            throw error;
        }
    }

    /**
     * Obtener sesión actual de un usuario
     */
    async getCurrentSession(userId) {
        try {
            // Primero buscar en memoria
            if (this.currentSessions.has(userId)) {
                return this.currentSessions.get(userId);
            }

            // Si no está en memoria, buscar en BD
            const session = await db('cash_sessions')
                .where({ user_id: userId, status: 'open' })
                .first();

            if (session) {
                // Almacenar en memoria para próximas consultas
                this.currentSessions.set(userId, session);

                // Calcular resumen actual
                const summary = await this.calculateSessionSummary(session.id);

                return {
                    ...session,
                    summary
                };
            }

            return null;

        } catch (error) {
            logger.error('Error obteniendo sesión actual:', error);
            throw error;
        }
    }

    /**
     * Obtener historial de sesiones
     */
    async getSessionHistory(filters = {}) {
        try {
            let query = db('cash_sessions')
                .select(
                    'cash_sessions.*',
                    'users.name as user_name',
                    'users.email as user_email'
                )
                .join('users', 'cash_sessions.user_id', 'users.id')
                .orderBy('cash_sessions.created_at', 'desc');

            // Aplicar filtros
            if (filters.userId) {
                query = query.where('cash_sessions.user_id', filters.userId);
            }

            if (filters.terminalId) {
                query = query.where('cash_sessions.terminal_id', filters.terminalId);
            }

            if (filters.status) {
                query = query.where('cash_sessions.status', filters.status);
            }

            if (filters.dateFrom) {
                query = query.where('cash_sessions.opened_at', '>=', filters.dateFrom);
            }

            if (filters.dateTo) {
                query = query.where('cash_sessions.opened_at', '<=', filters.dateTo);
            }

            // Paginación
            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const offset = (page - 1) * limit;

            const sessions = await query
                .limit(limit)
                .offset(offset);

            // Obtener total para paginación
            const [{ total }] = await db('cash_sessions')
                .count('* as total')
                .where(function() {
                    if (filters.userId) this.where('user_id', filters.userId);
                    if (filters.terminalId) this.where('terminal_id', filters.terminalId);
                    if (filters.status) this.where('status', filters.status);
                    if (filters.dateFrom) this.where('opened_at', '>=', filters.dateFrom);
                    if (filters.dateTo) this.where('opened_at', '<=', filters.dateTo);
                });

            return {
                sessions,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            logger.error('Error obteniendo historial de sesiones:', error);
            throw error;
        }
    }

    /**
     * Realizar corte X (parcial)
     */
    async generateXReport(sessionId) {
        try {
            const session = await db('cash_sessions')
                .where({ id: sessionId, status: 'open' })
                .first();

            if (!session) {
                throw new Error('Sesión no encontrada o ya cerrada');
            }

            const summary = await this.calculateSessionSummary(sessionId);

            const xReport = {
                type: 'X',
                sessionId,
                generatedAt: new Date(),
                sessionStart: session.opened_at,
                currentTime: new Date(),
                duration: this.calculateDuration(session.opened_at, new Date()),
                ...summary,
                currentBalance: session.opening_amount + summary.netSales + summary.totalEntries - summary.totalWithdrawals
            };

            // Guardar reporte
            await db('cash_session_reports').insert({
                session_id: sessionId,
                report_type: 'X',
                report_data: JSON.stringify(xReport),
                generated_at: new Date()
            });

            // Notificar a JARVIS
            emitToJarvis('report:generated', {
                type: 'X',
                sessionId,
                summary
            });

            return xReport;

        } catch (error) {
            logger.error('Error generando corte X:', error);
            throw error;
        }
    }

    // Métodos auxiliares
    calculateDuration(start, end) {
        const diff = new Date(end) - new Date(start);
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }

    calculateHours(start, end) {
        const diff = new Date(end) - new Date(start);
        return diff / 3600000;
    }

    findPeakHour(hourlyBreakdown) {
        if (!hourlyBreakdown || hourlyBreakdown.length === 0) return null;
        return hourlyBreakdown.reduce((max, current) =>
            current.total > max.total ? current : max
        );
    }

    async calculateAverageTransactionTime(sessionId, trx) {
        try {
            const result = await trx('sales')
                .where({ session_id: sessionId, status: 'completed' })
                .select(trx.raw('AVG(TIMESTAMPDIFF(SECOND, created_at, updated_at)) as avg_time'))
                .first();

            return result ? result.avg_time : 0;
        } catch (error) {
            return 0;
        }
    }

    async calculateConversionRate(sessionId, trx) {
        // TODO: Implementar cálculo de tasa de conversión
        return 0;
    }

    generateAlerts(session, summary) {
        const alerts = [];

        // Alerta por diferencia significativa
        if (Math.abs(session.difference) > 10000) {
            alerts.push({
                type: 'high_difference',
                severity: 'high',
                message: `Diferencia significativa en arqueo: $${session.difference}`
            });
        }

        // Alerta por sesión muy larga
        const hours = this.calculateHours(session.opened_at, session.closed_at || new Date());
        if (hours > 12) {
            alerts.push({
                type: 'long_session',
                severity: 'medium',
                message: `Sesión abierta por más de 12 horas (${hours.toFixed(1)}h)`
            });
        }

        // Alerta por pocas transacciones
        if (summary.salesCount < 10 && hours > 4) {
            alerts.push({
                type: 'low_activity',
                severity: 'low',
                message: 'Baja actividad de ventas en la sesión'
            });
        }

        return alerts;
    }
}

module.exports = new CashSessionService();