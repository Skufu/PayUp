FROM golang:1.23-alpine AS build

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/payup-api ./cmd/api


FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /

COPY --from=build /out/payup-api /payup-api

ENV PORT=8080

EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/payup-api"]

