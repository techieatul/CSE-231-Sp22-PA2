import { Type } from "binaryen";
import {parser} from "lezer-python";
import {TreeCursor} from "lezer-tree";
import { createImmediatelyInvokedFunctionExpression } from "typescript";
import {BinaryOP,Expr, UniOpMap,Stmt, VarType,TypeMap,Var, BinOpMap,Literal, TypedVar,Elif,Else,varType} from "./ast";

const mySet = new Set();
export function traverseExpr(c : TreeCursor, s : string) : Expr<varType> {
  //console.log(c.type.name)
  switch(c.type.name) {
    case "Number":
      var myLitVal = s.substring(c.from, c.to);
      var myLit = traverseLiteral(c,s,myLitVal);
      return {
        tag: "literal",
        literal: myLit
      }
    case "None":
      return {
        tag:"literal",
        literal:{tag:"none",value:null,type:{tag:"none",value:VarType.none}}
      }
    case "Boolean": {
      var myBoolName = s.substring(c.from, c.to);
      var myBoolLit = traverseLiteral(c,s,myBoolName);
      return {
        tag:"literal",
        literal:myBoolLit
      };

    }
    case "VariableName":
      const rightVal = s.substring(c.from, c.to);
      // if(!mySet.has(rightVal)){
      //   throw new Error("ReferenceError: Variable " + rightVal + " not defined");
      // }
      return {
        tag: "id",
        name: rightVal
      }
    case "CallExpression": // may be any func call
      c.firstChild(); // Name of the function
      const callName = s.substring(c.from, c.to);
      c.nextSibling(); // Goto ArgList
      c.firstChild(); // Goto (
      c.nextSibling(); //Goto params

      var arg_arr = [];
      while(c.node.type.name!=")"){
        arg_arr.push(traverseExpr(c,s));
        c.nextSibling(); // Goto comma
        c.nextSibling(); // Skip comma
      }
      c.parent(); // Goto Arglist
      c.parent(); // Goto CallExpression
      
      return {tag: "funcall", name: callName, args:arg_arr}
      

    case "BinaryExpression":
      //console.log("Here");
      c.firstChild(); // First expr
      const left_expr = traverseExpr(c,s);
      //console.log(left_expr);
      c.nextSibling(); // goTo BinaryOperator
      const op = s.substring(c.from,c.to);
      if(!BinOpMap.has(op)){
        c.parent() // Got back to BinaryExpression level
        throw new Error(`ParseError: Binary Operator ${op} not supported`);
      }
      //console.log(op);
      
      c.nextSibling();
      const right_expr = traverseExpr(c,s);
      //console.log(right_expr);
      c.parent(); // return to BinaryExpr level
      return {
        tag: "binOperator", 
        left_opr: left_expr, 
        opr: BinOpMap.get(op), 
        right_opr: right_expr
      }
    


    case "ParenthesizedExpression":
      c.firstChild(); //goto (
      c.nextSibling();
      var innerArg = traverseExpr(c,s);
      c.nextSibling(); // Solve for inner expr
      c.nextSibling(); // goto ) -> Not required but good to have for debug
      c.parent(); // goto parent level
      
      return {
        tag:"paran",
        inner: innerArg
      }

    case "UnaryExpression":
      //console.log("Here");
      c.firstChild(); // In unaryOp
      const unary_op = s.substring(c.from,c.to);
      if(!UniOpMap.has(unary_op)){
        c.parent();
        throw new Error (`ParseError: Invalid unary operator ${unary_op}`);
      }
      c.nextSibling(); // goto expr
      var UniOpExpr = traverseExpr(c,s); 
      
      c.parent();

      return {tag: "UniOperator", opr: UniOpMap.get(unary_op), right: UniOpExpr}
      

    default:
      throw new Error("ParseError: Could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
  }
}

export function traverseLiteral(c : TreeCursor, s : string, value : string,type?: varType): Literal<varType>{
  switch(String(c.node.type.name)){
    case "Number":
      return {tag:"num",value:Number(value),type:{tag:"int",value:VarType.int}};
    case "Boolean":
      if(value=="True"){return {tag:"bool",value:true,type:{tag:"bool",value:VarType.bool}};}
      if(value=="False"){return {tag:"bool",value:false,type:{tag:"bool",value:VarType.bool}};}
      break;
    case "None":
      return {tag:"none",value:null,type:{tag:"none",value:VarType.none}};
    default:
      // Here check if its an expression and hanle accordingly
      throw new Error(`Expected \`${type}\`; but got \`${String(c.node.type.name)}\``);

  }
}

export function isExpression(e:string){
  const exprStatements = ["ExpressionStatement","BinaryExpression","UnaryExpression","ParenthesizedExpression","CallExpression"];
  return exprStatements.includes(e);
}

export function traverseTypeDef(c : TreeCursor, s : string, name:string): Var<varType> {

  // Todo: Need to add checker for x:int = <expr> 
  switch(c.node.type.name){
    case "TypeDef":
      c.firstChild(); // goto :
      c.nextSibling(); // goto type
      const t = s.substring(c.from,c.to);
      if(TypeMap.has(t)){
        const type = TypeMap.get(t);

        c.parent(); //goto TypeDef
        c.nextSibling(); // goto =
        c.nextSibling(); // goto literal or right val. It cannot be another expression. Need to add that checker
        // check if it's an expression or variable name
        // const checkExpr = isExpression(String(c.node.type.name)) // Need to enhance this

        let value = s.substring(c.from,c.to);
        const myLit = traverseLiteral(c,s,value,type);

        return {name: name,type: type, value: myLit};
        
      }else{
        throw new Error(`Invalid type annotation; there is no class named: ${t}`);
      }

      
  }
}

export function traverseType(s : string, t : TreeCursor) : varType {
  switch(t.type.name) {
    case "VariableName":
      const name = s.substring(t.from, t.to);
      if(!TypeMap.has(name)){
        throw new Error(`ParseError: Type ${name} not allowed`);
      }
      return TypeMap.get(name);
    default:
      throw new Error("Unknown type: " + t.type.name)

  }
}

export function traverseParameters(s : string, t : TreeCursor) : TypedVar[] {
  t.firstChild();  // Focuses on open paren
  const parameters = []
  t.nextSibling(); // Focuses on a VariableName
  while(t.type.name !== ")") {
    let name = s.substring(t.from, t.to);
    t.nextSibling(); // Focuses on "TypeDef", hopefully, or "," if mistake
    let nextTagName = t.type.name; // NOTE(joe): a bit of a hack so the next line doesn't if-split
    if(nextTagName !== "TypeDef") { throw new Error("Missed type annotation for parameter " + name)};
    t.firstChild();  // Enter TypeDef
    t.nextSibling(); // Focuses on type itself
    let typ = traverseType(s, t);
    t.parent();
    t.nextSibling(); // Move on to comma or ")"
    parameters.push({name:name, type:typ});
    t.nextSibling(); // Focuses on a VariableName
  }
  t.parent();       // Pop to ParamList
  return parameters;
}

export function checkElif(c:TreeCursor,s:string,ElifArray:Array<Elif<varType>>){
  if(c.type.name!="elif"){
    return;
  }
  // Means we have elif
  c.nextSibling();
  var elifcond = traverseExpr(c,s);
  c.nextSibling(); // Body
  c.firstChild(); // goto :
  var elifbody = [];
  while(c.nextSibling()){
    elifbody.push(traverseStmt(c,s));
  }
  if(elifbody.length==0){
    throw new Error ("Empty elif body")
  }
  c.parent() // go back to body
  ElifArray.push({cond:elifcond,body:elifbody});
  c.nextSibling(); // Again check for elif
  checkElif(c,s,ElifArray);
  return;


}

export function traverseStmt(c : TreeCursor, s : string) : Stmt<varType> {
  switch(c.node.type.name) {
    case "AssignStatement":
      c.firstChild(); // go to name
      const name = s.substring(c.from, c.to);
      c.nextSibling(); // go to equals or may be typdef
      if(String(c.node.type.name)==="TypeDef"){
        const typeDef = traverseTypeDef(c,s,name);
        c.parent() // goto AssignStatement level
        return {tag:"varInit",name:name,value:typeDef}
      }else{
        // Means it is =
        c.nextSibling(); // go to right expr
        const rexpr = traverseExpr(c,s);
        c.parent(); // got to assignment level
        return {tag:"assign",name:name,value:rexpr};

      }
      
    case "ExpressionStatement":
      //console.log("Here");
      c.firstChild();
      const expr = traverseExpr(c, s);
      c.parent(); // pop going into stmt
      return { tag: "expr", expr: expr}

    case "IfStatement":
      c.firstChild(); // goto if
      c.nextSibling(); // goto cond expr
      var ifCondExpr = traverseExpr(c,s);
      c.nextSibling(); // Body
      c.firstChild(); // goto :
      //Multiple stataments inside if body
      var ifBodyStmt = [];
      while(c.nextSibling()){
        ifBodyStmt.push(traverseStmt(c,s));
      }

      if(ifBodyStmt.length == 0){
        throw new Error ("Empty if body\n");
      }
      // Does the ifbody has return statement?
      // Should check in parser or typechecker?

      c.parent(); //Go back to if body

      //check if we have elif
      c.nextSibling(); //-> Here we are at elif or else or body ends
      var myLocalElifArr:Array<Elif<varType>> = []
      // recursive function to gather all elif as we can have multiple elif

      checkElif(c,s,myLocalElifArr);
      var elifSeen:number = 0
      if(myLocalElifArr.length>=1){
        elifSeen+=1;
      }
// Not needed
      // if(myLocalElifArr.length>=1 && c.type.name!="else"){
      //   throw new Error("ParseError: Expected else after elif");
      // }
     // c.nextSibling(); // May be else or body end. Actualy it must have else if we have elif
      
      var elseSeen:boolean = false;
      // array to hold elsebody statements
      var elsebody = [];

      if(c.type.name=="else"){
        elseSeen=true;
        c.nextSibling(); // body
        //var elsecondexpr = traverseExpr(c,s);
        //c.nextSibling(); // Body
        c.firstChild(); //goto :
        
        while(c.nextSibling()){
          elsebody.push(traverseStmt(c,s));
        }
        if(elsebody.length==0){
          throw new Error ("Empty else body\n");
        }
        c.parent()
      }
      c.parent() // go back to IfStatement
      
      var myElse:Else<any>;
      if(elseSeen){
        myElse = {body:elsebody};
      }
       
      if(elifSeen && !elseSeen){
        return {tag:"if",cond:ifCondExpr,ifbody:ifBodyStmt,elif:myLocalElifArr};
      }
      if(elifSeen && elseSeen){
        return {tag:"if",cond:ifCondExpr,ifbody:ifBodyStmt,elif:myLocalElifArr,else:myElse};
      }

      if(elseSeen){
        return {tag:"if",cond:ifCondExpr,ifbody:ifBodyStmt,else:myElse};

      }

      return {tag:"if",cond:ifCondExpr,ifbody:ifBodyStmt}
      

    case "WhileStatement":
      // how to do?? Same as if??
      c.firstChild(); // goto while
      c.nextSibling(); // condexpr
      var whileExpr = traverseExpr(c,s);
      c.nextSibling(); //goto body

      c.firstChild(); // goto :

      var mywhilebody = [];

      while(c.nextSibling()){
        mywhilebody.push(traverseStmt(c,s));
      }

      c.parent(); // goback to body
      c.parent(); // goback to whileStatement

      return {tag:"while",cond:whileExpr,body:mywhilebody}
    

    case "FunctionDefinition":
      c.firstChild();  // Focus on def
      c.nextSibling(); // Focus on name of function
      const funname = s.substring(c.from, c.to);
      c.nextSibling(); // Focus on ParamList
      var params = traverseParameters(s, c)
      c.nextSibling(); // Focus on Body or TypeDef
      let ret : varType = {tag:"none",value:VarType.none};
      let maybeTD = c;
      if(maybeTD.type.name === "TypeDef") {
        c.firstChild();
        ret = traverseType(s, c);
        c.parent();
      }
      c.nextSibling(); // Focus on Body
      c.firstChild();  // Focus on :
      const body = [];
      while(c.nextSibling()) {
        body.push(traverseStmt(c,s));
      }
      const varInit:Var<varType>[] = [];

      // For VarInit field in FuncDef
      body.forEach((b)=>{
        if(b.tag=="varInit"){
          varInit.push(b.value);
        }
      })
      c.parent();      // Pop to Body
      c.parent();      // Pop to FunctionDefinition
      return {
        tag: "FuncDef",
        name: funname, 
        params: params, init:varInit,body:body, ret:ret
      }

    case "ReturnStatement":
      c.firstChild(); // On return
      c.nextSibling(); // Go to expr

      // mean func has return; and not like return <expr>. In such case assign the type to none
      // n.nextSibling will not change if we have only return
      if(c.type.name=="return") {
        c.parent();
        return {tag:"return"}
      }
      var returnExpr = traverseExpr(c,s);
      c.parent(); // Go back to parent level
      return {tag:"return",return:returnExpr}
    
    case "PassStatement":
      c.parent();
      return {tag:"pass"}

    default:
      throw new Error("ParseError: Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
  }
}

export function traverse(c : TreeCursor, s : string) : Array<Stmt<varType>> {
  switch(c.node.type.name) {
    case "Script":
      const stmts = [];
      c.firstChild();
      do {
        stmts.push(traverseStmt(c, s));
      } while(c.nextSibling())
      console.log("traversed " + stmts.length + " statements ", stmts, "stopped at " , c.node);
      return stmts;
    default:
      throw new Error("ParseError: Could not parse program at " + c.node.from + " " + c.node.to);
  }
}
export function parseProgram(source : string) : Array<Stmt<varType>> {
  const t = parser.parse(source);
  return traverse(t.cursor(), source);
}
