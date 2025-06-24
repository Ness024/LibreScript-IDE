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
    // Mostrar mensajes uno por uno en líneas separadas
    if (data.output.messages && Array.isArray(data.output.messages)) {
        data.output.messages.forEach(msg => {
            addTerminalLine(msg, "terminal-success");
        });
    } else if (data.output.messages) {
        addTerminalLine(data.output.messages, "terminal-success");
    }

    // Mostrar errores semánticos si existen
    if (data.output.semantic?.errors?.length > 0) {
        data.output.semantic.errors.forEach(error => {
            addTerminalLine(error.message || error, "terminal-error");
        });
    }

    // Mostrar otros errores si existen
    if (data.output.errors && Array.isArray(data.output.errors)) {
        data.output.errors.forEach(err => {
            addTerminalLine(err, "terminal-error");
        });
    }

    // Resto del código para mostrar lexer, parser, etc.
    const lexerOutput = document.getElementById('lexer-output');
    lexerOutput.innerHTML = `<div class="token-json-output">${formatTokenOutput(data.output.tokens)}</div>`;

    const parserOutput = document.getElementById('parser-output');
    parserOutput.innerText = "";
    const ast = data.output.ast;
    parserOutput.innerHTML = formatAST(ast);

    const grammarOutput = document.getElementById('grammar-output');
    grammarOutput.innerText = "";
    const semanticError = data?.output?.semantic?.errors?.message;
    grammarOutput.innerText = semanticError || "No hay errores semánticos";
}

/*const libreScriptExecute = (data) => {
    //salida del lexer
    addTerminalLine(data.output.messages, "terminal-success");
    const lexerOutput = document.getElementById('lexer-output');
    lexerOutput.innerHTML = `<div class="token-json-output">${formatTokenOutput(data.output.tokens)}</div>`;

    //salida del parser
    const parserOutput = document.getElementById('parser-output');
    parserOutput.innerText = "";
    const ast = data.output.ast
    parserOutput.innerHTML = formatAST(ast);

    //salida de la gramatica
    const grammarOutput = document.getElementById('grammar-output');
    grammarOutput.innerText = ""; // Limpia antes

    const semanticError = data?.output?.semantic?.errors?.message;
    console.log(semanticError);
    grammarOutput.innerText = semanticError || "No hay errores semánticos";
}*/

// Inicializar CodeMirror
const codeEditor = CodeMirror.fromTextArea(
    document.getElementById("code-editor"),
    {
        // ===== Configuración básica =====
        mode: "javascript",  // Lenguaje (puede ser "html", "css", "python", etc.)
        theme: "dracula",     // Tema de colores (otros: "default", "monokai", "material")
        lineNumbers: true,    // Mostrar números de línea
        indentUnit: 2,        // Espacios por indentación
        tabSize: 2,           // Tamaño del tabulador (en espacios)
        lineWrapping: true,   // Ajuste de línea (si el código es muy largo)

        // ===== Auto-cierre y coincidencia de brackets =====
        autoCloseBrackets: true,  // Cierra automáticamente ({[ ]})
        matchBrackets: true,      // Resalta brackets coincidentes
        autoCloseTags: true,      // Útil para HTML/XML (cierra </tags>)

        // ===== Teclas personalizadas =====
        extraKeys: {
            "Tab": function (cm) {
                if (cm.somethingSelected()) {
                    cm.indentSelection("add");  // Indenta selección
                } else {
                    cm.replaceSelection("  ", "end");  // Inserta espacios
                }
            },
            "Shift-Tab": function (cm) {
                cm.indentSelection("subtract");  // Desindenta
            },
            "Ctrl-Enter": function () {
                console.log("Ejecutar código...");  // Acción personalizada
            }
        },

        // ===== Otras opciones útiles =====
        foldGutter: true,       // Permite plegar código (necesita gutters)
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],  // Añade secciones laterales
        lint: true,             // Validación en tiempo real (depende del modo)
        highlightSelectionMatches: { showToken: true },  // Resalta texto similar
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
 * ---------------------------------------------------------------
 *            FUNCIONES FALSAS PARA SIMULAR ANÁLISIS
 * ---------------------------------------------------------------
 * Estas funciones simulan el comportamiento de un lexer, parser y análisis gramatical.
 */

function fakeLexer(code) {
    // Simulate lexer output
    const tokens = [];
    const keywords = ["function", "if", "else", "return", "let", "print"];
    const lines = code.split("\n");

    let lineNum = 1;
    lines.forEach(line => {
        let col = 1;
        let inString = false;
        let currentToken = "";
        let currentType = "";

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (inString) {
                currentToken += char;
                if (char === '"' && line[i - 1] !== '\\') {
                    inString = false;
                    tokens.push({
                        type: "string",
                        value: currentToken,
                        line: lineNum,
                        col: col - currentToken.length
                    });
                    currentToken = "";
                }
            } else if (/[a-zA-Z_]/.test(char)) {
                if (currentType !== "identifier") {
                    if (currentToken) {
                        tokens.push({
                            type: currentType,
                            value: currentToken,
                            line: lineNum,
                            col: col - currentToken.length
                        });
                    }
                    currentToken = char;
                    currentType = "identifier";
                } else {
                    currentToken += char;
                }
            } else if (/[0-9]/.test(char)) {
                if (currentType !== "number" && currentType !== "identifier") {
                    if (currentToken) {
                        tokens.push({
                            type: currentType,
                            value: currentToken,
                            line: lineNum,
                            col: col - currentToken.length
                        });
                    }
                    currentToken = char;
                    currentType = "number";
                } else {
                    currentToken += char;
                }
            } else if (char === '"') {
                if (currentToken) {
                    tokens.push({
                        type: currentType,
                        value: currentToken,
                        line: lineNum,
                        col: col - currentToken.length
                    });
                }
                currentToken = char;
                inString = true;
            } else if (/[\s]/.test(char)) {
                if (currentToken) {
                    if (keywords.includes(currentToken)) {
                        currentType = "keyword";
                    }
                    tokens.push({
                        type: currentType,
                        value: currentToken,
                        line: lineNum,
                        col: col - currentToken.length
                    });
                    currentToken = "";
                    currentType = "";
                }
            } else {
                if (currentToken) {
                    if (keywords.includes(currentToken)) {
                        currentType = "keyword";
                    }
                    tokens.push({
                        type: currentType,
                        value: currentToken,
                        line: lineNum,
                        col: col - currentToken.length
                    });
                    currentToken = "";
                }
                tokens.push({
                    type: "operator",
                    value: char,
                    line: lineNum,
                    col: col
                });
            }
            col++;
        }

        if (currentToken) {
            if (keywords.includes(currentToken)) {
                currentType = "keyword";
            }
            tokens.push({
                type: currentType,
                value: currentToken,
                line: lineNum,
                col: col - currentToken.length
            });
        }

        lineNum++;
    });

    return tokens;
}

