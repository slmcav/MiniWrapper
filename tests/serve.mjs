import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const base=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8'};
createServer(async(req,res)=>{
  try {
    const path=new URL(req.url,'http://localhost').pathname;
    if(!/^\/(index\.html|glsl-lab\.html|src\/(expression-graph|build-evidence|project-store|lab-projects)\.mjs)$/.test(path)){
      res.writeHead(404);res.end('Not found');return;
    }
    const file=resolve(base,path.slice(1));
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    res.end(data);
  } catch(error){res.writeHead(500);res.end(String(error.message));}
}).listen(4173,'127.0.0.1',()=>console.log('MiniWrapper tests: http://127.0.0.1:4173'));
