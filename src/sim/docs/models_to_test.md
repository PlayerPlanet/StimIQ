# Candidate loss models (IMU -> severity proxy)

- XGBoost regressor on flattened IMU windows.
- Conv1D regressor with global pooling and `tanh` output.

Run baseline comparison:

```bash
python -m sim.loss_model.train_compare --dataset <path_to_windows.npz>
```
