# Scripts de Gestión - SYSME 2.0

Scripts para iniciar, detener y gestionar el sistema.

## 📜 Scripts Disponibles

### Inicio del Sistema
- **`INICIAR_SISTEMA.bat`** - Inicia backend y frontend en modo desarrollo
- **`start-production.bat`** - Inicia el sistema en modo producción

### Detención del Sistema
- **`stop-production.bat`** - Detiene todos los procesos del sistema

### Mantenimiento
- **`fix-and-restart-production.bat`** - Reinicia el sistema tras correcciones

## 🚀 Uso Básico

### Modo Desarrollo
```bash
# Desde la raíz del proyecto
scripts\INICIAR_SISTEMA.bat
```

### Modo Producción
```bash
# Iniciar
scripts\start-production.bat

# Detener
scripts\stop-production.bat

# Reiniciar tras correcciones
scripts\fix-and-restart-production.bat
```

## ⚠️ Notas Importantes

- Los scripts deben ejecutarse desde la raíz del proyecto
- Modo producción usa puertos: Backend 47851, Frontend 23847
- Modo desarrollo usa puertos: Backend 3001, Frontend 5173

---

**Última actualización:** 2025-10-26
