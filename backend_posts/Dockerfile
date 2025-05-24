FROM --platform=${BUILDPLATFORM:-linux/amd64} golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .

ARG TARGETPLATFORM
# Skonfiguruj odpowiednie GOOS i GOARCH
RUN case ${TARGETPLATFORM} in \
    "linux/amd64")  GOARCH=amd64  ;; \
    "linux/arm64")  GOARCH=arm64  ;; \
    *)              GOARCH=amd64  ;; \
    esac \
    && go build -ldflags="-s -w" -o main .

FROM --platform=${TARGETPLATFORM:-linux/amd64} alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE 5001
CMD ["./main"]