FROM golang:1.24-alpine AS build

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/payup-api ./cmd/api


FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /

# Copy CA certificates and timezone data from build stage (needed for HTTPS and time operations)
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /usr/share/zoneinfo /usr/share/zoneinfo

# Copy the binary
COPY --from=build /out/payup-api /payup-api

ENV PORT=8080

EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/payup-api"]

