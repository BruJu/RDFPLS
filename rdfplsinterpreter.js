const N3 = require("n3");
const namespace = require('@rdfjs/namespace');

const rdf = namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#", N3.DataFactory);
const pls = namespace("http://bruy.at/rdf/pls#", N3.DataFactory);

function unlist(store, head) {
    const elements = [];

    while (!rdf.nil.equals(head)) {
        elements.push(travelPath(store, head, [rdf.first]));
        head = travelPath(store, head, [rdf.rest]);
    }

    return elements;
}

function readInstruction(store, triple) {
    const elements = unlist(store, triple);

    if (pls.print.equals(elements[0])) {
        if (elements[1].termType == "Literal") {
            console.log(elements[1].value);
        } else {
            console.error("Unknown parameter");
        }
    } else {
        console.error("Unknown function");
    }
}

function travelPath(store, start, path) {
    for (let i = 0 ; i != path.length ; ++i) {
        start = store.getQuads(start, path[i])[0].object;
    }

    return start;
}

function readInstructions(store, instructions) {
    let instructions_ = unlist(store, instructions);

    for (const instruction of instructions_) {
        readInstruction(store, instruction);
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
    // console.error(trigContent);
    const parser = new N3.Parser();
    return parser.parse(trigContent);
}


const filename = process.argv[2];

const graph = new N3.Store(readFile(filename));
readGraph(graph);


