import test from "node:test";
import assert from "node:assert/strict";
import { compile, CompilerError, tokenize } from "../compiler.js";

test("tokenizer tracks source locations and skips comments", () => {
  const tokens = tokenize("// setup\nlet total = 2 + 3;");
  assert.equal(tokens[0].type, "LET");
  assert.equal(tokens[0].line, 2);
  assert.equal(tokens.at(-1).type, "EOF");
});

test("compiler respects arithmetic precedence and returns every phase", () => {
  const result = compile("let answer = 2 + 3 * 4;\nprint answer;");
  assert.deepEqual(result.output, ["14"]);
  assert.deepEqual(result.tac, ["t1 = 3 * 4", "t2 = 2 + t1", "answer = t2", "print answer"]);
  assert.equal(result.tokens.length, 12);
  assert.equal(result.values[0].value, 14);
});

test("if/else executes one branch and emits branch code", () => {
  const result = compile("let score = 8; if (score >= 5) { print score; } else { print 0; }");
  assert.deepEqual(result.output, ["8"]);
  assert.ok(result.tac.includes("ifFalse t1 goto L1_else"));
});

test("while loops update variables and stop when their condition changes", () => {
  const result = compile("let count = 0; while (count < 3) { count = count + 1; } print count;");
  assert.deepEqual(result.output, ["3"]);
});

test("compiler reports lexical, syntax, and semantic errors with locations", () => {
  assert.throws(() => compile("print @;"), (error) => error instanceof CompilerError && error.phase === "lexical" && error.location.line === 1);
  assert.throws(() => compile("print 1"), (error) => error instanceof CompilerError && error.phase === "syntax");
  assert.throws(() => compile("print missing;"), (error) => error instanceof CompilerError && error.phase === "semantic");
});

test("runtime catches division by zero without evaluating arbitrary source", () => {
  assert.throws(() => compile("print 10 / 0;"), (error) => error instanceof CompilerError && error.phase === "runtime" && error.message === "Division by zero.");
});