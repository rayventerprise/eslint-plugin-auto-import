import {createFixAction, hasTypeOfOperator, isStaticRequire} from "../helpers";
import {Rule} from "eslint";
import useDependencyTracker from "../useDependencyTracker";

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

    create: function (context) {
        const options = context.options[0];
        const considerTypeOf = options && options.typeof === true || false;

        const {dependencies, trackDependencies} = useDependencyTracker()

        return {
            ...trackDependencies,
            "Program:exit": function (/* node */) {
                const globalScope = context.getScope();
                const options = context.options[0];
                const fixed: any = {};

                globalScope.through.forEach(function (ref) {
                    const identifier = ref.identifier as any;

                    if (!considerTypeOf && hasTypeOfOperator(identifier)) {
                        return;
                    }

                    const missingIdentifier = identifier.name;

                    context.report({
                        node: identifier,
                        message: '{{name}} is not defined.',
                        data: identifier as any,
                        fix: createFixAction(dependencies, globalScope, context, options, fixed, missingIdentifier, identifier)
                    });
                });
            }
        };
    }
};

export default AutoImportRule
