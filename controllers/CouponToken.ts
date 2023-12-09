require("dotenv").config();
const ipfsAPI = require("ipfs-api");
import { Response } from "express";

const INFURA_ID = process.env.INFURA_ID;
const INFURA_SECRET_KEY = process.env.INFURA_SECRET_KEY;

const auth =
  "Basic " +
  Buffer.from(INFURA_ID + ":" + INFURA_SECRET_KEY).toString("base64");

const { Web3 } = require("web3");

const { ethers, Contract } = require("ethers");

const { rpcUrl, CouponTokenContractAddress } = require("../config/config");

const abi = require("../abis/couponToken.json");
const provider = new ethers.JsonRpcProvider(rpcUrl);
const httpProvider = new Web3.providers.HttpProvider(rpcUrl);
const privateKey = `0x${process.env.PRIVATE_KEY_COUPON_TOKEN}`;
const wallet = new ethers.Wallet(
  process.env.PRIVATE_KEY_COUPON_TOKEN,
  provider
);
const erc1155Contract = new ethers.Contract(
  CouponTokenContractAddress,
  abi,
  wallet
);
const web3 = new Web3(httpProvider);
const tokenContractAddress = CouponTokenContractAddress;

const baseUrl =
  process.env.IS_MAINNET == "false"
    ? process.env.MUMBAI_TESTNET_EXPLORER
    : process.env.MUMBAI_MAINNET_EXPLORER;

const tokenContract = new web3.eth.Contract(abi, tokenContractAddress);

async function mintToken(
  to: string,
  id: number,
  amount: number,
  expirationTime: number,
  uri: string,
  uniqueCode: any
) {
  const senderAccount = web3.eth.accounts.privateKeyToAccount(privateKey);
  const nonce = await web3.eth.getTransactionCount(senderAccount.address);
  const gasPrice = await web3.eth.getGasPrice();
  const mintFunctionData = tokenContract.methods
    .mint(to, id, amount, expirationTime, uniqueCode, uri)
    .encodeABI();

  const tx = {
    to: tokenContractAddress,
    gas: 200000,
    gasPrice: gasPrice,
    data: mintFunctionData,
    nonce: nonce,
  };

  const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
  const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
  const transactionHash = receipt.transactionHash;
  const transactionLink = `${baseUrl}${transactionHash}`;
  return { transactionLink, receipt };
}

const ipfs = ipfsAPI({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
  headers: {
    authorization: auth,
  },
});

const uploadImageToIPFS = async (imageBuffer: string) => {
  try {
    const ipfsResponse = await ipfs.add(imageBuffer);
    const imageHash = ipfsResponse[0].hash;
    return imageHash;
  } catch (error) {
    console.error(error);
    throw new Error("IPFS upload failed");
  }
};

// Function for uploading JSON string to IPFS
const uploadDataToIPFS = async (dataString: string) => {
  try {
    const dataBuffer = Buffer.from(dataString); // Convert the JSON string to a buffer
    const ipfsResponse = await ipfs.add(dataBuffer);
    const dataHash = ipfsResponse[0].hash;
    return dataHash;
  } catch (error) {
    console.error(error);
    throw new Error("IPFS upload failed");
  }
};

function epochToJsDate(tokenValidity: any) {
  // Replace epochTimeMillis with your epoch time in milliseconds
  const epochTimeMillis = Number(tokenValidity) * 1000;
  const date = new Date(epochTimeMillis);

  // Use the Date object's methods to extract the various components of the date and time
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // Months are zero-indexed, so add 1
  const day = date.getDate();
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  // Determine if it's AM or PM
  const amOrPm = hours >= 12 ? "PM" : "AM";

  // Convert 24-hour time to 12-hour time
  if (hours > 12) {
    hours -= 12;
  }

  // Format the components as needed (e.g., adding leading zeros)
  const formattedDate = `${year}-${String(month).padStart(2, "0")}-${String(
    day
  ).padStart(2, "0")}`;
  const formattedTime = `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Combine date, time, AM/PM, and time zone
  const formattedDateTime = `${formattedDate} ${formattedTime} ${amOrPm}`;
  return formattedDateTime;
}

exports.ImageToIPFS = async (req: any, res: Response) => {
  try {
    // const imageBuffer = req?.file?.buffer;
    const name = req.body.tokenname;
    const tokenValidity = req.body.expirationTime;
    const url = req.body.websiteUrl;
    const tokenId = Number(req.body.tokenId);
    const amount = Number(req.body.utilityTokenQuantity);
    const brand_name = req.body.brand_name;
    const coupon_code = req.body.coupon_code;

    const validity = Number(tokenValidity)
      ? epochToJsDate(tokenValidity)
      : "Lifetime";

    if (Number.isNaN(tokenId)) {
      return res.status(400).json({
        success: false,
        message: "Bad Request - Invalid input data",
        error: "Token ID must be a valid integer",
      });
    }

    if (Number.isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Bad Request - Invalid input data",
        error: "amount must be a valid integer",
      });
    }

    if (Number.isNaN(validity)) {
      return res.status(400).json({
        success: false,
        message: "Bad Request - Invalid input data",
        error: "validity ID must be a valid integer",
      });
    }
    const attributes = [
      {
        trait_type: "Validity",
        value: validity,
      },
      {
        trait_type: "Brand Name",
        value: brand_name,
      },
      {
        trait_type: "Coupon Code",
        value: coupon_code,
      },
    ];

    // if (!imageBuffer) {
    //   return res.status(400).json({ error: "No image provided" });
    // }

    let balance;
    try {
      balance = await erc1155Contract.balanceOf(
        CouponTokenContractAddress,
        tokenId
      );
    } catch (error) {
      console.log("Error getting the balance");
      throw error;
    }
    if (balance > 0) {
      throw new Error(
        `Token with tokenId ${tokenId} already exists for address ${CouponTokenContractAddress}`
      );
    }
    // let image;
    // try {
    //   image = await uploadImageToIPFS(imageBuffer);
    // } catch (error) {
    //   console.log("Error in uploading the image to IPFS");
    //   throw error;
    // }
    const data = {
      name: name,
      //   image: `ipfs://${image}/`,
      expirationTime: tokenValidity,
      url: url,
      tokenId: tokenId,
      quantity: amount,
      attributes: attributes,
    };

    // send object data to ipfs
    const dataString = JSON.stringify(data);

    // let objHash;
    // try {
    //   objHash = await uploadDataToIPFS(dataString);
    // } catch (error) {
    //   console.log("Error in uploading the data to IPFS");
    //   throw error;
    // }
    // const uri = `ipfs://${objHash}/`;

    let transactionLink;
    try {
      const result = await mintToken(
        CouponTokenContractAddress,
        1,
        498,
        1708757487,
        "745775",
        "75756775"
      );
      transactionLink = result.transactionLink;
    } catch (error) {
      console.error("Error in minting token: ", error);
      throw error;
    }
    const utilityTransactionHash = transactionLink;

    return res.json({
      MetaDataHash: "",
      utilityMintedToken: utilityTransactionHash,
      tokenId,
    });
  } catch (error: any) {
    console.error(error);
    return res
      .status(500)
      .json({ error: `Internal server error`, message: error.message });
  }
};
