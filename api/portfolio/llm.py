from flask import current_app
import logging
from api.utils.llm.google import Google
import json

# Configure logging
logger = logging.getLogger(__name__)

class PortfolioLLM:
    """Portfolio-specific LLM functionality"""
    
    def __init__(self):
        """Initialize the portfolio LLM manager"""
        self.google_model = Google()
        logger.info("Google model initialized for portfolio LLM")
    
    def get_portfolio_news(self, symbols):
        """Get news for portfolio assets"""
        logger.info(f"Getting news for portfolio symbols: {symbols}")
        
        # Construct the prompt here in the backend
        prompt = f"""Please find and analyse 5-10 recent True Existing news items about these financial assets: {symbols}. 
        
For each news item, provide:
1. Title: The headline of the news
2. Source: The publication source
3. Date: When it was published (use ISO format YYYY-MM-DD)
4. URL: Link to the article if available
5. Summary: A 1-2 sentence summary of the key points
6. Sentiment: A score from 0 to 1 indicating how positive the news is for the asset(s) (0=very negative, 0.5=neutral, 1=very positive)

Format the response as a proper JSON array. Each news item should be an object with keys: title, source, date, url, summary, and sentiment."""
        
        # Generate response using Google model
        result = self.google_model.generate(prompt)
        
        return {
            "message": result["text"],
            "sources": result["sources"],
            "search_suggestions": result.get("rendered_content")
        }
    
    def generate_portfolio_analysis(self, portfolio_data):
        """Generate portfolio analysis report"""
        logger.info(f"Generating portfolio analysis for {len(portfolio_data['assets'])} assets")
        
        # Construct the prompt here in the backend
        prompt = f"""Please analyze this portfolio data and create a detailed but concise VISUAL report:
{json.dumps(portfolio_data, indent=2)}

Create a highly VISUAL report with minimal text using HTML components like cards, progress bars, color-coded indicators, and visual cues rather than paragraphs of text in British English but keep currency as $ USD. 

Use this exact HTML template structure, filling in the appropriate values from the portfolio data:
<div class="glass-card p-4">

  <!-- Portfolio Grade -->
  <div class="text-center mb-4">
    <span class="text-3xl font-bold" style="color: var(--success-color);">[GRADE]</span>
  </div>

  <!-- Dashboard Summary -->
  <div class="grid grid-cols-2 gap-4">
    <div class="analysis-card border border-custom mb-4">
      <div class="flex items-center">
        <span class="text-lg font-semibold" style="color: var(--success-color);">Five-Year Value</span>
      </div>
      <div class="text-2xl font-bold" style="color: var(--success-color);">[5YR-VALUE]</div>
      <div class="flex items-center mt-2">
        <span class="text-sm" style="color: var(--success-color);">Initial: [INITIAL-INVESTMENT]</span>
      </div>
    </div>

    <div class="analysis-card border border-custom mb-4">
      <div class="flex items-center">
        <span class="text-lg font-semibold" style="color: var(--info-color);">Ten-Year Value</span>
      </div>
      <div class="text-2xl font-bold" style="color: var(--info-color);">[10YR-VALUE]</div>
      <div class="flex items-center mt-2">
        <span class="text-sm" style="color: var(--info-color);">Recurring: [RECURRING-AMOUNT]/[FREQUENCY]</span>
      </div>
    </div>
  </div>

  <!-- Risk Assessment -->
  <div class="analysis-card border border-custom mb-4">
    <h2 class="text-lg font-semibold" style="color: var(--text-light);">Risk Assessment</h2>
    <div class="flex items-center mt-2">
      <span class="text-xl mr-2">[RISK-ICON]</span>
      <span style="color: var(--text-light);">[RISK-LEVEL] Volatility ([VOLATILITY-VALUE])</span>
    </div>
  </div>

  <!-- Growth Projections -->
  <div class="analysis-card border border-custom mb-4">
    <h2 class="text-lg font-semibold" style="color: var(--text-light);">Growth Projections</h2>
    <div class="grid grid-cols-2 gap-4 mt-2">
      <div>
        <span style="color: var(--text-light);" class="block">5-Year Growth:</span>
        <div class="w-full" style="background: var(--border-color); border-radius: 9999px; height: 10px;">
          <div style="background: var(--success-color); border-radius: 9999px; height: 10px; width: [5YR-GROWTH-PCT-WIDTH]%"></div>
        </div>
        <span style="color: var(--success-color);">[5YR-GROWTH-PCT]%</span>
      </div>
      <div>
        <span style="color: var(--text-light);" class="block">10-Year Growth:</span>
        <div class="w-full" style="background: var(--border-color); border-radius: 9999px; height: 10px;">
          <div style="background: var(--info-color); border-radius: 9999px; height: 10px; width: [10YR-GROWTH-PCT-WIDTH]%"></div>
        </div>
        <span style="color: var(--info-color);">[10YR-GROWTH-PCT]%</span>
      </div>
    </div>
  </div>

  <!-- Market Sentiment -->
  <div class="analysis-card border border-custom mb-4">
    <h2 class="text-lg font-semibold" style="color: var(--text-light);">Market Sentiment</h2>
    <div class="flex items-center justify-between mt-2">
      <span style="color: var(--text-light);">Bearish</span>
      <div class="w-1/2" style="background: var(--border-color); border-radius: 9999px; height: 10px;">
        <div style="background: var(--info-color); border-radius: 9999px; height: 10px; width: [SENTIMENT-PCT]%"></div>
      </div>
      <span style="color: var(--text-light);">Bullish</span>
    </div>
    <div class="mt-4">
      <h3 class="text-md font-semibold" style="color: var(--text-light);">Key Takeaways:</h3>
      <ul class="list-disc list-inside mt-2" style="color: var(--text-light);">
        [KEY-TAKEAWAYS-LIST-ITEMS]
      </ul>
    </div>
  </div>

  <!-- Asset Allocation Recommendations -->
  <div class="analysis-card border border-custom">
    <h2 class="text-lg font-semibold" style="color: var(--text-light);">Asset Allocation</h2>
    <div class="flex items-center justify-between mt-2">
      <div>
        <span class="text-3xl">[RECOMMENDATION-ICON]</span>
        <span style="color: var(--text-light);" class="font-bold">[RECOMMENDATION]</span>
      </div>
      <span style="color: var(--text-light);">[CURRENT-ALLOCATION]</span>
    </div>
    <p class="text-sm mt-2" style="color: var(--text-light);">
      [RECOMMENDATION-DETAILS]
    </p>
  </div>

</div>

Instructions:
1. Grade the portfolio from A+ to F based on overall performance, diversification, and risk/return metrics.
2. For risk assessment, use these icons: ✓ (Low), ⚠️ (Moderate), ⚠️⚠️ (High), ⚠️⚠️⚠️ (Very High).
3. Calculate growth percentages properly from initial investment to projected values.
4. Width percentages for progress bars should be capped at 100% even for high growth rates.
5. For sentiment, convert the sentiment score (0-1) to a percentage (0-100%).
6. Provide 3-4 key takeaways based on news sentiment and market conditions as list items.
7. For recommendations, use icons: ✓ (Maintain), ↑ (Increase allocation), ↓ (Reduce allocation), ⚠️ (Rebalance).
8. Keep all text concise and focused on visual elements.
9. Ensure proper color contrast in both light and dark modes - don't use light text on light backgrounds or dark text on dark backgrounds.

Complete the template by replacing all placeholder values [IN-BRACKETS] with the appropriate data from the portfolio."""
        
        # Generate response using Google model
        result = self.google_model.generate(prompt)
        
        return {
            "message": result["text"],
            "sources": result["sources"],
            "search_suggestions": result.get("rendered_content")
        }
    
    def generate_chat_response(self, portfolio_data, user_message):
        """Generate response to user chat message about portfolio"""
        logger.info(f"Generating chat response for portfolio. User message: {user_message[:50]}...")
        
        # Construct the prompt here in the backend
        prompt = f"""You are a financial portfolio assistant analyzing this portfolio:
{json.dumps(portfolio_data, indent=2)}

The user asks: {user_message}

Please provide a brief, helpful answer with financial insights related specifically to this portfolio. 
Keep answers concise (1-3 paragraphs max), visually formatted with HTML for emphasis where appropriate, and focused on actionable advice. 
If the portfolio doesn't have enough information to answer a question, explain what information would be needed."""
        
        # Generate response using Google model
        result = self.google_model.generate(prompt)
        
        return {
            "message": result["text"],
            "sources": result["sources"],
            "search_suggestions": result.get("rendered_content")
        } 