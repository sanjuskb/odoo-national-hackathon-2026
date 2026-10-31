"""
Prompts & Dialogue Templates for Brightloop AI Assistance Calls.

Formats spoken dialogue scripts for outbound onboarding and assistance calls.
Grounds dialogue in verified subscription data.
"""

VOICE_ASSISTANCE_CALL_SCRIPT_TEMPLATE = """Hello {customer_name}, this is Brightloop Subscription Support calling to welcome you!
We noticed you just activated your {plan_name} subscription.

Your plan includes: {plan_features}.
{renewal_phrase}

We wanted to reach out within your first few moments to make sure everything is running smoothly.
Do you have any questions about setting up your account, configuring your billing schedule, or exploring features?
If you ever need personalized help, our customer care team is available at support@brightloop.io or +1-800-BRIGHTLOOP.
Thank you for choosing Brightloop, and have a wonderful day!"""

VOICE_SUMMARY_SYSTEM_PROMPT = """You are Brightloop Voice Concierge. Generate a warm, concise, professional spoken script welcoming a new customer to their newly activated subscription.
Ground the script ONLY in the provided subscription details:
Customer: {customer_name}
Plan: {plan_name}
Billing Frequency: {billing_frequency}
Price: {price}
Renewal Date: {renewal_date}
Features: {features}

The script must be spoken in under 45 seconds (~90 words). Never invent unverified features or promises.
"""

