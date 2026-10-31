"""
HTML Template for the Brightloop AI Interactive Demo Dashboard.
"""

DEMO_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Brightloop AI — Grounded Customer Assistant & Voice Demo</title>
  <style>
    :root {
      --primary: #4f46e5;
      --primary-hover: #4338ca;
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --success: #10b981;
      --danger: #ef4444;
      --accent: #06b6d4;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding: 24px; }
    .container { max-width: 1200px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
    h1 { font-size: 1.5rem; color: #fff; display: flex; align-items: center; gap: 8px; }
    .badge { font-size: 0.75rem; padding: 4px 8px; border-radius: 9999px; background: rgba(16, 185, 129, 0.2); color: var(--success); border: 1px solid var(--success); }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media(max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; }
    .card h2 { font-size: 1.1rem; margin-bottom: 16px; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 8px; }
    .selector-bar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
    select, input, button { font-size: 0.9rem; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border); outline: none; }
    select { background: #0f172a; color: #fff; flex: 1; }
    button { background: var(--primary); color: #fff; border: none; cursor: pointer; transition: 0.2s; font-weight: 500; }
    button:hover { background: var(--primary-hover); }
    .btn-secondary { background: #334155; }
    .btn-secondary:hover { background: #475569; }
    .btn-danger { background: rgba(239, 68, 68, 0.2); color: var(--danger); border: 1px solid var(--danger); }
    .btn-danger:hover { background: rgba(239, 68, 68, 0.3); }
    .chat-box { flex: 1; height: 320px; overflow-y: auto; background: #0f172a; border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
    .msg { max-width: 85%; padding: 10px 14px; border-radius: 8px; font-size: 0.9rem; line-height: 1.4; }
    .msg.user { align-self: flex-end; background: var(--primary); color: #fff; border-bottom-right-radius: 2px; }
    .msg.assistant { align-self: flex-start; background: #334155; color: #f8fafc; border-bottom-left-radius: 2px; white-space: pre-line; }
    .quick-prompts { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
    .quick-btn { font-size: 0.75rem; padding: 4px 8px; background: #1e293b; border: 1px solid var(--border); color: var(--text-muted); border-radius: 4px; cursor: pointer; }
    .quick-btn:hover { border-color: var(--accent); color: var(--text); }
    .chat-input-row { display: flex; gap: 8px; }
    .chat-input-row input { flex: 1; background: #0f172a; color: #fff; }
    .status-panel { background: #0f172a; border-radius: 8px; padding: 12px; border: 1px solid var(--border); margin-top: 12px; font-family: monospace; font-size: 0.85rem; }
    .kv-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .kv-key { color: var(--text-muted); }
    .kv-val { font-weight: bold; color: #fff; }
    .script-box { background: #0f172a; border: 1px solid var(--border); border-radius: 6px; padding: 10px; font-size: 0.85rem; color: #e2e8f0; margin-top: 10px; max-height: 140px; overflow-y: auto; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>Brightloop AI Assistant & Invoice Intelligence</h1>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">45-Second Evaluator Demonstration — Hackathon 2026</p>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span class="badge" id="llm-badge">Gemini LLM: Ready</span>
        <span class="badge" id="tts-badge">Murf TTS: Ready</span>
      </div>
    </header>

    <div class="selector-bar">
      <label style="font-size: 0.9rem; color: var(--text-muted);">Active Customer Session:</label>
      <select id="customer-select" onchange="onCustomerChange()">
        <option value="cust-101">Alice Smith (TechCorp) — Pro Plan ($49/mo, Unpaid Invoice inv-301)</option>
        <option value="cust-202">Bob Freelance (Starter Plan $19/mo, Paid Invoice inv-302)</option>
      </select>
    </div>

    <div class="grid">
      <!-- Section 1: Customer Assistant Chatbot -->
      <div class="card">
        <h2>1. Grounded Customer Assistant Chatbot</h2>
        <div class="quick-prompts">
          <span style="font-size: 0.75rem; color: var(--text-muted); align-self: center;">Quick Demo Questions:</span>
          <button class="quick-btn" onclick="sendPrompt('What subscription am I currently using?')">What subscription am I using?</button>
          <button class="quick-btn" onclick="sendPrompt('When is my next renewal?')">When is my next renewal?</button>
          <button class="quick-btn" onclick="sendPrompt('Can you explain my latest invoice?')">Explain my latest invoice</button>
        </div>
        <div class="chat-box" id="chat-box">
          <div class="msg assistant">Hello! I am your Brightloop Subscription Assistant. Ask me anything regarding your active subscription, upcoming renewal dates, invoices, or available plans.</div>
        </div>
        <div class="chat-input-row">
          <input type="text" id="chat-input" placeholder="Type a subscription or billing question..." onkeydown="if(event.key==='Enter') sendChat()">
          <button onclick="sendChat()">Send</button>
        </div>
      </div>

      <!-- Section 2: Invoice Intelligence & Voice Simulation -->
      <div class="card" style="gap: 16px;">
        <div>
          <h2>2. Invoice Intelligence (Strict Persisted Records)</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">
            AI explains verified invoice lines, GST taxes, and totals without hallucinating figures.
          </p>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button onclick="explainInvoice('inv-301')">Explain Invoice inv-301 ($53.90)</button>
            <button class="btn-danger" onclick="testCrossCustomer()">Test Security: Access Bob's inv-302</button>
          </div>
          <div class="status-panel" id="invoice-result" style="display: none;">
            <div class="kv-row"><span class="kv-key">Invoice Number:</span><span class="kv-val" id="inv-num">-</span></div>
            <div class="kv-row"><span class="kv-key">Status / Due Date:</span><span class="kv-val" id="inv-status">-</span></div>
            <div class="kv-row"><span class="kv-key">Subtotal / Tax:</span><span class="kv-val" id="inv-subtax">-</span></div>
            <div class="kv-row"><span class="kv-key">Total Outstanding:</span><span class="kv-val" id="inv-total" style="color: var(--accent);">-</span></div>
            <div class="script-box" id="inv-narrative"></div>
          </div>
        </div>

        <div>
          <h2>3. AI Voice Assistance Call (Murf TTS)</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">
            Simulates post-activation welcome call. Verifies consent, synthesizes speech, and masks PII.
          </p>
          <button class="btn-secondary" onclick="triggerVoiceCall()">Trigger Activation Welcome Call</button>
          <div class="status-panel" id="voice-result" style="display: none;">
            <div class="kv-row"><span class="kv-key">Recipient (Masked):</span><span class="kv-val" id="call-phone">-</span></div>
            <div class="kv-row"><span class="kv-key">Consent Status:</span><span class="kv-val" id="call-consent" style="color: var(--success);">-</span></div>
            <div class="kv-row"><span class="kv-key">TTS Audio Synthesized:</span><span class="kv-val" id="call-tts">-</span></div>
            <div class="kv-row"><span class="kv-key">Dispatch Status:</span><span class="kv-val" id="call-status">-</span></div>
            <div class="script-box" id="call-script"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    let currentCustomerId = "cust-101";

    function onCustomerChange() {
      currentCustomerId = document.getElementById("customer-select").value;
      const box = document.getElementById("chat-box");
      box.innerHTML = `<div class="msg assistant">Switched customer session to <b>${currentCustomerId}</b>. Context updated from verified backend records.</div>`;
      document.getElementById("invoice-result").style.display = "none";
      document.getElementById("voice-result").style.display = "none";
    }

    function appendMessage(role, text) {
      const box = document.getElementById("chat-box");
      const d = document.createElement("div");
      d.className = "msg " + role;
      d.innerText = text;
      box.appendChild(d);
      box.scrollTop = box.scrollHeight;
    }

    async function sendPrompt(text) {
      document.getElementById("chat-input").value = text;
      await sendChat();
    }

    async function sendChat() {
      const input = document.getElementById("chat-input");
      const msg = input.value.trim();
      if (!msg) return;
      appendMessage("user", msg);
      input.value = "";

      try {
        const res = await fetch("/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: msg,
            context: {
              customer_id: currentCustomerId,
              email: currentCustomerId === "cust-101" ? "alice@techcorp.example" : "bob@freelance.example",
              role: "customer"
            }
          })
        });
        const data = await res.json();
        if (res.ok) {
          appendMessage("assistant", data.reply);
        } else {
          appendMessage("assistant", "⚠️ Error: " + (data.detail?.message || "Failed to process chat"));
        }
      } catch (err) {
        appendMessage("assistant", "⚠️ Connection failed: " + err.message);
      }
    }

    async function explainInvoice(invId) {
      const panel = document.getElementById("invoice-result");
      panel.style.display = "block";
      try {
        const res = await fetch("/invoice/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_id: invId,
            customer_id: currentCustomerId
          })
        });
        const data = await res.json();
        if (res.ok) {
          document.getElementById("inv-num").innerText = data.invoice_number;
          document.getElementById("inv-status").innerText = data.status.toUpperCase() + " | Due " + data.due_date;
          document.getElementById("inv-subtax").innerText = "$" + data.subtotal + " + $" + data.total_tax + " tax";
          document.getElementById("inv-total").innerText = "$" + data.total_amount + " (Outstanding: $" + data.outstanding_balance + ")";
          document.getElementById("inv-narrative").innerText = data.explanation_narrative;
        } else {
          alert("Error: " + JSON.stringify(data.detail));
        }
      } catch (err) {
        alert("Invoice call failed: " + err.message);
      }
    }

    async function testCrossCustomer() {
      alert("Testing Security: Customer " + currentCustomerId + " attempting to access Bob's invoice (inv-302)...");
      try {
        const res = await fetch("/invoice/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_id: "inv-302",
            customer_id: currentCustomerId // If Alice, this is unauthorized
          })
        });
        const data = await res.json();
        if (res.status === 403) {
          alert("🛡️ ACCESS FORBIDDEN (HTTP 403) PROVEN:\n\n" + data.detail?.message + "\n\nZero-trust customer data defense is active!");
        } else if (res.ok) {
          alert("Access allowed for authorized owner.");
        } else {
          alert("Response (" + res.status + "): " + JSON.stringify(data.detail));
        }
      } catch (err) {
        alert("Call error: " + err.message);
      }
    }

    async function triggerVoiceCall() {
      const panel = document.getElementById("voice-result");
      panel.style.display = "block";
      try {
        const res = await fetch("/voice/assistance-call/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: "evt-ui-" + Date.now(),
            subscription_id: currentCustomerId === "cust-101" ? "sub-101" : "sub-202",
            customer_id: currentCustomerId,
            plan_id: currentCustomerId === "cust-101" ? "plan-pro" : "plan-basic",
            plan_name: currentCustomerId === "cust-101" ? "Professional Plan" : "Starter Plan"
          })
        });
        const data = await res.json();
        if (res.ok) {
          document.getElementById("call-phone").innerText = data.customer_phone_masked;
          document.getElementById("call-consent").innerText = data.status === "cancelled" ? "OPTED OUT" : "VERIFIED & GRANTED";
          document.getElementById("call-tts").innerText = data.audio_synthesized ? "True (Murf Audio Ready)" : "Simulated Audio";
          document.getElementById("call-status").innerText = data.status.toUpperCase() + " (Call ID: " + data.call_id + ")";
          document.getElementById("call-script").innerText = data.dialogue_script || "(Opted out: no dialogue dispatched)";
        } else {
          alert("Call trigger failed: " + JSON.stringify(data.detail));
        }
      } catch (err) {
        alert("Voice call error: " + err.message);
      }
    }
  </script>
</body>
</html>
"""

