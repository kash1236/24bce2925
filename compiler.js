const KEYWORDS = new Set(["let", "print", "if", "else", "while", "true", "false"]);
const TWO_CHARACTER_OPERATORS = new Set(["==", "!=", "<=", ">=", "&&", "||"]);
const ONE_CHARACTER_TOKENS = new Set(["+", "-", "*", "/", "%", "!", "=", "<", ">", "(", ")", "{", "}", ";"]);

export class CompilerError extends Error {
  constructor(message, phase, location) {
    super(message);
    this.name = "CompilerError";
    this.phase = phase;
    this.location = location;
  }
}

function fail(message, phase, token) {
  throw new CompilerError(message, phase, { line: token.line, column: token.column });
}

export function tokenize(source) {
  const tokens = [];
  let index = 0;
  let line = 1;
  let column = 1;

  const advance = () => {
    const character = source[index++];
    if (character === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return character;
  };

  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) {
      advance();
      continue;
    }
    if (character === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") advance();
      continue;
    }

    const start = { line, column };
    if (/[0-9]/.test(character)) {
      let value = "";
      while (/[0-9]/.test(source[index] ?? "")) value += advance();
      if (source[index] === "." && /[0-9]/.test(source[index + 1] ?? "")) {
        value += advance();
        while (/[0-9]/.test(source[index] ?? "")) value += advance();
      }
      tokens.push({ type: "NUMBER", value, line: start.line, column: start.column });
      continue;
    }
    if (/[A-Za-z_]/.test(character)) {
      let value = "";
      while (/[A-Za-z0-9_]/.test(source[index] ?? "")) value += advance();
      const type = KEYWORDS.has(value) ? value.toUpperCase() : "IDENTIFIER";
      tokens.push({ type, value, line: start.line, column: start.column });
      continue;
    }

    const pair = source.slice(index, index + 2);
    if (TWO_CHARACTER_OPERATORS.has(pair)) {
      advance();
      advance();
      tokens.push({ type: pair, value: pair, line: start.line, column: start.column });
      continue;
    }
    if (ONE_CHARACTER_TOKENS.has(character)) {
      advance();
      tokens.push({ type: character, value: character, line: start.line, column: start.column });
      continue;
    }

    fail(`Unexpected character “${character}”.`, "lexical", start);
  }

  tokens.push({ type: "EOF", value: "end of input", line, column });
  return tokens;
}

const PRECEDENCE = new Map([
  ["||", 1], ["&&", 2], ["==", 3], ["!=", 3],
  ["<", 4], ["<=", 4], [">", 4], [">=", 4],
  ["+", 5], ["-", 5], ["*", 6], ["/", 6], ["%", 6],
]);

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.index = 0;
  }

  get current() { return this.tokens[this.index]; }

  match(...types) {
    if (!types.includes(this.current.type)) return null;
    return this.tokens[this.index++];
  }

  expect(type, description = type) {
    const token = this.match(type);
    if (!token) fail(`Expected ${description}, found ${this.current.value}.`, "syntax", this.current);
    return token;
  }

  parse() {
    const body = [];
    while (this.current.type !== "EOF") body.push(this.statement());
    return { kind: "Program", body };
  }

  statement() {
    if (this.match("LET")) {
      const name = this.expect("IDENTIFIER", "a variable name");
      this.expect("=", "“=”");
      const value = this.expression();
      this.expect(";", "“;” after the declaration");
      return { kind: "LetStatement", name: name.value, location: name, value };
    }
    if (this.match("PRINT")) {
      const value = this.expression();
      this.expect(";", "“;” after the print statement");
      return { kind: "PrintStatement", value };
    }
    if (this.match("IF")) {
      this.expect("(", "“(” after if");
      const condition = this.expression();
      this.expect(")", "“)” after the condition");
      const thenBranch = this.block();
      const elseBranch = this.match("ELSE") ? this.block() : [];
      return { kind: "IfStatement", condition, thenBranch, elseBranch };
    }
    if (this.match("WHILE")) {
      this.expect("(", "“(” after while");
      const condition = this.expression();
      this.expect(")", "“)” after the condition");
      return { kind: "WhileStatement", condition, body: this.block() };
    }
    if (this.current.type === "IDENTIFIER") {
      const name = this.tokens[this.index++];
      this.expect("=", "“=” after the variable name");
      const value = this.expression();
      this.expect(";", "“;” after the assignment");
      return { kind: "AssignmentStatement", name: name.value, location: name, value };
    }
    fail(`Expected a statement, found ${this.current.value}.`, "syntax", this.current);
  }

  block() {
    this.expect("{", "“{” to begin a block");
    const body = [];
    while (this.current.type !== "}" && this.current.type !== "EOF") body.push(this.statement());
    this.expect("}", "“}” to close the block");
    return body;
  }

  expression(minimumPrecedence = 1) {
    let left = this.prefix();
    while ((PRECEDENCE.get(this.current.type) ?? 0) >= minimumPrecedence) {
      const operator = this.tokens[this.index++];
      const precedence = PRECEDENCE.get(operator.type);
      const right = this.expression(precedence + 1);
      left = { kind: "BinaryExpression", operator: operator.value, left, right, location: operator };
    }
    return left;
  }

  prefix() {
    const token = this.current;
    if (this.match("!", "-", "+")) {
      return { kind: "UnaryExpression", operator: token.value, value: this.expression(7), location: token };
    }
    if (this.match("NUMBER")) return { kind: "Literal", value: Number(token.value), location: token };
    if (this.match("TRUE")) return { kind: "Literal", value: true, location: token };
    if (this.match("FALSE")) return { kind: "Literal", value: false, location: token };
    if (this.match("IDENTIFIER")) return { kind: "Identifier", name: token.value, location: token };
    if (this.match("(")) {
      const expression = this.expression();
      this.expect(")", "“)” after the expression");
      return expression;
    }
    fail(`Expected an expression, found ${token.value}.`, "syntax", token);
  }
}

