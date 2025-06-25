/**
 * @file app.js
 * @brief Archivo principal de la aplicación LibreScript IDE
 * @author LibreScript Team
 * @date 2025
 * @version 1.0.0
 * @details
 * Este archivo contiene la lógica principal de la aplicación, incluyendo la configuración del editor de código,
 * la ejecución del código, el análisis léxico y sintáctico, y la gestión de la terminal.
 * * @note
 * Este archivo es parte del proyecto LibreScript IDE, un entorno de desarrollo integrado para el lenguaje de programación LibreScript.
 * 
*/

function runCode() {
    const code = codeEditor.getValue();

    if (!code || code.trim() === '') {
        //document.getElementById('output').innerText = 'Error: No code provided';
        addTerminalLine("Error: No se proporcionó código para ejecutar.", "terminal-error");
        return;
    }

    console.log('Running code:', code);
    fetch('http://Localhost:3000/execute', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })

    })
        .then(response => response.json())
        .then(data => {
            libreScriptExecute(data);
            console.log('Code executed successfully:', data.output);
        })
        .catch(error => {
            //document.getElementById('output').innerText = 'Error: ' + error.message;
            addTerminalLine(`Error al ejecutar el código: ${error.message}`, "terminal-error");
        });
}
const libreScriptExecute = (data) => {
    // Mensajes generales
    if (data.output.messages && Array.isArray(data.output.messages)) {
        data.output.messages.forEach(msg => addTerminalLine(msg, "terminal-success"));
    }

    // 1. Errores léxicos y tokens
    const lexerOutput = document.getElementById('lexer-output');
    lexerOutput.innerHTML = "";
    const lexErrors = data.output.semantic?.errors?.lex;
    if (lexErrors && lexErrors.length > 0) {
        lexerOutput.innerHTML += "<b>Errores léxicos:</b><br>" +
            lexErrors.map(e => `<div class='terminal-error'>${e.message || e}</div>`).join("");
    }
    if (data.output.tokens && data.output.tokens.length > 0) {
        lexerOutput.innerHTML += `<div class="token-json-output">${formatTokenOutput(data.output.tokens)}</div>`;
    }

    // 2. Errores sintácticos y AST
    const parserOutput = document.getElementById('parser-output');
    parserOutput.innerHTML = "";
    const syntaxError = data.output.semantic?.errors?.syntax;
    if (syntaxError) {
        // Si el error sintáctico es causado por un token de tipo 'error', mostrar mensaje especial
        let extraMsg = "";
        if (syntaxError.token && syntaxError.token.type === 'error') {
            extraMsg = `<div class='terminal-error'><b>Nota:</b> El análisis sintáctico falló debido a un <b>error léxico</b> detectado por el lexer. Corrige el token inválido para continuar.</div>`;
        }
        parserOutput.innerHTML += `<b>Error sintáctico:</b><br><div class='terminal-error'>${syntaxError.message}</div>${extraMsg}`;
    }
    if (data.output.ast) {
        parserOutput.innerHTML += formatAST(data.output.ast);
    }

    // 3. Errores semánticos
    const grammarOutput = document.getElementById('grammar-output');
    grammarOutput.innerHTML = "";
    const semanticError = data.output.semantic?.errors?.semantic;
    if (semanticError) {
        grammarOutput.innerHTML = `<b>Error semántico:</b><br><div class='terminal-error'>${semanticError.message}</div>`;
    } else {
        grammarOutput.innerText = "No hay errores semánticos";
    }

    // 4. Terminal: todos los errores en texto plano
    if (data.output.errors && Array.isArray(data.output.errors)) {
        data.output.errors.forEach(err => addTerminalLine(err, "terminal-error"));
    }
};

