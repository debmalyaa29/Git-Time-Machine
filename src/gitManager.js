import simpleGit from "simple-git";
import chalk from "chalk";

const git = simpleGit();

/**
 * Ensures the working directory is an initialized Git repository.
 * Safe operation: checks status and initializes if not already a repo.
 */
export async function ensureGitRepo() {
  try {
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      console.log(chalk.yellow("ℹ Working directory is not a Git repository. Initializing test repository..."));
      await git.init();
      console.log(chalk.green("✔ Git repository initialized successfully."));
    }
  } catch (error) {
    console.error(chalk.red("✖ Failed to check/initialize Git repository:"), error.message);
    throw error;
  }
}

/**
 * Programmatically create a Git commit with custom Author Date and Committer Date.
 * 
 * Safety Notice: This function creates commits in your local Git repository.
 * 
 * @param {string} date - Timestamp for the commit (ISO string or formatted date)
 * @param {number|string} indexOrMessage - Identifier or custom message for the commit
 * @param {Object} [options]
 * @param {string} [options.file="./data.json"] - File path to stage before committing
 * @param {string} [options.committerDate] - Optional distinct committer date (defaults to date)
 * @param {string} [options.customMessage] - Optional override commit message
 * @returns {Promise<import('simple-git').CommitResult>}
 */
export async function createCommit(date, indexOrMessage, options = {}) {
  const filePath = options.file || "./data.json";
  const authorDate = date;
  const committerDate = options.committerDate || date;
  const commitMsg = options.customMessage || (typeof indexOrMessage === "number" ? `Timeline commit ${indexOrMessage}` : String(indexOrMessage));

  await ensureGitRepo();

  // Stage the file
  await git.add(filePath);

  // Configure environment variables so Git records both GIT_AUTHOR_DATE and GIT_COMMITTER_DATE
  const customGit = git.env({
    ...process.env,
    GIT_AUTHOR_DATE: authorDate,
    GIT_COMMITTER_DATE: committerDate
  });

  // Execute commit with --date flag for author date redundancy
  const result = await customGit.commit(commitMsg, {
    "--date": authorDate
  });

  return result;
}

/**
 * Fetch detailed Git history including author date and committer date metadata.
 * @param {number} [maxCount=100] - Maximum number of commits to retrieve
 * @returns {Promise<Array<{hash: string, authorName: string, authorEmail: string, authorDate: string, committerDate: string, message: string}>>}
 */
export async function getCommitHistory(maxCount = 100) {
  await ensureGitRepo();

  try {
    const log = await git.log({
      maxCount,
      format: {
        hash: "%H",
        authorName: "%an",
        authorEmail: "%ae",
        authorDate: "%aI",
        committerDate: "%cI",
        message: "%s"
      }
    });

    return log.all;
  } catch (error) {
    if (error.message && error.message.includes("does not have any commits yet")) {
      return [];
    }
    throw error;
  }
}

/**
 * Safely push local commits to a specified remote repository and branch.
 * Safety check: Verifies remote existence to prevent accidental pushes or auth errors.
 * 
 * @param {string} [remote="origin"] - Name of the Git remote
 * @param {string} [branch="main"] - Target branch name
 */
export async function pushCommits(remote = "origin", branch = "main") {
  await ensureGitRepo();

  try {
    const remotes = await git.getRemotes();
    const hasRemote = remotes.some(r => r.name === remote);

    if (!hasRemote) {
      throw new Error(`Remote "${remote}" is not configured in this Git repository. Please add a remote using 'git remote add ${remote} <url>' before pushing.`);
    }

    console.log(chalk.cyan(`🚀 Pushing commits to ${remote}/${branch}...`));
    await git.push(remote, branch);
    console.log(chalk.green(`✔ Successfully pushed commits to ${remote}/${branch}.`));
  } catch (error) {
    console.error(chalk.red("✖ Push operation failed:"), error.message);
    throw error;
  }
}