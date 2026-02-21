Below is a clean way to structure `sim/` so it stays narrowly responsible for **(4×N stimulation params) → (stochastic 3D IMU time series)**, while still leaving obvious extension points for (a) different brain models (BGTCS → CTC, etc.) and (b) different “brain → periphery” transducers (spring-mass, OpenSim limb, vocal tract, etc.).

---

## Core design principle

Split the simulator into **three orthogonal layers**:

1. **Stimulation**: how you represent `amp, freq, pw, phase` for `N` channels over time.
2. **Neural generator**: turns stimulation into a small set of latent neural signals (e.g., oscillatory drive, bandpower, state variables).
3. **Periphery transducer**: maps latent neural signals to IMU position/velocity/acceleration (plus noise + sensor model).

This lets you swap “BGTCS mean-field” without touching the IMU generation, and later swap “spring-mass” for “OpenSim” without touching the brain side.

---

## Suggested dependencies

**Must-have**

* `jax`, `jaxlib`
* `diffrax` (ODE/SDE integration in JAX; much nicer than hand-rolled integrators)
* `equinox` (lightweight module system; clean “PyTree + methods” pattern)
* `omegaconf` (you already want it)
* `jaxtyping` + `beartype` (or `typeguard`) for sanity checks

**Nice-to-have**

* `chex` (shape assertions, PRNG discipline)
* `hydra-core` (if you want full experiment config + sweeps)
* `orbax-checkpoint` (if you checkpoint fitted params later)

---

## Package layout (minimal but extensible)

```text
sim/
  __init__.py

  config/
    default.yaml
    brain/bgtcs.yaml
    periphery/springmass6dof.yaml
    noise/imu.yaml

  api/
    types.py              # shared dataclasses & type aliases
    base.py               # interfaces/protocols for BrainModel/Transducer/Sensor
    registry.py           # string -> class factory (for OmegaConf/Hydra)

  stimulation/
    encoding.py           # 4xN -> time-varying control u(t)
    waveforms.py          # pulse train, sinusoid, biphasic pulses, etc.

  brain/
    bgtcs_meanfield.py    # minimal mean-field "neural drive" generator
    null.py               # for ablations: stimulation -> latent drive directly
    utils.py              # filtering, bandpower, oscillation extraction

  periphery/
    springmass_6dof.py    # linear damped oscillator(s) + mixing matrix
    mixins.py             # shared linear algebra / constraint helpers
    opensim_stub.py       # placeholder interface (no dependency yet)

  sensor/
    imu.py                # sampling, quantization, drift, bias, axes rotation
    noise.py              # process/measurement noise models

  cohort/
    sampling.py           # sample patient parameters, priors, baselines
    transforms.py         # enforce constraints, map unconstrained -> constrained

  datasets/
    generate.py           # produce batches: params -> imu, save npz/parquet
    io.py                 # file format helpers, metadata, schema versioning

  scripts/
    sim_one.py            # CLI: run one rollout given config + params
    sim_sweep.py          # CLI: generate cohort or parameter sweeps
    sanity_checks.py      # quick plots/stats, energy bounds, stability checks

  tests/
    test_shapes.py
    test_determinism.py   # same PRNG seed -> same output
    test_stability.py     # no exploding trajectories for typical ranges
```

---

## Base classes / interfaces (keep them small)

You’ll be happiest if you define **two “model” interfaces** and one “orchestrator”:

### `BrainModel`

Input: time + stimulation waveform
Output: latent drive(s) for the periphery

* Keep output low-dimensional and generic, e.g.:

  * `drive(t)` (scalar or small vector)
  * optional `features(t)` like bandpower around tremor frequency

### `PeripheryTransducer`

Input: latent drive(s)
Output: continuous-time kinematics state (position, velocity), before IMU sensor effects

### `IMUSensorModel`

Input: kinematics
Output: sampled IMU series (pos/vel/acc) + noise

### `Simulator` (composition root)

Holds instances of the three components and runs the pipeline.

---

## A concrete `types.py` sketch (what I’d standardize early)

* `StimParams`: shape `(4, N)` with named fields + constraints
* `RolloutConfig`: `dt`, `T`, sample rate, output channels, noise toggles
* `LatentState`: e.g. `z(t)` and optional additional features
* `IMUOutput`: `{t, pos, vel, acc, meta}` with fixed schema

Key: define “schema version” once so downstream training doesn’t break when you add fields.

---

## How to represent 4×N parameters cleanly

Even if your optimizer passes `R^(4N)`, keep an internal structured view:

