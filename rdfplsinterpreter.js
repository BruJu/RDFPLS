const N3 = require("n3");
const namespace = require('@rdfjs/namespace');
const graphy = require('@graphy/core.data.factory');

const rdf = namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#", N3.DataFactory);
const pls = namespace("http://bruy.at/rdf/pls#", N3.DataFactory);
const xsd = namespace("http://www.w3.org/2001/XMLSchema#", N3.DataFactory);

function travelPath(n3Store, start, path) {
    for (let i = 0 ; i != path.length ; ++i) {
        start = n3Store.getQuads(start, path[i])[0].object;
    }

    return start;
}

function unlist(store, head) {
    const elements = [];

    while (!rdf.nil.equals(head)) {
        elements.push(travelPath(store, head, [rdf.first]));
        head = travelPath(store, head, [rdf.rest]);
    }

    return elements;
}


function cutest(lhs, rhs) {
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

const binaryOperators = {
    [pls.plus.value]: (lhs, rhs) => lhs + rhs,
    [pls.minus.value]: (lhs, rhs) => lhs - rhs,
    [pls.times.value]: (lhs, rhs) => lhs * rhs,
    [pls.divide.value]: (lhs, rhs) => rhs == 0 ? 777 : lhs / rhs,
    [pls.power.value]: (lhs, rhs) => Math.pow(lhs, rhs),
    [pls.pickTheCutest.value]: cutest
};

function evaluate(store, node, memory) {
    if (node.termType === "Literal") {
        return node;
    }

    if (node.termType !== 'Quad') {
        let graphyTerm = graphy.term(node);
        let concise = graphyTerm.concise();

        if (memory[concise] !== undefined) {
            return memory[concise];
        }
    }

    if (node.termType !== "BlankNode") {
        console.error("ehhh -");
        return pls.NotABlankNode;
    }

    let evaluation = store.getQuads(node, pls._);
    if (evaluation.length != 1) return pls.NoEvaluation;

    evaluation = evaluation[0].object;

    if (evaluation.termType == "Literal") {
        return evaluation;
    } else if (evaluation.termType === "Quad") {
        if (pls.plus.equals(evaluation.predicate)
        || pls.minus.equals(evaluation.predicate)
        || pls.times.equals(evaluation.predicate)
        || pls.divide.equals(evaluation.predicate)
        || pls.power.equals(evaluation.predicate)
        || pls.pickTheCutest.equals(evaluation.predicate)
        ) {
            let left = evaluate(store, evaluation.subject, memory);
            let right = evaluate(store, evaluation.object, memory);

            if (left.termType !== "Literal"
                || right.termType !== "Literal"
                || !left.datatype.equals(xsd.integer)
                || !right.datatype.equals(xsd.integer)
            ) {
                return pls.InvalidOperandsForPlus;
            }

            let lhs = parseInt(left.value);
            let rhs = parseInt(right.value);

            return N3.DataFactory.literal(
                binaryOperators[evaluation.predicate.value](lhs, rhs)
            );
        } else {
            return pls.UnknownOperation;
        }
    } else {
        evaluate(store, evaluation, memory);
    }
}

function readInstruction(store, triple, memory) {
    const elements = unlist(store, triple);

    if (pls.print.equals(elements[0])) {
        let s = "";

        for (let i = 1 ; i != elements.length; ++i) {
            s += evaluate(store, elements[i], memory).value;

            if (i != elements.length -1) {
                s += " ";
            }
        }

        console.log(s);
    } else if (pls.affect.equals(elements[0])) {
        let destination = graphy.term(elements[1]).concise();
        let expression = evaluate(store, elements[2], memory);
        memory[destination] = expression;
    } else {
        console.error("Unknown function");
    }
}

function readInstructions(dataset, instructions) {
    let memory = {};

    let instructions_ = unlist(dataset, instructions);

    for (const instruction of instructions_) {
        readInstruction(dataset, instruction, memory);
    }
}

function readGraph(store) {
    const mainFunction = store.getQuads(null, rdf.type, pls.main_function);

    if (mainFunction.length !== 1) {
        console.error("No unique main function found");
        return 1;
    }

    const mainInstructions = store.getQuads(mainFunction[0].subject, pls.instructions);

    if (mainInstructions.length !== 1) {
        console.error("No unique instructions found");
        return 2;
    }

    readInstructions(store, mainInstructions[0].object);
}


function readFile(filepath) {
    const fs = require('fs');
    const trigContent = fs.readFileSync(filepath, 'utf-8');
    const parser = new N3.Parser();
    return parser.parse(trigContent);
}


const filename = process.argv[2];

const graph = new N3.Store();
graph.addQuads(readFile(filename));
readGraph(graph);


