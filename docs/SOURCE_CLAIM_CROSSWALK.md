# Primary-source claim crosswalk — shader manuscript

**Research checkpoint:** October 10, 2026  
**Scope:** Support only statements present in the published source metadata, normative section, or publicly available abstract. This is **not** an independently signed scholarly source audit, nor a full-text review of every reference.

| Claim in the present draft | Independent source and actual available supporting material | Supported inference | Boundary and pending research |
|---|---|---|---|
| The shader is evaluated against GLSL ES 3.00 language conventions | Khronos Group, *The OpenGL ES Shading Language*, language version 3.00, revision 6, dated January 29, 2016; [official specification](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf) | The referenced technical document is the GLSL ES 3.00 specification | Specification metadata does **not** establish that the generated code conforms, that shader results are portable between graphics devices, or that compilation by one WebGL driver implies independent runtime validation |
| WebGL2 provides pixel readback into an array of bytes | Khronos, [WebGL 2.0 specification](https://registry.khronos.org/webgl/specs/latest/2.0/), section **Reading back pixels**, describes `readPixels` ArrayBufferView overloads, its permitted destination and error conditions | WebGL2 includes API-level framebuffer readback behavior and defined error conditions. The editor draft notes that a CPU readback can be blocking | A successful readback is **not** proof of an independent experimental replicate, physical hardware invariance, consistent display color calibration or original researcher identity |
| Computer-experiment design requires an explicit model, treatment choice and uncertainty assumptions | Sacks, J., Welch, W. J., Mitchell, T. J., and Wynn, H. P. (1989). [*Design and Analysis of Computer Experiments*](https://doi.org/10.1214/ss/1177012413), *Statistical Science*, 4(4), 409–423; published abstract | The abstract explains deterministic code outputs, statistical models for emulator/predictor construction, choice of inputs and uncertainty of predictions **under its modeling assumptions** | Its methodology does **not** justify claiming that three or nine serial GPU framebuffer captures constitute statistically independent trial units or support reported significance |
| Historical live-coded procedural shader tools existed before GLSL Lab | Jeremias Vila, P., and Quilez, I. (2013), [*Shadertoy: live coding for reactive shaders*](https://www.poljeremias.com/publication/siggraph2013/), the author's publication page names the work and describes code-driven reactive GLSL visuals | The creators' own published abstract substantiates its 2013 SIGGRAPH presentation and general theme | **Quarantined from generated manuscripts:** reconcile exact ACM primary publisher metadata and publication type, check related-work scope and full text, then independently assess appropriate citation. Authorship is listed as **Pol Jeremias Vila** by the author's page and must not be conflated with a differently formatted catalog name |
| Procedural noise literature is relevant only when the analyzed shader implements a corresponding noise technique | Lagae et al. (2010), [*A Survey of Procedural Noise Functions*](https://doi.org/10.1111/j.1467-8659.2010.01827.x), *Computer Graphics Forum*, 29(8) | Publication metadata establish a survey that may help contextualize an independently mapped procedural noise operator | Neither a shader's visual appearance nor the fact it uses fragment processing is sufficient to claim a noise technique is implemented; detailed operator-to-literature crosswalk remains to be done |

## Evidence classes, not approvals

**Primary registry/specification:** the Khronos links establish the referenced *technical contract*. They do not certify any particular experiment.

**Publisher article metadata/abstract:** the Sacks article's abstract establishes the purpose of its modeling framework. To apply its statistical framework, a study must establish and defend the framework's assumptions; this project has not yet done so.

**Creator's publication record:** the Jeremias Vila/Quilez record is stronger than a generic web summary for the fact that the creators presented the work, but it is **not a substitute** for reconciling the ACM article record and manuscript-specific related-work interpretation. The citation remains quarantined.

**Reviewer-declared passage notes:** GLSL Lab P7 can now record a claim, source, section/page, and a declared human reader's interpretation with a SHA-256 evidence checksum. That verifies the **content of the note** when reimported. It does not independently verify the reader, whether the cited passage was actually examined, or the scholarly conclusion.

## Next scientific operations

Before making a substantive claim that a graphics method is new, crosswalk the actual shader/typed graph operators to primary prior art, define a reproducible comparison protocol and independent trial unit, record relevant GPU/platform variables, and have identifiable subject-matter reviewers inspect the claim and its sources. Existing screenshot/single-frame evidence is descriptive, and the academic publication authorization flag must remain false.

The approved visual-product design image and all its derivatives remain outside the GitHub repository.
