import { join } from 'path';
import { isLiteralExpression } from 'typescript';
import wabt from 'wabt';
import {Stmt, Expr, VarType, BinaryOP,UniOp,Literal} from './ast';
import {parseProgram} from './parser';
import { tcProgram } from './tc';


type LocalEnv = Map<string, boolean>;
var loop_count = 0;
function variableNames(stmts: Stmt<VarType>[]) : string[] {
  const vars : Array<string> = [];
  stmts.forEach((stmt) => {
    //if(stmt.tag === "assign" || stmt.tag==="varInit") { vars.push(stmt.name); }
    if(stmt.tag==="varInit") { vars.push(stmt.name); }
  });
  return vars;
}

function funs(stmts: Stmt<VarType>[]) : Stmt<VarType>[] {
  return stmts.filter(stmt => stmt.tag === "FuncDef");
}

function nonFuns(stmts: Stmt<VarType>[]) : Stmt<VarType>[] {
  return stmts.filter(stmt => stmt.tag !== "FuncDef");
}

function varsFunsStmts(stmts: Stmt<VarType>[]) : [string[], Stmt<VarType>[], Stmt<VarType>[]] {
  return [variableNames(stmts), funs(stmts), nonFuns(stmts)];
}


export async function run(watSource : string, config: any) : Promise<number> {
  const wabtApi = await wabt();

  const parsed = wabtApi.parseWat("example", watSource);
  const binary = parsed.toBinary({});
  const wasmModule = await WebAssembly.instantiate(binary.buffer, config);
  return (wasmModule.instance.exports as any)._start();
}

export function BinopStmts(op : BinaryOP) {
  switch(op) {
    case "+": return [`i32.add`];
    case "-": return [`i32.sub`];
    case ">": return [`i32.gt_s`];
    case ">=": return [`i32.ge_s`];
    case "<" : return [`i32.lt_s`];
    case "<=" : return [`i32.le_s`];
    case "*" : return [`i32.mul`];
    case "//" : return [`i32.div_s`];
    case "%" : return [`i32.rem_s`];
    case "==" : return [`i32.eq`];
    case "!=" : return [`i32.ne`];

    default:
      throw new Error(`Unhandled or unknown op: ${op}`);
  }
}

// To handle unary Op


export function codeGenExpr(expr : Expr<VarType>, locals : LocalEnv) : Array<string> {
  switch(expr.tag) {
    case "literal": 
         switch(expr.literal.tag){
           case "num": return [`(i32.const ${expr.literal.value})`];
           case "bool":
                 switch(expr.literal.value){
                       case true: return [`(i32.const 1)`];
                       case false: return [`(i32.const 0)`];
                 }

         }
         
         break;

    
    case "paran":
      var innerExpr = codeGenExpr(expr.inner,locals);
      return [...innerExpr];
    
    case "UniOperator":
      var myUniExpr = codeGenExpr(expr.right,locals);
      if(expr.opr===UniOp.Minus){
        return [`(i32.const 0)`,...myUniExpr,`(i32.sub)`];
      }else{
        return [`(i32.const 1)`,...myUniExpr,`(i32.xor)`];

      }

    case "id":
      // Since we type-checked for making sure all variable exist, here we
      // just check if it's a local variable and assume it is global if not
      if(locals.has(expr.name)) { return [`(local.get $${expr.name})`]; }
      else { return [`(global.get $${expr.name})`]; }

    case "binOperator": {
      const lhsExprs = codeGenExpr(expr.left_opr, locals);
      const rhsExprs = codeGenExpr(expr.right_opr, locals);
      const opstmts = BinopStmts(expr.opr);
      return [...lhsExprs, ...rhsExprs, ...opstmts];
    }

    case "funcall":
      const valStmts = expr.args.map(e => codeGenExpr(e, locals)).flat();
      let toCall = expr.name;
      if(expr.name === "print") {
        switch(expr.args[0].a) {
          case "bool": toCall = "print_bool"; break;
          case "int": toCall = "print_num"; break;
          case "none": toCall = "print_none"; break;
        }
      }
      valStmts.push(`(call $${toCall})`);
      return valStmts;
  }
}


type CompileResult = {
  wasmSource: string,
};

