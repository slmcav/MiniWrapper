// Content-addressed export names. ID is stable for the frozen manuscript, not a random UI counter.
export const PDF_NAME_SCHEMA='glsl-lab/pdf-name/1';
const hex=/^[a-f0-9]{64}$/;
export async function pdfFilename(manuscriptSha256,pdf,subtle=globalThis.crypto?.subtle){
 if(!hex.test(manuscriptSha256))throw new TypeError('Verified manuscript SHA-256 required');
 if(!(pdf instanceof Uint8Array)||pdf.length<600||
   new TextDecoder().decode(pdf.subarray(0,5))!=='%PDF-')
   throw new TypeError('A generated PDF byte stream is required');
 if(!subtle||typeof subtle.digest!=='function')throw new TypeError('SHA-256 engine unavailable');
 const digest=await subtle.digest('SHA-256',pdf);
 const full=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
 return 'GLSL-'+manuscriptSha256.slice(0,32)+'_'+full+'.pdf';
}
export function assertPdfFilename(filename){
 if(!/^GLSL-[0-9a-f]{32}_[0-9a-f]{64}\.pdf$/.test(filename))
   throw new TypeError('PDF filename must contain a unique study ID and full SHA-256');
 return true;
}
