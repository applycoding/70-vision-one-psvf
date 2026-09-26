# Phase 1 Cyber and Supply Chain Evidence

Worker: `70-vision-one-psvf`
Scanned tree: `/Users/applycoding/-code/70-pdf-video/2-web-app/1-user-web-app`
Evidence generation time (SBOM metadata timestamp): 2026-09-26T00:00:52.067Z
This document does not claim FedRAMP authorization.

## 1. Provenance and honesty

| Item | Status | Value |
| --- | --- | --- |
| Git repository URL | Pending | This directory is not a git repository. No `.git` directory exists under `1-user-web-app`, `2-web-app`, or `70-pdf-video`. `/usr/bin/git` also exits before any command because the Xcode license has not been accepted, so a remote URL cannot be read. |
| Full commit SHA of scanned tree | Pending | No git repository, so there is no commit SHA to record. |
| Freeze tag | Pending | No git repository and no tag. |
| CI workflow and run IDs | local scan only | No `.github/workflows` directory. Scans were run on this machine against the lockfile below. |
| Evidence generation date | Completed | 2026-09-26T00:00:52.067Z (CycloneDX metadata timestamp). |

Local scan hashes (sha256):

| File | sha256 |
| --- | --- |
| `artifacts/sbom.cdx.json` | `2ee32b2224a3e0919724287943d9985fb851f835c92c78702a979d6908835a2e` |
| `artifacts/licenses.json` | `f63e478e8a3eb76ec21555fab1c60ff638726b21a35eef13d6f3ff0e74a81a76` |
| `artifacts/npm-audit.json` | `2a7ac129c24aa88693fd0a34e1590599c1bf7cccf023a29de0a639b4ccc7bb62` |

What is still unresolved: git URL, commit SHA, freeze tag, and any CI run ID. Those stay Pending because they do not exist for this tree. Everything else in this file is taken from the lockfile, the three scan JSON files, or the live wrangler config cited in section 8.

The packaging tree `/workspace/psvf/submission/` was not present. No `rebuild_submission_pdfs.py` was found, so no PDF was rebuilt.

## 2. CycloneDX SBOM

| Item | Status | Value |
| --- | --- | --- |
| Generator | Completed | `npx --yes @cyclonedx/cyclonedx-npm --output-file artifacts/sbom.cdx.json` |
| Tool version | Completed | `@cyclonedx/cyclonedx-npm` 6.0.1, `@cyclonedx/cyclonedx-library` 10.3.0, npm 11.16.0, specVersion 1.6 |
| Lockfile path | Completed | `/Users/applycoding/-code/70-pdf-video/2-web-app/1-user-web-app/package-lock.json` |
| Lockfile sha256 | Completed | `df15ebe62107d9265201dc21186dad0961f7a9986d0db7367abfde6b61fffe3d` |
| Lockfile bytes | Completed | 332685 |
| Component count | Completed | 459 (CycloneDX `components` array; root metadata component `1-user-web-app` 0.1.0 is separate) |
| Timestamp | Completed | 2026-09-26T00:00:52.067Z |
| Serial | Completed | `urn:uuid:1bd7f45d-b96d-400f-ab7e-0f21b36718fe` |
| Generated SBOM attached | Yes | `1-user-web-app/artifacts/sbom.cdx.json` |

## 3. License inventory

| Item | Status | Value |
| --- | --- | --- |
| Generator | Completed | `npx --yes license-checker-rseidelsohn --json --out artifacts/licenses.json` |
| Tool version | Completed | license-checker-rseidelsohn 4.4.2 |
| Package rows | Completed | 487 |
| Output | Completed | `1-user-web-app/artifacts/licenses.json` |
| Counsel fail-on policy | Not configured | This scan did not apply a counsel fail-on rule. No policy was invented. |

Family counts (exact license string, one row per installed package record):

| Family | Count |
| --- | --- |
| MIT | 410 |
| Apache-2.0 | 27 |
| ISC | 17 |
| BSD-2-Clause | 8 |
| BSD-3-Clause | 5 |
| other | 19 |
| UNKNOWN | 1 |

The other bucket is: MPL-2.0 (9), MIT OR Apache-2.0 (3), CC0-1.0 (2), LGPL-3.0-or-later (1), Python-2.0 (1), CC-BY-4.0 (1), BlueOak-1.0.0 (1), 0BSD (1).

Copyleft (non-permissive relative to MIT, Apache-2.0, BSD, and ISC):

| Package | License |
| --- | --- |
| `@img/sharp-libvips-darwin-arm64@1.3.3` | LGPL-3.0-or-later |
| `@resvg/resvg-wasm@2.4.0` | MPL-2.0 |
| `@vercel/og@0.8.6` | MPL-2.0 |
| `axe-core@4.13.0` | MPL-2.0 |
| `lightningcss@1.32.0` | MPL-2.0 |
| `lightningcss@1.33.0` | MPL-2.0 |
| `lightningcss-darwin-arm64@1.32.0` | MPL-2.0 |
| `lightningcss-darwin-arm64@1.33.0` | MPL-2.0 |
| `mediabunny@1.60.0` | MPL-2.0 |
| `satori@0.16.0` | MPL-2.0 |

UNKNOWN:

