import { compile, CompilerError } from "./compiler.js";

const examples = {
  arithmetic: "// Multiplication happens before addition.\nlet answer = 2 + 3 * 4;\nprint answer;",
  branch: "let score = 8;\nif (score >= 5) {\n  print score;\n} else {\n  print 0;\n}",
  loop: "let count = 0;\nwhile (count < 4) {\n  count = count + 1;\n}\nprint count;",
  logic: "let ready = true;\nlet score = 9;\nif (ready && score >= 5) {\n  print score;\n}",
  lexical: "print 1;\nprint @;", syntax: "let answer = 2 + 3\nprint answer;",
  semantic: "print missing;", runtime: "print 10 / 0;",
};
const editor = document.querySelector("#source");
const numbers = document.querySelector("#line-numbers");
const select = document.querySelector("#example-select");
const storageKey = "educompiler-draft-v1";
const element = (tag, className = "", text = "") => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
};

function updateEditor() {
  const count = Math.max(1, editor.value.split("\n").length);
  numbers.textContent = Array.from({ length: count }, (_, index) => index + 1).join("\n");
  numbers.scrollTop = editor.scrollTop;
  document.querySelector("#line-count").textContent = `${count} ${count === 1 ? "line" : "lines"}`;
  try { localStorage.setItem(storageKey, editor.value); } catch { /* Storage is optional. */ }
}

function showView(name) {
  document.querySelectorAll(".tabs button").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === name);
    tab.setAttribute("aria-selected", String(tab.dataset.view === name));
  });
  document.querySelectorAll(".view").forEach((view) => { view.hidden = view.id !== `view-${name}`; });
}

function setPhases(errorPhase = null) {
  const names = ["lexical", "syntax", "semantic", "runtime"];
  const stopAt = names.indexOf(errorPhase);
  document.querySelectorAll("#phases li").forEach((phase) => {
    const index = names.indexOf(phase.dataset.phase);
    const done = errorPhase ? index < stopAt : true;
    phase.classList.toggle("done", done);
    phase.classList.toggle("error", phase.dataset.phase === errorPhase);
    phase.querySelector("i").textContent = phase.dataset.phase === errorPhase ? "!" : done ? "✓" : "·";
  });
  document.querySelector("#pipeline-status").textContent = errorPhase ? `${errorPhase.toUpperCase()} NEEDS ATTENTION` : "ALL PHASES COMPLETE";
}

function renderTable(headers, rows) {
  const table = element("table", "data-table");
  const head = element("thead");
  const headRow = element("tr");
  headers.forEach((label) => headRow.append(element("th", "", label)));
  head.append(headRow);
  const body = element("tbody");
  rows.forEach((values) => {
    const row = element("tr");
    values.forEach((value, index) => row.append(element("td", headers[0] === "TYPE" && index === 0 ? "token-type" : headers[0] === "TYPE" && index === 2 ? "token-line" : "", String(value))));
    body.append(row);
  });
  table.append(head, body);
  return table;
}

function render(result) {
  document.querySelector("#view-tokens").replaceChildren(renderTable(["TYPE", "VALUE", "LINE"], result.tokens.map(({ type, value, line }) => [type, value, line])));
  document.querySelector("#token-count").textContent = String(result.tokens.length);
  document.querySelector("#view-ast").replaceChildren(element("pre", "code-view", JSON.stringify(result.ast, null, 2)));
  document.querySelector("#view-symbols").replaceChildren(renderTable(["NAME", "TYPE", "VALUE"], result.symbols.map(({ name, type, value }) => [name, type, value ?? "—"])));
  document.querySelector("#view-tac").replaceChildren(element("pre", "code-view", result.tac.map((line, index) => `${String(index + 1).padStart(2, "0")}  ${line}`).join("\n") || "No instructions generated."));
  const steps = element("ol", "steps");
  result.trace.forEach((step) => steps.append(element("li", "", step)));
  if (!result.trace.length) steps.append(element("li", "", "Program completed without output."));
  document.querySelector("#view-steps").replaceChildren(steps);
}

function showOutput(title, status, message, isError = false) {
  document.querySelector("#output-title").textContent = title;
  const badge = document.querySelector("#run-status");
  badge.textContent = status;
  badge.className = isError ? "error" : status === "SUCCESS" ? "success" : "";
  const output = document.querySelector("#output");
  output.classList.toggle("error", isError);
  output.replaceChildren(element("b", "", isError ? "!" : "›"), element("span", "", message));
}

function runCompiler() {
  try {
    const result = compile(editor.value);
    render(result);
    setPhases();
    showOutput("Program completed", "SUCCESS", result.output.join("\n") || "Program finished with no printed output.");
    showView("tokens");
  } catch (error) {
    if (!(error instanceof CompilerError)) throw error;
    setPhases(error.phase);
    const location = error.location ? `Line ${error.location.line}, column ${error.location.column}: ` : "";
    showOutput(`${error.phase[0].toUpperCase()}${error.phase.slice(1)} error`, "ERROR", `${location}${error.message}`, true);
    const errorView = { lexical: "tokens", syntax: "ast", semantic: "symbols" }[error.phase];
    if (errorView) showView(errorView);
  }
}

editor.addEventListener("input", updateEditor);
editor.addEventListener("scroll", () => { numbers.scrollTop = editor.scrollTop; });
editor.addEventListener("keydown", (event) => {
  if (event.key === "Tab") { event.preventDefault(); editor.setRangeText("  ", editor.selectionStart, editor.selectionEnd, "end"); editor.dispatchEvent(new Event("input", { bubbles: true })); }
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); runCompiler(); }
});
select.addEventListener("change", () => { editor.value = examples[select.value]; updateEditor(); });
document.querySelector("#reset").addEventListener("click", () => { select.value = "arithmetic"; editor.value = examples.arithmetic; updateEditor(); editor.focus(); });
document.querySelector("#compile").addEventListener("click", runCompiler);
document.querySelectorAll(".tabs button").forEach((tab) => tab.addEventListener("click", () => showView(tab.dataset.view)));
try { editor.value = localStorage.getItem(storageKey) || examples.arithmetic; } catch { editor.value = examples.arithmetic; }
updateEditor();