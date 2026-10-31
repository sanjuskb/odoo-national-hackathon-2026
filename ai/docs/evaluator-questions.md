# Evaluator Defense Guide: 25 Core Technical Questions & Answer Frameworks

> **Purpose:** This document prepares Sanju and the team to defend the AI/ML architecture during jury and evaluator reviews.
> Explanations are framed using clear, professional engineering concepts and practical examples.
> **Note:** Fill in problem-specific details (`[PS-SPECIFIC]`) tomorrow once the problem statement is released.

---

### 1. Why did you use AI/ML?
**Answer Framework:**  
"We used AI/ML because the relationship between the input signals and the target outcome is complex, non-linear, and difficult to express exhaustively with static hand-coded if-else statements. However, our architecture is hybrid: where business rules are clear and strict, we use deterministic logic; where pattern recognition across high-dimensional features is needed, we leverage machine learning."

---

### 2. Why is machine learning needed for this problem?
**Answer Framework:**  
"Machine learning is justified when a system must learn generalized patterns from historical data that adapt to variations in real-world behavior. If the problem could be 100% solved with a simple mathematical formula or static lookup table, we would not use ML. We evaluated a baseline heuristic first, and only applied ML because it demonstrated measurable empirical uplift."

---

### 3. Why did you choose this model?
**Answer Framework:**  
"We selected `[CHOSEN_MODEL]` after evaluating it against three criteria:
1. **Performance on tabular/text data:** It handles our feature interactions effectively.
2. **Inference Latency:** It executes in under `[X]ms`, ensuring a snappy user experience for the live demo.
3. **Interpretability:** It allows us to extract feature importances and explain individual predictions rather than acting as an unexplainable black box."

---

### 4. What data does the model use?
**Answer Framework:**  
"The model consumes `[N]` primary feature dimensions, categorized into:
- Numerical features: `[e.g., historical amounts, frequency, duration]`.
- Categorical features: `[e.g., category, region, type]`.
- Derived behavioral signals: `[e.g., ratios, recency scores]`.  
All raw inputs undergo validation and preprocessing before being passed to the model."

---

### 5. How is the data preprocessed?
**Answer Framework:**  
"Our preprocessing pipeline follows a strict, repeatable sequence:
1. **Schema validation:** Dropping or rejecting malformed payloads.
2. **Missing value imputation:** Using training medians for continuous values and explicit `'UNKNOWN'` tokens for categories.
3. **Outlier handling:** Winsorizing/clipping values beyond standard physical thresholds.
4. **Encoding & scaling:** One-hot encoding categorical variables and standardizing numerical scales using transformers fitted strictly on training data."

---

### 6. What is the difference between training and inference?
**Answer Framework:**  
"**Training** is the offline, computationally heavy phase where the model iteratively optimizes its internal parameters (weights, splits, or coefficients) on historical data by minimizing a loss function.  
**Inference** is the lightweight, real-time phase where the frozen, trained model receives new, unseen user input and calculates a prediction in milliseconds."

---

### 7. What is overfitting?
**Answer Framework:**  
"Overfitting occurs when a model memorizes the training data—including its random noise and anomalies—rather than learning generalizable patterns. The symptom is near-perfect accuracy on the training set but poor accuracy on validation or test data. We prevent overfitting through regularization, limiting tree depth, cross-validation, and keeping our model architecture simple."

---

### 8. What is underfitting?
**Answer Framework:**  
"Underfitting occurs when a model is too simplistic to capture the underlying structure of the data, resulting in poor performance on both training and test sets (e.g., using a linear line to fit a highly non-linear curve). We resolve this by adding relevant engineered features and selecting a model with appropriate expressive capacity."

---

### 9. What is a training dataset?
**Answer Framework:**  
"The training dataset is the partition of historical data (typically 70%) that the learning algorithm actively inspects to update its internal weights and optimize its parameters."

---

### 10. What is a validation dataset?
**Answer Framework:**  
"The validation dataset (typically 15%) is a held-out partition used during development to tune hyperparameters (such as regularization strength or tree depth) and compare candidate models without biasing our final evaluation."

---

### 11. What is a test dataset?
**Answer Framework:**  
"The test dataset (typically 15%) is a completely untouched partition used only once at the very end to evaluate the final chosen model. It simulates how the model will perform on genuinely unseen real-world data."

---

### 12. What is feature engineering?
**Answer Framework:**  
"Feature engineering is the process of using domain knowledge to transform raw data into informative mathematical signals that make machine learning algorithms more effective. For example, instead of feeding raw timestamps, we extract 'hour-of-day', 'is_weekend', and 'days_since_last_action'."

