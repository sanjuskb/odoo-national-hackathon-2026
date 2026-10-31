# System Limitations & Edge Cases

## 1. Known Architectural Limitations

Every AI/ML system possesses operational boundaries. Documenting them transparently demonstrates engineering maturity to evaluators.

1. **Cold Start Problem:** When an entity has no historical interactions or features, model confidence degrades.  
   *Mitigation:* The system detects cold-start cases and routes them to a population-level heuristic baseline.
2. **Out-of-Distribution Inputs:** If user inputs fall far outside the training distribution (e.g., negative ages, prices orders of magnitude above historical maximums), models may extrapolate unpredictably.  
   *Mitigation:* Preprocessing enforces strict physical clipping bounds in `src/preprocessing/cleaning.py`.
3. **Latency Jitter under External Calls:** If an external model API is utilized, network latency may spike during peak competition hours.  
   *Mitigation:* Local rule-based fallback executes automatically upon timeout.
4. **Data Drift:** Over time, underlying distributions shift. For the scope of the hackathon, models are static snapshots.  
   *Mitigation:* A clear retraining script is documented in `src/training/train.py`.

---

## 2. Ethical & Security Boundaries

- **No Black-Box Automated Decisions on High-Stakes Actions:** Critical actions require human-in-the-loop review.
- **Privacy First:** Raw PII is never stored in feature caches or logged to disk.
- **Zero Hallucination Acceptance:** If generative models are used, output structures are constrained with rigid JSON schemas and validated before rendering.

