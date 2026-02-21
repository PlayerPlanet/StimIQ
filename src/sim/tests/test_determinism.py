import numpy as np

from sim.api.types import RolloutConfig, StimParams
from sim.brain.bgtcs_meanfield import BGTCSLite
from sim.cohort.sampling import sample_patient_params
from sim.periphery.springmass_6dof import SpringMass3D
from sim.sensor.imu import IMUModel
from sim.simulator import Simulator
from sim.stimulation.encoding import WaveformEncoder


def test_seed_determinism() -> None:
    stim = StimParams.from_matrix(np.array([[1, 1], [120, 80], [60e-6, 60e-6], [0, 1]], dtype=float))
    cfg = RolloutConfig(duration_s=1.0)
    patient = sample_patient_params(np.random.default_rng(1), n=1)[0]
    sim = Simulator(WaveformEncoder(), BGTCSLite(), SpringMass3D(), IMUModel())
    a = sim.run(stim, patient, cfg, seed=42)
    b = sim.run(stim, patient, cfg, seed=42)
    assert np.allclose(a.pos, b.pos)
