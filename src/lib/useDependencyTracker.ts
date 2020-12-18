import {isStaticRequire} from "./helpers";
import {Rule} from "eslint";

export default function useDependencyTracker() {
    const dependencies = new Set() // keep track of dependencies
    let lastNode // keep track of the last node to report on

    const trackDependencies = {
        ImportDeclaration(node: any) {
            dependencies.add(node.source.value)
            lastNode = node.source
        },

        CallExpression(node: any) {
            if (isStaticRequire(node)) {
                const [requirePath] = node.arguments as any
                dependencies.add(requirePath.value)
                lastNode = node
            }
        }
    }

    return {
        trackDependencies,
        dependencies
    }
}
