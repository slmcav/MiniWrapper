// P6 frozen source-file provenance, released with the manuscript bundle.
// Git blob SHA-1 values identify bytes in the public repository (not a human signature).
// The matching-file regression gate must be updated whenever the generator changes.
export const SOURCE_LINEAGE_SCHEMA='glsl-lab/source-lineage/1';
export const PINNED_REPOSITORY='slmcav/MiniWrapper';
export const SOURCE_SNAPSHOT_COMMIT='d8e4e953493a344fb286ab6e7a1aca80cbc98029';
export const PINNED_SOURCE_BLOBS=Object.freeze([
  {
    "path": "glsl-lab.html",
    "gitBlobSha1": "75f6e9484bb799072abdb377a7917ae65a9387bf"
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
    "gitBlobSha1": "5f4c2d95e9c1358d5b3b644929d5c2b376f9c4ef"
  },
  {
    "path": "src/manuscript-engine.mjs",
    "gitBlobSha1": "baa7a84de20e434d174f3147ee05e3544ea0aaac"
  },
  {
    "path": "src/manuscript-render.mjs",
    "gitBlobSha1": "2d2cda4375cc7e4f90ddada4af06fe1de822f042"
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
    "gitBlobSha1": "f2accb95a15f380b00f412cc098363777ab3ecd9"
  },
  {
    "path": "src/lab-manuscript.mjs",
    "gitBlobSha1": "4fce59369d182a3f0f5dcde577c74a9e5cb60708"
  },
  {
    "path": "src/lab-methodology.mjs",
    "gitBlobSha1": "bf1c217a4b2027b5eb628fe4c16651657f3483a9"
  },
  {
    "path": "src/lab-bundle-verify.mjs",
    "gitBlobSha1": "cd9a80548de8ec9ce3a37a450b96aacb9fb24184"
  },
  {
    "path": "scripts/verify-research-zip.mjs",
    "gitBlobSha1": "66db4a7b6b6f1704977a30611e90995cddf5879c"
  },
  {
    "path": "src/source-claim-crosswalk.mjs",
    "gitBlobSha1": "17e616ca5627fca4746f86d73f851f87e07db7b1"
  },
  {
    "path": "package.json",
    "gitBlobSha1": "bcff00ca93f79e5a607288dd47e0f77ce0e5228a"
  },
  {
    "path": "src/source-review-dossier.mjs",
    "gitBlobSha1": "6409ec558b2c0ee2305f4ef8cf1b6d6289eb83cf"
  },
  {
    "path": "src/lab-source-review.mjs",
    "gitBlobSha1": "c60c26a5587e877739abc42bd182168ebb4ae60b"
  },
  {
    "path": "src/p8-methods-evidence.mjs",
    "gitBlobSha1": "6eeb378d88f2785583cf1de557e1d76053e664e9"
  },
  {
    "path": "src/lab-p8-methods.mjs",
    "gitBlobSha1": "147eb124f1e85ee4750b96e0088f9ec7d527bda7"
  },
  {
    "path": "docs/P8_EVIDENCE_REGISTER.json",
    "gitBlobSha1": "a9a16c8ce785cf42a21cd22052342d51e1af816f"
  }
,
  {
    "path": "src/graph-ui.mjs",
    "gitBlobSha1": "63d49666b8a42e2a1e83cc11c0ff44a213e301e9"
  },
  {
    "path": "src/lab-experiments.mjs",
    "gitBlobSha1": "6178925d032a4467550129213d11c5bc8fb51d41"
  },
  {
    "path": "src/lab-replications.mjs",
    "gitBlobSha1": "de30b36465c43a36b19d788ac859db00458cab02"
  },
  {
    "path": "src/research-source-policy.mjs",
    "gitBlobSha1": "a0674f12726930ea684b65d9604ae895dbaf79ef"
  },
  {
    "path": "src/manuscript-latex.mjs",
    "gitBlobSha1": "5006fe8181e72ddffc173f056eea8cf8a83932eb"
  },
  {
    "path": "src/latex-build-scripts.mjs",
    "gitBlobSha1": "50468606e6945110420859415828ad6f881e6673"
  },
  {
    "path": "src/pdf-filename.mjs",
    "gitBlobSha1": "0a2608262946f0f36964c2ce704f0df04202e6f1"
  },
  {
    "path": "src/lab-workflow-guide.mjs",
    "gitBlobSha1": "3dc8012138ccb9b51dccad66f639a64cdb5f9284"
  }
].map(record=>Object.freeze(record)));
export function exportSourceLineage(){
  return {schema:SOURCE_LINEAGE_SCHEMA,repository:PINNED_REPOSITORY,
    sourceSnapshotCommit:SOURCE_SNAPSHOT_COMMIT,
    hashAlgorithm:'git-blob-sha1',files:PINNED_SOURCE_BLOBS.map(x=>({...x})),
    note:'Source bytes identified for reproducibility, not identity, authorship, independent replication or peer review'};
}
