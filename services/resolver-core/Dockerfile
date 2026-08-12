FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod go.sum main.go ./
RUN go mod download && go build -o /resolver .
FROM alpine:3.20
COPY --from=build /resolver /resolver
EXPOSE 53/udp 53/tcp 443/tcp 853/tcp
ENTRYPOINT ["/resolver"]
