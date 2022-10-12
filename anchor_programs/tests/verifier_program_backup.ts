import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { VerifierProgram } from "../target/types/verifier_program";
import { AttackerProgram } from "../target/types/attacker_program";
const { SystemProgram } = require('@solana/web3.js');
import { MerkleTreeProgram } from "../target/types/merkle_tree_program";
import { findProgramAddress } from "@project-serum/anchor/dist/cjs/utils/pubkey";
const solana = require("@solana/web3.js");
const {U64, I64} = require('n64');
import nacl from "tweetnacl";
import { BigNumber, providers } from 'ethers'
const light = require('../light-protocol-sdk');
import _ from "lodash";
import { assert, expect } from "chai";
const token = require('@solana/spl-token')
let circomlibjs = require("circomlibjs")
import {
  shieldedTransaction,
  createEncryptionKeypair
} from "./utils/shielded_tx";
import {
  checkEscrowAccountCreated,
  checkVerifierStateAccountCreated,
  checkFinalExponentiationSuccess,
  checkLastTxSuccess,
  checkMerkleTreeUpdateStateCreated,
  checkMerkleTreeBatchUpdateSuccess,
  checkRentExemption,
  assert_eq
} from "./utils/test_checks";

import {
  read_and_parse_instruction_data_bytes,
  parse_instruction_data_bytes,
  readAndParseAccountDataMerkleTreeTmpState,
  getPdaAddresses,
  unpackLeavesAccount,
} from "./utils/unpack_accounts"
import {
  deposit,
  transact,
  executeXComputeTransactions,
  executeUpdateMerkleTreeTransactions,
  newAccountWithLamports,
  newProgramOwnedAccount,
  newAddressWithLamports,
  newAccountWithTokens,
  executeMerkleTreeUpdateTransactions,
  createVerifierState
} from "./utils/test_transactions";

const {
  amount,
  encryptionKeypair,
  externalAmountBigNumber,
  publicKey,
  inputUtxoAmount,
  outputUtxoAmount,
  relayerFee,
  testInputUtxo,
  testOutputUtxo
} = require ('./utils/testUtxos');

import {
  MERKLE_TREE_KEY,
  DEFAULT_PROGRAMS,
  ADMIN_AUTH_KEYPAIR,
  ADMIN_AUTH_KEY,
  MERKLE_TREE_SIZE,
  MERKLE_TREE_KP,
  MERKLE_TREE_SIGNER_AUTHORITY,
  PRIVATE_KEY,
  FIELD_SIZE,
  MINT_PRIVATE_KEY,
  MINT
  } from "./utils/constants";


var IX_DATA;
var SIGNER;
var UNREGISTERED_MERKLE_TREE;
var UNREGISTERED_MERKLE_TREE_PDA_TOKEN;
var UNREGISTERED_PRE_INSERTED_LEAVES_INDEX;
var UTXOS;
var MERKLE_TREE_OLD;

var MERKLE_TREE_USDC = 0
var MERKLE_TREE_PDA_TOKEN_USDC = 0
var PRE_INSERTED_LEAVES_INDEX_USDC
var RENT_ESCROW
var RENT_VERIFIER
var RENT_TOKEN_ACCOUNT
import {toBufferLE} from 'bigint-buffer';

