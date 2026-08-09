import jsonfile from "jsonfile";
import chalk from "chalk";
import moment from "moment";
import fs from "fs/promises";
import { getCommitHistory } from "./gitManager.js";

/**
 * Reads Git commit log and analyzes metadata, statistics, and date breakdowns.
 * @param {Object} [options]
 * @param {number} [options.maxCount=500] - Max commits to analyze
 * @returns {Promise<Object>} Analyzed history object
 */
export async function analyzeHistory(options = {}) {
  const maxCount = options.maxCount || 500;
  const rawCommits = await getCommitHistory(maxCount);

  if (!rawCommits || rawCommits.length === 0) {
    return {
      totalCommits: 0,
      commits: [],
      dateCounts: {},
      stats: {
        total: 0,
        firstCommitDate: null,
        lastCommitDate: null,
        discrepanciesCount: 0
      }
    };
  }

  const dateCounts = {};
  let discrepanciesCount = 0;

  const commits = rawCommits.map(c => {
    const authorDateStr = c.authorDate;
    const committerDateStr = c.committerDate;

    // Standardize to YYYY-MM-DD for heatmap grouping
    const dateKey = moment(authorDateStr).format("YYYY-MM-DD");
    dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;

    const authorMoment = moment(authorDateStr);
    const committerMoment = moment(committerDateStr);

    if (Math.abs(authorMoment.diff(committerMoment, "seconds")) > 60) {
      discrepanciesCount++;
    }

    return {
      hash: c.hash,
      shortHash: c.hash ? c.hash.substring(0, 7) : "",
      authorName: c.authorName,
      authorEmail: c.authorEmail,
      authorDate: authorDateStr,
      committerDate: committerDateStr,
      dateKey,
      message: c.message
    };
  });

  const sortedDates = Object.keys(dateCounts).sort();
  const firstCommitDate = sortedDates[0] || null;
  const lastCommitDate = sortedDates[sortedDates.length - 1] || null;

  return {
    totalCommits: commits.length,
    commits,
    dateCounts,
    stats: {
      total: commits.length,
      activeDays: Object.keys(dateCounts).length,
      firstCommitDate,
      lastCommitDate,
      discrepanciesCount
    }
  };
}

/**
 * Renders a GitHub-style 52-week contribution heatmap matrix directly in the terminal using ANSI colors.
 * @param {Object} historyData - Result from analyzeHistory()
 */
export function renderHeatmap(historyData) {
  const dateCounts = historyData.dateCounts || {};
  console.log(chalk.bold.cyan("\n📊 GitHub-Style Terminal Contribution Heatmap\n"));

  const today = moment();
  const startDate = moment().subtract(52, "weeks").startOf("week"); // Start 52 weeks ago on Sunday/Monday

  // We build a 7 rows (days of week) x 52 columns (weeks) grid
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const grid = Array.from({ length: 7 }, () => []);

  let curr = startDate.clone();
  for (let w = 0; w < 52; w++) {
    for (let d = 0; d < 7; d++) {
      const dateStr = curr.format("YYYY-MM-DD");
      const count = dateCounts[dateStr] || 0;
      grid[d].push({ dateStr, count, isFuture: curr.isAfter(today) });
      curr.add(1, "day");
    }
  }

  // Print Heatmap Grid
  const getIntensityBlock = (count, isFuture) => {
    if (isFuture) return chalk.gray("  ");
    if (count === 0) return chalk.bgHex("#21262d").gray("░░");
    if (count <= 2) return chalk.bgHex("#0e4429").green("▄▄");
    if (count <= 5) return chalk.bgHex("#006d32").greenBright("██");
    if (count <= 9) return chalk.bgHex("#26a641").black("██");
    return chalk.bgHex("#39d353").black.bold("██");
  };

  daysOfWeek.forEach((dayName, rowIndex) => {
    // Only label Mon, Wed, Fri for clean UI spacing
    const label = (rowIndex === 1 || rowIndex === 3 || rowIndex === 5)
      ? chalk.gray(dayName.padEnd(4))
      : "    ";

    const rowBlocks = grid[rowIndex]
      .map(cell => getIntensityBlock(cell.count, cell.isFuture))
      .join("");

    console.log(`${label}${rowBlocks}`);
  });

  // Heatmap Legend & Summary
  console.log("\n" + chalk.gray("    Less ") +
    chalk.bgHex("#21262d").gray("░░") + " " +
    chalk.bgHex("#0e4429").green("▄▄") + " " +
    chalk.bgHex("#006d32").greenBright("██") + " " +
    chalk.bgHex("#26a641").black("██") + " " +
    chalk.bgHex("#39d353").black("██") +
    chalk.gray(" More\n")
  );

  console.log(chalk.bold(`📈 Commit Summary:`));
  console.log(` • Total Commits: ${chalk.green(historyData.totalCommits)}`);
  console.log(` • Active Days: ${chalk.green(historyData.stats.activeDays)}`);
  console.log(` • Date Range: ${chalk.cyan(historyData.stats.firstCommitDate || "N/A")} -> ${chalk.cyan(historyData.stats.lastCommitDate || "N/A")}\n`);
}

