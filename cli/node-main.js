"use strict";
exports.__esModule = true;
var compiler_1 = require("./compiler");
var importObject = {
    imports: {
        print_num: function (arg) {
            console.log("Logging from WASM: ", arg);
            console.log(String(arg));
            return arg;
        },
        print_bool: function (arg) {
            if (arg === 0) { //display("False"); 
                console.log(String(arg));
            }
            else { //display("True"); 
                console.log(String(arg));
            }
            return arg;
        },
        print_none: function (arg) {
            // display("None");
            console.log("None");
            return arg;
        }
    }
};
// command to run:
var source = "def f(x:int)->int:\n\tif x>=4:\n\t\treturn 1\n\tx=x-1\n\tf(x)\nf(2)";
// node node-main.js 987
var input = process.argv[2];
var result = compiler_1.compile(source);
console.log(result);
compiler_1.run(result, { importObject: importObject }).then(function (value) {
    console.log(value);
});
