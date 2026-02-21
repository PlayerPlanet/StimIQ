"""Bayesian suggestion for next stimulus parameters.

This module provides `model(data_path, n=50, ...)` which:
- loads a CSV file containing stimulus records (rows are runs / trials),
- uses per-electrode parameter columns to build a feature vector,
- fits a Gaussian Process regression where the target (loss) is the
	`severity` column, and
- runs a cheap acquisition optimization (random search) to propose the next
	parameter vector that is expected to minimize severity (loss).

Notes:
- `data_path` should point to a CSV file readable by `pandas.read_csv`.
- Requires `pandas`, `numpy`, `scikit-learn` and `scipy`.
"""

from __future__ import annotations

from typing import Sequence, Dict, Any, Optional
from pathlib import Path
from io import BytesIO
from numbers import Integral
import warnings
import numpy as np
import pandas as pd
import re

try:
	from sklearn.gaussian_process import GaussianProcessRegressor
	from sklearn.gaussian_process.kernels import Matern, WhiteKernel, ConstantKernel
	from sklearn.preprocessing import StandardScaler
	from sklearn.exceptions import ConvergenceWarning
except Exception as e:
	raise ImportError(
		"bayes.py requires scikit-learn. Install it with `pip install scikit-learn`."
	) from e
try:
	from omegaconf import DictConfig, OmegaConf
	import hydra
except Exception:
	# don't force hydra at import-time for consumers who just want `model()`
	DictConfig = None  # type: ignore
	OmegaConf = None  # type: ignore
	hydra = None

# optional import for Supabase-backed data fetching
try:
	from database import get_supabase
except Exception:
	get_supabase = None  # type: ignore
try:
	from config import get_settings
except Exception:
	get_settings = None  # type: ignore


def _detect_param_columns(df: pd.DataFrame) -> Sequence[str]:
	"""Detect per-electrode parameter columns and return a flattened ordered list.

	Expected column naming: `<base>_<i>` where `<base>` is exactly one of
	`amp`, `freq_hz`, `pulse_width_s`, `phase_rad` and `i` is the electrode index.

	Returns columns ordered as [amp_0, freq_hz_0, pulse_width_0, phase_rad_0,
	amp_1, freq_hz_1, ...]. Missing columns are still included so the feature
	matrix has a fixed width and missing values can be imputed.
	"""
	# allowed exact bases
	canonical = ["amp", "freq_hz", "pulse_width_s", "phase_rad"]
	any_index = set()
	pat = re.compile(r"^(?P<base>amp|freq_hz|pulse_width_s|phase_rad)_(?P<i>\d+)$")
	for col in df.columns:
		m = pat.match(col)
		if not m:
			continue
		base = m.group("base")
		i = int(m.group("i"))
		any_index.add(i)

	if not any_index:
		return []

	max_i = max(any_index)
	cols: list[str] = []
	for i in range(max_i + 1):
		for b in canonical:
			cols.append(f"{b}_{i}")
	return cols


def _expected_improvement(mu: np.ndarray, sigma: np.ndarray, y_best: float) -> np.ndarray:
	"""Expected Improvement for minimization (lower is better).

	EI(x) = E[max(0, y_best - f(x))]
	"""
	from scipy.stats import norm

	sigma = sigma.reshape(-1)
	mu = mu.reshape(-1)
	with np.errstate(divide="warn"):
		z = (y_best - mu) / sigma
		ei = (y_best - mu) * norm.cdf(z) + sigma * norm.pdf(z)
		ei[sigma == 0.0] = 0.0
	return ei


