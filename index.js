require("dotenv").config();
const axios = require("axios");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const Web3 = require("web3");

// Ethereum addresses to monitor
const addresses = process.env.ADDRESSES.split(",");

// Store last processed block number for each address
const lastProcessedBlocks = {};

// Function to fetch transactions from Etherscan API
async function getTransactions(address, startBlock = 0) {
  const apiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=${startBlock}&sort=desc`;

  try {
    const response = await axios.get(apiUrl);
    return response.data.result;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

// Function to filter transactions by function names
async function filterTransactionsByFunctionNames(transactions, functionNames) {
  const filteredTransactions = transactions.filter((transaction) => {
    if (!functionNames || functionNames.length === 0) {
      return true; // Return true for all transactions if no function names provided
    }

    if (functionNames.includes("transfer")) {
      if (!transaction.functionName) {
        return true; // If "transfer" is provided, include transactions with empty input (functionNames oder name)
      }
    }

    for (const functionName of functionNames) {
      const functionNameRegex = new RegExp(`^${functionName}\\(`);
      if (functionNameRegex.test(transaction.functionName)) {
        return true; // If the transaction matches any of the provided function names, return true
      }
    }
    return false;
  });

  return filteredTransactions;
}

// Main function
async function main() {
  console.log("Starting main function...");
  let functionNames = process.env.FUNCTION_NAMES.split(",");
  const showAll = functionNames.includes("all");

  // If "all" is included, empty the function names array
  if (showAll) {
    functionNames = [];
  }

  // Fetch transactions for Ethereum addresses from the last processed block
  for (const address of addresses) {
    let lastProcessedBlock = lastProcessedBlocks[address] || 0;

    const transactions = await getTransactions(address, lastProcessedBlock);

    // Filter out transactions that have already been processed
    const newTransactions = transactions.filter((transaction) => {
      return transaction.blockNumber > lastProcessedBlock;
    });

    // Filter transactions by function names
    const filteredTransactions = await filterTransactionsByFunctionNames(
      newTransactions,
      functionNames
    );

    // Update the last processed block to the latest block
    if (filteredTransactions.length > 0) {
      lastProcessedBlocks[address] = filteredTransactions[0].blockNumber;
    }
  }
}

// Run the main function immediately
main();

// Schedule the script to run hourly
cron.schedule("0 * * * *", async () => {
  console.log("Running script every hour...");
  await main();
});

// Log when the script starts
console.log("Script scheduled to run hourly.");
