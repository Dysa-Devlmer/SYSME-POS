import { Router } from 'express';
import { DatabaseAdapter } from '../legacy-adapter';

const router = Router();
const db = new DatabaseAdapter();

/**
 * Panel de cocina - Obtiene pedidos pendientes para cocina
 * Emula la funcionalidad de panelcocina.php del sistema original
 */
router.get('/panel', async (req, res) => {
    try {
        // Query que emula el comportamiento original de panelcocina.php
        const query = `
            SELECT 
                v.id_venta,
                v.Num_Mesa,
                v.comensales,
                v.fecha_venta,
                v.hora,
                DATE_FORMAT(v.fecha_venta, "%d/%m/%Y") as fecha,
                m.descripcion as mesa
            FROM ventadirecta v, mesa m 
            WHERE v.Num_Mesa = m.Num_Mesa 
                AND (v.cerrada = "N" or v.cerrada = "M") 
                AND v.id_venta IN (
                    SELECT id_venta FROM ventadir_comg 
                    WHERE cocina > servido_cocina 
                        AND id_complementog IN (
                            SELECT id_complementog FROM complementog WHERE cocina = "Y"
                        )
                ) 
            ORDER BY v.id_venta
        `;

        const pendingOrders = await db.query(query);
        
        // Para cada pedido, obtener los bloques y productos
        const ordersWithDetails = [];
        
        for (const order of pendingOrders) {
            // Obtener bloques únicos
            const blocksQuery = `
                SELECT DISTINCT vc.bloque_cocina as bloque_cocina 
                FROM ventadir_comg vc, complementog c 
                WHERE vc.cocina > vc.servido_cocina 
                    AND vc.id_venta = ? 
                    AND vc.id_complementog = c.id_complementog 
                    AND c.cocina = "Y" 
                ORDER BY bloque_cocina
            `;
            
            const blocks = await db.query(blocksQuery, [order.id_venta]);
            const blocksWithProducts = [];
            
            for (const block of blocks) {
                // Obtener productos del bloque
                const productsQuery = `
                    SELECT 
                        vc.*,
                        t.color as color,
                        c.alias,
                        c.descripcion,
                        (vc.cocina - vc.servido_cocina) as pendiente
                    FROM ventadir_comg vc, complementog c, tipo_comg t
                    WHERE t.id_tipo_comg = c.id_tipo_comg 
                        AND vc.cocina > vc.servido_cocina 
                        AND vc.id_venta = ? 
                        AND vc.bloque_cocina = ? 
                        AND vc.id_complementog = c.id_complementog 
                        AND c.cocina = "Y" 
                    ORDER BY id_linea
                `;
                
                const products = await db.query(productsQuery, [order.id_venta, block.bloque_cocina]);
                
                blocksWithProducts.push({
                    bloque: block.bloque_cocina,
                    productos: products
                });
            }
            
            ordersWithDetails.push({
                ...order,
                bloques: blocksWithProducts
            });
        }
        
        res.json({
            success: true,
            pedidos_pendientes: ordersWithDetails,
            total_pedidos: ordersWithDetails.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error en panel de cocina:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener pedidos pendientes',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Marcar producto como servido desde cocina
 */
router.post('/marcar-servido', async (req, res) => {
    try {
        const { id_venta, id_linea, cantidad_servida } = req.body;
        
        if (!id_venta || !id_linea || !cantidad_servida) {
            return res.status(400).json({
                success: false,
                error: 'Parámetros requeridos: id_venta, id_linea, cantidad_servida'
            });
        }
        
        // Actualizar cantidad servida
        const updateQuery = `
            UPDATE ventadir_comg 
            SET servido_cocina = servido_cocina + ?,
                hora_servido = CURTIME()
            WHERE id_venta = ? AND id_linea = ?
                AND (servido_cocina + ?) <= cocina
        `;
        
        const result = await db.query(updateQuery, [
            cantidad_servida, 
            id_venta, 
            id_linea,
            cantidad_servida
        ]);
        
        if (result.affectedRows === 0) {
            return res.status(400).json({
                success: false,
                error: 'No se pudo marcar como servido (cantidad inválida o producto ya servido)'
            });
        }
        
        res.json({
            success: true,
            message: 'Producto marcado como servido',
            id_venta,
            id_linea,
            cantidad_servida
        });
        
    } catch (error) {
        console.error('Error al marcar como servido:', error);
        res.status(500).json({
            success: false,
            error: 'Error al marcar producto como servido',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Enviar pedido completo a cocina
 * Emula la funcionalidad de operaciones_venta.php
 */
router.post('/enviar-cocina', async (req, res) => {
    try {
        const { id_venta, id_caja = 1 } = req.body;
        
        if (!id_venta) {
            return res.status(400).json({
                success: false,
                error: 'id_venta es requerido'
            });
        }
        
        // Verificar que la venta existe y no está cerrada
        const ventaQuery = 'SELECT * FROM ventadirecta WHERE id_venta = ? AND cerrada = "N"';
        const venta = await db.query(ventaQuery, [id_venta]);
        
        if (venta.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Venta no encontrada o ya está cerrada'
            });
        }
        
        // Registrar envío a cocina
        const insertQuery = 'INSERT INTO venta_cocina (id_venta, id_caja) VALUES (?, ?)';
        await db.query(insertQuery, [id_venta, id_caja]);
        
        // Actualizar cantidades en cocina para productos que lo requieren
        const updateQuery = `
            UPDATE ventadir_comg vc
            JOIN complementog c ON vc.id_complementog = c.id_complementog
            SET vc.cocina = vc.cantidad,
                vc.hora_cocina = CURTIME()
            WHERE vc.id_venta = ? 
                AND c.cocina = 'Y' 
                AND vc.cocina < vc.cantidad
        `;
        
        const updateResult = await db.query(updateQuery, [id_venta]);
        
        res.json({
            success: true,
            message: 'Pedido enviado a cocina exitosamente',
            id_venta,
            productos_enviados: updateResult.affectedRows,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error al enviar a cocina:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar pedido a cocina',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Obtener estadísticas de cocina
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await Promise.all([
            // Pedidos pendientes
            db.query(`
                SELECT COUNT(DISTINCT v.id_venta) as total
                FROM ventadirecta v
                WHERE v.cerrada = "N" 
                    AND EXISTS (
                        SELECT 1 FROM ventadir_comg vc
                        JOIN complementog c ON vc.id_complementog = c.id_complementog
                        WHERE vc.id_venta = v.id_venta 
                            AND c.cocina = "Y"
                            AND vc.cocina > vc.servido_cocina
                    )
            `),
            
            // Productos pendientes
            db.query(`
                SELECT COUNT(*) as total
                FROM ventadir_comg vc
                JOIN complementog c ON vc.id_complementog = c.id_complementog
                JOIN ventadirecta v ON vc.id_venta = v.id_venta
                WHERE v.cerrada = "N" 
                    AND c.cocina = "Y"
                    AND vc.cocina > vc.servido_cocina
            `),
            
            // Tiempo promedio de preparación (últimas 24h)
            db.query(`
                SELECT AVG(TIMESTAMPDIFF(MINUTE, vc.hora_cocina, vc.hora_servido)) as tiempo_promedio
                FROM ventadir_comg vc
                WHERE vc.hora_cocina IS NOT NULL 
                    AND vc.hora_servido IS NOT NULL
                    AND DATE(vc.created_at) = CURDATE()
            `)
        ]);
        
        res.json({
            success: true,
            stats: {
                pedidos_pendientes: stats[0][0]?.total || 0,
                productos_pendientes: stats[1][0]?.total || 0,
                tiempo_promedio_minutos: Math.round(stats[2][0]?.tiempo_promedio || 0)
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error en estadísticas de cocina:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;