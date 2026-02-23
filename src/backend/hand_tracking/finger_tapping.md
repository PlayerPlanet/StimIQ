Below is a tight spec for **MediaPipe Hands + math** for a `finger_tap` test. I’ll assume you’ll wire it into your existing custom API under `src/backend/api`, so I’m only describing the **core processing functions** you can call from your handler/job.

---

## MediaPipe: minimal tracking functions you need

You only need these landmarks (MediaPipe Hands indices):

* `0` wrist
* `4` thumb tip
* `8` index tip
* `9` middle MCP (good for scale normalization; more stable than some others)

### MediaPipe init (Python)

Use **static_image_mode=False** for video tracking.

```python
import cv2
import mediapipe as mp

mp_hands = mp.solutions.hands

def make_hands_tracker(
    max_num_hands: int = 1,
    model_complexity: int = 1,
    min_detection_confidence: float = 0.5,
    min_tracking_confidence: float = 0.5,
):
    return mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=max_num_hands,
        model_complexity=model_complexity,
        min_detection_confidence=min_detection_confidence,
        min_tracking_confidence=min_tracking_confidence,
    )
```

### Per-frame inference

```python
def infer_hand_landmarks_bgr(hands: mp_hands.Hands, frame_bgr):
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    res = hands.process(frame_rgb)

    if not res.multi_hand_landmarks:
        return None  # no hand detected

    # take first hand
    lm = res.multi_hand_landmarks[0].landmark  # list of 21 landmarks
    # optionally: res.multi_handedness[0].classification[0].score for handedness confidence

    # normalized [0,1] coords
    def xy(i: int):
        return (float(lm[i].x), float(lm[i].y))

    out = {
        "wrist": xy(0),
        "thumb_tip": xy(4),
        "index_tip": xy(8),
        "middle_mcp": xy(9),
        # z is available: lm[i].z (normalized-ish), but you can ignore for v1
    }
    return out
```

---

## Signal definition (the one that matters)

### Pinch distance (normalized)

Let `T(t)` = thumb tip, `I(t)` = index tip, `W(t)` = wrist, `M(t)` = middle MCP.

Raw pinch distance in normalized image space:

* `d_raw(t) = ||T(t) - I(t)||_2`

Normalize for hand scale to reduce distance-to-camera effects:

* `s(t) = ||W(t) - M(t)||_2`
* `d(t) = d_raw(t) / max(s(t), eps)`

This `d(t)` is your main 1D timeseries for tapping.

**Why this normalization?** Wrist–middle MCP is relatively stable across tapping and is less sensitive than using a fingertip-to-wrist scale.

---

## Smoothing (keep it simple)

EMA is enough for v1 (on the scalar `d(t)`).

* `d_s(t) = α d(t) + (1-α) d_s(t-1)` when detected
* if missing frames: either interpolate short gaps or mark invalid

Typical:

* `α = 0.3` at ~30fps (less lag, still reduces jitter)

```python
def ema_smooth(values, alpha: float):
    out = []
    prev = None
    for v in values:
        if v is None:
            out.append(None)
            continue
        prev = v if prev is None else alpha * v + (1 - alpha) * prev
        out.append(prev)
    return out
```

If you want to be slightly more robust: smooth the 2D points (T and I) first, then compute distance. But scalar smoothing is usually fine.

---

## Peak/trough detection (tap cycles)

Finger tapping produces repeated **open/close** cycles. In `d(t)` you’ll typically see oscillations.

A “tap event” can be defined as a **local minimum** (fingers closest) or a **local maximum** (fingers farthest). I recommend using **minima** as taps because “contact/near-contact” corresponds to a low pinch distance.

### Pre-conditions you need

* sampling rate `fs` (estimated from timestamps or assumed 30fps)
* a refractory period: taps can’t occur faster than e.g. 6–8 Hz

  * `min_interval_s ≈ 0.10–0.16`
* an amplitude threshold to avoid noise counting as taps

### Implementation idea (minimal)

1. Compute first difference sign changes to find local minima.
2. Enforce:

   * minimum time between successive minima
   * minimum prominence: the distance between surrounding maxima and the minimum is large enough

Prominence can be simplified:

