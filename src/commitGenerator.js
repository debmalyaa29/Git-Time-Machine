import jsonfile from "jsonfile";
import chalk from "chalk";
import { generateDate, generateRandomDate, generateDateBatch, isValidDate } from "./dateGenerator.js";
import { createCommit, ensureGitRepo } from "./gitManager.js";

const DEFAULT_FILE = "./data.json";

/**
 * Generate multiple commits automatically with custom/historical dates.
 * 
 * @param {number} number - Number of commits to generate
 * @param {Object} [options]
 * @param {string} [options.startDate] - Start date range
 * @param {string} [options.endDate] - End date range
 * @param {boolean} [options.syncCommitterDate=true] - If true, sets committer date equal to author date
 * @param {string} [options.file="./data.json"] - Metadata file path to modify
 * @param {string} [options.messagePattern] - Optional custom message prefix
 * @returns {Promise<Array<{commitNumber: number, timestamp: string, hash?: string}>>}
 */
export async function generateCommits(number, options = {}) {
  const commitCount = parseInt(number, 10);
  if (isNaN(commitCount) || commitCount <= 0) {
    throw new Error("Commit count must be a positive integer.");
  }

  const filePath = options.file || DEFAULT_FILE;
  const syncCommitterDate = options.syncCommitterDate !== false;
  const startDate = options.startDate;
  const endDate = options.endDate;

  await ensureGitRepo();

  console.log(chalk.cyan(`\n⚡ Generating ${commitCount} Git commits...`));
  if (startDate && endDate) {
    console.log(chalk.gray(`📅 Date Range: ${startDate} to ${endDate}`));
  } else {
    console.log(chalk.gray(`📅 Date Range: Random dates within the past year`));
  }

  // Pre-generate sorted dates for batch
  const dates = startDate && endDate
    ? generateDateBatch(commitCount, { startDate, endDate, sort: true })
    : Array.from({ length: commitCount }, () => generateDate()).sort((a, b) => new Date(a) - new Date(b));

  const results = [];

  for (let i = 1; i <= commitCount; i++) {
    const timestamp = dates[i - 1];

    const data = {
      commitNumber: i,
      totalCommits: commitCount,
      timestamp,
      generatedAt: new Date().toISOString(),
      project: "Git Time Machine"
    };

    // Update metadata file so Git registers a file change
    await jsonfile.writeFile(filePath, data, { spaces: 2 });

    const message = options.messagePattern
      ? `${options.messagePattern} #${i}`
      : `Timeline commit ${i}/${commitCount}`;

    const commitResult = await createCommit(timestamp, i, {
      file: filePath,
      customMessage: message,
      committerDate: syncCommitterDate ? timestamp : undefined
    });

    results.push({
      commitNumber: i,
      timestamp,
      hash: commitResult.commit || "created"
    });

    console.log(
      chalk.green(`  [${i}/${commitCount}]`),
      chalk.white(`Commit: ${timestamp}`),
      chalk.gray(`-> ${message}`)
    );
  }

  console.log(chalk.bold.green(`\n✔ Successfully generated ${commitCount} commits!\n`));
  return results;
}

/**
 * Generate a single commit with a specific custom date and message.
 * 
 * @param {string} customDate - Valid date string or ISO timestamp
 * @param {string} [message="Custom historical commit"] - Commit message
 * @param {Object} [options]
 * @returns {Promise<{timestamp: string, message: string}>}
 */
export async function generateSingleCommit(customDate, message = "Custom historical commit", options = {}) {
  if (!isValidDate(customDate)) {
    throw new Error(`Invalid date format provided: "${customDate}". Please use ISO 8601 or YYYY-MM-DD format.`);
  }

  const filePath = options.file || DEFAULT_FILE;
  await ensureGitRepo();

  const data = {
    type: "single",
    timestamp: customDate,
    message,
    updatedAt: new Date().toISOString()
  };

  await jsonfile.writeFile(filePath, data, { spaces: 2 });

  await createCommit(customDate, message, {
    file: filePath,
    customMessage: message,
    committerDate: options.syncCommitterDate !== false ? customDate : options.committerDate
  });

  console.log(chalk.green(`✔ Single commit created for date: ${customDate}`));
  return { timestamp: customDate, message };
}