// Inicializar CodeMirror
const codeEditor = CodeMirror.fromTextArea(
    document.getElementById("code-editor"),
    {
        // ===== Configuración básica =====
        mode: "librescript",  // Lenguaje (puede ser "html", "css", "python", etc.)
        theme: "dracula",     // Tema de colores (otros: "default", "monokai", "material")
        lineNumbers: true,    // Mostrar números de línea
        indentUnit: 2,        // Espacios por indentación
        tabSize: 2,           // Tamaño del tabulador
        lineWrapping: true,   // Ajuste de línea (si el código es muy largo)
        indentWithTabs: false,
        smartIndent: true,    // (por defecto true)

        // ===== Auto-cierre y coincidencia de brackets =====
        autoCloseBrackets: true,  // Cierra automáticamente ({[ ]})
        matchBrackets: true,      // Resalta brackets coincidentes
        autoCloseTags: true,      // Útil para HTML/XML (cierra </tags>)

        // ===== Teclas personalizadas =====
        extraKeys: {
            "Tab": function (cm) {
                if (cm.somethingSelected()) {
                    cm.indentSelection("add");
                } else {
                    cm.replaceSelection("  ", "end");
                }
            },
            "Shift-Tab": function (cm) {
                cm.indentSelection("subtract");
            },
            "Enter": function(cm) {
                cm.execCommand("newlineAndIndent");
            },
            "Ctrl-Space": "autocomplete" // Atajo para abrir el autocompletado
        },

        // ===== Otras opciones útiles =====
        foldGutter: true,       // Permite plegar código (necesita gutters)
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],  // Añade secciones laterales
        lint: true,             // Validación en tiempo real (depende del modo)
        highlightSelectionMatches: { showToken: true },  // Resalta texto similar
        hintOptions: {
            hint: librescriptHint
        }
    }
);

// Elementos del DOM
const runBtn = document.getElementById('run-btn');
const clearBtn = document.getElementById("clear-btn");
const exampleBtn = document.getElementById("example-btn");
const exampleSelect = document.getElementById("example-select");
const lexerOutput = document.getElementById("lexer-output");
const parserOutput = document.getElementById("parser-output");
const grammarOutput = document.getElementById("grammar-output");
const copyLexerBtn = document.getElementById("copy-lexer");
const copyParserBtn = document.getElementById("copy-parser");
const copyGrammarBtn = document.getElementById("copy-grammar");
const container = document.querySelector(".container");
const terminal = document.getElementById("terminal");
const terminalContent = document.getElementById("terminal-content");
const terminalToggle = document.getElementById("terminal-toggle");
const terminalBadge = document.getElementById("terminal-badge");
const closeTerminalBtn = document.getElementById("close-terminal");
const clearTerminalBtn = document.getElementById("clear-terminal");

// Boton de ejecución
runBtn.addEventListener('click', runCode);



/**
 * -----------------------------------------------
 *            CONFIGURACIÓNES GENERALES 
 * ----------------------------------------------- 
 * |NOTA|: no se recomienda modificar de aqui para abajo estas configuraciones a menos que sepas lo que estás haciendo
 */

// Terminal state
let terminalOpen = false;
let errorCount = 0;

// Función para agregar una línea a la terminal
function addTerminalLine(text, type = "") {
    const line = document.createElement("div");
    line.className = `terminal-line ${type}`;

    const prompt = document.createElement("span");
    prompt.className = "terminal-prompt";
    prompt.textContent = "root@LibreScript:~$ ";

    const content = document.createElement("span");
    content.textContent = text;

    line.appendChild(prompt);
    line.appendChild(content);
    terminalContent.appendChild(line);

    terminalContent.scrollTop = terminalContent.scrollHeight;

    if (type === "terminal-error") {
        errorCount++;
        terminalBadge.textContent = errorCount;
        terminalBadge.classList.add("show");

        if (errorCount === 1 && !terminalOpen) {
            toggleTerminal();
        }
    }
}

// Funciones de la terminal
function toggleTerminal() {
    terminalOpen = !terminalOpen;
    terminal.classList.toggle("open", terminalOpen);
    container.classList.toggle("terminal-open", terminalOpen);
    terminalToggle.classList.toggle("open", terminalOpen);

    if (terminalOpen) {
        // Reset error badge when terminal is opened
        errorCount = 0;
        terminalBadge.textContent = "0";
        terminalBadge.classList.remove("show");
    }
}

function closeTerminal() {
    terminalOpen = false;
    terminal.classList.remove("open");
    container.classList.remove("terminal-open");
    terminalToggle.classList.remove("open");
}

function clearTerminal() {
    terminalContent.innerHTML = `
                <div class="terminal-line">
                    <span class="terminal-prompt">root@LibreScript:~$</span> 
                    <span>Terminal limpiada</span>
                </div>
            `;
    errorCount = 0;
    terminalBadge.textContent = "0";
    terminalBadge.classList.remove("show");
}

// Agregar atajo de teclado para la terminal (Ctrl+`)
document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "`") {
        toggleTerminal();
    }
});

// Escuchadores de eventos de la terminal
terminalToggle.addEventListener("click", toggleTerminal);
closeTerminalBtn.addEventListener("click", closeTerminal);
clearTerminalBtn.addEventListener("click", clearTerminal);

