# AI/ML Engineering Module — ODDO National Hackathon 2026

[![Module Status](https://img.shields.io/badge/status-ready--for--activation-blue.svg)](docs/overview.md)
[![Branch](https://img.shields.io/badge/branch-ai%2Fml-green.svg)](../../tree/ai/ml)
[![Module Lead](https://img.shields.io/badge/owner-Sanju%20(@sanjuskb)-purple.svg)](https://github.com/sanjuskb)

Welcome to the **AI/ML Engineering Module** of the ODDO National-Level Hackathon 2026 repository.

> **IMPORTANT NOTICE:**  
> The official hackathon problem statement (PS) has not yet been released.  
> This module is intentionally **domain-neutral, modular, and implementation-ready**.  
> **No imaginary machine learning model, synthetic business rule, or fabricated accuracy metric is claimed prior to problem release.**  
> The objective of this scaffolding is to provide robust plumbing—validation pipelines, configuration systems, interface contracts, logging, testing harnesses, and execution guides—so that when the problem statement is unlocked, implementation begins instantly without repo churn.

---

## 👥 Module Ownership & Team Interfaces

| Role | Team Member | Primary Touchpoint with AI/ML |
|---|---|---|
| **AI/ML Engineer & Team Lead** | **Sanju** (`@sanjuskb`) | Module owner: algorithm/model selection, data preprocessing, training, inference, and overall system integration. |
| **System Architecture & Frontend** | **Ravi** (`@donnyravi-alt`) | Consumption of AI inference results in UI components; presentation logic; fallback states. |
| **Backend Engineer** | **Amarnath** (`@amarnathgaddam75`) | Primary integration point: orchestrates API calls between backend and AI service via [contracts/](contracts/README.md). |
| **Database Engineer** | **Harsha** (`@harsha-1706`) | Storage of raw inputs, inference logs, feature cache, and prediction histories. |

*(Note: Nikhil Yadav is no longer part of the team.)*

---

## 📁 Module Directory Architecture

```text
ai/
├── README.md                      # This specification and quickstart guide
├── docs/                          # Comprehensive technical & architectural documentation
│   ├── overview.md                # High-level module summary & objectives
│   ├── architecture.md            # Generic AI/ML execution lifecycle & paradigms
│   ├── problem-analysis-template.md # 30-minute structured PS analysis protocol
│   ├── model-selection-guide.md   # Decision framework: Heuristic vs Classical vs Deep vs LLM
│   ├── data-strategy.md           # Responsible dataset management & governance
│   ├── preprocessing-guide.md     # Feature engineering & data hygiene principles
│   ├── inference-flow.md          # Real-time vs batch inference pipelines
│   ├── evaluation-strategy.md     # Honest validation metrics & baseline benchmarking
│   ├── backend-integration.md     # Contract-first integration guide with Amarnath's backend
│   ├── limitations.md             # Edge cases, failure modes, and mitigation strategies
│   ├── evaluator-questions.md     # 25 core technical questions & defense frameworks
│   └── problem-statement-activation.md # Step-by-step Hour 0 activation checklist
│
├── config/                        # Environment & model parameter configs
│   ├── config.example.yaml        # Service and runtime settings template
│   └── model_config.example.yaml  # Model hyperparameter and registry template
│
├── contracts/                     # Versioned JSON Schemas for inter-module integration
│   ├── README.md                  # Contract guide and field specifications
│   ├── input.schema.json          # Input payload schema
│   ├── output.schema.json         # Standardized AI inference output schema
│   └── error.schema.json          # Defensive error payload schema
│
├── data/                          # Data governance hierarchy (excluded from git)
│   ├── README.md                  # Dataset policies & ethical data rules
│   ├── raw/                       # Immutable original source files (.gitkeep)
│   ├── interim/                   # Partially cleaned/transformed data (.gitkeep)
│   ├── processed/                 # Training/evaluation ready arrays (.gitkeep)
│   ├── external/                  # Public/third-party data (.gitkeep)
│   └── sample/                    # Verified synthetic test samples (clearly labelled)
│
├── notebooks/                     # Exploratory Data Analysis & experiments
│   └── README.md                  # Notebook hygiene & reproducibility guidelines
│
├── src/                           # Python source code package
│   ├── core/                      # Config loaders, custom exceptions
│   ├── data/                      # Ingestion, validation, dataset containers
│   ├── preprocessing/             # Cleaning, scaling, feature engineering
│   ├── models/                    # Model ABCs, baseline heuristics, registry
│   ├── training/                  # Training runner, metric evaluators
│   ├── inference/                 # Prediction pipeline, postprocessing, confidence calibration
│   ├── integrations/              # Amarnath's backend client & FastAPI service wrapper
│   └── utils/                     # Secret-redacting logger, timing utilities
│
├── models/                        # Serialized model artifacts (git-ignored)
│   ├── README.md                  # Artifact storage & metadata specification
│   └── .gitkeep
│
├── scripts/                       # Operational & utility scripts
│   ├── README.md                  # Scripts index
│   └── health_check.py            # Environment & inference diagnostic CLI
│
├── tests/                         # Pytest test suite
│   ├── README.md                  # Testing guidelines
│   ├── test_config.py             # Configuration validation tests
│   ├── test_validation.py         # Schema & input validation tests
│   └── test_inference.py          # Baseline model & inference engine tests
│
├── requirements.txt               # Lightweight runtime dependencies
├── requirements-dev.txt           # Testing & development dependencies
├── pyproject.toml                 # Package configuration
├── .env.example                   # Environment variable template
└── .gitignore                     # Model weights, datasets, & cache exclusions
```

---

## ⚡ Quickstart

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.13)
- `pip` package manager

### 2. Setup Local Environment
```bash
# Navigate to the AI module directory
cd ai

# Create and activate a virtual environment (optional if using system/container env)
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env for local port or backend URLs if needed
```

### 4. Run System Health Check
```bash
python scripts/health_check.py
```

### 5. Run Automated Tests
```bash
pytest
```

---

## 🔄 Hour 0: Problem Statement Activation

When the problem statement is released at 8:30 AM:
1. Open [`docs/problem-statement-activation.md`](docs/problem-statement-activation.md).
2. Execute the **30-Minute Problem Statement Analysis Protocol**.
3. Determine whether AI/ML is strictly required or if a deterministic algorithm is superior.
4. Agree on API contract schemas with Amarnath ([`contracts/`](contracts/README.md)).
5. Implement the minimal useful model or heuristic in `src/models/` and wire into `src/inference/`.
6. Run `pytest` to confirm end-to-end functionality.

---

## 🛡️ Engineering & Ethical Principles

1. **No Fake AI:** Never use an AI/ML label for a static lookup or claim a model is trained if it was not.
2. **Deterministic-First:** If a problem is solved faster, cleaner, and with 100% predictability by a rule-based algorithm, use the algorithm.
3. **Defense in Depth:** Every inference output is validated against schema before returning to the backend. AI outputs never bypass backend business invariants.
4. **Data Privacy:** Never commit API keys, personal identifiable information (PII), or unverified external datasets.

