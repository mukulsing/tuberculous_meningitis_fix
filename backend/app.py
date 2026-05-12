from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

if __name__ == '__main__':
    import os

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host='0.0.0.0',
        port=port
    )
@app.route('/')
def home():
    return jsonify({
        "message": "TBM Backend API Running Successfully"
    })
