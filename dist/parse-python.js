var python = require('lezer-python');
var input = "def f(x): return x + 2\nf(4)";
var tree = python.parser.parse(input);
var cursor = tree.cursor();
do {
    console.log(cursor.node.type.name);
    console.log(input.substring(cursor.node.from, cursor.node.to));
} while (cursor.next());
//# sourceMappingURL=parse-python.js.map