* For candidate minimum at index `k`, look at a window ±`w` frames and compute:

  * `prom = min(max_left, max_right) - d_s[k]`
* require `prom > prom_thresh` (e.g. 0.05–0.10 in normalized units; tune from data)

```python
import math

def find_local_minima_with_prominence(d_s, t_s, fs, min_interval_s=0.12, window_s=0.25, prom_thresh=0.07):
    # d_s: list[float|None], smoothed
    # t_s: list[float] seconds
    n = len(d_s)
    w = max(1, int(window_s * fs))
    min_gap = min_interval_s

    mins = []
    last_t = -1e9

    for k in range(1, n - 1):
        if d_s[k] is None or d_s[k-1] is None or d_s[k+1] is None:
            continue

        # local minimum condition
        if not (d_s[k] <= d_s[k-1] and d_s[k] < d_s[k+1]):
            continue

        tk = t_s[k]
        if tk - last_t < min_gap:
            continue

        # prominence (simple)
        left = [v for v in d_s[max(0, k-w):k] if v is not None]
        right = [v for v in d_s[k+1:min(n, k+w+1)] if v is not None]
        if not left or not right:
            continue
        prom = min(max(left), max(right)) - d_s[k]
        if prom < prom_thresh:
            continue

        mins.append(k)
        last_t = tk

    return mins  # indices of "tap" events
```

This is intentionally simple and fast. You’ll tune `prom_thresh` once you see real clips.

---

## Core derived measures (math)

Assume you have tap indices `k_i` and times `t_i`.

### Tap rate (cadence)

* Inter-tap intervals: `Δt_i = t_{i} - t_{i-1}`
* Cadence in Hz: `f = 1 / mean(Δt)`

Also report variability:

* `CV_ITI = std(Δt) / mean(Δt)` (rhythm irregularity proxy)

### Amplitude per cycle

You want open-close amplitude. Using minima alone, define amplitude around each minimum:

* local maxima near minimum from left/right windows:

  * `A_i = min(max_left, max_right) - d_s[k_i]`

Then:

* `A_mean`, `A_cv`

### Decrement (fatigue trend)

Compute trend over time in either amplitude or cadence.

Amplitude decrement:

* fit line `A_i ≈ a0 + a1 * t_i`
* `decrement_amp = a1` (negative means amplitude decreasing)

Cadence decrement:

* compute instantaneous rate sequence `r_i = 1/Δt_i` at midpoints
* fit `r_i ≈ b0 + b1 * t_mid_i`

Simple linear regression closed form:
For pairs `(x_i, y_i)`:

* `slope = cov(x,y)/var(x)`

```python
def slope(x, y):
    n = len(x)
    mx = sum(x)/n
    my = sum(y)/n
    vx = sum((xi-mx)**2 for xi in x)
    if vx < 1e-12:
        return 0.0
    cxy = sum((x[i]-mx)*(y[i]-my) for i in range(n))
    return cxy / vx
```

### Hesitations / pauses

Count “long gaps”:

* `pause_count = #{Δt_i > pause_thresh}` e.g. 0.5s
* `max_gap = max(Δt)`

### Speed proxy (optional but cheap)

Compute derivative of `d_s(t)`:

* `v(t) = (d_s(t) - d_s(t-1)) / (t_t - t_{t-1})`
  Then summarize:
* `v_rms`, `v_peak`
  This correlates with bradykinesia without needing pixel velocities.

---

## Minimal “finger_tap” function you can drop into your service layer

### Inputs you need

* decoded frames + timestamps (seconds)
* optional: expected hand (left/right) if you want to reject wrong hand (not required)

### Outputs you should return

* tap indices/times (for debugging)
* feature dict
* quality metrics

