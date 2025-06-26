![LibreScript Logo](assets/librescript-logo.jpg)

Un IDE web completo para el lenguaje de programación LibreScript, con compilador e intérprete integrados.

## ✨ Características

- 🔧 **Editor de código** con resaltado de sintaxis
- ⚡ **Compilador e intérprete** integrados
- 🌐 **Interfaz web** moderna y responsive
- 📝 **Ejecución en tiempo real** del código
- 🎨 **Temas personalizables** para el editor
- 📱 **Diseño responsive** para móviles y desktop

## 🛠️ Tecnologías Utilizadas

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **Compilador**: Nearley.js, Moo.js
- **Editor**: CodeMirror

## 🚀 Instalación Local

### Prerrequisitos
- Node.js >= 18.0.0
- npm o yarn

### Pasos de instalación

1. **Clonar el repositorio**
   ```bash
   git clone <tu-repositorio-url>
   cd LibreScript-IDE
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Ejecutar en modo desarrollo**
   ```bash
   npm run dev
   ```

4. **Ejecutar en producción**
   ```bash
   npm start
   ```

5. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

## 📁 Estructura del Proyecto

```
LibreScript-IDE/
├── Backend/                 # Servidor Node.js
│   ├── app.js              # Servidor principal
│   └── Librescript-main-FINAL/  # Compilador e intérprete
├── Frontend/               # Interfaz de usuario
│   ├── LibreSriptIDE.html  # Página principal
│   ├── app.js              # Lógica del frontend
│   └── mi-lenguaje-mode.js # Modo de sintaxis
├── public/                 # Archivos estáticos
│   ├── hardTest.ls         # Ejemplos de código
│   ├── mediumTest.ls
│   └── librescript-logo.jpg
├── package.json            # Configuración del proyecto
└── README.md              # Este archivo
```

## 🔧 API Endpoints

### POST /execute
Ejecuta código LibreScript y retorna el resultado.

**Request:**
```json
{
  "code": "imprimir('Hola Mundo');"
}
```

**Response:**
```json
{
  "output": ["Tokens", "Arbol", "Errores Semanticos" ]
}
```

## 🎯 Uso del IDE

1. **Escribir código** en el editor
2. **Hacer clic en "Ejecutar"** o presionar Ctrl+Enter
3. **Ver el resultado** en el panel de salida
4. **Guardar archivos** localmente (funcionalidad del navegador)

## 🐛 Solución de Problemas

### Error: "Cannot find module"
```bash
npm install
```

### Error: "Port already in use"
Cambia el puerto en `Backend/app.js` o mata el proceso que usa el puerto 3000.

### Error en Render: "Build failed"
- Verifica que `package.json` tenga el script `start` correcto
- Asegúrate de que todas las dependencias estén en `dependencies` (no en `devDependencies`)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia ISC. Ver el archivo `LICENSE` para más detalles.

## 👨‍💻 Autor

**Nestor Yescas Ramos**
- GitHub: [@Ness024](https://github.com/Ness024)

## 🙏 Agradecimientos

- Nearley.js por el parser
- CodeMirror por el editor
- Express.js por el framework web
