import assert from "node:assert";
import { readFileSync } from "node:fs";

const source = readFileSync("components/admin/DepartmentAuditTab.tsx", "utf8");

assert.match(source, /const \[filtersOpen, setFiltersOpen\] = useState\(false\)/);
assert.match(source, /aria-label="Filter audit logs"/);
assert.match(source, /aria-expanded=\{filtersOpen\}/);
assert.match(source, /id="audit-mobile-filters"/);
assert.match(source, /Audit activity/);
assert.match(source, /hidden md:flex/);
assert.match(source, /md:hidden/);

console.log("admin audit mobile check: all assertions passed");
