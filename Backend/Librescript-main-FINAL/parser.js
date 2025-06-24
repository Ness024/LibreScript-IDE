// parser.js
// Si usas ES Modules:
import nearley from 'nearley';
import grammar from './grammar.js'; // El archivo generado por nearleyc


export function parseCode(code) {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

  

  try {
    parser.feed(code);
    if (parser.results.length > 1) {
      //depuracion, ojo
      // console.warn(parser.results.map(r => JSON.stringify(r, null, 2)).join('\n---\n')); 
      console.warn("¡Gramática ambigua! Múltiples resultados de parseo encontrados.");
      return parser.results[0];
    } else if (parser.results.length === 1) {
      return parser.results[0];
    } else {
      if (code.trim().length > 0) { // Solo error si había código real
        throw new Error("No se pudo parsear el código. No hay resultados válidos o entrada incompleta.");
     }
     return null; // Código vacío o solo comentarios/espacios.
   }
  } catch (error) {
    console.error("Error de parseo:", error.message);
    // Intentar obtener más detalles del error de Nearley
    // error.offset es la posición del token problemático.
    // error.token es el token problemático.
    if (error.token) {
      const {line, col, offset, text} = error.token;
      console.error(`Error cerca de la línea ${line}, columna ${col} (offset ${offset}). Token: '${text}' (tipo: ${error.token.type})`);
  } else if (error.message.includes("Unexpected end of input")) {
      console.error("Error: Fin inesperado de la entrada. Puede que falte un ';' o '}'.");
  }
  return null;
}
}


// Exporta la función de parseo
// ES Modules:
//export { parseCode };
// CommonJS:
 //module.exports = { parseCode };