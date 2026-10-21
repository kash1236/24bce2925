# EduCompiler

EduCompiler is a small educational compiler workbench for exploring how a program moves through a compiler pipeline. Write a program in the EduCompiler language, compile it, and inspect its tokens, syntax, semantics, and runtime behavior.

## Project synopsis

EduCompiler is a teaching-focused project that demonstrates how a simple compiler or interpreter works in practice. The system accepts a miniature programming language with statements such as `let`, assignment, `print`, `if`/`else`, and `while`, and it supports arithmetic, comparisons, and boolean logic. The main purpose of the project is to help learners understand the stages of compilation and execution: lexical analysis, syntax checking, semantic validation, and runtime evaluation.

The project combines a browser-based interface with a custom language implementation. Users can write source code, compile it, and observe how valid programs run or how invalid code triggers specific compiler errors. The project also includes a labeled dataset of programs and failure cases, which makes it useful for testing and educational analysis.

The repository is structured to support both demonstration and assessment. It includes the compiler/interpreter logic, the web interface, the dataset, and automated tests that verify expected outcomes. This makes the project suitable for learning compiler concepts, exploring language design, and evaluating how different kinds of errors are handled.

## Run locally

The workbench uses browser JavaScript modules, so serve the project directory over HTTP. For example:

```sh
npx serve .
```

Open the local URL printed by the server. Node.js 18 or newer is recommended.

## Language

Supported statements are `let` declarations, variable assignments, `print`, `if`/`else`, and `while`. Expressions support numbers, booleans, arithmetic, comparisons, and boolean operators. Statements end with a semicolon unless they are blocks.

Example:

```text
let count = 0;
while (count < 3) {
  count = count + 1;
}
print count;
```

Use **Tab** to indent and **Ctrl+Enter** (or **Cmd+Enter**) to compile. Source drafts are saved in the current browser.

## Test

```sh
npm test
```

## Project materials

- Source code: this repository.
- Dataset: [`data/educompiler-dataset.json`](data/educompiler-dataset.json), a labeled set of valid programs and compiler-error examples. `npm test` checks each entry against its expected behavior.
- Assessment 10 report: add the finalized report when it is available.

The compiler runs the supported language in its own small interpreter; it does not execute Python or arbitrary JavaScript source.
