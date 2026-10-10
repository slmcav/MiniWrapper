import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {SOURCE_LINEAGE_SCHEMA,SOURCE_SNAPSHOT_COMMIT,PINNED_SOURCE_BLOBS,exportSourceLineage} from '../src/source-lineage.mjs';
test('P6 frozen producer source blobs exactly match checked-out files',async()=>{
  const unique=new Set();
  assert.match(SOURCE_SNAPSHOT_COMMIT,/^[a-f0-9]{40}$/);
  assert.ok(PINNED_SOURCE_BLOBS.length>=15);
  for(const item of PINNED_SOURCE_BLOBS){
    assert.match(item.gitBlobSha1,/^[a-f0-9]{40}$/);
    assert.ok(!unique.has(item.path),'Duplicate frozen source path');
    unique.add(item.path);
    const bytes=await readFile(join(process.cwd(),item.path));
    const digest=createHash('sha1')
      .update(Buffer.from('blob '+bytes.length+'\\0','utf8'))
      .update(bytes).digest('hex');
    assert.equal(digest,item.gitBlobSha1,'Source changed without issuing a new lineage record: '+item.path);
  }
  const manifest=exportSourceLineage();
  assert.equal(manifest.schema,SOURCE_LINEAGE_SCHEMA);
  assert.equal(manifest.sourceSnapshotCommit,SOURCE_SNAPSHOT_COMMIT);
  assert.equal(manifest.files.length,PINNED_SOURCE_BLOBS.length);
  assert.equal(manifest.hashAlgorithm,'git-blob-sha1');
});
