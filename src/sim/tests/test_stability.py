import numpy as np

from sim.api.types import RolloutConfig, StimParams
from sim.brain.bgtcs_meanfield import BGTCSLite
from sim.cohort.sampling import sample_patient_params
from sim.periphery.springmass_6dof import SpringMass3D
from sim.sensor.imu import IMUModel
from sim.simulator import Simulator
from sim.stimulation.encoding import WaveformEncoder


def test_no_exploding_trajectory() -> None:
    stim = StimParams.from_matrix(np.array([[0.8, 0.9], [100, 110], [60e-6, 60e-6], [0, 0.4]], dtype=float))
    cfg = RolloutConfig(duration_s=3.0)
    patient = sample_patient_params(np.random.default_rng(2), n=1)[0]
    sim = Simulator(WaveformEncoder(), BGTCSLite(), SpringMass3D(), IMUModel())
    out = sim.run(stim, patient, cfg, seed=7)
    assert float(np.max(np.abs(out.pos))) < 1e4
