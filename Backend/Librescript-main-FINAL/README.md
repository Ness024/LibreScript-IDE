# 💻 Librescript

Librescript es un lenguaje de programación personalizado inspirado en TypeScript. Utiliza Moo (lexer) y Nearley (parser) para procesar y ejecutar código fuente de forma interpretada. Es ideal para aprender cómo se construye un lenguaje desde cero.

---

## 📦 Requisitos previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (versión 14 o superior)
- **npm** (viene con Node.js)

Puedes verificar si están instalados ejecutando:

```bash 
node -v 
npm -v
```

## 🚀 Cómo ejecutar un archivo de Librescript

 Cada vez que edites grammar.ne, debes compilarla así:
```bash
npx nearleyc src/grammar.ne -o src/grammar.js
```
Para ejecutar el archivo 
```bash
node librescript.js
```

