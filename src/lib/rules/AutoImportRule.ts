import {createFixAction, hasTypeOfOperator, isStaticRequire} from "../helpers";
import {Rule} from "eslint";

const AutoImportRule: Rule.RuleModule = {
    meta: {
        docs: {
            description: "Auto import",
            category: "Variables",
            recommended: true
        },

        fixable: "code",

        schema: [
            {
                type: "object",
                properties: {
                    typeof: {
                        type: "boolean"
                    }
                },
                additionalProperties: true
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

export default AutoImportRule
