require("dotenv").config();
const axios = require("axios");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const Web3 = require("web3");

// Ethereum addresses to monitor
const addresses = process.env.ADDRESSES.split(",");

// Preconfigured email recipients
const recipients = process.env.RECIPIENTS.split(",");

// Initialize Web3 with your Ethereum node URL or Infura endpoint
const web3 = new Web3(process.env.YOUR_WEB3_PROVIDER_URL);

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
        return true; // If "transfer" is provided, include transactions with empty input
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

// Function to check if an address is a smart contract
async function isSmartContract(address) {
  try {
    // Retrieve the bytecode at the address
    const bytecode = await web3.eth.getCode(address);

    // Check if the bytecode is not empty
    return bytecode !== "0x";
  } catch (error) {
    console.error("Error checking smart contract:", error.message);
    return false;
  }
}

// Function to retrieve validator indices from beaconcha.in API
async function getValidator(address, transaction) {
  try {
    const validatorResponse = await axios.get(
      `https://beaconcha.in/api/v1/validator/eth1/${address}`
    );

    if (validatorResponse.data.data.length > 0) {
      for (const validator of validatorResponse.data.data) {
        const depositsResponse = await axios.get(
          `https://beaconcha.in/api/v1/validator/${validator.publickey}/deposits`
        );

        if (
          depositsResponse.data.data.length > 0 &&
          depositsResponse.data.data[0].tx_hash === transaction.hash
        ) {
          console.log(
            `Transaction: ${transaction.hash} and txHash: ${depositsResponse.data.data[0].tx_hash}`
          );
          return validator;
        }
      }
      console.log("No matching transaction found for any validator.");
      return null;
    }

    console.log("No validator found for the given address.");
    return null;
  } catch (error) {
    console.error("Error fetching validator data:", error.message);
    return null;
  }
}

async function sendEmail(transaction, addressType, address, validator = null) {
  try {
    // Create a SMTP transporter for MailHog
    const transporter = nodemailer.createTransport({
      host: "localhost",
      port: 1025,
      ignoreTLS: true,
    });

    // Construct email message with address type and validator indices
    let text = `
      Interesting Address: ${address}
      Type of Address: ${validator ? "validator" : addressType}
      Block Number: ${transaction.blockNumber}
      Transaction Hash: ${transaction.hash}
      Type of Event/Transaction: ${
        transaction.functionName
          ? transaction.functionName.match(/^([^(]+)/)[1]?.trim()
          : "transfer"
      }
    `;

    if (validator) {
      text += `\n\tValidator Index: ${
        validator.validatorindex ? validator.validatorindex : "pending"
      }  Public Key: ${validator.publickey}`;
    }

    const message = {
      from: "your_email@example.com",
      to: recipients.join(","),
      subject: "New Ethereum Transaction Alert",
      text: text,
    };

    // Send email
    await transporter.sendMail(message);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error.message);
  }
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

    // Iterate over each transaction
    for (const transaction of filteredTransactions) {
      // Determine if the transaction address belongs to a smart contract
      const isContract = await isSmartContract(address);

      // Determine if the address is a validator
      const validator = isContract
        ? []
        : await getValidator(address, transaction);

      // Send email alert for the transaction with address type and validator status
      await sendEmail(
        transaction,
        `${isContract ? "smart contract" : "normal"}`,
        address,
        validator
      );
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
