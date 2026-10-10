// Deterministic inputs and native TeX build provenance.
const ok=(p,m)=>{if(!p)throw new TypeError(m);};
export const TEX_BUILD_RECEIPT_SCHEMA='glsl-lab/native-latex-build/1';
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
  'tex_digest="$(sha256sum manuscript.tex | cut -d " " -f1)"',
  'shader_digest="$(sha256sum shader.glsl | cut -d " " -f1)"',
  'compiler="$(pdflatex --version | sed -n \'1p\')"',
  'output="GLSL-'+id+'_$digest.pdf"',
  'cp manuscript.pdf "$output"',
  'printf \'{"schema":"'+TEX_BUILD_RECEIPT_SCHEMA+'","engine":"pdfLaTeX","compiler":"%s","sourceDateEpoch":%d,"manuscriptSha256":"'+record.sha256+'","uniqueId":"'+id+'","texSha256":"%s","shaderSha256":"%s","pdfSha256":"%s","pdfFilename":"%s"}\\n\' "$compiler" '+epoch+' "$tex_digest" "$shader_digest" "$digest" "$output" > build-receipt.json',
  'printf "PDF: %s\\nReceipt: build-receipt.json\\n" "$output"'
 ].join('\n')+'\n';
 const powershell=[
  '$ErrorActionPreference = "Stop"',
  'Set-Location -LiteralPath $PSScriptRoot',
  '$env:SOURCE_DATE_EPOCH = "'+epoch+'"',
  '$env:FORCE_SOURCE_DATE = "1"',
  'latexmk -pdf -g -interaction=nonstopmode -halt-on-error -no-shell-escape manuscript.tex',
  'if ($LASTEXITCODE -ne 0) { throw "LaTeX compilation failed" }',
  '$digest = (Get-FileHash -LiteralPath "manuscript.pdf" -Algorithm SHA256).Hash.ToLowerInvariant()',
  '$texDigest = (Get-FileHash -LiteralPath "manuscript.tex" -Algorithm SHA256).Hash.ToLowerInvariant()',
  '$shaderDigest = (Get-FileHash -LiteralPath "shader.glsl" -Algorithm SHA256).Hash.ToLowerInvariant()',
  '$pdfName = "GLSL-'+id+'_" + $digest + ".pdf"',
  '$versionText = (& pdflatex --version | Select-Object -First 1).Trim()',
  'Copy-Item -LiteralPath "manuscript.pdf" -Destination $pdfName -Force',
  '$receipt = [ordered]@{',
  ' schema = "'+TEX_BUILD_RECEIPT_SCHEMA+'"',
  ' engine = "pdfLaTeX"',
  ' compiler = $versionText',
  ' sourceDateEpoch = '+epoch,
  ' manuscriptSha256 = "'+record.sha256+'"',
  ' uniqueId = "'+id+'"',
  ' texSha256 = $texDigest',
  ' shaderSha256 = $shaderDigest',
  ' pdfSha256 = $digest',
  ' pdfFilename = $pdfName',
  '}',
  '$receipt | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath "build-receipt.json" -Encoding UTF8',
  'Write-Output ("PDF: " + $pdfName)',
  'Write-Output "Receipt: build-receipt.json"'
 ].join('\r\n')+'\r\n';
 return {bash,powershell};
}
