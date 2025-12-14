package services

import (
	"context"
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
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
		return fmt.Errorf("invalid file type")
	}
}

func boolPtr(v bool) *bool { return &v }

// UploadPaymentQR uploads the user's payment QR image.
func (s *UploadService) UploadPaymentQR(ctx context.Context, file multipart.File, filename string, userID string) (string, error) {
	if err := validateImageExt(filename); err != nil {
		return "", err
	}

	result, err := s.cld.Upload.Upload(ctx, file, uploader.UploadParams{
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
func (s *UploadService) UploadPaymentProof(ctx context.Context, file multipart.File, filename string, proofID string) (string, error) {
	if err := validateImageExt(filename); err != nil {
		return "", err
	}

	result, err := s.cld.Upload.Upload(ctx, file, uploader.UploadParams{
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
