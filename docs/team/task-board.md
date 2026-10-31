# Execution board — initial unverified tasks

| Priority | Task | Owner | Depends on | Proof |
|---|---|---|---|---|
| P0 | Agree demo journey, roles, tax/discount/payment policy | Sanju + Ravi | Official PS | Recorded decision |
| P0 | Approve API types and naming | Ravi + Amarnadh | Journey | Shared contract |
| P0 | Verify Supabase and Auth access | Harsha | Project connection | Connection test |
| P0 | Schema, constraints, migrations, RLS | Harsha | API/entity agreement | Migration + isolation |
| P0 | Auth, role and staff-only route | Amarnadh | Auth/schema | 401/403 tests |
| P0 | Products/variants/plans/discounts | Ravi + Amarnadh | Schema | UI/API test |
| P0 | Quotations and subscription transitions | Amarnadh + Ravi | Schema | End-to-end test |
| P0 | Deterministic invoice generation and billing periods | **Sanju primary**; Amarnadh Express integration; Harsha atomic persistence and RLS | Approved policies and invoice schema | Exact-money tests, persisted invoice and duplicate/concurrent-run proof |
| P0 | Payments and finance dashboard | Amarnadh + Ravi | Invoices | Reconciled totals |
| P0 | Customer-only portal | Ravi | Authorization | Two-user isolation |
| P0 | Thousands-of-records performance benchmark | Harsha + Ravi | Reports | Timings <2s |
| P0 | Demo evidence and video | Sanju | Integrated app | Rehearsal |
| P0 | Evaluator collaborator invite | Sanju | Username | GitHub verified |

P0 labels represent internal work sequencing, not a statement that remaining official requirements can be omitted.
