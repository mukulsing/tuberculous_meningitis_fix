import pandas as pd
import numpy as np
import joblib
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)
BASE = os.path.dirname(os.path.abspath(__file__))

model   = joblib.load(f'{BASE}/model.joblib')
scaler  = joblib.load(f'{BASE}/scaler.joblib')
le_dict = joblib.load(f'{BASE}/le_dict.joblib')
num_imp = joblib.load(f'{BASE}/num_imp.joblib')
cat_imp = joblib.load(f'{BASE}/cat_imp.joblib')

with open(f'{BASE}/meta.json') as f:
    meta = json.load(f)

FEATURE_ORDER = meta['feature_order']
CAT_COLS      = meta['cat_cols']
NUM_COLS      = meta['num_cols']
LE_CLASSES    = meta['le_classes']

# Home route
@app.route('/')
def home():
    return jsonify({
        "message": "TBM Backend API Running Successfully"
    })

# Health route
@app.route('/health')
def health():
    return jsonify({
        "status": "ok",
        "message": "Backend health is good"
    })

# Prediction route
@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Receive frontend JSON data
        data = request.get_json()

        # Convert incoming data into dataframe
        df = pd.DataFrame([data])

        # Ensure feature order matches training
        for col in FEATURE_ORDER:
            if col not in df.columns:
                df[col] = np.nan

        df = df[FEATURE_ORDER]

        # Fill missing numeric values
        df[NUM_COLS] = num_imp.transform(df[NUM_COLS])

        # Encode categorical columns
        for col in CAT_COLS:
            le = le_dict.get(col)

            if le is None:
                continue

            val = str(df[col].iloc[0])

            known = list(le.classes_)

            if val not in known:
                val = known[0]

            df[col] = le.transform([val])

        # Impute categorical values
        df[CAT_COLS] = cat_imp.transform(df[CAT_COLS])

        # Scale features
        X = scaler.transform(df[FEATURE_ORDER])

        # Prediction probability
        prob = float(model.predict_proba(X)[0][1])

        # Final prediction
        prediction = int(model.predict(X)[0])

        # Feature importance
        fi = pd.Series(
            model.feature_importances_,
            index=FEATURE_ORDER
        )

        drivers = [
            {
                'feature': k,
                'importance': round(float(v) * 100, 1)
            }
            for k, v in fi.sort_values(
                ascending=False
            ).head(5).items()
        ]

        # Human-readable labels
        label = (
            'Poor Outcome'
            if prediction == 1
            else 'Good Outcome'
        )

        pct = (
            round(prob * 100, 1)
            if prediction == 1
            else round((1 - prob) * 100, 1)
        )

        risk = (
            'High'
            if prob > 0.7
            else (
                'Moderate'
                if prob > 0.4
                else 'Low'
            )
        )

        # Final response
        return jsonify({
            'prediction': prediction,
            'label': label,
            'probability': pct,
            'poor_prob': round(prob * 100, 1),
            'good_prob': round((1 - prob) * 100, 1),
            'risk_level': risk,
            'top_drivers': drivers,
            'interpretation':
                f"The model predicts a {label} "
                f"(MRS > 2 at 6 months) "
                f"with {pct:.1f}% confidence. "
                f"Risk level: {risk}."
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

# Meta route
@app.route('/meta')
def get_meta():
    return jsonify({
    'top_features': meta.get('top_features', []),
    'le_classes': LE_CLASSES
})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))

    app.run(
        host='0.0.0.0',
        port=port
    )
