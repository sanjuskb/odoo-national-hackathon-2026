# Test Plan & Quality Assurance Strategy

## 1. Quality Objectives
- Ensure critical user journeys and business logic operate reliably during live evaluation.
- Eliminate edge cases that could cause application crash or unhandled 500 errors.
- Validate API contracts between frontend and backend.

## 2. Test Pyramid
1. **Unit Tests (`tests/unit/`):**
   - Business calculation logic, data validation schemas, utility functions.
2. **Integration Tests (`tests/integration/`):**
   - API endpoints, database queries, authentication & authorization flows.
3. **End-to-End & Demo Smoke Tests (`tests/e2e/`):**
   - Primary user workflow walk-throughs to verify UI and backend connectivity.

## 3. Pre-PR Checklist
Before submitting a PR to `develop`:
- [ ] Unit tests execute with 100% pass rate.
- [ ] Database migrations run cleanly up and down.
- [ ] No regression in existing endpoints or UI components.