def model(
	data_path: Optional[str] = None,
	n: int = 50,
	severity_col: str = "severity",
	param_columns: Optional[Sequence[str]] = None,
	n_candidates: int = 5000,
	random_state: int = 0,
	batch_size: int = 1,
	exploration_weight: float = 0.2,
	min_distance_frac: float = 0.05,
	cfg: Optional[Any] = None,
	patient_id: Optional[str] = None,
) -> Dict[str, Any]:
	"""Fetch last `n` datapoints and propose next parameters.

	Returns a dict with keys:
	- `next_params`: dict mapping parameter name -> suggested value
	- `model`: the fitted GaussianProcessRegressor (in case caller wants it)
	- `bounds`: inferred bounds used for search
	"""
	# apply config overrides if provided (DictConfig or mapping)
	csv_path = None
	bounds_expansion = 0.1
	fallback_min_samples = 3
	storage_bucket = "datapoints"
	if cfg is not None and OmegaConf is not None:
		c = OmegaConf.to_container(cfg, resolve=True)
		csv_path = c.get("csv_path", None)
		n = int(c.get("n", n))
		severity_col = c.get("severity_col", severity_col)
		param_columns = c.get("param_columns", param_columns)
		# allow patient_id in config (e.g., configs/bayes.yaml)
		patient_id = c.get("patient_id", patient_id)
		n_candidates = int(c.get("n_candidates", n_candidates))
		random_state = int(c.get("random_state", random_state))
		batch_size = int(c.get("batch_size", batch_size))
		exploration_weight = float(c.get("exploration_weight", exploration_weight))
		min_distance_frac = float(c.get("min_distance_frac", min_distance_frac))
		bounds_expansion = float(c.get("bounds_expansion", bounds_expansion))
		fallback_min_samples = int(c.get("fallback_min_samples", fallback_min_samples))
		cfg_bounds = c.get("bounds", None)
		storage_bucket = c.get("storage_bucket", storage_bucket)

