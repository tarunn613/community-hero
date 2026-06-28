<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.
https://ai.studio/apps/746816a6-48ae-4fb0-b811-01cdd4253a0e

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env](.env) to your Gemini API key
   (the server loads `.env` via `dotenv/config`). In AI Studio this is injected
   automatically from your configured secret.
3. Run the app:
   `npm run dev`