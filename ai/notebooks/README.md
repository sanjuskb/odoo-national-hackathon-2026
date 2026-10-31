# Exploratory Data Analysis & Experiment Notebooks

This directory is reserved for rapid data exploration, hypothesis testing, and model prototyping using Jupyter or Marimo notebooks.

## Hygiene Rules
1. **Never commit large cell outputs:** Strip large tables, image plots, and raw data dumps before committing.
2. **Clear sensitive variables:** Never leave API keys or tokens in code or markdown cells.
3. **Move production code to `src/`:** Notebooks are for scratchpads and exploration. Once a preprocessing step or model pipeline works, refactor it immediately into `src/`.
4. **Name notebooks sequentially:** E.g., `01_eda_distribution.ipynb`, `02_baseline_model.ipynb`.

