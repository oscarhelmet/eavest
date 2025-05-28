# Technical Analysis API Documentation

## Overview

The Technical Analysis system has been updated to use proper JSON API endpoints with all LLM prompts hidden in the backend. This provides better security, performance, and maintainability.

## API Endpoints

### 1. Technical Analysis Endpoint
**URL:** `/api/technical-analysis`  
**Method:** `POST`  
**Content-Type:** `multipart/form-data`

#### Request Parameters
- `mode`: `'simple'` or `'advanced'`
- `draw_lines`: `'true'` or `'false'` (optional)
- `include_entry_exit`: `'true'` or `'false'` (optional)

#### Images
- **Simple Mode:** `chart` - Single chart image file
- **Advanced Mode:** 
  - `weekly_chart` - Weekly timeframe chart (optional)
  - `daily_chart` - Daily timeframe chart (optional) 
  - `four_hour_chart` - 4-hour timeframe chart (optional)
  - `one_hour_chart` - 1-hour timeframe chart (optional)

#### Response Format
```json
{
  "success": true,
  "mode": "simple|advanced",
  "analysis": {
    "sentiment": {
      "verdict": "bullish|bearish|neutral",
      "strength": 0-100
    },
    "volatility": {
      "level": "high|medium|low",
      "strength": 0-100
    },
    "insights": [
      "Key insight 1",
      "Key insight 2", 
      "..."
    ],
    "trading_opportunity": "<HTML formatted trading analysis>"
  }
}
```

### 2. Support/Resistance Line Drawing Endpoint
**URL:** `/api/technical-analysis-draw`  
**Method:** `POST`  
**Content-Type:** `multipart/form-data`

#### Request Parameters
- `chart`: Chart image file
- `existing_analysis`: Context from previous analysis (optional)

#### Response Format
```json
{
  "success": true,
  "annotations": {
    "support_levels": [
      {
        "price": 1234.56,
        "strength": "strong|medium|weak",
        "description": "Description of support level"
      }
    ],
    "resistance_levels": [
      {
        "price": 1345.67,
        "strength": "strong|medium|weak", 
        "description": "Description of resistance level"
      }
    ],
    "trend_lines": [
      {
        "type": "support|resistance",
        "description": "Description of trend line",
        "points": []
      }
    ],
    "key_patterns": [
      {
        "type": "pattern_name",
        "description": "Pattern description",
        "significance": "high|medium|low"
      }
    ]
  }
}
```

### 3. Technical Analysis Prototype Page
**URL:** `/technical-analysis-prototype`  
**Method:** `GET`

Serves the enhanced technical analysis frontend with improved UI and API integration.

## Backend Implementation

### LLM Integration
- Uses Google Gemini 2.0 Flash model via the `google.genai` client
- Images are processed using `Part.from_bytes()` for proper multimodal input
- Professional prompts are hidden in the backend for security
- Structured JSON responses are parsed from LLM output

### Key Features
1. **Hidden Prompts**: All LLM prompts are server-side only
2. **Image Processing**: Direct binary image processing without file storage
3. **Error Handling**: Comprehensive error handling with user-friendly messages
4. **Logging**: Detailed logging for debugging and monitoring
5. **Security**: Input validation and secure file handling

### Prompt Engineering
- **Simple Mode**: Focuses on basic price action and support/resistance
- **Advanced Mode**: Multi-timeframe analysis with confluence zones
- **Line Drawing**: Specific analysis for support/resistance identification

## Frontend Integration

### Updated JavaScript Functions
- `performAnalysis()`: Makes API calls with proper error handling
- `processApiResponse()`: Processes structured JSON responses
- `updateSentimentIndicators()`: Updates UI based on sentiment analysis
- `updateVolatilityMeter()`: Shows volatility analysis visually
- `drawSupportResistanceLines()`: Calls line drawing API

### UI Improvements
- Better error messages with styled error cards
- Loading states with spinners
- Responsive design for mobile devices
- Real-time feedback and console logging

## Usage Example

```javascript
// Frontend usage
const formData = new FormData();
formData.append('mode', 'simple');
formData.append('chart', imageFile);

const response = await fetch('/api/technical-analysis', {
  method: 'POST',
  body: formData
});

const result = await response.json();
if (result.success) {
  // Process analysis results
  updateUI(result.analysis);
}
```

## Security Considerations

1. **Input Validation**: All inputs are validated before processing
2. **File Size Limits**: Images are processed in memory with size limits
3. **Rate Limiting**: Consider implementing rate limiting for production
4. **Authentication**: Add authentication for production deployment
5. **CORS**: Properly configured for allowed origins

## Error Handling

The API provides detailed error responses:

```json
{
  "success": false,
  "error": "Specific error message"
}
```

Common error scenarios:
- No images provided
- Invalid image format
- LLM processing errors
- Network/timeout issues

## Development Notes

- Images are processed directly in memory (no temp files)
- Google Gemini API requires proper authentication setup
- All prompts are optimized for financial technical analysis
- Response parsing handles various LLM output formats
- Frontend provides fallback for failed API calls 