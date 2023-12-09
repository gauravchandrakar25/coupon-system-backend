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
  uri: string
) {
  const senderAccount = web3.eth.accounts.privateKeyToAccount(privateKey);
  const nonce = await web3.eth.getTransactionCount(senderAccount.address);
  const gasPrice = await web3.eth.getGasPrice();
  const mintFunctionData = tokenContract.methods
    .mint(to, id, amount, expirationTime, uri)
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
