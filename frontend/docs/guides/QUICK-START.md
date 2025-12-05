# 🚀 SYSME POS - Quick Start Guide

**Get up and running in 5 minutes!**

---

## ⚡ Super Fast Start (Recommended)

### Windows:
```bash
# Double-click or run:
start.bat
```

### Linux/Mac:
```bash
chmod +x start.sh
./start.sh
```

**That's it!** The script will:
- ✅ Install dependencies
- ✅ Initialize database
- ✅ Start backend (http://localhost:3000)
- ✅ Start frontend (http://localhost:5173)
- ✅ Open browser automatically

**Default Login:**
- Username: `admin`
- Password: `admin123`

⚠️ **Change password immediately!**

---

## 📋 Manual Start (Step by Step)

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ..
npm install
```

### 2. Initialize Database

```bash
cd backend
node init-database.js
```

This creates:
- ✅ 77 database tables
- ✅ Sample company & location
- ✅ Admin user
- ✅ Sample products & categories

### 3. Start Backend

```bash
# From backend folder
npm start

# Or in development mode
npm run dev
```

Backend runs on: `http://localhost:3000`

### 4. Start Frontend

```bash
# From root folder
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## 🎯 First Steps After Login

### 1. **Dashboard**
View real-time metrics and KPIs

### 2. **Products**
- Add your products
- Create categories
- Set prices

### 3. **Sales/POS**
- Create your first order
- Process payment
- Print receipt

### 4. **Inventory**
- Check stock levels
- Create purchase orders
- Transfer between locations

### 5. **Customers**
- Add customers
- Setup loyalty program
- Track orders

---

## 🔧 Configuration

### Environment Variables

**Backend** (`backend/.env`):
```env
PORT=3000
DATABASE_URL=./database.sqlite
JWT_SECRET=your-secret-here
```

**Frontend** (`.env`):
```env
VITE_API_URL=http://localhost:3000/api
```

---

## 📊 Test the API

### Using Postman:
1. Import `postman_collection.json`
2. Login to get auth token
3. Test endpoints

### Using cURL:

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

**Get Products:**
```bash
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🐛 Troubleshooting

### Backend won't start
- Check port 3000 is free: `netstat -ano | findstr :3000`
- Check database exists: `ls backend/database.sqlite`
- Reinitialize: `rm backend/database.sqlite && node backend/init-database.js`

### Frontend won't connect
- Verify backend is running
- Check `VITE_API_URL` in `.env`
- Clear browser cache

### Login fails
- Verify database was initialized
- Check default credentials: `admin` / `admin123`
- Check backend logs

---

## 📚 Next Steps

- 📖 Read full [README.md](README.md)
- 🚢 See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)
- 🧪 Run tests: `cd backend && npm test`
- 🐳 Use Docker: `docker-compose up`

---

## 💡 Tips

- **Development:** Use `npm run dev` for hot reload
- **Production:** Use `npm start` or Docker
- **Testing:** Use `npm test` for backend tests
- **Backup:** Database backups in `backend/backups/`
- **Logs:** Check `backend/logs/` for errors

---

## 🆘 Need Help?

- 📖 [Full Documentation](README.md)
- 🐛 [Report Issues](https://github.com/your-repo/issues)
- 💬 [Community Support](https://discord.gg/your-server)

---

**🎉 Enjoy your SYSME POS!**

*Built with ❤️ for restaurants*