* `amp[N]`, `freq[N]`, `pw[N]`, `phase[N]`
* `encoding.py` produces `u(t) ∈ R^N` (or `R^{N×k}` if you later model bipolar leads)

Waveform generation should be standalone so:

* you can do purely differentiable waveforms (smooth pulse approximations)
* or realistic piecewise pulses (Diffrax can handle discontinuities, but smooth helps BO)

---

## Minimal BGTCS → tremor drive (without overcommitting)

For the *minimal demo*, you can implement the “brain” as:

* a driven oscillator / bandpass state-space whose parameters are “physiologically plausible”
* stimulation modulates either:

  * amplitude of an oscillatory mode, or
  * damping (suppression), or
  * frequency pulling

This still “reads like” mean-field → tremor without forcing you to re-derive the full van Albada & Robinson system during the hackathon.

Then later you swap `brain/bgtcs_meanfield.py` with a full mean-field ODE, keeping the transducer identical.

---

## Spring-mass 6DOF transducer module

If you mean “6DOF spring-mass-damper” as a linear second-order system, implement as:

* State `x = [p(3), v(3)]` for 3D position/velocity
* Dynamics: `p' = v`, `v' = A p + B v + C drive(t)`
  (choose `A,B` to encode damped oscillations; `C` is mixing into axes)
* If you want *true* 6DOF rigid body later, keep the API but start with 3D translation.

Add a **mixing matrix** `M ∈ R^{3×k}` from latent drive dims to axes:

* this is where “wrist vs finger vs leg” differences can live as patient-specific params.

---

## Cohort simulation: patient parameter priors

Make “patient” a bundle of:

* brain parameters `θ_brain`
* periphery parameters `θ_body` (natural freq, damping, mixing)
* sensor parameters `θ_imu` (bias, noise std, drift)

In `cohort/sampling.py`, define priors as OmegaConf-configurable distributions:

* log-normal for positive params (damping, noise std)
* normal for phases/mixing
* truncated ranges for stability

Then a cohort is just a PRNG-keyed sampler producing `P` patients.

---

## Scripts you’ll actually use for the demo

1. `scripts/sim_one.py`

   * loads config
   * takes a `(4,N)` vector from CLI or JSON
   * returns an `IMUOutput` and optionally a quick plot

2. `scripts/sim_sweep.py`

   * generates a dataset for training the surrogate loss model
   * supports: random params, grid, Sobol sequence, Bayesian optimization loop later

3. `datasets/generate.py`

   * writes `npz` or `parquet` with metadata:

     * `stim_params`, `imu`, `patient_id`, `seed`, `config_hash`

---

## Keeping the door open for speech / other mappings

You don’t want “speech” logic in `sim/` yet, but you *can* future-proof by making the periphery transducer interface general:

* `Transducer` outputs “observables” in a small dictionary:

  * `{"pos": (T,3), "vel": (T,3), ...}`
* A speech transducer could output:

  * `{"f0": (T,), "formants": (T, K)}` or articulator positions

And the sensor model becomes “measurement model” (IMU now, microphone features later).

So: **don’t name it `IMUSensorModel` in the base interface** — call it `MeasurementModel`, and implement `IMUModel` first.

---

## Minimal class list to implement first

For a hackathon-grade end-to-end demo, you can start with:

* `stimulation/WaveformEncoder`
* `brain/BGTCSLite` (or `NullBrain` + bandpass)
* `periphery/SpringMass3D` (call it 6DOF later if needed)
* `sensor/IMUModel`
* `Simulator`
* `cohort/sample_patient_params`
* `datasets/generate_rollouts`

Everything else can be placeholders.

---

## Common failure modes (worth guarding early)

* **Unstable dynamics**: enforce stability constraints (e.g., damping > 0, eigenvalues negative real part).
* **PRNG misuse in JAX**: standardize `(key -> split -> return new key)` everywhere.
* **Shape drift**: enforce `jaxtyping` annotations + `chex.assert_shape`.
* **BO friendliness**: keep output smooth-ish in parameters; hard discontinuities in pulses can make BO harder.

---

If you want, paste your rough parameter ranges (amp/freq/pw/phase) and your intended sampling rate + rollout length, and I’ll propose a *stable default parameterization* for the spring-mass and noise model that won’t explode and will look “IMU-realistic” for the demo.

(Also: I saw the hackathon prize brief you shared; including a simulated dataset + learned continuous loss fits that “turn raw data into insight/prediction” framing.) 
