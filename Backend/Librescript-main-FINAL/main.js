// main.js
// Si usas ES Modules:
import fs from 'fs';
import { parseCode } from './parser.js';
import lexer from './lexer.js'; // Importa para tokenizar primero

// Si usas CommonJS:
//const fs = require('fs');
//const { parseCode } = require('./parser.js');
//const lexer = require('./lexer.js');
// --- CLASE PARA LA TABLA DE SÍMBOLOS (Symbol Table) ---
class SymbolTable {
  constructor(parentScope = null) {
    this.symbols = new Map();
    this.parentScope = parentScope;
    this.currentFunctionContext = parentScope ? parentScope.currentFunctionContext : null;
    this.currentLoopContext = parentScope ? parentScope.currentLoopContext : null;
    this.currentClassContext = parentScope ? parentScope.currentClassContext : null;
    this.currentSwitchContext = parentScope ? parentScope.currentSwitchContext : null; // Para 'segun'
  }

  addSymbol(name, type, kind, extra = {}) {
    if (this.symbols.has(name) && kind !== 'metodo' /* Permitir sobrecarga si se implementa */) {
      throw new SemanticError(`El identificador '${name}' ya ha sido declarado en este ámbito.`);
    }
    this.symbols.set(name, { name, type, kind, scope: this, ...extra });
  }

  lookupSymbol(name) {
    let current = this;
    while (current) {
      if (current.symbols.has(name)) {
        return current.symbols.get(name);
      }
      current = current.parentScope;
    }
    return null;
  }

  enterScope(contextType = 'block') {
    const newScope = new SymbolTable(this);
    if (contextType === 'function') newScope.currentFunctionContext = newScope;
    if (contextType === 'loop') newScope.currentLoopContext = newScope;
    if (contextType === 'class') newScope.currentClassContext = newScope;
    if (contextType === 'switch') newScope.currentSwitchContext = newScope; // Para 'segun'
    return newScope;
  }
}

// --- CLASE PARA ERRORES SEMÁNTICOS ---
class SemanticError extends Error {
  constructor(message, node = null) {
    super(message);
    this.name = "SemanticError";
    this.line = node?.line || null; // Si el nodo AST está disponible, obtener la línea
    this.column = node?.col || null; // Obtener la columna si el nodo AST está disponible
  }
}

