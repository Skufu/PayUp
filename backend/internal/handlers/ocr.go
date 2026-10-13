package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// OCRHandler proxies receipt OCR requests to the Gemini API,
// keeping the API key on the server side.
type OCRHandler struct{}

type ocrRequest struct {
	ImageData string `json:"imageData" binding:"required"` // base64 data URI or raw base64
	MimeType  string `json:"mimeType"`                     // e.g. "image/jpeg"
}

type ocrResponse struct {
	Text       string  `json:"text"`
	Confidence float64 `json:"confidence"`
}

// gemini request/response types
type geminiRequest struct {
	Contents         []geminiContent        `json:"contents"`
	GenerationConfig map[string]interface{} `json:"generationConfig,omitempty"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text       string        `json:"text,omitempty"`
	InlineData *geminiInline `json:"inlineData,omitempty"`
}

type geminiInline struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

const ocrPrompt = `You are a receipt OCR assistant. Extract ALL text from this receipt image exactly as it appears.
Include store name, items, prices, totals, dates, and any other text visible on the receipt.
Format each line of text on its own line. Be as accurate as possible with numbers and prices.
Return ONLY the extracted text, no commentary.`

// PerformOCR handles POST /v1/ocr
func (h *OCRHandler) PerformOCR(c *gin.Context) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GEMINI_API_KEY not configured"})
		return
	}

	var req ocrRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "imageData is required"})
		return
	}

	// Strip data URI prefix if present (e.g., "data:image/jpeg;base64,...")
	imageBase64 := req.ImageData
	mimeType := req.MimeType
	if mimeType == "" {
		mimeType = "image/jpeg"
	}

	// Handle data URI format
	if len(imageBase64) > 5 && imageBase64[:5] == "data:" {
		// Extract mime type and base64 data
		for i := 5; i < len(imageBase64); i++ {
			if imageBase64[i] == ';' {
				mimeType = imageBase64[5:i]
				// Find the comma after "base64,"
				for j := i; j < len(imageBase64); j++ {
					if imageBase64[j] == ',' {
						imageBase64 = imageBase64[j+1:]
						break
					}
				}
				break
			}
		}
	}

	// Build Gemini API request
	geminiReq := geminiRequest{
		Contents: []geminiContent{
			{
				Parts: []geminiPart{
					{Text: ocrPrompt},
					{
						InlineData: &geminiInline{
							MimeType: mimeType,
							Data:     imageBase64,
						},
					},
				},
			},
		},
		GenerationConfig: map[string]interface{}{
			"temperature":     0.1,
			"maxOutputTokens": 4096,
		},
	}

	body, err := json.Marshal(geminiReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build request"})
		return
	}

	// Call Gemini API
	url := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=%s",
		apiKey,
	)

	resp, err := http.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to call Gemini API"})
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to read Gemini response"})
		return
	}

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusBadGateway, gin.H{
			"error":  "Gemini API error",
			"detail": string(respBody),
		})
		return
	}

	var geminiResp geminiResponse
	if err := json.Unmarshal(respBody, &geminiResp); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to parse Gemini response"})
		return
	}

	if geminiResp.Error != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": geminiResp.Error.Message})
		return
	}

	// Extract text from response
	text := ""
	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		text = geminiResp.Candidates[0].Content.Parts[0].Text
	}

	if text == "" {
		c.JSON(http.StatusBadGateway, gin.H{"error": "no text returned from Gemini"})
		return
	}

	// Estimate confidence based on text length/quality
	confidence := 0.85
	if len(text) > 100 {
		confidence = 0.92
	}
	if len(text) > 500 {
		confidence = 0.95
	}

	c.JSON(http.StatusOK, ocrResponse{
		Text:       text,
		Confidence: confidence,
	})
}
