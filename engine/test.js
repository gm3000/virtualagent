// class x {
//   constructor() {
//     this.a = 'a';
//     this.b = 'b';
//   }

//   toString() {
//     return `${this.a} + ${this.b}`;
//   }
// }

// const y = new x();

// console.log(y.toString());
const fp = require('lodash/fp');

function a(x) {
  x.a = 1;
  return x;
}

function b(x) {
  x.b = 2;
  return x;
}

const x = {};
const x2 = fp.compose([ a, b ])(x);

console.log(x === x2);
