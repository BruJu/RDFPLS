# RDFPLS

Resource Description Framework Programming Language S (the S stands for whatever
you like. I like to think it means Stupid because it is a bad idea) is a
joke programming language using RDF.

## Getting started

- Clone the repository (eh)
- `npm install`
- `node rdfplsinterpreter.js examples\helloworld.ttl`

```
Hello world
Currently only print is supported
```

## Features


### Mathematics and variables!

- `node rdfplsinterpreter.js examples\maths.ttl`
- It crashes because N3's parser doesn't allow literals in subject position :(
    - See the message `    at N3Parser._readSubject (B:\RDFPLS\node_modules\n3\lib\N3Parser.js:253:40)`
    - Remove that line
    - Yes, RDFPLS also promotes the worst programming practices.
- Retype the command line
- It works !

Currently supported operators are pls:plus, minus, times, divide, power and pickTheCutest (on xsd:integer).

Positive numbers are cuter than negatives. Even numbers are cuter than odd. Smaller numbers
are cuter than biggers!


## TODO

- Branchs
- Loops (and at this point, RDFPLS will be turing complete!)
- Functions
- Javascript functions in graphs to code primitive functions!
