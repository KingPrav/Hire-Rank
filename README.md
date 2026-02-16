# HireRank

**Intelligent Resume Scoring for Recruiters**

HireRank helps you compare candidates objectively. Upload resumes, define what skills matter, and get a ranked list with transparent scores—no more manual scanning or inconsistent evaluations.

---

## What Recruiters Get

- **Create jobs** with required and nice-to-have skills
- **Upload PDF resumes** and auto-extract skills + experience
- **View ranked candidates** with scores and match percentages
- **Transparent scoring** so you know exactly why a candidate ranks where they do

---

## Quick Setup

### Prerequisites

- **Node.js** (v18 or newer)
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Docker** (optional, for MongoDB + Redis)

### 1. Start MongoDB

**Using Docker:**
```bash
docker compose up -d
```

**Using local MongoDB:** Ensure MongoDB is running on `localhost:27017`.

### 2. Install & Run

```bash
# Install dependencies
npm install
cd server && npm install
cd ../client && npm install
cd ..

# Run the app (server + client)
npm run dev
```

### 3. Open the App

- **App:** http://localhost:3000  
- **API:** http://localhost:5001  

> **Note:** If port 5000 is in use (e.g. by AirPlay on macOS), the server uses port 5001. See `server/.env` to change ports.

---

## Recruiter Walkthrough

### Step 1: Create an Account

1. Go to http://localhost:3000
2. Click **Register**
3. Enter your email and password (min 6 characters)
4. You’ll be taken to your dashboard

---

### Step 2: Create a Job

1. Click **+ New Job**
2. Enter the **job title** (e.g. *Senior React Developer*)
3. Add **required skills** with weights (0–10):
   - Higher weight = more important
   - Example: JavaScript (8), React (9), Node.js (6)
4. Optionally add **nice-to-have skills** (e.g. Docker, AWS)
5. Click **Create Job**

---

### Step 3: Upload Resumes

1. Open the job you created
2. Click **+ Upload Resume (PDF)**
3. Select candidate PDF resumes
4. Each resume is parsed automatically for skills and experience

---

### Step 4: View Rankings

1. Switch to the **Rankings** tab
2. Candidates are sorted by score (highest first)
3. For each candidate you’ll see:
   - **Score** – weighted match to your requirements
   - **Match %** – how many required skills they have
   - **Skills** – extracted skills with years of experience

---

## How Scoring Works

| Experience | Multiplier |
|------------|------------|
| 0–1 years | 0.5× |
| 1–3 years | 1× |
| 3+ years  | 1.5× |

- **Required skills** use full weight
- **Nice-to-have skills** use half weight
- **Bonus:** 20% score boost when a candidate matches ≥80% of required skills

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Registration failed | Ensure the server is running and MongoDB is connected |
| Port already in use | Change `PORT` in `server/.env` (e.g. to 5001) and update `client/src/services/api.js` baseURL |
| Can’t reach server | Run `npm run server` in one terminal and `npm run client` in another |

---

## Tech Stack

- **Backend:** Node.js, Express, MongoDB, Redis (optional caching)
- **Frontend:** React
- **Resume parsing:** pdf-parse + skill extraction

---

## License

MIT
