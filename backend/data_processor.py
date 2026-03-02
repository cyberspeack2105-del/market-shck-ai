import pandas as pd
import os

class DataProcessor:
    def __init__(self, backend_path):
        self.backend_path = backend_path
        self.root_path = os.path.dirname(backend_path)
        self.job_data_path = os.path.join(backend_path, 'job.csv')
        self.layoffs_path = os.path.join(self.root_path, 'layoffs.csv')
        self.ai_impact_path = os.path.join(self.root_path, 'AI_Impact_on_Jobs_2030.csv')

    def load_job_data(self):
        """Loads the static job dataset."""
        if not os.path.exists(self.job_data_path):
            raise FileNotFoundError(f"Job data file not found at {self.job_data_path}")
        
        df = pd.read_csv(self.job_data_path)
        df.columns = [c.strip() for c in df.columns]
        return df

    def get_layoff_impact(self):
        """Processes layoffs.csv to get total laid off per industry."""
        if not os.path.exists(self.layoffs_path):
            return {}
        
        try:
            df = pd.read_csv(self.layoffs_path)
            # Group by industry and sum layoffs
            summary = df.groupby('industry')['total_laid_off'].sum().to_dict()
            return summary
        except Exception as e:
            print(f"Error processing layoffs: {e}")
            return {}

    def get_ai_impact_mapping(self):
        """Processes AI_Impact_on_Jobs_2030.csv to get automation probability per job title."""
        if not os.path.exists(self.ai_impact_path):
            return {}
        
        try:
            df = pd.read_csv(self.ai_impact_path)
            # Map Job_Title to average Automation_Probability_2030 and AI_Exposure_Index
            summary = df.groupby('Job_Title').agg({
                'Automation_Probability_2030': 'mean',
                'AI_Exposure_Index': 'mean'
            }).to_dict(orient='index')
            return summary
        except Exception as e:
            print(f"Error processing AI impact: {e}")
            return {}

    def load_and_merge(self):
        return self.load_job_data()

if __name__ == "__main__":
    processor = DataProcessor(r'c:\Users\Maheswari\OneDrive\Desktop\my project\divya\backend')
    print("Job Data Head:")
    print(processor.load_job_data().head())
    print("\nLayoff Summary (partial):")
    print(list(processor.get_layoff_impact().items())[:5])
