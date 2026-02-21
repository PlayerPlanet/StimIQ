Given PADS does **not** contain full clinician-rated MDS-UPDRS Part III motor scores, severity must be constructed as a **latent proxy** from available structure:

* Diagnosis group (PD vs others)
* Non-motor symptom questionnaire (PDNMS, 30 binary items)
* Demographic variables (age at diagnosis, disease duration if derivable)
* High-resolution IMU signals from standardized motor tasks

The key question is not “what is the true severity?” but:

> What continuous latent variable can be inferred from this dataset that behaves monotonically with disease burden?

Below are three progressively more principled constructions.

---

## 1. Simple Clinical Burden Score (Baseline Proxy)

Start from what is explicitly available.

### Step 1 — Non-motor burden index

Let
[
S_{NMS} = \frac{1}{30} \sum_{i=1}^{30} q_i
]
where each ( q_i \in {0,1} ).

This gives a normalized non-motor symptom burden in ([0,1]).

Non-motor burden correlates moderately with overall PD severity in clinical literature.

### Step 2 — Disease duration (if available)

If age at diagnosis is present:

[
\text{duration} = \text{current age} - \text{age at diagnosis}
]

Normalize duration:

[
S_{dur} = \frac{\text{duration} - \mu}{\sigma}
]

### Step 3 — Combine

[
S_{clinical} = \alpha S_{NMS} + \beta S_{dur}
]

Rescale to [-1, 1]:

[
\tilde{S} = 2 \cdot \frac{S - \min(S)}{\max(S) - \min(S)} - 1
]

This gives a first rough proxy.

Limitation: ignores motor data entirely.

---

## 2. Motor Severity from IMU Features (More Meaningful)

Since PADS contains structured motor tasks, you can extract features that correspond to canonical PD impairments:

### For tremor tasks:

* RMS acceleration magnitude
* Dominant frequency (4–6 Hz band power)
* Spectral entropy

### For bradykinesia tasks:

* Movement amplitude
* Mean velocity
* Inter-tap interval variability
* Movement smoothness (jerk metric)

### For postural tasks:

* Sway amplitude
* Variability

Construct a motor impairment vector:

[
\mathbf{x}_{motor} \in \mathbb{R}^d
]

Then:

### Option A — Unsupervised Latent Severity

Perform PCA or factor analysis across PD patients only.

First principal component often aligns with overall motor impairment.

[
S_{motor} = \text{PC}*1(\mathbf{x}*{motor})
]

Normalize to [-1,1].

This yields a **data-driven severity axis**.

### Option B — Distance from Healthy Manifold

Train a model on healthy controls:

* Fit Gaussian model or autoencoder
* Compute reconstruction error or Mahalanobis distance

[
S_{motor} = \text{distance from healthy distribution}
]

This directly measures “deviation from normal motor function.”

This has appealing geometric interpretation.

---

## 3. Latent Disease Severity via Joint Modeling (Most Principled)

Construct severity as a latent variable inferred from both motor and non-motor data.

You can model:

[
\mathbf{x}*{motor}, \mathbf{q}*{NMS} \sim p(\cdot | Z)
]

where ( Z ) is latent severity.

Implementation options:

### A. Factor Analysis / Probabilistic PCA

Treat severity as 1D latent factor.

### B. Variational Autoencoder

Constrain latent space to 1 dimension.

### C. Supervised ranking model

Train a model to separate:

* Healthy controls
* Differential diagnoses
* PD patients

Then use the pre-softmax logit as continuous severity.

This is often surprisingly stable.

---

## Recommended Practical Approach

Given hackathon constraints:

1. Extract motor features per task
2. Standardize
3. Fit PCA on PD subjects only
4. Use PC1 as motor severity
5. Add weighted NMS burden

Final:

[
S = \gamma S_{motor} + (1-\gamma) S_{NMS}
]

Rescale to [-1,1].

---

## Important Conceptual Clarification

You are not estimating “true disease stage.”

You are constructing:

> A monotonic, continuous embedding that correlates with symptom burden.

The proxy is valid if it:

* Separates healthy vs PD
* Orders PD patients plausibly by impairment
* Correlates with non-motor burden
* Shows internal consistency across tasks

---

## If You Want It More Rigorous

Frame it as:

> Learning a continuous digital biomarker of motor impairment from wearable data.

You do not need the word “severity” if it invites clinical objections.

---

If useful, I can next:

* Outline exact motor features to extract from PADS tasks
* Propose a loss function for training a neural model to regress this proxy
* Or suggest a method to validate whether your proxy behaves sensibly without ground truth MDS-UPDRS.
