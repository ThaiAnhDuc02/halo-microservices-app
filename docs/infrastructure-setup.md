# Infrastructure Setup Guide

Kiến trúc tổng quan: các service app chạy trong **Minikube**, còn Nginx, Kafka, MySQL, Redis chạy là các **Docker container riêng biệt** trên host.

```
┌─────────────────────────────────────────────────────┐
│                     HOST MACHINE                     │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────┐  ┌────────┐ │
│  │  Nginx   │  │  Kafka   │  │ MySQL │  │ Redis  │ │
│  │  :80     │  │  :9092   │  │ :3306 │  │  :6379 │ │
│  └────┬─────┘  └──────────┘  └───────┘  └────────┘ │
│       │              ▲                               │
│       │         ┌────┘                               │
│  ┌────▼─────────────────────────────────────────┐   │
│  │                  MINIKUBE                     │   │
│  │                                               │   │
│  │  api-gateway(:3000) ──► user-service(:3001)   │   │
│  │        │           ──► product-service(:3002) │   │
│  │        └─────────────► order-service(:3003)   │   │
│  │                                               │   │
│  │  order-processor (consumer)                   │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 1. Chạy toàn bộ infra bằng Docker Compose

### Bước 1: Lấy HOST_IP

```bash
ip route get 1 | awk '{print $7; exit}'
# ví dụ: 192.168.1.10
```

### Bước 2: Tạo file .env

```bash
cd infra
cp .env.example .env
# Sửa HOST_IP trong .env thành IP thật của máy
```

### Bước 3: Lấy Minikube IP và cập nhật nginx.conf

```bash
minikube ip
# ví dụ: 192.168.49.2
```

Sửa `infra/nginx.conf`, thay `MINIKUBE_IP` bằng IP vừa lấy:

```nginx
upstream api_gateway {
    server 192.168.49.2:30000;
}
```

### Bước 4: Nội dung docker-compose.yml

```yaml
version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://${HOST_IP}:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"

  mysql:
    image: mysql:8.0
    container_name: mysql
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: microservices
      MYSQL_USER: admin
      MYSQL_PASSWORD: secret
    volumes:
      - mysql-data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

  nginx:
    image: nginx:alpine
    container_name: nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - kafka
      - mysql
      - redis

volumes:
  mysql-data:
  redis-data:
```

### Bước 5: Nội dung nginx.conf

```nginx
upstream api_gateway {
    server MINIKUBE_IP:30000;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://api_gateway;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Bước 6: Khởi động

```bash
cd infra
docker compose up -d
docker compose ps
```

### Tạo topic Kafka thủ công (nếu cần)

```bash
docker exec kafka kafka-topics \
  --create --topic orders \
  --bootstrap-server localhost:9092 \
  --partitions 1 --replication-factor 1
```

---

## 2. Cấu hình các Pod trong Minikube

Thêm `env` vào manifest của các service cần kết nối ra ngoài:

**order-service.yaml**
```yaml
env:
  - name: KAFKA_BROKER
    value: "<HOST_IP>:9092"
  - name: DB_URL
    value: "mysql://admin:secret@<HOST_IP>:3306/microservices"
  - name: REDIS_URL
    value: "redis://<HOST_IP>:6379"
```

**order-processor.yaml**
```yaml
env:
  - name: KAFKA_BROKER
    value: "<HOST_IP>:9092"
  - name: DB_URL
    value: "mysql://admin:secret@<HOST_IP>:3306/microservices"
```

> Thay `<HOST_IP>` bằng IP thật của máy host.

---

## 3. Kiểm tra kết nối

```bash
# Kafka
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092

# MySQL
docker exec -it mysql mysql -u admin -psecret microservices -e "show tables;"

# Redis
docker exec -it redis redis-cli ping
# → PONG

# Test API qua Nginx
curl http://localhost/users
curl http://localhost/products
curl -X POST http://localhost/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":"u1","productId":"p1","quantity":2}'
```

---

## 4. Tóm tắt ports

| Container  | Port  | Mục đích                      |
|------------|-------|-------------------------------|
| nginx      | 80    | Entry point từ bên ngoài      |
| kafka      | 9092  | Kafka broker                  |
| zookeeper  | -     | Kafka coordination (nội bộ)   |
| mysql      | 3306  | Database                      |
| redis      | 6379  | Cache / session               |
| minikube   | 30000 | api-gateway NodePort (nội bộ) |
