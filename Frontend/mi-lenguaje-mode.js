// Modo básico de LibreScript para CodeMirror
CodeMirror.defineMode("librescript", function() {
  return {
    token: function(stream, state) {
      // Palabras reservadas
      if (stream.match(/\b(funcion|clase|imprimir|leer|si|siNo|mientras|para|verdadero|falso|devolver|nuevo|este|vacio|segun|caso|pordefecto|romper)\b/)) {
        return "keyword";
      }
      // Tipos
      if (stream.match(/\b(numero|texto|booleano|arreglo|Objeto)\b/)) {
        return "variable-2";
      }
      // Constantes y variables
      if (stream.match(/\$\$[a-zA-Z_][a-zA-Z0-9_]*/)) {
        return "def";
      }
      if (stream.match(/\$[a-zA-Z_][a-zA-Z0-9_]*/)) {
        return "variable";
      }
      // Números
      if (stream.match(/[0-9]+(\.[0-9]+)?/)) {
        return "number";
      }
      // Cadenas de texto
      if (stream.match(/"(?:[^"\\]|\\.)*"/)) {
        return "string";
      }
      // Comentarios de línea
      if (stream.match(/\/\/.*$/)) {
        return "comment";
      }
      // Comentarios de bloque
      if (stream.match(/\/\*[^]*?\*\//)) {
        return "comment";
      }
      // Operadores
      if (stream.match(/\*\*|==|!=|<=|>=|\+=|-=|\*=|\/=|\+\+|--|&&|\|\||[+\-*/%=<>!]/)) {
        return "operator";
      }
      // Paréntesis y delimitadores
      if (stream.match(/[(){}\[\];,.:#]/)) {
        return null;
      }
      // Avanza un carácter si nada coincide
      stream.next();
      return null;
    }
  };
});
