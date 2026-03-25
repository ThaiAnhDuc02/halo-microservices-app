# Microservices App

## Kiến trúc

```
                        ┌─────────────────────────────────────┐
                        │           Kubernetes Cluster         │
                        │                                      │
                        │  ┌─────────────────────────────┐    │
User/Client             │  │        api-gateway           │    │
    │                   │  │        (NodePort 30000)      │    │
    │  HTTP Request      │  └──────────────┬──────────────┘    │
    └──────────────────►│                 │                    │
       :30000           │        ┌────────┴────────┐           │
                        │        │                 │           │
                        │  ┌─────▼──────┐  ┌──────▼──────┐   │
                        │  │user-service│  │product-svc  │   │
                        │  │  :3001     │  │  :3002      │   │
                        │  └────────────┘  └─────────────┘   │
                        │                                      │
                        └─────────────────────────────────────┘
```

## Luồng traffic

| Bước | Mô tả |
|------|-------|
| 1 | Client gọi `http://<node-ip>:30000/users` hoặc `/products` |
| 2 | K8s NodePort chuyển traffic vào **api-gateway** pod |
| 3 | api-gateway nhận request, xác định route |
| 4 | api-gateway gọi nội bộ tới K8s Service tương ứng |
| 5 | K8s Service load balance tới pod của service đó |
| 6 | Response trả ngược về client qua api-gateway |

## Giao tiếp nội bộ

```
api-gateway → http://user-service:3001/users       (qua K8s Service DNS)
api-gateway → http://product-service:3002/products (qua K8s Service DNS)
```

> K8s tự resolve tên `user-service` và `product-service` thành IP của pod tương ứng.  
> Client bên ngoài **không thể** gọi thẳng vào user-service hay product-service.

## Cấu trúc dự án

```
microservices-app/
├── api-gateway/          # Route và forward request
├── user-service/         # Trả danh sách users
├── product-service/      # Trả danh sách products
├── docker-compose.yml    # Chạy local
└── manifests/
    ├── api-gateway.yaml      # Deployment + NodePort Service
    ├── user-service.yaml     # Deployment + ClusterIP Service
    └── product-service.yaml  # Deployment + ClusterIP Service
```

## Chạy local (Docker Compose)

```bash
docker-compose up --build
curl http://localhost:3000/users
curl http://localhost:3000/products
```

## Deploy lên Kubernetes

```bash
kubectl apply -f manifests/
curl http://<node-ip>:30000/users
```
