import { Router } from 'express';
import { DatabaseAdapter } from '../legacy-adapter';

const router = Router();
const db = new DatabaseAdapter();

/**
 * Crear nueva venta/pedido
 */
router.post('/nueva-venta', async (req, res) => {
    try {
        const { 
            Num_Mesa, 
            comensales = 1, 
            id_camarero, 
            id_caja = 1, 
            observaciones = '' 
        } = req.body;

        if (!Num_Mesa || !id_camarero) {
            return res.status(400).json({
                success: false,
                error: 'Num_Mesa e id_camarero son requeridos'
            });
        }

        // Verificar que la mesa existe
        const mesaCheck = await db.query('SELECT * FROM mesa WHERE Num_Mesa = ? AND activa = 1', [Num_Mesa]);
        if (mesaCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Mesa no encontrada o inactiva'
            });
        }

        // Crear nueva venta
        const insertQuery = `
            INSERT INTO ventadirecta (
                Num_Mesa, comensales, fecha_venta, hora, 
                id_camarero, id_caja, observaciones
            ) VALUES (?, ?, CURDATE(), CURTIME(), ?, ?, ?)
        `;

        const result = await db.query(insertQuery, [
            Num_Mesa, comensales, id_camarero, id_caja, observaciones
        ]);

        res.json({
            success: true,
            id_venta: result.insertId,
            message: 'Venta creada exitosamente',
            Num_Mesa,
            comensales
        });

    } catch (error) {
        console.error('Error al crear venta:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear nueva venta',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Agregar producto a venta
 */
router.post('/agregar-producto', async (req, res) => {
    try {
        const {
            id_venta,
            id_complementog,
            cantidad = 1,
            observaciones = '',
            bloque_cocina = 1
        } = req.body;

        if (!id_venta || !id_complementog) {
            return res.status(400).json({
                success: false,
                error: 'id_venta e id_complementog son requeridos'
            });
        }

        // Verificar que la venta existe y está abierta
        const ventaCheck = await db.query(
            'SELECT * FROM ventadirecta WHERE id_venta = ? AND cerrada = "N"', 
            [id_venta]
        );

        if (ventaCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Venta no encontrada o ya está cerrada'
            });
        }

        // Obtener precio del producto
        const productoQuery = 'SELECT * FROM complementog WHERE id_complementog = ? AND activo = 1';
        const producto = await db.query(productoQuery, [id_complementog]);

        if (producto.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado o inactivo'
            });
        }

        const precio_unitario = producto[0].precio;

        // Insertar línea de venta
        const insertQuery = `
            INSERT INTO ventadir_comg (
                id_venta, id_complementog, cantidad, precio_unitario,
                observaciones, bloque_cocina
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        const result = await db.query(insertQuery, [
            id_venta, id_complementog, cantidad, precio_unitario,
            observaciones, bloque_cocina
        ]);

        // Actualizar total de la venta
        const updateTotalQuery = `
            UPDATE ventadirecta 
            SET total = (
                SELECT SUM(cantidad * precio_unitario) 
                FROM ventadir_comg 
                WHERE id_venta = ?
            )
            WHERE id_venta = ?
        `;
        
        await db.query(updateTotalQuery, [id_venta, id_venta]);

        res.json({
            success: true,
            id_linea: result.insertId,
            message: 'Producto agregado exitosamente',
            producto: producto[0].alias,
            cantidad,
            precio_unitario,
            subtotal: cantidad * precio_unitario
        });

    } catch (error) {
        console.error('Error al agregar producto:', error);
        res.status(500).json({
            success: false,
            error: 'Error al agregar producto',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Obtener detalles de venta
 */
router.get('/venta/:id_venta', async (req, res) => {
    try {
        const { id_venta } = req.params;

        // Obtener información de la venta
        const ventaQuery = `
            SELECT 
                v.*,
                m.descripcion as mesa_descripcion,
                c.nombre as camarero_nombre,
                DATE_FORMAT(v.fecha_venta, "%d/%m/%Y") as fecha_formateada
            FROM ventadirecta v
            JOIN mesa m ON v.Num_Mesa = m.Num_Mesa
            JOIN camareros c ON v.id_camarero = c.id_camarero
            WHERE v.id_venta = ?
        `;

        const venta = await db.query(ventaQuery, [id_venta]);

        if (venta.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Venta no encontrada'
            });
        }

        // Obtener líneas de la venta
        const lineasQuery = `
            SELECT 
                vc.*,
                c.alias as producto_nombre,
                c.descripcion as producto_descripcion,
                t.descripcion as categoria,
                t.color as categoria_color,
                (vc.cantidad * vc.precio_unitario) as subtotal_calculado
            FROM ventadir_comg vc
            JOIN complementog c ON vc.id_complementog = c.id_complementog
            JOIN tipo_comg t ON c.id_tipo_comg = t.id_tipo_comg
            WHERE vc.id_venta = ?
            ORDER BY vc.id_linea
        `;

        const lineas = await db.query(lineasQuery, [id_venta]);

        res.json({
            success: true,
            venta: venta[0],
            lineas,
            resumen: {
                total_lineas: lineas.length,
                total_productos: lineas.reduce((sum, linea) => sum + linea.cantidad, 0),
                total_importe: lineas.reduce((sum, linea) => sum + (linea.cantidad * linea.precio_unitario), 0)
            }
        });

    } catch (error) {
        console.error('Error al obtener venta:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener detalles de venta',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Listar ventas abiertas por mesa
 */
router.get('/ventas-abiertas/:num_mesa?', async (req, res) => {
    try {
        const { num_mesa } = req.params;
        
        let query = `
            SELECT 
                v.*,
                m.descripcion as mesa_descripcion,
                c.nombre as camarero_nombre,
                DATE_FORMAT(v.fecha_venta, "%d/%m/%Y") as fecha_formateada,
                COUNT(vc.id_linea) as total_productos
            FROM ventadirecta v
            JOIN mesa m ON v.Num_Mesa = m.Num_Mesa
            JOIN camareros c ON v.id_camarero = c.id_camarero
            LEFT JOIN ventadir_comg vc ON v.id_venta = vc.id_venta
            WHERE v.cerrada = "N"
        `;
        
        const params = [];
        
        if (num_mesa) {
            query += ' AND v.Num_Mesa = ?';
            params.push(num_mesa);
        }
        
        query += ' GROUP BY v.id_venta ORDER BY v.fecha_venta DESC, v.hora DESC';
        
        const ventas = await db.query(query, params);

        res.json({
            success: true,
            ventas_abiertas: ventas,
            total: ventas.length
        });

    } catch (error) {
        console.error('Error al listar ventas abiertas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener ventas abiertas',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Cerrar venta
 */
router.post('/cerrar-venta', async (req, res) => {
    try {
        const { id_venta } = req.body;

        if (!id_venta) {
            return res.status(400).json({
                success: false,
                error: 'id_venta es requerido'
            });
        }

        // Verificar que la venta existe y está abierta
        const ventaCheck = await db.query(
            'SELECT * FROM ventadirecta WHERE id_venta = ? AND cerrada = "N"',
            [id_venta]
        );

        if (ventaCheck.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Venta no encontrada o ya está cerrada'
            });
        }

        // Cerrar la venta
        const updateQuery = 'UPDATE ventadirecta SET cerrada = "Y" WHERE id_venta = ?';
        await db.query(updateQuery, [id_venta]);

        res.json({
            success: true,
            message: 'Venta cerrada exitosamente',
            id_venta,
            total: ventaCheck[0].total
        });

    } catch (error) {
        console.error('Error al cerrar venta:', error);
        res.status(500).json({
            success: false,
            error: 'Error al cerrar venta',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;