FROM --platform=${BUILDPLATFORM:-linux/amd64} python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --target=/install -r requirements.txt

FROM --platform=${TARGETPLATFORM:-linux/amd64} python:3.11-slim
WORKDIR /app

ARG BUILDPLATFORM
ARG TARGETPLATFORM
ENV APP_PORT=5000

COPY --from=builder /install /usr/local/lib/python3.11/site-packages/
COPY . .
EXPOSE ${APP_PORT}
CMD python -m uvicorn main:app --host 0.0.0.0 --port ${APP_PORT}