describe("verifier_program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.AnchorProvider.local();//anchor.getProvider();
  const connection = provider.connection;
  const verifierProgram = anchor.workspace.VerifierProgram as Program<VerifierProgram>;
  const merkleTreeProgram = anchor.workspace.MerkleTreeProgram as Program<MerkleTreeProgram>;
  const attackerProgram = anchor.workspace.AttackerProgram as Program<AttackerProgram>;
  console.log(solana.PublicKey);




  it("Initialize Merkle Tree with unauthorized signer", async () => {
      let signer = await newAccountWithLamports(
        provider.connection
      )
      await provider.connection.requestAirdrop(signer.publicKey, 1_000_000_000_000)


      try {
        const tx = await merkleTreeProgram.methods.initializeNewMerkleTreeSol().accounts({
          authority: signer.publicKey,
          merkleTree: MERKLE_TREE_KEY,
          preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
          merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
          ...DEFAULT_PROGRAMS
        })
        .preInstructions([
          SystemProgram.createAccount({
            fromPubkey: signer.publicKey,
            newAccountPubkey: MERKLE_TREE_KEY,
            space: MERKLE_TREE_SIZE,
            lamports: await provider.connection.getMinimumBalanceForRentExemption(MERKLE_TREE_SIZE),
            programId: merkleTreeProgram.programId,
          })
        ])
        .signers([signer, MERKLE_TREE_KP])
        .rpc();

      } catch(e) {
        assert(e.error.errorCode.code == 'ConstraintAddress')
        assert(e.error.origin == 'authority')
      }


      });
  it("Deposit Proof", async () => {
    let MERKLE_TREE_PDA_TOKEN_USDC = new anchor.web3.Account().publicKey
    let MERKLE_TREE_USDC  = new anchor.web3.Account().publicKey

    let RELAYER = new anchor.web3.Account()
    let ASSET = new anchor.BN(RELAYER.publicKey._bn.toString()).mod(FIELD_SIZE);
    let ASSET_1 = new anchor.BN(new anchor.web3.Account().publicKey._bn.toString()).mod(FIELD_SIZE);

    let FEE_ASSET = new anchor.BN(anchor.web3.SystemProgram.programId._bn.toString()).mod(FIELD_SIZE)
    let RELAYER_FEE = U64(10_000);
    let AMOUNT = 1_000_000

    let ENCRYPTION_KEYPAIR = createEncryptionKeypair()
    let depositAmount = 1_000_000_000
    let depositFeeAmount = 1_000_000
    let poseidon = await circomlibjs.buildPoseidonOpt();
    let KEYPAIR = new light.Keypair(poseidon);
    console.log(shieldedTransaction)
    let SHIELDED_TRANSACTION = new shieldedTransaction({
      merkleTreePubkey:MERKLE_TREE_USDC,
      merkleTreeAssetPubkey: MERKLE_TREE_PDA_TOKEN_USDC,
      relayerPubkey: AUTHORITY.toBase58(),
      poseidon: poseidon
    });

    await SHIELDED_TRANSACTION.getMerkleTree();

    let deposit_utxo1 = new light.Utxo(poseidon,[FEE_ASSET,ASSET], [new anchor.BN(depositFeeAmount),new anchor.BN(depositAmount)], KEYPAIR)

    let outputUtxos = [deposit_utxo1];

    await SHIELDED_TRANSACTION.prepareTransactionFull({
        inputUtxos: [],
        outputUtxos,
        action: "DEPOSIT",
        assetPubkeys: [FEE_ASSET, ASSET, ASSET_1],
        relayerFee: U64(depositFeeAmount),
        shuffle: true
    });
    let proof_data = await SHIELDED_TRANSACTION.proof();
  });
  var REGISTERED_VERIFIER_KEY;
  var PRE_INSERTED_LEAVES_INDEX;
  var MERKLE_TREE_PDA_TOKEN;
  var AUTHORITY;
  var LOOK_UP_TABLE;
  it.only("init pubkeys ", async () => {
    REGISTERED_VERIFIER_KEY = (await solana.PublicKey.findProgramAddress(
        [verifierProgram.programId.toBuffer()],
        merkleTreeProgram.programId
      ))[0];
    PRE_INSERTED_LEAVES_INDEX = (await solana.PublicKey.findProgramAddress(
        [MERKLE_TREE_KEY.toBuffer()],
        merkleTreeProgram.programId
      ))[0];
    MERKLE_TREE_PDA_TOKEN = (await solana.PublicKey.findProgramAddress(
        [MERKLE_TREE_KEY.toBuffer(), anchor.utils.bytes.utf8.encode("MERKLE_TREE_PDA_TOKEN")],
        merkleTreeProgram.programId
      ))[0];
    AUTHORITY = (await solana.PublicKey.findProgramAddress(
        [merkleTreeProgram.programId.toBuffer()],
        verifierProgram.programId))[0];
  })


  it("Initialize Merkle Tree", async () => {

      console.log("AUTHORITY: ", AUTHORITY);

    console.log("AUTHORITY: ", Array.prototype.slice.call(AUTHORITY.toBytes()));
    console.log("verifierProgram.programId: ", Array.prototype.slice.call(verifierProgram.programId.toBytes()));

    await newAccountWithLamports(
      provider.connection,
      ADMIN_AUTH_KEYPAIR
    )
    await provider.connection.requestAirdrop(ADMIN_AUTH_KEY, 1_000_000_000_000)

        /*
    // initing Lookup table
    //
    const recentSlot = (await provider.connection.getSlot()) - 10;
    console.log(`recentSlot ${recentSlot}`);

    const authorityPubkey = solana.Keypair.generate().publicKey;
    const payerPubkey = ADMIN_AUTH_KEYPAIR.publicKey;
    const [createInstruction] = solana.AddressLookupTableProgram.createLookupTable({
      authority: payerPubkey,
      payer: payerPubkey,
      recentSlot,
    });
    var transaction = new solana.Transaction().add(createInstruction);
    const [lookupTableAddress, bumpSeed] = await solana.PublicKey.findProgramAddress(
      [payerPubkey.toBuffer(), toBufferLE(BigInt(recentSlot), 8)],
      solana.AddressLookupTableProgram.programId,
    );
    const addressesToAdd = [
      MERKLE_TREE_KEY,
      MERKLE_TREE_PDA_TOKEN,
      PRE_INSERTED_LEAVES_INDEX,
      DEFAULT_PROGRAMS.rent,
      DEFAULT_PROGRAMS.systemProgram,
      DEFAULT_PROGRAMS.tokenProgram,
      DEFAULT_PROGRAMS.clock
    ];

    const extendInstruction = solana.AddressLookupTableProgram.extendLookupTable({
      lookupTable: lookupTableAddress,
      authority: payerPubkey,
      payer: payerPubkey,
      addresses: addressesToAdd,
    });
    transaction.add(extendInstruction);
    try {
      let res = await solana.sendAndConfirmTransaction(provider.connection, transaction, [ADMIN_AUTH_KEYPAIR]);
      console.log(res)
    } catch(e) {
      console.log(e);
      process.exit();
    }

    console.log("MERKLE_TREE_KEY: ", MERKLE_TREE_KEY.toBase58())
    console.log("MERKLE_TREE_KEY: ", Array.prototype.slice.call(MERKLE_TREE_KEY.toBytes()))
    console.log("MERKLE_TREE_PDA_TOKEN: ", MERKLE_TREE_PDA_TOKEN.toBase58())
    console.log("MERKLE_TREE_PDA_TOKEN: ", Array.prototype.slice.call(MERKLE_TREE_PDA_TOKEN.toBytes()))
    try {
      let recentBlockhash = await provider.connection.getLatestBlockhash();
      const ix = await merkleTreeProgram.methods.initializeNewMerkleTreeSol().accounts({
        authority: ADMIN_AUTH_KEY,
        merkleTree: MERKLE_TREE_KEY,
        preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
        merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
        ...DEFAULT_PROGRAMS
      })
      .preInstructions([
        SystemProgram.createAccount({
          fromPubkey: ADMIN_AUTH_KEY,
          newAccountPubkey: MERKLE_TREE_KEY,
          space: MERKLE_TREE_SIZE,
          lamports: await provider.connection.getMinimumBalanceForRentExemption(MERKLE_TREE_SIZE),
          programId: merkleTreeProgram.programId,
        })
      ])
      .signers([ADMIN_AUTH_KEYPAIR, MERKLE_TREE_KP])
      .transaction();
      ix.recentBlockhash = recentBlockhash.blockhash;
      ix.feePayer = ADMIN_AUTH_KEY;
      ix.lastValidBlockHeight = recentBlockhash.lastValidBlockHeight;
      console.log(ix);
      const compiledInstruction = ix.compileMessage();
      console.log("compiledInstruction0: ", ix.instructions[0])
      console.log("compiledInstruction1: ", ix.instructions[1])
      for (var i = 0; i < ix.instructions[1].keys.length; i++) {
        console.log(`${ix.instructions[1].keys[i].pubkey.toBase58()}, isWritable: ${ix.instructions[1].keys[i].isWritable}, isSigner: ${ix.instructions[1].keys[i].isSigner}`);

      }
      console.log(`programid: ${ix.instructions[1].programId.toBase58()}`);
      console.log(`data: ${Array.from(ix.instructions[1].data)}`);

      process.exit()
      let vTx = new solana.VersionedTransaction(
          new solana.MessageV0({
            header: {
              numRequiredSignatures: 1,
              numReadonlySignedAccounts:1,
              numReadonlyUnsignedAccounts:3, // might be wrong
            },
            staticAccountKeys: [ADMIN_AUTH_KEY, MERKLE_TREE_KEY, PRE_INSERTED_LEAVES_INDEX, MERKLE_TREE_PDA_TOKEN, DEFAULT_PROGRAMS.systemProgram, DEFAULT_PROGRAMS.rent],
            compiledInstructions: [{
              /// Index into the transaction keys array indicating the program account that executes this instruction /
              programIdIndex: 5,
              // Ordered indices into the transaction keys array indicating which accounts to pass to the program /
              accountKeyIndexes: [0, 1],
              // The program input data /
              data: "",//compiledInstruction.instructions[0].data,
            }],
            addressTableLookups: [
            //   {
            //   accountKey: lookupTableAddress,
            //   writableIndexes: [],
            //   readonlyIndexes: [0],
            // }
            // {
            //   accountKey: new PublicKey(3),
            //   writableIndexes: [1],
            //   readonlyIndexes: [],
            // }
          ],
            recentBlockhash
          }),
          [ADMIN_AUTH_KEYPAIR] //MERKLE_TREE_KP
      );
      console.log("vTx: ", vTx);
      let res = await solana.sendAndConfirmTransaction(provider.connection, vTx, [ADMIN_AUTH_KEYPAIR, MERKLE_TREE_KP]);
      console.log(res)
    } catch(e) {
      console.log("e: ", e)
      process.exit()

    }*/
    console.log(MERKLE_TREE_KEY);


    var merkleTreeAccountInfo = await provider.connection.getAccountInfo(
          MERKLE_TREE_KEY
        )

    // assert_eq(constants.INIT_BYTES_MERKLE_TREE_18,
    //   merkleTreeAccountInfo.data.slice(0,constants.INIT_BYTES_MERKLE_TREE_18.length)
    // )
    if (merkleTreeAccountInfo.data.length !== MERKLE_TREE_SIZE) {
      throw "merkle tree pda size wrong after initializing";

    }
    if (merkleTreeAccountInfo.owner.toBase58() !== merkleTreeProgram.programId.toBase58()) {
      throw "merkle tree pda owner wrong after initializing";
    }
    var merkleTreeIndexAccountInfo = await provider.connection.getAccountInfo(
          PRE_INSERTED_LEAVES_INDEX
        )
    assert(merkleTreeIndexAccountInfo != null, "merkleTreeIndexAccountInfo not initialized")
    UNREGISTERED_MERKLE_TREE = new anchor.web3.Account()
    UNREGISTERED_MERKLE_TREE_PDA_TOKEN = await solana.PublicKey.findProgramAddress(
        [UNREGISTERED_MERKLE_TREE.publicKey.toBuffer(), anchor.utils.bytes.utf8.encode("MERKLE_TREE_PDA_TOKEN")],
        merkleTreeProgram.programId
      )[0];

    UNREGISTERED_PRE_INSERTED_LEAVES_INDEX = await solana.PublicKey.findProgramAddress(
        [UNREGISTERED_MERKLE_TREE.publicKey.toBuffer()],
        merkleTreeProgram.programId
      )[0];
    try {
      const tx = await merkleTreeProgram.methods.initializeNewMerkleTreeSol().accounts({
        authority: ADMIN_AUTH_KEY,
        merkleTree: UNREGISTERED_MERKLE_TREE.publicKey,
        preInsertedLeavesIndex: UNREGISTERED_PRE_INSERTED_LEAVES_INDEX,
        merkleTreePdaToken: UNREGISTERED_MERKLE_TREE_PDA_TOKEN,
        ...DEFAULT_PROGRAMS
      })
      .preInstructions([
        SystemProgram.createAccount({
          fromPubkey: ADMIN_AUTH_KEY,
          newAccountPubkey: UNREGISTERED_MERKLE_TREE.publicKey,
          space: MERKLE_TREE_SIZE,
          lamports: await provider.connection.getMinimumBalanceForRentExemption(MERKLE_TREE_SIZE),
          programId: merkleTreeProgram.programId,
        })
      ])
      .signers([ADMIN_AUTH_KEYPAIR, UNREGISTERED_MERKLE_TREE])
      .rpc();
    } catch(e) {
      console.log(e)
    }


  });

  it("Deposit Proof & Tx will not work", async () => {
    let MERKLE_TREE_PDA_TOKEN_USDC = new anchor.web3.Account().publicKey
    let MERKLE_TREE_USDC  = new anchor.web3.Account().publicKey

    let RELAYER = new anchor.web3.Account()
    let ASSET = new anchor.BN(RELAYER.publicKey._bn.toString()).mod(FIELD_SIZE);
    let ASSET_1 = new anchor.BN(new anchor.web3.Account().publicKey._bn.toString()).mod(FIELD_SIZE);

    let FEE_ASSET = new anchor.BN(anchor.web3.SystemProgram.programId._bn.toString()).mod(FIELD_SIZE)
    let RELAYER_FEE = U64(10_000);
    let AMOUNT = 1_000_000
    for (var i = 0; i < 100; i++) {
      let ENCRYPTION_KEYPAIR = createEncryptionKeypair()
      // let depositAmount = 1_000_000_000
      // let depositFeeAmount = 1_000_000
      let depositAmount = 10_000 + Math.floor(Math.random() * 1_000_000_000);
      let depositFeeAmount = 10_000 + Math.floor(Math.random() * 1_000_000_000);
      let poseidon = await circomlibjs.buildPoseidonOpt();
      let KEYPAIR = new light.Keypair(poseidon);
      let SHIELDED_TRANSACTION = new shieldedTransaction({
        merkleTreePubkey:MERKLE_TREE_USDC,
        merkleTreeAssetPubkey: MERKLE_TREE_PDA_TOKEN_USDC,
        relayerPubkey: AUTHORITY.toBase58(),
        poseidon: poseidon
      });

      await SHIELDED_TRANSACTION.getMerkleTree();

      let deposit_utxo1 = new light.Utxo(poseidon,[FEE_ASSET,ASSET], [new anchor.BN(depositFeeAmount),new anchor.BN(depositAmount)], KEYPAIR)

      let outputUtxos = [deposit_utxo1];

      await SHIELDED_TRANSACTION.prepareTransactionFull({
        inputUtxos: [],
        outputUtxos,
        action: "DEPOSIT",
        assetPubkeys: [FEE_ASSET, ASSET, ASSET_1],
        relayerFee: U64(depositFeeAmount),
        shuffle: true
      });
      let proof_data = await SHIELDED_TRANSACTION.proof();
      console.log("proof_data: ", proof_data);
      // console.log(verifierProgram.methods.createVerifierState);
      // console.log("signingAddress: ", ADMIN_AUTH_KEYPAIR.publicKey);
      // console.log("systemProgram: ", SystemProgram.programId);
      // console.log("systemProgram: ", SystemProgram.programId);
      try {
        // solana.requestUnits(1_400_000);
        const tx = await verifierProgram.methods.createVerifierState(
          proof_data.proofBytes,
          proof_data.publicInputs.root,
          proof_data.publicInputs.publicAmount,
          proof_data.publicInputs.extDataHash,
          proof_data.publicInputs.nullifier0,
          proof_data.publicInputs.nullifier1,
          proof_data.publicInputs.leafRight,
          proof_data.publicInputs.leafLeft,
          new Uint8Array(32).fill(1),//proof_data.recipient,
          proof_data.publicInputs.extAmount,
          new Uint8Array(32).fill(1),//proof_data.relayer,
          proof_data.publicInputs.feeAmount,
          proof_data.publicInputs.mintPubkey,
          new Uint8Array(256).fill(1),
          proof_data.merkleTreeIndex
        ).accounts(
          {
            signingAddress: ADMIN_AUTH_KEYPAIR.publicKey,
            // verifierState: pdas.verifierStatePubkey,
            systemProgram: SystemProgram.programId,
            merkleTree: MERKLE_TREE_KEY,
            programMerkleTree:  merkleTreeProgram.programId,
          }
        ).preInstructions([
          solana.ComputeBudgetProgram.requestUnits({units:1_400_000, fee: 1})
        ]).signers([ADMIN_AUTH_KEYPAIR]).rpc()
        console.log(tx);

      } catch (e) {
        console.log(e);

      }
      // console.log(proof_data.publicInputsBytes)
      // console.log(proof_data.proofBytes)
      // console.log(proof_data.publicInputsBytes.toString())
      // console.log(proof_data.proofBytes.toString())

    }

  });


  it("min test attackerProgram ", async () => {
    await newAccountWithLamports(
      provider.connection,
      ADMIN_AUTH_KEYPAIR
    )
    console.log(attackerProgram.methods);

    try {
      const ix = await attackerProgram.methods.testr(
      ).accounts({
        signingAddress: ADMIN_AUTH_KEY,
        nullifier0Pda: AUTHORITY,
      })
      .signers([ADMIN_AUTH_KEYPAIR])
      .instruction()

      let recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
      let txMsg = new solana.TransactionMessage({payerKey: ADMIN_AUTH_KEY,instructions: [ix], recentBlockhash: recentBlockhash})
      let lookupTableAccount = await provider.connection.getAccountInfo(LOOK_UP_TABLE);
      let unpackedLookupTableAccount = solana.AddressLookupTableAccount.deserialize(lookupTableAccount.data);
      let compiledTx = txMsg.compileToV0Message([{state: unpackedLookupTableAccount}]);
      compiledTx.addressTableLookups[0].accountKey = LOOK_UP_TABLE

      let transaction = new solana.VersionedTransaction(compiledTx);

      transaction.sign([ADMIN_AUTH_KEYPAIR])
      let serializedTx = transaction.serialize();
      let res = await provider.connection.sendRawTransaction(serializedTx);
      console.log(res);

    } catch(e) {
      console.log(e);

    }
  })

  it.only("Initialize Token Merkle tree", async () => {
    await newAccountWithLamports(
      provider.connection,
      ADMIN_AUTH_KEYPAIR
    )
    await provider.connection.requestAirdrop(ADMIN_AUTH_KEY, 1_000_000_000_000)

    MERKLE_TREE_USDC= await solana.PublicKey.createWithSeed(
        ADMIN_AUTH_KEY,
        "usdc",
        merkleTreeProgram.programId,
      )
    MERKLE_TREE_PDA_TOKEN_USDC  = (await solana.PublicKey.findProgramAddress(
          [MERKLE_TREE_USDC.toBytes(), anchor.utils.bytes.utf8.encode("merkle_tree_pda_token")],
          merkleTreeProgram.programId
        ))[0];
    PRE_INSERTED_LEAVES_INDEX_USDC = (await solana.PublicKey.findProgramAddress(
        [MERKLE_TREE_USDC.toBuffer()],
        merkleTreeProgram.programId
      ))[0];
    RENT_ESCROW = await provider.connection.getMinimumBalanceForRentExemption(256);
    RENT_VERIFIER = await provider.connection.getMinimumBalanceForRentExemption(5 * 1024);
    RENT_TOKEN_ACCOUNT = await provider.connection.getMinimumBalanceForRentExemption(token.ACCOUNT_SIZE)

    console.log("MERKLE_TREE_USDC: ", MERKLE_TREE_USDC.toBase58())

    console.log("MERKLE_TREE_USDC: ", Array.prototype.slice.call(MERKLE_TREE_USDC.toBytes()))
    console.log("MERKLE_TREE_PDA_TOKEN_USDC: ", MERKLE_TREE_PDA_TOKEN_USDC.toBase58())
    console.log("MERKLE_TREE_PDA_TOKEN_USDC: ", Array.prototype.slice.call(MERKLE_TREE_PDA_TOKEN_USDC.toBytes()))

    const signer = await newAccountWithLamports(provider.connection)

    await provider.connection.requestAirdrop(signer.publicKey, 1_000_000_000_000)
    let tokenAuthority = (await solana.PublicKey.findProgramAddress(
        [anchor.utils.bytes.utf8.encode("spl")],
        merkleTreeProgram.programId
      ))[0];
    // create new token
    try {

    let mint = await token.createMint(
        provider.connection,
        ADMIN_AUTH_KEYPAIR,
        ADMIN_AUTH_KEYPAIR.publicKey,
        null,
        2,
        solana.Keypair.fromSecretKey(MINT_PRIVATE_KEY)
    );
    assert(MINT.toBase58() == mint.toBase58());
    console.log("MINT: ", MINT.toBase58());

  } catch(e) {
    console.log(e)
  }

    try {
      const tx = await merkleTreeProgram.methods.initializeNewMerkleTreeSpl(
      ).accounts({
        authority: ADMIN_AUTH_KEYPAIR.publicKey,
        merkleTree: MERKLE_TREE_USDC,
        preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX_USDC,
        merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN_USDC,
        tokenProgram:token.TOKEN_PROGRAM_ID,
        systemProgram: DEFAULT_PROGRAMS.systemProgram,
        mint: MINT,
        tokenAuthority: tokenAuthority,
        rent: DEFAULT_PROGRAMS.rent
      })
      .preInstructions([
        SystemProgram.createAccountWithSeed({
          basePubkey:ADMIN_AUTH_KEY,
          seed: anchor.utils.bytes.utf8.encode("usdc"),
          fromPubkey: ADMIN_AUTH_KEY,
          newAccountPubkey: MERKLE_TREE_USDC,
          space: MERKLE_TREE_SIZE,
          lamports: await provider.connection.getMinimumBalanceForRentExemption(MERKLE_TREE_SIZE),
          programId: merkleTreeProgram.programId,
        })
      ])
      .signers([ADMIN_AUTH_KEYPAIR])
      .rpc();
      console.log(tx);

    } catch(e) {
      console.log("e: ", e)
    }
    var merkleTreeAccountInfo = await provider.connection.getAccountInfo(
          MERKLE_TREE_USDC
        )
    // assert_eq(constants.INIT_BYTES_MERKLE_TREE_18,
    //   merkleTreeAccountInfo.data.slice(0,constants.INIT_BYTES_MERKLE_TREE_18.length)
    // )
    if (merkleTreeAccountInfo.data.length !== MERKLE_TREE_SIZE) {
      throw "merkle tree pda size wrong after initializing";

    }
    if (merkleTreeAccountInfo.owner.toBase58() !== merkleTreeProgram.programId.toBase58()) {
      throw "merkle tree pda owner wrong after initializing";
    }

  });

  it.only("Init Address Lookup Table", async () => {
    await newAccountWithLamports(
      provider.connection,
      ADMIN_AUTH_KEYPAIR
    )
    await provider.connection.requestAirdrop(ADMIN_AUTH_KEY, 1_000_000_000_000)

    const recentSlot = (await provider.connection.getSlot()) - 10;


    const authorityPubkey = solana.Keypair.generate().publicKey;
    const payerPubkey = ADMIN_AUTH_KEYPAIR.publicKey;
    const [lookupTableAddress, bumpSeed] = await solana.PublicKey.findProgramAddress(
      [payerPubkey.toBuffer(), toBufferLE(BigInt(recentSlot), 8)],
      solana.AddressLookupTableProgram.programId,
    );
    const createInstruction = solana.AddressLookupTableProgram.createLookupTable({
      authority: payerPubkey,
      payer: payerPubkey,
      recentSlot,
    })[0];

    var transaction = new solana.Transaction().add(createInstruction);
    LOOK_UP_TABLE = lookupTableAddress;
    const addressesToAdd = [
      AUTHORITY,
      SystemProgram.programId,
      merkleTreeProgram.programId,
      DEFAULT_PROGRAMS.rent,
      MERKLE_TREE_USDC,
      PRE_INSERTED_LEAVES_INDEX_USDC,
      token.TOKEN_PROGRAM_ID,
      MERKLE_TREE_PDA_TOKEN_USDC,
      MERKLE_TREE_KEY,
      MERKLE_TREE_PDA_TOKEN
    ];

    const extendInstruction = solana.AddressLookupTableProgram.extendLookupTable({
      lookupTable: lookupTableAddress,
      authority: payerPubkey,
      payer: payerPubkey,
      addresses: addressesToAdd,
    });

    transaction.add(extendInstruction);
    let recentBlockhash = await provider.connection.getRecentBlockhash();
    transaction.feePayer = payerPubkey;
    transaction.recentBlockhash = recentBlockhash;

    try {
      let res = await solana.sendAndConfirmTransaction(provider.connection, transaction, [ADMIN_AUTH_KEYPAIR]);
    } catch(e) {
      console.log(e);
    }



  });
  const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  it.only("Generate Proof & Deposit & Withdraw", async () => {
    console.log("1")
    let merkelTree= await solana.PublicKey.createWithSeed(
        ADMIN_AUTH_KEY,
        "usdc",
        merkleTreeProgram.programId,
      )
    let merkleTreePda  = (await solana.PublicKey.findProgramAddress(
          [merkelTree.toBytes(), anchor.utils.bytes.utf8.encode("merkle_tree_pda_token")],
          merkleTreeProgram.programId
        ))[0];
    const origin = await newAccountWithLamports(provider.connection)
    const relayer = await newAccountWithLamports(provider.connection)
    await sleep(2000)
    let tokenAuthority = (await solana.PublicKey.findProgramAddress(
        [anchor.utils.bytes.utf8.encode("spl")],
        verifierProgram.programId
      ))[0];

    let tx_fee = 5000 * 50;

    var relayerInfoStart = await provider.connection.getAccountInfo(
      relayer.publicKey
    )
    var userInfoStart = await provider.connection.getAccountInfo(
      origin.publicKey
    )
    console.log("origin.publicKey: ", origin.publicKey.toBase58());

    console.log("userInfoStart ",userInfoStart );
    var userTokenAccount
    try {

      // create associated token account
      userTokenAccount = (await newAccountWithTokens({
        connection: provider.connection,
        MINT,
        ADMIN_AUTH_KEYPAIR,
        userAccount: origin,
        amount: (1_000_000_000_000+10 )
      }))
      console.log("userTokenAccount ", userTokenAccount);

    } catch(e) {
      console.log(e);

    }

    console.log("here2");

    await token.approve(
      provider.connection,
      origin,
      userTokenAccount,
      AUTHORITY, //delegate
      origin.publicKey, // owner
      1_000_000_000_000000, //I64.readLE(1_000_000_000_00,0).toNumber(), // amount
      []
    )
    console.log("approved: ", AUTHORITY.toBase58());

    let RELAYER = new anchor.web3.Account()
    let ASSET = new anchor.BN(RELAYER.publicKey._bn.toString()).mod(FIELD_SIZE);
    let ASSET_1 = new anchor.BN(new anchor.web3.Account().publicKey._bn.toString()).mod(FIELD_SIZE);

    let FEE_ASSET = new anchor.BN(anchor.web3.SystemProgram.programId._bn.toString()).mod(FIELD_SIZE)
    let RELAYER_FEE = U64(10_000);
    let AMOUNT = 1_000_000

    let recipient_fee_account = await newProgramOwnedAccount({ connection: provider.connection,lamports: 300_000, owner: verifierProgram, account: AUTHORITY})

      let ENCRYPTION_KEYPAIR = createEncryptionKeypair()
      let depositAmount = 10_000 + Math.floor(Math.random() * 1_000_000_000);
      let depositFeeAmount = 10_000 + Math.floor(Math.random() * 1_000_000_000);
      let poseidon = await circomlibjs.buildPoseidonOpt();
      let KEYPAIR = new light.Keypair(poseidon);
      let SHIELDED_TRANSACTION = new shieldedTransaction({
          merkleTreePubkey:merkelTree,
          merkleTreeAssetPubkey: merkleTreePda,
          relayerPubkey: ADMIN_AUTH_KEYPAIR.publicKey.toBase58(),
          poseidon: poseidon,
          recipient:MERKLE_TREE_PDA_TOKEN_USDC,
          recipientFee: recipient_fee_account,
          merkleTreeIndex: 1
      });
      console.log("here4");

      await SHIELDED_TRANSACTION.getMerkleTree();

      let deposit_utxo1 = new light.Utxo(poseidon,[FEE_ASSET,ASSET], [new anchor.BN(depositFeeAmount),new anchor.BN(depositAmount)], KEYPAIR)

      let outputUtxos = [deposit_utxo1];

      await SHIELDED_TRANSACTION.prepareTransactionFull({
        inputUtxos: [],
        outputUtxos,
        action: "DEPOSIT",
        assetPubkeys: [FEE_ASSET, ASSET, ASSET_1],
        relayerFee: U64(depositFeeAmount),
        shuffle: true,
        mintPubkey: ASSET,
        recipientFee: recipient_fee_account.publicKey
      });
      let proof_data = await SHIELDED_TRANSACTION.proof();
      let pdas = await getPdaAddresses({
        tx_integrity_hash: proof_data.publicInputs.txIntegrityHash,
        nullifier0: proof_data.publicInputs.nullifier0,
        nullifier1: proof_data.publicInputs.nullifier1,
        leafLeft: proof_data.publicInputs.leafLeft,
        merkleTreeProgram,
        verifierProgram
      })

      let escrow_account = await newProgramOwnedAccount({ connection: provider.connection,lamports: 300_000, owner: verifierProgram, account: AUTHORITY})

      const txTransfer = new solana.Transaction().add(
        await solana.SystemProgram.transfer({
            fromPubkey:ADMIN_AUTH_KEYPAIR.publicKey,
            toPubkey: escrow_account.publicKey,
            lamports: 1_000_000_0000
        }),
      );

    txTransfer.recentBlockhash = await connection.getRecentBlockhash();

    let x = await solana.sendAndConfirmTransaction(
        provider.connection,
        txTransfer,
        [ADMIN_AUTH_KEYPAIR],
        {
          commitment: 'singleGossip',
          preflightCommitment: 'singleGossip',
        },
      );
      // console.log(x);

      // console.log("proof_data: ", proof_data);
      // let placeholderNUllifier0 = new anchor.web3.Account()
      // let placeholderNUllifier1 = new anchor.web3.Account()
      // let placeholderLeavesAcc = new anchor.web3.Account()

      // console.log(verifierProgram.methods.createVerifierState);
      // console.log("signingAddress: ", ADMIN_AUTH_KEYPAIR.publicKey);
      // console.log("systemProgram: ", SystemProgram.programId);
      // console.log("systemProgram: ", SystemProgram.programId);
      // console.log(proof_data);
      console.log("proof_data.proofBytes ", proof_data.proofBytes);

      try {

        var MERKLE_TREE_USDCaccount = await token.getAccount(
          provider.connection,
          MERKLE_TREE_PDA_TOKEN_USDC
        )
        console.log("MERKLE_TREE_USDCaccount ", MERKLE_TREE_USDCaccount);

        var userTokenAccountAcc = await token.getAccount(provider.connection,
          userTokenAccount
        )
        console.log("userTokenAccount ", userTokenAccount.toBase58());
        console.log("MINT ", MINT);
        let txTransfer = new solana.Transaction().add(solana.SystemProgram.transfer({fromPubkey:ADMIN_AUTH_KEYPAIR.publicKey, toPubkey: AUTHORITY, lamports: 3173760 * 3}));
        await   provider.sendAndConfirm(txTransfer, [ADMIN_AUTH_KEYPAIR]);
        console.log(proof_data.toString());
        console.log("proof_data.publicInputs.extDataHash ", proof_data.publicInputs.extDataHash);

        const ix = await verifierProgram.methods.shieldedTransferInputs(
          proof_data.proofBytes,
          proof_data.publicInputs.root,
          proof_data.publicInputs.publicAmount.slice(24,32),
          proof_data.publicInputs.extDataHash,
          [proof_data.publicInputs.nullifier0,proof_data.publicInputs.nullifier1],
          [proof_data.publicInputs.leafRight, proof_data.publicInputs.leafLeft],
          // proof_data.externalAmountBigNumber,
          proof_data.publicInputs.feeAmount.slice(24,32),
          proof_data.publicInputs.mintPubkey,
          new anchor.BN(1),//proof_data.merkleTreeIndex,
          new anchor.BN(0),
          new anchor.BN(depositFeeAmount),// relayer_fee
          proof_data.encryptedOutputs.slice(0,128),
          proof_data.encryptedOutputs.slice(128,192),
          proof_data.encryptedOutputs.slice(192,224),
          proof_data.encryptedOutputs.slice(224,238)
        ).accounts(
          {
            signingAddress: ADMIN_AUTH_KEYPAIR.publicKey,
            systemProgram: SystemProgram.programId,
            programMerkleTree:  merkleTreeProgram.programId,
            rent:DEFAULT_PROGRAMS.rent,
            merkleTree: MERKLE_TREE_USDC,
            preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX_USDC,
            authority: AUTHORITY,
            tokenProgram: token.TOKEN_PROGRAM_ID,
            sender:userTokenAccount,
            recipient: MERKLE_TREE_PDA_TOKEN_USDC,
            recipientFee: recipient_fee_account.publicKey,
            relayerRecipient:AUTHORITY, // doesnt matter at deposit is not called
            escrow: escrow_account.publicKey,
          }
        )
        .remainingAccounts([ // placeholders for test should be leaves and nullifier
          { isSigner: false, isWritable: true, pubkey: pdas.nullifier0PdaPubkey },
          { isSigner: false, isWritable: true, pubkey: pdas.nullifier1PdaPubkey},
          { isSigner: false, isWritable: true, pubkey: pdas.leavesPdaPubkey}
        ])
        // .preInstructions([
        //   solana.ComputeBudgetProgram.requestUnits({units:1_400_000, fee: 1}),
        // ]) are ignored
        .signers([ADMIN_AUTH_KEYPAIR]).instruction()
        // console.log(tx);
        // for (var i in tx.keys){
        //   if (tx.keys[i].isWritable) {
        //     console.log(`AccountMeta::new(Pubkey::from_str(\"${tx.keys[i].pubkey.toBase58()}\").unwrap(), isSigner: ${tx.keys[i].isSigner}}),`);
        //   } else {
        //     console.log(`AccountMeta::new_readonly(Pubkey::from_str(\"${tx.keys[i].pubkey.toBase58()}\").unwrap(), isSigner: ${tx.keys[i].isSigner}}),`);
        //   }
        // }
        //
        // console.log("data: ", Array.prototype.slice.call(tx.data).toString());
        let recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
        let txMsg = new solana.TransactionMessage({
              payerKey: ADMIN_AUTH_KEY,
              instructions: [
                solana.ComputeBudgetProgram.requestUnits({units:1_400_000, fee: 1}),
                // solana.SystemProgram.transfer({fromPubkey:ADMIN_AUTH_KEYPAIR.publicKey, toPubkey: AUTHORITY, lamports: 3173760 * 3}),
                ix
              ],
              recentBlockhash: recentBlockhash})
        let lookupTableAccount = await provider.connection.getAccountInfo(LOOK_UP_TABLE);
        let unpackedLookupTableAccount = solana.AddressLookupTableAccount.deserialize(lookupTableAccount.data);
        let compiledTx = txMsg.compileToV0Message([{state: unpackedLookupTableAccount}]);
        compiledTx.addressTableLookups[0].accountKey = LOOK_UP_TABLE

        let transaction = new solana.VersionedTransaction(compiledTx);

        transaction.sign([ADMIN_AUTH_KEYPAIR])
        let serializedTx = transaction.serialize();
        let res = await provider.connection.sendRawTransaction(serializedTx);
        console.log(res);


      } catch (e) {
        console.log(e);
        console.log("AUTHORITY: ", AUTHORITY.toBase58());

      }
    })


  it.skip("Open and close escrow relayer token", async () => {
    const origin = await newAccountWithLamports(provider.connection)
    const relayer = await newAccountWithLamports(provider.connection)

    let tokenAuthority = (await solana.PublicKey.findProgramAddress(
        [anchor.utils.bytes.utf8.encode("spl")],
        verifierProgram.programId
      ))[0];
    let {ix_data, bytes} = read_and_parse_instruction_data_bytes();
    ix_data.recipient = MERKLE_TREE_PDA_TOKEN_USDC.toBytes();
    ix_data.merkleTreeIndex = new Uint8Array(1).fill(1)

    let tx_fee = 5000 * 50;
    let escrow_amount = tx_fee + U64.readLE(ix_data.fee, 0).toNumber()
    let amount = U64.readLE(ix_data.extAmount, 0).toNumber()
    let pdas = await getPdaAddresses({
      tx_integrity_hash: ix_data.txIntegrityHash,
      nullifier0: ix_data.nullifier0,
      nullifier1: ix_data.nullifier1,
      leafLeft: ix_data.leafLeft,
      merkleTreeProgram,
      verifierProgram
    })
    var relayerInfoStart = await connection.getAccountInfo(
      relayer.publicKey
    )
    var userInfoStart = await connection.getAccountInfo(
      origin.publicKey
    )

    // create associated token account
    var userTokenAccount = (await newAccountWithTokens({
        connection: provider.connection,
        MINT,
        ADMIN_AUTH_KEYPAIR,
        userAccount: origin,
        amount: (amount+10 )
    }))


    await token.approve(
      provider.connection,
      origin,
      userTokenAccount,
      AUTHORITY, //delegate
      origin.publicKey, // owner
      I64.readLE(ix_data.extAmount,0).toNumber(), // amount
      []
    )
    let escrowTokenAccount = await solana.PublicKey.createWithSeed(
      relayer.publicKey,
      "escrow",
      token.TOKEN_PROGRAM_ID,
    );


    try {
      const tx = await verifierProgram.methods.createEscrow(
            ix_data.txIntegrityHash,
            new anchor.BN(tx_fee), // does not need to be checked since this tx is signed by the user
            ix_data.fee,
            new anchor.BN(amount),
            new anchor.BN(1)
      ).accounts(
          {
            feeEscrowState: pdas.feeEscrowStatePubkey,
            verifierState:  pdas.verifierStatePubkey,
            signingAddress: relayer.publicKey,
            user:           origin.publicKey,
            systemProgram:  SystemProgram.programId,
            tokenProgram:  token.TOKEN_PROGRAM_ID,
            tokenAuthority: AUTHORITY//tokenAuthority
          }
        ).remainingAccounts([
          { isSigner: false, isWritable: true, pubkey:userTokenAccount },
          { isSigner: false, isWritable: true, pubkey:escrowTokenAccount }
        ]).preInstructions([
          SystemProgram.createAccountWithSeed({
            basePubkey:relayer.publicKey,
            seed: anchor.utils.bytes.utf8.encode("escrow"),
            fromPubkey: relayer.publicKey,
            newAccountPubkey: escrowTokenAccount,
            space: token.ACCOUNT_SIZE,
            lamports: await provider.connection.getMinimumBalanceForRentExemption(token.ACCOUNT_SIZE),
            programId: token.TOKEN_PROGRAM_ID
          }),
          token.createInitializeAccountInstruction(
           escrowTokenAccount, //new account
           MINT, // mint
           AUTHORITY,
           tokenAuthority, //owner
         )
       ]).signers([relayer, origin]).transaction();
       tx.instructions[1].programId = token.TOKEN_PROGRAM_ID
       await provider.sendAndConfirm(tx, [relayer, origin]);
    } catch (e) {

      console.log("e createEscrow", e)
    }

    await checkEscrowAccountCreated({
      connection: provider.connection,
      pdas,
      ix_data,
      user_pubkey: origin.publicKey,
      relayer_pubkey: relayer.publicKey,
      tx_fee: new anchor.BN(tx_fee),
      verifierProgram,
      is_token: true,
      escrowTokenAccount,
      rent: RENT_ESCROW
    });
    let receivedTokenInfo1 = await token.getAccount(
      provider.connection,
      userTokenAccount,
      token.TOKEN_PROGRAM_ID
    );
    assert(receivedTokenInfo1.amount == 10);


    // swapping accounts
    try {
      await verifierProgram.methods.closeEscrow(
        ).accounts(
          {
            signingAddress: relayer.publicKey,
            verifierState: pdas.verifierStatePubkey,
            systemProgram: SystemProgram.programId,
            feeEscrowState: pdas.feeEscrowStatePubkey,
            user:           origin.publicKey,
            relayer:        relayer.publicKey,
            token_program: token.TOKEN_PROGRAM_ID,
            tokenAuthority: AUTHORITY,
            systemProgram: SystemProgram.programId,

          }
        ).remainingAccounts([
          { isSigner: false, isWritable: true, pubkey:userTokenAccount },
          { isSigner: false, isWritable: true, pubkey:userTokenAccount }
        ]).signers([relayer]).rpc()

  } catch (e) {
    assert(e.error.errorCode.code == 'IncorrectTokenEscrowAcc');
  }
  let attacker = await newAccountWithLamports(provider.connection)
  let attackerTokenAccount = await newAccountWithTokens({
      connection: provider.connection,
      MINT,
      ADMIN_AUTH_KEYPAIR,
      userAccount: attacker,
      amount: 1
  })
  // inserting different userTokenAccount
  try {
    await verifierProgram.methods.closeEscrow(
      ).accounts(
        {
          signingAddress: relayer.publicKey,
          verifierState: pdas.verifierStatePubkey,
          systemProgram: SystemProgram.programId,
          feeEscrowState: pdas.feeEscrowStatePubkey,
          user:           origin.publicKey,
          relayer:        relayer.publicKey,
          token_program: token.TOKEN_PROGRAM_ID,
          tokenAuthority: AUTHORITY,
          systemProgram: SystemProgram.programId,
        }
      ).remainingAccounts([
        { isSigner: false, isWritable: true, pubkey:escrowTokenAccount },
        { isSigner: false, isWritable: true, pubkey:attackerTokenAccount }
      ]).signers([relayer]).rpc()

} catch (e) {
  assert(e.error.errorCode.code == 'WrongUserTokenPda');
}


    let userAccountPrior = await provider.connection.getAccountInfo(origin.publicKey)

    try {
      await verifierProgram.methods.closeEscrow(
        ).accounts(
          {
            signingAddress: relayer.publicKey,
            verifierState: pdas.verifierStatePubkey,
            systemProgram: SystemProgram.programId,
            feeEscrowState: pdas.feeEscrowStatePubkey,
            user:           origin.publicKey,
            relayer:        relayer.publicKey,
            token_program: token.TOKEN_PROGRAM_ID,
            tokenAuthority: AUTHORITY,
            systemProgram: SystemProgram.programId,

          }
        ).remainingAccounts([
          { isSigner: false, isWritable: true, pubkey:escrowTokenAccount },
          { isSigner: false, isWritable: true, pubkey:userTokenAccount }
        ]).signers([relayer]).rpc()

  } catch (e) {
    console.log(e)
    // assert(e.error.origin == 'relayer');
    // assert(e.error.errorCode.code == 'ConstraintRaw');
  }


  let escrowTokenAccountInfo2 = await token.getAccount(
    provider.connection,
    escrowTokenAccount,
    token.TOKEN_PROGRAM_ID
  );
  // console.log("escrowTokenAccountInfo1 ", escrowTokenAccountInfo2.amount)

  assert(escrowTokenAccountInfo2.amount.toString() == '0');

  let receivedTokenInfo2 = await token.getAccount(
    provider.connection,
    userTokenAccount,
    token.TOKEN_PROGRAM_ID
  );
  // console.log("receivedTokenInfo1", receivedTokenInfo2.amount)
  // console.log("amount", amount)

  assert(receivedTokenInfo2.amount == amount + 10);

  let userAccountAfter = await provider.connection.getAccountInfo(origin.publicKey)
  // console.log(`${userAccountAfter.lamports}  == ${userAccountPrior.lamports} ${Number(tx_fee)} ${userAccountPrior.lamports + Number(tx_fee)}`)
  assert(userAccountAfter.lamports == userAccountPrior.lamports + Number(tx_fee));
  })

  it.skip("Open and close escrow user token", async () => {
    const origin = await newAccountWithLamports(provider.connection)
    const relayer = await newAccountWithLamports(provider.connection)
    let tokenAuthority = await solana.PublicKey.findProgramAddress(
        [anchor.utils.bytes.utf8.encode("spl")],
        verifierProgram.programId
      )[0];
    let {ix_data, bytes} = read_and_parse_instruction_data_bytes();
    ix_data.recipient = MERKLE_TREE_PDA_TOKEN_USDC.toBytes();
    ix_data.merkleTreeIndex = new Uint8Array(1).fill(1)

    let tx_fee = 5000 * 50;
    let escrow_amount = tx_fee + U64.readLE(ix_data.fee, 0).toNumber()
    let amount = U64.readLE(ix_data.extAmount, 0).toNumber()
    let pdas = await getPdaAddresses({
      tx_integrity_hash: ix_data.txIntegrityHash,
      nullifier0: ix_data.nullifier0,
      nullifier1: ix_data.nullifier1,
      leafLeft: ix_data.leafLeft,
      merkleTreeProgram,
      verifierProgram
    })
    var relayerInfoStart = await connection.getAccountInfo(
      relayer.publicKey
    )
    var userInfoStart = await connection.getAccountInfo(
      origin.publicKey
    )

    // create associated token account
    var userTokenAccount = (await newAccountWithTokens({
        connection: provider.connection,
        MINT,
        ADMIN_AUTH_KEYPAIR,
        userAccount: origin,
        amount: (amount+10 )
    }))


    await token.approve(
      provider.connection,
      origin,
      userTokenAccount,
      AUTHORITY, //delegate
      origin.publicKey, // owner
      I64.readLE(ix_data.extAmount,0).toNumber(), // amount
      []
    )
    let escrowTokenAccount = await solana.PublicKey.createWithSeed(
      relayer.publicKey,
      "escrow",
      token.TOKEN_PROGRAM_ID,
    );
    // console.log("escrowTokenAccount ", escrowTokenAccount.toBase58())
    // console.log("userTokenAccount ", userTokenAccount.toBase58())
    // console.log("pdas.feeEscrowStatePubkey ", pdas.feeEscrowStatePubkey.toBase58())

   // approve token to
   // console.log("signer: ", relayer.publicKey.toBase58())
    try {
      const tx = await verifierProgram.methods.createEscrow(
            ix_data.txIntegrityHash,
            new anchor.BN(tx_fee), // does not need to be checked since this tx is signed by the user
            ix_data.fee,
            new anchor.BN(amount),
            new anchor.BN(1)
      ).accounts(
          {
            feeEscrowState: pdas.feeEscrowStatePubkey,
            verifierState:  pdas.verifierStatePubkey,
            signingAddress: relayer.publicKey,
            user:           origin.publicKey,
            systemProgram:  SystemProgram.programId,
            tokenProgram:  token.TOKEN_PROGRAM_ID,
            tokenAuthority: AUTHORITY//tokenAuthority
          }
        ).remainingAccounts([
          { isSigner: false, isWritable: true, pubkey:userTokenAccount },
          { isSigner: false, isWritable: true, pubkey:escrowTokenAccount }
        ]).preInstructions([
          SystemProgram.createAccountWithSeed({
            basePubkey:relayer.publicKey,
            seed: anchor.utils.bytes.utf8.encode("escrow"),
            fromPubkey: relayer.publicKey,
            newAccountPubkey: escrowTokenAccount,
            space: token.ACCOUNT_SIZE,
            lamports: await provider.connection.getMinimumBalanceForRentExemption(token.ACCOUNT_SIZE),
            programId: token.TOKEN_PROGRAM_ID
          }),
          token.createInitializeAccountInstruction(
           escrowTokenAccount, //new account
           MINT, // mint
           AUTHORITY,
           tokenAuthority, //owner
         )
       ]).signers([relayer, origin]).transaction();
       tx.instructions[1].programId = token.TOKEN_PROGRAM_ID
       await provider.sendAndConfirm(tx, [relayer, origin]);
    } catch (e) {

      console.log("e createEscrow", e)
    }

    await checkEscrowAccountCreated({
      connection: provider.connection,
      pdas,
      ix_data,
      user_pubkey: origin.publicKey,
      relayer_pubkey: relayer.publicKey,
      tx_fee: new anchor.BN(tx_fee),
      verifierProgram,
      is_token: true,
      escrowTokenAccount,
      rent: RENT_ESCROW
    });

    let receivedTokenInfo1 = await token.getAccount(
      provider.connection,
      userTokenAccount,
      token.TOKEN_PROGRAM_ID
    );

    // console.log("receivedTokenInfo1", receivedTokenInfo1.amount)
    assert(receivedTokenInfo1.amount == 10);

    let escrowTokenAccountInfo1 = await token.getAccount(
      provider.connection,
      escrowTokenAccount,
      token.TOKEN_PROGRAM_ID
    );

    // console.log("escrowTokenAccountInfo1 ", escrowTokenAccountInfo1.amount)

    assert(escrowTokenAccountInfo1.amount == amount);
    let userAccountPrior = await provider.connection.getAccountInfo(origin.publicKey)
    // console.log("userTokenAccount ", userTokenAccount.toBase58())
    // console.log("escrowTokenAccount ", escrowTokenAccount.toBase58())

    try {
      await verifierProgram.methods.closeEscrow(
        ).accounts(
          {
            signingAddress: origin.publicKey,
            verifierState: pdas.verifierStatePubkey,
            systemProgram: SystemProgram.programId,
            feeEscrowState: pdas.feeEscrowStatePubkey,
            user:           origin.publicKey,
            relayer:        relayer.publicKey,
            token_program: token.TOKEN_PROGRAM_ID,
            tokenAuthority: AUTHORITY,
            systemProgram: SystemProgram.programId,

          }
        ).remainingAccounts([
          { isSigner: false, isWritable: true, pubkey:escrowTokenAccount },
          { isSigner: false, isWritable: true, pubkey:userTokenAccount }
        ]).signers([origin]).rpc()

  } catch (e) {
    console.log(e)
    // assert(e.error.origin == 'relayer');
    // assert(e.error.errorCode.code == 'ConstraintRaw');
  }


  let escrowTokenAccountInfo2 = await token.getAccount(
    provider.connection,
    escrowTokenAccount,
    token.TOKEN_PROGRAM_ID
  );
  // console.log("escrowTokenAccountInfo1 ", escrowTokenAccountInfo2.amount)

  assert(escrowTokenAccountInfo2.amount.toString() == '0');

  let receivedTokenInfo2 = await token.getAccount(
    provider.connection,
    userTokenAccount,
    token.TOKEN_PROGRAM_ID
  );


  assert(receivedTokenInfo2.amount == amount + 10);

  let userAccountAfter = await provider.connection.getAccountInfo(origin.publicKey)
  // console.log(`${userAccountAfter.lamports}  == ${userAccountPrior.lamports} ${Number(tx_fee)} ${userAccountPrior.lamports + Number(tx_fee)}`)
  assert(userAccountAfter.lamports == userAccountPrior.lamports + Number(tx_fee));
  })

  it.skip("Open and close escrow token after 1 tx", async () => {
    const origin = await newAccountWithLamports(provider.connection)
    var userTokenAccount = (await newAccountWithTokens({
        connection: provider.connection,
        MINT,
        ADMIN_AUTH_KEYPAIR,
        userAccount: origin,
        amount: ( 2 * amount)
    }))
    let Keypair = new light.Keypair()

    const relayer = await newAccountWithLamports(provider.connection)
    let tokenAuthority = await solana.PublicKey.findProgramAddress(
        [anchor.utils.bytes.utf8.encode("spl")],
        verifierProgram.programId
      )[0];

    let tx_fee = 5000 * 50;
    let nr_tx = 1
    // 3 for creation and init of token account plus one executed tx
    let tx_cost = (nr_tx + 3) * 5000

    let merkleTree = await light.buildMerkelTree(provider.connection, MERKLE_TREE_PDA_TOKEN_USDC.toBytes());

    let deposit_utxo1 = new light.Utxo(BigNumber.from(amount), Keypair)
    let deposit_utxo2 = new light.Utxo(BigNumber.from(amount), Keypair)

    let inputUtxos = [new light.Utxo(), new light.Utxo()]
    let outputUtxos = [deposit_utxo1, deposit_utxo2 ]

    const data = await light.getProof(
      inputUtxos,
      outputUtxos,
      merkleTree,
      1, // merkleTreeIndex
      MERKLE_TREE_USDC.toBytes(),
      deposit_utxo1.amount.add(deposit_utxo2.amount),
      U64(0),
      MERKLE_TREE_PDA_TOKEN_USDC.toBase58(),
      relayer.publicKey.toBase58(),
      'DEPOSIT',
      encryptionKeypair
    )

    let ix_data = parse_instruction_data_bytes(data);


    let escrow_amount = U64.readLE(ix_data.extAmount, 0).toNumber() + tx_fee + U64.readLE(ix_data.fee, 0).toNumber()

    let pdas = await getPdaAddresses({
      tx_integrity_hash: ix_data.txIntegrityHash,
      nullifier0: ix_data.nullifier0,
      nullifier1: ix_data.nullifier1,
      leafLeft: ix_data.leafLeft,
      merkleTreeProgram,
      verifierProgram
    })

    var relayerInfoStart = await connection.getAccountInfo(relayer.publicKey)
    var userInfoStart = await connection.getAccountInfo(origin.publicKey)

    await token.approve(
      provider.connection,
      origin,
      userTokenAccount,
      AUTHORITY, //delegate
      origin.publicKey, // owner
      I64.readLE(ix_data.extAmount,0).toNumber(), // amount
      []
    )

    let escrowTokenAccount = await solana.PublicKey.createWithSeed(
      relayer.publicKey,
      "escrow",
      token.TOKEN_PROGRAM_ID,
    );

    try {
      const tx = await verifierProgram.methods.createEscrow(
            ix_data.txIntegrityHash,
            new anchor.BN(tx_fee), // does not need to be checked since this tx is signed by the user
            ix_data.fee,
            new anchor.BN(I64.readLE(ix_data.extAmount,0).toString()),
            new anchor.BN(1)
      ).accounts(
          {
            feeEscrowState: pdas.feeEscrowStatePubkey,
            verifierState:  pdas.verifierStatePubkey,
            signingAddress: relayer.publicKey,
            user:           origin.publicKey,
            systemProgram:  SystemProgram.programId,
            tokenProgram:  token.TOKEN_PROGRAM_ID,
            tokenAuthority: AUTHORITY//tokenAuthority
          }
        ).remainingAccounts([
          { isSigner: false, isWritable: true, pubkey:userTokenAccount },
          { isSigner: false, isWritable: true, pubkey:escrowTokenAccount }
        ]).preInstructions([
          SystemProgram.createAccountWithSeed({
            basePubkey:relayer.publicKey,
            seed: anchor.utils.bytes.utf8.encode("escrow"),
            fromPubkey: relayer.publicKey,
            newAccountPubkey: escrowTokenAccount,
            space: token.ACCOUNT_SIZE,
            lamports: RENT_TOKEN_ACCOUNT,
            programId: token.TOKEN_PROGRAM_ID
          }),
          token.createInitializeAccountInstruction(
           escrowTokenAccount, //new account
           MINT, // mint
           AUTHORITY,
           tokenAuthority, //owner
         )
       ]).signers([relayer, origin]).transaction();
       tx.instructions[1].programId = token.TOKEN_PROGRAM_ID
       await provider.sendAndConfirm(tx, [relayer, origin]);
    } catch (e) {

      console.log("e createEscrow", e)
    }
    await checkEscrowAccountCreated({
      connection: provider.connection,
      pdas,
      ix_data,
      user_pubkey: origin.publicKey,
      relayer_pubkey: relayer.publicKey,
      tx_fee: new anchor.BN(tx_fee),
      verifierProgram,
      is_token: true,
      escrowTokenAccount,
      rent: RENT_ESCROW
    });

    let receivedTokenInfo1 = await token.getAccount(
      provider.connection,
      userTokenAccount,
      token.TOKEN_PROGRAM_ID
    );

    assert(receivedTokenInfo1.amount == 0);


    var relayerInfoMid = await connection.getAccountInfo(
      relayer.publicKey
    )

    assert(relayerInfoMid.lamports == relayerInfoStart.lamports - RENT_ESCROW - RENT_VERIFIER - RENT_TOKEN_ACCOUNT)
    var userInfoMid = await connection.getAccountInfo(
      origin.publicKey
    )
    var feeEscrowStatePubkeyInfoMid = await connection.getAccountInfo(
      pdas.feeEscrowStatePubkey
    )
    await createVerifierState({
      provider,
      ix_data,
      relayer,
      pdas,
      merkleTree: MERKLE_TREE_USDC,
      merkleTreeProgram,
      verifierProgram
    })


    await executeXComputeTransactions({
      number_of_transactions: nr_tx,
      signer: relayer,
      pdas: pdas,
      program: verifierProgram,
      provider:provider
    })
    var relayerInfoMid2 = await connection.getAccountInfo(
      relayer.publicKey
    )
  // console.log(`relayerInfoMid ${relayerInfoMid.lamports - tx_cost} == relayerInfoMid2 ${relayerInfoMid2.lamports}`)
  // console.log(`relayerInfoMid -relayerInfoMid2.lamports ${relayerInfoMid.lamports - relayerInfoMid2.lamports}`)
  // assert(relayerInfoMid.lamports - tx_cost == relayerInfoMid2.lamports)

  try {
    await verifierProgram.methods.closeEscrow(
      ).accounts(
        {
          signingAddress: origin.publicKey,
          verifierState: pdas.verifierStatePubkey,
          systemProgram: SystemProgram.programId,
          feeEscrowState: pdas.feeEscrowStatePubkey,
          user:           origin.publicKey,
          relayer:        relayer.publicKey,
          token_program: token.TOKEN_PROGRAM_ID,
          tokenAuthority: AUTHORITY,
          systemProgram: SystemProgram.programId
        }
      ).remainingAccounts([
        { isSigner: false, isWritable: true, pubkey:escrowTokenAccount },
        { isSigner: false, isWritable: true, pubkey:userTokenAccount }
      ]).signers([origin]).rpc()

  } catch (e) {
    assert(e.error.errorCode.code == 'NotTimedOut');
  }


  let userAccountPrior = await provider.connection.getAccountInfo(origin.publicKey)

  await verifierProgram.methods.closeEscrow(
    ).accounts(
      {
        signingAddress: relayer.publicKey,
        verifierState: pdas.verifierStatePubkey,
        systemProgram: SystemProgram.programId,
        feeEscrowState: pdas.feeEscrowStatePubkey,
        user:           origin.publicKey,
        relayer:        relayer.publicKey,
        token_program: token.TOKEN_PROGRAM_ID,
        tokenAuthority: AUTHORITY,
        systemProgram: SystemProgram.programId
      }
    ).remainingAccounts([
      { isSigner: false, isWritable: true, pubkey:escrowTokenAccount },
      { isSigner: false, isWritable: true, pubkey:userTokenAccount }
    ]).signers([relayer]).rpc()


    let escrowTokenAccountInfo2 = await token.getAccount(
      provider.connection,
      escrowTokenAccount,
      token.TOKEN_PROGRAM_ID
    );

    assert(escrowTokenAccountInfo2.amount.toString() == '0');

    let receivedTokenInfo2 = await token.getAccount(
      provider.connection,
      userTokenAccount,
      token.TOKEN_PROGRAM_ID
    );


    assert(receivedTokenInfo2.amount == (2* amount));
  })


  it.skip("Deposit and withdraw token", async () => {
    const userAccount = await newAccountWithLamports(provider.connection)

    var amount = 1_000_000_00
    var numberDeposits = 1
    const userAccountToken = await newAccountWithTokens({
      connection: provider.connection,
      MINT,
      ADMIN_AUTH_KEYPAIR,
      userAccount,
      amount: (2 * numberDeposits *  amount )
    })
    let escrowTokenAccountInfo1 = await token.getAccount(
      provider.connection,
      userAccountToken,
      token.TOKEN_PROGRAM_ID
    );
    var signer
    var pdas
    var leavesPdas = []
    var utxos = []

    //
    // *
    // * test deposit
    // *
    //
    let merkleTree = await light.buildMerkelTree(provider.connection, MERKLE_TREE_USDC.toBytes());

    let Keypair = new light.Keypair()
    for (var i = 0; i < numberDeposits; i++) {
      let res = await deposit({
        Keypair,
        encryptionKeypair,
        MINT,
        amount: amount,
        connection: provider.connection,
        merkleTree,
        merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN_USDC,
        userAccount,
        userAccountToken,
        verifierProgram,
        merkleTreeProgram,
        authority: AUTHORITY,
        preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX_USDC,
        merkle_tree_pubkey: MERKLE_TREE_USDC,
        provider,
        relayerFee,
        is_token: true,
        rent: RENT_ESCROW
      })
      leavesPdas.push({ isSigner: false, isWritable: true, pubkey: res[0]})
      utxos.push(res[1])
      signer = res[2]
      pdas = res[3]
    }
    console.log("probably finished deposit")
    await executeUpdateMerkleTreeTransactions({
      connection: provider.connection,
      signer: userAccount,
      merkleTreeProgram: merkleTreeProgram,
      leavesPdas,
      merkleTree,
      merkleTreeIndex: 1,
      merkle_tree_pubkey: MERKLE_TREE_USDC,
      provider
    });


    // *
    // * test withdrawal
    // *
    // *
    // *

    // new lightTransaction
    // generate utxos
    //
    console.log("probably finished deposit")

    var leavesPdasWithdrawal = []
    const merkleTreeWithdrawal = await light.buildMerkelTree(provider.connection, MERKLE_TREE_USDC.toBytes());
    let deposit_utxo1 = utxos[0][0];
    let deposit_utxo2 = utxos[0][1];
    deposit_utxo1.index = merkleTreeWithdrawal._layers[0].indexOf(deposit_utxo1.getCommitment()._hex)
    deposit_utxo2.index = merkleTreeWithdrawal._layers[0].indexOf(deposit_utxo2.getCommitment()._hex)

    let relayer = await newAccountWithLamports(provider.connection);
    let relayer_recipient = await newAccountWithTokens({
        connection: provider.connection,
        MINT,
        ADMIN_AUTH_KEYPAIR,
        userAccount: relayer,
        amount: 0
    });
    console.log("probably finished deposit")

    const recipientWithdrawal = await newAccountWithLamports(provider.connection)

    var recipientTokenAccount = await token.getOrCreateAssociatedTokenAccount(
       connection,
       relayer,
       MINT,
       recipientWithdrawal.publicKey
   );
    let inputUtxosWithdrawal = []
    if (deposit_utxo1.index == 1) {
      inputUtxosWithdrawal = [deposit_utxo1, new light.Utxo()] // 38241198
    } else {
      inputUtxosWithdrawal = [deposit_utxo2, new light.Utxo()] // 38241198
    }
    let outputUtxosWithdrawal = [new light.Utxo(), new light.Utxo() ]

    const externalAmountBigNumber: BigNumber = BigNumber.from(relayerFee.toString())
    .add(
      outputUtxosWithdrawal.reduce(
        (sum, utxo) => sum.add(utxo.amount),
        BigNumber.from(0),
      ),
    )
    .sub(
      inputUtxosWithdrawal.reduce((sum, utxo) => sum.add(utxo.amount), BigNumber.from(0)),
    )
    console.log("probably finished deposit")

    var dataWithdrawal = await light.getProof(
      inputUtxosWithdrawal,
      outputUtxosWithdrawal,
      merkleTreeWithdrawal,
      1, //merkleTreeIndex:
      MERKLE_TREE_USDC.toBytes(),
      externalAmountBigNumber,
      relayerFee,
      recipientTokenAccount.address.toBase58(),
      relayer.publicKey.toBase58(),
      'WITHDRAWAL',
      encryptionKeypair
    )
    let ix_dataWithdrawal = parse_instruction_data_bytes(dataWithdrawal);

    let pdasWithdrawal = await getPdaAddresses({
      tx_integrity_hash: ix_dataWithdrawal.txIntegrityHash,
      nullifier0: ix_dataWithdrawal.nullifier0,
      nullifier1: ix_dataWithdrawal.nullifier1,
      leafLeft: ix_dataWithdrawal.leafLeft,
      merkleTreeProgram,
      verifierProgram
    })

    let resWithdrawalTransact = await transact({
      connection: provider.connection,
      ix_data: ix_dataWithdrawal,
      pdas: pdasWithdrawal,
      origin_token: MERKLE_TREE_PDA_TOKEN_USDC,
      MINT,
      signer: relayer,
      recipient: recipientTokenAccount.address,
      relayer_recipient,
      mode: "withdrawal",
      verifierProgram,
      merkleTreeProgram,
      authority: AUTHORITY,
      preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX_USDC,
      merkle_tree_pubkey: MERKLE_TREE_USDC,
      provider,
      relayerFee,
      is_token: true
    })
    leavesPdasWithdrawal.push({
      isSigner: false,
      isWritable: true,
      pubkey: resWithdrawalTransact
    })
    await executeUpdateMerkleTreeTransactions({
      connection: provider.connection,
      signer:relayer,
      merkleTreeProgram,
      leavesPdas: leavesPdasWithdrawal,
      merkleTree: merkleTreeWithdrawal,
      merkle_tree_pubkey: MERKLE_TREE_USDC,
      merkleTreeIndex: 1,
      provider
    });



  })

  it.skip("Test withdraw spl Merkle tree program", async () => {
    const signer = await newAccountWithLamports(provider.connection)
    // UNREGISTERED_MERKLE_TREE = new anchor.web3.Account()

    await provider.connection.requestAirdrop(signer.publicKey, 1_000_000_000_000)
    var ADMIN_AUTH_KEYPAIRAccountInfo = await provider.connection.getAccountInfo(
          ADMIN_AUTH_KEYPAIR.publicKey
      )
    let MINT
    // create new token
    try {
    MINT = await token.createMint(
        provider.connection,
        signer,
        signer.publicKey,
        null,
        2
    );
  } catch(e) {
    console.log(e)
  }

    // create associated token account
    // tokenAccountA = await MINT.createAccount(owner.publicKey);

    const userTokenAccount = await token.getOrCreateAssociatedTokenAccount(
        provider.connection,
        signer,
        MINT,
        signer.publicKey
    );
    await token.mintTo(
      provider.connection,
      signer,
      MINT,
      userTokenAccount.address,
      signer.publicKey,
      1,
      []
    );
    let mintedInfo = await token.getAccount(
      provider.connection,
      userTokenAccount.address,
      token.TOKEN_PROGRAM_ID
    );

    // set Merkle tree token authority as authority

    // deposit token to Merkle tree account

    // create new Merkle tree for new token
      let merkle_tree = await solana.PublicKey.createWithSeed(
        ADMIN_AUTH_KEY,
        "usdc",
        merkleTreeProgram.programId,
      );
    let tokenAuthority = await solana.PublicKey.findProgramAddress(
        [anchor.utils.bytes.utf8.encode("spl")],
        merkleTreeProgram.programId
      )[0];

    let merkle_tree_pda_token = await solana.PublicKey.findProgramAddress(
        [merkle_tree.toBuffer(), anchor.utils.bytes.utf8.encode("merkle_tree_pda_token")],
        merkleTreeProgram.programId
      )[0];

    const pre_inserted_leaves_index = await solana.PublicKey.findProgramAddress(
        [merkle_tree.toBuffer()],
        merkleTreeProgram.programId
      )[0];

  let merkle_tree_pda_tokenInfo = await token.getAccount(
    provider.connection,
    merkle_tree_pda_token,
    token.TOKEN_PROGRAM_ID
  );
  assert(merkle_tree_pda_tokenInfo.amount, 1)
  // withdraw again

  let amount = new Uint8Array(8);
  amount[0]=1;
  try {
    const tx = await merkleTreeProgram.methods.withdrawSpl(
      Buffer.from(amount),
      new anchor.BN(0),
      new anchor.BN(1),
    ).accounts({
      authority: signer.publicKey,
      tokenAuthority: tokenAuthority,
      merkleTreeToken: merkle_tree_pda_token,
      token_program:token.TOKEN_PROGRAM_ID,
    }).remainingAccounts([
      { isSigner: false, isWritable: true, pubkey:userTokenAccount.address }
    ])
    .signers([signer])
    .rpc();

  } catch(e) {
    assert(e.error.errorCode.code == 'ConstraintAddress')
    assert(e.error.origin == 'authority')

  }


  });


  // Security of merkle tree functions insert nullifier, insert two leaves,
  // check merkle root, and withdrawal functions is based on the premise
  // that only registered verifiers can invoke these functions.
  // The functions trust the invocation and only perform minimal checks.
  // This test tries to invoke these functions from a non registered program.
  it("Cpi authority test", async () => {

      let mockNullifier = new Uint8Array(32).fill(2);
      let mockNullifierPdaPubkey = await solana.PublicKey.findProgramAddress(
          [Buffer.from(mockNullifier), anchor.utils.bytes.utf8.encode("nf")],
          merkleTreeProgram.programId)[0];

      // authority consistent with attackerProgram.programId
      let authority = await solana.PublicKey.findProgramAddress(
          [merkleTreeProgram.programId.toBuffer()],
          attackerProgram.programId)[0];

      // try calling from other program with verifier program AUTHORITY
      try {
        const tx = await attackerProgram.methods.testNullifierInsert(mockNullifier).accounts({
          authority: AUTHORITY,
          signingAddress: ADMIN_AUTH_KEY,
          nullifier0Pda: mockNullifierPdaPubkey,
          programMerkleTree:  merkleTreeProgram.programId,
          merkleTree: MERKLE_TREE_KEY,
          preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
        }).preInstructions([
          SystemProgram.transfer({
            fromPubkey: ADMIN_AUTH_KEY,
            toPubkey: AUTHORITY,
            lamports: await provider.connection.getMinimumBalanceForRentExemption(8),
          })
        ])
        .signers([ADMIN_AUTH_KEYPAIR])
        .rpc();

      } catch(e) {
        assert(e.logs.indexOf('Program 3KS2k14CmtnuVv2fvYcvdrNgC94Y11WETBpMUGgXyWZL failed: Cross-program invocation with unauthorized signer or writable account') != -1)
      }

      try {
        const tx = await attackerProgram.methods.testCheckMerkleRootExists(mockNullifier).accounts({
          authority: AUTHORITY,
          signingAddress: ADMIN_AUTH_KEY,
          nullifier0Pda: mockNullifierPdaPubkey,
          programMerkleTree:  merkleTreeProgram.programId,
          merkleTree: MERKLE_TREE_KEY,
          preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
        })
        .preInstructions([
          SystemProgram.transfer({
            fromPubkey: ADMIN_AUTH_KEY,
            toPubkey: AUTHORITY,
            lamports: await provider.connection.getMinimumBalanceForRentExemption(8),
          })
        ])
        .signers([ADMIN_AUTH_KEYPAIR])
        .rpc();

      } catch(e) {
        assert(e.logs.indexOf('Program 3KS2k14CmtnuVv2fvYcvdrNgC94Y11WETBpMUGgXyWZL failed: Cross-program invocation with unauthorized signer or writable account') != -1)
      }

      try {
        const tx = await attackerProgram.methods.testInsertTwoLeaves(mockNullifier).accounts({
          authority: AUTHORITY,
          signingAddress: ADMIN_AUTH_KEY,
          nullifier0Pda: mockNullifierPdaPubkey,
          programMerkleTree:  merkleTreeProgram.programId,
          merkleTree: MERKLE_TREE_KEY,
          preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
        }).preInstructions([
          SystemProgram.transfer({
            fromPubkey: ADMIN_AUTH_KEY,
            toPubkey: AUTHORITY,
            lamports: await provider.connection.getMinimumBalanceForRentExemption(8),
          })
        ])
        .signers([ADMIN_AUTH_KEYPAIR])
        .rpc();

      } catch(e) {
        assert(e.logs.indexOf('Program 3KS2k14CmtnuVv2fvYcvdrNgC94Y11WETBpMUGgXyWZL failed: Cross-program invocation with unauthorized signer or writable account') != -1)
      }

      try {
        const tx = await attackerProgram.methods.testWithdrawSol(mockNullifier).accounts({
          authority: AUTHORITY,
          signingAddress: ADMIN_AUTH_KEY,
          nullifier0Pda: mockNullifierPdaPubkey,
          programMerkleTree:  merkleTreeProgram.programId,
          merkleTree: MERKLE_TREE_KEY,
          preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
        }).preInstructions([
          SystemProgram.transfer({
            fromPubkey: ADMIN_AUTH_KEY,
            toPubkey: AUTHORITY,
            lamports: await provider.connection.getMinimumBalanceForRentExemption(8),
          })
        ])
        .signers([ADMIN_AUTH_KEYPAIR])
        .rpc();

      } catch(e) {
        assert(e.logs.indexOf('Program 3KS2k14CmtnuVv2fvYcvdrNgC94Y11WETBpMUGgXyWZL failed: Cross-program invocation with unauthorized signer or writable account') != -1)
      }

      try {
        const tx = await attackerProgram.methods.testNullifierInsert(mockNullifier).accounts({
          authority: authority,
          signingAddress: ADMIN_AUTH_KEY,
          nullifier0Pda: mockNullifierPdaPubkey,
          programMerkleTree:  merkleTreeProgram.programId,
          merkleTree: MERKLE_TREE_KEY,
          preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
        }).preInstructions([
          SystemProgram.transfer({
            fromPubkey: ADMIN_AUTH_KEY,
            toPubkey: authority,
            lamports: await provider.connection.getMinimumBalanceForRentExemption(8),
          })
        ])
        .signers([ADMIN_AUTH_KEYPAIR])
        .rpc();

      } catch(e) {
        assert(e.error.errorCode.code == 'ConstraintAddress')
        assert(e.error.origin == 'authority')
      }

      try {
        const tx = await attackerProgram.methods.testCheckMerkleRootExists(mockNullifier).accounts({
          authority: authority,
          signingAddress: ADMIN_AUTH_KEY,
          nullifier0Pda: mockNullifierPdaPubkey,
          programMerkleTree:  merkleTreeProgram.programId,
          merkleTree: MERKLE_TREE_KEY,
          preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
        })
        .preInstructions([
          SystemProgram.transfer({
            fromPubkey: ADMIN_AUTH_KEY,
            toPubkey: authority,
            lamports: await provider.connection.getMinimumBalanceForRentExemption(8),
          })
        ])
        .signers([ADMIN_AUTH_KEYPAIR])
        .rpc();

      } catch(e) {
        assert(e.error.errorCode.code == 'ConstraintAddress')
        assert(e.error.origin == 'authority')
      }


      try {
        const tx = await attackerProgram.methods.testInsertTwoLeaves(mockNullifier).accounts({
          authority: authority,
          signingAddress: ADMIN_AUTH_KEY,
          nullifier0Pda: mockNullifierPdaPubkey,
          programMerkleTree:  merkleTreeProgram.programId,
          merkleTree: MERKLE_TREE_KEY,
          preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
        }).preInstructions([
          SystemProgram.transfer({
            fromPubkey: ADMIN_AUTH_KEY,
            toPubkey: authority,
            lamports: await provider.connection.getMinimumBalanceForRentExemption(8),
          })
        ])
        .signers([ADMIN_AUTH_KEYPAIR])
        .rpc();

      } catch(e) {
        assert(e.error.errorCode.code == 'ConstraintAddress')
        assert(e.error.origin == 'authority')
      }

      try {
        const tx = await attackerProgram.methods.testWithdrawSol(mockNullifier).accounts({
          authority: authority,
          signingAddress: ADMIN_AUTH_KEY,
          nullifier0Pda: mockNullifierPdaPubkey,
          programMerkleTree:  merkleTreeProgram.programId,
          merkleTree: MERKLE_TREE_KEY,
          preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
        }).preInstructions([
          SystemProgram.transfer({
            fromPubkey: ADMIN_AUTH_KEY,
            toPubkey: authority,
            lamports: await provider.connection.getMinimumBalanceForRentExemption(8),
          })
        ])
        .signers([ADMIN_AUTH_KEYPAIR])
        .rpc();

      } catch(e) {
        assert(e.error.errorCode.code == 'ConstraintAddress')
        assert(e.error.origin == 'authority')
      }

    });

  // Escrow properties:
  // cannot be closed by anyone else but relayer and user
  // can be closed by user before computation starts and after timeout
  // can be closed by relayer at any time
  // if the relayer closes the escrow prior completion of the shielded transaction
  //    the relayer is only reimbursed for the transactions which are completed
  //    and does not receive the relayer fee
  it("Open and close escrow relayer", async () => {
    const origin = await newAccountWithLamports(provider.connection)
    const relayer = await newAccountWithLamports(provider.connection)
    let {ix_data, bytes} = read_and_parse_instruction_data_bytes();
    let tx_fee = 5000 * 50;
    let escrow_amount = U64.readLE(ix_data.extAmount, 0).toNumber() + tx_fee + U64.readLE(ix_data.fee, 0).toNumber()
    let pdas = await getPdaAddresses({
      tx_integrity_hash: ix_data.txIntegrityHash,
      nullifier0: ix_data.nullifier0,
      nullifier1: ix_data.nullifier1,
      leafLeft: ix_data.leafLeft,
      merkleTreeProgram,
      verifierProgram
    })
    var relayerInfoStart = await connection.getAccountInfo(
      relayer.publicKey
    )
    var userInfoStart = await connection.getAccountInfo(
      origin.publicKey
    )
    try{
      const tx = await verifierProgram.methods.createEscrow(
            ix_data.txIntegrityHash,
            new anchor.BN(tx_fee), // does not need to be checked since this tx is signed by the user
            ix_data.fee,
            new anchor.BN(I64.readLE(ix_data.extAmount,0).toString()),
            new anchor.BN(0)
      ).accounts(
          {
            feeEscrowState: pdas.feeEscrowStatePubkey,
            verifierState: pdas.verifierStatePubkey,
            signingAddress: relayer.publicKey,
            user:           origin.publicKey,
            systemProgram: SystemProgram.programId,
            token_program: token.TOKEN_PROGRAM_ID,
            tokenAuthority: AUTHORITY
          }
        ).signers([relayer, origin]).rpc();

    } catch (e) {
      console.log("e createEscrow", e)
    }



      await checkEscrowAccountCreated({
        connection: provider.connection,
        pdas,
        ix_data,
        user_pubkey: origin.publicKey,
        relayer_pubkey: relayer.publicKey,
        tx_fee: new anchor.BN(tx_fee),
        verifierProgram,
        rent: RENT_ESCROW

      });

      var relayerInfoMid = await connection.getAccountInfo(
        relayer.publicKey
      )
      var userInfoMid = await connection.getAccountInfo(
        origin.publicKey
      )
      var feeEscrowStatePubkeyInfoMid = await connection.getAccountInfo(
        pdas.feeEscrowStatePubkey
      )
      console.log()
      // Third party account tries to close escrow
      const attacker = await newAccountWithLamports(provider.connection)
      // Changed signer and relayer
      try {
        await verifierProgram.methods.closeEscrow(
          ).accounts(
            {
              signingAddress: attacker.publicKey,
              verifierState: pdas.verifierStatePubkey,
              systemProgram: SystemProgram.programId,
              feeEscrowState: pdas.feeEscrowStatePubkey,
              user:           origin.publicKey,
              relayer:        attacker.publicKey,
              token_program: token.TOKEN_PROGRAM_ID,
              tokenAuthority: AUTHORITY,
              systemProgram: SystemProgram.programId,

            }
          ).signers([attacker]).rpc()

    } catch (e) {
      assert(e.error.origin == 'relayer');
      assert(e.error.errorCode.code == 'ConstraintRaw');
    }
    // Changed signer and user
    try {
      await verifierProgram.methods.closeEscrow(
        ).accounts(
          {
            signingAddress: attacker.publicKey,
            verifierState: pdas.verifierStatePubkey,
            systemProgram: SystemProgram.programId,
            feeEscrowState: pdas.feeEscrowStatePubkey,
            user:           attacker.publicKey,
            relayer:        relayer.publicKey,
            token_program: token.TOKEN_PROGRAM_ID,
            tokenAuthority: AUTHORITY,
            systemProgram: SystemProgram.programId,
          }
        ).signers([attacker]).rpc()

  } catch (e) {
    assert(e.error.origin == 'user');
    assert(e.error.errorCode.code == 'ConstraintRaw');
  }
  // Changed user
  try {
    const tx1 = await verifierProgram.methods.closeEscrow(
    ).accounts(
      {
        signingAddress: relayer.publicKey,
        verifierState: pdas.verifierStatePubkey,
        systemProgram: SystemProgram.programId,
        feeEscrowState: pdas.feeEscrowStatePubkey,
        user:           attacker.publicKey,
        relayer:        relayer.publicKey,
        token_program: token.TOKEN_PROGRAM_ID,
        tokenAuthority: AUTHORITY,
        systemProgram: SystemProgram.programId,
      }
    ).signers([relayer]).rpc();
  } catch (e) {
    assert(e.error.origin == 'user');
    assert(e.error.errorCode.code == 'ConstraintRaw');
  }

  try {
      const tx1 = await verifierProgram.methods.closeEscrow(
      ).accounts(
        {
          signingAddress: relayer.publicKey,
          verifierState: pdas.verifierStatePubkey,
          systemProgram: SystemProgram.programId,
          feeEscrowState: pdas.feeEscrowStatePubkey,
          user:           origin.publicKey,
          relayer:        relayer.publicKey,
          token_program: token.TOKEN_PROGRAM_ID,
          tokenAuthority: AUTHORITY,
          systemProgram: SystemProgram.programId,
        }
      ).signers([relayer]).rpc();
    } catch (e) {
      console.log("e", e)
    }
    var feeEscrowStatePubkeyInfo = await connection.getAccountInfo(
      pdas.feeEscrowStatePubkey
    )
    var relayerInfoEnd = await connection.getAccountInfo(
      relayer.publicKey
    )
    var userInfoEnd = await connection.getAccountInfo(
      origin.publicKey
    )
    assert(feeEscrowStatePubkeyInfo == null, "Escrow account is not closed");
    // console.log("feeEscrowStatePubkeyInfo")
    // console.log("relayerInfo", relayerInfoEnd)
    // console.log("userInfo", userInfoEnd)
    // console.log(`relayerInfoStart ${relayerInfoStart.lamports} ${relayerInfoMid.lamports} ${Number(relayerInfoEnd.lamports)}`)
    // console.log(`relayerInfoStart ${relayerInfoStart.lamports} ${relayerInfoMid.lamports - relayerInfoStart.lamports} ${Number(relayerInfoEnd.lamports) - relayerInfoStart.lamports}`)
    assert(relayerInfoStart.lamports == relayerInfoEnd.lamports)
    // console.log(`userInfoStart  ${userInfoStart.lamports} ${userInfoMid.lamports} ${userInfoEnd.lamports}`)
    // console.log("ix_data.extAmount: ", U64.readLE(ix_data.extAmount, 0).toString())
    // console.log(`userInfoStart  ${userInfoStart.lamports} ${userInfoMid.lamports + U64.readLE(ix_data.extAmount, 0).toNumber()} ${Number(userInfoEnd.lamports) - userInfoStart.lamports}`)
    assert(userInfoStart.lamports == userInfoEnd.lamports)
    assert(feeEscrowStatePubkeyInfoMid.lamports == escrow_amount + RENT_ESCROW)
    assert(userInfoStart.lamports == userInfoMid.lamports + escrow_amount)


  })

  it("Open and close escrow token relayer", async () => {
    const origin = await newAccountWithLamports(provider.connection)
    const relayer = await newAccountWithLamports(provider.connection)
    let {ix_data, bytes} = read_and_parse_instruction_data_bytes();
    let tx_fee = 5000 * 50;
    let escrow_amount = U64.readLE(ix_data.extAmount, 0).toNumber() + tx_fee + U64.readLE(ix_data.fee, 0).toNumber()
    let pdas = await getPdaAddresses({
      tx_integrity_hash: ix_data.txIntegrityHash,
      nullifier0: ix_data.nullifier0,
      nullifier1: ix_data.nullifier1,
      leafLeft: ix_data.leafLeft,
      merkleTreeProgram,
      verifierProgram
    })
    var relayerInfoStart = await connection.getAccountInfo(
      relayer.publicKey
    )
    var userInfoStart = await connection.getAccountInfo(
      origin.publicKey
    )
    try{
      const tx = await verifierProgram.methods.createEscrow(
            ix_data.txIntegrityHash,
            new anchor.BN(tx_fee), // does not need to be checked since this tx is signed by the user
            ix_data.fee,
            new anchor.BN(I64.readLE(ix_data.extAmount,0).toString()),
            new anchor.BN(0)
      ).accounts(
          {
            feeEscrowState: pdas.feeEscrowStatePubkey,
            verifierState: pdas.verifierStatePubkey,
            signingAddress: relayer.publicKey,
            user:           origin.publicKey,
            systemProgram: SystemProgram.programId,
            token_program: token.TOKEN_PROGRAM_ID,
            tokenAuthority: AUTHORITY
          }
        ).signers([relayer, origin]).rpc();

    } catch (e) {
      console.log("e createEscrow", e)
    }



      await checkEscrowAccountCreated({
        connection: provider.connection,
        pdas,
        ix_data,
        user_pubkey: origin.publicKey,
        relayer_pubkey: relayer.publicKey,
        tx_fee: new anchor.BN(tx_fee),
        verifierProgram,
        rent: RENT_ESCROW
      });

      var relayerInfoMid = await connection.getAccountInfo(
        relayer.publicKey
      )
      var userInfoMid = await connection.getAccountInfo(
        origin.publicKey
      )
      var feeEscrowStatePubkeyInfoMid = await connection.getAccountInfo(
        pdas.feeEscrowStatePubkey
      )
      console.log()
      // Third party account tries to close escrow
      const attacker = await newAccountWithLamports(provider.connection)
      // Changed signer and relayer
      try {
        await verifierProgram.methods.closeEscrow(
          ).accounts(
            {
              signingAddress: attacker.publicKey,
              verifierState: pdas.verifierStatePubkey,
              systemProgram: SystemProgram.programId,
              feeEscrowState: pdas.feeEscrowStatePubkey,
              user:           origin.publicKey,
              relayer:        attacker.publicKey,
              token_program: token.TOKEN_PROGRAM_ID,
              tokenAuthority: AUTHORITY,
              systemProgram: SystemProgram.programId,

            }
          ).signers([attacker]).rpc()

    } catch (e) {
      assert(e.error.origin == 'relayer');
      assert(e.error.errorCode.code == 'ConstraintRaw');
    }
    // Changed signer and user
    try {
      await verifierProgram.methods.closeEscrow(
        ).accounts(
          {
            signingAddress: attacker.publicKey,
            verifierState: pdas.verifierStatePubkey,
            systemProgram: SystemProgram.programId,
            feeEscrowState: pdas.feeEscrowStatePubkey,
            user:           attacker.publicKey,
            relayer:        relayer.publicKey,
            token_program: token.TOKEN_PROGRAM_ID,
            tokenAuthority: AUTHORITY,
            systemProgram: SystemProgram.programId,
          }
        ).signers([attacker]).rpc()

  } catch (e) {
    assert(e.error.origin == 'user');
    assert(e.error.errorCode.code == 'ConstraintRaw');
  }
  // Changed user
  try {
    const tx1 = await verifierProgram.methods.closeEscrow(
    ).accounts(
      {
        signingAddress: relayer.publicKey,
        verifierState: pdas.verifierStatePubkey,
        systemProgram: SystemProgram.programId,
        feeEscrowState: pdas.feeEscrowStatePubkey,
        user:           attacker.publicKey,
        relayer:        relayer.publicKey,
        token_program: token.TOKEN_PROGRAM_ID,
        tokenAuthority: AUTHORITY,
        systemProgram: SystemProgram.programId,
      }
    ).signers([relayer]).rpc();
  } catch (e) {
    assert(e.error.origin == 'user');
    assert(e.error.errorCode.code == 'ConstraintRaw');
  }

  try {
      const tx1 = await verifierProgram.methods.closeEscrow(
      ).accounts(
        {
          signingAddress: relayer.publicKey,
          verifierState: pdas.verifierStatePubkey,
          systemProgram: SystemProgram.programId,
          feeEscrowState: pdas.feeEscrowStatePubkey,
          user:           origin.publicKey,
          relayer:        relayer.publicKey,
          token_program: token.TOKEN_PROGRAM_ID,
          tokenAuthority: AUTHORITY,
          systemProgram: SystemProgram.programId,
        }
      ).signers([relayer]).rpc();
    } catch (e) {
      console.log("e", e)
    }
    var feeEscrowStatePubkeyInfo = await connection.getAccountInfo(
      pdas.feeEscrowStatePubkey
    )
    var relayerInfoEnd = await connection.getAccountInfo(
      relayer.publicKey
    )
    var userInfoEnd = await connection.getAccountInfo(
      origin.publicKey
    )
    assert(feeEscrowStatePubkeyInfo == null, "Escrow account is not closed");
    // console.log("feeEscrowStatePubkeyInfo")
    // console.log("relayerInfo", relayerInfoEnd)
    // console.log("userInfo", userInfoEnd)
    // console.log(`relayerInfoStart ${relayerInfoStart.lamports} ${relayerInfoMid.lamports} ${Number(relayerInfoEnd.lamports)}`)
    // console.log(`relayerInfoStart ${relayerInfoStart.lamports} ${relayerInfoMid.lamports - relayerInfoStart.lamports} ${Number(relayerInfoEnd.lamports) - relayerInfoStart.lamports}`)
    assert(relayerInfoStart.lamports == relayerInfoEnd.lamports)
    // console.log(`userInfoStart  ${userInfoStart.lamports} ${userInfoMid.lamports} ${userInfoEnd.lamports}`)
    // console.log("ix_data.extAmount: ", U64.readLE(ix_data.extAmount, 0).toString())
    // console.log(`userInfoStart  ${userInfoStart.lamports} ${userInfoMid.lamports + U64.readLE(ix_data.extAmount, 0).toNumber()} ${Number(userInfoEnd.lamports) - userInfoStart.lamports}`)
    assert(userInfoStart.lamports == userInfoEnd.lamports)
    assert(feeEscrowStatePubkeyInfoMid.lamports == escrow_amount + RENT_ESCROW)
    assert(userInfoStart.lamports == userInfoMid.lamports + escrow_amount)


  })

  // User can close an escrow account created by a relayer
  it("Open and close escrow user", async () => {
    const origin = await newAccountWithLamports(provider.connection)
    const relayer = await newAccountWithLamports(provider.connection)
    let {ix_data, bytes} = read_and_parse_instruction_data_bytes();
    let tx_fee = 5000 * 50;
    let escrow_amount = U64.readLE(ix_data.extAmount, 0).toNumber() + tx_fee + U64.readLE(ix_data.fee, 0).toNumber()
    let pdas = await getPdaAddresses({
      tx_integrity_hash: ix_data.txIntegrityHash,
      nullifier0: ix_data.nullifier0,
      nullifier1: ix_data.nullifier1,
      leafLeft: ix_data.leafLeft,
      merkleTreeProgram,
      verifierProgram
    })
    var relayerInfoStart = await connection.getAccountInfo(
      relayer.publicKey
    )
    var userInfoStart = await connection.getAccountInfo(
      origin.publicKey
    )
    const tx = await verifierProgram.methods.createEscrow(
          ix_data.txIntegrityHash,
          new anchor.BN(tx_fee), // does not need to be checked since this tx is signed by the user
          ix_data.fee,
          new anchor.BN(I64.readLE(ix_data.extAmount,0).toString()),
          new anchor.BN(0)
    ).accounts(
      {
        signingAddress: relayer.publicKey,
        verifierState: pdas.verifierStatePubkey,
        systemProgram: SystemProgram.programId,
        feeEscrowState: pdas.feeEscrowStatePubkey,
        user:           origin.publicKey,
        token_program: token.TOKEN_PROGRAM_ID,
        tokenAuthority: AUTHORITY
      }
    ).signers([relayer, origin]).rpc();

      await checkEscrowAccountCreated({
        connection: provider.connection,
        pdas,
        ix_data,
        user_pubkey: origin.publicKey,
        relayer_pubkey: relayer.publicKey,
        tx_fee: new anchor.BN(tx_fee),
        verifierProgram,
        rent: RENT_ESCROW
      });

      var relayerInfoMid = await connection.getAccountInfo(
        relayer.publicKey
      )
      var userInfoMid = await connection.getAccountInfo(
        origin.publicKey
      )
      var feeEscrowStatePubkeyInfoMid = await connection.getAccountInfo(
        pdas.feeEscrowStatePubkey
      )

    try {
      const tx1 = await verifierProgram.methods.closeEscrow(
      ).accounts(
        {
          signingAddress: origin.publicKey,
          verifierState: pdas.verifierStatePubkey,
          systemProgram: SystemProgram.programId,
          feeEscrowState: pdas.feeEscrowStatePubkey,
          user:           origin.publicKey,
          relayer:        relayer.publicKey,
          token_program: token.TOKEN_PROGRAM_ID,
          tokenAuthority: AUTHORITY,
          systemProgram: SystemProgram.programId,
        }
      ).signers([origin]).rpc();
    } catch (e) {
      console.log("e", e)
    }
    var feeEscrowStatePubkeyInfo = await connection.getAccountInfo(
      pdas.feeEscrowStatePubkey
    )
    var relayerInfoEnd = await connection.getAccountInfo(relayer.publicKey)
    var userInfoEnd = await connection.getAccountInfo(origin.publicKey)

    assert(feeEscrowStatePubkeyInfo == null, "Escrow account is not closed");

    assert(userInfoStart.lamports == userInfoEnd.lamports)
    assert(relayerInfoStart.lamports == relayerInfoEnd.lamports)
    assert(feeEscrowStatePubkeyInfoMid.lamports == escrow_amount + RENT_ESCROW)
    assert(userInfoStart.lamports == userInfoMid.lamports + escrow_amount)
  })

  // Creates an escrow, verifier state, executes 10 deposit transactions,
  // tries to close the escrow with user account (should fail),
  // and closes the escrow with relayer account.
  it("Open and close escrow after 10 tx", async () => {
    const origin = await newAccountWithLamports(provider.connection)
    const relayer = await newAccountWithLamports(provider.connection)
    let Keypair = new light.Keypair()
    let merkle_tree_pubkey = MERKLE_TREE_KEY
    let tx_fee = 5000 * 50;


    provider.wallet.payer = relayer
    let nr_tx = 10;
    let tx_cost = (nr_tx + 1) * 5000
    let merkleTree = await light.buildMerkelTree(provider.connection, MERKLE_TREE_KEY.toBytes());

    let deposit_utxo1 = new light.Utxo(BigNumber.from(amount), Keypair)
    let deposit_utxo2 = new light.Utxo(BigNumber.from(amount), Keypair)

    let inputUtxos = [new light.Utxo(), new light.Utxo()]
    let outputUtxos = [deposit_utxo1, deposit_utxo2 ]

    const data = await light.getProof(
      inputUtxos,
      outputUtxos,
      merkleTree,
      0,
      MERKLE_TREE_KEY.toBytes(),
      deposit_utxo1.amount.add(deposit_utxo2.amount),
      U64(0),
      MERKLE_TREE_PDA_TOKEN.toBase58(),
      relayer.publicKey.toBase58(),
      'DEPOSIT',
      encryptionKeypair
    )
    let ix_data = parse_instruction_data_bytes(data);

    let escrow_amount = U64.readLE(ix_data.extAmount, 0).toNumber() + tx_fee + U64.readLE(ix_data.fee, 0).toNumber()

    let pdas = await getPdaAddresses({
      tx_integrity_hash: ix_data.txIntegrityHash,
      nullifier0: ix_data.nullifier0,
      nullifier1: ix_data.nullifier1,
      leafLeft: ix_data.leafLeft,
      merkleTreeProgram,
      verifierProgram
    })

    var relayerInfoStart = await connection.getAccountInfo(relayer.publicKey)
    var userInfoStart = await connection.getAccountInfo(origin.publicKey)

    const tx = await verifierProgram.methods.createEscrow(
          ix_data.txIntegrityHash,
          new anchor.BN(tx_fee), // does not need to be checked since this tx is signed by the user
          ix_data.fee,
          new anchor.BN(I64.readLE(ix_data.extAmount,0).toString()),
          new anchor.BN(0)
    ).accounts(
        {
          signingAddress: relayer.publicKey,
          verifierState: pdas.verifierStatePubkey,
          systemProgram: SystemProgram.programId,
          feeEscrowState: pdas.feeEscrowStatePubkey,
          user:           origin.publicKey,
          token_program: token.TOKEN_PROGRAM_ID,
          tokenAuthority: AUTHORITY
        }
      ).signers([relayer, origin]).rpc();

      await checkEscrowAccountCreated({
        connection: provider.connection,
        pdas,
        ix_data,
        user_pubkey: origin.publicKey,
        relayer_pubkey: relayer.publicKey,
        tx_fee: new anchor.BN(tx_fee),
        verifierProgram,
        rent: RENT_ESCROW
      });

      var relayerInfoMid = await connection.getAccountInfo(
        relayer.publicKey
      )

      assert(relayerInfoMid.lamports == relayerInfoStart.lamports - RENT_ESCROW - RENT_VERIFIER)
      var userInfoMid = await connection.getAccountInfo(
        origin.publicKey
      )
      var feeEscrowStatePubkeyInfoMid = await connection.getAccountInfo(
        pdas.feeEscrowStatePubkey
      )

      try  {
        const tx = await verifierProgram.methods.createVerifierState(
              ix_data.proofAbc,
              ix_data.rootHash,
              ix_data.amount,
              ix_data.txIntegrityHash,
              ix_data.nullifier0,
              ix_data.nullifier1,
              ix_data.leafRight,
              ix_data.leafLeft,
              ix_data.recipient,
              ix_data.extAmount,
              ix_data.relayer,
              ix_data.fee,
              ix_data.encryptedUtxos,
              ix_data.merkleTreeIndex
              ).accounts(
                  {
                    signingAddress: relayer.publicKey,
                    verifierState: pdas.verifierStatePubkey,
                    systemProgram: SystemProgram.programId,
                    merkleTree: merkle_tree_pubkey,
                    programMerkleTree:  merkleTreeProgram.programId,
                  }
              ).signers([relayer]).transaction()
            await provider.sendAndConfirm(tx, [relayer])
      } catch(e) {
        console.log(e)
        process.exit()
      }

      checkVerifierStateAccountCreated({
        connection:connection,
        pda: pdas.verifierStatePubkey,
        ix_data,
        relayer_pubkey:relayer.publicKey
      })

      await executeXComputeTransactions({
        number_of_transactions: nr_tx,
        signer: relayer,
        pdas: pdas,
        program: verifierProgram,
        provider:provider
      })
      var relayerInfoMid2 = await connection.getAccountInfo(
        relayer.publicKey
      )
    assert(relayerInfoMid.lamports - tx_cost == relayerInfoMid2.lamports)

    // Try to close escrow with user account should fail
    try {
      const txUserClose = await verifierProgram.methods.closeEscrow(
      ).accounts(
        {
          signingAddress: origin.publicKey,
          verifierState: pdas.verifierStatePubkey,
          systemProgram: SystemProgram.programId,
          feeEscrowState: pdas.feeEscrowStatePubkey,
          user:           origin.publicKey,
          relayer:        relayer.publicKey,
          token_program: token.TOKEN_PROGRAM_ID,
          tokenAuthority: AUTHORITY,
          systemProgram: SystemProgram.programId,
        }
      ).signers([origin]).transaction();
      await provider.sendAndConfirm(txUserClose, [origin])

    } catch (e) {
      // console.log(e)
      assert(e.logs[2] == 'Program log: AnchorError thrown in programs/verifier_program/src/escrow/close_escrow_state.rs:51. Error Code: NotTimedOut. Error Number: 6006. Error Message: Closing escrow state failed relayer not timed out..');
    }

    const tx1relayer = await verifierProgram.methods.closeEscrow(
    ).accounts(
      {
        signingAddress: relayer.publicKey,
        verifierState: pdas.verifierStatePubkey,
        systemProgram: SystemProgram.programId,
        feeEscrowState: pdas.feeEscrowStatePubkey,
        user:           origin.publicKey,
        relayer:        relayer.publicKey,
        token_program: token.TOKEN_PROGRAM_ID,
        tokenAuthority: AUTHORITY,
        systemProgram: SystemProgram.programId,
      }
    ).signers([relayer]).transaction();
    await provider.sendAndConfirm(tx1relayer, [relayer])

    var feeEscrowStatePubkeyInfo = await connection.getAccountInfo(
      pdas.feeEscrowStatePubkey
    )
    var relayerInfoEnd = await connection.getAccountInfo(
      relayer.publicKey
    )
    var userInfoEnd = await connection.getAccountInfo(
      origin.publicKey
    )

    assert(feeEscrowStatePubkeyInfo == null, "Escrow account is not closed");
    // console.log("feeEscrowStatePubkeyInfo")
    // console.log("relayerInfoEnd", relayerInfoEnd)
    // console.log("userInfoEnd", userInfoEnd)
    // console.log(`relayerInfoStart ${relayerInfoStart.lamports} ${relayerInfoMid.lamports} ${Number(relayerInfoEnd.lamports)}`)
    // console.log(`relayerInfoStart ${relayerInfoStart.lamports} ${relayerInfoMid.lamports - relayerInfoStart.lamports} ${Number(relayerInfoEnd.lamports) - relayerInfoStart.lamports}`)
    assert(relayerInfoStart.lamports - 5000 == Number(relayerInfoEnd.lamports))

    // console.log(`userInfoStart  ${userInfoStart.lamports} ${userInfoMid.lamports} ${userInfoEnd.lamports}`)
    // console.log("ix_data.extAmount: ", U64.readLE(ix_data.extAmount, 0).toString())
    // console.log(`userInfoStart  ${userInfoStart.lamports} ${userInfoMid.lamports + U64.readLE(ix_data.extAmount, 0).toNumber()} ${Number(userInfoEnd.lamports) - userInfoStart.lamports}`)
    //
    // console.log("feeEscrowStatePubkeyInfoMid: ", feeEscrowStatePubkeyInfoMid.lamports)
    // console.log("rent: ", rent)
    // console.log("escrow_amount: ", escrow_amount)
    // console.log(`feeEscrowStatePubkeyInfoMid.lamports : ${feeEscrowStatePubkeyInfoMid.lamports} ${escrow_amount RENT_ESCROW} `)
    assert(userInfoStart.lamports - tx_cost == userInfoEnd.lamports)
    assert(feeEscrowStatePubkeyInfoMid.lamports == escrow_amount + RENT_ESCROW)
    assert(userInfoStart.lamports == userInfoMid.lamports + escrow_amount)

  })

  it("reinit verifier state after 10 tx", async () => {
    const origin = await newAccountWithLamports(provider.connection)
    const relayer = await newAccountWithLamports(provider.connection)
    let Keypair = new light.Keypair()
    let merkle_tree_pubkey = MERKLE_TREE_KEY
    let tx_fee = 5000 * 50;


    provider.wallet.payer = relayer
    let nr_tx = 10;
    let tx_cost = (nr_tx + 1) * 5000
    let merkleTree = await light.buildMerkelTree(provider.connection, MERKLE_TREE_KEY.toBytes());

    let deposit_utxo1 = new light.Utxo(BigNumber.from(amount), Keypair)
    let deposit_utxo2 = new light.Utxo(BigNumber.from(amount), Keypair)

    let inputUtxos = [new light.Utxo(), new light.Utxo()]
    let outputUtxos = [deposit_utxo1, deposit_utxo2 ]

    const data = await light.getProof(
      inputUtxos,
      outputUtxos,
      merkleTree,
      0,
      MERKLE_TREE_KEY.toBytes(),
      deposit_utxo1.amount.add(deposit_utxo2.amount),
      U64(0),
      MERKLE_TREE_PDA_TOKEN.toBase58(),
      relayer.publicKey.toBase58(),
      'DEPOSIT',
      encryptionKeypair
    )
    let ix_data = parse_instruction_data_bytes(data);
    IX_DATA = ix_data
    SIGNER = relayer
    let escrow_amount = U64.readLE(ix_data.extAmount, 0).toNumber() + tx_fee + U64.readLE(ix_data.fee, 0).toNumber()

    let pdas = await getPdaAddresses({
      tx_integrity_hash: ix_data.txIntegrityHash,
      nullifier0: ix_data.nullifier0,
      nullifier1: ix_data.nullifier1,
      leafLeft: ix_data.leafLeft,
      merkleTreeProgram,
      verifierProgram
    })
    var relayerInfoStart = await connection.getAccountInfo(relayer.publicKey)
    var userInfoStart = await connection.getAccountInfo(origin.publicKey)

    try{
      const tx = await verifierProgram.methods.createEscrow(
            ix_data.txIntegrityHash,
            new anchor.BN(tx_fee), // does not need to be checked since this tx is signed by the user
            ix_data.fee,
            new anchor.BN(I64.readLE(ix_data.extAmount,0).toString()),
            new anchor.BN(0)
      ).accounts(
          {
            signingAddress: relayer.publicKey,
            verifierState: pdas.verifierStatePubkey,
            systemProgram: SystemProgram.programId,
            feeEscrowState: pdas.feeEscrowStatePubkey,
            user:           origin.publicKey,
            token_program: token.TOKEN_PROGRAM_ID,
            tokenAuthority: AUTHORITY
          }
        ).signers([relayer, origin]).rpc();
    } catch (e) {
      console.log("e", e)
    }

      await checkEscrowAccountCreated({
        connection: provider.connection,
        pdas,
        ix_data,
        user_pubkey: origin.publicKey,
        relayer_pubkey: relayer.publicKey,
        tx_fee: new anchor.BN(tx_fee),
        verifierProgram,
        rent: RENT_ESCROW
      });

      var relayerInfoMid = await connection.getAccountInfo(
        relayer.publicKey
      )
      assert(relayerInfoMid.lamports == relayerInfoStart.lamports - RENT_ESCROW - RENT_VERIFIER)
      var userInfoMid = await connection.getAccountInfo(
        origin.publicKey
      )
      var feeEscrowStatePubkeyInfoMid = await connection.getAccountInfo(
        pdas.feeEscrowStatePubkey
      )

      const tx = await verifierProgram.methods.createVerifierState(
            ix_data.proofAbc,
            ix_data.rootHash,
            ix_data.amount,
            ix_data.txIntegrityHash,
            ix_data.nullifier0,
            ix_data.nullifier1,
            ix_data.leafRight,
            ix_data.leafLeft,
            ix_data.recipient,
            ix_data.extAmount,
            ix_data.relayer,
            ix_data.fee,
            ix_data.encryptedUtxos,
            ix_data.merkleTreeIndex
            ).accounts(
                {
                  signingAddress: relayer.publicKey,
                  verifierState: pdas.verifierStatePubkey,
                  systemProgram: SystemProgram.programId,
                  merkleTree: merkle_tree_pubkey,
                  programMerkleTree:  merkleTreeProgram.programId,
                }
            ).signers([relayer]).transaction()
        await provider.sendAndConfirm(tx, [relayer])


      checkVerifierStateAccountCreated({
        connection:connection,
        pda: pdas.verifierStatePubkey,
        ix_data,
        relayer_pubkey:relayer.publicKey
      })

      await executeXComputeTransactions({
        number_of_transactions: nr_tx,
        signer: relayer,
        pdas: pdas,
        program: verifierProgram,
        provider:provider
      })
      var verifierStatePrior = await connection.getAccountInfo(
        pdas.verifierStatePubkey
      )
      try  {
        const tx = await verifierProgram.methods.createVerifierState(
              ix_data.proofAbc,
              ix_data.rootHash,
              ix_data.amount,
              ix_data.txIntegrityHash,
              ix_data.nullifier0,
              ix_data.nullifier1,
              ix_data.leafRight,
              ix_data.leafLeft,
              ix_data.recipient,
              ix_data.extAmount,
              ix_data.relayer,
              ix_data.fee,
              ix_data.encryptedUtxos,
              ix_data.merkleTreeIndex
              ).accounts(
                  {
                    signingAddress: relayer.publicKey,
                    verifierState: pdas.verifierStatePubkey,
                    systemProgram: SystemProgram.programId,
                    merkleTree: merkle_tree_pubkey,
                    programMerkleTree:  merkleTreeProgram.programId,
                  }
              ).signers([relayer]).transaction()
            await provider.sendAndConfirm(tx, [relayer])
      } catch(e) {
        // console.log(e)
        assert(e.logs.indexOf('Program log: AnchorError thrown in programs/verifier_program/src/groth16_verifier/create_verifier_state.rs:65. Error Code: VerifierStateAlreadyInitialized. Error Number: 6008. Error Message: VerifierStateAlreadyInitialized.') != -1)
      }
    var verifierState = await connection.getAccountInfo(
      pdas.verifierStatePubkey
    )
    const accountPriorUpdate = verifierProgram.account.verifierState._coder.accounts.decode('VerifierState', verifierStatePrior.data);

    let accountAfterUpdate = verifierProgram.account.verifierState._coder.accounts.decode('VerifierState', verifierState.data);
    assert(accountPriorUpdate.currentInstructionIndex.toString() == accountAfterUpdate.currentInstructionIndex.toString());

  })

  it("Signer is consistent during compute instructions", async () => {
    const origin = await newAccountWithLamports(provider.connection)
    const relayer = await newAccountWithLamports(provider.connection)
    let Keypair = new light.Keypair()
    let merkle_tree_pubkey = MERKLE_TREE_KEY
    let tx_fee = 5000 * 50;

    provider.wallet.payer = relayer
    let nr_tx = 10;
    let tx_cost = (nr_tx + 1) * 5000
    let merkleTree = await light.buildMerkelTree(provider.connection, MERKLE_TREE_KEY.toBytes());
    let pdas = await getPdaAddresses({
      tx_integrity_hash: IX_DATA.txIntegrityHash,
      nullifier0: IX_DATA.nullifier0,
      nullifier1: IX_DATA.nullifier1,
      leafLeft: IX_DATA.leafLeft,
      merkleTreeProgram,
      verifierProgram
    })
    var relayerInfoStart = await connection.getAccountInfo(relayer.publicKey)
    var userInfoStart = await connection.getAccountInfo(origin.publicKey)

      var verifierStatePrior = await connection.getAccountInfo(
        pdas.verifierStatePubkey
      )
      try {
        await executeXComputeTransactions({
          number_of_transactions: nr_tx,
          signer: origin,
          pdas: pdas,
          program: verifierProgram,
          provider:provider
        })
      } catch(e) {
        assert(e.logs[2] == 'Program log: AnchorError caused by account: signing_address. Error Code: ConstraintAddress. Error Number: 2012. Error Message: An address constraint was violated.')
      }

    var verifierState = await connection.getAccountInfo(
      pdas.verifierStatePubkey
    )

    const accountPriorUpdate = verifierProgram.account.verifierState._coder.accounts.decode('VerifierState', verifierStatePrior.data);
    let accountAfterUpdate = verifierProgram.account.verifierState._coder.accounts.decode('VerifierState', verifierState.data);
    assert(accountPriorUpdate.currentInstructionIndex.toString() == accountAfterUpdate.currentInstructionIndex.toString());

  })

  it("Invoke last transaction with wrong instruction index", async () => {
      const origin = await newAccountWithLamports(provider.connection)
      const relayer = await newAccountWithLamports(provider.connection)
      let Keypair = new light.Keypair()
      let merkle_tree_pubkey = MERKLE_TREE_KEY
      let authority = AUTHORITY
      let preInsertedLeavesIndex = PRE_INSERTED_LEAVES_INDEX

      let tx_fee = 5000 * 50;

      provider.wallet.payer = relayer
      let nr_tx = 10;
      let tx_cost = (nr_tx + 1) * 5000

      let merkleTree = await light.buildMerkelTree(provider.connection, MERKLE_TREE_KEY.toBytes());


      let pdas = await getPdaAddresses({
        tx_integrity_hash: IX_DATA.txIntegrityHash,
        nullifier0: IX_DATA.nullifier0,
        nullifier1: IX_DATA.nullifier1,
        leafLeft: IX_DATA.leafLeft,
        merkleTreeProgram,
        verifierProgram
      })
      var relayerInfoStart = await connection.getAccountInfo(relayer.publicKey)
      var userInfoStart = await connection.getAccountInfo(origin.publicKey)

      var verifierStatePrior = await connection.getAccountInfo(
        pdas.verifierStatePubkey
      )

      try {
        const txLastTransaction = await verifierProgram.methods.lastTransactionDeposit(
              ).accounts(
                  {
                    signingAddress: relayer.publicKey,
                    verifierState: pdas.verifierStatePubkey,
                    // merkleTreeUpdateState:pdas.merkleTreeUpdateState,
                    systemProgram: SystemProgram.programId,
                    programMerkleTree: merkleTreeProgram.programId,
                    rent: DEFAULT_PROGRAMS.rent,
                    nullifier0Pda: pdas.nullifier0PdaPubkey,
                    nullifier1Pda: pdas.nullifier1PdaPubkey,
                    twoLeavesPda: pdas.leavesPdaPubkey,
                    escrowPda: pdas.escrowPdaPubkey,
                    merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
                    userAccount: origin.publicKey,
                    merkleTree: merkle_tree_pubkey,
                    feeEscrowState: pdas.feeEscrowStatePubkey,
                    merkleTreeProgram:  merkleTreeProgram.programId,
                    preInsertedLeavesIndex: preInsertedLeavesIndex,
                    authority: authority
                  }
                ).preInstructions([
                  SystemProgram.transfer({
                    fromPubkey: relayer.publicKey,
                    toPubkey: authority,
                    lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
                  })
                ]).signers([relayer]).rpc()

        } catch(e) {
          assert(e.error.origin == 'signing_address');
          assert(e.error.errorCode.code == 'ConstraintAddress');
      }
      try {
        const txLastTransaction = await verifierProgram.methods.lastTransactionDeposit(
              ).accounts(
                  {
                    signingAddress: SIGNER.publicKey,
                    verifierState: pdas.verifierStatePubkey,
                    // merkleTreeUpdateState:pdas.merkleTreeUpdateState,
                    systemProgram: SystemProgram.programId,
                    programMerkleTree: merkleTreeProgram.programId,
                    rent: DEFAULT_PROGRAMS.rent,
                    nullifier0Pda: pdas.nullifier0PdaPubkey,
                    nullifier1Pda: pdas.nullifier1PdaPubkey,
                    twoLeavesPda: pdas.leavesPdaPubkey,
                    escrowPda: pdas.escrowPdaPubkey,
                    merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
                    userAccount: origin.publicKey,
                    merkleTree: merkle_tree_pubkey,
                    feeEscrowState: pdas.feeEscrowStatePubkey,
                    merkleTreeProgram:  merkleTreeProgram.programId,
                    preInsertedLeavesIndex: preInsertedLeavesIndex,
                    authority: authority
                  }
                ).preInstructions([
                  SystemProgram.transfer({
                    fromPubkey: SIGNER.publicKey,
                    toPubkey: authority,
                    lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
                  })
                ]).signers([SIGNER]).rpc()

        } catch(e) {
          assert(e.error.errorCode.code == 'NotLastTransactionState');
      }
      var verifierState = await connection.getAccountInfo(
        pdas.verifierStatePubkey
      )

      const accountPriorUpdate = verifierProgram.account.verifierState._coder.accounts.decode('VerifierState', verifierStatePrior.data);
      const accountAfterUpdate = verifierProgram.account.verifierState._coder.accounts.decode('VerifierState', verifierState.data);
      assert(accountPriorUpdate.currentInstructionIndex.toString() == accountAfterUpdate.currentInstructionIndex.toString());

    })

  it("Last tx deposit with wrong accounts", async () => {
        const userAccount = await newAccountWithLamports(provider.connection)
        const recipientWithdrawal = await newAccountWithLamports(provider.connection)
        var signer
        var pdas
        var leavesPdas = []
        var utxos = []

        //
        // *
        // * test deposit
        // *
        //

        let merkleTree = await light.buildMerkelTree(provider.connection, MERKLE_TREE_KEY.toBytes());

        let Keypair = new light.Keypair()

        for (var i= 0; i < 1; i++) {
          try {
            let res = await deposit({
              Keypair,
              encryptionKeypair,
              amount: 1_000_000_00,// amount
              connection: provider.connection,
              merkleTree,
              merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
              userAccount,
              verifierProgram,
              merkleTreeProgram,
              authority: AUTHORITY,
              preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
              merkle_tree_pubkey: MERKLE_TREE_KEY,
              provider,
              relayerFee,
              lastTx: false,
              rent: RENT_ESCROW
            })
            leavesPdas.push({ isSigner: false, isWritable: true, pubkey: res[0]})
            utxos.push(res[1])
            signer = res[2]
            pdas = res[3]
          } catch(e) {
            console.log(e)
          }


        }
        let escrowAccountInfo = await provider.connection.getAccountInfo(pdas.feeEscrowStatePubkey)
        // wrong recipient
        const maliciousRecipient = await newProgramOwnedAccount({ connection: provider.connection,owner: merkleTreeProgram})
        try {
          const txLastTransaction = await verifierProgram.methods.lastTransactionDeposit(
          ).accounts(
            {
              signingAddress: signer.publicKey,
              nullifier0Pda: pdas.nullifier0PdaPubkey,
              nullifier1Pda: pdas.nullifier1PdaPubkey,
              twoLeavesPda: pdas.leavesPdaPubkey,
              verifierState: pdas.verifierStatePubkey,
              programMerkleTree: merkleTreeProgram.programId,
              systemProgram: SystemProgram.programId,
              rent: DEFAULT_PROGRAMS.rent,
              merkleTreePdaToken: maliciousRecipient.publicKey,
              merkleTree: MERKLE_TREE_KEY,
              feeEscrowState: pdas.feeEscrowStatePubkey,
              preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
              authority: AUTHORITY
            }
          ).preInstructions([
            SystemProgram.transfer({
              fromPubkey: signer.publicKey,
              toPubkey: AUTHORITY,
              lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
            })
          ]).signers([signer]).rpc()
        } catch(e) {
          assert(e.error.origin == 'merkle_tree_pda_token')
        }
        // try with unregistered merkle tree
        try {
          const txLastTransaction = await verifierProgram.methods.lastTransactionDeposit(
          ).accounts(
            {
              signingAddress: signer.publicKey,
              nullifier0Pda: pdas.nullifier0PdaPubkey,
              nullifier1Pda: pdas.nullifier1PdaPubkey,
              twoLeavesPda: pdas.leavesPdaPubkey,
              verifierState: pdas.verifierStatePubkey,
              programMerkleTree: merkleTreeProgram.programId,
              systemProgram: SystemProgram.programId,
              rent: DEFAULT_PROGRAMS.rent,
              merkleTreePdaToken: UNREGISTERED_MERKLE_TREE_PDA_TOKEN,
              merkleTree: UNREGISTERED_MERKLE_TREE.publicKey,
              feeEscrowState: pdas.feeEscrowStatePubkey,
              preInsertedLeavesIndex: UNREGISTERED_PRE_INSERTED_LEAVES_INDEX,
              authority: AUTHORITY
            }
          ).preInstructions([
            SystemProgram.transfer({
              fromPubkey: signer.publicKey,
              toPubkey: AUTHORITY,
              lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
            })
          ]).signers([signer]).rpc()
        } catch(e) {
          assert(e.error.origin == 'merkle_tree_pda_token')
        }
        // try with wrong PRE_INSERTED_LEAVES_INDEX
        try {
          const txLastTransaction = await verifierProgram.methods.lastTransactionDeposit(
          ).accounts(
            {
              signingAddress: signer.publicKey,
              nullifier0Pda: pdas.nullifier0PdaPubkey,
              nullifier1Pda: pdas.nullifier1PdaPubkey,
              twoLeavesPda: pdas.leavesPdaPubkey,
              verifierState: pdas.verifierStatePubkey,
              programMerkleTree: merkleTreeProgram.programId,
              systemProgram: SystemProgram.programId,
              rent: DEFAULT_PROGRAMS.rent,
              merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
              merkleTree: MERKLE_TREE_KEY,
              feeEscrowState: pdas.feeEscrowStatePubkey,
              preInsertedLeavesIndex: UNREGISTERED_PRE_INSERTED_LEAVES_INDEX,
              authority: AUTHORITY
            }
          ).preInstructions([
            SystemProgram.transfer({
              fromPubkey: signer.publicKey,
              toPubkey: AUTHORITY,
              lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
            })
          ]).signers([signer]).rpc()
        } catch(e) {
          // console.log(e)
          assert(e.error.origin == 'pre_inserted_leaves_index')
        }

        // try with wrong leaves account
        const maliciousLeaf = await solana.PublicKey.findProgramAddress([Buffer.from(new Uint8Array(32).fill(4)), anchor.utils.bytes.utf8.encode("leaves")],
        merkleTreeProgram.programId)[0]
        try {
          const txLastTransaction = await verifierProgram.methods.lastTransactionDeposit(
          ).accounts(
            {
              signingAddress: signer.publicKey,
              nullifier0Pda: pdas.nullifier0PdaPubkey,
              nullifier1Pda: pdas.nullifier1PdaPubkey,
              twoLeavesPda: maliciousLeaf,
              verifierState: pdas.verifierStatePubkey,
              programMerkleTree: merkleTreeProgram.programId,
              systemProgram: SystemProgram.programId,
              rent: DEFAULT_PROGRAMS.rent,
              merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
              merkleTree: MERKLE_TREE_KEY,
              feeEscrowState: pdas.feeEscrowStatePubkey,
              preInsertedLeavesIndex: UNREGISTERED_PRE_INSERTED_LEAVES_INDEX,
              authority: AUTHORITY
            }
          ).preInstructions([
            SystemProgram.transfer({
              fromPubkey: signer.publicKey,
              toPubkey: AUTHORITY,
              lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
            })
          ]).signers([signer]).rpc()
        } catch(e) {
          assert(e.error.origin == 'two_leaves_pda')
        }

        // try with wrong nullifer account
        const maliciousNullifier = await solana.PublicKey.findProgramAddress([Buffer.from(new Uint8Array(32).fill(4)), anchor.utils.bytes.utf8.encode("nf")],
        merkleTreeProgram.programId)[0]

        try {
          const txLastTransaction = await verifierProgram.methods.lastTransactionDeposit(
          ).accounts(
            {
              signingAddress: signer.publicKey,
              nullifier0Pda: maliciousNullifier,
              nullifier1Pda: pdas.nullifier1PdaPubkey,
              twoLeavesPda: pdas.leavesPdaPubkey,
              verifierState: pdas.verifierStatePubkey,
              programMerkleTree: merkleTreeProgram.programId,
              systemProgram: SystemProgram.programId,
              rent: DEFAULT_PROGRAMS.rent,
              merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
              merkleTree: MERKLE_TREE_KEY,
              feeEscrowState: pdas.feeEscrowStatePubkey,
              preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
              authority: AUTHORITY
            }
          ).preInstructions([
            SystemProgram.transfer({
              fromPubkey: signer.publicKey,
              toPubkey: AUTHORITY,
              lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
            })
          ]).signers([signer]).rpc()
        } catch(e) {
          assert(e.error.origin == 'nullifier0_pda')
        }

        try {
          const txLastTransaction = await verifierProgram.methods.lastTransactionDeposit(
          ).accounts(
            {
              signingAddress: signer.publicKey,
              nullifier0Pda: pdas.nullifier0PdaPubkey,
              nullifier1Pda: maliciousNullifier,
              twoLeavesPda: pdas.leavesPdaPubkey,
              verifierState: pdas.verifierStatePubkey,
              programMerkleTree: merkleTreeProgram.programId,
              systemProgram: SystemProgram.programId,
              rent: DEFAULT_PROGRAMS.rent,
              merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
              merkleTree: MERKLE_TREE_KEY,
              feeEscrowState: pdas.feeEscrowStatePubkey,
              preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
              authority: AUTHORITY
            }
          ).preInstructions([
            SystemProgram.transfer({
              fromPubkey: signer.publicKey,
              toPubkey: AUTHORITY,
              lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
            })
          ]).signers([signer]).rpc()
        } catch(e) {
          assert(e.error.origin == 'nullifier1_pda')
        }
        // different escrow account
        const maliciousEscrow = await solana.PublicKey.findProgramAddress([Buffer.from(new Uint8Array(32).fill(5)), anchor.utils.bytes.utf8.encode("fee_escrow")],
        merkleTreeProgram.programId)[0]
        try {
          const txLastTransaction = await verifierProgram.methods.lastTransactionDeposit(
          ).accounts(
            {
              signingAddress: signer.publicKey,
              nullifier0Pda: pdas.nullifier0PdaPubkey,
              nullifier1Pda: pdas.nullifier1PdaPubkey,
              twoLeavesPda: pdas.leavesPdaPubkey,
              verifierState: pdas.verifierStatePubkey,
              programMerkleTree: merkleTreeProgram.programId,
              systemProgram: SystemProgram.programId,
              rent: DEFAULT_PROGRAMS.rent,
              merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
              merkleTree: MERKLE_TREE_KEY,
              feeEscrowState: maliciousEscrow,
              preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
              authority: AUTHORITY
            }
          ).preInstructions([
            SystemProgram.transfer({
              fromPubkey: signer.publicKey,
              toPubkey: AUTHORITY,
              lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
            })
          ]).signers([signer]).rpc()
        } catch(e) {
          assert(e.error.origin == 'fee_escrow_state')
        }

        const maliciousSigner = await newAccountWithLamports(provider.connection)

        try {
          const txLastTransaction = await verifierProgram.methods.lastTransactionDeposit(
          ).accounts(
            {
              signingAddress: maliciousSigner.publicKey,
              nullifier0Pda: pdas.nullifier0PdaPubkey,
              nullifier1Pda: pdas.nullifier1PdaPubkey,
              twoLeavesPda: pdas.leavesPdaPubkey,
              verifierState: pdas.verifierStatePubkey,
              programMerkleTree: merkleTreeProgram.programId,
              systemProgram: SystemProgram.programId,
              rent: DEFAULT_PROGRAMS.rent,
              merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
              merkleTree: MERKLE_TREE_KEY,
              feeEscrowState: pdas.feeEscrowStatePubkey,
              preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
              authority: AUTHORITY
            }
          ).preInstructions([
            SystemProgram.transfer({
              fromPubkey: maliciousSigner.publicKey,
              toPubkey: AUTHORITY,
              lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
            })
          ]).signers([maliciousSigner]).rpc()
        } catch(e) {
          assert(e.error.origin == 'signing_address')
        }
      })

  it("wrong tx txIntegrityHash", async () => {
    const origin = await newAccountWithLamports(provider.connection)
    const relayer = await newAccountWithLamports(provider.connection)
    let Keypair = new light.Keypair()
    let merkle_tree_pubkey = MERKLE_TREE_KEY

    let tx_fee = 5000 * 50;


    provider.wallet.payer = relayer
    let nr_tx = 10;
    let tx_cost = (nr_tx + 1) * 5000

    let merkleTree = await light.buildMerkelTree(provider.connection, MERKLE_TREE_KEY.toBytes());

    let deposit_utxo1 = new light.Utxo(BigNumber.from(amount), Keypair)
    let deposit_utxo2 = new light.Utxo(BigNumber.from(amount), Keypair)

    let inputUtxos = [new light.Utxo(), new light.Utxo()]
    let outputUtxos = [deposit_utxo1, deposit_utxo2 ]

    const data = await light.getProof(
      inputUtxos,
      outputUtxos,
      merkleTree,
      0,
      MERKLE_TREE_KEY.toBytes(),
      deposit_utxo1.amount.add(deposit_utxo2.amount),
      U64(0),
      MERKLE_TREE_PDA_TOKEN.toBase58(),
      relayer.publicKey.toBase58(),
      'DEPOSIT',
      encryptionKeypair
    )
    let ix_data = parse_instruction_data_bytes(data);

    let escrow_amount = U64.readLE(ix_data.extAmount, 0).toNumber() + tx_fee + U64.readLE(ix_data.fee, 0).toNumber()

    let pdas = await getPdaAddresses({
      tx_integrity_hash: ix_data.txIntegrityHash,
      nullifier0: ix_data.nullifier0,
      nullifier1: ix_data.nullifier1,
      leafLeft: ix_data.leafLeft,
      merkleTreeProgram,
      verifierProgram
    })

    // wrong ext amount
    try  {
      const tx = await verifierProgram.methods.createVerifierState(
            ix_data.proofAbc,
            ix_data.rootHash,
            ix_data.amount,
            ix_data.txIntegrityHash,
            ix_data.nullifier0,
            ix_data.nullifier1,
            ix_data.leafRight,
            ix_data.leafLeft,
            ix_data.recipient,
            new Uint8Array(8).fill(1),
            ix_data.relayer,
            ix_data.fee,
            ix_data.encryptedUtxos,
            ix_data.merkleTreeIndex
            ).accounts(
                {
                  signingAddress: relayer.publicKey,
                  verifierState: pdas.verifierStatePubkey,
                  systemProgram: SystemProgram.programId,
                  merkleTree: merkle_tree_pubkey,
                  programMerkleTree:  merkleTreeProgram.programId,
                }
            ).signers([relayer]).rpc()
    } catch(e) {
      assert(e.error.errorCode.code == 'WrongTxIntegrityHash')
    }
    // wrong relayer
    try  {
      const tx = await verifierProgram.methods.createVerifierState(
            ix_data.proofAbc,
            ix_data.rootHash,
            ix_data.amount,
            ix_data.txIntegrityHash,
            ix_data.nullifier0,
            ix_data.nullifier1,
            ix_data.leafRight,
            ix_data.leafLeft,
            ix_data.recipient,
            ix_data.extAmount,
            ix_data.relayer,
            ix_data.fee,
            ix_data.encryptedUtxos,
            ix_data.merkleTreeIndex
            ).accounts(
                {
                  signingAddress: SIGNER.publicKey,
                  verifierState: pdas.verifierStatePubkey,
                  systemProgram: SystemProgram.programId,
                  merkleTree: merkle_tree_pubkey,
                  programMerkleTree:  merkleTreeProgram.programId,
                }
            ).signers([SIGNER]).rpc()
    } catch(e) {
      assert(e.error.errorCode.code == 'WrongTxIntegrityHash')
    }
    // wrong fee
    try  {
      const tx = await verifierProgram.methods.createVerifierState(
            ix_data.proofAbc,
            ix_data.rootHash,
            ix_data.amount,
            ix_data.txIntegrityHash,
            ix_data.nullifier0,
            ix_data.nullifier1,
            ix_data.leafRight,
            ix_data.leafLeft,
            ix_data.recipient,
            ix_data.extAmount,
            ix_data.relayer,
            new Uint8Array(8).fill(1),
            ix_data.encryptedUtxos,
            ix_data.merkleTreeIndex
            ).accounts(
                {
                  signingAddress: relayer.publicKey,
                  verifierState: pdas.verifierStatePubkey,
                  systemProgram: SystemProgram.programId,
                  merkleTree: merkle_tree_pubkey,
                  programMerkleTree:  merkleTreeProgram.programId,
                }
            ).signers([relayer]).rpc()
    } catch(e) {
      assert(e.error.errorCode.code == 'WrongTxIntegrityHash')
    }
    // wrong utxos
    try  {
      const tx = await verifierProgram.methods.createVerifierState(
            ix_data.proofAbc,
            ix_data.rootHash,
            ix_data.amount,
            ix_data.txIntegrityHash,
            ix_data.nullifier0,
            ix_data.nullifier1,
            ix_data.leafRight,
            ix_data.leafLeft,
            ix_data.recipient,
            ix_data.extAmount,
            ix_data.relayer,
            ix_data.fee,
            new Uint8Array(222).fill(1),
            ix_data.merkleTreeIndex
            ).accounts(
                {
                  signingAddress: relayer.publicKey,
                  verifierState: pdas.verifierStatePubkey,
                  systemProgram: SystemProgram.programId,
                  merkleTree: merkle_tree_pubkey,
                  programMerkleTree:  merkleTreeProgram.programId,
                }
            ).signers([relayer]).rpc()
    } catch(e) {
      assert(e.error.errorCode.code == 'WrongTxIntegrityHash')
    }

    // wrong merkle tree index
    try  {
      const tx = await verifierProgram.methods.createVerifierState(
            ix_data.proofAbc,
            ix_data.rootHash,
            ix_data.amount,
            ix_data.txIntegrityHash,
            ix_data.nullifier0,
            ix_data.nullifier1,
            ix_data.leafRight,
            ix_data.leafLeft,
            ix_data.recipient,
            ix_data.extAmount,
            ix_data.relayer,
            ix_data.fee,
            ix_data.encryptedUtxos,
            new Uint8Array(1).fill(1)
            ).accounts(
                {
                  signingAddress: relayer.publicKey,
                  verifierState: pdas.verifierStatePubkey,
                  systemProgram: SystemProgram.programId,
                  merkleTree: merkle_tree_pubkey,
                  programMerkleTree:  merkleTreeProgram.programId,
                }
            ).signers([relayer]).rpc()
    } catch(e) {
      assert(e.error.errorCode.code == 'WrongTxIntegrityHash')
    }

    // wrong recipient
    try  {
      const tx = await verifierProgram.methods.createVerifierState(
            ix_data.proofAbc,
            ix_data.rootHash,
            ix_data.amount,
            ix_data.txIntegrityHash,
            ix_data.nullifier0,
            ix_data.nullifier1,
            ix_data.leafRight,
            ix_data.leafLeft,
            SIGNER.publicKey.toBytes(),
            ix_data.extAmount,
            ix_data.relayer,
            ix_data.fee,
            ix_data.encryptedUtxos,
            ix_data.merkleTreeIndex
            ).accounts(
                {
                  signingAddress: relayer.publicKey,
                  verifierState: pdas.verifierStatePubkey,
                  systemProgram: SystemProgram.programId,
                  merkleTree: merkle_tree_pubkey,
                  programMerkleTree:  merkleTreeProgram.programId,
                }
            ).signers([relayer]).rpc()
    } catch(e) {
      assert(e.error.errorCode.code == 'WrongTxIntegrityHash')
    }
  })

  it("Sol Deposit, Withdrawal & Double Spend", async () => {
      const userAccount = await newAccountWithLamports(provider.connection)
      const recipientWithdrawal = await newAccountWithLamports(provider.connection)

      var leavesPdas = []
      var utxos = []

      //
      // *
      // * test deposit
      // *
      //

      let merkleTree = await light.buildMerkelTree(provider.connection, MERKLE_TREE_KEY.toBytes());
      MERKLE_TREE_OLD = merkleTree
      let Keypair = new light.Keypair()

      for (var i= 0; i < 2; i++) {
        let res = await deposit({
          Keypair,
          encryptionKeypair,
          amount: 1_000_000_00,// amount
          connection: provider.connection,
          merkleTree,
          merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
          userAccount,
          verifierProgram,
          merkleTreeProgram,
          authority: AUTHORITY,
          preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
          merkle_tree_pubkey: MERKLE_TREE_KEY,
          provider,
          relayerFee,
          lastTx: true,
          rent: RENT_ESCROW
        })
        leavesPdas.push({ isSigner: false, isWritable: true, pubkey: res[0]})
        utxos.push(res[1])
      }
      UTXOS = utxos
      await executeUpdateMerkleTreeTransactions({
        connection: provider.connection,
        signer:userAccount,
        merkleTreeProgram: merkleTreeProgram,
        merkleTreeIndex: 0,
        leavesPdas,
        merkleTree,
        merkle_tree_pubkey: MERKLE_TREE_KEY,
        provider
      });


      // *
      // * test withdrawal
      // *
      // *
      // *

      // new lightTransaction
      // generate utxos
      //
      var leavesPdasWithdrawal = []
      const merkleTreeWithdrawal = await light.buildMerkelTree(provider.connection, MERKLE_TREE_KEY.toBytes());
      let deposit_utxo1 = utxos[0][0];
      let deposit_utxo2 = utxos[0][1];
      deposit_utxo1.index = merkleTreeWithdrawal._layers[0].indexOf(deposit_utxo1.getCommitment()._hex)
      deposit_utxo2.index = merkleTreeWithdrawal._layers[0].indexOf(deposit_utxo2.getCommitment()._hex)

      let relayer = await newAccountWithLamports(provider.connection);
      let relayer_recipient = new anchor.web3.Account();
      provider.payer = relayer
      let inputUtxosWithdrawal = []
      // TODO // DEBUG: getting invalid proof when selecting utxo with index 0
      if (deposit_utxo1.index == 1) {
        inputUtxosWithdrawal = [deposit_utxo1, new light.Utxo()] // 38241198
      } else {
        inputUtxosWithdrawal = [deposit_utxo2, new light.Utxo()] // 38241198
      }
      let outputUtxosWithdrawal = [new light.Utxo(), new light.Utxo() ]

      const externalAmountBigNumber: BigNumber = BigNumber.from(relayerFee.toString())
      .add(
        outputUtxosWithdrawal.reduce(
          (sum, utxo) => sum.add(utxo.amount),
          BigNumber.from(0),
        ),
      )
      .sub(
        inputUtxosWithdrawal.reduce((sum, utxo) => sum.add(utxo.amount), BigNumber.from(0)),
      )
      var dataWithdrawal = await light.getProof(
        inputUtxosWithdrawal,
        outputUtxosWithdrawal,
        merkleTreeWithdrawal,
        0,
        MERKLE_TREE_KEY.toBytes(),
        externalAmountBigNumber,
        relayerFee,
        recipientWithdrawal.publicKey.toBase58(),
        relayer.publicKey.toBase58(),
        'WITHDRAWAL',
        encryptionKeypair
      )

      let ix_dataWithdrawal = parse_instruction_data_bytes(dataWithdrawal);

      let pdasWithdrawal = await getPdaAddresses({
        tx_integrity_hash: ix_dataWithdrawal.txIntegrityHash,
        nullifier0: ix_dataWithdrawal.nullifier0,
        nullifier1: ix_dataWithdrawal.nullifier1,
        leafLeft: ix_dataWithdrawal.leafLeft,
        merkleTreeProgram,
        verifierProgram
      })

      try {
        let resWithdrawalTransact = await transact({
          connection: provider.connection,
          ix_data: ix_dataWithdrawal,
          pdas: pdasWithdrawal,
          origin: MERKLE_TREE_PDA_TOKEN,
          signer: relayer,
          recipient: recipientWithdrawal.publicKey,
          relayer_recipient,
          mode: "withdrawal",
          verifierProgram,
          merkleTreeProgram,
          authority: AUTHORITY,
          preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
          merkle_tree_pubkey: MERKLE_TREE_KEY,
          provider,
          relayerFee
        })
      } catch(e) {
        console.log(e)
      }


      let failed = false
      try {
        let tx23 = await transact({
          connection: provider.connection,
          ix_data: ix_dataWithdrawal,
          pdas: pdasWithdrawal,
          origin: MERKLE_TREE_PDA_TOKEN,
          signer: relayer,
          recipient: recipientWithdrawal.publicKey,
          relayer_recipient,
          mode: "withdrawal",
          verifierProgram,
          merkleTreeProgram,
          authority: AUTHORITY,
          preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
          merkle_tree_pubkey: MERKLE_TREE_KEY,
          provider,
          relayerFee
        })
      } catch (e) {
        failed = true
      }
      assert(failed, "double spend did not fail");
    })

  it("Last Tx Withdrawal false inputs", async () => {
      const userAccount = await newAccountWithLamports(provider.connection)
      const recipientWithdrawal = await newAccountWithLamports(provider.connection)

      var leavesPdas = []
      var utxos = []


      // *
      // * test withdrawal
      // *
      // *
      // *

      const merkleTreeWithdrawal = await light.buildMerkelTree(provider.connection, MERKLE_TREE_KEY.toBytes());

      let signer = await newAccountWithLamports(provider.connection);
      let relayer_recipient = new anchor.web3.Account();
      provider.payer = signer
      let inputUtxosWithdrawal = [UTXOS[1][1], new light.Utxo()] // 38241198

      let outputUtxosWithdrawal = [new light.Utxo(), new light.Utxo() ]

      const externalAmountBigNumber: BigNumber = BigNumber.from(relayerFee.toString())
      .add(
        outputUtxosWithdrawal.reduce(
          (sum, utxo) => sum.add(utxo.amount),
          BigNumber.from(0),
        ),
      )
      .sub(
        inputUtxosWithdrawal.reduce((sum, utxo) => sum.add(utxo.amount), BigNumber.from(0)),
      )
      var dataWithdrawal = await light.getProof(
        inputUtxosWithdrawal,
        outputUtxosWithdrawal,
        merkleTreeWithdrawal,
        0,
        MERKLE_TREE_KEY.toBytes(),
        externalAmountBigNumber,
        relayerFee,
        recipientWithdrawal.publicKey.toBase58(),
        signer.publicKey.toBase58(),
        'WITHDRAWAL',
        encryptionKeypair
      )

      let ix_dataWithdrawal = parse_instruction_data_bytes(dataWithdrawal);

      let pdasWithdrawal = await getPdaAddresses({
        tx_integrity_hash: ix_dataWithdrawal.txIntegrityHash,
        nullifier0: ix_dataWithdrawal.nullifier0,
        nullifier1: ix_dataWithdrawal.nullifier1,
        leafLeft: ix_dataWithdrawal.leafLeft,
        merkleTreeProgram,
        verifierProgram
      })
      let pdas = pdasWithdrawal

      let failed = false
      try {

        let tx23 = await transact({
          connection: provider.connection,
          ix_data: ix_dataWithdrawal,
          pdas: pdasWithdrawal,
          origin: MERKLE_TREE_PDA_TOKEN,
          signer: signer,
          recipient: recipientWithdrawal.publicKey,
          relayer_recipient,
          mode: "withdrawal",
          verifierProgram,
          merkleTreeProgram,
          authority: AUTHORITY,
          preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
          merkle_tree_pubkey: MERKLE_TREE_KEY,
          provider,
          relayerFee,
          lastTx: false
        })
      } catch (e) {
        console.log(e)
        // console.log(e.programErrorStack)
        // console.log(e.programErrorStack[0].toBase58())
        // console.log(e.programErrorStack[1].toBase58())
        // console.log(e.programErrorStack[2].toBase58())
        // console.log(pdasWithdrawal.nullifier0PdaPubkey.toBase58())
        // console.log(pdasWithdrawal.nullifier1PdaPubkey.toBase58())
        failed = true
      }
      let tokenAuthority = await solana.PublicKey.findProgramAddress(
          [anchor.utils.bytes.utf8.encode("spl")],
          verifierProgram.programId
        )[0];
      const maliciousRecipient = await newProgramOwnedAccount({ connection: provider.connection,owner: merkleTreeProgram})
      try {
        const txLastTransaction = await verifierProgram.methods.lastTransactionWithdrawal(
        ).accounts(
          {
            signingAddress: signer.publicKey,
            nullifier0Pda: pdas.nullifier0PdaPubkey,
            nullifier1Pda: pdas.nullifier1PdaPubkey,
            twoLeavesPda: pdas.leavesPdaPubkey,
            verifierState: pdas.verifierStatePubkey,
            programMerkleTree: merkleTreeProgram.programId,
            systemProgram: SystemProgram.programId,
            rent: DEFAULT_PROGRAMS.rent,
            recipient: maliciousRecipient.publicKey,
            relayerRecipient: relayer_recipient.publicKey,
            merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
            merkleTree: MERKLE_TREE_KEY,
            preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
            authority: AUTHORITY,
            tokenAuthority,
            tokenProgram: token.TOKEN_PROGRAM_ID
          }
        ).preInstructions([
          SystemProgram.transfer({
            fromPubkey: signer.publicKey,
            toPubkey: AUTHORITY,
            lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
          })
        ]).signers([signer]).rpc()
      } catch(e) {
        assert(e.error.origin == 'recipient')
      }
      // try with unregistered merkle tree
      try {
        const txLastTransaction = await verifierProgram.methods.lastTransactionWithdrawal(
        ).accounts(
          {
            signingAddress: signer.publicKey,
            nullifier0Pda: pdas.nullifier0PdaPubkey,
            nullifier1Pda: pdas.nullifier1PdaPubkey,
            twoLeavesPda: pdas.leavesPdaPubkey,
            verifierState: pdas.verifierStatePubkey,
            programMerkleTree: merkleTreeProgram.programId,
            systemProgram: SystemProgram.programId,
            rent: DEFAULT_PROGRAMS.rent,
            recipient: recipientWithdrawal.publicKey,
            relayerRecipient: relayer_recipient.publicKey,
            merkleTreePdaToken: UNREGISTERED_MERKLE_TREE_PDA_TOKEN,
            merkleTree: UNREGISTERED_MERKLE_TREE.publicKey,
            preInsertedLeavesIndex: UNREGISTERED_PRE_INSERTED_LEAVES_INDEX,
            authority: AUTHORITY,
            tokenAuthority,
            tokenProgram: token.TOKEN_PROGRAM_ID
          }
        ).preInstructions([
          SystemProgram.transfer({
            fromPubkey: signer.publicKey,
            toPubkey: AUTHORITY,
            lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
          })
        ]).signers([signer]).rpc()
      } catch(e) {
        assert(e.error.origin == 'merkle_tree_pda_token')
      }
      // try with wrong PRE_INSERTED_LEAVES_INDEX
      try {
        const txLastTransaction = await verifierProgram.methods.lastTransactionWithdrawal(
        ).accounts(
          {
            signingAddress: signer.publicKey,
            nullifier0Pda: pdas.nullifier0PdaPubkey,
            nullifier1Pda: pdas.nullifier1PdaPubkey,
            twoLeavesPda: pdas.leavesPdaPubkey,
            verifierState: pdas.verifierStatePubkey,
            programMerkleTree: merkleTreeProgram.programId,
            systemProgram: SystemProgram.programId,
            rent: DEFAULT_PROGRAMS.rent,
            recipient: recipientWithdrawal.publicKey,
            relayerRecipient: relayer_recipient.publicKey,
            merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
            merkleTree: MERKLE_TREE_KEY,
            preInsertedLeavesIndex: UNREGISTERED_PRE_INSERTED_LEAVES_INDEX,
            authority: AUTHORITY,
            tokenAuthority,
            tokenProgram: token.TOKEN_PROGRAM_ID
          }
        ).preInstructions([
          SystemProgram.transfer({
            fromPubkey: signer.publicKey,
            toPubkey: AUTHORITY,
            lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
          })
        ]).signers([signer]).rpc()
      } catch(e) {
        assert(e.error.origin == 'pre_inserted_leaves_index')
      }

      // try with wrong leaves account
      const maliciousLeaf = await solana.PublicKey.findProgramAddress([Buffer.from(new Uint8Array(32).fill(4)), anchor.utils.bytes.utf8.encode("leaves")],
      merkleTreeProgram.programId)[0]
      try {
        const txLastTransaction = await verifierProgram.methods.lastTransactionWithdrawal(
        ).accounts(
          {
            signingAddress: signer.publicKey,
            nullifier0Pda: pdas.nullifier0PdaPubkey,
            nullifier1Pda: pdas.nullifier1PdaPubkey,
            twoLeavesPda: maliciousLeaf,
            verifierState: pdas.verifierStatePubkey,
            programMerkleTree: merkleTreeProgram.programId,
            systemProgram: SystemProgram.programId,
            rent: DEFAULT_PROGRAMS.rent,
            recipient: recipientWithdrawal.publicKey,
            relayerRecipient: relayer_recipient.publicKey,
            merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
            merkleTree: MERKLE_TREE_KEY,
            preInsertedLeavesIndex: UNREGISTERED_PRE_INSERTED_LEAVES_INDEX,
            authority: AUTHORITY,
            tokenAuthority,
            tokenProgram: token.TOKEN_PROGRAM_ID
          }
        ).preInstructions([
          SystemProgram.transfer({
            fromPubkey: signer.publicKey,
            toPubkey: AUTHORITY,
            lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
          })
        ]).signers([signer]).rpc()
      } catch(e) {
        assert(e.error.origin == 'two_leaves_pda')
      }

      // try with wrong leaves account
      const maliciousNullifier = await solana.PublicKey.findProgramAddress([Buffer.from(new Uint8Array(32).fill(4)), anchor.utils.bytes.utf8.encode("nf")],
      merkleTreeProgram.programId)[0]

      try {
        const txLastTransaction = await verifierProgram.methods.lastTransactionWithdrawal(
        ).accounts(
          {
            signingAddress: signer.publicKey,
            nullifier0Pda: maliciousNullifier,
            nullifier1Pda: pdas.nullifier1PdaPubkey,
            twoLeavesPda: pdas.leavesPdaPubkey,
            verifierState: pdas.verifierStatePubkey,
            programMerkleTree: merkleTreeProgram.programId,
            systemProgram: SystemProgram.programId,
            rent: DEFAULT_PROGRAMS.rent,
            recipient: recipientWithdrawal.publicKey,
            relayerRecipient: relayer_recipient.publicKey,
            merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
            merkleTree: MERKLE_TREE_KEY,
            preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
            authority: AUTHORITY,
            tokenAuthority,
            tokenProgram: token.TOKEN_PROGRAM_ID
          }
        ).preInstructions([
          SystemProgram.transfer({
            fromPubkey: signer.publicKey,
            toPubkey: AUTHORITY,
            lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
          })
        ]).signers([signer]).rpc()
      } catch(e) {
        assert(e.error.origin == 'nullifier0_pda')
      }

      try {
        const txLastTransaction = await verifierProgram.methods.lastTransactionWithdrawal(
        ).accounts(
          {
            signingAddress: signer.publicKey,
            nullifier0Pda: pdas.nullifier0PdaPubkey,
            nullifier1Pda: maliciousNullifier,
            twoLeavesPda: pdas.leavesPdaPubkey,
            verifierState: pdas.verifierStatePubkey,
            programMerkleTree: merkleTreeProgram.programId,
            systemProgram: SystemProgram.programId,
            rent: DEFAULT_PROGRAMS.rent,
            recipient: recipientWithdrawal.publicKey,
            relayerRecipient: relayer_recipient.publicKey,
            merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
            merkleTree: MERKLE_TREE_KEY,
            preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
            authority: AUTHORITY,
            tokenAuthority,
            tokenProgram: token.TOKEN_PROGRAM_ID
          }
        ).preInstructions([
          SystemProgram.transfer({
            fromPubkey: signer.publicKey,
            toPubkey: AUTHORITY,
            lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
          })
        ]).signers([signer]).rpc()
      } catch(e) {
        assert(e.error.origin == 'nullifier1_pda')
      }

      const maliciousSigner = await newAccountWithLamports(provider.connection)

      try {
        const txLastTransaction = await verifierProgram.methods.lastTransactionWithdrawal(
        ).accounts(
          {
            signingAddress: maliciousSigner.publicKey,
            nullifier0Pda: pdas.nullifier0PdaPubkey,
            nullifier1Pda: pdas.nullifier1PdaPubkey,
            twoLeavesPda: pdas.leavesPdaPubkey,
            verifierState: pdas.verifierStatePubkey,
            programMerkleTree: merkleTreeProgram.programId,
            systemProgram: SystemProgram.programId,
            rent: DEFAULT_PROGRAMS.rent,
            recipient: recipientWithdrawal.publicKey,
            relayerRecipient: relayer_recipient.publicKey,
            merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
            merkleTree: MERKLE_TREE_KEY,
            preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
            authority: AUTHORITY,
            tokenAuthority,
            tokenProgram: token.TOKEN_PROGRAM_ID
          }
        ).preInstructions([
          SystemProgram.transfer({
            fromPubkey: maliciousSigner.publicKey,
            toPubkey: AUTHORITY,
            lamports: (await connection.getMinimumBalanceForRentExemption(8)) * 2 + 3173760, //(await connection.getMinimumBalanceForRentExemption(256)),
          })
        ]).signers([maliciousSigner]).rpc()
      } catch(e) {
        assert(e.error.origin == 'signing_address')
      }

    })

  // Tries to validate a tx with a wrong Merkle proof with consistent wrong root
  it("Wrong root & merkle proof", async () => {
    const userAccount = await newAccountWithLamports(provider.connection)
    const recipientWithdrawal = await newAccountWithLamports(provider.connection)
    let Keypair = new light.Keypair()

    var leavesPdas = []
    var utxos = []
    let deposit_utxo1 = new light.Utxo(BigNumber.from(amount), Keypair)

    // inserting malicious commitment into local Merkle tree
    MERKLE_TREE_OLD.update(2, deposit_utxo1.getCommitment()._hex)


    // *
    // * test withdrawal
    // *
    // *
    // *

    // new lightTransaction
    // generate utxos
    //
    var leavesPdasWithdrawal = []
    const merkleTreeWithdrawal = await light.buildMerkelTree(provider.connection, MERKLE_TREE_KEY.toBytes());

    let relayer = await newAccountWithLamports(provider.connection);
    let relayer_recipient = new anchor.web3.Account();
    provider.payer = relayer
    let inputUtxosWithdrawal = []
    inputUtxosWithdrawal = [deposit_utxo1, new light.Utxo()] // 38241198

    let outputUtxosWithdrawal = [new light.Utxo(), new light.Utxo() ]

    const externalAmountBigNumber: BigNumber = BigNumber.from(relayerFee.toString())
    .add(
      outputUtxosWithdrawal.reduce(
        (sum, utxo) => sum.add(utxo.amount),
        BigNumber.from(0),
      ),
    )
    .sub(
      inputUtxosWithdrawal.reduce((sum, utxo) => sum.add(utxo.amount), BigNumber.from(0)),
    )
    var dataWithdrawal = await light.getProof(
      inputUtxosWithdrawal,
      outputUtxosWithdrawal,
      MERKLE_TREE_OLD,
      0,
      MERKLE_TREE_KEY.toBytes(),
      externalAmountBigNumber,
      relayerFee,
      recipientWithdrawal.publicKey.toBase58(),
      relayer.publicKey.toBase58(),
      'WITHDRAWAL',
      encryptionKeypair
    )

    let ix_dataWithdrawal = parse_instruction_data_bytes(dataWithdrawal);

    let pdasWithdrawal = await getPdaAddresses({
      tx_integrity_hash: ix_dataWithdrawal.txIntegrityHash,
      nullifier0: ix_dataWithdrawal.nullifier0,
      nullifier1: ix_dataWithdrawal.nullifier1,
      leafLeft: ix_dataWithdrawal.leafLeft,
      merkleTreeProgram,
      verifierProgram
    })

    try {
      let resWithdrawalTransact = await transact({
        connection: provider.connection,
        ix_data: ix_dataWithdrawal,
        pdas: pdasWithdrawal,
        origin: MERKLE_TREE_PDA_TOKEN,
        signer: relayer,
        recipient: recipientWithdrawal.publicKey,
        relayer_recipient,
        mode: "withdrawal",
        verifierProgram,
        merkleTreeProgram,
        authority: AUTHORITY,
        preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
        merkle_tree_pubkey: MERKLE_TREE_KEY,
        provider,
        relayerFee
      })
    } catch (e) {
      assert(e.logs.indexOf('Program log: Did not find root.') != -1)
    }
  })

  it("Wrong Proof", async () => {
      const userAccount = await newAccountWithLamports(provider.connection)
      const recipientWithdrawal = await newAccountWithLamports(provider.connection)

      var leavesPdas = []
      var utxos = []

      //
      // *
      // * test deposit
      // *
      //

      let merkleTree = await light.buildMerkelTree(provider.connection, MERKLE_TREE_KEY.toBytes());

      let Keypair = new light.Keypair()
      let amount = 1_000_000_00
      let connection = provider.connection
      let merkleTreePdaToken = MERKLE_TREE_PDA_TOKEN
      // let merkleTree = MERKLE_TREE_KEY
      let authority = AUTHORITY
      let preInsertedLeavesIndex = PRE_INSERTED_LEAVES_INDEX
      let merkle_tree_pubkey = MERKLE_TREE_KEY

      const burnerUserAccount = await newAccountWithLamports(connection)

      let deposit_utxo1 = new light.Utxo(BigNumber.from(amount), Keypair)
      let deposit_utxo2 = new light.Utxo(BigNumber.from(amount), Keypair)

      let inputUtxos = [new light.Utxo(), new light.Utxo()]
      let outputUtxos = [deposit_utxo1, deposit_utxo2 ]

      const data = await light.getProof(
        inputUtxos,
        outputUtxos,
        merkleTree,
        0,
        MERKLE_TREE_KEY.toBytes(),
        deposit_utxo1.amount.add(deposit_utxo2.amount),
        U64(0),
        merkleTreePdaToken.toBase58(),
        burnerUserAccount.publicKey.toBase58(),
        'DEPOSIT',
        encryptionKeypair
      )

      let ix_data = parse_instruction_data_bytes(data);

      // corrupt proof
      ix_data.proofAbc[0] = 0

      let pdas = await getPdaAddresses({
        tx_integrity_hash: ix_data.txIntegrityHash,
        nullifier0: ix_data.nullifier0,
        nullifier1: ix_data.nullifier1,
        leafLeft: ix_data.leafLeft,
        merkleTreeProgram,
        verifierProgram
      })

      let failed = false
      try {
        await transact({
          connection: connection,
          ix_data,
          pdas,
          origin: userAccount,
          signer: burnerUserAccount,
          recipient: merkleTreePdaToken,
          batch_insert: true,
          mode: "deposit",
          verifierProgram,
          merkleTreeProgram,
          merkleTreePdaToken,
          authority,
          preInsertedLeavesIndex,
          merkle_tree_pubkey,
          provider,
          relayerFee,
          lastTx: true
        })
      } catch(e) {
        failed=true
      }
      assert(failed)
    })

  it.skip("Try 17 shielded transactions", async () => {
      const userAccount = await newAccountWithLamports(provider.connection)
      const recipientWithdrawal = await newAccountWithLamports(provider.connection)

      var leavesPdas = []
      var utxos = []

      //
      // *
      // * test deposit
      // *
      //

      let merkleTree = await light.buildMerkelTree(provider.connection, MERKLE_TREE_KEY.toBytes());

      let Keypair = new light.Keypair()

      for (var i= 0; i < 17; i++) {
        console.log(`${i} / 17`)
        let res = await deposit({
          Keypair,
          encryptionKeypair,
          amount: 1_000_000_00,// amount
          connection: provider.connection,
          merkleTree,
          merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
          userAccount,
          verifierProgram,
          merkleTreeProgram,
          authority: AUTHORITY,
          preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
          merkle_tree_pubkey: MERKLE_TREE_KEY,
          provider,
          relayerFee,
          rent: RENT_ESCROW
        })
        leavesPdas.push({ isSigner: false, isWritable: true, pubkey: res[0]})
        utxos.push(res[1])
      }
      try {
        await executeUpdateMerkleTreeTransactions({
          connection: provider.connection,
          signer:userAccount,
          merkleTreeProgram: merkleTreeProgram,
          leavesPdas,
          merkleTree,
          merkleTreeIndex: 0,
          merkle_tree_pubkey: MERKLE_TREE_KEY,
          provider
        });
      } catch(e) {
        assert(e.error.errorCode.code == 'InvalidNumberOfLeaves')
      }
      leavesPdas.pop()
      await executeUpdateMerkleTreeTransactions({
        connection: provider.connection,
        signer:userAccount,
        merkleTreeProgram: merkleTreeProgram,
        merkleTreeIndex: 0,
        leavesPdas,
        merkleTree,
        merkle_tree_pubkey: MERKLE_TREE_KEY,
        provider
      });

      // *
      // * test withdrawal
      // *
      // *
      // *

      // new lightTransaction
      // generate utxos
      //
      var leavesPdasWithdrawal = []
      const merkleTreeWithdrawal = await light.buildMerkelTree(provider.connection);
      let deposit_utxo1 = utxos[0][0];
      let deposit_utxo2 = utxos[0][1];
      deposit_utxo1.index = merkleTreeWithdrawal._layers[0].indexOf(deposit_utxo1.getCommitment()._hex)
      deposit_utxo2.index = merkleTreeWithdrawal._layers[0].indexOf(deposit_utxo2.getCommitment()._hex)

      let relayer = await newAccountWithLamports(provider.connection);
      let relayer_recipient = new anchor.web3.Account();

      let inputUtxosWithdrawal = []
      if (deposit_utxo1.index == 1) {
        inputUtxosWithdrawal = [deposit_utxo1, new light.Utxo()] // 38241198
      } else {
        inputUtxosWithdrawal = [deposit_utxo2, new light.Utxo()] // 38241198
      }
      let outputUtxosWithdrawal = [new light.Utxo(), new light.Utxo() ]

      const externalAmountBigNumber: BigNumber = BigNumber.from(relayerFee.toString())
      .add(
        outputUtxosWithdrawal.reduce(
          (sum, utxo) => sum.add(utxo.amount),
          BigNumber.from(0),
        ),
      )
      .sub(
        inputUtxosWithdrawal.reduce((sum, utxo) => sum.add(utxo.amount), BigNumber.from(0)),
      )
      var dataWithdrawal = await light.getProof(
        inputUtxosWithdrawal,
        outputUtxosWithdrawal,
        merkleTreeWithdrawal,
        0,
        MERKLE_TREE_KEY.toBytes(),
        externalAmountBigNumber,
        relayerFee,
        recipientWithdrawal.publicKey.toBase58(),
        relayer.publicKey.toBase58(),
        'WITHDRAWAL',
        encryptionKeypair
      )

      let ix_dataWithdrawal = parse_instruction_data_bytes(dataWithdrawal);
      let pdasWithdrawal = await getPdaAddresses({
        tx_integrity_hash: ix_dataWithdrawal.txIntegrityHash,
        nullifier0: ix_dataWithdrawal.nullifier0,
        nullifier1: ix_dataWithdrawal.nullifier1,
        leafLeft: ix_dataWithdrawal.leafLeft,
        merkleTreeProgram,
        verifierProgram
      })
      let resWithdrawalTransact = await transact({
        connection: provider.connection,
        ix_data: ix_dataWithdrawal,
        pdas: pdasWithdrawal,
        origin: MERKLE_TREE_PDA_TOKEN,
        signer: relayer,
        recipient: recipientWithdrawal.publicKey,
        relayer_recipient,
        mode: "withdrawal",
        verifierProgram,
        merkleTreeProgram,
        authority: AUTHORITY,
        preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
        merkle_tree_pubkey: MERKLE_TREE_KEY,
        provider,
        relayerFee
      });
      leavesPdasWithdrawal = [];
      leavesPdasWithdrawal.push({
        isSigner: false,
        isWritable: true,
        pubkey: resWithdrawalTransact
      })
      try {
        await executeUpdateMerkleTreeTransactions({
          connection: provider.connection,
          signer:relayer,
          merkleTreeProgram,
          leavesPdas: leavesPdasWithdrawal,
          merkleTree: merkleTreeWithdrawal,
          merkle_tree_pubkey: MERKLE_TREE_KEY,
          merkleTreeIndex: 0,
          provider
        });

      } catch(e) {
        assert(e.error.errorCode.code == 'FirstLeavesPdaIncorrectIndex.')
      }
    })

  it.skip("16 shielded transactions, 1 unshielding transaction", async () => {
        const userAccount = await newAccountWithLamports(provider.connection)
        const recipientWithdrawal = await newAccountWithLamports(provider.connection)

        var leavesPdas = []
        var utxos = []

        //
        // *
        // * test deposit
        // *
        //

        let merkleTree = await light.buildMerkelTree(provider.connection, MERKLE_TREE_KEY.toBytes());

        let Keypair = new light.Keypair()

        for (var i= 0; i < 1; i++) {
          let res = await deposit({
            Keypair,
            encryptionKeypair,
            amount: 1_000_000_00,// amount
            connection: provider.connection,
            merkleTree,
            merkleTreePdaToken: MERKLE_TREE_PDA_TOKEN,
            userAccount,
            verifierProgram,
            merkleTreeProgram,
            authority: AUTHORITY,
            preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
            merkle_tree_pubkey: MERKLE_TREE_KEY,
            provider,
            relayerFee,
            rent: RENT_ESCROW
          })
          leavesPdas.push({ isSigner: false, isWritable: true, pubkey: res[0]})
          utxos.push(res[1])
        }

        await executeUpdateMerkleTreeTransactions({
          connection: provider.connection,
          signer:userAccount,
          merkleTreeProgram: merkleTreeProgram,
          merkleTreeIndex: 0,
          leavesPdas,
          merkleTree,
          merkle_tree_pubkey: MERKLE_TREE_KEY,
          provider
        });

        // *
        // * test withdrawal
        // *
        // *
        // *

        // new lightTransaction
        // generate utxos
        //
        var leavesPdasWithdrawal = []
        const merkleTreeWithdrawal = await light.buildMerkelTree(provider.connection);
        let deposit_utxo1 = utxos[0][0];
        let deposit_utxo2 = utxos[0][1];
        deposit_utxo1.index = merkleTreeWithdrawal._layers[0].indexOf(deposit_utxo1.getCommitment()._hex)
        deposit_utxo2.index = merkleTreeWithdrawal._layers[0].indexOf(deposit_utxo2.getCommitment()._hex)

        let relayer = await newAccountWithLamports(provider.connection);
        let relayer_recipient = new anchor.web3.Account();

        let inputUtxosWithdrawal = []
        if (deposit_utxo1.index == 1) {
          inputUtxosWithdrawal = [deposit_utxo1, new light.Utxo()] // 38241198
        } else {
          inputUtxosWithdrawal = [deposit_utxo2, new light.Utxo()] // 38241198
        }
        let outputUtxosWithdrawal = [new light.Utxo(), new light.Utxo() ]

        const externalAmountBigNumber: BigNumber = BigNumber.from(relayerFee.toString())
        .add(
          outputUtxosWithdrawal.reduce(
            (sum, utxo) => sum.add(utxo.amount),
            BigNumber.from(0),
          ),
        )
        .sub(
          inputUtxosWithdrawal.reduce((sum, utxo) => sum.add(utxo.amount), BigNumber.from(0)),
        )

        var dataWithdrawal = await light.getProof(
          inputUtxosWithdrawal,
          outputUtxosWithdrawal,
          merkleTreeWithdrawal,
          0,
          MERKLE_TREE_KEY.toBytes(),
          externalAmountBigNumber,
          relayerFee,
          recipientWithdrawal.publicKey.toBase58(),
          relayer.publicKey.toBase58(),
          'WITHDRAWAL',
          encryptionKeypair
        )

        let ix_dataWithdrawal = parse_instruction_data_bytes(dataWithdrawal);
        let pdasWithdrawal = await getPdaAddresses({
          tx_integrity_hash: ix_dataWithdrawal.txIntegrityHash,
          nullifier0: ix_dataWithdrawal.nullifier0,
          nullifier1: ix_dataWithdrawal.nullifier1,
          leafLeft: ix_dataWithdrawal.leafLeft,
          merkleTreeProgram,
          verifierProgram
        })
        let resWithdrawalTransact = await transact({
          connection: provider.connection,
          ix_data: ix_dataWithdrawal,
          pdas: pdasWithdrawal,
          origin: MERKLE_TREE_PDA_TOKEN,
          signer: relayer,
          recipient: recipientWithdrawal.publicKey,
          relayer_recipient,
          mode: "withdrawal",
          verifierProgram,
          merkleTreeProgram,
          authority: AUTHORITY,
          preInsertedLeavesIndex: PRE_INSERTED_LEAVES_INDEX,
          merkle_tree_pubkey: MERKLE_TREE_KEY,
          provider,
          relayerFee
        })
        leavesPdasWithdrawal.push({
          isSigner: false,
          isWritable: true,
          pubkey: resWithdrawalTransact
        })
        await executeUpdateMerkleTreeTransactions({
          connection: provider.connection,
          signer:relayer,
          merkleTreeProgram,
          leavesPdas: leavesPdasWithdrawal,
          merkleTree: merkleTreeWithdrawal,
          merkle_tree_pubkey: MERKLE_TREE_KEY,
          merkleTreeIndex: 0,
          provider
        });

      })

});