| Package | License string |
| --- | --- |
| `1-user-web-app@0.1.0` | UNLICENSED |

That UNKNOWN row is the private application package itself. Its `package.json` has no `license` field. It is not a third-party dependency.

## 4. Vulnerability scan

| Item | Status | Value |
| --- | --- | --- |
| Generator | Completed | `npm audit --json` (npm 11.16.0) |
| Output | Completed | `1-user-web-app/artifacts/npm-audit.json` |
| auditReportVersion | Completed | 2 |
| Critical | Completed | 0 |
| High | Completed | 0 |
| Medium | Completed | 0 (`moderate` in the npm report) |
| Low | Completed | 0 |
| Info | Completed | 0 |
| Total advisories | Completed | 0 |

npm audit dependency totals recorded in the same file: prod 128, dev 371, optional 143, peer 42, peerOptional 0, total 628. The `vulnerabilities` object is empty. No advisory id was returned, so none are listed.

## 5. Kokoro

Not packaged in this build. `kokoro` does not appear in `package-lock.json` for Worker `70-vision-one-psvf`.

## 6. Named stack versions

Versions are the exact `version` fields in `package-lock.json` (`lockfileVersion` 3). vinext is the deploy adapter.

| Package | Status | Version |
| --- | --- | --- |
| next | Packaged | 16.3.6 |
| serwist | Packaged | 9.5.12 |
| vinext | Packaged | 1.0.0-beta.12 |
| @vinext/cloudflare | Packaged | 1.0.0-beta.10 |
| mediabunny | Packaged | 1.60.0 |
| react | Packaged | 19.3.0 |
| react-dom | Packaged | 19.3.0 |
| wrangler | Packaged | 4.140.0 |
| pdfjs-dist | Not packaged in this build | |
| ffmpeg.wasm | Not packaged in this build | |
| @ffmpeg/ffmpeg | Not packaged in this build | |
| dexie | Not packaged in this build | |
| jsdiff | Not packaged in this build | |
| diff | Not packaged in this build | |
| diff-match-patch | Not packaged in this build | |
| better-auth | Not packaged in this build | |
| @sentry/nextjs | Not packaged in this build | |
| @sentry/node | Not packaged in this build | |
| kokoro | Not packaged in this build | |
| @cyclonedx/cyclonedx-npm | Not packaged in this build | Invoked with `npx --yes` for this scan only. Version used: 6.0.1. |
| license-checker-rseidelsohn | Not packaged in this build | Invoked with `npx --yes` for this scan only. Version used: 4.4.2. |

vinext confirmed: yes. `package.json` depends on `vinext` and `@vinext/cloudflare`. `wrangler.jsonc` sets `"name": "70-vision-one-psvf"` and `"main": "vinext/server/fetch-handler"`. OpenNext is not the adapter.

R-DEPLOY-1: Closed. The deploy path for Worker `70-vision-one-psvf` is vinext plus `@vinext/cloudflare`, at the lockfile versions above.

The sibling pipeline worker `70-vision-one-psvf-pipeline` is a separate package. It was not included in this lockfile scan.

## 7. Remediation register

No Critical or High advisories were returned by `npm audit --json`. No Medium advisories were returned either. There is no placeholder row. No remediation owner is assigned because there is no advisory to assign.

| Advisory id | Package | Severity | Status |
| --- | --- | --- | --- |
| none | none | none | npm audit 2026-09-26 reported 0 critical, 0 high, 0 moderate, 0 low, 0 info |

## 8. Measured job cite

Primary job:

Job: bd3c0249-9115-4929-96c4-3d7c5ca57785
3:13 (193.4 s); Whisper 0.964; full Fig 5-1 pdf-figure; Lucid Origin not used
Job: https://70-vision-one-psvf.applycoding.workers.dev/jobs/bd3c0249-9115-4929-96c4-3d7c5ca57785
Factory: https://70-vision-one-psvf.applycoding.workers.dev/demos/factory
D1 psvf-jobs; R2 psvf-videos; Workflow 70-vision-one-psvf-pipeline
Worker 70-vision-one-psvf

Live pipeline wrangler (`pipeline/wrangler.jsonc`) records D1 `database_name` `psvf-jobs`, R2 `bucket_name` `psvf-artifacts`, workflow `psvf-proc-edg-001` class `PsvfJob`, worker name `70-vision-one-psvf-pipeline`. The R2 name in that file is `psvf-artifacts`. This scan did not create or rename a bucket called `psvf-videos`.

Prior job 3937d4e6-6bac-43a7-82b2-191d82ceacdd is a footnote only. It is not the primary measured cite.

## 9. Conclusion

Completed from the live lockfile of Worker `70-vision-one-psvf`: CycloneDX SBOM (459 components), license inventory (487 rows), and npm audit (0 advisories at every severity). vinext is the confirmed deploy adapter, so R-DEPLOY-1 is closed. Kokoro, pdfjs-dist, ffmpeg.wasm, dexie, jsdiff, diff-match-patch, better-auth, and Sentry are not packaged in this build.

Still Pending, and only these: git repository URL, full commit SHA, and freeze tag, because this tree is not a git repository. CI run IDs do not exist; the supply-chain scans are local scan only, identified by the three sha256 values in section 1.
