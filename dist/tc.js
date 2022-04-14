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
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOpBoth = exports.checkOpInt = exports.tcLiteral = exports.tcExpr = exports.tcStmt = exports.tcVarInit = exports.tcElse = exports.tcElif = exports.tcProgram = void 0;
var ast_1 = require("./ast");
function tcProgram(p) {
    //const functions = new Map<string, [VarType[], VarType]>();
    //const globals = new Map<string, VarType>();
    var EnvMaps = {};
    EnvMaps.vars = new Map();
    EnvMaps.func = new Map();
    EnvMaps.ret = ast_1.VarType.none;
    p.forEach(function (s) {
        if (s.tag === "FuncDef") {
            EnvMaps.func.set(s.name, [s.params.map(function (p) { return p.type; }), s.ret]);
        }
    });
    return p.map(function (s) {
        var insideFunc = false;
        if (s.tag == "FuncDef") {
            insideFunc = true;
        }
        var res = tcStmt(s, EnvMaps, ast_1.VarType.none, insideFunc);
        return res;
    });
    // return p.map(s => {
    //   if(s.tag === "assign") {
    //     const rhs = tcExpr(s.value,EnvMaps);
    //     EnvMaps.vars.set(s.name, rhs.a);
    //     return { ...s, value: rhs };
    //   }
    //   else {
    //     const res = tcStmt(s, EnvMaps,VarType.none);
    //     return res;
    //   }
    // });
}
exports.tcProgram = tcProgram;
function tcElif(s, localEnv, currentReturn, insideFunc) {
    var myElifCond = tcExpr(s.cond, localEnv, insideFunc);
    if (myElifCond.a !== ast_1.VarType.bool) {
        throw new Error("Condition expression cannot be of type " + myElifCond.a);
    }
    var myElifBody = [];
    s.body.forEach(function (b) {
        myElifBody.push(tcStmt(b, localEnv, currentReturn, insideFunc));
    });
    return __assign(__assign({}, s), { cond: myElifCond, body: myElifBody });
}
exports.tcElif = tcElif;
function tcElse(s, localEnv, currentReturn, insideFunc) {
    var myElseBody = [];
    s.body.forEach(function (b) {
        myElseBody.push(tcStmt(b, localEnv, currentReturn, insideFunc));
    });
    return __assign(__assign({}, s), { body: myElseBody });
}
exports.tcElse = tcElse;
function tcVarInit(s) {
    var myLit = tcLiteral(s.value);
    if (s.type != myLit.a) {
        throw new Error("Expected " + s.type + "; but got " + myLit.a);
    }
    return __assign(__assign({}, s), { a: myLit.a, value: myLit });
}
exports.tcVarInit = tcVarInit;
function tcStmt(s, localEnv, currentReturn, insideFunc) {
    switch (s.tag) {
        case "varInit": {
            var myVar = tcVarInit(s.value);
            console.log(localEnv.vars);
            localEnv.vars.set(s.name, myVar.type);
            return __assign(__assign({}, s), { a: myVar.a, value: myVar });
        }
        case "FuncDef": {
            var FuncEnvMaps = {};
            var bodyvars = new Map(localEnv.vars.entries());
            var funcvars = new Map(localEnv.func.entries());
            s.params.forEach(function (p) { bodyvars.set(p.name, p.type); });
            FuncEnvMaps.vars = bodyvars;
            FuncEnvMaps.func = funcvars;
            var newStmts = s.body.map(function (bs) { return tcStmt(bs, FuncEnvMaps, s.ret, true); });
            // Go through the statements and check if we have return statement
            return __assign(__assign({}, s), { body: newStmts });
        }
        case "assign": {
            //console.log("Here")
            var rhs = tcExpr(s.value, localEnv, insideFunc);
            //console.log(localEnv.vars.has(s.name))
            if (!localEnv.vars.has(s.name)) {
                throw new Error("Not a variable " + s.name);
            }
            if (localEnv.vars.get(s.name) !== rhs.a) {
                throw new Error("Expected `" + localEnv.vars.get(s.name) + "`; but got " + rhs.a);
            }
            else {
                localEnv.vars.set(s.name, rhs.a);
            }
            return __assign(__assign({}, s), { value: rhs, a: rhs.a });
        }
        case "if": {
            var myIfCond = tcExpr(s.cond, localEnv, insideFunc);
            if (myIfCond.a !== ast_1.VarType.bool) {
                throw new Error("Condition expression cannot be of type " + myIfCond.a);
            }
            var myIfBody = [];
            s.ifbody.forEach(function (b) {
                myIfBody.push(tcStmt(b, localEnv, currentReturn, insideFunc));
            });
            var elifSeen = false;
            var elseSeen = false;
            var myElifArr = [];
            if (typeof s.elif !== 'undefined') {
                elifSeen = true;
                s.elif.forEach(function (e) {
                    myElifArr.push(tcElif(e, localEnv, currentReturn, insideFunc));
                });
            }
            var myElse = {};
            if (typeof s.else !== 'undefined') {
                elseSeen = true;
                myElse = tcElse(s.else, localEnv, currentReturn, insideFunc);
            }
            if (elifSeen && elseSeen) {
                return __assign(__assign({}, s), { cond: myIfCond, ifbody: myIfBody, elif: myElifArr, else: myElse });
            }
            if (elseSeen) {
                return __assign(__assign({}, s), { cond: myIfCond, ifbody: myIfBody, else: myElse });
            }
            return __assign(__assign({}, s), { cond: myIfCond, ifbody: myIfBody });
            break;
        }
        case "while": {
            var myWhileBody = [];
            s.body.forEach(function (b) {
                myWhileBody.push(tcStmt(b, localEnv, currentReturn, insideFunc));
            });
            var myWhileCond = tcExpr(s.cond, localEnv, insideFunc);
            if (myWhileCond.a !== ast_1.VarType.bool) {
                throw new Error("Condition expression be " + myWhileCond.a);
            }
            return __assign(__assign({}, s), { cond: myWhileCond, body: myWhileBody });
        }
        case "expr": {
            var ret = tcExpr(s.expr, localEnv, insideFunc);
            return __assign(__assign({}, s), { expr: ret, a: ret.a });
        }
        case "pass": {
            return __assign(__assign({}, s), { a: ast_1.VarType.none });
        }
        case "return": {
            if (!insideFunc) {
                throw new Error("Return statement cannot appear at top level");
            }
            if (typeof s.return != 'undefined') {
                var valTyp = tcExpr(s.return, localEnv, insideFunc);
                if (valTyp.a !== currentReturn) {
                    throw new Error(valTyp.a + " returned but " + currentReturn + " expected.");
                }
                return __assign(__assign({}, s), { return: valTyp, a: valTyp.a });
            }
            if (currentReturn != ast_1.VarType.none) {
                throw new Error("Expected " + currentReturn + "; but got None");
            }
            return __assign(__assign({}, s), { a: ast_1.VarType.none });
        }
    }
}
exports.tcStmt = tcStmt;
function tcExpr(expr, localenv, insideFunc) {
    switch (expr.tag) {
        case "id":
            if (!localenv.vars.has(expr.name)) {
                throw new Error("Reference Error: Not a variable " + expr.name);
            }
            return __assign(__assign({}, expr), { a: localenv.vars.get(expr.name) });
        case "funcall":
            if (expr.name === "print") {
                if (expr.args.length !== 1) {
                    throw new Error("print expects a single argument");
                }
                var newArgs_1 = [tcExpr(expr.args[0], localenv, insideFunc)];
                var res = __assign(__assign({}, expr), { a: ast_1.VarType.none, args: newArgs_1 });
                return res;
            }
            if (!localenv.func.has(expr.name)) {
                throw new Error("Not a function or class " + expr.name);
            }
            var _a = localenv.func.get(expr.name), args = _a[0], ret = _a[1];
            if (args.length !== expr.args.length) {
                throw new Error("Expected " + args.length + " arguments but got " + expr.args.length);
            }
            var newArgs = args.map(function (a, i) {
                var argtyp = tcExpr(expr.args[i], localenv, insideFunc);
                if (a !== argtyp.a) {
                    throw new Error("Got " + argtyp + " as argument " + (i + 1) + ", expected " + a);
                }
                return argtyp;
            });
            return __assign(__assign({}, expr), { a: ret, args: newArgs });
            break;
        case "literal":
            var litType = tcLiteral(expr.literal);
            return __assign(__assign({}, expr), { a: litType.a, literal: litType });
        case "binOperator":
            var left = tcExpr(expr.left_opr, localenv, insideFunc);
            var right = tcExpr(expr.right_opr, localenv, insideFunc);
            var opr = expr.opr;
            if (checkOpInt(opr)) {
                if (left.a == ast_1.VarType.int && right.a == ast_1.VarType.int) {
                    if (opr === ast_1.BinaryOP.Gt || opr === ast_1.BinaryOP.Lt || opr === ast_1.BinaryOP.Gte || opr === ast_1.BinaryOP.Lte || opr === ast_1.BinaryOP.Eq || opr === ast_1.BinaryOP.Neq) {
                        return __assign(__assign({}, expr), { left_opr: left, right_opr: right, a: ast_1.VarType.bool });
                    }
                    return __assign(__assign({}, expr), { left_opr: left, right_opr: right, a: ast_1.VarType.int });
                }
                throw new Error("Cannot apply operator `" + opr + "` on types `" + left.a + "` and " + right.a);
            }
            if (checkOpBoth(opr)) {
                if (left.a === right.a) {
                    if (opr === ast_1.BinaryOP.Gt || opr === ast_1.BinaryOP.Lt || opr === ast_1.BinaryOP.Gte || opr === ast_1.BinaryOP.Lte || opr === ast_1.BinaryOP.Eq || opr === ast_1.BinaryOP.Neq) {
                        return __assign(__assign({}, expr), { left_opr: left, right_opr: right, a: ast_1.VarType.bool });
                    }
                    return __assign(__assign({}, expr), { left_opr: left, right_opr: right, a: left.a });
                }
                else {
                    throw new Error("Cannot apply operator `" + opr + "` on types `" + left.a + "` and " + right.a);
                }
            }
            break;
        case "UniOperator":
            var myOpr = expr.opr;
            var myUniExpr = tcExpr(expr.right, localenv, insideFunc);
            if (myOpr === ast_1.UniOp.Not) {
                if (myUniExpr.a == ast_1.VarType.bool) {
                    return __assign(__assign({}, expr), { right: myUniExpr, a: ast_1.VarType.bool });
                }
                else {
                    throw new Error("Cannot apply operator `not` on type `int`");
                }
            }
            else {
                if (myUniExpr.a == ast_1.VarType.int) {
                    return __assign(__assign({}, expr), { right: myUniExpr, a: ast_1.VarType.int });
                }
                else {
                    throw new Error("Cannot apply operator `-` on type `bool`");
                }
            }
        case "paran":
            var myInnerExpr = tcExpr(expr.inner, localenv, insideFunc);
            return __assign(__assign({}, expr), { inner: myInnerExpr, a: myInnerExpr.a });
        case "literal":
            var myLit = tcLiteral(expr.literal);
            return __assign(__assign({}, expr), { literal: myLit, a: myLit.a });
    }
}
exports.tcExpr = tcExpr;
function tcLiteral(literal) {
    switch (literal.tag) {
        case "num":
            return __assign(__assign({}, literal), { a: ast_1.VarType.int });
        case "bool":
            return __assign(__assign({}, literal), { a: ast_1.VarType.bool });
        case "none":
            return __assign(__assign({}, literal), { a: ast_1.VarType.none });
        default:
            throw new Error("Invalid type annotation");
    }
}
exports.tcLiteral = tcLiteral;
// export function tcVars(va: Var<null>[], env: idMap): Var<Type>[]{
//     const typedVar:Var<Type>[] = [];
//     va.forEach((v) => {
//         const litType = tcLiteral(v.value);
//         if(litType.a == v.type){
//             env.vars.set(v.name,v.type);
//             typedVar.push({...v,a:litType.a,value:litType});
//         }else{
//             throw new Error(`Expected type " + \`${v.type}\`, but got \`${litType.a}\``);
//         }
//     })
//     return typedVar;
// }
// export function tcFunction(func: FuncDef<null>[], env:idMap): FuncDef<idMap>[]{
// }
// export function tcStatements(smts: Stmt<null>[], env: idMap): Stmt<Type>[]{
//     const typedSmts:Stmt<Type>[] = [];
//     smts.forEach((smt) => {
//         switch(smt.tag){
//             case "assign":
//                 const typedRightVal = tcExpr(smt.value,env);
//                 if(!env.vars.has(smt.name)){
//                     throw new Error(`Not a variable ${smt.name}`);
//                 }
//                 if(typedRightVal.a!=env.vars.get(smt.name)){
//                     throw new Error(`Expected type \`${env.vars.get(smt.name)}\`; but got \`${typedRightVal.a}\``);
//                 }
//                 typedSmts.push({...smt,value:typedRightVal,a:Type.none});
//                 break;
//             case "return":
//                 if(env.ret==Type.none){
//                     throw new Error(`Return statement cannot appear at the top level`);
//                 }
//                 const typeRet = tcExpr(smt.return,env);
//                 if(env.ret!=typeRet.a){
//                     throw new Error(`Expected \`${env.ret}\`; but got ${typeRet.a}\`\``);
//                 }
//                 typedSmts.push({...smt,return:typeRet,a:typeRet.a});
//                 break;
//             case "pass":
//                 typedSmts.push({...smt,a:Type.none});
//                 break;
//             case "expr":
//                 const expTc = tcExpr(smt.expr,env);
//                 typedSmts.push({...smt,expr:expTc,a:expTc.a})
//                 break;
//         }
//     })
//     return typedSmts;
// }
// export function tcParams(params: TypedVar<null>[]):TypedVar<Type>[]{
//     return params.map((param) =>{
//         return {...param,a:param.type};
//     })
// }
function checkOpInt(op) {
    if (op == ast_1.BinaryOP.Add || op == ast_1.BinaryOP.Mul || op == ast_1.BinaryOP.Sub || op == ast_1.BinaryOP.Gt || op == ast_1.BinaryOP.Lt || op == ast_1.BinaryOP.Gte || op == ast_1.BinaryOP.Lte || op == ast_1.BinaryOP.Int_Div || op == ast_1.BinaryOP.Mod) {
        return true;
    }
    return false;
}
exports.checkOpInt = checkOpInt;
function checkOpBoth(op) {
    if (op == ast_1.BinaryOP.Eq || op == ast_1.BinaryOP.Neq) {
        return true;
    }
    return false;
}
exports.checkOpBoth = checkOpBoth;
//# sourceMappingURL=tc.js.map