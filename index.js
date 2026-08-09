import readline from "readline";
import chalk from "chalk";
import { generateCommits, generateSingleCommit, generateDailyCommitsRange } from "./src/commitGenerator.js";
import { generateCustomDate } from "./src/dateGenerator.js";
import { analyzeHistory, renderHeatmap, displayStats, exportHistory } from "./src/historyAnalyzer.js";
import { pushCommits, ensureGitRepo } from "./src/gitManager.js";

/**
 * Main entry point for Git Time Machine CLI application.
 */
async function main() {
  const args = process.argv.slice(2);

  // If arguments are provided, parse CLI commands directly
  if (args.length > 0) {
    await handleCLIArgs(args);
    return;
  }

  // Fallback to interactive mode if no arguments are passed
  await runInteractiveMenu();
}

/**
 * Parses and executes command-line arguments.
 * @param {string[]} args 
 */
async function handleCLIArgs(args) {
  const command = args[0].toLowerCase();
  const getArgValue = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
  };

  try {
    await ensureGitRepo();

    switch (command) {
      case "range":
      case "daily": {
        const startDate = getArgValue("--start") || getArgValue("-s");
        const endDate = getArgValue("--end") || getArgValue("-e");
        const commitsPerDay = parseInt(getArgValue("--per-day") || getArgValue("-p") || "1", 10);
        const autoPush = !args.includes("--no-push");
        const remote = getArgValue("--remote") || "origin";
        const branch = getArgValue("--branch") || "main";

        if (!startDate || !endDate) {
          console.error(chalk.red("\n✖ Error: Both --start <YYYY-MM-DD> and --end <YYYY-MM-DD> are required."));
          console.log(chalk.gray("Example: node index.js range --start 2025-05-20 --end 2025-05-30 --per-day 5\n"));
          process.exit(1);
        }

        await generateDailyCommitsRange({
          startDate,
          endDate,
          commitsPerDay,
          autoPush,
          remote,
          branch
        });
        break;
      }

      case "generate": {
        const count = parseInt(getArgValue("--count") || getArgValue("-n") || "10", 10);
        const startDate = getArgValue("--start");
        const endDate = getArgValue("--end");
        const syncCommitter = !args.includes("--separate-committer-date");

        await generateCommits(count, {
          startDate,
          endDate,
          syncCommitterDate: syncCommitter
        });
        break;
      }

      case "commit": {
        const dateStr = getArgValue("--date");
        const msg = getArgValue("--message") || getArgValue("-m") || "Custom timestamp commit";

        let dateToUse = dateStr;
        if (!dateToUse) {
          const year = parseInt(getArgValue("--year") || "2023", 10);
          const month = parseInt(getArgValue("--month") || "1", 10);
          const day = parseInt(getArgValue("--day") || "1", 10);
          dateToUse = generateCustomDate({ year, month, day });
        }

        await generateSingleCommit(dateToUse, msg);
        break;
      }

      case "analyze": {
        const historyData = await analyzeHistory();
        displayStats(historyData);
        break;
      }

      case "heatmap": {
        const historyData = await analyzeHistory();
        renderHeatmap(historyData);
        break;
      }

      case "export": {
        const format = (getArgValue("--format") || "json").toLowerCase();
        const output = getArgValue("--out");
        const historyData = await analyzeHistory();
        await exportHistory(historyData, format, output);
        break;
      }

      case "push": {
        const remote = getArgValue("--remote") || "origin";
        const branch = getArgValue("--branch") || "main";
        await pushCommits(remote, branch);
        break;
      }

      case "help":
      case "--help":
      case "-h":
      default:
        printHelp();
        break;
    }
  } catch (error) {
    console.error(chalk.red("\n✖ Error:"), error.message);
    process.exit(1);
  }
}

/**
 * Interactive menu mode for easy prompt-based exploration.
 */
