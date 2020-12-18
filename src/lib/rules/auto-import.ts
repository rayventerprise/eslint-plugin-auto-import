import pathModule from "path";
import {hasTypeOfOperator, isDefaultlyExported, isStaticRequire, searchDirectory} from "../helpers";
import {Rule, Scope} from "eslint";

const AutoImportRule: Rule.RuleModule = {
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

    create: function(context) {
        var options = context.options[0];
        var considerTypeOf = options && options.typeof === true || false;
      const dependencies = new Set() // keep track of dependencies
      let lastNode // keep track of the last node to report on


        return {
          ImportDeclaration(node) {
            dependencies.add(node.source.value)
            lastNode = node.source
          },

          MemberExpression: function (node) {

          },

          CallExpression(node) {
            if (isStaticRequire(node)) {
              const [ requirePath ] = node.arguments as any
              dependencies.add(requirePath.value)
              lastNode = node
            }
          },
            "Program:exit": function(/* node */) {
                var globalScope = context.getScope()
                var options = context.options[0]
                var fixed: any = {}

                globalScope.through.forEach(function(ref) {
                    var identifier = ref.identifier as any

                    if (!considerTypeOf && hasTypeOfOperator(identifier)) {
                        return;
                    }
                    var undefinedIndentifier = identifier.name
                    context.report({
                        node: identifier,
                        message: '{{name}} is not defined.',
                        data: identifier as any,
                        fix: createFixAction(dependencies, globalScope, context, options, fixed, undefinedIndentifier, identifier)
                    });
                });
            }
        };
    }
};

function createFixAction(dependencies: Set<any>, globalScope: Scope.Scope, context: Rule.RuleContext, options: any, fixed: any, undefinedIndentifier: any, identifier: any) {
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

export default AutoImportRule
