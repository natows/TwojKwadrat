FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN go build -ldflags="-s -w" -o main . 
#zmniejsza rozmiar pliku binarnego


FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE 5001
CMD ["./main"] 


# multistage build robimy plik wykonywalny w go  a potem kopiujemy go do alpine