function analyze(program) {
  const symbols = new Map();
  const infer = (expression, scope) => {
    if (expression.kind === "Literal") return typeof expression.value === "boolean" ? "boolean" : "number";
    if (expression.kind === "Identifier") {
      if (!scope.has(expression.name)) fail(`“${expression.name}” is not declared.`, "semantic", expression.location);
      return scope.get(expression.name);
    }
    if (expression.kind === "UnaryExpression") {
      const type = infer(expression.value, scope);
      const expected = expression.operator === "!" ? "boolean" : "number";
      if (type !== expected) fail(`Operator “${expression.operator}” requires a ${expected}.`, "semantic", expression.location);
      return expected;
    }

    const left = infer(expression.left, scope);
    const right = infer(expression.right, scope);
    const operator = expression.operator;
    if (["+", "-", "*", "/", "%"].includes(operator)) {
      if (left !== "number" || right !== "number") fail(`Operator “${operator}” requires numbers.`, "semantic", expression.location);
      return "number";
    }
    if (["<", "<=", ">", ">="].includes(operator)) {
      if (left !== "number" || right !== "number") fail(`Operator “${operator}” requires numbers.`, "semantic", expression.location);
      return "boolean";
    }
    if (["&&", "||"].includes(operator)) {
      if (left !== "boolean" || right !== "boolean") fail(`Operator “${operator}” requires boolean values.`, "semantic", expression.location);
      return "boolean";
    }
    if (left !== right) fail(`Operator “${operator}” cannot compare different types.`, "semantic", expression.location);
    return "boolean";
  };

  const visit = (statements, scope) => {
    for (const statement of statements) {
      if (statement.kind === "LetStatement") {
        if (scope.has(statement.name)) fail(`“${statement.name}” has already been declared.`, "semantic", statement.location);
        const type = infer(statement.value, scope);
        scope.set(statement.name, type);
        symbols.set(statement.name, type);
      } else if (statement.kind === "AssignmentStatement") {
        if (!scope.has(statement.name)) fail(`“${statement.name}” is not declared.`, "semantic", statement.location);
        const type = infer(statement.value, scope);
        if (scope.get(statement.name) !== type) fail(`Cannot assign ${type} to ${statement.name} (${scope.get(statement.name)}).`, "semantic", statement.location);
      } else if (statement.kind === "PrintStatement") {
        infer(statement.value, scope);
      } else if (statement.kind === "IfStatement") {
        if (infer(statement.condition, scope) !== "boolean") fail("An if condition must be boolean.", "semantic", statement.condition.location);
        visit(statement.thenBranch, new Map(scope));
        visit(statement.elseBranch, new Map(scope));
      } else if (statement.kind === "WhileStatement") {
        if (infer(statement.condition, scope) !== "boolean") fail("A while condition must be boolean.", "semantic", statement.condition.location);
        visit(statement.body, new Map(scope));
      }
    }
  };

  visit(program.body, new Map());
  return [...symbols].map(([name, type]) => ({ name, type }));
}