// Formatear JSON con resaltado de sintaxis
function formatJSON(obj) {
    const json = JSON.stringify(obj, null, 2);
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

function formatTokenOutput(tokens) {
    const coloredTokens = tokens.map(token => {
        const typeClass = getTokenClass(token.type);
        const valueClass = token.type === 'texto' ? 'token-string' : 'token-value';

        return `    {
      <span class="json-key">"type"</span>: <span class="${typeClass}">"${escapeHtml(token.type)}"</span>,
      <span class="json-key">"value"</span>: <span class="${valueClass}">"${escapeHtml(token.value)}"</span>,
      <span class="json-key">"text"</span>: <span class="${valueClass}">"${escapeHtml(token.text)}"</span>,
      <span class="json-key">"line"</span>: <span class="json-number">${token.line}</span>,
      <span class="json-key">"col"</span>: <span class="json-number">${token.col}</span>
    }`;
    });

    return `<pre class="token-json-output">[
${coloredTokens.join(',\n')}
]</pre>`;
}

function getTokenClass(tokenType) {
    if (tokenType.startsWith('PR_')) return 'token-keyword';
    if (tokenType.startsWith('TIPO_')) return 'token-type';
    if (tokenType.startsWith('LIT_')) return 'token-literal';
    if (tokenType.startsWith('OP_')) return 'token-operator';
    if (tokenType === 'numero') return 'token-number';
    if (tokenType === 'texto') return 'token-string';
    if (tokenType.startsWith('IDENTIFICADOR_')) return 'token-identifier';
    if (tokenType.includes('PAREN') || tokenType.includes('BRACE') || tokenType.includes('BRACKET')) return 'token-bracket';
    if (tokenType.includes('COMA') || tokenType.includes('PUNTO')) return 'token-punctuation';
    return 'token-default';
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function formatAST(ast) {
    const replacer = (key, value) => {
        if (key === 'type') {
            return `<span class="ast-type">${value}</span>`;
        }
        if (typeof value === 'string') {
            if (key === 'operador' || key === 'tipo') {
                return `<span class="ast-operator">${value}</span>`;
            }
            if (key === 'nombre' || key === 'propiedad') {
                if (value.startsWith('$$')) {
                    return `<span class="ast-identifier-const">${value}</span>`;
                } else if (value.startsWith('$')) {
                    return `<span class="ast-identifier-var">${value}</span>`;
                }
                return `<span class="ast-identifier">${value}</span>`;
            }
            return `<span class="ast-value-string">"${escapeHtml(value)}"</span>`;
        }
        if (typeof value === 'number') {
            return `<span class="ast-value-number">${value}</span>`;
        }
        if (typeof value === 'boolean') {
            return `<span class="ast-value-boolean">${value}</span>`;
        }
        if (value === null) {
            return `<span class="ast-value-null">null</span>`;
        }
        return value;
    };

    const json = JSON.stringify(ast, replacer, 2)
        .replace(/"([^"]+)":/g, '<span class="ast-key">"$1"</span>:')
        .replace(/[{}\[\]]/g, '<span class="json-bracket">$&</span>')
        .replace(/,/g, '<span class="json-comma">$&</span>')
        .replace(/:/g, '<span class="json-colon">$&</span>');

    return `<div class="ast-output">${json}</div>`;
}

// Limpiar los outputs
clearBtn.addEventListener("click", () => {
    clearOutputs();
    codeEditor.setValue('');
    addTerminalLine("Editor y salidas limpiadas.");
});

function clearOutputs() {
    lexerOutput.innerHTML = '';
    parserOutput.innerHTML = '';
    grammarOutput.innerHTML = '';
}

/*exampleBtn.addEventListener("click", () => {
    codeEditor.setValue(exampleCode);
    addTerminalLine("Ejemplo cargado en el editor.");
});*/

exampleSelect.addEventListener("change", () => {
    const selected = exampleSelect.value;
    if (selected === "simple") {
        fetch('../public/simpleTest.ls')
            .then(response => response.text())
            .then(text => codeEditor.setValue(text))
            .catch(() => {
                codeEditor.setValue(exampleCode);
                addTerminalLine("No se pudo cargar test.ls, se cargó el ejemplo por defecto.", "terminal-error");
            });

        addTerminalLine("Ejemplo sencillo cargado en el editor.");
    } else if (selected === "medium") {
        fetch('../public/mediumTest.ls')
            .then(response => response.text())
            .then(text => codeEditor.setValue(text))
            .catch(() => {
                codeEditor.setValue(exampleCode);
                addTerminalLine("No se pudo cargar mediumTest.ls, se cargó el ejemplo por defecto.", "terminal-error");
            });
        addTerminalLine("Ejemplo medio cargado en el editor.");
    } else if (selected === "hard") {
        fetch('../public/hardTest.ls')
            .then(response => response.text())
            .then(text => codeEditor.setValue(text))
            .catch(() => {
                codeEditor.setValue(exampleCode);
                addTerminalLine("No se pudo cargar hardTest.ls, se cargó el ejemplo por defecto.", "terminal-error");
            });
        addTerminalLine("Ejemplo difícil cargado en el editor.");
    }
});


copyLexerBtn.addEventListener("click", () => {
    const content = lexerOutput.textContent;
    copyToClipboard(content);
    copyLexerBtn.textContent = "¡Copiado!";
    setTimeout(() => copyLexerBtn.textContent = "Copiar", 1500);
    addTerminalLine("Salida del lexer copiada al portapapeles.");
});

copyParserBtn.addEventListener("click", () => {
    const content = parserOutput.textContent;
    copyToClipboard(content);
    copyParserBtn.textContent = "¡Copiado!";
    setTimeout(() => copyParserBtn.textContent = "Copiar", 1500);
    addTerminalLine("Salida del parser copiada al portapapeles.");
});

copyGrammarBtn.addEventListener("click", () => {
    const content = grammarOutput.textContent;
    copyToClipboard(content);
    copyGrammarBtn.textContent = "¡Copiado!";
    setTimeout(() => copyGrammarBtn.textContent = "Copiar", 1500);
    addTerminalLine("Árbol de análisis copiado al portapapeles.");
});

// Copiar al portapapeles
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

// Funcionalidad de redimensionamiento de paneles
let isResizing = false;
let currentResizer;
let initialX, initialY;
let initialWidth, initialHeight;

document.querySelectorAll('.resize-handle').forEach(resizer => {
    resizer.addEventListener('mousedown', initResize);
    resizer.addEventListener('touchstart', initResize);
});

function initResize(e) {
    e.preventDefault();
    isResizing = true;
    currentResizer = e.target;

    const panel = currentResizer.parentElement;
    initialWidth = panel.offsetWidth;
    initialHeight = panel.offsetHeight;

    if (e.type === 'mousedown') {
        initialX = e.clientX;
        initialY = e.clientY;
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResize);
    } else if (e.type === 'touchstart') {
        initialX = e.touches[0].clientX;
        initialY = e.touches[0].clientY;
        window.addEventListener('touchmove', resize);
        window.addEventListener('touchend', stopResize);
    }
}