# If Supabase is available, prefer the bucket name from runtime settings
if get_supabase is not None:
	try:
		from backend.config import get_settings

		storage_bucket = get_settings().supabase_datapoints_bucket
	except Exception:
		# keep existing value if settings not available
		pass

	# determine data source: prefer explicit data_path param, else config csv_path,
	# else attempt Supabase Storage (patient csv), then optional table fallback
	df = None
	if data_path is None:
		if csv_path is not None:
			data_path = csv_path
		else:
			# try Supabase
			if get_supabase is None:
				raise ValueError("No data path provided and Supabase client not available. Provide `data_path` or set `csv_path` in config.")
			supabase = get_supabase()
			settings = None
			if get_settings is not None:
				settings = get_settings()

			# Preferred source: datapoints CSV in Supabase Storage
			if settings is not None and settings.bayes_patient_id:
				bucket = settings.supabase_datapoints_bucket
				object_path = settings.bayes_datapoints_object_path or f"{settings.bayes_patient_id}.csv"
				try:
					content = supabase.storage.from_(bucket).download(object_path)
					if isinstance(content, str):
						content = content.encode("utf-8")
					df = pd.read_csv(BytesIO(content))
					# Storage CSV may be a single semicolon-delimited row with no header.
					if df.empty:
						df = pd.read_csv(BytesIO(content), sep=";", header=None)
				except Exception as e:
					raise RuntimeError(
						f"Failed to fetch CSV '{object_path}' from bucket '{bucket}': {e}"
					)
			else:
				# Fallback source: rows from configured stimuli table
				stimuli_table = "stimuli"
				if settings is not None:
					stimuli_table = settings.supabase_stimuli_table
				try:
					resp = supabase.table(stimuli_table).select("*").order("created_at", desc=True).limit(n).execute()
					data = resp.data
					if not data:
						raise ValueError(f"No records returned from Supabase table '{stimuli_table}'")
					df = pd.DataFrame(data)
				except Exception as e:
					raise RuntimeError(f"Failed to fetch stimuli from Supabase: {e}")

	if df is None:
		data_path = Path(data_path)
		if not data_path.exists():
			raise FileNotFoundError(f"CSV data file not found: {data_path}")
		df = pd.read_csv(data_path)
	if df.empty:
		raise ValueError("Configured stimuli source is empty")
	df = df.tail(n).reset_index(drop=True)

	# Support headerless per-electrode parameter CSVs (e.g. 16 params or 16 params + severity).
	if param_columns is None and all(isinstance(c, Integral) for c in df.columns):
		has_severity_tail = (df.shape[1] % 4 == 1)
		n_param_cols = df.shape[1] - 1 if has_severity_tail else df.shape[1]
		if n_param_cols % 4 == 0:
			canonical = ["amp", "freq_hz", "pulse_width_s", "phase_rad"]
			n_electrodes = n_param_cols // 4
			renamed: dict[int, str] = {}
			inferred_cols: list[str] = []
			k = 0
			for i in range(n_electrodes):
				for base in canonical:
					name = f"{base}_{i}"
					renamed[k] = name
					inferred_cols.append(name)
					k += 1
			if has_severity_tail:
				renamed[n_param_cols] = severity_col
			df = df.rename(columns=renamed)
			param_columns = inferred_cols

	# detect parameter columns if not provided
	if param_columns is None:
		param_columns = _detect_param_columns(df)
		# fallback: if detection failed, use all columns as parameters when no severity present
		if not param_columns:
			if severity_col not in df.columns:
				cols_candidate = list(df.columns)
			else:
				cols_candidate = [c for c in df.columns if c != severity_col]
			if len(cols_candidate) % 4 == 0 and len(cols_candidate) > 0:
				param_columns = cols_candidate
			else:
				raise ValueError("No parameter columns found in `stimuli` table and CSV columns are not a multiple of 4")
	if not param_columns:
		raise ValueError("No parameter columns found in configured stimuli source")
	if severity_col not in df.columns:
		# When the CSV has only stimulation parameters (no loss/severity yet),
		# return the latest parameters as a safe fallback.
		last = df[list(param_columns)].iloc[-1].to_dict()
		return {"next_params": last, "model": None, "bounds": None}

	# build feature matrix for possibly generated/missing per-electrode columns
	cols = list(param_columns)
	# ensure columns exist in dataframe; if not, create so we can impute
	for c in cols:
		if c not in df.columns:
			df[c] = pd.NA

	X = df[cols].to_numpy(dtype=float)
	y = df[severity_col].to_numpy(dtype=float)

	# collapse duplicate parameter rows by averaging severity to reduce
	# pathological GP fits on repeated identical X values.
	if X.shape[0] > 1:
		xy = pd.DataFrame(X, columns=cols)
		xy[severity_col] = y
		agg = xy.groupby(cols, dropna=False, as_index=False)[severity_col].mean()
		X = agg[cols].to_numpy(dtype=float)
		y = agg[severity_col].to_numpy(dtype=float)

	# handle tiny datasets
	if len(y) < fallback_min_samples:
		# fallback: return mean of observed parameters (or last row)
		last = df[list(param_columns)].iloc[-1].to_dict()
		return {"next_params": last, "model": None, "bounds": None}

	# impute missing feature values (column-wise mean) before scaling
	X = np.array(X, dtype=float)
	col_means = np.nanmean(X, axis=0)
	# where all-nan, replace by zero
	col_means = np.where(np.isnan(col_means), 0.0, col_means)
	inds = np.where(np.isnan(X))
	if inds[0].size > 0:
		X[inds] = np.take(col_means, inds[1])

	# compute target losses: prefer explicit severity column, else use calculate_loss
	if severity_col in df.columns:
		y = df[severity_col].to_numpy(dtype=float)
	else:
		if calculate_loss is None:
			raise ValueError("No severity column and local loss function unavailable")
		y_list = []
		for row in X:
			if row.size % 4 != 0:
				raise ValueError(f"Expected row length multiple of 4, got {row.size}")
			n_elec = row.size // 4
			param_matrix = row.reshape(n_elec, 4).T
			loss_val = calculate_loss(param_matrix)
			y_list.append(float(loss_val))
		y = np.asarray(y_list, dtype=float)

	# standardize inputs and outputs
	x_scaler = StandardScaler()
	Xs = x_scaler.fit_transform(X)

	y_mean = np.mean(y)
	y_std = np.std(y) if np.std(y) > 0 else 1.0
	ys = (y - y_mean) / y_std

	# Gaussian Process
	# Keep ARD bounds tighter on standardized inputs to reduce runaway
	# length-scales when the response is weakly informative.
	kernel = ConstantKernel(1.0, (1e-2, 1e2)) * Matern(
		length_scale=np.ones(Xs.shape[1]),
		length_scale_bounds=(1e-2, 1e2),
		nu=2.5,
	)
	kernel += WhiteKernel(noise_level=1e-3, noise_level_bounds=(1e-6, 1.0))
	gp = GaussianProcessRegressor(
		kernel=kernel,
		normalize_y=False,  # ys is already standardized
		random_state=random_state,
		n_restarts_optimizer=1,
		alpha=1e-6,
	)
	with warnings.catch_warnings(record=True) as caught:
		warnings.simplefilter("always", ConvergenceWarning)
		gp.fit(Xs, ys)
		has_gp_warning = any(issubclass(w.category, ConvergenceWarning) for w in caught)
	if has_gp_warning:
		# Fallback to fixed hyperparameters (no optimizer) for stability.
		fixed_kernel = ConstantKernel(1.0) * Matern(length_scale=np.ones(Xs.shape[1]), nu=2.5)
		fixed_kernel += WhiteKernel(noise_level=1e-2)
		gp = GaussianProcessRegressor(
			kernel=fixed_kernel,
			optimizer=None,
			normalize_y=False,
			random_state=random_state,
			alpha=1e-6,
		)
		gp.fit(Xs, ys)

	# inference: propose candidates by random sampling inside inferred bounds
	param_mins = np.min(X, axis=0)
	param_maxs = np.max(X, axis=0)
	# expand bounds slightly, allow config-provided bounds per base
	ranges = param_maxs - param_mins
	param_low = np.empty_like(param_mins)
	param_high = np.empty_like(param_maxs)
	min_span_by_base = {
		"amp": 0.2,
		"freq_hz": 10.0,
		"pulse_width_s": 0.5,
		"phase_rad": 0.5,
	}
	for j, name in enumerate(cols):
		base = name.rsplit("_", 1)[0]
		if cfg is not None and OmegaConf is not None and cfg_bounds is not None and base in cfg_bounds:
			b = cfg_bounds[base]
			param_low[j] = float(b[0])
			param_high[j] = float(b[1])
		else:
			if ranges[j] <= 0.0:
				span = min_span_by_base.get(base, 1.0)
				center = float(param_mins[j])
				param_low[j] = center - span
				param_high[j] = center + span
			else:
				param_low[j] = param_mins[j] - bounds_expansion * ranges[j]
				param_high[j] = param_maxs[j] + bounds_expansion * ranges[j]
			if base in {"amp", "freq_hz", "pulse_width_s"}:
				param_low[j] = max(0.0, param_low[j])

	rng = np.random.default_rng(random_state)
	cand = rng.uniform(param_low, param_high, size=(n_candidates, X.shape[1]))
	# transform candidates
	cand_s = x_scaler.transform(cand)

	mu, sigma = gp.predict(cand_s, return_std=True)
	# unscale predictions to original severity scale
	mu_unscaled = mu * y_std + y_mean
	sigma_unscaled = sigma * y_std

	y_best = np.min(y)  # current best (smaller severity better)
	ei = _expected_improvement(mu_unscaled, sigma_unscaled, y_best)
	# Exploration-augmented acquisition.
	score = ei + exploration_weight * sigma_unscaled

	# Diversity filter in normalized parameter space.
	span = np.where((param_high - param_low) <= 1e-12, 1.0, (param_high - param_low))
	cand_n = (cand - param_low) / span
	X_n = (X - param_low) / span
	order = np.argsort(-score)
	selected_idx: list[int] = []
	min_d = max(0.0, float(min_distance_frac))
	for idx in order:
		v = cand_n[idx]
		# keep distance from observed points
		if X_n.shape[0] > 0:
			d_obs = np.linalg.norm(X_n - v, axis=1)
			if np.any(d_obs < min_d):
				continue
		# keep distance from already selected points
		if selected_idx:
			d_sel = np.linalg.norm(cand_n[selected_idx] - v, axis=1)
			if np.any(d_sel < min_d):
				continue
		selected_idx.append(int(idx))
		if len(selected_idx) >= max(1, int(batch_size)):
			break
	# fallback if diversity threshold was too strict
	if not selected_idx:
		selected_idx = [int(order[0])]
	while len(selected_idx) < max(1, int(batch_size)):
		for idx in order:
			if int(idx) not in selected_idx:
				selected_idx.append(int(idx))
				break
		if len(selected_idx) == len(order):
			break

	best_cand = cand[selected_idx[0]]
	next_params = {name: float(val) for name, val in zip(param_columns, best_cand)}
	next_params_batch = [
		{name: float(val) for name, val in zip(param_columns, cand[i])}
		for i in selected_idx
	]

	bounds = {name: (float(low), float(high)) for name, low, high in zip(param_columns, param_low, param_high)}

	return {
		"next_params": next_params,
		"next_params_batch": next_params_batch,
		"model": gp,
		"bounds": bounds,
	}


if hydra is not None:
	@hydra.main(config_path="configs", config_name="bayes", version_base="1.3")
	def run(cfg: Any):
		"""Hydra entrypoint example. Prints resolved config.

		Use this as a reference for running with Hydra, e.g.:
		python -m src.backend.Bayes
		(when run as module with proper package path), or adapt to your app.
		"""
		print(OmegaConf.to_yaml(cfg))

	# expose run for CLI use
	__all__ = ["model", "run"]
