import numpy as np

class Forecaster:
    def __init__(self):
        pass

    def analyze_job_data(self, job_row, layoff_impact=None, ai_impact=None):
        """
        Analyzes a single job row using the expanded metrics from job.csv,
        augmented with layoffs and AI impact datasets.
        """
        job_name = job_row.get('Job_Name', '').strip()
        
        # 1. Base Risk Score
        try:
            base_risk_score = float(job_row.get('Shock_Risk_Score', 45))
        except:
            base_risk_score = 45.0
            
        # 2. Adjust for AI Impact (from AI_Impact_on_Jobs_2030.csv)
        ai_adjustment = 0
        automation_prob = 0.5
        matched_ai_key = None
        if ai_impact:
            if job_name in ai_impact:
                matched_ai_key = job_name
            else:
                # Add Bank/Clerk to mapping
                norm_name = job_name.lower().replace('developer', 'engineer').replace('clerk', 'analyst')
                for k in ai_impact.keys():
                    norm_k = k.lower().replace('developer', 'engineer').replace('clerk', 'analyst')
                    if norm_name in norm_k or norm_k in norm_name:
                        matched_ai_key = k
                        break
        
        if matched_ai_key:
            job_ai_data = ai_impact[matched_ai_key]
            automation_prob = job_ai_data.get('Automation_Probability_2030', 0.5)
            ai_adjustment = (automation_prob - 0.5) * 30 
            
        # 3. Adjust for Layoffs (from layoffs.csv)
        layoff_adjustment = 0
        total_laid_off = 0
        if layoff_impact:
            industry_keys = {
                "Software": "Consumer",
                "Developer": "Consumer",
                "Data": "Data",
                "Bank": "Finance",
                "Clerk": "Finance",
                "Teacher": "Education",
                "Accountant": "Finance"
            }
            matched_industry = None
            for key, ind in industry_keys.items():
                if key.lower() in job_name.lower():
                    matched_industry = ind
                    break
            
            if matched_industry and matched_industry in layoff_impact:
                total_laid_off = layoff_impact[matched_industry]
                if total_laid_off > 10000:
                    layoff_adjustment = 10
                elif total_laid_off > 5000:
                    layoff_adjustment = 5

        risk_score = max(0, min(100, base_risk_score + ai_adjustment + layoff_adjustment))
        risk_level = self.classify_risk(risk_score)
        
        # Adjustment Details for UI transparency
        adjustment_details = {
            "base_score": base_risk_score,
            "layoff_impact_count": total_laid_off,
            "layoff_adjustment": layoff_adjustment,
            "ai_automation_probability": automation_prob,
            "ai_adjustment": round(ai_adjustment, 2)
        }
        
        # 4. Historical Volume
        try:
            base_volume = float(job_row.get('Historical_Posting_Volume', 5000))
        except:
            base_volume = 5000.0
            
        if risk_level == "Low":
            historical = [base_volume * 0.8, base_volume * 0.9, base_volume]
        elif risk_level == "High":
            historical = [base_volume * 1.2, base_volume * 1.1, base_volume]
        else:
            historical = [base_volume * 1.0, base_volume * 0.98, base_volume]

        # 5. Forecast based on 'Next_Week_Forecast' column and AI impact
        forecast_direction = job_row.get('Next_Week_Forecast', 'Stable').strip()
        if automation_prob > 0.8 and forecast_direction == "Increase":
            forecast_direction = "Stable"
            
        if forecast_direction == "Increase":
            forecast = [base_volume * 1.1, base_volume * 1.2, base_volume * 1.3, base_volume * 1.4]
            trend_label = "Strong Growth"
            vol_label = "Low"
        elif forecast_direction == "Decrease":
            forecast = [base_volume * 0.9, base_volume * 0.8, base_volume * 0.7, base_volume * 0.6]
            trend_label = "Significant Decline"
            vol_label = "Moderate"
        else:
            forecast = [base_volume * 0.99, base_volume * 0.98, base_volume * 0.97, base_volume * 0.96]
            trend_label = "Stable"
            vol_label = "Low"

        # 6. Parse Risk_Distribution_Factors for Radar Chart
        factors_str = job_row.get('Risk_Distribution_Factors', '')
        radar_data = self._parse_factors(factors_str)
        if ai_impact and matched_ai_key:
            radar_data[2] = int(automation_prob * 100)
            
        return risk_score, risk_level, trend_label, vol_label, historical, forecast, radar_data, adjustment_details

    def _parse_factors(self, factors_str):
        """Helper to parse factor string into radar chart values."""
        defaults = {"Demand": 50, "Competition": 50, "Automation": 50, "Investment": 50, "Stability": 50}
        if not factors_str:
            return list(defaults.values())
            
        factors = factors_str.split(';')
        for f in factors:
            if ' ' in f.strip():
                parts = f.strip().rsplit(' ', 1)
                if len(parts) < 2: continue
                name, level = parts
                # Map qualitative level to value
                val = 80 if "High" in level else 40 if "Moderate" in level else 20
                
                # Try to fuzzy match name to defaults
                matched = False
                for key in defaults.keys():
                    if key.lower() in name.lower():
                        defaults[key] = val
                        matched = True
                
                # Specific mappings for Driver and other automation risks
                if not matched:
                    if "driving" in name.lower() or "tech" in name.lower() or "robot" in name.lower():
                        defaults["Automation"] = val
                    elif "growth" in name.lower() or "need" in name.lower():
                        defaults["Demand"] = val
                        
        return list(defaults.values())

    def classify_risk(self, score):
        if score < 30:
            return "Low"
        elif score < 60:
            return "Medium"
        else:
            return "High"
