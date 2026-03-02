from flask import Flask, jsonify, request
from flask_cors import CORS
from data_processor import DataProcessor
from forecaster import Forecaster
import os

app = Flask(__name__)
CORS(app)

# Path to the dataset
BACKEND_PATH = os.path.dirname(os.path.abspath(__file__))
processor = DataProcessor(BACKEND_PATH)
forecaster = Forecaster()

# Cache the processed data
_cached_df = None
_layoff_impact = None
_ai_impact = None

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/api/industries', methods=['GET'])
def get_industries():
    global _cached_df
    try:
        if _cached_df is None:
            _cached_df = processor.load_job_data()
        jobs = _cached_df['Job_Name'].dropna().unique().tolist()
        return jsonify(jobs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/predict', methods=['GET'])
def predict():
    global _cached_df, _layoff_impact, _ai_impact
    job_name = request.args.get('industry') 
    if not job_name:
        return jsonify({"error": "Job parameter is required"}), 400
    
    try:
        if _cached_df is None:
            _cached_df = processor.load_job_data()
        if _layoff_impact is None:
            _layoff_impact = processor.get_layoff_impact()
        if _ai_impact is None:
            _ai_impact = processor.get_ai_impact_mapping()
            
        job_row = _cached_df[_cached_df['Job_Name'] == job_name]
        if job_row.empty:
            return jsonify({"error": "Job not found"}), 404
            
        job_data = job_row.iloc[0].to_dict()
        
        # Get metrics from forecaster with augmented data
        risk_score, risk_level, trend_label, vol_label, hist, forecast, radar, adjustments = forecaster.analyze_job_data(
            job_data, 
            layoff_impact=_layoff_impact, 
            ai_impact=_ai_impact
        )
        
        return jsonify({
            "industry": job_name,
            "description": job_data.get('Description', ''),
            "risk_level": risk_level,
            "future_scope": job_data.get('Future_Scope', ''),
            "how_to_solve_risk": job_data.get('How_To_Solve_Risk', ''),
            "shock_risk_score": risk_score,
            "trend_label": trend_label,
            "volatility_label": vol_label,
            "historical": hist,
            "forecast": forecast,
            "radar_data": radar,
            "arima_text": job_data.get('Hiring_Trends_&_Future_Predictions_ARIMA', ''),
            "factors_text": job_data.get('Risk_Distribution_Factors', ''),
            "adjustments": adjustments,
            "forecast_message": f"Augmented analysis incorporating historical layoffs and 2030 AI projections for {job_name}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
