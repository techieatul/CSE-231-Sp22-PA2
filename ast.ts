
export type Stmt<A> =
  | { a?:A, tag: "assign", name: string, value: Expr<A>}
  | { a?:A, tag:"varInit", name: string, value: Var<A>}
  | { a?:A, tag: "expr", expr: Expr<A> }
  | { a?:A, tag: "return", return?: Expr<A>}
  | {a?:A, tag: "FuncDef", name: string, params: TypedVar[], ret: VarType, init: Var<A>[], body: Stmt<A>[]}
  | { a?:A, tag: "pass"}
  | {a?:A, tag:"if",cond:Expr<A>,ifbody:Stmt<A>[],elif?:Array<Elif<A>>,else?:Else<A>,return?:VarType}
  | {a?:A, tag:"while",cond:Expr<A>,body:Stmt<A>[]}



export type Elif<A> = {a?:A,cond:Expr<A>,body:Stmt<A>[],return?:VarType};
export type Else<A> = {a?:A,body:Stmt<A>[],return?:VarType};
export type Expr<A> =
  //  { a?:A, tag: "num", value: number } // This is replaced by literal
  | { a?:A, tag: "id", name: string }
  | { a?:A, tag: "builtin2", name: string, arg_1: Expr<A>, arg_2: Expr<A> }
  | { a?:A, tag: "binOperator", left_opr: Expr<A>, opr: BinaryOP, right_opr: Expr<A>}
  | { a?:A , tag: "paran", inner:Expr<A>}
  | { a?:A, tag: "UniOperator", opr: UniOp, right: Expr<A>}
  | { a?:A, tag: "literal", literal: Literal<A>}
  | { a?:A, tag: "funcall", name: string, args:Expr<A>[]}

export enum BinaryOP {Add = "+", Sub = "-",Mul="*",Gt = ">",Gte=">=",Lt="<",Lte="<=",Int_Div = "//", Mod="%", Eq="==", Neq="!=",Is="is"}

export enum UniOp {Not = "not", Minus = "-"}

export enum VarType {int="int",bool="bool",none="none"}

export const TypeMap = new Map<string, VarType>([
  ["int", VarType.int],
  ["bool", VarType.bool],
  ["none", VarType.none],
]);

export const UniOpMap = new Map<string,UniOp>([
  ["not", UniOp.Not],
  ["-",UniOp.Minus],
])

export const BinOpMap = new Map<string,BinaryOP>([
  ["+",BinaryOP.Add],
  ["-",BinaryOP.Sub],
  ["*",BinaryOP.Mul],
  [">",BinaryOP.Gt],
  ["<",BinaryOP.Lt],
  [">=",BinaryOP.Gte],
  ["<=",BinaryOP.Lte],
  ["//",BinaryOP.Int_Div],
  ["%",BinaryOP.Mod],
  ["==",BinaryOP.Eq],
  ["!=",BinaryOP.Neq],
  ["is",BinaryOP.Is],
]);

export const BinBoolOpMap = new Map<string,BinaryOP>([
  
  [">",BinaryOP.Gt],
  ["<",BinaryOP.Lt],
  [">=",BinaryOP.Gte],
  ["<=",BinaryOP.Lte],
  ["==",BinaryOP.Eq],
  ["!=",BinaryOP.Neq],
  ["is",BinaryOP.Is],
]);

export type Program<A> = {a?:A,tag:"program",var: Var<A>[], funcDef:FuncDef<A>[],stmts: Stmt<A>[]}

export type Var<A> = {a?: A,name: string, type: VarType, value: Literal<A>}

export type FuncDef<A> = {a?: A,name: string, params: TypedVar[], ret: VarType, init: Var<A>[], body: Stmt<A>[]}

export type TypedVar = {name: string, type: VarType}

export type Literal<A> = 
  { a?:A,tag:"num",value:number,type:VarType.int}
| { a?:A, tag: "bool",value:boolean,type:VarType.bool}
| { a?:A, tag: "none",value:null,type:VarType.none}