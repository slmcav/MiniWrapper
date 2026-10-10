// P6 frozen source-file provenance, released with the manuscript bundle.
// Git blob SHA-1 values identify bytes in the public repository (not a human signature).
// The matching-file regression gate must be updated whenever the generator changes.
export const SOURCE_LINEAGE_SCHEMA='glsl-lab/source-lineage/1';
export const PINNED_REPOSITORY='slmcav/MiniWrapper';
export const SOURCE_SNAPSHOT_COMMIT='6dcac03ae211b566aa668832e58f2a5d1fafac37';
export const PINNED_SOURCE_BLOBS=Object.freeze([
  {
    "path": "glsl-lab.html",
    "gitBlobSha1": "8ca1d66e44b4cf476bb1df8f8b1281032ed48f75"
  },
  {
    "path": "src/build-evidence.mjs",
    "gitBlobSha1": "1ca0436c617cfeb838a9c837e7c94a5ac1af3159"
  },
  {
    "path": "src/research-capture.mjs",
    "gitBlobSha1": "59c4dc5c8453d9220d159ec7760c5938ab7443f0"
  },
  {
    "path": "src/research-figures.mjs",
    "gitBlobSha1": "7ecdc1ecaa678ad62f944a06584c3a42aa678ca7"
  },
  {
    "path": "src/research-experiments.mjs",
    "gitBlobSha1": "5d4f392f58434e89ec84509597d4c2dc3288b1bb"
  },
  {
    "path": "src/research-replications.mjs",
    "gitBlobSha1": "4a6232ebde9cab1f1d5894d829401ac96c738d27"
  },
  {
    "path": "src/reference-registry.mjs",
    "gitBlobSha1": "4d7cfd396bcbdb238d7cc2d2936bbdcd7fc2ffd8"
  },
  {
    "path": "src/methodology-audit.mjs",
    "gitBlobSha1": "511168cfe193d6424ba64afd6d754325950a87d1"
  },
  {
    "path": "src/manuscript-engine.mjs",
    "gitBlobSha1": "69bbacddbc32187d12cb31fac507bf4d0cbaeda9"
  },
  {
    "path": "src/manuscript-render.mjs",
    "gitBlobSha1": "c96b3bab39b3d50ef9d06d4945f55939d5528e69"
  },
  {
    "path": "src/research-pdf.mjs",
    "gitBlobSha1": "bb95714d44653a487f92eab68ea7efcade2e74b5"
  },
  {
    "path": "src/scholarly-review.mjs",
    "gitBlobSha1": "98fea51214e352ab1d2699b08aa1565ae1363dc1"
  },
  {
    "path": "src/manuscript-verify.mjs",
    "gitBlobSha1": "dfadb7a2ff0048ec6c1fb887d89d762f86076c14"
  },
  {
    "path": "src/lab-manuscript.mjs",
    "gitBlobSha1": "059e34e270a8005d1da4883dd2156b1d9ae5c69e"
  },
  {
    "path": "src/lab-methodology.mjs",
    "gitBlobSha1": "e5e41f5678a0adf827ae631191dcccbd79535d18"
  },
  {
    "path": "src/lab-bundle-verify.mjs",
    "gitBlobSha1": "ebe31d4120bec0a72734029ed878d65b88af0552"
  },
  {
    "path": "scripts/verify-research-zip.mjs",
    "gitBlobSha1": "66db4a7b6b6f1704977a30611e90995cddf5879c"
  },
  {
    "path": "package.json",
    "gitBlobSha1": "bcff00ca93f79e5a607288dd47e0f77ce0e5228a"
  }
].map(record=>Object.freeze(record)));
export function exportSourceLineage(){
  return {schema:SOURCE_LINEAGE_SCHEMA,repository:PINNED_REPOSITORY,
    sourceSnapshotCommit:SOURCE_SNAPSHOT_COMMIT,
    hashAlgorithm:'git-blob-sha1',files:PINNED_SOURCE_BLOBS.map(x=>({...x})),
    note:'Source bytes identified for reproducibility, not identity, authorship, independent replication or peer review'};
}
