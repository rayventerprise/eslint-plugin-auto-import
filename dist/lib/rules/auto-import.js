"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const helpers_1 = require("../helpers");
const AutoImportRule = {
    meta: {
        docs: {
            description: "Auto import",
            category: "Variables",
            recommended: true
        },
        schema: [
            {
                type: "object",
                properties: {
                    typeof: {
                        type: "boolean"
                    }
                },
                additionalProperties: false
            }
        ]
    },
    create: function (context) {
        var options = context.options[0];
        var considerTypeOf = options && options.typeof === true || false;
        const dependencies = new Set(); // keep track of dependencies
        let lastNode; // keep track of the last node to report on
        return {
            ImportDeclaration(node) {
                dependencies.add(node.source.value);
                lastNode = node.source;
            },
            MemberExpression: function (node) {
            },
            CallExpression(node) {
                if (helpers_1.isStaticRequire(node)) {
                    const [requirePath] = node.arguments;
                    dependencies.add(requirePath.value);
                    lastNode = node;
                }
            },
            "Program:exit": function ( /* node */) {
                var globalScope = context.getScope();
                var options = context.options[0];
                var fixed = {};
                globalScope.through.forEach(function (ref) {
                    var identifier = ref.identifier;
                    if (!considerTypeOf && helpers_1.hasTypeOfOperator(identifier)) {
                        return;
                    }
                    var undefinedIndentifier = identifier.name;
                    context.report({
                        node: identifier,
                        message: '{{name}} is not defined.',
                        data: identifier,
                        fix: createFixAction(dependencies, globalScope, context, options, fixed, undefinedIndentifier, identifier)
                    });
                });
            }
        };
    }
};
function createFixAction(dependencies, globalScope, context, options, fixed, undefinedIndentifier, identifier) {
    return (fixer) => {
        if (fixed[undefinedIndentifier]) {
            return;
        }
        if (identifier.parent.type === 'AssignmentExpression') {
            return fixer.insertTextBefore(identifier, 'let ');
        }
        fixed[undefinedIndentifier] = true;
        console.log('running auto-import');
        var filename = context.getFilename();
        var path = path_1.default.dirname(filename);
        var lastPath;
        var foundModule;
        var isNotDefaultExport;
        var parentPrefix = '';
        // go up the current directory tree
        var rootPath = path_1.default.resolve(__dirname, '../../../..', options.rootPath);
        while (!foundModule && path.indexOf(rootPath) === 0) {
            foundModule = helpers_1.searchDirectory(path, undefinedIndentifier, lastPath);
            if (foundModule) {
                foundModule = (parentPrefix || './') + foundModule;
            }
            else {
                lastPath = path;
                path = path_1.default.dirname(path);
                parentPrefix = parentPrefix + '../';
            }
        }
        if (!foundModule && options.packages) {
            // next search configured packages
            for (var packageName in options.packages) {
                var pckg = options.packages[packageName];
                var packageRef = pckg.as || (typeof pckg === 'string' ? pckg : packageName);
                if (packageRef === undefinedIndentifier) {
                    foundModule = packageName;
                }
                else if (pckg.hasExports && require(pckg.hasExports[0] === '.' ?
                    path_1.default.resolve(__dirname, '../../../..', pckg.hasExports) :
                    pckg.hasExports)[undefinedIndentifier]) {
                    isNotDefaultExport = true;
                    foundModule = packageName;
                }
                else if (pckg.modulesIn) {
                    foundModule = helpers_1.searchDirectory(path_1.default.resolve(__dirname, '../../../..', pckg.modulesIn), undefinedIndentifier);
                    if (foundModule) {
                        foundModule = packageName + '/' + foundModule;
                    }
                }
                if (foundModule) {
                    break;
                }
            }
        }
        if (foundModule) {
            var i = 0;
            var importDeclaration, node;
            // @ts-ignore
            while ((node = globalScope.block.body[i++]).type === 'ImportDeclaration') {
                importDeclaration = node;
                if (node.source.value === foundModule) {
                    if (isNotDefaultExport) {
                        // add to the named imports of an existing import declaration
                        return fixer.insertTextAfter(node.specifiers[node.specifiers.length - 1], ', ' + undefinedIndentifier);
                    }
                    else {
                        console.log(foundModule, 'already imported');
                        return;
                    }
                }
            }
            isNotDefaultExport = !helpers_1.isDefaultlyExported(path_1.default.dirname(filename) + foundModule.replace('./', '/') + '.ts');
            var importStatement = (isNotDefaultExport ?
                'import { ' + undefinedIndentifier + ' }' :
                'import ' + undefinedIndentifier) + " from '" + foundModule + "'";
            if (importDeclaration) {
                return fixer.insertTextAfter(importDeclaration, '\n' + importStatement);
            }
            return fixer.insertTextAfterRange([0, 0], importStatement + (dependencies.size === 0 ? '\n\n' : ''));
        }
    };
}
exports.default = AutoImportRule;