async function runInteractiveMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log(chalk.bold.cyan("\n=============================================="));
  console.log(chalk.bold.green("  ⏳ GIT TIME MACHINE - Learning Tool"));
  console.log(chalk.gray("  Explore Git Commit Metadata & Timestamp Internals"));
  console.log(chalk.bold.cyan("==============================================\n"));

  console.log("Please select an option:");
  console.log(chalk.green("1.") + " Generate Daily Commits for Date Range & Auto-Push 🚀");
  console.log(chalk.green("2.") + " Generate Random Batch Commits");
  console.log(chalk.green("3.") + " Create Single Commit with Custom Date");
  console.log(chalk.green("4.") + " View Git Commit Metadata Stats");
  console.log(chalk.green("5.") + " Display Terminal Contribution Heatmap");
  console.log(chalk.green("6.") + " Export Commit History (JSON / CSV)");
  console.log(chalk.green("7.") + " Push Commits to Remote (Safety Checked)");
  console.log(chalk.red("8.") + " Exit\n");

  const choice = (await ask(chalk.bold.yellow("Select option (1-8): "))).trim();

  try {
    await ensureGitRepo();

    switch (choice) {
      case "1": {
        const startDate = await ask("Start Date (YYYY-MM-DD, e.g. 2025-05-20): ");
        const endDate = await ask("End Date (YYYY-MM-DD, e.g. 2025-05-30): ");
        const perDayStr = await ask("Commits per day (default 1): ");
        const commitsPerDay = parseInt(perDayStr || "1", 10);
        const autoPushStr = await ask("Automatically push to GitHub when complete? (y/n, default y): ");
        const autoPush = autoPushStr.toLowerCase() !== "n";

        await generateDailyCommitsRange({
          startDate: startDate.trim(),
          endDate: endDate.trim(),
          commitsPerDay,
          autoPush
        });
        break;
      }

      case "2": {
        const countStr = await ask("Enter number of commits to generate (default 10): ");
        const count = parseInt(countStr || "10", 10);
        const startDate = await ask("Start Date YYYY-MM-DD (leave empty for 1 year ago): ");
        const endDate = await ask("End Date YYYY-MM-DD (leave empty for today): ");

        await generateCommits(count, {
          startDate: startDate.trim() || undefined,
          endDate: endDate.trim() || undefined
        });
        break;
      }

      case "3": {
        const dateInput = await ask("Enter Date (YYYY-MM-DD or ISO timestamp): ");
        const message = await ask("Enter Commit Message: ");
        await generateSingleCommit(dateInput.trim(), message.trim() || undefined);
        break;
      }

      case "4": {
        const historyData = await analyzeHistory();
        displayStats(historyData);
        break;
      }

      case "5": {
        const historyData = await analyzeHistory();
        renderHeatmap(historyData);
        break;
      }

      case "6": {
        const format = await ask("Format (json / csv, default json): ");
        const historyData = await analyzeHistory();
        await exportHistory(historyData, (format.trim() || "json").toLowerCase());
        break;
      }

      case "7": {
        const remote = await ask("Remote name (default origin): ");
        const branch = await ask("Branch name (default main): ");
        await pushCommits((remote.trim() || "origin"), (branch.trim() || "main"));
        break;
      }

      case "8":
      default:
        console.log(chalk.cyan("\nGoodbye! Happy learning with Git Time Machine.\n"));
        break;
    }
  } catch (err) {
    console.error(chalk.red("\n✖ Error:"), err.message);
  } finally {
    rl.close();
  }
}

/**
 * Print CLI command help overview.
 */
function printHelp() {
  console.log(`
${chalk.bold.cyan("Git Time Machine - Command Line Help")}

${chalk.bold("Usage:")} node index.js <command> [options]

${chalk.bold("Commands:")}
  ${chalk.green("range")}     Generate N commits/day across a date range and auto-push
             ${chalk.gray("Options: --start <YYYY-MM-DD> --end <YYYY-MM-DD> --per-day <number> [--no-push]")}

  ${chalk.green("generate")}  Generate multiple historical commits randomly or in range
             ${chalk.gray("Options: --count <number> --start <YYYY-MM-DD> --end <YYYY-MM-DD>")}

  ${chalk.green("commit")}    Create a single commit with custom date
             ${chalk.gray("Options: --date <ISO/YYYY-MM-DD> --message <text>")}

  ${chalk.green("analyze")}   View commit history statistics and metadata overview

  ${chalk.green("heatmap")}   Display 52-week GitHub-style contribution heatmap in terminal

  ${chalk.green("export")}    Export commit logs to JSON or CSV
             ${chalk.gray("Options: --format <json|csv> --out <filename>")}

  ${chalk.green("push")}      Push commits to remote (safety verified)
             ${chalk.gray("Options: --remote <origin> --branch <main>")}

${chalk.bold("Examples:")}
  node index.js range --start 2025-05-20 --end 2025-05-30 --per-day 5
  node index.js generate --count 20
  node index.js commit --year 2022 --month 6 --day 15 --message "Historical commit"
  node index.js heatmap
  node index.js export --format csv
  `);
}

main();