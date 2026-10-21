import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compile, CompilerError } from "../compiler.js";

const dataset = JSON.parse(await readFile(new URL("../data/educompiler-dataset.json", import.meta.url), "utf8"));

test("dataset has unique identifiers and covers valid and invalid programs", () => {
  const identifiers = dataset.map(({ id }) => id);
  assert.equal(new Set(identifiers).size, identifiers.length);
  assert.ok(dataset.some(({ expected }) => expected.status === "success"));
  assert.ok(dataset.some(({ expected }) => expected.status === "error"));
});

for (const sample of dataset) {
  test(`dataset: ${sample.id}`, () => {
    if (sample.expected.status === "success") {
      assert.deepEqual(compile(sample.source).output, sample.expected.output);
      return;
    }
    assert.throws(() => compile(sample.source), (error) => error instanceof CompilerError && error.phase === sample.expected.phase);
  });
}