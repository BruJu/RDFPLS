import * as N3 from "n3";
import namespace from '@rdfjs/namespace';
import * as RDF from "@rdfjs/types";
import fs from 'fs';
import * as rdfString from 'rdf-string';

import { followThrough } from 'prec/build/src/rdf/path-travelling';

const rdf = namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#", { factory: N3.DataFactory });
const pls = namespace("http://bruy.at/rdf/pls#"                    , { factory: N3.DataFactory });
// const xsd = namespace("http://www.w3.org/2001/XMLSchema#"          , { factory: N3.DataFactory });

const $dg = N3.DataFactory.defaultGraph();

type Memory = {[name: string]: RDF.Literal};

function readFile(filepath: string): RDF.Quad[] {
  const trigContent = fs.readFileSync(filepath, 'utf-8');
  const parser = new N3.Parser();
  return parser.parse(trigContent);
}

function getQuad(dataset: RDF.DatasetCore): RDF.Quad {
  if (dataset.size !== 1) throw Error("Call of getQuad() on a dataset with size != 1");
  return [...dataset][0];
}

function unlist(dataset: RDF.DatasetCore, head: RDF.Quad_Subject): RDF.Quad_Object[] {
  const elements: RDF.Quad_Object[] = [];

  while (!rdf.nil.equals(head)) {
    elements.push(followThrough(dataset, head, rdf.first)!);
    head = followThrough(dataset, head, rdf.rest)! as RDF.Quad_Subject;
  }

  return elements;
}

function cutest(lhs: number, rhs: number): number {
  if (lhs > rhs) {
    return cutest(lhs, rhs);
  }

  if (lhs == rhs) {
    return lhs;
  }

  if (lhs < 0 && rhs >= 0) {
    return rhs;
  }

  if (lhs % 2 == 0) return lhs;
  if (rhs % 2 == 0) return rhs;
  return lhs;
}

const binaryOperators: {[funcName: string]: (lhs: number, rhs: number) => number} = {
  [pls.plus.value]: (lhs, rhs) => lhs + rhs,
  [pls.minus.value]: (lhs, rhs) => lhs - rhs,
  [pls.times.value]: (lhs, rhs) => lhs * rhs,
  [pls.divide.value]: (lhs, rhs) => rhs == 0 ? 777 : lhs / rhs,
  [pls.power.value]: (lhs, rhs) => Math.pow(lhs, rhs),
  [pls.pickTheCutest.value]: cutest
};

function evaluate(store: RDF.DatasetCore, node: RDF.Term, memory: Memory) {
  if (node.termType === "Literal") {
    return node;
  }
  
  if (node.termType !== 'Quad') {
    const str = rdfString.termToString(node);
    if (memory[str] !== undefined) return memory[str];
  }

  if (node.termType !== "BlankNode") {
    throw Error("RDFPLS expected a blank node but found a " + node.termType);
  }

  // Not a literal = it's a function call, and functions calls are lists
  return readInstruction(store, node, memory);
}

function readInstruction(store: RDF.DatasetCore, triple: RDF.Quad_Subject, memory: Memory): RDF.Literal {
  const elements = unlist(store, triple);

  const functionName = elements[0];

  if (pls.print.equals(elements[0])) {
    const s = elements.slice(1)
      .map(argument => evaluate(store, argument, memory).value)
      .join(" ");

    console.log(s);

    return N3.DataFactory.literal(s);
  } else if (pls.affect.equals(elements[0])) {
    const destination = rdfString.termToString(elements[1]);
    const expression = evaluate(store, elements[2], memory);
    memory[destination] = expression;
    return expression;
  } else if (pls.plus.equals(functionName)
    || pls.minus.equals(functionName)
    || pls.times.equals(functionName)
    || pls.divide.equals(functionName)
    || pls.power.equals(functionName)
    || pls.pickTheCutest.equals(functionName)) {
    const args = elements.slice(1, 3).map(lit => parseInt(evaluate(store, lit, memory).value));
    return N3.DataFactory.literal(binaryOperators[functionName.value](args[0], args[1]));
  } else {
    throw Error("Unknown function: " + elements[0].value);
  }
}

function readInstructions(dataset: RDF.DatasetCore, instructions: RDF.Quad_Subject) {
  let memory: Memory = {};

  for (const instruction of unlist(dataset, instructions)) {
    readInstruction(dataset, instruction as RDF.Quad_Subject, memory);
  }
}

function readGraph(store: RDF.DatasetCore) {
  const mainFunctionQuads = store.match(null, rdf.type, pls.main_function, $dg);
  if (mainFunctionQuads.size !== 1) {
    throw Error("No unique main function found");
  }

  const mainInstructions = followThrough(
    store, getQuad(mainFunctionQuads).subject, pls.instructions
  );
  if (mainInstructions === null) {
    throw Error("No unique instructions found");
  } else if (mainInstructions.termType === 'Literal') {
    throw Error("Instructions should be an rdf list");
  }

  readInstructions(store, mainInstructions);
}

function main() {
  const filename = process.argv[2];

  const graph = new N3.Store();
  graph.addQuads(readFile(filename));
  readGraph(graph);
}

main();
