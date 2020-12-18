import { Rule } from "eslint";
export declare function isDefaultlyExported(path: string): boolean;
export declare function isStaticRequire(node: any): any;
/**
 * Checks if the given node is the argument of a typeof operator.
 * @param {ASTNode} node The AST node being checked.
 * @returns {boolean} Whether or not the node is the argument of a typeof operator.
 */
export declare function hasTypeOfOperator(node: Rule.Node): boolean;
export declare function searchDirectory(path?: string, name?: string, except?: string): string | undefined;
