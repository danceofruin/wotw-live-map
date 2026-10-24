import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

// Use the same normalizer as the deployed browser, never a second schema.
const [statePath, modelPath='./model-atlas-v13.mjs']=process.argv.slice(2);
if(!statePath){console.error('Usage: node validate-state.mjs STATE.json [DEPLOYED-MODEL.mjs]');process.exit(2);}
try {
 const {normalize}=await import(pathToFileURL(resolve(modelPath)));
 const raw=JSON.parse(readFileSync(statePath,'utf8'));
 const state=normalize(raw);
 console.log('VALID: '+state.tokens.length+' tokens · '+state.revision);
} catch(error) {
 console.error('INVALID: '+error.message);process.exitCode=1;
}
