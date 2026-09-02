# Airtel Cloud Production Setup Guide

**Client**: Gryphon Academy / RxOne  
**Provider**: Xtelify Limited (Airtel Cloud)  
**Monthly Commitment**: ₹18,370 + 18% GST = **₹21,676.88 / month**

---

## 1. What We Have (2 VMs on Airtel Cloud)

| Server / Resource | Purpose | Configuration | Airtel SKU |
|---|---|---|---|
| **VM 1 (App Server)** | Spring Boot 4 + Redis + Nginx | 4 vCPU, 16 GB RAM, 100 GB SSD | `ccs.xlarge` |
| **VM 2 (Database Server)** | PostgreSQL 16 Database | 2 vCPU, 8 GB RAM, 100 GB SSD | `ccs.Large_2vCPU_8Gb` |
| **Public IP** | Point your domain (`api.yourdomain.com`) | 1 Static IP | `internet.publicip` |
| **Object Storage** | Candidate photos / audio recordings | 250 GB Storage | `objsto.stalow` |
| **Backup Storage** | Automated DB backups | 300 GB Storage | `bac.activate` |

---

## 2. Simple Setup Steps

### Step 1: Set up Database Server (VM 2)
1. SSH into VM 2:
   ```bash
   ssh root@<VM2_IP>
   ```
2. Install PostgreSQL 16:
   ```bash
   sudo apt update && sudo apt install postgresql-16 -y
   ```
3. Create the database and user:
   ```bash
   sudo -u postgres psql -c "CREATE DATABASE rxone;"
   sudo -u postgres psql -c "CREATE USER rxone_user WITH PASSWORD 'YourStrongDbPassword123';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE rxone TO rxone_user;"
   ```
4. Allow VM 1 to connect to PostgreSQL:
   * Open `/etc/postgresql/16/main/postgresql.conf` and set:
     ```ini
     listen_addresses = '*'
     ```
   * Open `/etc/postgresql/16/main/pg_hba.conf` and add:
     ```conf
     host all all <VM1_PRIVATE_IP>/32 scram-sha-256
     ```
   * Restart PostgreSQL:
     ```bash
     sudo systemctl restart postgresql
     ```

---

### Step 2: Set up App Server (VM 1)
1. SSH into VM 1:
   ```bash
   ssh root@<VM1_PUBLIC_IP>
   ```
2. Install Java 21, Redis, Nginx & Certbot:
   ```bash
   sudo apt update && sudo apt install openjdk-21-jdk redis-server nginx certbot python3-certbot-nginx -y
   ```
3. Set Redis password in `/etc/redis/redis.conf`:
   ```conf
   requirepass YourStrongRedisPassword123
   ```
   Restart Redis:
   ```bash
   sudo systemctl restart redis-server
   ```

---

### Step 3: Put Backend Secrets on VM 1
Create `/etc/rxone/rxone.env`:
```bash
sudo mkdir -p /etc/rxone
sudo nano /etc/rxone/rxone.env
```

Paste these settings:
```env
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8081

# Database (pointing to VM 2)
SPRING_DATASOURCE_URL=jdbc:postgresql://<VM2_PRIVATE_IP>:5432/rxone
SPRING_DATASOURCE_USERNAME=rxone_user
SPRING_DATASOURCE_PASSWORD=YourStrongDbPassword123

# Redis (running on same machine)
SPRING_DATA_REDIS_HOST=127.0.0.1
SPRING_DATA_REDIS_PORT=6379
SPRING_DATA_REDIS_PASSWORD=YourStrongRedisPassword123

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here
```

---

### Step 4: Run Spring Boot App via Systemd on VM 1
1. Upload your `rxone.jar` to `/var/www/rxone/rxone.jar`.
2. Create service file `/etc/systemd/system/rxone.service`:
```ini
[Unit]
Description=RxOne Spring Boot App
After=network.target

[Service]
Type=simple
EnvironmentFile=/etc/rxone/rxone.env
ExecStart=/usr/bin/java -Xmx8g -jar /var/www/rxone/rxone.jar
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
3. Start the app:
```bash
sudo systemctl daemon-reload
sudo systemctl enable rxone
sudo systemctl start rxone
```

---

### Step 5: Nginx + Free SSL on VM 1
1. Create `/etc/nginx/sites-available/rxone`:
```nginx
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    listen 80;
}
```
2. Enable and get SSL:
```bash
sudo ln -s /etc/nginx/sites-available/rxone /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

## 3. Daily Backup (300 GB Airtel Backup)
Set up a nightly cron job on VM 2 to backup PostgreSQL:
```bash
# In crontab -e on VM 2:
0 2 * * * pg_dump -U postgres rxone | gzip > /var/backups/rxone_$(date +\%F).sql.gz
```
