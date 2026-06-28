# 🏙️ Community Hero
**Hyperlocal Problem Solver | Vibe2Ship Hackathon Submission**

Community Hero is a proactive civic-issue reporting platform. It empowers citizens to identify, report, and track infrastructure issues (like potholes, water leaks, and broken streetlights) while providing local authorities with a powerful, AI-driven dashboard to prioritize and resolve them efficiently.

## ✨ Key Features
- 📸 **Smart Issue Reporting**: Snap a picture of a problem and our AI automatically categorizes it, assesses the severity, and writes a description.
- 📍 **Automated Geo-location**: Instantly maps reports using precise coordinates.
- 🤝 **Community Verification**: Neighbors can upvote or corroborate issues to boost their priority.
- 🧠 **AI Duplicate Detection**: Smart clustering groups similar reports of the same issue together so the system doesn't get flooded.
- 📊 **Impact Dashboards**: Dedicated views for regular citizens and Sector Administrators.

## 🛠️ Built With
- **Frontend**: React 18, Vite, Tailwind CSS, Leaflet Maps
- **Backend**: Node.js, Express
- **Database**: Firebase Firestore
- **AI Integrations**: 
  - Google Gemini 3.5 Flash (Vision Analysis & Categorization)
  - Google Gemini Embedding 2 (Smart Issue Clustering)
- **Deployment**: Google Cloud Run (Backend/Full-Stack) / Firebase Hosting

## 🚀 How to Run Locally

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your API keys:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   ```
   *(Note: You will also need a `firebase-applet-config.json` containing your Firebase credentials).*
4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
5. **Open in Browser**: Navigate to `http://localhost:8000`