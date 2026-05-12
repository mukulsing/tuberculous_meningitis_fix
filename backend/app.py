from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

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
    return jsonify({
        "message": "Prediction endpoint working"
    })

# Meta route
@app.route('/meta')
def meta():
    return jsonify({
        "message": "Meta endpoint working"
    })

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))

    app.run(
        host='0.0.0.0',
        port=port
    )
