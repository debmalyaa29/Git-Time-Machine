import jsonfile from "jsonfile";
import chalk from "chalk";
import moment from "moment";
import { generateDate, generateRandomDate, generateDateBatch, isValidDate } from "./dateGenerator.js";
import { createCommit, ensureGitRepo, pushCommits } from "./gitManager.js";

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

/**
 * Automatically generates N commits per day for every day between startDate and endDate,
 * and automatically pushes them to GitHub remote when finished.
 * 
 * @param {Object} config
 * @param {string} config.startDate - Start date (YYYY-MM-DD)
 * @param {string} config.endDate - End date (YYYY-MM-DD)
 * @param {number} [config.commitsPerDay=1] - Number of commits per day
 * @param {boolean} [config.autoPush=true] - Automatically push to GitHub after completion
 * @param {string} [config.remote="origin"] - Remote name
 * @param {string} [config.branch="main"] - Branch name
 * @returns {Promise<{totalCommits: number, totalDays: number}>}
 */
export async function generateDailyCommitsRange({
  startDate,
  endDate,
  commitsPerDay = 1,
  autoPush = true,
  remote = "origin",
  branch = "main"
}) {
  if (!startDate || !endDate) {
    throw new Error("Both startDate and endDate are required (format YYYY-MM-DD).");
  }

  const start = moment(startDate);
  const end = moment(endDate);

  if (!start.isValid() || !end.isValid()) {
    throw new Error("Invalid start or end date provided.");
  }

  if (start.isAfter(end)) {
    throw new Error("Start date cannot be after end date.");
  }

  const perDay = parseInt(commitsPerDay, 10);
  if (isNaN(perDay) || perDay <= 0) {
    throw new Error("commitsPerDay must be a positive integer.");
  }

  await ensureGitRepo();

  const totalDays = end.diff(start, "days") + 1;
  const totalCommits = totalDays * perDay;

  console.log(chalk.bold.cyan(`\n🚀 Generating ${totalCommits} commits across ${totalDays} days (${perDay} commit(s) per day)`));
  console.log(chalk.gray(`📅 Range: ${start.format("YYYY-MM-DD")} to ${end.format("YYYY-MM-DD")}\n`));

  let commitCounter = 0;
  const curr = start.clone();

  while (curr.isSameOrBefore(end, "day")) {
    const dayStr = curr.format("YYYY-MM-DD");

    for (let c = 1; c <= perDay; c++) {
      commitCounter++;
      // Distribute commits throughout the day between 08:00 and 19:00 UTC
      const startHour = 8;
      const hourOffset = Math.floor((11 / Math.max(perDay, 1)) * (c - 1));
      const minuteOffset = (c * 7) % 59;

      const timestamp = curr.clone().hour(startHour + hourOffset).minute(minuteOffset).second(10).toISOString();
      const message = `Auto commit on ${dayStr} [${c}/${perDay}]`;

      const data = {
        commitIndex: commitCounter,
        totalCommits,
        date: dayStr,
        timestamp,
        project: "Git Time Machine"
      };

      await jsonfile.writeFile(DEFAULT_FILE, data, { spaces: 2 });

      await createCommit(timestamp, commitCounter, {
        file: DEFAULT_FILE,
        customMessage: message,
        committerDate: timestamp
      });

      console.log(
        chalk.green(`  [${commitCounter}/${totalCommits}]`),
        chalk.white(`${dayStr}`),
        chalk.gray(`-> ${message}`)
      );
    }

    curr.add(1, "day");
  }

  console.log(chalk.bold.green(`\n✔ Completed ${totalCommits} commits locally!`));

  if (autoPush) {
    console.log(chalk.cyan(`\n📤 Automatically pushing all commits to ${remote}/${branch}...`));
    await pushCommits(remote, branch);
  }

  return { totalCommits, totalDays };
}