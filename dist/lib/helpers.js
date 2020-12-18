"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchDirectory = exports.hasTypeOfOperator = exports.isStaticRequire = exports.isDefaultlyExported = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ts_morph_1 = __importDefault(require("ts-morph"));
function getSourceFile(sourceCode) {
    const codeProject = new ts_morph_1.default.Project({ useInMemoryFileSystem: true });
    return codeProject.createSourceFile('main.tsx', sourceCode);
}
function isDefaultlyExported(path) {
    const sourceCode = fs_1.default.readFileSync(path, { encoding: 'utf8' });
    const sourceFile = getSourceFile(sourceCode);
    return sourceFile.getClasses().find(c => c.isDefaultExport()) !== undefined;
}
exports.isDefaultlyExported = isDefaultlyExported;
function isStaticRequire(node) {
    return node &&
        node.callee &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'Literal' &&
        typeof node.arguments[0].value === 'string';
}
exports.isStaticRequire = isStaticRequire;
/**
 * Checks if the given node is the argument of a typeof operator.
 * @param {ASTNode} node The AST node being checked.
 * @returns {boolean} Whether or not the node is the argument of a typeof operator.
 */
function hasTypeOfOperator(node) {
    var parent = node.parent;
    return parent.type === "UnaryExpression" && parent.operator === "typeof";
}
exports.hasTypeOfOperator = hasTypeOfOperator;
function searchDirectory(path = '', name = '', except = '') {
    var files = fs_1.default.readdirSync(path);
    var directories = [];
    for (var i = 0, l = files.length; i < l; i++) {
        var file = files[i];
        var basename = file.replace(/\..*/, '');
        if (basename) { // ignore .name directories
            var filePath = path_1.default.join(path, file);
            if (basename === name) {
                return basename;
            }
            if (file !== except) {
                var stats = fs_1.default.statSync(filePath);
                if (stats.isDirectory()) {
                    directories.push(file);
                }
            }
        }
    }
    for (var i = 0, l = directories.length; i < l; i++) {
        var directory = directories[i];
        var foundModule = searchDirectory(path_1.default.join(path, directory), name);
        if (foundModule) {
            return directory + '/' + foundModule;
        }
    }
}
exports.searchDirectory = searchDirectory;
