import * as N3 from "n3";
import namespace from '@rdfjs/namespace';
import * as RDF from "@rdfjs/types";
import fs from 'fs';
import * as rdfString from 'rdf-string';

import { followThrough } from 'prec/build/src/rdf/path-travelling';
import * as precRDFUtil from 'prec/build/src/rdf/utils';

const rdf = namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#", { factory: N3.DataFactory });
const pls = namespace("http://bruy.at/rdf/pls#"                    , { factory: N3.DataFactory });
const xsd = namespace("http://www.w3.org/2001/XMLSchema#"          , { factory: N3.DataFactory });

const $dg = N3.DataFactory.defaultGraph();
let printOnConsole = console.log;

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

export function changePrintEffect(f: (...s: string[]) => void) {
  printOnConsole = f;
}

export function unlist(dataset: RDF.DatasetCore, head: RDF.Quad_Subject): RDF.Quad_Object[] {
  let x = head;
  const elements: RDF.Quad_Object[] = [];

  while (!rdf.nil.equals(head)) {
    elements.push(followThrough(dataset, head, rdf.first)!);
    head = followThrough(dataset, head, rdf.rest)! as RDF.Quad_Subject;
    if (head === null) throw Error("Invalid list " + JSON.stringify(x, null, 2));
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
  return readInstruction(store, node, memory).value;
}

function readInstruction(store: RDF.DatasetCore, triple: RDF.Quad_Subject, memory: Memory)
: { value: RDF.Literal, type: 'normal' | 'return' } {
  const elements = unlist(store, triple);

  const functionName = elements[0];

  if (pls.print.equals(functionName) || pls.trueprint.equals(functionName)) {
    const s = elements.slice(1)
      .map(argument => evaluate(store, argument, memory).value)
      .join(" ");

    if (pls.print.equals(functionName)) {
      printOnConsole(s);
    } else {
      console.log(s);
    }

    return { value: N3.DataFactory.literal(s), type: 'normal' };
  } else if (pls.affect.equals(elements[0])) {
    const destination = rdfString.termToString(elements[1]);
    const expression = evaluate(store, elements[2], memory);
    memory[destination] = expression;
    return { value: expression, type: 'normal' };
  } else if (pls.plus.equals(functionName)
    || pls.minus.equals(functionName)
    || pls.times.equals(functionName)
    || pls.divide.equals(functionName)
    || pls.power.equals(functionName)
    || pls.pickTheCutest.equals(functionName)) {
    const args = elements.slice(1, 3).map(lit => parseInt(evaluate(store, lit, memory).value));
    return {
      value: N3.DataFactory.literal(binaryOperators[functionName.value](args[0], args[1])),
      type: 'normal'
    };
  } else if (functionName.equals(pls.lessThan)
    || functionName.equals(pls.greaterThan)
    || functionName.equals(pls.equals)
    || functionName.equals(pls.beDifferent)
  ) {
    const args = elements.slice(1, 3).map(lit => parseInt(evaluate(store, lit, memory).value));

    let val: boolean;
    if (functionName.equals(pls.lessThan)) val = args[0] < args[1];
    else if (functionName.equals(pls.greaterThan)) val = args[0] > args[1];
    else if (functionName.equals(pls.equals)) val = args[0] == args[1];
    else if (functionName.equals(pls.beDifferent)) val = args[0] != args[1];
    else throw Error("Unknown comp function");

    return {
      value: N3.DataFactory.literal(val ? 'true' : 'false', xsd.boolean),
      type: 'normal'
    };
  } else if (pls.answer.equals(functionName) || (pls.return.equals(functionName) && Math.random() > 0.5)) {
    return { value: evaluate(store, elements[1], memory), type: 'return' };
  } else if (pls.return.equals(functionName)) {
    // This behaviour ensures that noone uses RDFPLS in a serious project
    throw Error("You wrote somewhere pls:return but you probably meant pls:answer");
  } else if (pls.if.equals(functionName)) {
    const conditionEval = evaluate(store, elements[1], memory);
    const conditionEvalBool = precRDFUtil.xsdBoolToBool(conditionEval);
    
    if (conditionEvalBool === true || conditionEvalBool === false) {
      const i = conditionEvalBool === true ? 2 : 3;
      if (elements[i] === undefined) return { value: N3.DataFactory.literal('No value'), type: 'normal' };
      const x = executeInstructions(store, elements[i] as RDF.Quad_Subject, memory);
      if (x.value === 'No value') {
        return { value: x, type: 'normal' };
      } else {
        return { value: x, type: 'return' };
      }
    } else {
      throw Error("Condition is not evaluated to true or false");
    }
  } else if (pls.while.equals(functionName)) {
    while (true) {
      const conditionEval = evaluate(store, elements[1], memory);
      const conditionEvalBool = precRDFUtil.xsdBoolToBool(conditionEval);
      
      if (conditionEvalBool === true) {
        const x = executeInstructions(store, elements[2] as RDF.Quad_Subject, memory);
        if (x.value !== 'No value') {
          return { value: x, type: 'return' };
        }
      } else if (conditionEvalBool === false) {
        return { value: N3.DataFactory.literal('No value'), type: 'normal' }; 
      } else {
        throw Error("Condition is not evaluated to true or false");
      }
    }
  } else {
    const candidates = store.match(functionName, rdf.type, pls.function, $dg);
    if (candidates.size === 0) {
      throw Error("Unknown function: " + elements[0].value);  
    }

    const argList = elements.slice(1).map(object => evaluate(store, object, memory));
    return { value: executeFunction(store, functionName as RDF.Quad_Subject, argList), type: 'normal' };
  }
}

function executeInstructions(dataset: RDF.DatasetCore, instructions: RDF.Quad_Subject, memory: Memory) {
  for (const instruction of unlist(dataset, instructions)) {
    const value = readInstruction(dataset, instruction as RDF.Quad_Subject, memory);
    if (value.type === 'return') {
      return value.value;
    }
  }

  return N3.DataFactory.literal("No value");
}

export function executeFunction(dataset: RDF.DatasetCore, funcName: RDF.Quad_Subject, funcArgs: RDF.Literal[] = []) {
  const mainInstructions = followThrough(dataset, funcName, pls.do);

  if (mainInstructions === null) {
    throw Error("No unique instructions found");
  }

  let memory: Memory = {};
  let trueArgs: RDF.Literal[] = [];

  const receiveObject = followThrough(dataset, funcName, pls.receive);
  if (receiveObject !== null) {
    for (const possibleArgument of unlist(dataset, receiveObject as RDF.Quad_Subject)) {
      const variableName = rdfString.termToString(possibleArgument);
      const value = funcArgs.length !== 0 ? funcArgs.splice(0, 1)[0] : N3.DataFactory.literal(0);
      memory[variableName] = value;
      trueArgs.push(value);
    }
  }

  if (mainInstructions.termType === 'Literal') {
    if (mainInstructions.datatype.equals(pls.javascript_code)) {
      const code = mainInstructions.value;
      const func = new Function("return " + code.trim())();
      return func(N3.DataFactory, ...trueArgs);
    } else {
      throw Error("Instructions should be an rdf list or Javascript code");
    }
  } else {
    return executeInstructions(dataset, mainInstructions, memory);
  }
}

export function executeRDFPLS(store: RDF.DatasetCore) {
  const mainFunctionQuads = store.match(null, rdf.type, pls.main_function, $dg);
  if (mainFunctionQuads.size !== 1) {
    throw Error("No unique main function found");
  }

  return executeFunction(store, getQuad(mainFunctionQuads).subject);
}

function main() {
  const filename = process.argv[2];

  const graph = new N3.Store();
  graph.addQuads(readFile(filename));
  executeRDFPLS(graph);
}

if (require.main === module) {
  main();
}