// --- FUNCIÓN PRINCIPAL DE ANÁLISIS SEMÁNTICO ---
function analyzeSemantics(astNode, scope) {
  if (!astNode) return { base: "void" };

  const nodeType = astNode.type;

  switch (nodeType) {
    case "Programa":
      astNode.sentencias.forEach(sentencia => analyzeSemantics(sentencia, scope));
      return { base: "void" };

    case "DeclaracionVariable":
    case "DeclaracionConstante": {
      const varName = astNode.nombre.value; // astNode.nombre es el token
      const declaredType = resolveTypeNode(astNode.tipo, scope);

      let initializerType = { base: "void" };
      if (astNode.valor) {
        initializerType = analyzeSemantics(astNode.valor, scope);
      } else if (nodeType === "DeclaracionConstante") {
        throw new SemanticError(`La constante '${varName}' debe ser inicializada.`);
      }

      // Si no hay valor inicial, no se necesita chequeo de compatibilidad (se podría asignar 'nulo' o 'indefinido' implícitamente si el lenguaje lo soporta)
      // LibreScript requiere inicialización para constantes [cite: 14] y permite declaración sin inicialización para variables (implícito de la sintaxis, aunque no hay ejemplo).
      // Por seguridad, si el tipo declarado no es compatible con "void" (si no hay valor), podría ser un error o advertencia.
      // Pero si hay valor, el chequeo es mandatorio.
      if (astNode.valor && !areTypesCompatible(declaredType, initializerType)) {
        throw new SemanticError(
          `Tipo incompatible para ${nodeType === "DeclaracionConstante" ? "constante" : "variable"} '${varName}'. Se esperaba '${formatType(declaredType)}' pero se obtuvo '${formatType(initializerType)}'.`
        );
      }
      // Si no hay valor de inicialización y el tipo declarado no puede ser "nulo" o "void" implícitamente
      // (LibreScript no tiene `nulo` explícito), esto podría ser un punto a definir.
      // Por ahora, se asume que una variable declarada sin valor tiene un valor "por defecto" compatible o que el lenguaje lo permite.


      const kind = nodeType === "DeclaracionConstante" ? "constante" : "variable";
      scope.addSymbol(varName, declaredType, kind, { mutable: astNode.mutable });
      return { base: "void" };
    }

    case "Asignacion": {
      let lhsNode = astNode.designable;
      let lhsType;
      let targetSymbolInfo = {};

      if (lhsNode.type === "IDENTIFICADOR_VAR" || lhsNode.type === "Variable" || lhsNode.type === "IDENTIFICADOR_CONST") {
        const varName = lhsNode.value || lhsNode.nombre; // .value si es token (IDENTIFICADOR_VAR/CONST), .nombre si es nodo Variable
        const symbol = scope.lookupSymbol(varName);
        if (!symbol) throw new SemanticError(`El identificador '${varName}' no ha sido declarado.`);
        if (symbol.kind === "constante") throw new SemanticError(`No se puede reasignar a la constante '${symbol.name}'.`);
        if (!symbol.mutable && astNode.operador === "=") {
          // Esto podría ser para parámetros de función si se hicieran inmutables por defecto.
          // Por ahora, las variables ($) son mutables.
        }
        if (symbol.kind === "funcion" || symbol.kind === "clase") {
          throw new SemanticError(`No se puede asignar a '${symbol.name}' porque es una ${symbol.kind}.`);
        }
        lhsType = symbol.type;
        targetSymbolInfo = symbol;
      } else if (lhsNode.type === "AccesoArreglo" || lhsNode.type === "AccesoArregloDoble") {
        lhsType = analyzeSemantics(lhsNode, scope);
        targetSymbolInfo.mutable = true;
      } else if (lhsNode.type === "AccesoMiembro") {
        lhsType = analyzeSemantics(lhsNode, scope);
        if (lhsType.kind === 'metodo') { // Si AccesoMiembro devolvió la info del método en lugar del tipo de propiedad
          throw new SemanticError(`No se puede asignar a un método '${lhsNode.propiedad}'.`);
        }
        targetSymbolInfo.mutable = true; // Simplificación, idealmente el tipo del miembro indicaría mutabilidad
      } else if (lhsNode.type === "Este") {
        throw new SemanticError(`Asignación directa a 'este' no permitida. Use 'este.propiedad'.`);
      } else {
        throw new SemanticError(`Lado izquierdo de asignación inválido: ${JSON.stringify(lhsNode)}`);
      }

      const rhsType = analyzeSemantics(astNode.valor, scope);

      if (astNode.operador !== "=") { // Para +=, -=, etc.
        if (!areTypesCompatible(lhsType, rhsType)) {
          // Tratar de obtener un nombre más descriptivo para el LHS en el mensaje de error
          let lhsName = "LHS";
          if (lhsNode.value) lhsName = lhsNode.value; // IDENTIFICADOR_VAR, IDENTIFICADOR_CONST
          else if (lhsNode.nombre) lhsName = lhsNode.nombre; // Variable, Constante (nodos)
          else if (lhsNode.objeto && lhsNode.propiedad) { // AccesoMiembro
            try {
              const objName = lhsNode.objeto.nombre || (lhsNode.objeto.type === "Este" ? "este" : "objeto_desconocido");
              lhsName = `${objName}.${lhsNode.propiedad}`;
            } catch (e) { /* best effort */ }
          } else if (lhsNode.arreglo || lhsNode.matriz) { // AccesoArreglo / AccesoArregloDoble
            try {
              const arrNameNode = lhsNode.arreglo || lhsNode.matriz;
              const arrName = arrNameNode.nombre || (arrNameNode.type === "Este" ? "este" : "arreglo_desconocido");
              lhsName = `${arrName}[...]`;
            } catch (e) { /* best effort */ }
          }

          throw new SemanticError(
            `Tipo incompatible en asignación a '${lhsName}'. Se esperaba '${formatType(lhsType)}' pero se obtuvo '${formatType(rhsType)}'.`
          );
        }
      }
      return rhsType;
    }



    case "Variable": // Usado para acceder al valor de una variable
    case "Constante": { // Usado para acceder al valor de una constante
      const varName = astNode.nombre; // astNode.nombre es el string del identificador con $ o $$
      const symbol = scope.lookupSymbol(varName);
      if (!symbol) {
        throw new SemanticError(`El identificador '${varName}' no ha sido declarado.`);
      }
      if (symbol.kind === "funcion" || symbol.kind === "clase") {
        return symbol.type; // Devolver el "tipo funcional" o "tipo clase"
      }
      return symbol.type;
    }

    case "IdentificadorGral": {
      const name = astNode.nombre;
      const symbol = scope.lookupSymbol(name);
      if (!symbol) {
        throw new SemanticError(`Identificador '${name}' no encontrado.`);
      }
      return symbol.type; // Puede ser un tipo de función, clase, etc.
    }
    case "Este": { // Para el keyword 'este'
      const esteSymbol = scope.lookupSymbol("este");
      if (!esteSymbol) {
        throw new SemanticError("'este' solo puede ser usado dentro de un método o constructor de clase.");
      }
      return esteSymbol.type; // Debería ser el tipo de la instancia de la clase actual
    }


    case "OpBinaria": {
      const leftType = analyzeSemantics(astNode.izquierda, scope);
      const rightType = analyzeSemantics(astNode.derecha, scope);
      return checkOpBinariaTypes(astNode, leftType, rightType, scope);
    }

    case "OpUnaria": {
      const operandType = analyzeSemantics(astNode.operando, scope);
      const op = astNode.operador;
      if (op === '!') {
        if (!isBoolean(operandType)) throw new SemanticError(`Operador '!' requiere un operando booleano, se obtuvo '${formatType(operandType)}'.`);
        return { base: "booleano" };
      } else if (op === '-') { // Unary minus
        if (!isNumeric(operandType)) throw new SemanticError(`Operador '-' (unario) requiere un operando numérico, se obtuvo '${formatType(operandType)}'.`);
        return { base: "numero" };
      } else if (op === '++_post' || op === '--_post') {
        // El operando de ++/-- debe ser un LValue (algo asignable)
        if (!isAssignable(astNode.operando, scope)) {
          throw new SemanticError(`El operando de '${op.substring(0, 2)}' debe ser una variable o propiedad asignable.`);
        }
        if (!isNumeric(operandType)) throw new SemanticError(`Operador '${op.substring(0, 2)}' requiere un operando numérico, se obtuvo '${formatType(operandType)}'.`);
        return { base: "numero" };
      }
      throw new SemanticError(`Operador unario '${op}' no implementado o tipo incompatible.`);
    }

    case "LiteralNumero": return { base: "numero" };
    case "LiteralTexto": return { base: "texto" };
    case "LiteralBooleano": return { base: "booleano" };

    case "CondicionalSi": {
      const conditionType = analyzeSemantics(astNode.condicion, scope);
      if (!isBoolean(conditionType)) {
        throw new SemanticError(`La condición del 'si' debe ser booleana, pero se obtuvo '${formatType(conditionType)}'.`);
      }
      analyzeSemantics(astNode.bloqueSi, scope.enterScope('block'));
      (astNode.bloquesSiNoSi || []).forEach(clausulaSiNoSi => {
        const elseIfConditionType = analyzeSemantics(clausulaSiNoSi.condicion, scope);
        if (!isBoolean(elseIfConditionType)) {
          throw new SemanticError(`La condición del 'siNo si' debe ser booleana, pero se obtuvo '${formatType(elseIfConditionType)}'.`);
        }
        analyzeSemantics(clausulaSiNoSi.bloque, scope.enterScope('block'));
      });
      if (astNode.bloqueSiNo) {
        analyzeSemantics(astNode.bloqueSiNo.bloque, scope.enterScope('block'));
      }
      return { base: "void" };
    }

    case "Bloque":
      const newScopeForBlock = scope.enterScope('block');
      astNode.sentencias.forEach(sentencia => analyzeSemantics(sentencia, newScopeForBlock));
      return { base: "void" };

    case "BucleMientras": {
      const conditionType = analyzeSemantics(astNode.condicion, scope);
      if (!isBoolean(conditionType)) {
        throw new SemanticError(`La condición del 'mientras' debe ser booleana, pero se obtuvo '${formatType(conditionType)}'.`);
      }
      analyzeSemantics(astNode.bloque, scope.enterScope('loop'));
      return { base: "void" };
    }

    case "BuclePara": {
      const forScope = scope.enterScope('loop');
      if (astNode.inicializacion) {
        analyzeSemantics(astNode.inicializacion, forScope); // Es DeclaracionVariable o Asignacion
      }
      if (astNode.condicion) {
        const conditionType = analyzeSemantics(astNode.condicion, forScope);
        if (!isBoolean(conditionType)) {
          throw new SemanticError(`La condición del 'para' debe ser booleana, pero se obtuvo '${formatType(conditionType)}'.`);
        }
      }
      if (astNode.incremento) {
        analyzeSemantics(astNode.incremento, forScope);
      }
      analyzeSemantics(astNode.bloque, forScope);
      return { base: "void" };
    }

    case "EstructuraSegun": { // [cite: 57]
      const evalType = analyzeSemantics(astNode.expresionEvaluar, scope);
      // 'segun' usualmente funciona con tipos ordinales (numero, texto). No booleanos directamente.
      if (!isNumeric(evalType) && !isText(evalType)) {
        throw new SemanticError(`La expresión a evaluar en 'segun' debe ser de tipo numero o texto, se obtuvo '${formatType(evalType)}'.`);
      }
      const switchScope = scope.enterScope('switch'); // Nuevo contexto para 'romper'
      let hasDefault = false;
      for (const caso of astNode.casos) {
        const casoType = analyzeSemantics(caso.valorComparar, switchScope);
        if (!areTypesCompatible(evalType, casoType)) {
          throw new SemanticError(`El tipo del 'caso' ('${formatType(casoType)}') es incompatible con la expresión del 'segun' ('${formatType(evalType)}').`);
        }
        analyzeSemantics(caso.bloque, switchScope.enterScope('block')); // Cada caso tiene su bloque pero comparte el contexto del switch
      }
      if (astNode.pordefecto) {
        hasDefault = true;
        analyzeSemantics(astNode.pordefecto.bloque, switchScope.enterScope('block'));
      }
      return { base: "void" };
    }


    case "LlamadaFuncion": {
      let functionSymbol;
      let calleeName = "función/método desconocido";

      if (astNode.callee.type === "IdentificadorGral") {
        calleeName = astNode.callee.nombre;
        functionSymbol = scope.lookupSymbol(calleeName);
      } else if (astNode.callee.type === "AccesoMiembro") { // objeto.metodo()
        // Primero, analiza el objeto para obtener su tipo
        const objetoType = analyzeSemantics(astNode.callee.objeto, scope);
        if (!objetoType.isClassInstance && !objetoType.isClass) { // Podría ser una llamada a un método estático si se implementa
          throw new SemanticError(`Intento de llamar a un miembro de algo que no es un objeto de clase: '${formatType(objetoType)}'.`);
        }
        const classInfo = objetoType.classInfo || objetoType; // Si es Clase.metodoEstatico vs instancia.metodo
        if (!classInfo || !classInfo.members) {
          throw new SemanticError(`No se pudo obtener información de la clase para '${formatType(objetoType)}'.`);
        }
        const methodName = astNode.callee.propiedad;
        calleeName = `${classInfo.base}.${methodName}`;
        functionSymbol = classInfo.members.get(methodName);

        if (functionSymbol && functionSymbol.kind !== "metodo") {
          throw new SemanticError(`'${calleeName}' es una propiedad, no un método.`);
        }
        // Para la llamada a 'este.metodo()', el 'este' ya está resuelto y functionSymbol será la info del método.
      } else {
        throw new SemanticError(`El invocador de la función no es válido: ${astNode.callee.type}.`);
      }

      if (!functionSymbol || (functionSymbol.kind !== "funcion" && functionSymbol.kind !== "metodo")) {
        throw new SemanticError(`'${calleeName}' no es una función o método, o no ha sido declarada. Se obtuvo: ${functionSymbol ? functionSymbol.kind : 'null'}`);
      }

      checkFunctionCallArguments(astNode, functionSymbol, scope, calleeName);
      return functionSymbol.tipoRetorno;
    }

    case "Imprimir": // Cambiado de LlamadaImprimir para coincidir con el nodo del AST de la gramática
      const imprimirSymbol = scope.lookupSymbol("imprimir"); // Ya está predefinido
      checkFunctionCallArguments({ argumentos: astNode.argumentos }, imprimirSymbol, scope, "imprimir");
      return { base: "void" };

    // MODIFICADO: Caso para LlamadaLeer [cite: 71]
    case "LlamadaLeer": {
      const leerSymbol = scope.lookupSymbol("leer"); // Debería estar predefinido
      checkFunctionCallArguments({ argumentos: astNode.argumentos }, leerSymbol, scope, "leer"); // astNode.argumentos puede ser una lista vacía o con el prompt
      return leerSymbol.tipoRetorno; // Debería ser { base: "texto" }
    }


    case "DeclaracionFuncion": {
      const funcName = astNode.nombre.value; // astNode.nombre es el token IDENTIFICADOR_GRAL
      const returnType = resolveTypeNode(astNode.tipoRetorno, scope);

      const paramInfos = (astNode.parametros || []).map(p => ({
        name: p.nombre.value, // p.nombre es el token IDENTIFICADOR_VAR
        type: resolveTypeNode(p.tipo, scope)
      }));

      scope.addSymbol(funcName, returnType, "funcion", {
        parametros: paramInfos,
        tipoRetorno: returnType,
        isVariadic: false, // Las funciones definidas por el usuario no son variádicas por defecto
        node: astNode
      });

      const functionScope = scope.enterScope('function');
      functionScope.currentFunctionContext.expectedReturnType = returnType;
      functionScope.currentFunctionContext.name = funcName; // Útil para mensajes de error

      paramInfos.forEach(pInfo => {
        functionScope.addSymbol(pInfo.name, pInfo.type, "parametro", { mutable: true }); // Parámetros son mutables dentro de la función
      });

      analyzeSemantics(astNode.bloque, functionScope);
      // Aquí se podría verificar si todas las rutas de código devuelven un valor si el tipoRetorno no es 'vacio'.
      // Esta es una verificación más avanzada (análisis de flujo de control).
      return { base: "void" };
    }

    case "SentenciaDevolver": {
      if (!scope.currentFunctionContext) {
        throw new SemanticError("Sentencia 'devolver' fuera de una función o método.");
      }
      const funcContext = scope.currentFunctionContext;
      const expectedType = funcContext.expectedReturnType;
      let actualReturnType = { base: "vacio" }; // LibreScript usa 'vacio' [cite: 82]

      if (astNode.valor) {
        actualReturnType = analyzeSemantics(astNode.valor, scope);
      }

      if (expectedType.base === "vacio" && astNode.valor) {
        throw new SemanticError(`Una función/método '${funcContext.name || ''}' con retorno '${formatType(expectedType)}' no puede devolver un valor.`);
      }
      if (expectedType.base !== "vacio" && !astNode.valor) { // [cite: 84]
        throw new SemanticError(`La función/método '${funcContext.name || ''}' debe devolver un valor de tipo '${formatType(expectedType)}'.`);
      }
      if (astNode.valor && !areTypesCompatible(expectedType, actualReturnType)) {
        throw new SemanticError(
          `Tipo de retorno incompatible en '${funcContext.name || ''}' Se esperaba '${formatType(expectedType)}' pero se obtuvo '${formatType(actualReturnType)}'.`
        );
      }
      return { base: "void" };
    }

    case "SentenciaRomper": // [cite: 59]
      if (!scope.currentLoopContext && !scope.currentSwitchContext) {
        throw new SemanticError("Sentencia 'romper' fuera de un bucle ('mientras', 'para') o estructura 'segun'.");
      }
      return { base: "void" };

    case "AccesoArreglo":
    case "AccesoArregloDoble": {
      const arrayNode = astNode.arreglo || astNode.matriz;
      const baseArrayType = analyzeSemantics(arrayNode, scope);

      if (!baseArrayType.isArray) {
        throw new SemanticError(`Intento de acceso por índice a un tipo no arreglo: '${formatType(baseArrayType)}'.`);
      }

      const index1Node = astNode.indice || astNode.indice1;
      const index1Type = analyzeSemantics(index1Node, scope);
      if (!isNumeric(index1Type)) {
        throw new SemanticError(`El índice del arreglo debe ser numérico, se obtuvo '${formatType(index1Type)}'.`);
      }

      if (nodeType === "AccesoArregloDoble") {
        if ((baseArrayType.dimensions || 1) < 2) {
          throw new SemanticError(`Se esperaba una matriz (arreglo 2D) para acceso doble [], se obtuvo '${formatType(baseArrayType)}'.`);
        }
        const index2Type = analyzeSemantics(astNode.indice2, scope);
        if (!isNumeric(index2Type)) {
          throw new SemanticError(`El segundo índice de la matriz debe ser numérico, se obtuvo '${formatType(index2Type)}'.`);
        }
        // Si baseArrayType.tipoElemento es el tipo del arreglo interno, entonces su tipoElemento es el tipo final.
        return baseArrayType.tipoElemento.tipoElemento;
      } else { // AccesoArreglo simple
        if (baseArrayType.dimensions > 1) {
          // Si accedes a una matriz 'matriz[i]', obtienes un arreglo.
          return baseArrayType.tipoElemento;
        }
        return baseArrayType.tipoElemento; // Tipo del elemento individual
      }
    }

    case "CreacionArreglo": { // [ ... ]
      if (!astNode.elementos || astNode.elementos.length === 0) {
        // Arreglo vacío. Su tipo es "arreglo de desconocido" hasta que se infiera por asignación o uso.
        // Para LibreScript, que es de tipado explícito, esto podría ser un problema si no se asigna a una variable con tipo.
        // O podría permitirse y el tipo se fija en la primera asignación.
        // Por ahora, tipoElemento es 'desconocido'.
        return { base: "desconocido", isArray: true, dimensions: 1, tipoElemento: { base: "desconocido" } };
      }
      const elementTypes = astNode.elementos.map(el => analyzeSemantics(el, scope));
      const firstElementType = elementTypes[0];

      for (let i = 1; i < elementTypes.length; i++) {
        if (!areTypesCompatible(firstElementType, elementTypes[i])) { // Todos los elementos deben ser compatibles con el primero
          throw new SemanticError(
            `Los elementos de un arreglo literal deben ser del mismo tipo o compatibles. Se encontró '${formatType(firstElementType)}' y '${formatType(elementTypes[i])}'.`
          );
        }
      }
      // El tipo del arreglo es un arreglo del tipo del primer elemento (o un supertipo común si se implementara)
      return {
        base: firstElementType.base,
        isArray: true,
        dimensions: 1, // Asumimos arreglos literales son 1D; matrices se declaran explícitamente
        tipoElemento: firstElementType,
        // Si el primer elemento es en sí un arreglo, esto crea un arreglo de arreglos (matriz)
        ...(firstElementType.isArray && { dimensions: firstElementType.dimensions + 1, tipoElemento: firstElementType })
      };
    }

    case "DeclaracionClase": { // [cite: 108]
      const className = astNode.nombre.value; // astNode.nombre es el token IDENTIFICADOR_GRAL
      // Un tipo clase que contiene información sobre sus miembros.
      const classTypeRepresentation = { base: className, isClass: true, members: new Map(), node: astNode };
      scope.addSymbol(className, classTypeRepresentation, "clase", { node: astNode });

      const classScope = scope.enterScope('class');
      classScope.currentClassContext.classInfo = classTypeRepresentation;
      classScope.currentClassContext.className = className;

      if (astNode.cuerpo && astNode.cuerpo.miembros) {
        astNode.cuerpo.miembros.forEach(miembro => {
          analyzeSemantics(miembro, classScope); // Analiza propiedades, constructor, métodos
        });
      }
      // Verificar si hay un constructor si se necesita (algunos lenguajes requieren uno por defecto o explícito)
      return { base: "void" };
    }

    // MODIFICADO: PropiedadClase ahora tiene un 'tipo' en el AST [cite: 110]
    case "PropiedadClase": {
      if (!scope.currentClassContext) {
        throw new SemanticError("Declaración de propiedad fuera de una clase.");
      }
      const propNameToken = astNode.nombre; // Es el token IDENTIFICADOR_GRAL
      const propName = propNameToken.value;

      // astNode.tipo es el nodo de Tipo de la gramática
      const propType = resolveTypeNode(astNode.tipo, scope.parentScope); // Resuelve el tipo en el ámbito que contiene la clase

      if (scope.currentClassContext.classInfo.members.has(propName)) {
        throw new SemanticError(`Miembro '${propName}' ya definido en la clase '${scope.currentClassContext.className}'.`);
      }

      scope.currentClassContext.classInfo.members.set(propName, {
        name: propName,
        type: propType,
        kind: "propiedad",
        visibilidad: astNode.visibilidad, // "publica" o "privada"
        declarerClass: scope.currentClassContext.className
      });
      return { base: "void" };
    }

    case "ConstructorClase": { // [cite: 116]
      if (!scope.currentClassContext) {
        throw new SemanticError("Declaración de constructor fuera de una clase.");
      }
      const classInfo = scope.currentClassContext.classInfo;
      if (classInfo.members.has("constructor")) {
        throw new SemanticError(`La clase '${classInfo.base}' ya tiene un constructor definido.`);
      }

      const paramInfos = (astNode.parametros || []).map(p => ({
        name: p.nombre.value, // p.nombre es el token IDENTIFICADOR_VAR
        type: resolveTypeNode(p.tipo, scope.parentScope) // Tipos de parámetros resueltos en el ámbito de la clase
      }));

      const constructorSymbolInfo = {
        kind: "metodo",
        name: "constructor",
        parametros: paramInfos,
        tipoRetorno: { base: classInfo.base, isClassInstance: true, classInfo: classInfo },
        isVariadic: false,
        node: astNode,
        declarerClass: scope.currentClassContext.className
      };
      classInfo.members.set("constructor", constructorSymbolInfo);

      const constructorScope = scope.enterScope('function');
      constructorScope.currentClassContext = scope.currentClassContext;
      constructorScope.currentFunctionContext.expectedReturnType = { base: "vacio" }; // Constructores no usan 'devolver valor;'
      constructorScope.currentFunctionContext.name = `constructor de ${classInfo.base}`;
      // 'este' dentro del constructor
      constructorScope.addSymbol("este", { base: classInfo.base, isClassInstance: true, classInfo: classInfo }, "variable", { mutable: false });


      paramInfos.forEach(pInfo => {
        constructorScope.addSymbol(pInfo.name, pInfo.type, "parametro", { mutable: true });
      });
      analyzeSemantics(astNode.bloque, constructorScope);
      return { base: "void" };
    }

    case "MetodoClase": { // [cite: 118]
      if (!scope.currentClassContext) {
        throw new SemanticError("Declaración de método fuera de una clase.");
      }
      const classInfo = scope.currentClassContext.classInfo;
      const methodNameToken = astNode.nombre; // Es el token IDENTIFICADOR_GRAL
      const methodName = methodNameToken.value;

      if (classInfo.members.has(methodName)) {
        throw new SemanticError(`Miembro '${methodName}' ya definido en la clase '${classInfo.base}'.`);
      }

      const returnType = resolveTypeNode(astNode.tipoRetorno, scope.parentScope); // Resuelve en el ámbito de la clase
      const paramInfos = (astNode.parametros || []).map(p => ({
        name: p.nombre.value, // p.nombre es IDENTIFICADOR_VAR
        type: resolveTypeNode(p.tipo, scope.parentScope)
      }));

      classInfo.members.set(methodName, {
        name: methodName,
        kind: "metodo",
        tipoRetorno: returnType,
        parametros: paramInfos,
        visibilidad: astNode.visibilidad,
        isVariadic: false,
        node: astNode,
        declarerClass: scope.currentClassContext.className
      });

      const methodScope = scope.enterScope('function');
      methodScope.currentClassContext = scope.currentClassContext;
      methodScope.currentFunctionContext.expectedReturnType = returnType;
      methodScope.currentFunctionContext.name = `${classInfo.base}.${methodName}`;
      methodScope.addSymbol("este", { base: classInfo.base, isClassInstance: true, classInfo: classInfo }, "variable", { mutable: false });

      paramInfos.forEach(pInfo => {
        methodScope.addSymbol(pInfo.name, pInfo.type, "parametro", { mutable: true });
      });
      analyzeSemantics(astNode.bloque, methodScope);
      return { base: "void" };
    }

    case "CreacionObjeto": { // nuevo MiClase(args) [cite: 120]
      const classNameToken = astNode.clase; // Es el token IDENTIFICADOR_GRAL
      const className = classNameToken.value;
      const classSymbol = scope.lookupSymbol(className);

      if (!classSymbol || !classSymbol.type.isClass) {
        throw new SemanticError(`'${className}' no es un tipo de clase válido o no ha sido declarada.`);
      }

      const classTypeInfo = classSymbol.type; // Esto es { base: className, isClass: true, members: Map, ... }
      const constructorSymbol = classTypeInfo.members.get("constructor");

      if (constructorSymbol) {
        // Simular un nodo de llamada para reutilizar checkFunctionCallArguments
        const constructorCallNode = {
          callee: { type: "IdentificadorGral", nombre: "constructor" }, // Placeholder
          argumentos: astNode.argumentos
        };
        checkFunctionCallArguments(constructorCallNode, constructorSymbol, scope, `constructor de ${className}`);
      } else if (astNode.argumentos && astNode.argumentos.length > 0) {
        throw new SemanticError(`La clase '${className}' no tiene un constructor explícito que acepte argumentos (o no se ha definido un constructor).`);
      }
      return { base: className, isClassInstance: true, classInfo: classTypeInfo };
    }

    case "AccesoMiembro": {
      const objetoNode = astNode.objeto;
      const objectType = analyzeSemantics(objetoNode, scope);
      const memberName = astNode.propiedad; // Ya es el nombre simple (sin #)
      // const utilizoAlmohadilla = astNode.accesoConAlmohadilla; // Disponible si necesitas lógica extra

      // Chequeo para .longitud en textos y arreglos
      if (memberName === "longitud") {
        if (isText(objectType) || isArrayType(objectType)) {
          return { base: "numero" };
        }
      }

      if (objectType.isObjectLiteral) {
        if (!objectType.properties || !objectType.properties.has(memberName)) {
          // Si el miembro es 'longitud' y el objeto literal no lo tiene, es un error
          if (memberName === "longitud") {
            throw new SemanticError(`Propiedad 'longitud' no es aplicable directamente a objetos literales genéricos a menos que esté definida. Se obtuvo '${formatType(objectType)}'.`);
          }
          throw new SemanticError(`La propiedad '${memberName}' no existe en el objeto literal.`);
        }
        return objectType.properties.get(memberName); // Devuelve el TIPO de la propiedad
      }

      if (!objectType.isClassInstance && !objectType.isClass) {
        throw new SemanticError(`El operando izquierdo de '.' debe ser una instancia de clase (o 'este'). Se obtuvo '${formatType(objectType)}' para el objeto que precede a '.${memberName}'.`);
      }


      const classInfo = objectType.classInfo || (objectType.isClass ? objectType : null);
      if (!classInfo || !classInfo.members) {
        throw new SemanticError(`No se pudo determinar la información de clase para '${formatType(objectType)}' al intentar acceder a '.${memberName}'.`);
      }

      const memberSymbol = classInfo.members.get(memberName);

      if (!memberSymbol) {
        // Si se usó # y no se encontró, o si no se usó # y no se encontró.
        throw new SemanticError(`El miembro '${memberName}' no existe en el tipo '${classInfo.base}'.`);
      }

      // Chequeo de visibilidad
      if (memberSymbol.visibilidad === "privada") {
        if (!scope.currentClassContext || scope.currentClassContext.className !== memberSymbol.declarerClass) {
          throw new SemanticError(`No se puede acceder al miembro privado '${memberName}' de la clase '${memberSymbol.declarerClass}' desde el contexto actual (línea aproximada: ${objetoNode.line || 'desconocida'}).`); // Añadir info de línea si está disponible
        }

        // Opcional: si quieres que el uso de '#' sea mandatorio para privados
        // if (!utilizoAlmohadilla) {
        //    throw new SemanticError(`El miembro privado '${memberName}' debe ser accedido con '#'.`);
        // }
      } else { // Miembro es público
        // Opcional: si quieres prohibir '#' para públicos
        // if (utilizoAlmohadilla) {
        //    throw new SemanticError(`El miembro público '${memberName}' no debe ser accedido con '#'.`);
        // }
      }

      if (memberSymbol.kind === "metodo") {
        return { ...memberSymbol, type: memberSymbol.tipoRetorno, onClass: classInfo.base };
      }
      return memberSymbol.type;
    }

    case "CreacionObjetoLiteral": { // { clave: valor } [cite: 5]
      const propertiesInfo = new Map();
      let typeToBe = { base: "Objeto", isObjectLiteral: true, properties: propertiesInfo };

      if (astNode.propiedades && astNode.propiedades.length > 0) {
        for (const par of astNode.propiedades) { // par es { clave: "...", valor: ExpresionNode }
          const key = par.clave; // String de la clave
          const valueType = analyzeSemantics(par.valor, scope);
          if (propertiesInfo.has(key)) {
            throw new SemanticError(`Clave duplicada '${key}' en objeto literal.`);
          }
          propertiesInfo.set(key, valueType);
        }
      }
      return typeToBe;
    }

    case "ExpresionSentencia":
      analyzeSemantics(astNode.expresion, scope);
      return { base: "void" };

    default:
      console.warn(`SEM: Nodo tipo '${nodeType}' no manejado explícitamente: ${JSON.stringify(astNode)}`);
      return { base: "void" };
  }
}


