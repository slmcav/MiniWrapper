// Reproducible native TeX builds bundled alongside the verified study.
const ok=(p,m)=>{if(!p)throw new TypeError(m);};
export function latexBuildScripts(record){
 ok(record&&/^[a-f0-9]{64}$/.test(record.sha256),'Frozen manuscript ID required');
 const id=record.sha256.slice(0,32),epoch=Math.floor(Date.parse(record.generatedAt)/1000);
 ok(Number.isSafeInteger(epoch)&&epoch>0,'UTC manuscript timestamp required');
 const bash=[
  '#!/usr/bin/env bash','set -euo pipefail','cd "$(dirname "$0")"',
  'export SOURCE_DATE_EPOCH='+epoch,'export FORCE_SOURCE_DATE=1',
  'latexmk -pdf -g -interaction=nonstopmode -halt-on-error -no-shell-escape manuscript.tex',
  'test -s manuscript.pdf',
  'digest="$(sha256sum manuscript.pdf | cut -d " " -f1)"',
  'cp manuscript.pdf "GLSL-'+id+'_$digest.pdf"',
  'printf "PDF: GLSL-'+id+'_%s.pdf\\n" "$digest"'
 ].join('\n')+'\n';
 const powershell=[
  '$ErrorActionPreference = "Stop"','Set-Location -LiteralPath $PSScriptRoot',
  '$env:SOURCE_DATE_EPOCH = "'+epoch+'"','$env:FORCE_SOURCE_DATE = "1"',
  'latexmk -pdf -g -interaction=nonstopmode -halt-on-error -no-shell-escape manuscript.tex',
  'if ($LASTEXITCODE -ne 0) { throw "LaTeX compilation failed" }',
  '$digest = (Get-FileHash -LiteralPath "manuscript.pdf" -Algorithm SHA256).Hash.ToLowerInvariant()',
  '$outputName = "GLSL-'+id+'_" + $digest + ".pdf"',
  'Copy-Item -LiteralPath "manuscript.pdf" -Destination $outputName -Force',
  'Write-Output ("PDF: " + $outputName)'
 ].join('\r\n')+'\r\n';
 return {bash,powershell};
}
