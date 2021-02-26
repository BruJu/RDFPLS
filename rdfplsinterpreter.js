const N3 = require("n3");
const WT = require("@bruju/wasm-tree");
const namespace = require('@rdfjs/namespace');

const rdf = namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#", N3.DataFactory);
const pls = namespace("http://bruy.at/rdf/pls#", N3.DataFactory);

function giveFirst(dataset) {
    for (const quad of dataset) {
        return quad;
    }
    return null;
}

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

function travelPath(dataset, start, path) {
    for (let i = 0 ; i != path.length ; ++i) {
        start = giveFirst(dataset.match(start, path[i])).object;
    }

    return start;
}

function readInstructions(dataset, instructions) {
    let instructions_ = unlist(dataset, instructions);

    for (const instruction of instructions_) {
        readInstruction(dataset, instruction);
    }
}

function readGraph(dataset) {
    const mainFunction = dataset.match(null, rdf.type, pls.main_function);

    if (mainFunction.size !== 1) {
        console.error("No unique main function found");
        return 1;
    }

    const mainInstructions = dataset.match(giveFirst(mainFunction).subject, pls.instructions);

    if (mainInstructions.size !== 1) {
        console.error("No unique instructions found");
        return 2;
    }

    readInstructions(dataset, giveFirst(mainInstructions).object);
}


function readFile(filepath) {
    const fs = require('fs');
    const trigContent = fs.readFileSync(filepath, 'utf-8');
    // console.error(trigContent);
    const parser = new N3.Parser();
    return parser.parse(trigContent);
}


const filename = process.argv[2];

const graph = new WT.Dataset();
graph.addAll(readFile(filename));
readGraph(graph);