// ---- FUNCIONES AUXILIARES DE TIPOS ----
function resolveTypeNode(typeNode, scope) { // typeNode es el NODO del AST para el tipo
  if (!typeNode) throw new SemanticError("Nodo de tipo indefinido encontrado.");

  // Si typeNode es un string (ej. 'numero' de TipoBase -> %TIPO_NUMERO)
  if (typeof typeNode === 'string') {
    if (["numero", "texto", "booleano", "Objeto", "vacio"].includes(typeNode)) {
      return { base: typeNode };
    } else { // Asumimos es nombre de clase/tipo definido por el usuario
      const symbol = scope.lookupSymbol(typeNode); // typeNode es el nombre de la clase aquí
      if (symbol && symbol.type.isClass) {
        return symbol.type; // Devuelve la representación del tipo clase almacenada en la tabla de símbolos
      }
      // Podría ser un alias de tipo si se implementan.
      throw new SemanticError(`Tipo '${typeNode}' desconocido o no declarado.`);
    }
  }

  // Si typeNode es un objeto nodo del AST (ej. de Tipo -> TipoBase, TipoArreglo)
  if (typeNode.type === "TipoArreglo") {
    const baseElementType = resolveTypeNode(typeNode.tipoElemento, scope);
    return { base: baseElementType.base, isArray: true, dimensions: 1, tipoElemento: baseElementType };
  }
  if (typeNode.type === "TipoMatriz") {
    const baseElementType = resolveTypeNode(typeNode.tipoElemento, scope);
    return {
      base: baseElementType.base,
      isArray: true,
      dimensions: 2,
      tipoElemento: { // El elemento de este arreglo es OTRO arreglo
        base: baseElementType.base,
        isArray: true,
        dimensions: 1,
        tipoElemento: baseElementType
      }
    };
  }
  // Si el tipo es directamente un identificador general (para nombres de clase como tipo)
  // Esta situación es manejada cuando typeNode es un string (el valor del token IDENTIFICADOR_GRAL)
  // y se busca en la tabla de símbolos.

  // Si typeNode ya es un objeto de tipo resuelto (pasado recursivamente)
  if (typeNode.base) return typeNode;

  throw new SemanticError(`Nodo de tipo AST no reconocido o malformado: ${JSON.stringify(typeNode)}`);
}

