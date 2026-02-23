# sim

Backbone simulation module for stimulation parameters `(4xN)` to synthetic 3D IMU time series.

## Quick start

```bash
python main.py
python -m sim.scripts.sim_one --override rollout.duration_s=5
python -m sim.scripts.sim_sweep --override sweep.samples=8 --override cohort.patients=8 --override output.local_dir=artifacts/sim
python -m sim.scripts.sim_opensim_video --override rollout.duration_s=5 --out-dir artifacts/opensim --comparison-mode 3d
```

The OpenSim video script exports:
- OpenSim-compatible motion files (`.mot`) for stimulation ON and OFF.
- A side-by-side comparison GIF (ON vs OFF), with tremor motion applied to the right hand/wrist.
- `--comparison-mode 3d` gives a 3D stick-figure view.
- `--comparison-mode yolo2d` gives the YOLO-like 2D keypoint stick figure.

## Python API

Generate a single patient response for new DBS parameters (`4xN`):

```python
import numpy as np

from sim.api.types import StimParams
from sim.cohort.sampling import sample_patient_params
from sim.config.runtime import load_config
from sim.factory import build_rollout_config, build_simulator

cfg = load_config(overrides=["seed=7", "rollout.duration_s=5"])
simulator = build_simulator(cfg)
rollout_cfg = build_rollout_config(cfg)
patient = sample_patient_params(np.random.default_rng(7), n=1)[0]

# Rows are: amp, freq_hz, pulse_width_s, phase_rad
dbs_matrix = np.array(
    [
        [1.1, 0.9, 0.7, 0.5],
        [130.0, 120.0, 90.0, 60.0],
        [60e-6, 60e-6, 90e-6, 90e-6],
        [0.0, 0.4, 0.8, 1.2],
    ],
    dtype=float,
)
stim = StimParams.from_matrix(dbs_matrix)

imu = simulator.run(stim_params=stim, patient=patient, config=rollout_cfg, seed=7)
print(imu.pos.shape, imu.vel.shape, imu.acc.shape)
```
