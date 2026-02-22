# StimIQ — Data-Driven DBS Optimisation for Parkinson's Disease

StimIQ is a clinician-facing decision-support system for Deep Brain Stimulation (DBS) programming in Parkinson's disease. The platform integrates a physics-informed tremor simulation pipeline, Bayesian optimisation for stimulation parameter recommendation, and an LLM-based medical agent that produces interpretable, human-readable explanations of model decisions.

A key differentiator of StimIQ is the use of pre-checkup data — including wearable IMU measurements and patient-reported quality-of-life scores — to personalise treatment recommendations. This approach aims to reduce reliance on scarce specialist time and support more equitable access to optimal DBS care.

## Features

| Component | Description |
|---|---|
| **Simulation** | Full-loop biophysical tremor simulator grounded in a basal ganglia–thalamocortical mean-field model |
| **Bayesian Optimisation** | Sample-efficient parameter search over stimulation amplitude, frequency, and pulse width |
| **Loss Model** | Learned surrogate mapping IMU-derived tremor metrics to a scalar treatment-quality score |
| **DBS Agent** | LLM-powered agent providing clinician-readable rationale for recommended parameter changes |
| **Clinician Dashboard** | React/TypeScript frontend for reviewing patient history, wearable data, and optimisation results |

## Simulation Demos

Tremor simulation with the skeletal model, and the effect of optimal DBS parameters compared to DBS-off:

![Tremor Skeleton](src/sim/artifacts/opensim/tremor_skeleton.gif)

![Tremor — DBS On (Optimal) vs. Off](src/sim/artifacts/opensim/tremor_yolo_on_vs_off_optimal.gif)

## Architecture

```
src/
├── backend/      # FastAPI service — Bayesian optimisation, patient data, DBS agent
├── frontend/     # React + TypeScript clinician dashboard
└── sim/          # Tremor simulator, loss model training, cohort sampling
```

## Team

HackEurope 2026 — team **bluescreeners**

Atte Laakso · Konsta Kiirikki · Niklas Keiski · Nikolas Juhava

## References

1. PhysioNet Contributors. *Parkinson's Disease Smartwatch Dataset (PADS)*. PhysioNet, 2023. <https://physionet.org/content/parkinsons-disease-smartwatch/1.0.0/>

2. van Albada, S. J. et al. A Biophysical Model of the Basal Ganglia-Thalamocortical System for Parkinsonian Dynamics. *PLOS Computational Biology*, 14(11):e1006606, 2018. <https://doi.org/10.1371/journal.pcbi.1006606>

3. Wearable IMU-Based Quantification of Parkinsonian Tremor Using Spectral and Time-Domain Features. *Sensors*, 23(5238), 2023. <https://doi.org/10.3390/s23115238>

4. Objective Biomarkers and Optimization Strategies for Deep Brain Stimulation Programming in Parkinson's Disease. *Parkinsonism & Related Disorders*, 2025 (in press). <https://www.prd-journal.com/article/S1353-8020(25)00089-6/fulltext>