function formatType(typeObj) {
  if (!typeObj) return "indefinido";
  if (typeof typeObj === 'string') return typeObj;

  let s = "";
  if (typeObj.isClassInstance) s = `instancia_de_${typeObj.base}`;
  else if (typeObj.isClass) s = `clase_${typeObj.base}`;
  else s = typeObj.base || "tipo_desconocido";

  if (typeObj.isArray) {
    let currentType = typeObj;
    let brackets = "";
    let baseTypeName = "";

    // Navegar hasta el tipo base del elemento más interno
    let temp = currentType;
    while (temp && temp.isArray) {
      brackets += "[]";
      temp = temp.tipoElemento;
    }
    baseTypeName = temp ? temp.base : (typeObj.tipoElemento ? typeObj.tipoElemento.base : "desconocido");

    s = baseTypeName + brackets;
  }
  return s;
}

function isNumeric(typeObj) { return typeObj && typeObj.base === "numero" && !typeObj.isArray; }
function isText(typeObj) { return typeObj && typeObj.base === "texto" && !typeObj.isArray; }
function isBoolean(typeObj) { return typeObj && typeObj.base === "booleano" && !typeObj.isArray; }
function isVoid(typeObj) { return typeObj && typeObj.base === "vacio"; }
function isArrayType(typeObj) { return typeObj && typeObj.isArray === true; }
function isObjectType(typeObj) { return typeObj && typeObj.base === "Objeto" && !typeObj.isArray; } // Para el tipo genérico Objeto
function isClassInstance(typeObj) { return typeObj && typeObj.isClassInstance === true; }


