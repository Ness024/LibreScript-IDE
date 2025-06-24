// lexer.js
import moo from 'moo';
//const moo = require('moo');
const lexer = moo.compile({
ws: { match: /[ \t]+/, lineBreaks: false },
nl: { match: /\n/, lineBreaks: true },

comentario_linea: /\/\/.*/,
comentario_bloque: { match: /\/\*[^]*?\*\//, lineBreaks: true },

  // ---tokens de lenguaje ---
  // Literales
  numero:       /[0-9]+(?:\.[0-9]+)?/,
  texto:        /\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*'/,
  

  LIT_VERDADERO: /\bverdadero\b/,
  LIT_FALSO:    /\bfalso\b/,

  // Palabras Reservadas
  PR_SINO_SI:   /\bsiNo\s*si\b/,     
  PR_CONSTRUCTOR: /\bconstructor\b/, 
  PR_IMPRIMIR:  /\bimprimir\b/,
  PR_LEER:      /\bleer\b/,         
  PR_DEVOLVER:  /\bdevolver\b/,
  PR_FUNCION:   /\bfuncion\b/,
  PR_CLASE:     /\bclase\b/,
  PR_NUEVO:     /\bnuevo\b/,
  PR_ESTE:      /\beste\b/,        
  PR_VACIO:     /\bvacio\b/,         
  PR_SI:        /\bsi\b/,
  PR_SINO:      /\bsiNo\b/,
  PR_SEGUN:     /\bsegun\b/,
  PR_CASO:      /\bcaso\b/,
  PR_PORDEFECTO:/\bpordefecto\b/,
  PR_ROMPER:    /\bromper\b/,
  PR_MIENTRAS:  /\bmientras\b/,
  PR_PARA:      /\bpara\b/,

  // Palabras Clave de Tipo de Datos
  TIPO_NUMERO:  /\bnumero\b/,
  TIPO_TEXTO:   /\btexto\b/,
  TIPO_BOOLEANO:/\bbooleano\b/,
  TIPO_ARREGLO: /\barreglo\b/,
  TIPO_OBJETO:  /\bObjeto\b/,

  // Identificadores (DEBEN ir DESPUÉS de las palabras clave)
  IDENTIFICADOR_CONST: /\$\$[a-zA-Z_][a-zA-Z0-9_]*/,
  IDENTIFICADOR_VAR:   /\$[a-zA-Z_][a-zA-Z0-9_]*/,
  
  IDENTIFICADOR_GRAL:  /[a-zA-Z_][a-zA-Z0-9_]*/,

  // Operadores (multi-caracter primero)
  OP_POTENCIA:  /\*\*/,
  OP_EQ:        /==/,
  OP_NEQ:       /!=/,
  OP_GTE:       />=/,
  OP_LTE:       /<=/,
  OP_AND:       /&&/,
  OP_OR:        /\|\|/,
  OP_INCREMENTO:/\+\+/,
  OP_DECREMENTO:/--/,
  OP_ASIG_SUMA: /\+=/,
  OP_ASIG_RESTA:/-=/,
  OP_ASIG_MULT: /\*=/,
  OP_ASIG_DIV:  /\/=/,

  // Operadores de un solo caracter
  OP_ASIGNACION: /=/,
  OP_SUMA:      /\+/,
  OP_RESTA:     /\-/,
  OP_MULT:      /\*/,
  OP_DIV:       /\//,
  OP_MODULO:    /%/,
  OP_GT:        />/,
  OP_LT:        /</,
  OP_NOT:       /!/,

  // Delimitadores
  LPAREN:       /\(/,
  RPAREN:       /\)/,
  LBRACE:       /\{/,
  RBRACE:       /\}/,
  LBRACKET:     /\[/,
  RBRACKET:     /\]/,
  PUNTO_Y_COMA: /;/,
  COMA:         /,/,
  DOS_PUNTOS:   /:/,
  PUNTO:        /\./,// Para acceso a miembros de objeto/clase (ej: este.prop)
  ALMOHADILLA:  /#/,

  error:        moo.error
});

export default lexer;