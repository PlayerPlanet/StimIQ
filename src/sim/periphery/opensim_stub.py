from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np


@dataclass(frozen=True)
class SkeletonSpec:
    torso_len_m: float = 0.50
    upper_arm_len_m: float = 0.30
    forearm_len_m: float = 0.26
    hand_len_m: float = 0.18
    pos_to_angle_deg: float = 40.0
    vel_to_angle_deg: float = 12.0


class OpenSimStub:
    """Minimal OpenSim-like bridge: maps trajectories to joint motion + skeleton video."""

    def __init__(self, spec: SkeletonSpec | None = None) -> None:
        self.spec = spec or SkeletonSpec()
        try:
            import opensim  # type: ignore # pragma: no cover
        except Exception:
            self.available = False
        else:  # pragma: no cover
            self.available = True
            self._opensim = opensim

    def __repr__(self) -> str:
        return f"OpenSimStub(available={self.available})"

    def map_6dof_to_joint_angles(
        self,
        t: np.ndarray,
        pos: np.ndarray,
        vel: np.ndarray | None = None,
    ) -> dict[str, np.ndarray]:
        t_arr = np.asarray(t, dtype=float).reshape(-1)
        p = np.asarray(pos, dtype=float)
        if p.ndim != 2 or p.shape[0] != t_arr.shape[0] or p.shape[1] < 3:
            raise ValueError("pos must have shape (T, >=3) and match time length")

        v = np.zeros_like(p[:, :3]) if vel is None else np.asarray(vel, dtype=float)[:, :3]
        if v.shape != p[:, :3].shape:
            raise ValueError("vel must have shape (T, >=3) and match pos/time")

        x = p[:, 0]
        y = p[:, 1]
        z = p[:, 2]
        vx = v[:, 0]
        vy = v[:, 1]
        vz = v[:, 2]

        joint_scale = self.spec.pos_to_angle_deg
        rate_scale = self.spec.vel_to_angle_deg

        shoulder_flex = np.clip(joint_scale * x + rate_scale * vx, -75.0, 75.0)
        shoulder_add = np.clip(0.75 * joint_scale * y + 0.75 * rate_scale * vy, -45.0, 45.0)
        elbow_flex = np.clip(75.0 + 0.9 * joint_scale * z + 0.5 * rate_scale * vz, 5.0, 145.0)
        forearm_pro = np.clip(0.7 * joint_scale * z + rate_scale * vz, -80.0, 80.0)
        wrist_flex = np.clip(0.8 * joint_scale * x + 1.4 * rate_scale * vx, -65.0, 65.0)
        wrist_dev = np.clip(0.8 * joint_scale * y + 1.4 * rate_scale * vy, -45.0, 45.0)

        return {
            "time": t_arr,
            "shoulder_flex_deg": shoulder_flex,
            "shoulder_add_deg": shoulder_add,
            "elbow_flex_deg": elbow_flex,
            "forearm_pro_deg": forearm_pro,
            "wrist_flex_deg": wrist_flex,
            "wrist_dev_deg": wrist_dev,
        }

    def export_mot(self, path: str | Path, motion: dict[str, np.ndarray]) -> Path:
        out = Path(path)
        out.parent.mkdir(parents=True, exist_ok=True)

        time = np.asarray(motion["time"], dtype=float).reshape(-1)
        keys = [
            "shoulder_flex_deg",
            "shoulder_add_deg",
            "elbow_flex_deg",
            "forearm_pro_deg",
            "wrist_flex_deg",
            "wrist_dev_deg",
        ]
        cols = [np.asarray(motion[k], dtype=float).reshape(-1) for k in keys]
        if any(c.shape[0] != time.shape[0] for c in cols):
            raise ValueError("All motion arrays must have the same number of rows")

        mat = np.column_stack([time, *cols])
        names = ["time", *keys]
        with out.open("w", encoding="utf-8") as f:
            f.write("name TremorSkeletonMotion\n")
            f.write(f"datacolumns {len(names)}\n")
            f.write(f"datarows {mat.shape[0]}\n")
            f.write(f"range {time[0]:.6f} {time[-1]:.6f}\n")
            f.write("endheader\n")
            f.write("\t".join(names) + "\n")
            np.savetxt(f, mat, fmt="%.6f", delimiter="\t")

        return out

    def render_skeleton_video(
        self,
        path: str | Path,
        motion: dict[str, np.ndarray],
        fps: int = 30,
        stride: int = 1,
        title: str = "Tremor Skeleton",
    ) -> Path:
        try:
            import matplotlib.pyplot as plt
            from matplotlib.animation import FuncAnimation, FFMpegWriter, PillowWriter
        except ImportError as exc:
            raise ImportError("matplotlib is required for video rendering") from exc

        out = Path(path)
        out.parent.mkdir(parents=True, exist_ok=True)

        points = self._skeleton_points(motion)
        idx = np.arange(0, points.shape[0], max(1, int(stride)))
        frames = points[idx]

        fig = plt.figure(figsize=(7, 6))
        ax = fig.add_subplot(111, projection="3d")
        ax.set_title(title)
        ax.set_xlabel("X (m)")
        ax.set_ylabel("Y (m)")
        ax.set_zlabel("Z (m)")

        all_pts = frames.reshape(-1, 3)
        mins = all_pts.min(axis=0)
        maxs = all_pts.max(axis=0)
        center = 0.5 * (mins + maxs)
        span = max(float(np.max(maxs - mins)), 1e-3)
        half = 0.65 * span
        ax.set_xlim(center[0] - half, center[0] + half)
        ax.set_ylim(center[1] - half, center[1] + half)
        ax.set_zlim(max(0.0, center[2] - half), center[2] + half)

        (line_torso,) = ax.plot([], [], [], linewidth=3.0)
        (line_arm,) = ax.plot([], [], [], linewidth=3.0)

        def _update(i: int):
            pts = frames[i]
            torso = pts[:2]
            arm = pts[1:]
            line_torso.set_data(torso[:, 0], torso[:, 1])
            line_torso.set_3d_properties(torso[:, 2])
            line_arm.set_data(arm[:, 0], arm[:, 1])
            line_arm.set_3d_properties(arm[:, 2])
            return line_torso, line_arm

        anim = FuncAnimation(fig, _update, frames=frames.shape[0], interval=1000.0 / float(fps), blit=False)

        try:
            if out.suffix.lower() == ".gif":
                anim.save(str(out), writer=PillowWriter(fps=fps))
            else:
                anim.save(str(out), writer=FFMpegWriter(fps=fps))
        except Exception as exc:
            plt.close(fig)
            raise RuntimeError(
                "Failed to render video. Use .gif output path if ffmpeg is unavailable."
            ) from exc

        plt.close(fig)
        return out

    def render_yolo_hand_tremor_comparison(
        self,
        path: str | Path,
        pos_on: np.ndarray,
        pos_off: np.ndarray,
        fps: int = 30,
        stride: int = 1,
        title: str = "YOLO Pose: Stimulation ON vs OFF",
    ) -> Path:
        try:
            import matplotlib.pyplot as plt
            from matplotlib.animation import FuncAnimation, PillowWriter
        except ImportError as exc:
            raise ImportError("matplotlib is required for GIF rendering") from exc

        on_xy = self._hand_tremor_xy(np.asarray(pos_on, dtype=float))
        off_xy = self._hand_tremor_xy(np.asarray(pos_off, dtype=float))
        n = min(on_xy.shape[0], off_xy.shape[0])
        if n < 2:
            raise ValueError("Need at least 2 frames to render comparison GIF")

        idx = np.arange(0, n, max(1, int(stride)))
        on_xy = on_xy[idx]
        off_xy = off_xy[idx]

        out = Path(path)
        out.parent.mkdir(parents=True, exist_ok=True)

        base_pts, edges = self._yolo_pose_template()
        fig, axes = plt.subplots(1, 2, figsize=(10, 5), constrained_layout=True)
        fig.suptitle(title)

        pose_lines = []
        pose_joints = []
        hand_trails = []

        # Fixed viewport in normalized 2D body coordinates.
        for ax, label in zip(axes, ["Stimulation ON", "Stimulation OFF"]):
            ax.set_xlim(-0.7, 0.7)
            ax.set_ylim(-1.35, 0.35)
            ax.set_aspect("equal")
            ax.set_title(label)
            ax.set_xticks([])
            ax.set_yticks([])
            ax.grid(False)

            lines = [ax.plot([], [], linewidth=2.4, color="#33a1ff")[0] for _ in edges]
            joints = ax.scatter([], [], s=30, color="#ffd166", zorder=3, edgecolors="none")
            trail = ax.plot([], [], linewidth=1.3, color="#ef476f", alpha=0.65)[0]
            pose_lines.append(lines)
            pose_joints.append(joints)
            hand_trails.append(trail)

        def _frame_points(hand_xy: np.ndarray) -> np.ndarray:
            pts = base_pts.copy()
            pts[10] = hand_xy
            pts[17] = hand_xy + np.array([0.04, -0.01])
            return pts

        def _update(i: int):
            on_pts = _frame_points(on_xy[i])
            off_pts = _frame_points(off_xy[i])
            for pts, lines, joints, trail, trace in [
                (on_pts, pose_lines[0], pose_joints[0], hand_trails[0], on_xy[: i + 1]),
                (off_pts, pose_lines[1], pose_joints[1], hand_trails[1], off_xy[: i + 1]),
            ]:
                for line, (a, b) in zip(lines, edges):
                    line.set_data([pts[a, 0], pts[b, 0]], [pts[a, 1], pts[b, 1]])
                joints.set_offsets(pts)
                trail.set_data(trace[:, 0], trace[:, 1])
            return [*pose_lines[0], *pose_lines[1], pose_joints[0], pose_joints[1], hand_trails[0], hand_trails[1]]

        anim = FuncAnimation(fig, _update, frames=on_xy.shape[0], interval=1000.0 / float(fps), blit=False)
        if out.suffix.lower() != ".gif":
            raise ValueError("YOLO comparison renderer outputs GIF only; use a .gif file path.")
        anim.save(str(out), writer=PillowWriter(fps=fps))
        plt.close(fig)
        return out

    def render_3d_hand_tremor_comparison(
        self,
        path: str | Path,
        pos_on: np.ndarray,
        pos_off: np.ndarray,
        fps: int = 30,
        stride: int = 1,
        title: str = "3D Stick Figure: Stimulation ON vs OFF",
    ) -> Path:
        try:
            import matplotlib.pyplot as plt
            from matplotlib.animation import FuncAnimation, PillowWriter
        except ImportError as exc:
            raise ImportError("matplotlib is required for GIF rendering") from exc

        on_xy = self._hand_tremor_xy(np.asarray(pos_on, dtype=float))
        off_xy = self._hand_tremor_xy(np.asarray(pos_off, dtype=float))
        n = min(on_xy.shape[0], off_xy.shape[0])
        if n < 2:
            raise ValueError("Need at least 2 frames to render comparison GIF")

        idx = np.arange(0, n, max(1, int(stride)))
        on_xy = on_xy[idx]
        off_xy = off_xy[idx]

        out = Path(path)
        out.parent.mkdir(parents=True, exist_ok=True)

        base, edges = self._pose3d_template()

        fig = plt.figure(figsize=(12, 5), constrained_layout=True)
        fig.suptitle(title)
        ax_on = fig.add_subplot(121, projection="3d")
        ax_off = fig.add_subplot(122, projection="3d")
        axes = [ax_on, ax_off]
        for ax, label in zip(axes, ["Stimulation ON", "Stimulation OFF"]):
            ax.set_title(label)
            ax.set_xlabel("X")
            ax.set_ylabel("Y")
            ax.set_zlabel("Z")
            ax.set_xlim(-0.6, 0.6)
            ax.set_ylim(-1.3, 0.3)
            ax.set_zlim(-0.2, 0.8)
            ax.view_init(elev=16, azim=-64)

        lines_by_ax: list[list] = []
        joints_by_ax = []
        trails_by_ax = []
        for ax in axes:
            lines = [ax.plot([], [], [], linewidth=2.2, color="#33a1ff")[0] for _ in edges]
            joints = ax.scatter([], [], [], s=26, color="#ffd166", depthshade=False)
            trail = ax.plot([], [], [], linewidth=1.2, color="#ef476f", alpha=0.7)[0]
            lines_by_ax.append(lines)
            joints_by_ax.append(joints)
            trails_by_ax.append(trail)

        def _frame_pose(hand_xy: np.ndarray) -> np.ndarray:
            pts = base.copy()
            x, y = float(hand_xy[0]), float(hand_xy[1])
            tremor_x = x - 0.34
            tremor_y = y + 0.43
            pts[10] = np.array([x, y, 0.12 + 0.45 * tremor_y])
            pts[17] = pts[10] + np.array([0.05, -0.01, 0.02 + 0.25 * tremor_x])
            return pts

        def _update(i: int):
            on_pts = _frame_pose(on_xy[i])
            off_pts = _frame_pose(off_xy[i])
            for pts, lines, joints, trail, trace in [
                (on_pts, lines_by_ax[0], joints_by_ax[0], trails_by_ax[0], on_xy[: i + 1]),
                (off_pts, lines_by_ax[1], joints_by_ax[1], trails_by_ax[1], off_xy[: i + 1]),
            ]:
                for line, (a, b) in zip(lines, edges):
                    seg = pts[[a, b]]
                    line.set_data(seg[:, 0], seg[:, 1])
                    line.set_3d_properties(seg[:, 2])
                joints._offsets3d = (pts[:, 0], pts[:, 1], pts[:, 2])  # type: ignore[attr-defined]
                z_trace = 0.12 + 0.45 * (trace[:, 1] + 0.43)
                trail.set_data(trace[:, 0], trace[:, 1])
                trail.set_3d_properties(z_trace)
            return [
                *lines_by_ax[0],
                *lines_by_ax[1],
                joints_by_ax[0],
                joints_by_ax[1],
                trails_by_ax[0],
                trails_by_ax[1],
            ]

        anim = FuncAnimation(fig, _update, frames=on_xy.shape[0], interval=1000.0 / float(fps), blit=False)
        if out.suffix.lower() != ".gif":
            raise ValueError("3D comparison renderer outputs GIF only; use a .gif file path.")
        anim.save(str(out), writer=PillowWriter(fps=fps))
        plt.close(fig)
        return out

    def _skeleton_points(self, motion: dict[str, np.ndarray]) -> np.ndarray:
        sf = np.deg2rad(np.asarray(motion["shoulder_flex_deg"], dtype=float))
        sa = np.deg2rad(np.asarray(motion["shoulder_add_deg"], dtype=float))
        ef = np.deg2rad(np.asarray(motion["elbow_flex_deg"], dtype=float))
        wf = np.deg2rad(np.asarray(motion["wrist_flex_deg"], dtype=float))
        wd = np.deg2rad(np.asarray(motion["wrist_dev_deg"], dtype=float))

        n = sf.shape[0]
        spec = self.spec

        pelvis = np.tile(np.array([0.0, 0.0, 0.0]), (n, 1))
        shoulder = np.tile(np.array([0.0, 0.0, spec.torso_len_m]), (n, 1))

        upper_dir = np.column_stack(
            [
                np.cos(sf) * np.cos(sa),
                np.sin(sa),
                np.sin(sf) * np.cos(sa),
            ]
        )
        upper_dir = _normalize(upper_dir)
        elbow = shoulder + spec.upper_arm_len_m * upper_dir

        bend_axis = _normalize(np.cross(upper_dir, np.tile(np.array([0.0, 1.0, 0.0]), (n, 1))))
        default_axis = np.tile(np.array([1.0, 0.0, 0.0]), (n, 1))
        small = np.linalg.norm(bend_axis, axis=1) < 1e-8
        bend_axis[small] = default_axis[small]

        forearm_dir = _rotate_vectors(upper_dir, bend_axis, -ef)
        forearm_dir = _normalize(forearm_dir)
        wrist = elbow + spec.forearm_len_m * forearm_dir

        hand_bend = _rotate_vectors(forearm_dir, bend_axis, -0.5 * wf)
        lat_axis = _normalize(np.cross(hand_bend, bend_axis))
        hand_dir = _rotate_vectors(hand_bend, lat_axis, 0.4 * wd)
        hand_dir = _normalize(hand_dir)
        hand = wrist + spec.hand_len_m * hand_dir

        return np.stack([pelvis, shoulder, elbow, wrist, hand], axis=1)

    def _hand_tremor_xy(self, pos: np.ndarray) -> np.ndarray:
        if pos.ndim != 2 or pos.shape[1] < 3:
            raise ValueError("pos must have shape (T, >=3)")
        x = pos[:, 0]
        y = pos[:, 1]
        z = pos[:, 2]

        amp = np.max(np.abs(np.column_stack([x, y, z])))
        scale = 0.11 / max(float(amp), 1e-4)
        hx = 0.34 + scale * x
        hy = -0.43 + scale * (0.75 * y + 0.25 * z)
        return np.column_stack([hx, hy])

    def _yolo_pose_template(self) -> tuple[np.ndarray, list[tuple[int, int]]]:
        # 18 points: 17 COCO-like + explicit right hand tip.
        pts = np.array(
            [
                [0.00, 0.20],   # 0 nose
                [-0.03, 0.23],  # 1 left eye
                [0.03, 0.23],   # 2 right eye
                [-0.07, 0.21],  # 3 left ear
                [0.07, 0.21],   # 4 right ear
                [-0.15, 0.05],  # 5 left shoulder
                [0.15, 0.05],   # 6 right shoulder
                [-0.24, -0.18], # 7 left elbow
                [0.26, -0.20],  # 8 right elbow
                [-0.30, -0.40], # 9 left wrist
                [0.34, -0.43],  # 10 right wrist (dynamic)
                [-0.11, -0.37], # 11 left hip
                [0.11, -0.37],  # 12 right hip
                [-0.10, -0.78], # 13 left knee
                [0.10, -0.78],  # 14 right knee
                [-0.10, -1.20], # 15 left ankle
                [0.10, -1.20],  # 16 right ankle
                [0.38, -0.44],  # 17 right hand tip (dynamic)
            ],
            dtype=float,
        )
        edges = [
            (0, 1),
            (0, 2),
            (1, 3),
            (2, 4),
            (5, 6),
            (5, 7),
            (7, 9),
            (6, 8),
            (8, 10),
            (10, 17),
            (5, 11),
            (6, 12),
            (11, 12),
            (11, 13),
            (13, 15),
            (12, 14),
            (14, 16),
        ]
        return pts, edges

    def _pose3d_template(self) -> tuple[np.ndarray, list[tuple[int, int]]]:
        pts = np.array(
            [
                [0.00, 0.20, 0.64],   # 0 nose
                [-0.03, 0.23, 0.64],  # 1 left eye
                [0.03, 0.23, 0.64],   # 2 right eye
                [-0.07, 0.21, 0.62],  # 3 left ear
                [0.07, 0.21, 0.62],   # 4 right ear
                [-0.15, 0.05, 0.54],  # 5 left shoulder
                [0.15, 0.05, 0.54],   # 6 right shoulder
                [-0.24, -0.18, 0.42], # 7 left elbow
                [0.26, -0.20, 0.40],  # 8 right elbow
                [-0.30, -0.40, 0.26], # 9 left wrist
                [0.34, -0.43, 0.12],  # 10 right wrist (dynamic)
                [-0.11, -0.37, 0.28], # 11 left hip
                [0.11, -0.37, 0.28],  # 12 right hip
                [-0.10, -0.78, 0.18], # 13 left knee
                [0.10, -0.78, 0.18],  # 14 right knee
                [-0.10, -1.20, 0.05], # 15 left ankle
                [0.10, -1.20, 0.05],  # 16 right ankle
                [0.39, -0.44, 0.10],  # 17 right hand tip (dynamic)
            ],
            dtype=float,
        )
        edges = [
            (0, 1),
            (0, 2),
            (1, 3),
            (2, 4),
            (5, 6),
            (5, 7),
            (7, 9),
            (6, 8),
            (8, 10),
            (10, 17),
            (5, 11),
            (6, 12),
            (11, 12),
            (11, 13),
            (13, 15),
            (12, 14),
            (14, 16),
        ]
        return pts, edges


def _normalize(v: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(v, axis=1, keepdims=True)
    norm = np.where(norm < 1e-12, 1.0, norm)
    return v / norm


def _rotate_vectors(v: np.ndarray, axis: np.ndarray, angle: np.ndarray) -> np.ndarray:
    a = _normalize(axis)
    c = np.cos(angle)[:, None]
    s = np.sin(angle)[:, None]
    return v * c + np.cross(a, v) * s + a * np.sum(a * v, axis=1, keepdims=True) * (1.0 - c)