function isAssignable(astNode, scope) {
  // Verifica si el astNode representa una "L-value" (algo a lo que se puede asignar)
  if (astNode.type === "Variable" || (astNode.type === "IDENTIFICADOR_VAR" && scope.lookupSymbol(astNode.value)?.mutable)) {
    const symbol = scope.lookupSymbol(astNode.nombre || astNode.value);
    return symbol && symbol.mutable;
  }
  if (astNode.type === "AccesoArreglo" || astNode.type === "AccesoArregloDoble") {
    return true; // Elementos de arreglo son asignables
  }
  if (astNode.type === "AccesoMiembro") {
    // Se necesitaría resolver el miembro para ver si es una propiedad mutable y no un método.
    // Por ahora, una simplificación:
    // const memberType = analyzeSemantics(astNode, scope); // Podría causar recursión infinita si se llama desde OpUnaria -> analyzeSemantics -> AccesoMiembro
    // Para evitarlo, AccesoMiembro debería devolver suficiente info o tener una forma de chequear sin re-analizar completamente.
    // Esta función es para ++/--, donde el tipo ya fue resuelto. Asumimos que si es una propiedad, es asignable.
    const objectType = analyzeSemantics(astNode.objeto, scope);
    if (objectType && objectType.classInfo && objectType.classInfo.members) {
      const member = objectType.classInfo.members.get(astNode.propiedad);
      return member && member.kind === 'propiedad'; // Asumimos propiedades son mutables a menos que se indique lo contrario
    }
    return false; // No se pudo determinar
  }
  return false;
}


