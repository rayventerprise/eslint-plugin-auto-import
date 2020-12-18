/**
 * @fileoverview Automatically update import or require statements
 * @author Kris Zyp
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var rule = require("../../../lib/rules/AutoImportRule"),

    RuleTester = require("eslint").RuleTester;


//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

var ruleTester = new RuleTester();
ruleTester.run("auto-import", AutoImportRule, {

    valid: [

        // give me some code that won't trigger a warning
    ],

    invalid: [
        {
            code: "ClassWithoutImport",
            errors: [{
                message: "ClassWithoutImport is not defined."
            }]
        }
    ]
});
