"use strict";
exports.__esModule = true;
exports.parseProgram = exports.traverse = exports.traverseStmt = exports.checkElif = exports.traverseParameters = exports.traverseType = exports.traverseTypeDef = exports.isExpression = exports.traverseLiteral = exports.traverseExpr = void 0;
var lezer_python_1 = require("lezer-python");
var ast_1 = require("./ast");
var mySet = new Set();
function traverseExpr(c, s) {
    //console.log(c.type.name)
    switch (c.type.name) {
        case "Number":
            var myLitVal = s.substring(c.from, c.to);
            var myLit = traverseLiteral(c, s, myLitVal);
            return {
                tag: "literal",
                literal: myLit
            };
        case "Boolean": {
            var myBoolName = s.substring(c.from, c.to);
            var myBoolLit = traverseLiteral(c, s, myBoolName);
            return {
                tag: "literal",
                literal: myBoolLit
            };
        }
        case "VariableName":
            var rightVal = s.substring(c.from, c.to);
            // if(!mySet.has(rightVal)){
            //   throw new Error("ReferenceError: Variable " + rightVal + " not defined");
            // }
            return {
                tag: "id",
                name: rightVal
            };
        case "CallExpression": // may be any func call
            c.firstChild(); // Name of the function
            var callName = s.substring(c.from, c.to);
            c.nextSibling(); // Goto ArgList
            c.firstChild(); // Goto (
            c.nextSibling(); //Goto params
            var arg_arr = [];
            while (c.node.type.name != ")") {
                arg_arr.push(traverseExpr(c, s));
                c.nextSibling(); // Goto comma
                c.nextSibling(); // Skip comma
            }
            c.parent(); // Goto Arglist
            c.parent(); // Goto CallExpression
            return { tag: "funcall", name: callName, args: arg_arr };
        case "BinaryExpression":
            //console.log("Here");
            c.firstChild(); // First expr
            var left_expr = traverseExpr(c, s);
            //console.log(left_expr);
            c.nextSibling(); // goTo BinaryOperator
            var op = s.substring(c.from, c.to);
            if (!ast_1.BinOpMap.has(op)) {
                c.parent(); // Got back to BinaryExpression level
                throw new Error("ParseError: Binary Operator " + op + " not supported");
            }
            //console.log(op);
            c.nextSibling();
            var right_expr = traverseExpr(c, s);
            //console.log(right_expr);
            c.parent(); // return to BinaryExpr level
            return {
                tag: "binOperator",
                left_opr: left_expr,
                opr: ast_1.BinOpMap.get(op),
                right_opr: right_expr
            };
        case "ParenthesizedExpression":
            c.firstChild(); //goto (
            c.nextSibling();
            var innerArg = traverseExpr(c, s);
            c.nextSibling(); // Solve for inner expr
            c.nextSibling(); // goto ) -> Not required but good to have for debug
            c.parent(); // goto parent level
            return {
                tag: "paran",
                inner: innerArg
            };
        case "UnaryExpression":
            //console.log("Here");
            c.firstChild(); // In unaryOp
            var unary_op = s.substring(c.from, c.to);
            if (!ast_1.UniOpMap.has(unary_op)) {
                c.parent();
                throw new Error("ParseError: Invalid unary operator " + unary_op);
            }
            c.nextSibling(); // goto expr
            var UniOpExpr = traverseExpr(c, s);
            c.parent();
            return { tag: "UniOperator", opr: ast_1.UniOpMap.get(unary_op), right: UniOpExpr };
        default:
            throw new Error("ParseError: Could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
    }
}
exports.traverseExpr = traverseExpr;
function traverseLiteral(c, s, value, type) {
    switch (String(c.node.type.name)) {
        case "Number":
            return { tag: "num", value: Number(value), type: ast_1.VarType.int };
        case "Boolean":
            if (value == "True") {
                return { tag: "bool", value: true, type: ast_1.VarType.bool };
            }
            if (value == "False") {
                return { tag: "bool", value: false, type: ast_1.VarType.bool };
            }
            break;
        case "None":
            return { tag: "none", value: null, type: ast_1.VarType.none };
        default:
            // Here check if its an expression and hanle accordingly
            throw new Error("Expected `" + type + "`; but got `" + String(c.node.type.name) + "`");
    }
}
exports.traverseLiteral = traverseLiteral;
function isExpression(e) {
    var exprStatements = ["ExpressionStatement", "BinaryExpression", "UnaryExpression", "ParenthesizedExpression", "CallExpression"];
    return exprStatements.includes(e);
}
exports.isExpression = isExpression;
function traverseTypeDef(c, s, name) {
    // Todo: Need to add checker for x:int = <expr> 
    switch (c.node.type.name) {
        case "TypeDef":
            c.firstChild(); // goto :
            c.nextSibling(); // goto type
            var t = s.substring(c.from, c.to);
            if (ast_1.TypeMap.has(t)) {
                var type = ast_1.TypeMap.get(t);
                c.parent(); //goto TypeDef
                c.nextSibling(); // goto =
                c.nextSibling(); // goto literal or right val. It cannot be another expression. Need to add that checker
                // check if it's an expression or variable name
                // const checkExpr = isExpression(String(c.node.type.name)) // Need to enhance this
                var value = s.substring(c.from, c.to);
                var myLit = traverseLiteral(c, s, value, type);
                return { name: name, type: type, value: myLit };
            }
            else {
                throw new Error("Invalid type annotation; there is no class named: " + t);
            }
    }
}
exports.traverseTypeDef = traverseTypeDef;
function traverseType(s, t) {
    switch (t.type.name) {
        case "VariableName":
            var name_1 = s.substring(t.from, t.to);
            if (!ast_1.TypeMap.has(name_1)) {
                throw new Error("ParseError: Type " + name_1 + " not allowed");
            }
            return ast_1.TypeMap.get(name_1);
        default:
            throw new Error("Unknown type: " + t.type.name);
    }
}
exports.traverseType = traverseType;
function traverseParameters(s, t) {
    t.firstChild(); // Focuses on open paren
    var parameters = [];
    t.nextSibling(); // Focuses on a VariableName
    while (t.type.name !== ")") {
        var name_2 = s.substring(t.from, t.to);
        t.nextSibling(); // Focuses on "TypeDef", hopefully, or "," if mistake
        var nextTagName = t.type.name; // NOTE(joe): a bit of a hack so the next line doesn't if-split
        if (nextTagName !== "TypeDef") {
            throw new Error("Missed type annotation for parameter " + name_2);
        }
        ;
        t.firstChild(); // Enter TypeDef
        t.nextSibling(); // Focuses on type itself
        var typ = traverseType(s, t);
        t.parent();
        t.nextSibling(); // Move on to comma or ")"
        parameters.push({ name: name_2, type: typ });
        t.nextSibling(); // Focuses on a VariableName
    }
    t.parent(); // Pop to ParamList
    return parameters;
}
exports.traverseParameters = traverseParameters;
function checkElif(c, s, ElifArray) {
    if (c.type.name != "elif") {
        return;
    }
    // Means we have elif
    c.nextSibling();
    var elifcond = traverseExpr(c, s);
    c.nextSibling(); // Body
    c.firstChild(); // goto :
    var elifbody = [];
    while (c.nextSibling()) {
        elifbody.push(traverseStmt(c, s));
    }
    c.parent(); // go back to body
    ElifArray.push({ cond: elifcond, body: elifbody });
    c.nextSibling(); // Again check for elif
    checkElif(c, s, ElifArray);
    return;
}
exports.checkElif = checkElif;
function traverseStmt(c, s) {
    switch (c.node.type.name) {
        case "AssignStatement":
            c.firstChild(); // go to name
            var name_3 = s.substring(c.from, c.to);
            c.nextSibling(); // go to equals or may be typdef
            if (String(c.node.type.name) === "TypeDef") {
                var typeDef = traverseTypeDef(c, s, name_3);
                c.parent(); // goto AssignStatement level
                return { tag: "varInit", name: name_3, value: typeDef };
            }
            else {
                // Means it is =
                c.nextSibling(); // go to right expr
                var rexpr = traverseExpr(c, s);
                c.parent(); // got to assignment level
                return { tag: "assign", name: name_3, value: rexpr };
            }
        case "ExpressionStatement":
            //console.log("Here");
            c.firstChild();
            var expr = traverseExpr(c, s);
            c.parent(); // pop going into stmt
            return { tag: "expr", expr: expr };
        case "IfStatement":
            c.firstChild(); // goto if
            c.nextSibling(); // goto cond expr
            var ifCondExpr = traverseExpr(c, s);
            c.nextSibling(); // Body
            c.firstChild(); // goto :
            //Multiple stataments inside if body
            var ifBodyStmt = [];
            while (c.nextSibling()) {
                ifBodyStmt.push(traverseStmt(c, s));
            }
            // Does the ifbody has return statement?
            // Should check in parser or typechecker?
            c.parent(); //Go back to if body
            //check if we have elif
            c.nextSibling(); //-> Here we are at elif or else or body ends
            var myLocalElifArr = [];
            // recursive function to gather all elif as we can have multiple elif
            checkElif(c, s, myLocalElifArr);
            var elifSeen = 0;
            if (myLocalElifArr.length >= 1) {
                elifSeen += 1;
            }
            // Not needed
            // if(myLocalElifArr.length>=1 && c.type.name!="else"){
            //   throw new Error("ParseError: Expected else after elif");
            // }
            // c.nextSibling(); // May be else or body end. Actualy it must have else if we have elif
            var elseSeen = false;
            // array to hold elsebody statements
            var elsebody = [];
            if (c.type.name == "else") {
                elseSeen = true;
                c.nextSibling(); // body
                //var elsecondexpr = traverseExpr(c,s);
                //c.nextSibling(); // Body
                c.firstChild(); //goto :
                while (c.nextSibling()) {
                    elsebody.push(traverseStmt(c, s));
                }
                c.parent();
            }
            c.parent(); // go back to IfStatement
            var myElse;
            if (elseSeen) {
                myElse = { body: elsebody };
            }
            if (elifSeen && !elseSeen) {
                return { tag: "if", cond: ifCondExpr, ifbody: ifBodyStmt, elif: myLocalElifArr };
            }
            if (elifSeen && elseSeen) {
                return { tag: "if", cond: ifCondExpr, ifbody: ifBodyStmt, elif: myLocalElifArr, "else": myElse };
            }
            if (elseSeen) {
                return { tag: "if", cond: ifCondExpr, ifbody: ifBodyStmt, "else": myElse };
            }
            return { tag: "if", cond: ifCondExpr, ifbody: ifBodyStmt };
        case "WhileStatement":
            // how to do?? Same as if??
            c.firstChild(); // goto while
            c.nextSibling(); // condexpr
            var whileExpr = traverseExpr(c, s);
            c.nextSibling(); //goto body
            c.firstChild(); // goto :
            var mywhilebody = [];
            while (c.nextSibling()) {
                mywhilebody.push(traverseStmt(c, s));
            }
            c.parent(); // goback to body
            c.parent(); // goback to whileStatement
            return { tag: "while", cond: whileExpr, body: mywhilebody };
        case "FunctionDefinition":
            c.firstChild(); // Focus on def
            c.nextSibling(); // Focus on name of function
            var funname = s.substring(c.from, c.to);
            c.nextSibling(); // Focus on ParamList
            var params = traverseParameters(s, c);
            c.nextSibling(); // Focus on Body or TypeDef
            var ret = ast_1.VarType.none;
            var maybeTD = c;
            if (maybeTD.type.name === "TypeDef") {
                c.firstChild();
                ret = traverseType(s, c);
                c.parent();
            }
            c.nextSibling(); // Focus on Body
            c.firstChild(); // Focus on :
            var body = [];
            while (c.nextSibling()) {
                body.push(traverseStmt(c, s));
            }
            var varInit_1 = [];
            // For VarInit field in FuncDef
            body.forEach(function (b) {
                if (b.tag == "varInit") {
                    varInit_1.push(b.value);
                }
            });
            c.parent(); // Pop to Body
            c.parent(); // Pop to FunctionDefinition
            return {
                tag: "FuncDef",
                name: funname,
                params: params, init: varInit_1, body: body, ret: ret
            };
        case "ReturnStatement":
            c.firstChild(); // On return
            c.nextSibling(); // Go to expr
            // mean func has return; and not like return <expr>. In such case assign the type to none
            // n.nextSibling will not change if we have only return
            if (c.type.name == "return") {
                c.parent();
                return { tag: "return" };
            }
            var returnExpr = traverseExpr(c, s);
            c.parent(); // Go back to parent level
            return { tag: "return", "return": returnExpr };
        case "PassStatement":
            c.parent();
            return { tag: "pass" };
        default:
            throw new Error("ParseError: Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
    }
}
exports.traverseStmt = traverseStmt;
function traverse(c, s) {
    switch (c.node.type.name) {
        case "Script":
            var stmts = [];
            c.firstChild();
            do {
                stmts.push(traverseStmt(c, s));
            } while (c.nextSibling());
            console.log("traversed " + stmts.length + " statements ", stmts, "stopped at ", c.node);
            return stmts;
        default:
            throw new Error("ParseError: Could not parse program at " + c.node.from + " " + c.node.to);
    }
}
exports.traverse = traverse;
function parseProgram(source) {
    var t = lezer_python_1.parser.parse(source);
    return traverse(t.cursor(), source);
}
exports.parseProgram = parseProgram;
//# sourceMappingURL=parser.js.map