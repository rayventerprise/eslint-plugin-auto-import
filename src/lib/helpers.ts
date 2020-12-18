import fs from "fs";
import pathModule from "path";
import tsMorph from "ts-morph";
import {Rule} from "eslint";

function getSourceFile(sourceCode: string) {
    const codeProject = new tsMorph.Project({useInMemoryFileSystem: true});
    return codeProject.createSourceFile('main.tsx', sourceCode);
}

export function isDefaultlyExported(path: string) {
    const sourceCode = fs.readFileSync(path, {encoding: 'utf8'})
    const sourceFile = getSourceFile(sourceCode)

    return sourceFile.getClasses().find(c => c.isDefaultExport()) !== undefined
}

export function isStaticRequire(node: any) {
    return node &&
        node.callee &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length === 1 &&
        node.arguments[0].type === 'Literal' &&
        typeof node.arguments[0].value === 'string'
}

/**
 * Checks if the given node is the argument of a typeof operator.
 * @param {ASTNode} node The AST node being checked.
 * @returns {boolean} Whether or not the node is the argument of a typeof operator.
 */
export function hasTypeOfOperator(node: Rule.Node) {
    var parent = node.parent;

    return parent.type === "UnaryExpression" && parent.operator === "typeof";
}

export function searchDirectory(path = '', name = '', except = ''): string | undefined {
    var files = fs.readdirSync(path)
    var directories = []
    for (var i = 0, l = files.length; i < l; i++) {
        var file = files[i]
        var basename = file.replace(/\..*/, '')
        if (basename) { // ignore .name directories
            var filePath = pathModule.join(path, file)
            if (basename === name) {
                return basename
            }
            if (file !== except) {
                var stats = fs.statSync(filePath)
                if (stats.isDirectory()) {
                    directories.push(file)
                }
            }
        }
    }

    for (var i = 0, l = directories.length; i < l; i++) {
        var directory = directories[i]
        var foundModule = searchDirectory(pathModule.join(path, directory), name)
        if (foundModule) {
            return directory + '/' + foundModule
        }
    }
}
