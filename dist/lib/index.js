"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auto_import_1 = __importDefault(require("./rules/auto-import"));
module.exports = {
    rules: {
        'auto-import': auto_import_1.default.create,
    }
};