function areTypesCompatible(expectedType, actualType) {
  if (!expectedType || !actualType) return false;
  // Permitir asignar cualquier cosa a 'Objeto' o si el tipo esperado es 'desconocido'
  if (expectedType.base === "Objeto" || expectedType.base === "desconocido") return true;
  // No se puede asignar 'void' a un tipo que espera un valor, a menos que el esperado también sea 'void'.
  if (actualType.base === "vacio" && expectedType.base !== "vacio") return false;
  // Se puede "asignar" una expresión con valor a un contexto void (se ignora el valor), pero no al revés.
  // Esto es más bien para compatibilidad de retorno de funciones, no tanto para asignación directa de variables.
  // if (expectedType.base === "vacio" && actualType.base !== "vacio") return true;


  if (expectedType.isArray !== actualType.isArray) return false;

  if (expectedType.isArray) { // Si ambos son arreglos
    // Si el esperado es arreglo de 'desconocido', cualquier arreglo actual es compatible (para arreglos vacíos inicializados)
    if (expectedType.tipoElemento && expectedType.tipoElemento.base === "desconocido") return true;
    // Si el actual es arreglo de 'desconocido' (ej. `[]`), es compatible si el esperado es un arreglo.
    if (actualType.tipoElemento && actualType.tipoElemento.base === "desconocido") return true;

    if ((expectedType.dimensions || 1) !== (actualType.dimensions || 1)) return false;
    return areTypesCompatible(expectedType.tipoElemento, actualType.tipoElemento);
  }

  // Compatibilidad de clases/instancias (sin herencia por ahora)
  if (expectedType.isClassInstance && actualType.isClassInstance) {
    return expectedType.base === actualType.base; // Deben ser instancias de la misma clase
  }
  // Si se espera una clase (ej. para un parámetro de tipo Clase) y se pasa una instancia de esa clase
  // if (expectedType.isClass && actualType.isClassInstance) {
  //   return expectedType.base === actualType.base;
  // }
  // (No se suele asignar una clase (el tipo) a una variable que espera una instancia)


  return expectedType.base === actualType.base;
}

