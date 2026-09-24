# Transporte Seguro – prototipo

Prototipo de pantallas en HTML + CSS + JavaScript puro (sin dependencias ni base de datos).
Los datos viven en memoria: al recargar la página vuelven al estado inicial.

## Cómo abrirlo
Doble clic en `index.html`, o desde esta carpeta:

    py -m http.server 8765

y abrir http://localhost:8765. Atajos: `?role=gerente`, `?role=supervisor`, `?role=admin`,
`?role=cliente`, `?role=demo` entran directo con ese perfil.

## Estructura
- `js/data.js`      datos de ejemplo y reglas de cálculo (espacio, precio, horas esperadas).
- `js/ui.js`        árbol de módulos, rutas, componentes y motor de mantenimiento (agregar/editar/eliminar).
- `js/modules.js`   parámetros, catálogos, data-entry, asignación de ticket (con pago) y reportes.
- `js/modules2.js`  indicadores, batch y técnico.
- `js/portal.js`    portal del cliente (catálogo, cotizar, pago, rastreo).

## Guion de demostración (10 minutos)
1. **Acceso**: login con DNI + QR y perfiles (Seguridad).
2. **Parámetros (2.1.1.1)**: Vehículo, Carga, Contenedor, Alcance, Horario, Servicio y Autómata. Pase el cursor sobre el ⓘ del
   Contenedor (1 ticket = 1 m³). Intente eliminar una carga con envíos EN RUTA → se bloquea.
3. **Catálogo de productos y reglas**: producto = combinación de parámetros; REG-06 (Express exclusivo de una sola carga).
4. **Registro de cliente (2.2.1.1)** con validación de DNI/RUC.
5. **Asignación de ticket (2.2.1.2)** en 6 pasos: cliente y carga → servicio y espacio (tickets y kg) → precio con IGV →
   confirmación → **medio de pago** → **orden de pago** con tarjeta (validaciones) → ticket PAGADO.
   Pruebe Express sobre un viaje que ya tiene tickets → lo rechaza REG-06.
6. **Reportes (2.2.2)**: disponibilidad, seguimiento por 7 pasos (con retraso → incidente), clientes, **tarifas** (ⓘ Tarifa fija),
   tickets e incidentes.
7. **Aplicativo (3.1)**: avanzar reloj y ejecutar la actualización → libera reservas vencidas; generar indicadores.
8. **Consulta de indicadores (2.1.2.1)** lee lo generado por el batch.
9. **Técnico (3.2)**: backup manual → generar otro ticket → restaurar (los datos vuelven de verdad).
10. **Portal del cliente**: catálogo, cotizar con direcciones, medio de pago, orden de pago y rastreo.

## Definiciones que usa el prototipo
- **Parámetro** = variable fija que define el producto. Tarifas y seguimiento son **reportes**, no parámetros.
- **Producto** = tipo de vehículo + tipo de carga + horario + protocolo + tipo de servicio (la tarifa sale del reporte).
- **Ticket** = espacio comprometido (1 ticket = 1 m³ mínimo, y kg) en el contenedor de una unidad para un viaje en una fecha.
- **Express** = tarifa fija, reserva todo el contenedor y es exclusivo de una sola carga, cualquiera sea su tipo.
- **Seguimiento** = secuencia de 7 pasos confirmados por autómatas o por el sistema (sin GPS).