function resize(e) {
    if (!isResizing) return;

    const panel = currentResizer.parentElement;
    const container = panel.parentElement;
    const isHorizontal = currentResizer.classList.contains('resize-handle-h');
    const isVertical = currentResizer.classList.contains('resize-handle-v');

    let currentX, currentY;
    if (e.type === 'mousemove') {
        currentX = e.clientX;
        currentY = e.clientY;
    } else if (e.type === 'touchmove') {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
    }

    if (isHorizontal) {
        const deltaX = currentX - initialX;
        const newWidth = initialWidth + deltaX;
        if (newWidth > 100) {
            panel.style.width = newWidth + 'px';
        }
    }

    if (isVertical) {
        const deltaY = currentY - initialY;
        const newHeight = initialHeight + deltaY;
        if (newHeight > 100) {
            panel.style.height = newHeight + 'px';
        }
    }
}

function stopResize() {
    isResizing = false;
    window.removeEventListener('mousemove', resize);
    window.removeEventListener('mouseup', stopResize);
    window.removeEventListener('touchmove', resize);
    window.removeEventListener('touchend', stopResize);
}

window.addEventListener('resize', () => {
    codeEditor.refresh();
});

const LIBRESCRIPT_HINTS = [
  "funcion", "clase", "imprimir", "leer", "si", "siNo", "mientras", "para", "verdadero", "falso", "devolver", "nuevo", "este", "vacio", "segun", "caso", "pordefecto", "romper",
  "numero", "texto", "booleano", "arreglo", "Objeto"
];

function librescriptHint(cm) {
  const cur = cm.getCursor();
  const token = cm.getTokenAt(cur);
  const start = token.start;
  const end = cur.ch;
  const word = token.string;
  const list = LIBRESCRIPT_HINTS.filter(function(item) {
    return item.startsWith(word);
  });

  return {
    list: list.length ? list : LIBRESCRIPT_HINTS,
    from: CodeMirror.Pos(cur.line, start),
    to: CodeMirror.Pos(cur.line, end)
  };
}

codeEditor.on("inputRead", function(cm, change) {
  if (change.text[0] && /[a-zA-Z_\\$]/.test(change.text[0])) {
    cm.showHint({completeSingle: false});
  }
});