# 🧠 TBM Outcome Predictor — AI Clinical Tool

An AI-powered web application that predicts the **6-month neurological outcome** of Tuberculous Meningitis (TBM) patients using a Gradient Boosting model trained on 64 patients.

## 📊 Model Performance

| Metric | Value |
|--------|-------|
| Algorithm | Gradient Boosting Classifier |
| Test Accuracy | **87.5%** |
| AUC-ROC | **0.893** |
| Training samples | 40 |
| Test samples | 24 |
| Features | 67 |

**Target:** Modified Rankin Scale (MRS) at 6 months — Good (MRS ≤ 2) vs Poor (MRS > 2)

---

## 🚀 Local Development

### Prerequisites
- Python 3.9+
- Node.js 18+

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/tbm-predictor.git
cd tbm-predictor
```

### 2. Backend (Flask)
```bash
cd backend
pip install -r requirements.txt
python app.py
# → http://localhost:5000
```

### 3. Frontend (React)
```bash
cd frontend
npm install
npm start
# → http://localhost:3000
```

---

## ☁️ Deploy to Render (FREE — Recommended)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → **Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `pip install -r backend/requirements.txt && cd frontend && npm install && npm run build`
   - **Start Command:** `cd backend && gunicorn app_production:app --bind 0.0.0.0:$PORT`
   - **Environment:** Python 3
5. Click **Deploy** → your site will be live at `https://tbm-predictor.onrender.com`

> ⚡ **Or** click the button below for one-click deploy:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## 🌐 Deploy to Railway (Alternative)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

---

## 🌐 Deploy to Heroku

```bash
heroku create tbm-predictor-app
heroku buildpacks:add heroku/python
heroku buildpacks:add heroku/nodejs
git push heroku main
```

---

## 📁 Project Structure

```
tbm-predictor/
├── backend/
│   ├── app.py                 # Flask dev server
│   ├── app_production.py      # Flask + static files (production)
│   ├── model.pkl              # Trained Gradient Boosting model
│   ├── scaler.pkl             # RobustScaler
│   ├── le_dict.pkl            # Label encoders for categorical features
│   ├── num_imp.pkl            # Numerical imputer
│   ├── cat_imp.pkl            # Categorical imputer
│   ├── meta.json              # Feature metadata
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js             # Main React application
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Actions CI/CD
├── render.yaml                # Render deployment config
├── Procfile                   # Heroku/Railway
└── README.md
```

---

## 🔬 Features Used for Prediction

**Top predictors identified by model:**
1. Focal Neurological Deficit (70.4% importance)
2. Infarcts on imaging (22.7% importance)
3. Bilirubin level (2.0%)
4. AST level (1.5%)
5. GCS Score (0.9%)

**Input categories:**
- Demographics (age, sex, comorbidities)
- Symptoms (fever, headache, seizures, neurological deficits)
- Vital signs (pulse, BP, temperature, SpO2, RR)
- Neurological exam (GCS, meningeal signs)
- Blood investigations (CBC, LFT, RFT, electrolytes)
- CSF analysis (cells, protein, glucose, CBNAAT)
- Brain imaging (infarcts, hydrocephalus, tuberculomas)

---

## ⚠️ Disclaimer

This tool is intended to **assist clinical decision-making only**. It does not replace professional medical judgment. Always correlate AI predictions with complete clinical assessment and patient history.

---

## 📄 License
MIT License — free for academic and clinical research use.
