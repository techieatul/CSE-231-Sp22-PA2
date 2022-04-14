import {compile, run} from './compiler';

var importObject = {
  
  imports: {
    print_num: (arg : any) => {
      console.log("Logging from WASM: ", arg);
      //display(String(arg));
      return arg;
    },
    print_bool: (arg : any) => {
      if(arg === 0) { //display("False"); 
      }
      else { //display("True"); 
      }
      return arg;
    },
    print_none: (arg: any) => {
     // display("None");
      return arg;
    }
  },
};

// command to run:

var source:string = "def f(x:int)->int:\n\tif x>=4:\n\t\treturn 1\n\tx=x-1\n\tf(x)\nf(2)"


// node node-main.js 987
const input = process.argv[2];
const result = compile(input);
console.log(result);
run(result, {}).then((value) => {
  console.log(value);
});

