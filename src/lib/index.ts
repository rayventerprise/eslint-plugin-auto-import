import autoImportRule from "./rules/auto-import";

module.exports = {
  rules: {
    'auto-import-ts': autoImportRule.create,
  }
}
