// import {parser} from "lezer-python"
const parser = require('lezer-python').parser;
const TW = "    "

function print(input, verbose = false){
  function print_r(cur, indent){
    let res = []
    do{
      if(indent === TW){
        res.push("\n")
        verbose && res.push(
          input.substring(cur.from, cur.to)
               .split('\n')
               .filter(s => s)
               .map(s=>indent+"# "+s)
               .join('\n'), "")
      }
      let nodeRepr = indent + cur.name
      if(!cur.node.cursor.firstChild() && cur.name !== input.substring(cur.from, cur.to))
        nodeRepr += ` ("${input.substring(cur.from, cur.to)}")`
      res.push(nodeRepr)
      if(cur.firstChild()){
        res.push(...print_r(cur, indent+ TW))
        cur.parent()
      }
    } while(cur.nextSibling())
    return res
  }
  let tree = parser.parse(input)
  let cursor = tree.cursor()
  return print_r(cursor, "").join("\n")
}

let input = `
class Rat(object):
   n:int=0
   d:int=0
   def __init__(self:Rat):
     pass
   def new(self,n:int,d:int)->Rat:
     self.n = 1
     self.d = 2
`

console.log("Printing node names\n")
console.log(print(input, true))