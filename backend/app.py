import pandas as pd
import numpy as np
import joblib
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

# ---------------------------------------------------
# Flask App Initialization
# ---------------------------------------------------

app = Flask(__name__)
CORS(app)

BASE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------
# Load ML Artifacts
# ---------------------------------------------------

model = joblib.load(f'{BASE}/model.joblib')
scaler = joblib.load(f'{BASE}/scaler.joblib')
le_dict = joblib.load(f'{BASE}/le_dict.joblib')
num_imp = joblib.load(f'{BASE}/num_imp.joblib')
cat_imp = joblib.load(f'{BASE}/cat_imp.joblib')

with open(f'{BASE}/meta.json') as f:
    meta = json.load(f)

FEATURE_ORDER = meta['feature_order']
CAT_COLS = meta['cat_cols']
NUM_COLS = meta['num_cols']
LE_CLASSES = meta['le_classes']

# ---------------------------------------------------
# Input Builder Function
# ---------------------------------------------------

def build_row(data):
    row = {}

    # ---------------------------
    # Numeric Fields
    # ---------------------------

    num_fields = {
        'Age (years)': float,
        'Duration of fever (Months)': float,
        'Duration of headache (Months)': float,
        'Pulse (/min)': float,
        'Temp (°F)': float,
        'RR (/min)': float,
        'SpO2 (%)': float,
        'GCS (E+V+M out of 15)': float,
        'Hb': float,
        'TLC': float,
        'Lymphocytes': float,
        'Neutrophils': float,
        'Blood sugar (mg/dl)': float,
        'Urea (mg/dL)': float,
        'Creatinine (mg/dL)': float,
        'Bilirubin (mg/dL)': float,
        'AST (U/L)': float,
        'ALT (U/L)': float,
        'Na (mEQ/L)': float,
        'K (mmol/L)': float,
        'CSF Count (cells/µL)': float,
        'Neutrophils (%)': float,
        'Lymphocytes (%)': float,
        'Protein (mg/dL)': float,
        'Glucose (mg/dL)': float,
        'CSF:Blood ratio': float,
        'BP_sys': float,
        'BP_dia': float,
    }

    for field, cast in num_fields.items():
        val = data.get(field)

        try:
            row[field] = (
                cast(val)
                if val not in (None, '', 'null')
                else np.nan
            )

        except:
            row[field] = np.nan

    # ---------------------------
    # Categorical Fields
    # ---------------------------

    cat_fields = [
        'Sex',
        'Comorbid Illness (DM/HTN/HIV/Other)',
        'Fever (Y/N)',
        'Evening rise (Y/N)',
        'Night sweats (Y/N)',
        'Chills (Y/N)',
        'Headache (Y/N)',
        'Site',
        'Persistent (Y/N)',
        'Progressive (Y/N)',
        'Vomiting (Y/N)',
        'Altered sensorium (Y/N)',
        'Behavioural changes (Y/N)',
        'Seizures (Y/N)',
        'Seizure type',
        'Focal neurological deficit (Ophthalmoplegia/Hemiplegia/Other)',
        'Neck pain (Y/N)',
        'Ear discharge (Y/N)',
        'Weight loss (Y/N)',
        'Loss of appetite (Y/N)',
        'Cough (Y/N)',
        'Lymph node swelling (Y/N)',
        'Jaundice (Y/N)',
        'Rash (Y/N)',
        'Joint pain (Y/N)',
        'Prior/concurrent TB (Y/N)',
        'Contact with TB patient (Y/N)',
        'Past anti-TB treatment (Y/N)',
        'Meningeal signs',
        'Cranial nerve palsies',
        'Motor deficits',
        'Cerebellar signs',
        'Features of Myelitis',
        'Features of Arachnoiditis',
        'Raised ICP',
        'Systemic TB evidence',
        'CBNAAT (Positive/Negative)',
        'Meningeal enhancement (Y/N)',
        'Hydrocephalus (Y/N)',
        'Basal exudates (Y/N)',
        'Tuberculomas (Y/N)',
        'Infarcts (Y/N)',
    ]

    for field in cat_fields:
        row[field] = (
            str(data.get(field))
            if data.get(field)
            else 'N'
        )

    # ---------------------------
    # Create DataFrame
    # ---------------------------

    df_row = pd.DataFrame(
        [row],
        columns=FEATURE_ORDER
    )

    return df_row

# ---------------------------------------------------
# Home Route
# ---------------------------------------------------

@app.route('/')
def home():
    return jsonify({
        "message": "TBM Backend API Running Successfully"
    })

# ---------------------------------------------------
# Health Route
# ---------------------------------------------------

@app.route('/health')
def health():
    return jsonify({
        "status": "ok",
        "message": "Backend health is good",
        "model": "Gradient Boosting",
        "auc": 0.893
    })

# ---------------------------------------------------
# Prediction Route
# ---------------------------------------------------

@app.route('/predict', methods=['POST'])
def predict():

    try:
        # -----------------------------------
        # Receive Frontend JSON
        # -----------------------------------

        data = request.get_json()

        # -----------------------------------
        # Build Safe DataFrame
        # -----------------------------------

        df = build_row(data)

        # -----------------------------------
        # Numeric Imputation
        # -----------------------------------

        df[NUM_COLS] = num_imp.transform(
            df[NUM_COLS]
        )

        # -----------------------------------
        # Encode Categoricals
        # -----------------------------------

        for col in CAT_COLS:

            le = le_dict.get(col)

            if le is None:
                continue

            val = str(df[col].iloc[0])

            known = list(le.classes_)

            if val not in known:
                val = known[0]

            df[col] = le.transform([val])

        # -----------------------------------
        # Categorical Imputation
        # -----------------------------------

        df[CAT_COLS] = cat_imp.transform(
            df[CAT_COLS]
        )

        # -----------------------------------
        # Scaling
        # -----------------------------------

        X = scaler.transform(
            df[FEATURE_ORDER]
        )

        # -----------------------------------
        # Prediction
        # -----------------------------------

        prob = float(
            model.predict_proba(X)[0][1]
        )

        prediction = int(
            model.predict(X)[0]
        )

        # -----------------------------------
        # Feature Importance
        # -----------------------------------

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

        # -----------------------------------
        # Human Readable Outputs
        # -----------------------------------

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

        # -----------------------------------
        # API Response
        # -----------------------------------

        return jsonify({

            'prediction': prediction,

            'label': label,

            'probability': pct,

            'poor_prob': round(prob * 100, 1),

            'good_prob': round(
                (1 - prob) * 100,
                1
            ),

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

# ---------------------------------------------------
# Meta Route
# ---------------------------------------------------

@app.route('/meta')
def get_meta():

    return jsonify({

        'top_features':
            meta.get(
                'top_features',
                []
            ),

        'le_classes':
            LE_CLASSES
    })

# ---------------------------------------------------
# Run App
# ---------------------------------------------------

if __name__ == '__main__':

    port = int(
        os.environ.get(
            "PORT",
            5000
        )
    )

    app.run(
        host='0.0.0.0',
        port=port
    )
