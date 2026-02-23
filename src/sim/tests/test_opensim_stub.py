from __future__ import annotations

import numpy as np

from sim.periphery.opensim_stub import OpenSimStub


def test_map_6dof_shapes() -> None:
    t = np.linspace(0.0, 1.0, 101)
    pos = np.column_stack(
        [
            0.02 * np.sin(2.0 * np.pi * 5.0 * t),
            0.015 * np.sin(2.0 * np.pi * 4.0 * t + 0.3),
            0.01 * np.sin(2.0 * np.pi * 6.0 * t + 0.5),
        ]
    )
    vel = np.gradient(pos, t, axis=0)
    stub = OpenSimStub()

    motion = stub.map_6dof_to_joint_angles(t=t, pos=pos, vel=vel)
    assert set(motion.keys()) == {
        "time",
        "shoulder_flex_deg",
        "shoulder_add_deg",
        "elbow_flex_deg",
        "forearm_pro_deg",
        "wrist_flex_deg",
        "wrist_dev_deg",
    }
    assert motion["time"].shape == (101,)
    assert motion["elbow_flex_deg"].shape == (101,)


def test_export_mot(tmp_path) -> None:
    t = np.linspace(0.0, 0.5, 21)
    pos = np.zeros((21, 3), dtype=float)
    vel = np.zeros((21, 3), dtype=float)
    stub = OpenSimStub()
    motion = stub.map_6dof_to_joint_angles(t=t, pos=pos, vel=vel)

    out = stub.export_mot(tmp_path / "test_motion.mot", motion)
    text = out.read_text(encoding="utf-8")
    assert "endheader" in text
    assert "shoulder_flex_deg" in text


def test_hand_tremor_xy() -> None:
    t = np.linspace(0.0, 1.0, 51)
    pos = np.column_stack(
        [
            0.01 * np.sin(2.0 * np.pi * 5.0 * t),
            0.02 * np.cos(2.0 * np.pi * 4.0 * t),
            0.015 * np.sin(2.0 * np.pi * 6.0 * t + 0.4),
        ]
    )
    stub = OpenSimStub()
    xy = stub._hand_tremor_xy(pos)  # noqa: SLF001 - verified renderer utility
    assert xy.shape == (51, 2)
    assert np.std(xy[:, 0]) > 0.0
