package services

import (
	"bytes"
	"context"
	"fmt"
	"image"
	_ "image/gif"  // Register GIF decoder (for detection, but we reject it)
	_ "image/jpeg" // Register JPEG decoder
	_ "image/png"  // Register PNG decoder
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	_ "golang.org/x/image/webp" // Register WebP decoder

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

// Upload constraints
const (
	MaxFileSize   = 5 * 1024 * 1024 // 5MB
	MinDimension  = 100             // Minimum width/height in pixels
	MaxDimension  = 4000            // Maximum width/height in pixels
)

// UploadService uploads images to Cloudinary.
//
// It is intentionally optional: if Cloudinary env vars are not set,
// NewUploadService returns an error and callers can run without uploads.
type UploadService struct {
	cld *cloudinary.Cloudinary
}

func NewUploadService() (*UploadService, error) {
	cloudName := strings.TrimSpace(os.Getenv("CLOUDINARY_CLOUD_NAME"))
	apiKey := strings.TrimSpace(os.Getenv("CLOUDINARY_API_KEY"))
	apiSecret := strings.TrimSpace(os.Getenv("CLOUDINARY_API_SECRET"))
	if cloudName == "" || apiKey == "" || apiSecret == "" {
		return nil, fmt.Errorf("cloudinary not configured")
	}

	cld, err := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
	if err != nil {
		return nil, err
	}

	return &UploadService{cld: cld}, nil
}

func validateImageExt(filename string) error {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".jpg", ".jpeg", ".png", ".webp":
		return nil
	default:
		return fmt.Errorf("invalid file type: only jpg, png, webp allowed")
	}
}

// validateImageContent reads the file, validates it's a real image with valid dimensions.
// Returns the file content as bytes (since we need to read it for validation).
func validateImageContent(file multipart.File, fileSize int64) ([]byte, error) {
	// Check file size
	if fileSize > MaxFileSize {
		return nil, fmt.Errorf("file too large: max %dMB allowed", MaxFileSize/(1024*1024))
	}

	// Read file into memory (limited to MaxFileSize + 1 to detect oversized files)
	limitedReader := io.LimitReader(file, MaxFileSize+1)
	data, err := io.ReadAll(limitedReader)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Double-check size after reading
	if len(data) > MaxFileSize {
		return nil, fmt.Errorf("file too large: max %dMB allowed", MaxFileSize/(1024*1024))
	}

	// Decode image to validate it's a real image and get dimensions
	img, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("invalid image file: could not decode")
	}

	// Validate format (only allow jpeg, png, webp)
	switch format {
	case "jpeg", "png", "webp":
		// OK
	default:
		return nil, fmt.Errorf("invalid image format: only jpg, png, webp allowed (got %s)", format)
	}

	// Validate dimensions
	if img.Width < MinDimension || img.Height < MinDimension {
		return nil, fmt.Errorf("image too small: minimum %dx%d pixels required", MinDimension, MinDimension)
	}
	if img.Width > MaxDimension || img.Height > MaxDimension {
		return nil, fmt.Errorf("image too large: maximum %dx%d pixels allowed", MaxDimension, MaxDimension)
	}

	return data, nil
}

func boolPtr(v bool) *bool { return &v }

// UploadPaymentQR uploads the user's payment QR image.
func (s *UploadService) UploadPaymentQR(ctx context.Context, file multipart.File, header *multipart.FileHeader, userID string) (string, error) {
	if err := validateImageExt(header.Filename); err != nil {
		return "", err
	}

	// Validate content, size, and dimensions
	data, err := validateImageContent(file, header.Size)
	if err != nil {
		return "", err
	}

	result, err := s.cld.Upload.Upload(ctx, bytes.NewReader(data), uploader.UploadParams{
		Folder:    "payup/payment-qr",
		PublicID:  fmt.Sprintf("user_%s", userID),
		Overwrite: boolPtr(true),
		// Keep QR readable: avoid heavy crops; fit into bounds.
		Transformation: "c_limit,w_1000,h_1000,q_auto:best",
	})
	if err != nil {
		return "", err
	}
	return result.SecureURL, nil
}

// UploadPaymentProof uploads a receipt / proof image.
func (s *UploadService) UploadPaymentProof(ctx context.Context, file multipart.File, header *multipart.FileHeader, proofID string) (string, error) {
	if err := validateImageExt(header.Filename); err != nil {
		return "", err
	}

	// Validate content, size, and dimensions
	data, err := validateImageContent(file, header.Size)
	if err != nil {
		return "", err
	}

	result, err := s.cld.Upload.Upload(ctx, bytes.NewReader(data), uploader.UploadParams{
		Folder:         "payup/payment-proofs",
		PublicID:       fmt.Sprintf("proof_%s", proofID),
		Overwrite:      boolPtr(false),
		Transformation: "c_limit,w_1600,h_2000,q_auto:good",
	})
	if err != nil {
		return "", err
	}
	return result.SecureURL, nil
}

// UploadAvatar uploads the user's profile avatar image.
func (s *UploadService) UploadAvatar(ctx context.Context, file multipart.File, header *multipart.FileHeader, userID string) (string, error) {
	if err := validateImageExt(header.Filename); err != nil {
		return "", err
	}

	// Validate content, size, and dimensions
	data, err := validateImageContent(file, header.Size)
	if err != nil {
		return "", err
	}

	result, err := s.cld.Upload.Upload(ctx, bytes.NewReader(data), uploader.UploadParams{
		Folder:    "payup/avatars",
		PublicID:  fmt.Sprintf("avatar_%s", userID),
		Overwrite: boolPtr(true),
		// Crop to square for avatar, with face detection.
		Transformation: "c_fill,g_face,w_400,h_400,q_auto:good",
	})
	if err != nil {
		return "", err
	}
	return result.SecureURL, nil
}
