# ⏳ Git Time Machine

**Git Time Machine** is an educational learning tool and developer utility designed to demonstrate how Git stores commit metadata, handles timestamps, and how services like GitHub use commit dates to render contribution activity graphs.

> ⚠️ **Educational & Safety Disclaimer**  
> This project is designed strictly as a Git internals learning tool to explore commit object structure, environment variables (`GIT_AUTHOR_DATE`, `GIT_COMMITTER_DATE`), and historical metadata. It is **not** intended to bypass security controls, falsify work history, or violate platform Terms of Service. Always use this tool in isolated test repositories.

---

## 📚 Core Git Concepts Explained

### 1. How Git Stores Commit Metadata
Under the hood, Git is a content-addressable key-value store. Every commit in Git is represented by a **Commit Object** containing:
* A reference to a **Tree Object** (representing directory state & files).
* Zero or more **Parent Commit Hashes**.
* **Author Info** (Name, Email, and **Author Date**).
* **Committer Info** (Name, Email, and **Committer Date**).
* A **Commit Message**.

You can inspect any raw commit object using Git's low-level `cat-file` plumbing command:
```bash
git cat-file -p HEAD
```
*Output Example:*
```text
tree 6f2a89c89018e69d7bb36ef7c0500d43c22b109e
parent a1b2c3d4e5f67890123456789abcdef012345678
author Jane Developer <jane@example.com> 1672531199 +0000
committer Jane Developer <jane@example.com> 1672531199 +0000

Fix database connection timeout bug
```

---

### 2. Author Date vs. Committer Date
Git makes a clear distinction between who *wrote* the code change and who *committed* or applied the change:

| Metadata Field | Git Flag / Variable | Description |
| :--- | :--- | :--- |
| **Author Date** | `--date` or `GIT_AUTHOR_DATE` | The date/time when the code changes were originally written. |
| **Committer Date** | `GIT_COMMITTER_DATE` | The date/time when the commit object was actually created or rebased/cherry-picked into the current branch. |

When you run a standard `git commit --date="2023-01-01T12:00:00"`, Git sets `GIT_AUTHOR_DATE`. However, `GIT_COMMITTER_DATE` defaults to the current system clock time unless explicitly overridden via the `GIT_COMMITTER_DATE` environment variable.

In this project, `gitManager.js` sets both environment variables using `simple-git`:
```javascript
const customGit = git.env({
  ...process.env,
  GIT_AUTHOR_DATE: authorDate,
  GIT_COMMITTER_DATE: committerDate
});
```

---

### 3. How GitHub Processes Contribution Graphs
GitHub's contribution graph relies on commit metadata according to the following rules:

1. **Email Match**: The author email in the commit must match an email address registered and verified in your GitHub account.
2. **Target Branch**: Commits must be made to the repository's default branch (usually `main` or `master`) or the `gh-pages` branch.
3. **Date Attribute**: GitHub displays contribution squares based on the **Author Date** (converted to the user's local timezone).
4. **Repository Visibility**: Private repository commits are only visible if enabled in your profile settings.

---

## 🛠 Project Structure

```
git-time-machine/
├── index.js                  # Main CLI & Interactive Menu entry point
├── package.json              # Project configuration & dependencies
├── README.md                 # Technical documentation & educational guide
├── data.json                 # Auto-updated JSON payload for staging commits
│
└── src/
    ├── commitGenerator.js    # Batch & single commit orchestrator
    ├── dateGenerator.js      # Timestamp generators, validation & range helpers
    ├── gitManager.js         # Low-level Git operations (repo init, commit, push, raw log)
    └── historyAnalyzer.js    # Log parser, stats calculator, terminal heatmap & exporter
```

### Module Responsibilities:

* [index.js](file:///c:/Git-Time-Machine/index.js): Entry point supporting CLI flags (e.g. `generate`, `analyze`, `heatmap`, `export`, `push`) and an interactive menu fallback when invoked without arguments.
* [src/commitGenerator.js](file:///c:/Git-Time-Machine/src/commitGenerator.js): Manages batch creation of commits across date ranges. Writes metadata into `data.json` before each commit so Git detects changed content.
* [src/dateGenerator.js](file:///c:/Git-Time-Machine/src/dateGenerator.js): Provides functions for generating random dates, custom year/month/day timestamps, batch date sorting, and strict ISO-8601 formatting.
* [src/gitManager.js](file:///c:/Git-Time-Machine/src/gitManager.js): Handles Git repo auto-initialization, dual author/committer date environment overrides, structured log retrieval, and safe remote pushing.
* [src/historyAnalyzer.js](file:///c:/Git-Time-Machine/src/historyAnalyzer.js): Analyzes commit log data, generates ANSI terminal contribution heatmaps, calculates metrics, and exports records to JSON/CSV.

---

## 🚀 Installation & Setup

1. **Prerequisites**: Ensure Node.js (v16+) and Git are installed on your machine.

2. **Clone / Navigate to directory**:
   ```bash
   cd git-time-machine
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

---

## 📖 Usage Examples

### 1. Interactive Menu Mode
Simply run the script with no parameters to launch the guided prompt menu:
```bash
node index.js
```

### 2. Command Line Interface (CLI)

#### Generate 20 Random Historical Commits
```bash
node index.js generate --count 20
```

#### Generate Commits Within a Specific Date Range
```bash
node index.js generate --count 50 --start 2023-01-01 --end 2023-12-31
```

#### Create a Single Commit on a Custom Date
```bash
node index.js commit --year 2022 --month 6 --day 15 --message "Historical landmark commit"
```

#### Display Terminal GitHub-Style Heatmap
```bash
node index.js heatmap
```

#### Analyze Commit History & Print Stats
```bash
node index.js analyze
```

#### Export Commit History to CSV or JSON
```bash
node index.js export --format csv
node index.js export --format json --out my_history.json
```

#### Push Commits to Remote Repository (Safety Checked)
```bash
node index.js push --remote origin --branch main
```

---

## 🛡 Safety & Error Handling

- **Automatic Repository Check**: Automatically verifies if the working directory is a Git repository before performing operations, initializing a safe local test repository if needed.
- **Remote Push Protection**: Prevents accidental push operations if no valid remote URL is configured in the local Git repository.
- **Date Format Validation**: Validates user inputs against standard ISO/Moment date specifications to avoid corrupted commit metadata.
- **Isolated File Mutations**: All automated commit modifications are isolated to `data.json`.

---

## 📄 License
ISC License. Educational utility for learning Git internals.
