import fs from "fs";
import pathModule from "path";
import tsMorph from "ts-morph";
import {Rule, Scope} from "eslint";

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

export function createFixAction(dependencies: Set<any>, globalScope: Scope.Scope, context: Rule.RuleContext, options: any, fixed: any, undefinedIndentifier: any, identifier: any) {
    return (fixer: any) => {
        if (fixed[undefinedIndentifier]) {
            return
        }
        if (identifier.parent.type === 'AssignmentExpression') {
            return fixer.insertTextBefore(identifier, 'let ')
        }
        fixed[undefinedIndentifier] = true
        console.log('running auto-import');
        var filename = context.getFilename()
        var path = pathModule.dirname(filename)
        var lastPath
        var foundModule
        var isNotDefaultExport
        var parentPrefix = ''
        // go up the current directory tree
        var rootPath = pathModule.resolve(__dirname, '../../../..', options.rootPath)
        while (!foundModule && path.indexOf(rootPath) === 0) {
            foundModule = searchDirectory(path, undefinedIndentifier, lastPath)
            if (foundModule) {
                foundModule = (parentPrefix || './') + foundModule
            } else {
                lastPath = path
                path = pathModule.dirname(path)
                parentPrefix = parentPrefix + '../'
            }
        }
        if (!foundModule && options.packages) {
            // next search configured packages
            for (var packageName in options.packages) {
                var pckg = options.packages[packageName]
                var packageRef = pckg.as || (typeof pckg === 'string' ? pckg : packageName)
                if (packageRef === undefinedIndentifier) {
                    foundModule = packageName
                } else if (pckg.hasExports && require(pckg.hasExports[0] === '.' ?
                    pathModule.resolve(__dirname, '../../../..', pckg.hasExports) :
                    pckg.hasExports)[undefinedIndentifier]) {
                    isNotDefaultExport = true
                    foundModule = packageName
                } else if (pckg.modulesIn) {
                    foundModule = searchDirectory(pathModule.resolve(__dirname, '../../../..', pckg.modulesIn), undefinedIndentifier)
                    if (foundModule) {
                        foundModule = packageName + '/' + foundModule
                    }
                }
                if (foundModule) {
                    break
                }
            }
        }

        if (foundModule) {
            var i = 0
            var importDeclaration, node
            // @ts-ignore
            while ((node = globalScope.block.body[i++]).type === 'ImportDeclaration') {
                importDeclaration = node
                if (node.source.value === foundModule) {
                    if (isNotDefaultExport) {
                        // add to the named imports of an existing import declaration
                        return fixer.insertTextAfter(node.specifiers[node.specifiers.length - 1], ', ' + undefinedIndentifier)
                    } else {
                        console.log(foundModule, 'already imported')
                        return
                    }
                }
            }

            isNotDefaultExport = !isDefaultlyExported(pathModule.dirname(filename) + foundModule.replace('./', '/') + '.ts')

            var importStatement = (isNotDefaultExport ?
                'import { ' + undefinedIndentifier + ' }' :
                'import ' + undefinedIndentifier) + " from '" + foundModule + "'"

            if (importDeclaration) {
                return fixer.insertTextAfter(importDeclaration, '\n' + importStatement)
            }
            return fixer.insertTextAfterRange([0, 0], importStatement + (dependencies.size === 0 ? '\n\n' : ''))
        }
    }
}
