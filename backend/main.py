from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from data_processor import DataProcessor
from forecaster import Forecaster
import os
from typing import List, Optional

app = FastAPI(title="MarketShock AI API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to the dataset
BACKEND_PATH = os.path.dirname(os.path.abspath(__file__))
processor = DataProcessor(BACKEND_PATH)
forecaster = Forecaster()

class ChatRequest(BaseModel):
    message: str

# Cache the processed data
_cached_df = None
_layoff_impact = None
_ai_impact = None

def get_data():
    global _cached_df, _layoff_impact, _ai_impact
    if _cached_df is None:
        _cached_df = processor.load_job_data()
    if _layoff_impact is None:
        _layoff_impact = processor.get_layoff_impact()
    if _ai_impact is None:
        _ai_impact = processor.get_ai_impact_mapping()
    return _cached_df, _layoff_impact, _ai_impact

@app.get("/health")
async def health():
    return {"status": "healthy", "framework": "FastAPI"}

@app.get("/api/industries", response_model=List[str])
async def get_industries():
    try:
        df, _, _ = get_data()
        jobs = df['Job_Name'].dropna().unique().tolist()
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/predict")
async def predict(industry: str = Query(..., description="The job name to analyze")):
    try:
        df, layoff_impact, ai_impact = get_data()
        
        job_row = df[df['Job_Name'] == industry]
        if job_row.empty:
            raise HTTPException(status_code=404, detail="Job not found")
            
        job_data = job_row.iloc[0].to_dict()
        
        # Get metrics from forecaster with augmented data
        risk_score, risk_level, trend_label, vol_label, hist, forecast, radar, adjustments = forecaster.analyze_job_data(
            job_data, 
            layoff_impact=layoff_impact, 
            ai_impact=ai_impact
        )
        
        return {
            "industry": industry,
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
            "forecast_message": f"Augmented analysis incorporating historical layoffs and 2030 AI projections for {industry} (FastAPI Engine)"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """
    Proxy endpoint for OpenRouter AI Assistant.
    """
    # OpenRouter API integration
    API_KEY = "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"
    # Using the user-specified model slug
    MODEL = "openai/gpt-oss-120b"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {API_KEY}",
                    "HTTP-Referer": "http://localhost:8091", # Optional, but good for OpenRouter
                    "X-Title": "MarketShock AI",
                    "Content-Type": "application/json"
                },
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": "You are a helpful AI Assistant for MarketShock AI. You help users understand market shocks, risk forecasts, and job market trends based on AI impact and layoffs. Keep your answers concise and professional."},
                        {"role": "user", "content": request.message}
                    ]
                },
                timeout=45.0 # High timeout for large MoE models
            )
            
            if response.status_code != 200:
                error_detail = f"OpenRouter API Error ({response.status_code}): {response.text}"
                print(error_detail)
                raise HTTPException(status_code=response.status_code, detail=error_detail)
            
            data = response.json()
            if "choices" in data and len(data["choices"]) > 0:
                return {"reply": data['choices'][0]['message']['content']}
            else:
                raise HTTPException(status_code=502, detail="Invalid response from OpenRouter")
                
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Failed to connect to AI Service: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8095)