/**
 * Display structured commit history statistics and commit logs.
 * @param {Object} historyData 
 */
export function displayStats(historyData) {
  const { totalCommits, commits, stats } = historyData;

  console.log(chalk.bold.magenta("\n📜 Git Commit Metadata Analysis"));
  console.log(chalk.gray("=================================================="));
  console.log(`Total Commits Analyzed : ${chalk.yellow(totalCommits)}`);
  console.log(`Active Contribution Days : ${chalk.yellow(stats.activeDays)}`);
  console.log(`First Commit Date        : ${chalk.cyan(stats.firstCommitDate || "N/A")}`);
  console.log(`Latest Commit Date       : ${chalk.cyan(stats.lastCommitDate || "N/A")}`);
  console.log(`Author/Committer Offset  : ${chalk.yellow(stats.discrepanciesCount)} commit(s) with custom committer dates`);
  console.log(chalk.gray("==================================================\n"));

  if (commits.length > 0) {
    console.log(chalk.bold("Recent Commits (Author Date vs Commit Date):"));
    commits.slice(0, 10).forEach(c => {
      console.log(
        chalk.yellow(`[${c.shortHash}]`),
        chalk.white(c.message),
        `\n  ${chalk.gray("Author Date:")} ${chalk.green(c.authorDate)}`,
        `\n  ${chalk.gray("Commit Date:")} ${chalk.blue(c.committerDate)}`
      );
    });
    if (commits.length > 10) {
      console.log(chalk.gray(`...and ${commits.length - 10} more commits.`));
    }
    console.log();
  }
}

/**
 * Export analyzed commit history to JSON or CSV format.
 * @param {Object} historyData 
 * @param {"json"|"csv"} format 
 * @param {string} [outputPath] 
 */
export async function exportHistory(historyData, format = "json", outputPath) {
  const targetPath = outputPath || `history.${format}`;

  if (format.toLowerCase() === "json") {
    await jsonfile.writeFile(targetPath, historyData, { spaces: 2 });
    console.log(chalk.green(`✔ Exported ${historyData.totalCommits} commits to JSON file: ${targetPath}`));
  } else if (format.toLowerCase() === "csv") {
    const headers = ["Hash", "ShortHash", "AuthorName", "AuthorEmail", "AuthorDate", "CommitterDate", "Message"];
    const rows = historyData.commits.map(c => [
      `"${c.hash}"`,
      `"${c.shortHash}"`,
      `"${c.authorName || ""}"`,
      `"${c.authorEmail || ""}"`,
      `"${c.authorDate}"`,
      `"${c.committerDate}"`,
      `"${(c.message || "").replace(/"/g, '""')}"`
    ].join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    await fs.writeFile(targetPath, csvContent, "utf-8");
    console.log(chalk.green(`✔ Exported ${historyData.totalCommits} commits to CSV file: ${targetPath}`));
  } else {
    throw new Error(`Unsupported export format "${format}". Use "json" or "csv".`);
  }
}
