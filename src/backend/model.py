from typing import Optional, Any, Dict, Sequence
from pathlib import Path
import os
import re
import numpy as np
import pandas as pd

try:
	from sklearn.gaussian_process import GaussianProcessRegressor
	from sklearn.gaussian_process.kernels import Matern, WhiteKernel, ConstantKernel
	from sklearn.preprocessing import StandardScaler
except Exception as e:
	raise ImportError("model.py requires scikit-learn. Install it with `pip install scikit-learn`.") from e

# optional local loss function
try:
	from loss.loss import calculate_loss
except Exception:
	calculate_loss = None  # type: ignore

# optional Supabase helper
try:
	from backend.database import get_supabase, initialize_supabase
except Exception:
	get_supabase = None  # type: ignore
	initialize_supabase = None  # type: ignore


def _detect_param_columns(df: pd.DataFrame) -> Sequence[str]:
	canonical = ["amp", "freq_hz", "pulse_width_s", "phase_rad"]
	pat = re.compile(r"^(?P<base>amp|freq_hz|pulse_width_s|phase_rad)_(?P<i>\d+)$")
	any_index = set()
	for col in df.columns:
		m = pat.match(col)
		if not m:
			continue
		any_index.add(int(m.group("i")))
	if not any_index:
		return []
	max_i = max(any_index)
	cols = []
	for i in range(max_i + 1):
		for b in canonical:
			cols.append(f"{b}_{i}")
	return cols


