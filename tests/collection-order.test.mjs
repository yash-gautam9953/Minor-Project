import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = await readFile(
  new URL("../services/collection-order.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpile(source, {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2020,
});
const collectionOrderModule = { exports: {} };
runInNewContext(javascript, {
  exports: collectionOrderModule.exports,
  module: collectionOrderModule,
});
const { sortNewestFirst } = collectionOrderModule.exports;

test("documents are sorted newest-first without mutating the source array", () => {
  const documents = [
    { $id: "oldest", $createdAt: "2026-11-24T10:00:00.000Z" },
    { $id: "newest", $createdAt: "2026-11-26T10:00:00.000Z" },
    { $id: "middle", $createdAt: "2026-11-25T10:00:00.000Z" },
  ];

  assert.deepEqual(
    [...sortNewestFirst(documents)].map((document) => document.$id),
    ["newest", "middle", "oldest"],
  );
  assert.deepEqual(
    documents.map((document) => document.$id),
    ["oldest", "newest", "middle"],
  );
});