function areTypesCompatibleForComparison(type1, type2) { // Para ==, !=
  if (!type1 || !type2) return false;
  // Permitir comparación con 'desconocido' (podría ser nulo o no inicializado)
  if (type1.base === "desconocido" || type2.base === "desconocido") return true;

  // No se pueden comparar arreglos directamente por valor con == o != en LibreScript
  if (type1.isArray || type2.isArray) return false;
  // No se pueden comparar objetos/instancias de clase directamente por valor con == o !=
  if (type1.isClassInstance || type2.isClassInstance || type1.isObjectLiteral || type2.isObjectLiteral) return false;
  if (type1.base === "Objeto" || type2.base === "Objeto") return false; // Tipo Objeto genérico tampoco

  // Solo comparar primitivos si son del mismo tipo base
  return type1.base === type2.base;
}


function checkOpBinariaTypes(opNode, leftType, rightType, scope) {
  const op = opNode.operador;
  switch (op) {
    case '+': // Suma o concatenación [cite: 23]
      if (isNumeric(leftType) && isNumeric(rightType)) return { base: "numero" };
      // Concatenación si alguno es texto
      if (isText(leftType) || isText(rightType)) {
        // En LibreScript, numero + texto -> texto.
        return { base: "texto" };
      }
      throw new SemanticError(`Operación '+' no válida entre tipos '${formatType(leftType)}' y '${formatType(rightType)}'. Se esperaba numero/numero o al menos un texto.`);
    case '-': case '*': case '/': case '%': case '**': // [cite: 24, 25]
      if (!isNumeric(leftType) || !isNumeric(rightType)) {
        throw new SemanticError(`Operación '${op}' requiere operandos numéricos. Se obtuvieron '${formatType(leftType)}' y '${formatType(rightType)}'.`);
      }
      if (op === '/' && opNode.derecha.type === "LiteralNumero" && opNode.derecha.value === 0) {
        // Podría advertir o lanzar error por división por cero estática, pero usualmente es error en tiempo de ejecución.
        // console.warn("Advertencia Semántica: División por cero literal detectada.");
      }
      return { base: "numero" };
    case '==': case '!=': // [cite: 33]
      if (!areTypesCompatibleForComparison(leftType, rightType)) {
        // Damos un mensaje más específico si son incompatibles fundamentalmente.
        // Si son del mismo tipo base pero no comparables (ej. arreglos), areTypesCompatibleForComparison ya dio falso.
        throw new SemanticError(`No se pueden comparar tipos '${formatType(leftType)}' y '${formatType(rightType)}' con '${op}' según las reglas de LibreScript (solo primitivos del mismo tipo).`);
      }
      return { base: "booleano" };
    case '<': case '>': case '<=': case '>=': // [cite: 34, 35, 36, 37]
      // Solo entre números o entre textos.
      if (!((isNumeric(leftType) && isNumeric(rightType)) || (isText(leftType) && isText(rightType)))) {
        throw new SemanticError(`Operación relacional '${op}' solo válida entre dos números o entre dos textos. Se obtuvieron '${formatType(leftType)}' y '${formatType(rightType)}'.`);
      }
      return { base: "booleano" };
    case '&&': case '||': // [cite: 38, 39]
      if (!isBoolean(leftType) || !isBoolean(rightType)) {
        throw new SemanticError(`Operador lógico '${op}' requiere operandos booleanos. Se obtuvieron '${formatType(leftType)}' y '${formatType(rightType)}'.`);
      }
      return { base: "booleano" };
    default:
      throw new SemanticError(`Operador binario desconocido o no implementado en chequeo de tipos: '${op}'.`);
  }
}

function checkFunctionCallArguments(callNodeOrInfo, callableSymbol, scope, contextName) {
  const expectedParams = callableSymbol.parametros || [];
  const actualArgs = callNodeOrInfo.argumentos || []; // callNodeOrInfo puede ser el nodo AST o un objeto {argumentos: ...}

  // Para funciones variádicas como imprimir, no hay conteo estricto de parámetros.
  if (callableSymbol.isVariadic) {
    actualArgs.forEach(arg => analyzeSemantics(arg, scope)); // Analizar cada argumento
    return;
  }

  // Chequeo de cantidad de argumentos
  const minExpectedArgs = expectedParams.filter(p => !p.optional).length;
  const maxExpectedArgs = expectedParams.length;

  if (actualArgs.length < minExpectedArgs || actualArgs.length > maxExpectedArgs) {
    let msg = `${contextName} esperaba `;
    if (minExpectedArgs === maxExpectedArgs) {
      msg += `${minExpectedArgs}`;
    } else {
      msg += `entre ${minExpectedArgs} y ${maxExpectedArgs}`;
    }
    msg += ` argumentos, pero recibió ${actualArgs.length}.`;
    throw new SemanticError(msg);
  }

  // Chequeo de tipos de argumentos
  for (let i = 0; i < actualArgs.length; i++) {
    // No debería ir más allá de expectedParams.length debido al chequeo anterior,
    // a menos que se refinen los opcionales o variádicos.
    if (i < expectedParams.length) {
      const expectedParamType = expectedParams[i].type;
      const actualArgType = analyzeSemantics(actualArgs[i], scope);
      if (!areTypesCompatible(expectedParamType, actualArgType)) {
        throw new SemanticError(
          `Argumento ${i + 1} de ${contextName}: se esperaba tipo '${formatType(expectedParamType)}' pero se obtuvo '${formatType(actualArgType)}'.`
        );
      }
    }
  }
}


///////////////////////////////////////////////////////////////////////////
// Punto de Entrada Principal para Pruebas
///////////////////////////////////////////////////////////////////////////

