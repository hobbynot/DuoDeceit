# DuoDeceit 🕵️‍♂️🎭
### Real-World Multiplayer Social Deduction Party Game

DuoDeceit is a real-time, responsive multiplayer web game inspired by social deduction party games. Designed for groups sitting in the same physical room, players use their personal smartphones or laptops while speaking face-to-face in the real world — no extra hardware or voice chat servers required!

---

## 🎮 How the Game Works

1. **Private Room Creation**:
   - The host creates a game room and receives a 6-character room code and a shareable join link (with QR-code / clipboard copy).
   - Friends join from their devices using the link or room code.
2. **Secret Word Assignment**:
   - Every player receives a secret word.
   - **Majority**: Receive the main word (e.g. *"Coffee"*).
   - **Undercover / Impostor**: Receives a closely related but distinct word (e.g. *"Espresso"*).
   - Nobody knows who has which word!
3. **Clue Rounds**:
   - Players take turns giving a 1-word or short clue aloud (and typing it onto the live clue board).
   - If your clue is too obvious, the minority will catch on; if it's too vague, your fellow majority players will suspect you!
4. **Discussion & Debate**:
   - When the clue rounds conclude, a synchronized countdown timer triggers real-world debate and defense.
5. **Secret Voting & Elimination**:
   - Everyone secretly casts their vote on their device.
   - Tied votes trigger an intense sudden-death revote between top candidates.
   - Once eliminated, the true roles and words are unveiled!

---

## ✨ Features

- **Custom Game Settings**:
  - **Category Filtering**: Nature & Animals, Food & Drinks, Technology, Professions, Objects & Tools, Abstract Concepts, or All.
  - **Difficulty Levels**: Easy (clear contrasts), Medium (nuanced), Hard (subtle differences), or All.
  - **Customizable Discussion Timer**: 60s, 90s, 120s, 180s, or 240s.
- **Custom Word Pairs Upload (100s to 1,000s)**:
  - Upload custom JSON (`[{"word1":"Sun","word2":"Moon","category":"Space","difficulty":"easy"}]`) or CSV (`word1,word2,category,difficulty`).
  - Built-in template generator to download starter JSON/CSV files.
- **Live Clue Board**:
  - Displays submitted clues in real-time across Round 1 and Round 2, visible throughout discussion and voting.
- **Seamless Reconnection**:
  - Players who refresh their browser or switch tabs automatically reclaim their slot without losing game state or role assignments.
- **Rich Cyberpunk Glassmorphism UI**:
  - Designed with responsive typography, animated sound effects (Web Audio API), glowing badges, and mobile-first layouts.

---

## 🛠️ Architecture & Tech Stack

- **Monorepo**:
  - `shared/`: Shared TypeScript types, socket event contracts, and game constants.
  - `server/`: Node.js, Express, Socket.IO, custom stateful GameEngine and WordManager.
  - `client/`: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Web Audio synthesizer.
- **Real-Time Communication**: Socket.IO with strict type safety across client and server.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher)

### Installation
```bash
# Clone the repository
git clone https://github.com/hobbynot/DuoDeceit.git
cd DuoDeceit

# Install dependencies for all workspaces
npm install
```

### Running Locally
```bash
# Start both server and client concurrently
npm run dev
```

- **Client**: `http://localhost:5173` (or local network IP `http://192.168.x.x:5173` for mobile testing)
- **Server**: `http://localhost:3001`

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

---

## 📄 License
MIT License
