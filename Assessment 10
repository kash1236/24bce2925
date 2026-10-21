# EduCompiler

EduCompiler is a small educational compiler workbench for exploring how a program moves through a compiler pipeline. Write a program in the EduCompiler language, compile it, and inspect its tokens, abstract syntax tree, symbol table, three-address code, and execution steps.

## Run locally

The workbench uses browser JavaScript modules, so serve the project directory over HTTP. For example:

```sh
npx serve .
```

Open the local URL printed by the server. Node.js 18 or newer is recommended.

## Language

Supported statements are `let` declarations, variable assignments, `print`, `if`/`else`, and `while`. Expressions support numbers, booleans, arithmetic, comparisons, and boolean operators. Statements end with semicolons; blocks use braces; `//` begins a comment.

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
