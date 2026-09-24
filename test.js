const assert = require("node:assert/strict");
const fs = require("node:fs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

const index = read("index.html");
const signup = read("signup.html");
const dashboard = read("dashboard.html");
const script = read("script.js");

assert.match(index, /<script type="module" src="script\.js"><\/script>/);
assert.match(signup, /<script type="module" src="signup\.js"><\/script>/);
assert.match(signup, /id="username"/);
assert.match(dashboard, /id="publish-btn"/);
assert.match(dashboard, /id="posts"/);
assert.match(script, /if \(isDashboard\) window\.location\.href = "index\.html"/);
assert.match(script, /title\.textContent/);
assert.doesNotMatch(script, /div\.innerHTML/);

console.log("Blog-App smoke tests passed.");
