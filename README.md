# CAMAF Mayakoba (Alpha v2)

Sistema de administración y control de activos fijos desarrollado para Mayakoba.

---

# Tecnologías Utilizadas

## Frontend

- React
- TypeScript
- Electron
- Vite
- Tailwind CSS v4
- Lucide Icons

## Arquitectura

- Electron + React
- Componentes reutilizables
- Hooks personalizados
- CSS modular y organizado
- Alias de rutas con `@`

---

# Objetivo del Proyecto

CAMAF tiene como objetivo facilitar la administración, control y monitoreo de activos fijos dentro de la organización, permitiendo:

- Registro de activos
- Control de inventario
- Gestión administrativa
- Seguimiento de movimientos
- Consulta rápida de información
- Mejor organización interna

---

# Estructura del Proyecto

```bash
src/
│
├── components/
│   ├── ui/
│   └── custom/
│
├── hooks/
│
├── pages/
│
├── styles/
│   ├── global.css
│   ├── login.css
│   └── dashboard.css
│
├── lib/
│
└── main.tsx
```

---

# Instalación

## Clonar repositorio

```bash
git clone <repositorio>
```

---

## Instalar dependencias

```bash
npm install
```

---

## Ejecutar proyecto

```bash
npm run dev
```

---

# Configuración Recomendada

## Extensiones VSCode

- ES7+ React Snippets
- Tailwind CSS IntelliSense
- Error Lens
- Biome
- Prettier
- Material Icon Theme

---

# Estilo Visual del Proyecto

CAMAF utiliza una interfaz moderna inspirada en:

- Linear
- Vercel
- Stripe Dashboard
- Notion

Características visuales:

- Glassmorphism moderado
- Gradientes suaves
- Diseño minimalista
- Espaciado amplio
- Bordes redondeados
- Sombras suaves
- UI empresarial moderna

---

# Convenciones del Proyecto

## Componentes

- Componentes reutilizables
- Separación de lógica y estilos
- Tipado fuerte con TypeScript

---

## CSS

- NO usar estilos inline
- NO usar `<style>` dentro de componentes
- Cada vista importante debe tener su archivo CSS

Ejemplo:

```tsx
import "@/styles/login.css";
```

---

# Alias de Rutas

Configurado:

```json
"paths": {
  "@/*": ["src/*"]
}
```

Ejemplo:

```tsx
import Login from "@/pages/Login";
```

---

# Scripts

## Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Lint

```bash
npm run lint
```

---

# Estado del Proyecto

En desarrollo activo, version alpha v2.
Sujeto a cambios y actualizaciones.

---

# Autor

Yam3101 - Angel Yam
