# Orders Microservice

```
docker compose up -d
```

## Dev

1. Clone the repository
2. Run `npm install`
3. Create .env from .env.example
4. Getting up Nats server
5. Getting microservices up and running (Refer to the README.md of each microservice)
6. Run `npm run start:dev`

## Nats

```bash
docker run -d --name nats-main -p 4222:4222 -p 6222:6222 -p 8222:8222 nats
```