function fakeParser(tokens) {
    // Check for unbalanced parentheses to simulate an error
    const code = codeEditor.getValue();
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;

    if (openParens !== closeParens) {
        throw new Error(`Error de sintaxis: paréntesis desbalanceados (${openParens} abiertos, ${closeParens} cerrados)`);
    }

    // Check for unbalanced braces
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;

    if (openBraces !== closeBraces) {
        throw new Error(`Error de sintaxis: llaves desbalanceadas (${openBraces} abiertas, ${closeBraces} cerradas)`);
    }

    // Simulate parser output
    return {
        type: "Program",
        body: [
            {
                type: "FunctionDeclaration",
                id: { type: "Identifier", name: "factorial" },
                params: [{ type: "Identifier", name: "n" }],
                body: {
                    type: "BlockStatement",
                    body: [
                        {
                            type: "IfStatement",
                            test: {
                                type: "BinaryExpression",
                                operator: "<=",
                                left: { type: "Identifier", name: "n" },
                                right: { type: "NumericLiteral", value: 1 }
                            },
                            consequent: {
                                type: "BlockStatement",
                                body: [
                                    {
                                        type: "ReturnStatement",
                                        argument: { type: "NumericLiteral", value: 1 }
                                    }
                                ]
                            },
                            alternate: {
                                type: "BlockStatement",
                                body: [
                                    {
                                        type: "ReturnStatement",
                                        argument: {
                                            type: "BinaryExpression",
                                            operator: "*",
                                            left: { type: "Identifier", name: "n" },
                                            right: {
                                                type: "CallExpression",
                                                callee: { type: "Identifier", name: "factorial" },
                                                arguments: [
                                                    {
                                                        type: "BinaryExpression",
                                                        operator: "-",
                                                        left: { type: "Identifier", name: "n" },
                                                        right: { type: "NumericLiteral", value: 1 }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            },
            {
                type: "VariableDeclaration",
                declarations: [
                    {
                        type: "VariableDeclarator",
                        id: { type: "Identifier", name: "resultado" },
                        init: {
                            type: "CallExpression",
                            callee: { type: "Identifier", name: "factorial" },
                            arguments: [{ type: "NumericLiteral", value: 5 }]
                        }
                    }
                ],
                kind: "let"
            },
            {
                type: "ExpressionStatement",
                expression: {
                    type: "CallExpression",
                    callee: { type: "Identifier", name: "print" },
                    arguments: [
                        {
                            type: "BinaryExpression",
                            operator: "+",
                            left: { type: "StringLiteral", value: "El factorial de 5 es: " },
                            right: { type: "Identifier", name: "resultado" }
                        }
                    ]
                }
            }
        ]
    };
}

function fakeGrammar(ast) {
    // Simulate grammar/AST output with more details
    return {
        grammar: {
            rules: [
                { name: "program", pattern: "statement+" },
                { name: "statement", pattern: "functionDecl | variableDecl | expressionStmt | returnStmt | ifStmt" },
                { name: "functionDecl", pattern: "'function' identifier '(' paramList? ')' block" },
                { name: "variableDecl", pattern: "'let' identifier ('=' expression)? ';'?" },
                { name: "expressionStmt", pattern: "expression ';'?" },
                { name: "returnStmt", pattern: "'return' expression? ';'?" },
                { name: "ifStmt", pattern: "'if' expression block ('else' (block | ifStmt))?" },
                { name: "block", pattern: "'{' statement* '}'" },
                { name: "expression", pattern: "assignment" },
                { name: "assignment", pattern: "identifier '=' assignment | logicalOr" },
                { name: "logicalOr", pattern: "logicalAnd ('||' logicalAnd)*" },
                { name: "logicalAnd", pattern: "equality ('&&' equality)*" },
                { name: "equality", pattern: "comparison (('==' | '!=') comparison)*" },
                { name: "comparison", pattern: "addition (('<' | '<=' | '>' | '>=') addition)*" },
                { name: "addition", pattern: "multiplication (('+' | '-') multiplication)*" },
                { name: "multiplication", pattern: "unary (('*' | '/') unary)*" },
                { name: "unary", pattern: "('-' | '!') unary | call" },
                { name: "call", pattern: "primary ('(' argumentList? ')')?" },
                { name: "primary", pattern: "NUMBER | STRING | 'true' | 'false' | 'null' | identifier | '(' expression ')'" },
                { name: "identifier", pattern: "IDENTIFIER" }
            ],
            tokens: [
                { name: "NUMBER", pattern: "[0-9]+" },
                { name: "STRING", pattern: "\"[^\"]*\"" },
                { name: "IDENTIFIER", pattern: "[a-zA-Z_][a-zA-Z0-9_]*" },
                { name: "WHITESPACE", pattern: "\\s+", ignore: true },
                { name: "COMMENT", pattern: "//.*", ignore: true }
            ]
        },
        parseTree: ast
    };
}

// Ejecutar análisis de código
function runAnalysis() {
    const code = codeEditor.getValue();

    try {
        addTerminalLine("Iniciando análisis de código...", "terminal-success");

        // Run lexer
        addTerminalLine("Ejecutando lexer...");
        const lexerResult = fakeLexer(code);
        lexerOutput.innerHTML = formatJSON(lexerResult);
        addTerminalLine("Lexer completado con éxito.", "terminal-success");

        // Run parser
        addTerminalLine("Ejecutando parser...");
        const parserResult = fakeParser(lexerResult);
        parserOutput.innerHTML = formatJSON(parserResult);
        addTerminalLine("Parser completado con éxito.", "terminal-success");

        // Run grammar analysis
        addTerminalLine("Generando árbol de análisis...");
        const grammarResult = fakeGrammar(parserResult);
        grammarOutput.innerHTML = formatJSON(grammarResult);
        addTerminalLine("Árbol de análisis generado con éxito.", "terminal-success");

        // Add success indicator
        runBtn.innerHTML = '<span>✓</span> Análisis Completo';
        runBtn.classList.add('success');
        setTimeout(() => {
            runBtn.innerHTML = '<span>▶</span> Analizar';
            runBtn.classList.remove('success');
        }, 2000);

        addTerminalLine("Análisis completado sin errores.", "terminal-success");
    } catch (error) {
        console.error("Error during analysis:", error);

        // Show error in output panels
        lexerOutput.innerHTML = `<span class="error">Error: ${error.message}</span>`;
        parserOutput.innerHTML = `<span class="error">Error: ${error.message}</span>`;
        grammarOutput.innerHTML = `<span class="error">Error: ${error.message}</span>`;

        // Add error indicator
        runBtn.innerHTML = '<span>✗</span> Error';
        runBtn.classList.add('error');
        setTimeout(() => {
            runBtn.innerHTML = '<span>▶</span> Analizar';
            runBtn.classList.remove('error');
        }, 2000);

        // Add error to terminal
        addTerminalLine(`Error: ${error.message}`, "terminal-error");
    }
}
//runBtn.addEventListener("click", runAnalysis);


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