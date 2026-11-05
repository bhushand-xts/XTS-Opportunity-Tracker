const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('../node_modules/dotenv');
const { Client } = require('../node_modules/pg');
let client, documentId;
async function main() {
  const env = dotenv.parse(await fs.readFile(path.join(__dirname, '../services/opportunity/.env')));
  const response = await fetch(env.USER_SERVICE_URL || 'http://localhost:4001/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: '{ userList { id roleId isActive } }' }) });
  const directory = await response.json();
  const owner = directory.data?.userList?.find(user => user && user.isActive !== false && [24,20].includes(user.roleId));
  if (!owner) throw new Error('NO_ELIGIBLE_SMOKE_TEST_OWNER');
  const headers = { 'x-user-id': String(owner.id), 'x-extraction-secret': env.EXTRACTION_SERVICE_SECRET };
  // Synthetic PDF with two explicit response requests. No user document is read or submitted.
  const stream = 'BT /F1 12 Tf 72 720 Td (1. Describe your security controls.) Tj 0 -24 Td (2. Explain your delivery approach.) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf='%PDF-1.4\n'; const offsets=[];
  objects.forEach((object,index)=>{ offsets.push(Buffer.byteLength(pdf)); pdf+=`${index+1} 0 obj\n${object}\nendobj\n`; });
  const xref=Buffer.byteLength(pdf); pdf+=`xref\n0 6\n0000000000 65535 f \n`+offsets.map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const form=new FormData(); form.append('file',new Blob([pdf],{type:'application/pdf'}),'synthetic-extraction-check.pdf');
  const upload=await fetch('http://localhost:4003/api/question-extractions',{method:'POST',headers:{...headers,'x-idempotency-key':crypto.randomUUID()},body:form});
  const accepted=await upload.json();
  if (!upload.ok) throw new Error(`UPLOAD_${upload.status}_${accepted.code || 'FAILED'}`);
  documentId=accepted.document.id; console.log('Synthetic PDF uploaded and extraction job queued.');
  let previous=''; const until=Date.now()+150000;
  while(Date.now()<until) {
    const status=await fetch(`http://localhost:4003/api/question-extractions/${accepted.jobId}`,{headers});
    const job=await status.json();
    if(job.state!==previous){ console.log('Extraction state:',job.state); previous=job.state; }
    if(job.state==='FAILED') throw new Error(job.error || 'EXTRACTION_FAILED');
    if(job.state==='SUCCEEDED') {
      if(job.questions.length!==2) throw new Error('UNEXPECTED_QUESTION_COUNT');
      console.log('Live Groq verification passed:',job.questions.length,'source-verified questions.');
      await fs.writeFile(path.join(__dirname,'extraction-activation-result.json'), JSON.stringify({state:'SUCCEEDED',synthetic:true,questionCount:job.questions.length,questions:job.questions.map(q=>({text:q.text,sourceReference:q.sourceReference})),verifiedAt:new Date().toISOString()},null,2));
      client=new Client({host:env.DB_HOST,port:Number(env.DB_PORT||5432),database:env.DB_NAME,user:env.DB_USER,password:env.DB_PASSWORD});await client.connect();
      const removed=await client.query('DELETE FROM question_documents WHERE id=$1 AND owner_id=$2 AND opportunity_id IS NULL RETURNING id',[documentId,owner.id]);
      if(removed.rowCount===1 && /^[0-9a-f-]{36}$/.test(documentId)) {
        const root=path.resolve(env.DOCUMENT_STORAGE_ROOT), target=path.resolve(root,documentId);
        if(path.dirname(target)!==root) throw new Error('INVALID_CLEANUP_PATH');
        await fs.rm(target,{recursive:true,force:true});console.log('Synthetic upload/job cleaned up; no opportunity was created or changed.');
      }
      return;
    }
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
  throw new Error('EXTRACTION_CHECK_TIMEOUT');
}
main().catch(error=>{console.error('Synthetic check:', /^[A-Z_0-9]+$/.test(error.message||'')?error.message:'CHECK_FAILED');process.exitCode=1;}).finally(()=>client?.end());
