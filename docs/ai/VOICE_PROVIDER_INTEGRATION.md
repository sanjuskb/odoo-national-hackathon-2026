# Voice & Telephony Provider Integration Specification

> **Document Status:** Implemented and tested (Mock Murf & Mock Telephony adapters); Production carrier options documented for team approval.  
> **Author:** Sanju (`@sanjuskb`)  
> **Date:** 31 October 2026  

---

## 1. Overview

Brightloop's voice assistance workflow pairs **Murf Text-to-Speech (TTS)** for realistic human-like voice synthesis with a **Telephony Carrier Provider** for public switched telephone network (PSTN) call delivery.

Both systems are isolated behind clean, object-oriented provider adapters to maintain vendor portability.

---

## 2. Murf Text-to-Speech Provider Adapter

### 2.1 Role & Scope
Murf synthesizes personalized, natural customer onboarding audio from grounded text scripts. Murf does **not** dial phone numbers or manage telecommunication trunks.

### 2.2 Configuration Parameters
| Environment Variable | Description | Default | Security |
|---|---|---|---|
| `MURF_API_KEY` | Murf Studio REST API token | `None` | Server-side only; never committed or sent to browser |
| `MURF_VOICE_ID` | Speaker voice persona | `en-US-marcus` | Configurable |
| `MURF_TIMEOUT_SECONDS` | Network timeout budget | `10.0` | Protected against hanging threads |

### 2.3 Provider Lifecycle
```mermaid
flowchart LR
    Script[Dialogue Script] --> Synthesize[MurfTTSProvider.synthesize]
    Synthesize -->|POST /v1/speech/generate| MurfAPI[Murf API Endpoint]
    MurfAPI -->|Audio URL / MP3| Buffer[Audio Buffer Stream]
    Buffer --> Telephony[Telephony Adapter Stream]
```

### 2.4 Offline Mock Testing (`MockMurfTTSProvider`)
When running locally or in automated CI testing (`USE_MOCK_PROVIDERS=true`), `MockMurfTTSProvider` generates synthetic binary buffers and calculates accurate audio durations based on spoken word velocity (2.5 words/second). Zero external API calls are made.

---

## 3. Telephony Carrier Provider Integration

### 3.1 Interface Abstraction (`BaseTelephonyProvider`)
The core interface requires three primary methods:
- `initiate_call(request: OutboundCallRequest) -> CallRecord`
- `get_call_status(call_id: str) -> Optional[CallRecord]`
- `terminate_call(call_id: str) -> bool`

### 3.2 Evaluation of Production Carrier Options
The team has not yet committed to a paid carrier provider. Below is the comparative evaluation awaiting Sanju and team sign-off:

| Provider | Supported Regions | Latency / Media Streams | Cost Model | Recommendation | Status |
|---|---|---|---|---|---|
| **Mock Provider** | Local / Offline | 0ms / In-Memory | $0.00 | **Active default for hackathon development & demo** | **Implemented & Verified** |
| **Twilio Voice** | Global / US / EU | Webhooks + Media Streams | ~$0.014 / min | Best for international scalability | Proposed, awaiting approval |
| **Exotel** | India / Southeast Asia | REST + IVR flows | Per-minute pulse | Ideal for Indian domestic numbers | Proposed, awaiting approval |
| **Plivo** | Global | XML / Audio URL streaming | ~$0.012 / min | Competitive fallback | Proposed, awaiting approval |

> **RULE:** No paid carrier service may be provisioned or billed without explicit team leader authorization.

---

## 4. Regulatory & Calling-Hours Compliance

Before connecting live carriers, the following constraints must be enforced:
1. **Calling Hours Window:** Only place automated calls between 09:00 and 19:00 customer local time.
2. **Do Not Call (DNC) Registry:** Verified customer consent check (`call_consent: true`) must precede every call.
3. **Disclosure:** Automated voice agent must immediately identify as an automated assistant and provide opt-out instructions.

