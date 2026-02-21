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
import numpy as np
import pandas as pd
import re

try:
	from sklearn.gaussian_process import GaussianProcessRegressor
	from sklearn.gaussian_process.kernels import Matern, WhiteKernel, ConstantKernel
	from sklearn.preprocessing import StandardScaler
except Exception as e:
	raise ImportError(
		"Bayes.py requires scikit-learn. Install it with `pip install scikit-learn`."
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
	cfg: Optional[Any] = None,
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
	if cfg is not None and OmegaConf is not None:
		c = OmegaConf.to_container(cfg, resolve=True)
		csv_path = c.get("csv_path", None)
		n = int(c.get("n", n))
		severity_col = c.get("severity_col", severity_col)
		param_columns = c.get("param_columns", param_columns)
		n_candidates = int(c.get("n_candidates", n_candidates))
		random_state = int(c.get("random_state", random_state))
		bounds_expansion = float(c.get("bounds_expansion", bounds_expansion))
		fallback_min_samples = int(c.get("fallback_min_samples", fallback_min_samples))
		cfg_bounds = c.get("bounds", None)

	# determine data source: prefer explicit data_path param, else config csv_path,
	# else attempt Supabase if available
	df = None
	if data_path is None:
		if csv_path is not None:
			data_path = csv_path
		else:
			# try Supabase
			if get_supabase is None:
				raise ValueError("No data path provided and Supabase client not available. Provide `data_path` or set `csv_path` in config.")
			supabase = get_supabase()
			try:
				# request recent rows from 'stimuli' table
				resp = supabase.table("stimuli").select("*").order("created_at", desc=True).limit(n).execute()
				data = resp.data
				if not data:
					raise ValueError("No records returned from Supabase 'stimuli' table")
				# supabase returns rows in descending order; take as-is and reset index later
				df = pd.DataFrame(data)
			except Exception as e:
				raise RuntimeError(f"Failed to fetch stimuli from Supabase: {e}")

	if df is None:
		data_path = Path(data_path)
		if not data_path.exists():
			raise FileNotFoundError(f"CSV data file not found: {data_path}")
		df = pd.read_csv(data_path)
	if df.empty:
		raise ValueError("`stimuli` table is empty")
	df = df.tail(n).reset_index(drop=True)

	# detect parameter columns if not provided
	if param_columns is None:
		param_columns = _detect_param_columns(df)
	if not param_columns:
		raise ValueError("No parameter columns found in `stimuli` table")
	if severity_col not in df.columns:
		raise ValueError(f"Severity column '{severity_col}' not found in table")

	# build feature matrix for possibly generated/missing per-electrode columns
	cols = list(param_columns)
	# ensure columns exist in dataframe; if not, create so we can impute
	for c in cols:
		if c not in df.columns:
			df[c] = pd.NA

	X = df[cols].to_numpy(dtype=float)
	y = df[severity_col].to_numpy(dtype=float)

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

	# standardize inputs and outputs
	x_scaler = StandardScaler()
	Xs = x_scaler.fit_transform(X)

	y_mean = np.mean(y)
	y_std = np.std(y) if np.std(y) > 0 else 1.0
	ys = (y - y_mean) / y_std

	# Gaussian Process
	kernel = ConstantKernel(1.0, (1e-3, 1e3)) * Matern(length_scale=np.ones(Xs.shape[1]), nu=2.5)
	kernel += WhiteKernel(noise_level=1e-6, noise_level_bounds=(1e-10, 1e1))
	gp = GaussianProcessRegressor(kernel=kernel, normalize_y=True, random_state=random_state)
	gp.fit(Xs, ys)

	# inference: propose candidates by random sampling inside inferred bounds
	param_mins = np.min(X, axis=0)
	param_maxs = np.max(X, axis=0)
	# expand bounds slightly, allow config-provided bounds per base
	ranges = param_maxs - param_mins
	param_low = np.empty_like(param_mins)
	param_high = np.empty_like(param_maxs)
	for j, name in enumerate(cols):
		base = name.rsplit("_", 1)[0]
		if cfg is not None and OmegaConf is not None and cfg_bounds is not None and base in cfg_bounds:
			b = cfg_bounds[base]
			param_low[j] = float(b[0])
			param_high[j] = float(b[1])
		else:
			param_low[j] = param_mins[j] - bounds_expansion * ranges[j]
			param_high[j] = param_maxs[j] + bounds_expansion * ranges[j]

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

	best_idx = int(np.argmax(ei))
	best_cand = cand[best_idx]

	next_params = {name: float(val) for name, val in zip(param_columns, best_cand)}

	bounds = {name: (float(low), float(high)) for name, low, high in zip(param_columns, param_low, param_high)}

	return {"next_params": next_params, "model": gp, "bounds": bounds}


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
