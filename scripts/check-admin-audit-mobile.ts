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
assert.match(source, /const PAGE_SIZE = 10/);
assert.match(source, /const \[visibleCount, setVisibleCount\] = useState\(PAGE_SIZE\)/);
assert.match(source, /filteredLogs\.slice\(0, visibleCount\)/);
assert.match(source, /setVisibleCount\(\(count\) => count \+ PAGE_SIZE\)/);
assert.match(source, />See more</);
assert.match(source, /absolute right-0 top-full/);
assert.match(source, /role=\{hasDetails \? "button" : undefined\}/);
assert.match(source, /onKeyDown=\{\(e\) =>/);
assert.match(source, /toggleLog\(log\.id, hasDetails\)/);

console.log("admin audit mobile check: all assertions passed");
