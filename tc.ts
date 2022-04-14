import { ConvertSInt32ToFloat32 } from 'binaryen';
import { endianness, type } from 'os';
import { env } from 'process';
import { isJSDocNamepathType, parseCommandLine } from 'typescript';
import {VarType,BinBoolOpMap,Stmt,Expr,BinaryOP,Var,FuncDef,TypedVar,Literal,Elif,Else, UniOp} from './ast'

type idMap = {
    vars: Map<string,VarType>,
    func: Map<string,[VarType[],VarType]>,
    ret: VarType
};



export function tcProgram(p : Stmt<any>[]) : Stmt<VarType>[] {
    //const functions = new Map<string, [VarType[], VarType]>();
    //const globals = new Map<string, VarType>();
    const EnvMaps:idMap = {} as idMap;
    EnvMaps.vars = new Map<string, VarType>();
    EnvMaps.func = new Map<string,[VarType[],VarType]>();
    EnvMaps.ret = VarType.none;
    p.forEach(s => {
      if(s.tag === "FuncDef") {
        EnvMaps.func.set(s.name, [s.params.map(p => p.type), s.ret]);
      }
    });
    return p.map(s => {
          var insideFunc:boolean = false;
          if(s.tag=="FuncDef"){insideFunc=true}
          const res = tcStmt(s, EnvMaps,VarType.none,insideFunc);
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
   
  export function tcElif(s:Elif<any>,localEnv:idMap,currentReturn:VarType,insideFunc:boolean){
      var myElifCond = tcExpr(s.cond,localEnv,insideFunc);
      if(myElifCond.a !== VarType.bool){
        throw new Error(`Condition expression cannot be of type ${myElifCond.a}`);
    }
      var myElifBody:Stmt<any>[] =[];
      s.body.forEach((b)=>{
          myElifBody.push(tcStmt(b,localEnv,currentReturn,insideFunc));
      })

      return {...s,cond:myElifCond,body:myElifBody};
  }


  export function tcElse(s:Else<any>,localEnv:idMap,currentReturn:VarType,insideFunc:boolean){
      var myElseBody:Stmt<any>[] =[];
      s.body.forEach((b)=>{
          myElseBody.push(tcStmt(b,localEnv,currentReturn,insideFunc));
      })

      return {...s,body:myElseBody};
  }

  export function tcVarInit(s:Var<any>): Var<VarType>{

    var myLit = tcLiteral(s.value);
    if(s.type!=myLit.a){
        throw new Error(`Expected ${s.type}; but got ${myLit.a}`);
    }

    return {...s,a:myLit.a,value:myLit};

  }

  
  export function tcStmt(s : Stmt<any>, localEnv:idMap, currentReturn : VarType, insideFunc:boolean) : Stmt<VarType> {

    switch(s.tag) {
      case "varInit":{
        
        var myVar = tcVarInit(s.value);
        console.log(localEnv.vars)
        localEnv.vars.set(s.name,myVar.type);
        return {...s,a:myVar.a, value:myVar};
      }

      case "FuncDef": {
        var FuncEnvMaps:idMap = {} as idMap;
        var bodyvars = new Map<string, VarType>(localEnv.vars.entries());
        var funcvars = new Map<string,[VarType[],VarType]>(localEnv.func.entries());
        s.params.forEach(p => { bodyvars.set(p.name, p.type)});
        FuncEnvMaps.vars = bodyvars;
        FuncEnvMaps.func = funcvars; 
        const newStmts = s.body.map(bs => tcStmt(bs, FuncEnvMaps, s.ret,true));

        // Go through the statements and check if we have return statement



        return {...s,body:newStmts};
        

      }


      case "assign": {
        //console.log("Here")
        const rhs = tcExpr(s.value,localEnv,insideFunc);
        //console.log(localEnv.vars.has(s.name))
        if(!localEnv.vars.has(s.name)){
            throw new Error(`Not a variable ${s.name}`)
        }
        if(localEnv.vars.get(s.name) !== rhs.a) {
          throw new Error(`Expected \`${localEnv.vars.get(s.name)}\`; but got ${rhs.a}`);
        }
        else {
          localEnv.vars.set(s.name, rhs.a);
        }
        return { ...s, value: rhs, a:rhs.a};
      }
    

      case "if":{
          var myIfCond = tcExpr(s.cond,localEnv,insideFunc);
          if(myIfCond.a !== VarType.bool){
            throw new Error(`Condition expression cannot be of type ${myIfCond.a}`);
          }
          var myIfBody:Stmt<any>[] = [];
          s.ifbody.forEach((b)=>{
            myIfBody.push(tcStmt(b,localEnv,currentReturn,insideFunc));
          })
          var elifSeen = false;
          var elseSeen = false;
          var myElifArr:Array<Elif<any>> = [];
          if(typeof s.elif !== 'undefined'){
            elifSeen=true;
            s.elif.forEach((e)=>{
                myElifArr.push(tcElif(e,localEnv,currentReturn,insideFunc));
            })
          }
          
          var myElse:Else<any> = {} as Else<any>;

          if(typeof s.else !== 'undefined'){
              elseSeen=true
              myElse = tcElse(s.else,localEnv,currentReturn,insideFunc);
          }
          if(elifSeen && elseSeen){
              return {...s,cond:myIfCond,ifbody:myIfBody,elif:myElifArr,else:myElse};
          }
          if(elseSeen){
            return {...s,cond:myIfCond,ifbody:myIfBody,else:myElse};
          }

          return {...s,cond:myIfCond,ifbody:myIfBody};
          break;

      }

      case "while":{
          var myWhileBody:Stmt<any>[] = [];
          s.body.forEach((b)=>{
              myWhileBody.push(tcStmt(b,localEnv,currentReturn,insideFunc));
          })

          var myWhileCond = tcExpr(s.cond,localEnv,insideFunc);
          if(myWhileCond.a!==VarType.bool){
              throw new Error(`Condition expression be ${myWhileCond.a}`)
          }
          return {...s,cond:myWhileCond,body:myWhileBody}
      }
      case "expr": {
        const ret = tcExpr(s.expr, localEnv,insideFunc);
        return { ...s, expr: ret , a:ret.a};
      }
      
      case "pass": {
          return {...s,a:VarType.none};
      }

      case "return": {
        if(!insideFunc){
            throw new Error(`Return statement cannot appear at top level`);
        }
        if(typeof s.return != 'undefined'){
            const valTyp = tcExpr(s.return, localEnv,insideFunc);
            if(valTyp.a !== currentReturn) {
               throw new Error(`${valTyp.a} returned but ${currentReturn} expected.`);
            }
            return { ...s, return: valTyp,a:valTyp.a};
        }
        if(currentReturn!=VarType.none){
            throw new Error(`Expected ${currentReturn}; but got None`);
        }
        return {...s,a:VarType.none};
        
      }
    }
  }


export function tcExpr(expr: Expr<any>, localenv:idMap,insideFunc:boolean): Expr<VarType>{
    switch(expr.tag){
        case "id":
            if(!localenv.vars.has(expr.name)){
                throw new Error(`Reference Error: Not a variable ${expr.name}`);
            }
            return {...expr, a:localenv.vars.get(expr.name)};

        
        case "funcall":
            if(expr.name === "print") {
                if(expr.args.length !== 1) { throw new Error("print expects a single argument"); }
                const newArgs = [tcExpr(expr.args[0], localenv,insideFunc)];
                const res : Expr<VarType> = { ...expr, a: VarType.none, args: newArgs } ;
                return res;
              }
              if(!localenv.func.has(expr.name)) {
                throw new Error(`Not a function or class ${expr.name}`);
              }
        
              const [args, ret] = localenv.func.get(expr.name);
              if(args.length !== expr.args.length) {
                throw new Error(`Expected ${args.length} arguments but got ${expr.args.length}`);
              }
        
              const newArgs = args.map((a, i) => {
                const argtyp = tcExpr(expr.args[i], localenv,insideFunc);
                if(a !== argtyp.a) { throw new Error(`Got ${argtyp} as argument ${i + 1}, expected ${a}`); }
                return argtyp
              });
        
              return { ...expr, a: ret, args: newArgs };
            break;

    
        case "literal":
            const litType = tcLiteral(expr.literal);
            return {...expr,a:litType.a,literal:litType};

        case "binOperator":
            var left = tcExpr(expr.left_opr,localenv,insideFunc);
            var right = tcExpr(expr.right_opr,localenv,insideFunc);
            var opr = expr.opr;
            if(checkOpInt(opr)){
                if(left.a==VarType.int && right.a==VarType.int){
                    if(opr===BinaryOP.Gt || opr===BinaryOP.Lt || opr===BinaryOP.Gte || opr===BinaryOP.Lte || opr===BinaryOP.Eq || opr===BinaryOP.Neq){
                        return {...expr,left_opr:left, right_opr:right,a:VarType.bool};
                    }
                    return {...expr,left_opr:left, right_opr:right,a:VarType.int};
                }
                throw new Error(`Cannot apply operator \`${opr}\` on types \`${left.a}\` and ${right.a}`);

            }
            if (checkOpBoth(opr)){
                if(left.a===right.a){
                    if(opr===BinaryOP.Gt || opr===BinaryOP.Lt || opr===BinaryOP.Gte || opr===BinaryOP.Lte || opr===BinaryOP.Eq || opr===BinaryOP.Neq){
                        return {...expr,left_opr:left, right_opr:right,a:VarType.bool};
                    }
                    
                    return {...expr,left_opr:left,right_opr:right,a:left.a};

                }else{
                    throw new Error(`Cannot apply operator \`${opr}\` on types \`${left.a}\` and ${right.a}`);
                }
            } 
            break;
        
        case "UniOperator":
            var myOpr = expr.opr;
            var myUniExpr = tcExpr(expr.right,localenv,insideFunc);
            if(myOpr===UniOp.Not){
                if(myUniExpr.a == VarType.bool){
                    return {...expr,right:myUniExpr,a:VarType.bool};
                }else{
                    throw new Error(`Cannot apply operator \`not\` on type \`int\``);
                }

            }else{
                if(myUniExpr.a==VarType.int){
                    return {...expr,right:myUniExpr,a:VarType.int};
                }else{
                    throw new Error(`Cannot apply operator \`-\` on type \`bool\``);
                }

            }
        
        case "paran":
            var myInnerExpr = tcExpr(expr.inner,localenv,insideFunc);
            return {...expr,inner:myInnerExpr,a:myInnerExpr.a};
        
        case "literal":
            var myLit = tcLiteral(expr.literal);
            return {...expr,literal:myLit,a:myLit.a}


        
    }
}


export function tcLiteral(literal: Literal<any>): Literal<VarType> {

    switch(literal.tag){
        case "num":
            return {...literal,a:VarType.int};
        case "bool":
            return {...literal,a:VarType.bool};
        case "none":
            return {...literal,a:VarType.none};
        default:
            throw new Error(`Invalid type annotation`);
    }

}

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

export function checkOpInt(op: BinaryOP): boolean {

    if(op==BinaryOP.Add || op==BinaryOP.Mul || op==BinaryOP.Sub || op==BinaryOP.Gt || op==BinaryOP.Lt || op==BinaryOP.Gte || op==BinaryOP.Lte || op==BinaryOP.Int_Div || op==BinaryOP.Mod){
        return true;
    }

    return false;

}

export function checkOpBoth(op: BinaryOP): boolean {

    if(op==BinaryOP.Eq || op == BinaryOP.Neq){
        return true;
    }

    return false;

}



