# RDFPLS

**R**esource **D**escription **F**ramework **P**rogramming **L**anguage **S**
(the S stands for whatever you like. I like to think it means Stupid because it
is a bad idea) is a joke programming language using RDF.

## Getting started

- Clone the repository (eh)
- `npm install`
- `npx ts-node index.ts examples\helloworld.ttl`

```
Hello world
And another print!
```

## Features

- Variables
- Basic operators (+, -, *, /, power and "pick the cutest")
- Functions
- Branchs
- While loops
- Call JavaScript functions to ensure maximal security issues

### Mathematics and variables!

- `npx ts-node index.ts examples\maths.ttl`

Currently supported operators are pls:plus, minus, times, divide, power and pickTheCutest (on xsd:integer).

Positive numbers are cuter than negatives. Even numbers are cuter than odd. Smaller numbers
are cuter than biggers!


## How to write a program in RDF PLS

~~PLS don't and use a real programming language~~

You need to have a main function with the list of instructions

```turtle
<whatever you want> rdf:type pls:main_function ;
  pls:do ( the list of expression ) .
```

An expression is either a literal or a function call.

A function call is a list (at this point, this language should have been called RDF list) with as the first element the identifier of the function and the others are the arguments.

Examples:

- Example 1

*RDFPLS*
```
[] rdf:type pls:main_function ;
  pls:do ( ( pls:print "hello world" ) )
```

*JavaScript*
```js
console.log("hello world")
```

- Example 2
```
[] rdf:type pls:main_function ;
  pls:instructions (
    ( pls:affect _:x 500 )
    ( pls:affect _:y ( pls:plus _:x 55 ) )
    ( pls:print _:y )
  )
```

*C++* (This README is not even consistent)
```
int main() {
    const x = 500;
    const y = x + 55;
    std::cout << y << '\n';
    return 0;
}
```

- Check out the [test folder](test/programs) for some examples!


## License

You probably shouldn't consider using any code from this project, but if you
like to live very dangerously, this project is under the [MIT License](LICENSE).
