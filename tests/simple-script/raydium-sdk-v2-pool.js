const { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, createMintToInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');
const { Liquidity, jsonInfo2PoolKeys, Token, TokenAmount, Percent, Currency } = require('@raydium-io/raydium-sdk');
const BN = require('bn.js');

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

const getWallet = () => {
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(require('os').homedir() + '/.config/solana/id.json')));
  return Keypair.fromSecretKey(secretKey);
};

async function setupTokens() {
  const wallet = getWallet();
  
  const baseToken = {
    mint: new PublicKey('9ATnKRbaZ45XKXBicw7CB9pWWAfStQWMAdW7VYyMXi22'),
    programId: TOKEN_2022_PROGRAM_ID,
    decimals: 9
  };
  
  const quoteToken = {
    mint: new PublicKey('So11111111111111111111111111111111111111112'),
    programId: TOKEN_PROGRAM_ID,
    decimals: 9
  };
  
  const isToken2022 = baseToken.programId.toString() === TOKEN_2022_PROGRAM_ID.toString();
  console.log(`Sử dụng token: ${baseToken.mint.toString()} (${isToken2022 ? 'Token-2022' : 'SPL Token'}) với ${baseToken.decimals} decimals`);
  
  return { baseToken, quoteToken, isToken2022 };
}