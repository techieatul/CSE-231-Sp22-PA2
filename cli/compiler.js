"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.codeGenStmt = exports.codeGenLit = exports.compile = exports.codeGenExpr = exports.BinopStmts = exports.run = void 0;
var wabt_1 = __importDefault(require("wabt"));
var ast_1 = require("./ast");
var parser_1 = require("./parser");
var tc_1 = require("./tc");
var loop_count = 0;
function variableNames(stmts) {
    var vars = [];
    stmts.forEach(function (stmt) {
        //if(stmt.tag === "assign" || stmt.tag==="varInit") { vars.push(stmt.name); }
        if (stmt.tag === "varInit") {
            vars.push(stmt.name);
        }
    });
    return vars;
}
function funs(stmts) {
    return stmts.filter(function (stmt) { return stmt.tag === "FuncDef"; });
}
function nonFuns(stmts) {
    return stmts.filter(function (stmt) { return stmt.tag !== "FuncDef"; });
}
function varsFunsStmts(stmts) {
    return [variableNames(stmts), funs(stmts), nonFuns(stmts)];
}
function run(watSource, config) {
    return __awaiter(this, void 0, void 0, function () {
        var wabtApi, parsed, binary, wasmModule;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, wabt_1["default"]()];
                case 1:
                    wabtApi = _a.sent();
                    parsed = wabtApi.parseWat("example", watSource);
                    binary = parsed.toBinary({});
                    return [4 /*yield*/, WebAssembly.instantiate(binary.buffer, config)];
                case 2:
                    wasmModule = _a.sent();
                    return [2 /*return*/, wasmModule.instance.exports._start()];
            }
        });
    });
}
exports.run = run;
function BinopStmts(op) {
    switch (op) {
        case "+": return ["i32.add"];
        case "-": return ["i32.sub"];
        case ">": return ["i32.gt_s"];
        case ">=": return ["i32.ge_s"];
        case "<": return ["i32.lt_s"];
        case "<=": return ["i32.le_s"];
        case "*": return ["i32.mul"];
        case "//": return ["i32.div_s"];
        case "%": return ["i32.rem_s"];
        case "==": return ["i32.eq"];
        case "!=": return ["i32.ne"];
        default:
            throw new Error("Unhandled or unknown op: " + op);
    }
}
exports.BinopStmts = BinopStmts;
// To handle unary Op
function codeGenExpr(expr, locals) {
    switch (expr.tag) {
        case "literal":
            switch (expr.literal.tag) {
                case "num": return ["(i32.const " + expr.literal.value + ")"];
                case "bool":
                    switch (expr.literal.value) {
                        case true: return ["(i32.const 1)"];
                        case false: return ["(i32.const 0)"];
                    }
            }
            break;
        case "paran":
            var innerExpr = codeGenExpr(expr.inner, locals);
            return __spreadArrays(innerExpr);
        case "UniOperator":
            var myUniExpr = codeGenExpr(expr.right, locals);
            if (expr.opr === ast_1.UniOp.Minus) {
                return __spreadArrays(["(i32.const 0)"], myUniExpr, ["(i32.sub)"]);
            }
            else {
                return __spreadArrays(["(i32.const 1)"], myUniExpr, ["(i32.xor)"]);
            }
        case "id":
            // Since we type-checked for making sure all variable exist, here we
            // just check if it's a local variable and assume it is global if not
            if (locals.has(expr.name)) {
                return ["(local.get $" + expr.name + ")"];
            }
            else {
                return ["(global.get $" + expr.name + ")"];
            }
        case "binOperator": {
            var lhsExprs = codeGenExpr(expr.left_opr, locals);
            var rhsExprs = codeGenExpr(expr.right_opr, locals);
            var opstmts = BinopStmts(expr.opr);
            return __spreadArrays(lhsExprs, rhsExprs, opstmts);
        }
        case "funcall":
            var valStmts = expr.args.map(function (e) { return codeGenExpr(e, locals); }).flat();
            var toCall = expr.name;
            if (expr.name === "print") {
                switch (expr.args[0].a) {
                    case "bool":
                        toCall = "print_bool";
                        break;
                    case "int":
                        toCall = "print_num";
                        break;
                    case "none":
                        toCall = "print_none";
                        break;
                }
            }
            valStmts.push("(call $" + toCall + ")");
            return valStmts;
    }
}
exports.codeGenExpr = codeGenExpr;
function compile(source) {
    var ast = parser_1.parseProgram(source);
    ast = tc_1.tcProgram(ast);
    var emptyEnv = new Map();
    var _a = varsFunsStmts(ast), vars = _a[0], funs = _a[1], stmts = _a[2];
    var funsCode = funs.map(function (f) { return codeGenStmt(f, emptyEnv); }).map(function (f) { return f.join("\n"); });
    var allFuns = funsCode.join("\n\n");
    var varDecls = vars.map(function (v) { return "(global $" + v + " (mut i32) (i32.const 0))"; }).join("\n");
    var allStmts = stmts.map(function (s) { return codeGenStmt(s, emptyEnv); }).flat();
    var main = __spreadArrays(["(local $scratch i32)"], allStmts).join("\n");
    var lastStmt = ast[ast.length - 1];
    var isExpr = lastStmt.tag === "expr";
    var retType = "";
    var retVal = "";
    if (isExpr) {
        retType = "(result i32)";
        retVal = "(local.get $scratch)";
    }
    return "\n    (module\n      (func $print_num (import \"imports\" \"print_num\") (param i32) (result i32))\n      (func $print_bool (import \"imports\" \"print_bool\") (param i32) (result i32))\n      (func $print_none (import \"imports\" \"print_none\") (param i32) (result i32))\n      " + varDecls + "\n      " + allFuns + "\n      (func (export \"_start\") " + retType + "\n        " + main + "\n        " + retVal + "\n      )\n    ) \n  ";
}
exports.compile = compile;
function codeGenLit(l) {
    switch (l.tag) {
        case "num":
            return ["(i32.const " + l.value + ")"];
        case "bool":
            if (l.value) {
                return ["(i32.const 1)"];
            }
            if (!l.value) {
                return ["(i32.const 0)"];
            }
    }
}
exports.codeGenLit = codeGenLit;
function codeGenStmt(stmt, locals) {
    switch (stmt.tag) {
        case "FuncDef":
            var withParamsAndVariables_1 = new Map(locals.entries());
            // Construct the environment for the function body
            var variables = variableNames(stmt.body);
            variables.forEach(function (v) { return withParamsAndVariables_1.set(v, true); });
            stmt.params.forEach(function (p) { return withParamsAndVariables_1.set(p.name, true); });
            // Construct the code for params and variable declarations in the body
            var params = stmt.params.map(function (p) { return "(param $" + p.name + " i32)"; }).join(" ");
            var varDecls = variables.map(function (v) { return "(local $" + v + " i32)"; }).join("\n");
            var stmts = stmt.body.map(function (s) { return codeGenStmt(s, withParamsAndVariables_1); }).flat();
            var stmtsBody = stmts.join("\n");
            return ["(func $" + stmt.name + " " + params + " (result i32)\n        (local $scratch i32)\n        " + varDecls + "\n        " + stmtsBody + "\n        (i32.const 0))"];
        case "return":
            if (typeof stmt["return"] != 'undefined') {
                var valStmts = codeGenExpr(stmt["return"], locals);
                valStmts.push("return");
                return valStmts;
            }
            break;
        case "assign":
            var valStmts = codeGenExpr(stmt.value, locals);
            if (locals.has(stmt.name)) {
                valStmts.push("(local.set $" + stmt.name + ")");
            }
            else {
                valStmts.push("(global.set $" + stmt.name + ")");
            }
            return valStmts;
        case "varInit":
            var myLit = codeGenLit(stmt.value.value);
            if (locals.has(stmt.name)) {
                myLit.push("(local.set $" + stmt.name + ")");
            }
            else {
                myLit.push("(global.set $" + stmt.name + ")");
            }
            return myLit;
        case "expr":
            var result = codeGenExpr(stmt.expr, locals);
            result.push("(local.set $scratch)");
            return result;
        case "pass":
            break;
        case "while":
            var whileCond = codeGenExpr(stmt.cond, locals).flat().join("\n");
            var whileBody = stmt.body.flatMap(function (b) {
                return codeGenStmt(b, locals);
            }).join('\n');
            var whileCode = ["(loop $loop_" + loop_count + " " + whileBody + " " + whileCond + " br_if $loop_" + loop_count + ")"];
            loop_count++;
            return whileCode;
        case "if":
            var ifCond = codeGenExpr(stmt.cond, locals).flat().join('\n');
            var ifBody = stmt.ifbody.flatMap(function (b) {
                return codeGenStmt(b, locals);
            }).join('\n');
            if (typeof stmt.elif != 'undefined') {
                var elif = stmt.elif.pop();
                var elifCond = elif.cond;
                var elifbody = elif.body;
                if (stmt.elif.length == 0) {
                    stmt.elif = undefined; // doing this is important as after popping from array, we should
                    // not enter the elif loop again
                }
                // using recursion idea here. The elif body and cond become the if's new body and cond, so that 
                // we have if() else(if() else()....) like this
                return [ifCond + "\n        (if\n          ( then\n            " + ifBody + "\n          )\n          (else\n            " + codeGenStmt(__assign(__assign({}, stmt), { ifbody: elifbody, cond: elifCond }), locals) + "\n          )\n\n        )\n        \n        "];
            }
            else if (typeof stmt["else"] !== 'undefined') {
                var elseBody = stmt["else"].body.flatMap(function (b) {
                    return codeGenStmt(b, locals);
                }).join('\n');
                return [ifCond + "\n                (if\n                  (then\n                    " + ifBody + "\n\n                  )\n                  (else\n                    " + elseBody + "\n\n                  )\n                \n\n                )\n        \n              "];
            }
            else {
                return [ifCond + "\n               (if\n                (then\n                  " + ifBody + "\n                )\n               )\n               "];
            }
    }
}
exports.codeGenStmt = codeGenStmt;
// function codeGen(stmt: Stmt<null>) : Array<string> {
//   switch(stmt.tag) {
//     case "assign":
//       var valStmts = codeGenExpr(stmt.value);
//       return valStmts.concat([`(local.set $${stmt.name})`]);
//     case "expr":
//       var exprStmts = codeGenExpr(stmt.expr);
//       return exprStmts.concat([`(local.set $$last)`]);
//     default:
//       throw new Error("ReferenceError: tag not defined");
//   }
// }
