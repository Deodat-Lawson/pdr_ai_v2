/**
 * Converts LaTeX parentheses notation ( ... ) to dollar sign notation $ ... $
 * This handles AI responses that use parentheses for inline equations.
 */
function convertParenthesesNotationToLatex(text: string): string {
  // Pattern to match LaTeX equations in parentheses
  // Looks for ( followed by LaTeX content (backslashes, subscripts, superscripts) and closing )
  // Must contain LaTeX indicators to avoid converting regular text like "func(x, y)"
  
  // First, handle nested parentheses (like domain ranges) before single parentheses
  // Pattern: (( content )) where content contains numbers, commas, or math
  // Preserve the inner parentheses in the output
  text = text.replace(/\(\(([^()]+)\)\)/g, (match, equation) => {
    return `$(${equation.trim()})$`;
  });
  
  // Match parentheses containing LaTeX syntax or equations
  // Examples: (C_n), (a = 0), (\sum...)
  // Pattern: ( followed by either:
  //   - Backslash commands: \sum, \frac, etc.
  //   - Subscripts/superscripts: C_n, x^2
  //   - Equations with =: a = 0
  // Exclude commas to avoid function calls like func(x, y)
  text = text.replace(/\(([^(),]*(?:\\[a-zA-Z]+|[_^=])[^(),]*)\)/g, (match, equation) => {
    return `$${equation.trim()}$`;
  });
  
  // Handle single letter variables in parentheses: (x), (a), (n)
  // But NOT function calls like func(x) - check that there's no word character before the (
  text = text.replace(/(?<![a-zA-Z])\(([a-zA-Z])\)(?!\w)/g, (match, letter) => {
    return `$${letter}$`;
  });
  
  return text;
}

/**
 * Converts LaTeX bracket notation [ ... ] to dollar sign notation $ ... $ or $$ ... $$
 * This handles AI responses that use square brackets for equations instead of dollar signs.
 */
function convertBracketNotationToLatex(text: string): string {
  // Pattern to match LaTeX equations in square brackets
  // Looks for [ followed by LaTeX content (backslashes, math symbols, etc.) and closing ]
  // Must have space after opening bracket and before closing bracket to avoid matching array access like arr[0]
  
  // First, handle display equations (on their own line or with newlines)
  // Pattern: newline or start, optional whitespace, [, content, ], optional whitespace, newline or end
  text = text.replace(/(\n|^)\s*\[\s*(\\[a-zA-Z]+|[^[\]]*(?:\\[a-zA-Z]+|[_^{}])[^[\]]*)\s*\]\s*(?=\n|$)/g, 
    (match, prefix) => {
      const equation = match.trim().slice(1, -1).trim(); // Remove [ and ] and trim
      return `${prefix}$$${equation}$$`;
    }
  );
  
  // Then handle inline equations (with spaces around brackets to avoid array access)
  // Pattern: [ space, content with LaTeX, space ]
  text = text.replace(/\[\s+((?:\\[a-zA-Z]+|[^[\]]*(?:\\[a-zA-Z]+|[_^{}])[^[\]]*)+)\s+\]/g, 
    (match, equation) => {
      return `$${equation.trim()}$`;
    }
  );
  
  return text;
}

export function normalizeModelContent(content: unknown): string {
  if (typeof content === "string") {
    // Apply conversions in order: brackets first, then parentheses
    let result = convertBracketNotationToLatex(content);
    result = convertParenthesesNotationToLatex(result);
    return result;
  }

  if (Array.isArray(content)) {
    const joined = content
      .map((part) =>
        typeof part === "string" ? part : JSON.stringify(part)
      )
      .join("");
    // Apply conversions in order: brackets first, then parentheses
    let result = convertBracketNotationToLatex(joined);
    result = convertParenthesesNotationToLatex(result);
    return result;
  }

  if (content == null) {
    return "";
  }

  // Fallback: best-effort stringification for other structures
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

export default normalizeModelContent;