```python
def process_finger_tap_video(frames_bgr, timestamps_s, fs_hint=None):
    hands = make_hands_tracker(max_num_hands=1)

    d = []
    conf = []  # 1.0 if detected else 0.0; can be refined later

    for frame in frames_bgr:
        lm = infer_hand_landmarks_bgr(hands, frame)
        if lm is None:
            d.append(None)
            conf.append(0.0)
            continue

        (tx, ty) = lm["thumb_tip"]
        (ix, iy) = lm["index_tip"]
        (wx, wy) = lm["wrist"]
        (mx, my) = lm["middle_mcp"]

        eps = 1e-6
        d_raw = math.hypot(tx - ix, ty - iy)
        scale = math.hypot(wx - mx, wy - my)
        d_norm = d_raw / max(scale, eps)

        d.append(d_norm)
        conf.append(1.0)

    # estimate fs
    if fs_hint is not None:
        fs = fs_hint
    else:
        # robust estimate from timestamps
        dt = [timestamps_s[i]-timestamps_s[i-1] for i in range(1, len(timestamps_s))]
        dt = [x for x in dt if x > 1e-3]
        fs = 1.0 / (sum(dt)/len(dt)) if dt else 30.0

    d_s = ema_smooth(d, alpha=0.3)

    # quality
    visible_fraction = sum(1 for c in conf if c > 0.5) / max(1, len(conf))

    tap_idx = find_local_minima_with_prominence(
        d_s=d_s,
        t_s=timestamps_s,
        fs=fs,
        min_interval_s=0.12,
        window_s=0.25,
        prom_thresh=0.07,
    )

    tap_t = [timestamps_s[k] for k in tap_idx]

    features = {
        "visible_fraction": visible_fraction,
        "tap_count": len(tap_idx),
    }

    if len(tap_t) >= 3:
        itis = [tap_t[i]-tap_t[i-1] for i in range(1, len(tap_t))]
        mean_iti = sum(itis)/len(itis)
        var_iti = sum((x-mean_iti)**2 for x in itis)/len(itis)
        std_iti = math.sqrt(var_iti)
        cadence_hz = 1.0/mean_iti if mean_iti > 1e-6 else 0.0
        cv_iti = std_iti/mean_iti if mean_iti > 1e-6 else 0.0

        # amplitude per tap (simple prominence reuse)
        amps = []
        w = max(1, int(0.25 * fs))
        for k in tap_idx:
            left = [v for v in d_s[max(0, k-w):k] if v is not None]
            right = [v for v in d_s[k+1:min(len(d_s), k+w+1)] if v is not None]
            if not left or not right:
                continue
            amps.append(min(max(left), max(right)) - d_s[k])

        if amps:
            mean_amp = sum(amps)/len(amps)
            var_amp = sum((a-mean_amp)**2 for a in amps)/len(amps)
            std_amp = math.sqrt(var_amp)
            cv_amp = std_amp/mean_amp if mean_amp > 1e-6 else 0.0
            dec_amp = slope(tap_t[:len(amps)], amps) if len(amps) >= 3 else 0.0
        else:
            mean_amp = cv_amp = dec_amp = 0.0

        pause_thresh = 0.5
        pause_count = sum(1 for x in itis if x > pause_thresh)
        max_gap = max(itis) if itis else 0.0

        features.update({
            "cadence_hz": cadence_hz,
            "cv_iti": cv_iti,
            "mean_amp": mean_amp,
            "cv_amp": cv_amp,
            "decrement_amp_slope": dec_amp,
            "pause_count": pause_count,
            "max_gap_s": max_gap,
        })

    # redo logic (example)
    redo_recommended = (visible_fraction < 0.7) or (features.get("tap_count", 0) < 5)
    return {
        "d_norm_raw": d,          # optional artifact
        "d_norm_smooth": d_s,     # optional artifact
        "tap_indices": tap_idx,   # debug
        "tap_times_s": tap_t,
        "features": features,
        "redo_recommended": redo_recommended,
    }
```

---

## Tuning knobs you’ll likely adjust after 10–20 sample videos

* `prom_thresh` (too high → misses taps; too low → counts noise)
* `min_interval_s` (too low → double counts within one tap)
* `α` smoothing (too low α → lag; too high α → jitter)
* `visible_fraction` threshold for redo gating

---

## Minimal feature set to ship (and map to “UPDRS-like” constructs later)

Ship these first:

* `cadence_hz`, `cv_iti`
* `mean_amp`, `decrement_amp_slope`
* `pause_count`, `visible_fraction`

That’s enough to support:

* trend charts
* model input
* quality enforcement

If you paste your current `src/backend/api` structure (just filenames / routing style), I can mirror it with a suggested `finger_tap.py` placement + function boundaries without touching your existing API semantics.
