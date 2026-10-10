#!/usr/bin/env node
// Offline reproducibility check for an exported GLSL Lab manuscript research ZIP.
// Node.js 22+. No dependencies, network access, application login, or browser GPU.
import {readFile,writeFile} from 'node:fs/promises';
import {verifyManuscriptZip} from '../src/manuscript-verify.mjs';
const args=process.argv.slice(2);
if(args.length<1||args.length>3||args.includes('--help')||args.includes('-h')){
  process.stdout.write('Usage: node scripts/verify-research-zip.mjs <manuscript.zip> [--receipt <output.json>]\n');
  process.stdout.write('Verifies archived source receipts, entire pixel evidence, citations, PDF and review packet. No publication approval.\n');
  process.exitCode=args.includes('--help')||args.includes('-h')?0:2;
}else{
  try{
    if(args.length>1&&(args.length!==3||args[1]!=='--receipt'||!args[2]))
      throw new Error('Optional receipt syntax is --receipt <output.json>');
    const bytes=new Uint8Array(await readFile(args[0]));
    const verification=await verifyManuscriptZip(bytes);
    const receipt={...verification,verifiedAt:new Date().toISOString(),
      archivePath:args[0],tool:'MiniWrapper offline research ZIP verifier (Node.js 22+)'};
    process.stdout.write('PASS: source study, complete images, PDF, citations and unsigned review handoff all reproduce.\n');
    process.stdout.write('Manuscript SHA-256: '+verification.manuscriptSha256+'\n');
    process.stdout.write('Study SHA-256: '+verification.studySha256+'\n');
    process.stdout.write('Frames: '+verification.sourceFiguresVerified+
      ', audited files: '+verification.inventoryEntries+'\n');
    process.stdout.write('Scientific publication clearance: NOT ESTABLISHED\n');
    if(args[2])await writeFile(args[2],JSON.stringify(receipt,null,2)+'\n');
  }catch(error){
    process.stderr.write('FAIL: '+String(error?.message||error)+'\n');
    process.exitCode=1;
  }
}
