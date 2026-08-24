# CareFlow AI Prompts

CareFlow uses server-side AI assistance for pre-visit and post-visit summaries. The OpenAI API key is never exposed to the frontend.

## Pre-Visit Summary

The API asks the model to analyse the patient's symptoms and return structured JSON containing:

- `urgency` — Low, Medium, or High
- `chiefComplaint`
- exactly three `suggestedQuestions`

The prompt explicitly instructs the model not to diagnose.

The application also has deterministic fallback behaviour if the AI service is unavailable or returns invalid data.

## Post-Visit Summary

The API asks the model to convert the doctor's clinical notes into:

- `patientSummary`
- `medicationSchedule`
- `followUpSteps`

`medicationSchedule` is represented as an array of medication objects containing:

- `name`
- `dose`
- `frequency`
- `times`

The prompt requests kind, non-diagnostic language.

If the AI service fails, CareFlow falls back to deterministic content so that completing the appointment does not depend on AI availability.

## Safety Boundary

AI output is informational assistance only. It is not presented as medical diagnosis or emergency guidance.