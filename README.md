# 💎 Gallifrex 2.0 — Tu Universo Financiero a un Clic de Distancia

Stack completo: **Node.js + Express + PostgreSQL** (backend) · **Angular 21** (frontend).

Tema glassmorphism warm-cream, modo oscuro/claro, iconos Lucide, gráficas Chart.js, i18n en 7 idiomas y conversión de divisas en tiempo real.

---

## 🗂️ Estructura del proyecto

```
finance-app/
│
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── pool.js                  Conexión PostgreSQL (pg)
│   │   │   └── init.js                  Creación de tablas
│   │   ├── middleware/
│   │   │   └── auth.middleware.js        Verificación JWT
│   │   └── routes/
│   │       ├── auth.routes.js            Registro / login / perfil
│   │       ├── expense.routes.js         CRUD movimientos (fecha YYYY-MM-DD)
│   │       ├── category.routes.js        CRUD categorías
│   │       ├── budget.routes.js          CRUD presupuestos
│   │       └── dashboard.routes.js       KPIs + cashflow + gasto por categoría
│   ├── .env.example
│   └── package.json
│
└── frontend/
    └── src/
        ├── styles.scss                   Variables CSS, glass-card, botones, .confirm global
        ├── assets/
        │   ├── gallifrex-logo.png
        │   └── i18n/                     JSONs cargados lazy por HttpClient
        │       ├── es.json               Español
        │       ├── en.json               English
        │       ├── de.json               Deutsch
        │       ├── fr.json               Français
        │       ├── ca.json               Català
        │       ├── gl.json               Galego
        │       └── eu.json               Euskera
        └── app/
            ├── app.config.ts             APP_INITIALIZER → carga idioma antes del render
            ├── app.routes.ts
            ├── app.component.ts
            │
            ├── core/
            │   ├── interceptors/
            │   │   └── auth.interceptor.ts        JWT en todas las peticiones
            │   ├── models/
            │   │   └── models.ts                  Expense · Category · Budget · Dashboard…
            │   ├── pipes/
            │   │   └── translate.pipe.ts           Pipe | t  (pure: false, reactivo a signal)
            │   ├── services/
            │   │   ├── api.services.ts             ExpenseService · CategoryService · BudgetService · DashboardService
            │   │   ├── auth.service.ts             Login / register / JWT
            │   │   ├── currency.service.ts         Conversión de divisas (frankfurter.app) + caché 1h
            │   │   ├── lucide.service.ts           Refresh global de iconos + MutationObserver
            │   │   ├── theme.service.ts            Toggle oscuro/claro + persistencia
            │   │   └── translation.service.ts      Carga JSON, signal current(), caché en memoria
            │   └── utils/
            │       └── csv-export.util.ts          Exportación de tablas a CSV
            │
            ├── shared/
            │   └── components/
            │       └── shell/
            │           ├── shell.component.ts      Sidebar, topbar, selectores de divisa e idioma
            │           ├── shell.component.html
            │           └── shell.component.scss
            │
            └── features/
                ├── auth/
                │   ├── login/       login.component.ts  .html  .scss
                │   └── register/    register.component.ts  .html  .scss
                ├── dashboard/       dashboard.component.ts  .html  .scss
                ├── expenses/        expenses.component.ts  .html  .scss
                ├── budgets/         budgets.component.ts  .html  .scss
                └── categories/      categories.component.ts  .html  .scss
```

---

## 🚀 Inicio rápido

### 1. PostgreSQL
```sql
CREATE DATABASE financedb;
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env        # edita DB_HOST, DB_USER, DB_PASSWORD, JWT_SECRET
node src/db/init.js          # crea las tablas
npm run dev                  # http://localhost:3000
```

