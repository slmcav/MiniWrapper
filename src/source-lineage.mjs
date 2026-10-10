// P6 frozen source-file provenance, released with the manuscript bundle.
// Git blob SHA-1 values identify bytes in the public repository (not a human signature).
// The matching-file regression gate must be updated whenever the generator changes.
export const SOURCE_LINEAGE_SCHEMA='glsl-lab/source-lineage/1';
export const PINNED_REPOSITORY='slmcav/MiniWrapper';
export const SOURCE_SNAPSHOT_COMMIT='PENDING_SOURCE_FREEZE';
export const PINNED_SOURCE_BLOBS=Object.freeze([]);
export function exportSourceLineage(){
  return {schema:SOURCE_LINEAGE_SCHEMA,repository:PINNED_REPOSITORY,
    sourceSnapshotCommit:SOURCE_SNAPSHOT_COMMIT,
    hashAlgorithm:'git-blob-sha1',files:PINNED_SOURCE_BLOBS.map(x=>({...x})),
    note:'Source bytes identified for reproducibility, not identity, authorship, independent replication or peer review'};
}
