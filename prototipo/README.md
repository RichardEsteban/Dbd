# Transporte Seguro – prototipo

Prototipo de pantallas en HTML + CSS + JavaScript puro (sin dependencias ni base de datos).
Los datos viven en memoria: al recargar la página vuelven al estado inicial.

## Cómo abrirlo
Doble clic en `index.html`, o desde esta carpeta:

    py -m http.server 8765

y abrir http://localhost:8765. Atajos: `?role=gerente`, `?role=supervisor`, `?role=admin`,
`?role=cliente`, `?role=demo` entran directo con ese perfil.

## Cuentas de demostración (clave 123456)
- Personal: 40000000 (demo), 40000001 (gerente), 40000002 (supervisor), 40000003 (administrador).
- Clientes: 70112233 (Juan Ramos), 20601234567 (Comercial Norte SAC), 45871236 (María Vera).
- El cliente también puede **crear su propia cuenta** desde el login (DNI/RUC, correo y contraseña).

## Estructura
- `js/data.js`      datos de ejemplo y reglas de cálculo (espacio, precio, horas esperadas).
- `js/ui.js`        árbol de módulos, rutas, componentes y motor de mantenimiento (agregar/editar/eliminar).
- `js/modules.js`   parámetros, catálogos, data-entry, asignación de ticket (con pago) y reportes.
- `js/modules2.js`  indicadores, batch y técnico.
- `js/portal.js`    portal del cliente (catálogo, cotizar, pago, rastreo).

## Guion de demostración (10 minutos)
1. **Acceso**: login con DNI + QR y perfiles (Seguridad).
2. **Parámetros (2.1.1.1)**: solo **tipos**: vehículo, carga, contenedor, alcance, horario, servicio y autómata. Pase el cursor sobre el ⓘ del
   tipo de contenedor (1 ticket = 1 m³). Intente eliminar el tipo Camión → se bloquea porque lo usan vehículos y productos.
2b. **Registro de flota (2.2.1.3)**: placas, contenedores y autómatas con su estado; sus características estándar salen del tipo. Ponga un blindado en MANTENIMIENTO y cotice traslado de valores → no hay unidad.
3. **Catálogo de productos y reglas**: producto = combinación de tipos (vehículo + contenedor + carga + horario + protocolo + servicio); ya no existe catálogo de compatibilidad; REG-06 (Express exclusivo de una sola carga).
4. **Registro de cliente (2.2.1.1)** con validación de DNI/RUC.
5. **Asignación de ticket (2.2.1.2)** en 6 pasos: cliente y carga → servicio y espacio (tickets y kg) → precio con IGV →
   confirmación → **medio de pago** → **orden de pago** con tarjeta (validaciones) → ticket PAGADO.
   Pruebe Express sobre un viaje que ya tiene tickets → lo rechaza REG-06.
6. **Reportes (2.2.2)**: disponibilidad, seguimiento por 7 pasos (con retraso → incidente), clientes, **tarifas** (ⓘ Tarifa fija),
   tickets e incidentes.
7. **Aplicativo (3.1)**: avanzar reloj y ejecutar la actualización → libera reservas vencidas; generar indicadores.
8. **Consulta de indicadores (2.1.2.1)** lee lo generado por el batch.
9. **Técnico (3.2)**: backup manual → generar otro ticket → restaurar (los datos vuelven de verdad).
10. **Peso vs. volumen**: 6 unidades de gas el 26/06 caben en tickets pero no en kg (350 kg c/u) → se rechaza por peso.
11. **Portal del cliente**: catálogo, cotizar con direcciones, medio de pago, orden de pago y rastreo.

## Servicios disponibles
- **Económico (por ticket):** perecible (Mar y Mié), abarrotes (Jue y Sáb), medicamentos (Mar), gas (Vie).
- **Express (tarifa fija, contenedor exclusivo):** frágil (Lun), medicamentos (Jue) y **traslado de valores** (Lun y Vie).
- **Traslado de valores (dinero en efectivo):** solo en unidad y contenedor blindados, siempre Express, con protocolo PROT-005 (entrega contra firma). La empresa solo transporta: no incluye escolta.
- 14 rutas operativas entre provincias (Lima, Chiclayo, Trujillo, Piura, Arequipa, Ica, Cusco, Junín, Tacna); Lima → Loreto queda sin operar (falta distancia y duración).

## Definiciones que usa el prototipo
- **Parámetro** = variable fija que define el producto; solo se mantienen **tipos** (no placas ni estados). Las unidades físicas van en el **Registro de flota**. Tarifas y seguimiento son **reportes**, no parámetros.
- **Producto** = tipo de vehículo + tipo de carga + horario + protocolo + tipo de servicio (la tarifa sale del reporte).
- **Ticket** = espacio comprometido (1 ticket = 1 m³ mínimo, y kg) en el contenedor de una unidad para un viaje en una fecha.
- **Express** = tarifa fija, reserva todo el contenedor y es exclusivo de una sola carga, cualquiera sea su tipo.
- **Seguimiento** = secuencia de 7 pasos confirmados por autómatas o por el sistema (sin GPS).

