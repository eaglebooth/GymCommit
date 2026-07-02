# GymCommit 🏋️

**GymCommit** is a decentralized, on-chain self-discipline and fitness commitment game where users back their goals with monetary stakes. Evaluations of check-in files (weight scales, exercise videos) are automated by GenLayer subjective AI Personal Trainer Juries.

---

## 💡 How It Works

1. **Lock Deposit & Create Challenge**: Users choose a fitness target category (`WEIGHT_LOSS` or `GYM_ATTENDANCE`), configure goal targets, set challenge duration, and deposit a monetary stake in USD (e.g. $100).
2. **Submit Proof Logs**: Throughout the challenge, users upload workout logs, photos, or gym timelapse video links as proof.
3. **Subjective AI Consensus Audit**: GenLayer Validator Juries run subjective evaluations (using `strict_eq` and `exec_prompt`) on the submitted proofs:
   * **Photoshop scale manipulation check**: Detect digital edits on scale weight numbers.
   * **Imposter check**: Compare user addresses/faces to detect if someone else performed the workouts.
4. **Resolution**: 
   * **Success**: The user receives their original deposit back.
   * **Failure**: The locked deposit is confiscated and added to the **Active Rewards Pool** to reward successful discipline athletes.

---

## 🛠️ Tech Stack & Architecture

* **Smart Contract Layer**: Python bytecode (`v0.2.16`) running on the GenLayer virtual machine, utilizing `gl.Contract`, `strict_eq` consensus checks, and `exec_prompt` AI instructions.
* **Frontend Web App**: Next.js 16 (App Router), React, Lucide Icons, and the GenLayer JS SDK.
* **Styling**: Sleek athletic dark mode theme using high-contrast sport Orange (`#FD6524`) and Carbon Charcoal accents inspired by modern fitness apps.

---

## 📁 Repository Structure

```bash
├── contracts/
│   └── GymCommit.py             # Intelligent GenLayer Smart Contract
├── tests/
│   └── test_contract_static.py  # Static AST rules verification script
└── frontend/
    ├── src/
    │   ├── app/                 # Next.js pages & global styles
    │   └── lib/                 # Web3 connection helpers & RPC setups
    ├── public/scenarios/        # Simulated check-in proof scenarios for testing
    └── .env.example             # Configuration example
```

---

## 🚀 Getting Started

### 1. Smart Contract Verification
Run the static AST analysis verification check on the smart contract before deploying:
```bash
python tests/test_contract_static.py
```

### 2. Run Frontend Locally
To run the web interface on local port `3044`:
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Next.js development server:
   ```bash
   npm run dev -- -p 3044
   ```
4. Open [http://localhost:3044](http://localhost:3044) on your browser.

---

## 🔗 Deployed Contracts & Live Demos

* **Deployed Smart Contract**: `0xE7e463244e3EC69618C78BCC416319FFC20bC113` on GenLayer Studio (Studionet)
* **Live Vercel Application**: [https://gymcommit-payroll.vercel.app](https://gymcommit-payroll.vercel.app)