**.env mínimo**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financedb
DB_USER=postgres
DB_PASSWORD=tu_password
JWT_SECRET=una_clave_secreta_larga
PORT=3000
```

### 3. Frontend
```bash
cd frontend
npm install
ng serve                     # http://localhost:4200
```

### Tests
```bash
cd frontend
npm test               # vitest run
npm run test:coverage  # con reporte de cobertura
```

---

## 📡 API — Endpoints

Todos los endpoints (excepto `/api/auth/*`) requieren `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Login → JWT |
| GET  | `/api/auth/me` | Perfil del usuario autenticado |
| GET  | `/api/expenses` | Listado con filtros: `month`, `year`, `type`, `search`, `limit`, `offset` |
| POST | `/api/expenses` | Crear movimiento (`date` en `YYYY-MM-DD`) |
| PUT  | `/api/expenses/:id` | Editar movimiento |
| DELETE | `/api/expenses/:id` | Eliminar movimiento |
| GET  | `/api/categories` | Listar categorías del usuario |
| POST | `/api/categories` | Crear categoría |
| PUT  | `/api/categories/:id` | Editar categoría |
| DELETE | `/api/categories/:id` | Eliminar categoría |
| GET  | `/api/budgets` | Presupuestos del mes con gasto real acumulado |
| POST | `/api/budgets` | Crear presupuesto |
| DELETE | `/api/budgets/:id` | Eliminar presupuesto |
| GET  | `/api/dashboard/summary` | KPIs + cashflow 7 meses + donut por categoría + últimas transacciones |

---

## 🛠️ Stack técnico

### Backend
| Paquete | Versión | Uso |
|---------|---------|-----|
| Express | ^4.18 | Servidor HTTP |
| pg | ^8.11 | Cliente PostgreSQL |
| bcryptjs | ^2.4 | Hash de contraseñas |
| jsonwebtoken | ^9.0 | Autenticación JWT |
| express-validator | ^7.0 | Validación de inputs (`date` → `YYYY-MM-DD strictMode`) |
| helmet | ^7.1 | Cabeceras de seguridad HTTP |
| morgan | ^1.10 | Logging de peticiones |
| dotenv | ^16.3 | Variables de entorno |
| nodemon | ^3.0 | Hot-reload en desarrollo |

### Frontend
| Paquete | Versión | Uso |
|---------|---------|-----|
| Angular | ^21.0 | Framework (Standalone Components + Signals) |
| Chart.js | ^4.4 | Gráfica de línea (cashflow), donut y barras (categorías) |
| Lucide | CDN | Iconos SVG gestionados por `LucideService` |
| Vitest | ^2.0 | Tests unitarios |
| Zone.js | ~0.15 | Change detection Angular |

---

## 🎨 Diseño

**Paleta Gallifrex 2.0**

| Token | Dark | Light |
|-------|------|-------|
| `--bg-1` | `#071a21` | `#f5ede0` |
| `--accent` | `#b8976a` | `#9a7540` |
| `--accent2` | `#2a8c7a` | `#1f6b5a` |
| `--green` | `#1abf9a` | `#158a70` |
| `--red` | `#e05a6a` | `#c04455` |

**Tipografías:** Cinzel (títulos · serif) · DM Sans (UI) · Space Grotesk (valores numéricos)

---

## ✨ Características principales

### Angular moderno
- Standalone components 100%, sin NgModules
- `signal()`, `computed()`, `effect()` para estado reactivo
- `APP_INITIALIZER` garantiza que el JSON de idioma esté cargado antes del primer render
- `HttpInterceptor` funcional inyecta JWT automáticamente en cada petición

### Sistema de iconos
- Lucide Icons vía CDN (`data-lucide="..."`)
- `LucideService` con `MutationObserver` sobre `document.body`: detecta nuevos elementos en el DOM y ejecuta `createIcons()` con debounce de 30 ms — ningún componente necesita gestionarlo manualmente

### 🌍 i18n — 7 idiomas

Sin dependencias externas. Implementación propia con `HttpClient` + signals.

| Código | Idioma |
|--------|--------|
| 🇪🇸 ES | Español |
| 🇬🇧 EN | English |
| 🇩🇪 DE | Deutsch |
| 🇫🇷 FR | Français |
| 🏴 CA | Català |
| 🏴 GL | Galego |
| 🏴 EU | Euskera |

- JSONs cargados lazy por `HttpClient` y cacheados en memoria tras la primera carga
- `TranslationService` expone `signal current()` con el código activo
- Pipe `| t` declarado `pure: false` — se re-evalúa automáticamente al cambiar el signal, sin necesidad de suscripciones manuales
- `APP_INITIALIZER` bloquea el render hasta que el JSON del idioma guardado esté disponible — sin flash de claves sin traducir
- Selector en la topbar con bandera + código, preferencia persistida en `localStorage`
- Traducción completa de: navegación, KPIs, filtros, tablas, formularios, mensajes de error, meses del calendario y modales de confirmación

### 💱 Conversión de divisas

10 divisas disponibles con tipos de cambio en tiempo real.

| Divisa | Símbolo |
|--------|---------|
| 🇪🇺 EUR | € |
| 🇺🇸 USD | $ |
| 🇬🇧 GBP | £ |
| 🇯🇵 JPY | ¥ |
| 🇨🇭 CHF | Fr |
| 🇨🇦 CAD | C$ |
| 🇦🇺 AUD | A$ |
| 🇨🇳 CNY | ¥ |
| 🇲🇽 MXN | $ |
| 🇧🇷 BRL | R$ |

- Fuente: [frankfurter.app](https://www.frankfurter.app) — API abierta, sin API key, base EUR
- Tasas cacheadas en `localStorage` durante 1 hora para minimizar peticiones
- Fallback con tasas aproximadas si la API no está disponible
- `CurrencyService.format()` lee `current()` (signal) — todos los valores monetarios de la app se actualizan al instante al cambiar de divisa sin recargar
- Selector en la topbar junto al de idioma, preferencia persistida en `localStorage`

### Funcionalidades por módulo

**Dashboard**
- KPIs del mes: balance total, ingresos, gastos y ahorro neto
- Gráfica cashflow de línea (últimos 7 meses)
- Gráfica por categoría con toggle donut ↔ barras
- Últimos movimientos con acceso rápido

**Movimientos**
- Filtros combinables: tipo, categoría, mes, año, texto libre
- Paginación de 20 en 20
- Exportación CSV con los filtros activos
- Modal de creación/edición con selector de tipo reactivo

**Presupuestos**
- Límites mensuales por categoría de gasto
- Barra de progreso animada con colores semáforo (verde / amarillo / rojo)
- KPIs globales: total presupuestado, gastado, restante y % utilizado

**Categorías**
- Grid de emojis predefinidos + campo libre para cualquier emoji
- Selector de color con 12 opciones
- Preview en tiempo real del icono y nombre
- Protección de categorías por defecto (no eliminables)

**UX general**
- Modal de confirmación de borrado uniforme en los 3 módulos — estilos en `styles.scss` global para evitar problemas de View Encapsulation
- Modo oscuro / claro con transición suave, persistido en `localStorage`
- Responsive mobile-first con sidebar deslizable