export function compile(source : string) : string {
  let ast = parseProgram(source);
  ast = tcProgram(ast);
  const emptyEnv = new Map<string, boolean>();
  const [vars, funs, stmts] = varsFunsStmts(ast);
  const funsCode : string[] = funs.map(f => codeGenStmt(f, emptyEnv)).map(f => f.join("\n"));
  const allFuns = funsCode.join("\n\n");
  const varDecls = vars.map(v => `(global $${v} (mut i32) (i32.const 0))`).join("\n");

  const allStmts = stmts.map(s => codeGenStmt(s, emptyEnv)).flat();

  const main = [`(local $scratch i32)`, ...allStmts].join("\n");

  const lastStmt = ast[ast.length - 1];
  const isExpr = lastStmt.tag === "expr";
  var retType = "";
  var retVal = "";
  if(isExpr) {
    retType = "(result i32)";
    retVal = "(local.get $scratch)"
  }

  return `
    (module
      (func $print_num (import "imports" "print_num") (param i32) (result i32))
      (func $print_bool (import "imports" "print_bool") (param i32) (result i32))
      (func $print_none (import "imports" "print_none") (param i32) (result i32))
      ${varDecls}
      ${allFuns}
      (func (export "_start") ${retType}
        ${main}
        ${retVal}
      )
    ) 
  `;
}

export function codeGenLit(l:Literal<VarType>){
  switch(l.tag){
    case "num":
      return [`(i32.const ${l.value})`]
    case "bool":
      if(l.value) {return [`(i32.const 1)`]}
      if(!l.value) {return [`(i32.const 0)`]}
  }
}

export function codeGenStmt(stmt : Stmt<VarType>, locals : LocalEnv) : Array<string> {
  switch(stmt.tag) {
    case "FuncDef":
      const withParamsAndVariables = new Map<string, boolean>(locals.entries());

      // Construct the environment for the function body
      const variables = variableNames(stmt.body);
      variables.forEach(v => withParamsAndVariables.set(v, true));
      stmt.params.forEach(p => withParamsAndVariables.set(p.name, true));

      // Construct the code for params and variable declarations in the body
      const params = stmt.params.map(p => `(param $${p.name} i32)`).join(" ");
      const varDecls = variables.map(v => `(local $${v} i32)`).join("\n");

      const stmts = stmt.body.map(s => codeGenStmt(s, withParamsAndVariables)).flat();
      const stmtsBody = stmts.join("\n");
      return [`(func $${stmt.name} ${params} (result i32)
        (local $scratch i32)
        ${varDecls}
        ${stmtsBody}
        (i32.const 0))`];

    case "return":
      if(typeof stmt.return!='undefined'){
        var valStmts = codeGenExpr(stmt.return, locals);
        valStmts.push("return");
        return valStmts;
      }
      break;
      
      
      
    case "assign":
      var valStmts = codeGenExpr(stmt.value, locals);
      if(locals.has(stmt.name)) { valStmts.push(`(local.set $${stmt.name})`); }
      else { valStmts.push(`(global.set $${stmt.name})`); }
      return valStmts;

    case "varInit":
      var myLit = codeGenLit(stmt.value.value);
      if(locals.has(stmt.name)) {myLit.push(`(local.set $${stmt.name})`);}
      else { myLit.push(`(global.set $${stmt.name})`); }
      return myLit;
    
    case "expr":
      const result = codeGenExpr(stmt.expr, locals);
      result.push("(local.set $scratch)");
      return result;
    
    case "pass":
      break;
    
    case "while":
      var whileCond = codeGenExpr(stmt.cond,locals).flat().join("\n");
      var whileBody = stmt.body.flatMap((b)=>{
        return codeGenStmt(b,locals)
      }).join('\n');
      var whileCode = [`(loop $loop_${loop_count} ${whileBody} ${whileCond} br_if $loop_${loop_count})`];
      loop_count++;
      return whileCode;

    case "if":
      var ifCond = codeGenExpr(stmt.cond,locals).flat().join('\n');
      
      var ifBody = stmt.ifbody.flatMap((b)=>{
        return codeGenStmt(b,locals);
      }).join('\n');

      if(typeof stmt.elif != 'undefined'){
        var elif = stmt.elif.pop()
        var elifCond = elif.cond;
        var elifbody = elif.body;
        if(stmt.elif.length==0){
          stmt.elif = undefined; // doing this is important as after popping from array, we should
                                 // not enter the elif loop again
        }
        // using recursion idea here. The elif body and cond become the if's new body and cond, so that 
        // we have if() else(if() else()....) like this

        return [`${ifCond}
        (if
          ( then
            ${ifBody}
          )
          (else
            ${codeGenStmt({...stmt,ifbody:elifbody,cond:elifCond},locals)}
          )

        )
        
        `]
      }else if(typeof stmt.else !=='undefined'){
        var elseBody = stmt.else.body.flatMap((b)=>{
          return codeGenStmt(b,locals);
        }).join('\n');

        return [`${ifCond}
                (if
                  (then
                    ${ifBody}

                  )
                  (else
                    ${elseBody}

                  )
                

                )
        
              `]
      }else{
        return [`${ifCond}
               (if
                (then
                  ${ifBody}
                )
               )
               `]
      }

  }
}






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