function generateTac(program) {
  const lines = [];
  let temporary = 0;
  let label = 0;
  const expression = (node) => {
    if (node.kind === "Literal") return String(node.value);
    if (node.kind === "Identifier") return node.name;
    if (node.kind === "UnaryExpression") {
      const operand = expression(node.value);
      const result = `t${++temporary}`;
      lines.push(`${result} = ${node.operator}${operand}`);
      return result;
    }
    const left = expression(node.left);
    const right = expression(node.right);
    const result = `t${++temporary}`;
    lines.push(`${result} = ${left} ${node.operator} ${right}`);
    return result;
  };
  const statements = (body) => {
    for (const statement of body) {
      if (statement.kind === "LetStatement") lines.push(`${statement.name} = ${expression(statement.value)}`);
      if (statement.kind === "AssignmentStatement") lines.push(`${statement.name} = ${expression(statement.value)}`);
      if (statement.kind === "PrintStatement") lines.push(`print ${expression(statement.value)}`);
      if (statement.kind === "IfStatement") {
        const branch = ++label;
        const condition = expression(statement.condition);
        lines.push(`ifFalse ${condition} goto L${branch}_else`);
        statements(statement.thenBranch);
        if (statement.elseBranch.length) {
          lines.push(`goto L${branch}_end`, `L${branch}_else:`);
          statements(statement.elseBranch);
          lines.push(`L${branch}_end:`);
        } else {
          lines.push(`L${branch}_else:`);
        }
      }
      if (statement.kind === "WhileStatement") {
        const loop = ++label;
        lines.push(`L${loop}_start:`);
        const condition = expression(statement.condition);
        lines.push(`ifFalse ${condition} goto L${loop}_end`);
        statements(statement.body);
        lines.push(`goto L${loop}_start`, `L${loop}_end:`);
      }
    }
  };
  statements(program.body);
  return lines;
}

function execute(program) {
  const values = new Map();
  const output = [];
  const trace = [];
  let steps = 0;
  const evaluate = (node) => {
    if (node.kind === "Literal") return node.value;
    if (node.kind === "Identifier") return values.get(node.name);
    if (node.kind === "UnaryExpression") {
      const value = evaluate(node.value);
      if (node.operator === "!") return !value;
      return node.operator === "-" ? -value : value;
    }
    const left = evaluate(node.left);
    if (node.operator === "&&" && !left) return false;
    if (node.operator === "||" && left) return true;
    const right = evaluate(node.right);
    switch (node.operator) {
      case "+": return left + right;
      case "-": return left - right;
      case "*": return left * right;
      case "/":
        if (right === 0) fail("Division by zero.", "runtime", node.location);
        return left / right;
      case "%":
        if (right === 0) fail("Remainder by zero.", "runtime", node.location);
        return left % right;
      case "<": return left < right;
      case "<=": return left <= right;
      case ">": return left > right;
      case ">=": return left >= right;
      case "==": return left === right;
      case "!=": return left !== right;
      case "&&": return Boolean(left && right);
      case "||": return Boolean(left || right);
      default: throw new Error(`Unsupported operator: ${node.operator}`);
    }
  };
  const run = (body) => {
    for (const statement of body) {
      steps += 1;
      if (steps > 10000) fail("Execution stopped after 10,000 steps. Check for an endless loop.", "runtime", statement.location ?? { line: 1, column: 1 });
      if (statement.kind === "LetStatement" || statement.kind === "AssignmentStatement") {
        const value = evaluate(statement.value);
        values.set(statement.name, value);
        trace.push(`${statement.kind === "LetStatement" ? "declare" : "assign"} ${statement.name} = ${value}`);
      } else if (statement.kind === "PrintStatement") {
        const value = evaluate(statement.value);
        output.push(String(value));
        trace.push(`print ${value}`);
      } else if (statement.kind === "IfStatement") {
        const result = evaluate(statement.condition);
        trace.push(`condition → ${result}`);
        run(result ? statement.thenBranch : statement.elseBranch);
      } else if (statement.kind === "WhileStatement") {
        while (evaluate(statement.condition)) run(statement.body);
      }
    }
  };
  run(program.body);
  return { output, trace, values: [...values].map(([name, value]) => ({ name, value, type: typeof value })) };
}

export function compile(source) {
  const tokens = tokenize(source).filter((token) => token.type !== "EOF");
  const program = new Parser(tokenize(source)).parse();
  const symbols = analyze(program);
  const tac = generateTac(program);
  const result = execute(program);
  return { tokens, ast: program, symbols: result.values.length ? result.values : symbols.map(({ name, type }) => ({ name, type, value: "—" })), tac, ...result };
}