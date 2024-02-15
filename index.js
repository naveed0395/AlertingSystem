require("dotenv").config();
const axios = require("axios");

// Function to fetch transactions from Etherscan API
async function getTransactions(address, startBlock = 0) {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  const apiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=${startBlock}&sort=desc&apikey=${apiKey}`;

  try {
    const response = await axios.get(apiUrl);
    return response.data.result;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

getTransactions("0x3295049ca88E54d3cD7B3B2c87267f41D153e1C7");