---

### 13. What is classification?
**Answer Framework:**  
"Classification is a supervised learning task where the target output is a discrete category or class label—such as determining whether an email is 'Spam' or 'Not Spam', or classifying a customer into 'Low', 'Medium', or 'High' risk."

---

### 14. What is regression?
**Answer Framework:**  
"Regression is a supervised learning task where the target output is a continuous numerical quantity—such as predicting the monetary price of a house, expected delivery time in minutes, or next month's sales revenue."

---

### 15. What is clustering?
**Answer Framework:**  
"Clustering is an unsupervised learning task where there are no pre-existing target labels. The algorithm groups entities based on mathematical similarity or geometric distance in feature space (e.g., segmenting customers based on purchasing habits)."

---

### 16. What is model evaluation?
**Answer Framework:**  
"Model evaluation is the systematic, quantitative assessment of a trained model's predictive capability using objective mathematical metrics on a held-out test dataset, ensuring the model generalizes well before deployment."

---

### 17. What metrics are appropriate for this problem?
**Answer Framework:**  
"For this problem, we selected `[METRIC, e.g., F1-Score / ROC-AUC / MAE]`. We specifically did not rely on simple Accuracy because `[e.g., the classes are imbalanced / false negatives carry a much higher business penalty than false positives]`. For regression, we used MAE to understand the average error in actual business units."

---

### 18. How do you handle missing data?
**Answer Framework:**  
"We apply a defensive imputation strategy in `src/preprocessing/cleaning.py`:
- Numerical fields: Missing values are filled with the training split median (which is robust to outliers).
- Categorical fields: Missing values are assigned to a dedicated `'UNKNOWN'` token, allowing the model to explicitly learn if missingness itself carries predictive signal."

---

### 19. How do you prevent data leakage?
**Answer Framework:**  
"Data leakage happens when information from outside the training dataset is inadvertently used to train the model. We prevent it by:
1. Splitting train and test sets *before* any transformation.
2. Fitting all scalers, encoders, and imputer statistics strictly on the training set, then using `.transform()` on test inputs.
3. For temporal data, strictly splitting by date to never train on the future."

---

### 20. How does the backend communicate with the AI module?
**Answer Framework:**  
"Communication is strictly contract-driven. The backend sends a typed JSON payload conforming to `contracts/input.schema.json`. The AI module processes the request and returns a standard envelope conforming to `contracts/output.schema.json` containing `success`, `model_version`, `result`, `metadata`, and `error` fields."

---

### 21. What happens if the model fails?
**Answer Framework:**  
"We implemented a fail-safe architecture:
1. Every model execution is wrapped with a timeout guard.
2. If an exception, timeout, or anomalous output occurs, the pipeline catches it and automatically executes a deterministic fallback heuristic.
3. The response returns valid data with `metadata.fallback_used = true`, ensuring the user interface never crashes during live presentation."

---

### 22. How do you protect user data?
**Answer Framework:**  
"We follow strict data minimization:
1. No raw Personally Identifiable Information (PII) like names or plain contact details are passed to feature matrices.
2. Our logging utility (`src/utils/logging.py`) automatically redacts sensitive keys and tokens.
3. No credentials or data files are committed to git; all secrets reside in ignored `.env` files."

---

### 23. What are the model's limitations?
**Answer Framework:**  
"The primary limitations are:
1. Cold start: Low accuracy for brand-new entities with zero historical features.
2. Distribution shifts: If external market conditions change drastically, the static model would need retraining.
3. Bound constraints: Extreme out-of-distribution values are clipped to physical boundaries to avoid wild extrapolations."

---

### 24. What would you improve with more time?
**Answer Framework:**  
"Given more development time beyond the hackathon:
1. Implement automated continuous retraining pipelines with drift monitoring.
2. Collect larger, more diverse real-world datasets to train more expressive gradient-boosted ensembles or neural architectures.
3. Add SHAP (Shapley Additive exPlanations) values to output granular, per-feature explanation charts in Ravi's UI."

---

### 25. Why is your approach better suited to this problem than a simpler alternative?
**Answer Framework:**  
"Our approach is superior because it combines the best of both worlds: the safety and speed of deterministic rules for clear-cut constraints, with the empirical uplift of a machine learning estimator where feature relationships are non-linear. We proved this by benchmarking directly against a simple baseline and validating a measurable improvement on held-out test data."