export function main(code) {
  const output = {
    tokens: [],
    ast: null,
    messages: [],
    semantic: {
      exit: true,
      errors: null,
      warnings: [],
      symbols: [],
      scopes: []
    },
    errors: []
  }



  // ---- FASE LÉXICA (Opcional, para depuración) ----


  try {
    output.messages.push("Iniciando análisis léxico...");
    lexer.reset(code);
    const tokens = [];
    let token;
    while (token = lexer.next()) {
      if (token.type !== 'ws' && token.type !== 'nl') { // Excluir espacios y saltos de línea puros
        tokens.push(token);
      }
    }
    output.tokens = tokens.map(t => ({
      type: t.type,
      value: t.value,
      text: t.text,
      line: t.line,
      col: t.col
    }));


  } catch (lexErr) {
    output.semantic.exit = false;
    output.semantic.errors = {
      type: "lexical",
      message: `Error léxico 🔴: ${lexErr.message}`,
      severity: "error",
      line: lexErr.line || '?',
      column: lexErr.col || '?'
    };
    output.errors.push(`Error léxico 🔴: ${lexErr.message}`);
    return output;
  }
  
  // ---- FASE SINTÁCTICA ----
  let ast;
  try {
  console.log("\n--- AST (Árbol de Sintaxis Abstracta) ---");
  output.messages.push("Iniciando análisis sintáctico...");
  ast = parseCode(code);

  if (!ast) {
     throw new Error("No se pudo generar el AST (árbol de sintaxis abstracta)");
   
  }
}  catch (parseErr) {
  output.semantic.exit = false;
  
  // Detalles específicos del error de parseo
  const errorInfo = {
    type: "syntax",  // Tipo de error (sintáctico)
    message: `Error de sintaxis 🔴: ${parseErr.message}`,
    severity: "error",
    line: parseErr.location?.start.line || '?',
    column: parseErr.location?.start.column || '?',
    // Puedes añadir más detalles si tu parser los provee:
    expected: parseErr.expected,  // Lo que esperaba el parser
    found: parseErr.found,        // Lo que encontró
    token: parseErr.token,        // Token problemático
    // Área alrededor del error para contexto (opcional)
    context: code.split('\n')[parseErr.location?.start.line - 1] || ''
  };
  
  output.semantic.errors = errorInfo;
  output.errors.push(`Error de sintaxis 🔴 (línea ${errorInfo.line}:${errorInfo.column}): ${parseErr.message}`);
  
  return output;
}

  output.ast = ast;
  
  output.messages.push("Análisis sintáctico completado sin errores. ✅");
  console.log(JSON.stringify(ast, null, 2));

  // ---- FASE SEMÁNTICA ----
  console.log("\n--- Análisis Semántico ---");
  output.messages.push("Iniciando análisis semántico...");
  const globalSemanticScope = new SymbolTable();
  globalSemanticScope.output = output.semantic; // Conectar el output de semántica al scope global

 

  globalSemanticScope.addSymbol("imprimir",
    { base: "vacio" }, // Tipo de retorno
    "funcion",
    {
      parametros: [], // Lista vacía para isVariadic
      tipoRetorno: { base: "vacio" },
      isVariadic: true // Permite cualquier número y tipo de argumentos
    }
  );
  // leer([prompt: texto]): texto [cite: 71, 72]
  globalSemanticScope.addSymbol("leer",
    { base: "texto" }, // Tipo de retorno
    "funcion",
    {
      parametros: [{ name: "$prompt", type: { base: "texto" }, optional: true }],
      tipoRetorno: { base: "texto" },
      isVariadic: false
    }
  );
  // Funciones de conversión de tipo [cite: 16]
  // aNum(valor: texto): numero
  globalSemanticScope.addSymbol("aNum", { base: "numero" }, "funcion", {
    parametros: [{ name: "$valor", type: { base: "texto" } }], // También podría aceptar 'numero' o 'booleano'
    tipoRetorno: { base: "numero" },
    isVariadic: false
  });
  // aTxt(valor: cualquier_primitivo): texto
  globalSemanticScope.addSymbol("aTxt", { base: "texto" }, "funcion", {
    parametros: [{ name: "$valor", type: { base: "Objeto" } }], // 'Objeto' como 'any' para aceptar numero, booleano, texto
    tipoRetorno: { base: "texto" },
    isVariadic: false
  });
  // aBool(valor: cualquier_primitivo): booleano
  globalSemanticScope.addSymbol("aBool", { base: "booleano" }, "funcion", {
    parametros: [{ name: "$valor", type: { base: "Objeto" } }],
    tipoRetorno: { base: "booleano" },
    isVariadic: false
  });

  // Tipo 'Objeto' predefinido [cite: 5]
  globalSemanticScope.addSymbol("Objeto", { base: "Objeto", isClass: false, isType: true }, "tipo");


  try {
    analyzeSemantics(ast, globalSemanticScope);
    output.semantic.exit = true;
    output.semantic.errors = null; // No hay errores semánticos
    output.semantic.symbols = recolectarSimbolos(globalSemanticScope);
    output.semantic.scopes = construirJerarquiaScope(globalSemanticScope);
    
    output.messages.push("Análisis semántico completado sin errores. ✅");
  } catch (e) {
    output.semantic.exit = false;
    if (e instanceof SemanticError) {
      output.semantic.errors = {
        type: "semantic",
        message: `Error semántico 🔴: ${e.message}`,
        line: e.line || '?',
        column: e.column || '?',
        severity: "error"
      };
      output.errors.push(`Error semántico 🔴 (línea ${e.line || '?'}): ${e.message}`);
    } else {
      output.semantic.errors = {
        type: "unexpected",
        message: `Error inesperado durante el análisis semántico 🔴: ${e.message}`,
        severity: "error"
      };
      output.errors.push("Error inesperado durante el análisis semántico 🔴: " + e.message);
      output.errors.push("Detalles: " + e.stack);
    }
  }
    return output;
}

function recolectarSimbolos(scope, simbolos = []) {
  // Recorre todos los símbolos del ámbito actual
  for (const [nombre, simbolo] of scope.symbols) {
    simbolos.push({
      nombre,
      tipo: formatType(simbolo.type), // Ej: "numero", "texto[]"
      tipoDato: simbolo.kind,        // "variable", "constante", "función"
      linea: simbolo.node?.line,     // Línea donde se declaró
      mutable: simbolo.mutable       // Si es modificable
    });
  }
  // Busca símbolos en ámbitos padres (recursividad)
  if (scope.parentScope) {
    recolectarSimbolos(scope.parentScope, simbolos);
  }
  return simbolos;
}
function construirJerarquiaScope(scope) {
  return {
    tipo: scope.currentFunctionContext ? 'función' : 
          scope.currentClassContext ? 'clase' : 
          scope.currentLoopContext ? 'bucle' : 'global',
    simbolos: Array.from(scope.symbols.keys()), // Nombres de símbolos
    hijos: [] // Ámbitos anidados (ej: bloques dentro de una función)
  };
}
