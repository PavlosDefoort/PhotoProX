// Path alias registration for the test runner.
// Maps @/* to .test-dist/src/* so compiled tests can resolve @/ imports.
const { register } = require("tsconfig-paths");
register({
  baseUrl: require("path").resolve(__dirname, ".."),
  paths: { "@/*": [".test-dist/src/*"] },
});
