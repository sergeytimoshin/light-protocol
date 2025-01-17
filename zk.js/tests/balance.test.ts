import { assert } from "chai";
import { SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { it } from "mocha";

const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
// Load chai-as-promised support
chai.use(chaiAsPromised);

import {
  FEE_ASSET,
  Provider as LightProvider,
  MINT,
  Account,
  TokenUtxoBalance,
  Balance,
  TOKEN_REGISTRY,
  BN_0,
  Utxo,
  createTestInUtxo,
} from "../src";
import { WasmFactory, LightWasm } from "@lightprotocol/account.rs";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { compareUtxos } from "./test-utils/compare-utxos";

process.env.ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";
process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";

describe("Balance Functional", () => {
  const seed32 = bs58.encode(new Uint8Array(32).fill(1));
  const compressAmount = 20_000;
  const compressFeeAmount = 10_000;

  let lightWasm: LightWasm,
    lightProvider: LightProvider,
    compressUtxo1: Utxo,
    account: Account;
  before(async () => {
    lightWasm = await WasmFactory.getInstance();
    account = Account.createFromSeed(lightWasm, seed32);
    lightProvider = await LightProvider.loadMock();
    compressUtxo1 = createTestInUtxo({
      lightWasm,
      assets: [FEE_ASSET, MINT],
      amounts: [new BN(compressFeeAmount), new BN(compressAmount)],
      account,
      merkleTreeLeafIndex: 1,
    });
  });

  it.skip("Test Balance moveToSpentUtxos", async () => {
    const balance: Balance = {
      tokenBalances: new Map([
        [SystemProgram.programId.toBase58(), TokenUtxoBalance.initSol()],
      ]),
      totalSolBalance: BN_0,
      programBalances: new Map(),
      nftBalances: new Map(),
    };
    const tokenBalanceUsdc = new TokenUtxoBalance(TOKEN_REGISTRY.get("USDC")!);
    balance.tokenBalances.set(
      tokenBalanceUsdc.tokenData.mint.toBase58(),
      tokenBalanceUsdc,
    );

    balance.tokenBalances
      .get(MINT.toBase58())
      ?.addUtxo(compressUtxo1.utxoHash, compressUtxo1, "utxos");

    const utxo = balance.tokenBalances
      .get(MINT.toBase58())
      ?.utxos.get(compressUtxo1.utxoHash);
    compareUtxos(utxo!, compressUtxo1);
    assert.equal(
      balance.tokenBalances.get(MINT.toBase58())?.totalBalanceSol.toString(),
      compressUtxo1.amounts[0].toString(),
    );
    assert.equal(
      balance.tokenBalances.get(MINT.toBase58())?.totalBalanceSpl.toString(),
      compressUtxo1.amounts[1].toString(),
    );
    assert.equal(
      balance.tokenBalances.get(SystemProgram.programId.toBase58())?.spentUtxos
        .size,
      0,
    );

    balance.tokenBalances
      .get(MINT.toBase58())
      ?.moveToSpentUtxos(compressUtxo1.utxoHash);
    assert.equal(
      balance.tokenBalances.get(MINT.toBase58())?.totalBalanceSol.toString(),
      "0",
    );
    assert.equal(
      balance.tokenBalances.get(MINT.toBase58())?.totalBalanceSpl.toString(),
      "0",
    );
    assert.equal(
      balance.tokenBalances.get(MINT.toBase58())?.spentUtxos.size,
      1,
    );

    assert.equal(balance.tokenBalances.get(MINT.toBase58())?.utxos.size, 0);

    const _compressUtxo1 = balance.tokenBalances
      .get(MINT.toBase58())
      ?.spentUtxos.get(compressUtxo1.utxoHash);
    compareUtxos(_compressUtxo1!, compressUtxo1);
  });
});
