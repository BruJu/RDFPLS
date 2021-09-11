import { DatasetCore } from '@rdfjs/types';
import { executeFunction, unlist, changePrintEffect } from '../index';
import * as N3 from 'n3';
import fs from 'fs';
import path from 'path';
import assert from 'assert';

import namespace from '@rdfjs/namespace';
//const rdf = namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#", { factory: N3.DataFactory });
const pls = namespace("http://bruy.at/rdf/pls#"                    , { factory: N3.DataFactory });
const $dg = N3.DataFactory.defaultGraph();

function loadRDFPLSGraph(file: string): DatasetCore {
  const parser = new N3.Parser();
  const quads = parser.parse(fs.readFileSync(file, 'utf-8'));
  return new N3.Store(quads);
}

function findTestsToRun(graph: DatasetCore): DatasetCore {
  return graph.match(null, pls.check_the_output, null, $dg);
}

describe('RDFPLS on example programs', () => {
  const output: string[] = [];
  changePrintEffect(function(...strings: string[]) {
    output.push(strings.join(" "));
  });

  for (const file of fs.readdirSync(path.join(__dirname, 'programs'))) {
    if (!file.endsWith('.ttl')) continue;

    const realPath = path.join(__dirname, 'programs', file);
    const graph = loadRDFPLSGraph(realPath);

    const testsToRun = findTestsToRun(graph);

    if (testsToRun.size !== 0) {
      describe(file, () => {
        for (const testToRun of testsToRun) {
          it(testToRun.subject.value, () => {
            output.length = 0;
            if (testToRun.predicate.equals(pls.check_the_output)) {
              executeFunction(graph, testToRun.subject);

              let expected: string[] = [];
              if (testToRun.object.termType === 'Literal') {
                expected.push(testToRun.object.value);
              } else {
                expected = unlist(graph, testToRun.object).map(t => t.value);
              }
              
              assert.deepStrictEqual(output, expected);
            } else {
              throw Error("Unknown task " + testToRun.predicate.value);
            }
          });
        }
      });
    }
  }
});
