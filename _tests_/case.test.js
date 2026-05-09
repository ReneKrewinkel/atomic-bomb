import test from "node:test";
import assert from "node:assert/strict";
import {
  convertNameForType,
  convertToCamelCase,
  convertToPascalCase,
} from "../src/case.js";

test("convertToPascalCase converts words to PascalCase", () => {
  assert.equal(convertToPascalCase("atomic bomb"), "AtomicBomb");
  assert.equal(convertToPascalCase("label"), "Label");
  assert.equal(convertToPascalCase("react native button"), "ReactNativeButton");
});

test("convertToPascalCase preserves already PascalCase names", () => {
  assert.equal(convertToPascalCase("DataTable"), "DataTable");
  assert.equal(convertToPascalCase("HTTPClient"), "HTTPClient");
});

test("convertToCamelCase preserves already camelCase names", () => {
  assert.equal(convertToCamelCase("useData"), "useData");
  assert.equal(convertToCamelCase("formatDate"), "formatDate");
});

test("convertNameForType uses camelCase for non-component files", () => {
  assert.equal(
    convertNameForType({ type: "hook", value: "useData" }),
    "useData",
  );
  assert.equal(
    convertNameForType({ type: "lib", value: "format date" }),
    "formatDate",
  );
  assert.equal(
    convertNameForType({ type: "event", value: "order created" }),
    "orderCreated",
  );
  assert.equal(
    convertNameForType({ type: "model", value: "order summary" }),
    "orderSummary",
  );
});

test("convertNameForType uses PascalCase for component and domain containers", () => {
  assert.equal(
    convertNameForType({ type: "atom", value: "DataTable" }),
    "DataTable",
  );
  assert.equal(
    convertNameForType({ type: "domain", value: "sales orders" }),
    "SalesOrders",
  );
  assert.equal(
    convertNameForType({ type: "subdomain", value: "order intake" }),
    "OrderIntake",
  );
});