def _expected_improvement(mu: np.ndarray, sigma: np.ndarray, y_best: float) -> np.ndarray:
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
	patient_id: Optional[str] = None,
) -> Dict[str, Any]:
	"""Bayesian EI suggestion. Self-contained implementation that does not
	depend on `backend.bayes`.

	It fetches CSV from Supabase storage bucket (named by env or settings), or
	reads a local CSV. All columns are treated as parameters when no
	`severity` column is present (column count must be multiple of 4).
	"""

	# allow config overrides (mapping-like)
	csv_path_cfg = None
	cfg_bounds = None
	bounds_expansion = 0.1
	fallback_min_samples = 3
	if cfg is not None:
		try:
			# treat cfg as a mapping
			csv_path_cfg = cfg.get("csv_path", None)
			n = int(cfg.get("n", n))
			severity_col = cfg.get("severity_col", severity_col)
			param_columns = cfg.get("param_columns", param_columns)
			n_candidates = int(cfg.get("n_candidates", n_candidates))
			random_state = int(cfg.get("random_state", random_state))
			bounds_expansion = float(cfg.get("bounds_expansion", bounds_expansion))
			fallback_min_samples = int(cfg.get("fallback_min_samples", fallback_min_samples))
			cfg_bounds = cfg.get("bounds", None)
			patient_id = cfg.get("patient_id", patient_id)
			storage_bucket = cfg.get("storage_bucket", None)
		except Exception:
			# ignore cfg if it's not mapping-like
			csv_path_cfg = None
			storage_bucket = None

	# env overrides
	env_csv = os.getenv("CSV_PATH")
	env_patient = os.getenv("PATIENT_ID")
	if env_csv and data_path is None:
		data_path = env_csv
	if env_patient and patient_id is None:
		patient_id = env_patient

	if data_path is None and csv_path_cfg is not None:
		data_path = csv_path_cfg

	# fetch DataFrame
	df = None
	if data_path is None:
		# try Supabase storage if patient_id provided
		if patient_id is None:
			raise ValueError("No data_path or patient_id provided")
		if get_supabase is None:
			raise RuntimeError("Supabase client not available; initialize_supabase() required")
		# ensure initialized
		try:
			get_supabase()
		except Exception:
			if initialize_supabase is None:
				raise RuntimeError("Supabase client not initialized and initialize_supabase() unavailable")
			initialize_supabase()
		supabase = get_supabase()
		# determine bucket name
		try:
			from backend.config import get_settings

			storage_bucket = getattr(get_settings(), "supabase_datapoints_bucket", storage_bucket if 'storage_bucket' in locals() else "datapoints")
		except Exception:
			storage_bucket = storage_bucket if 'storage_bucket' in locals() and storage_bucket is not None else os.getenv("SUPABASE_DATAPOINTS_BUCKET", "datapoints")

		key = f"{patient_id}.csv"
		from io import BytesIO, StringIO

		try:
			res = supabase.storage.from_(storage_bucket).download(key)
		except Exception as e:
			raise RuntimeError(f"Failed to download patient CSV '{key}' from Supabase storage '{storage_bucket}': {e}")

		if isinstance(res, (bytes, bytearray)):
			df = pd.read_csv(BytesIO(res))
		elif hasattr(res, "read"):
			df = pd.read_csv(res)
		elif isinstance(res, dict) and "data" in res:
			data_bytes = res["data"]
			if isinstance(data_bytes, (bytes, bytearray)):
				df = pd.read_csv(BytesIO(data_bytes))
			else:
				df = pd.read_csv(StringIO(str(data_bytes)))
		else:
			df = pd.read_csv(StringIO(str(res)))
	else:
		data_path = Path(data_path)
		if not data_path.exists():
			raise FileNotFoundError(f"CSV data file not found: {data_path}")
		df = pd.read_csv(data_path)

	if df is None or df.empty:
		raise ValueError("No data available")
	df = df.tail(n).reset_index(drop=True)

	# detect param columns
	if param_columns is None:
		param_columns = _detect_param_columns(df)
		if not param_columns:
			# when no severity col, use all columns as params
			if severity_col not in df.columns:
				cols_candidate = list(df.columns)
			else:
				cols_candidate = [c for c in df.columns if c != severity_col]
			if len(cols_candidate) % 4 == 0 and len(cols_candidate) > 0:
				param_columns = cols_candidate
			else:
				raise ValueError("No parameter columns found and CSV columns are not a multiple of 4")

	# ensure columns exist
	cols = list(param_columns)
	for c in cols:
		if c not in df.columns:
			df[c] = pd.NA

	X = df[cols].to_numpy(dtype=float)

	# impute
	X = np.array(X, dtype=float)
	col_means = np.nanmean(X, axis=0)
	col_means = np.where(np.isnan(col_means), 0.0, col_means)
	inds = np.where(np.isnan(X))
	if inds[0].size > 0:
		X[inds] = np.take(col_means, inds[1])

	# compute targets
	if severity_col in df.columns:
		y = df[severity_col].to_numpy(dtype=float)
	else:
		if calculate_loss is None:
			raise RuntimeError("Local loss function not available and no severity column present")
		y_list = []
		for row in X:
			if row.size % 4 != 0:
				raise ValueError(f"Expected row length multiple of 4, got {row.size}")
			n_elec = row.size // 4
			param_matrix = row.reshape(n_elec, 4).T
			loss_val = calculate_loss(param_matrix)
			y_list.append(float(loss_val))
		y = np.asarray(y_list, dtype=float)

	# handle small datasets
	if len(y) < fallback_min_samples:
		last = df[cols].iloc[-1].to_dict()
		return {"next_params": last, "model": None, "bounds": None}

	# scale
	x_scaler = StandardScaler()
	Xs = x_scaler.fit_transform(X)
	y_mean = np.mean(y)
	y_std = np.std(y) if np.std(y) > 0 else 1.0
	ys = (y - y_mean) / y_std

	# GP
	kernel = ConstantKernel(1.0, (1e-3, 1e3)) * Matern(length_scale=np.ones(Xs.shape[1]), nu=2.5)
	kernel += WhiteKernel(noise_level=1e-6, noise_level_bounds=(1e-10, 1e1))
	gp = GaussianProcessRegressor(kernel=kernel, normalize_y=True, random_state=random_state)
	gp.fit(Xs, ys)

	# candidate sampling
	param_mins = np.min(X, axis=0)
	param_maxs = np.max(X, axis=0)
	ranges = param_maxs - param_mins
	param_low = np.empty_like(param_mins)
	param_high = np.empty_like(param_maxs)
	for j, name in enumerate(cols):
		base = name.rsplit("_", 1)[0]
		if cfg is not None and cfg_bounds is not None and base in cfg_bounds:
			b = cfg_bounds[base]
			param_low[j] = float(b[0])
			param_high[j] = float(b[1])
		else:
			param_low[j] = param_mins[j] - bounds_expansion * ranges[j]
			param_high[j] = param_maxs[j] + bounds_expansion * ranges[j]

	rng = np.random.default_rng(random_state)
	cand = rng.uniform(param_low, param_high, size=(n_candidates, X.shape[1]))
	cand_s = x_scaler.transform(cand)

	mu, sigma = gp.predict(cand_s, return_std=True)
	mu_unscaled = mu * y_std + y_mean
	sigma_unscaled = sigma * y_std

	y_best = np.min(y)
	ei = _expected_improvement(mu_unscaled, sigma_unscaled, y_best)

	best_idx = int(np.argmax(ei))
	best_cand = cand[best_idx]

	next_params = {name: float(val) for name, val in zip(param_columns, best_cand)}
	bounds = {name: (float(low), float(high)) for name, low, high in zip(param_columns, param_low, param_high)}

	return {"next_params": next_params, "model": gp, "bounds": bounds}

