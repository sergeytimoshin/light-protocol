import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { LightWasm } from "@lightprotocol/account.rs";
import { AppUtxoConfig, Action } from "../types";
import { Account } from "../account";
import { BN_0, MINIMUM_LAMPORTS, BN_2, BN_1 } from "../constants";
import {
  CreateUtxoError,
  TransactionParametersErrorCode,
  TransactionErrorCode,
  CreateUtxoErrorCode,
} from "../errors";
import { getAssetPubkeys } from "../transaction";
import { Utxo, OutUtxo, createOutUtxo } from "./utxo";
import { PlaceHolderTData, ProgramOutUtxo, ProgramUtxo } from "./program-utxo";

type Asset = { sumIn: BN; sumOut: BN; asset: PublicKey };

export type Recipient = {
  account: Account;
  solAmount: BN;
  splAmount: BN;
  mint: PublicKey;
  appUtxo?: AppUtxoConfig;
};

// mint: PublicKey, expectedAmount: BN,
export const getUtxoArrayAmount = (
  mint: PublicKey,
  inUtxos:
    | (Utxo | ProgramUtxo<PlaceHolderTData>)[]
    | (OutUtxo | ProgramOutUtxo<PlaceHolderTData>)[],
) => {
  let inAmount = BN_0;
  inUtxos.forEach((inUtxo) => {
    inUtxo.assets.forEach((asset, i) => {
      if (asset.toBase58() === mint.toBase58()) {
        inAmount = inAmount.add(inUtxo.amounts[i]);
      }
    });
  });
  return inAmount;
};

export const getRecipientsAmount = (
  mint: PublicKey,
  recipients: Recipient[],
) => {
  if (mint.toBase58() === SystemProgram.programId.toBase58()) {
    return recipients.reduce(
      (sum, recipient) => sum.add(recipient.solAmount),
      BN_0,
    );
  } else {
    return recipients.reduce(
      (sum, recipient) =>
        recipient.mint.toBase58() === mint.toBase58()
          ? sum.add(recipient.splAmount)
          : sum.add(BN_0),
      BN_0,
    );
  }
};
// --------------------------------------------------------------------------
// Algorithm:
// check nr recipients is leq to nrOuts of verifier
// check that publicMint and recipientMints exist in inputUtxos
// checks sum inAmounts for every asset are less or equal to sum OutAmounts

// decompress
// publicSol -sumSolAmount
// publicSpl -sumSplAmount
// publicMint

// transfer
// check no publics

// compress
// sumInSol +sumSolAmount
// sumInSpl +sumSplAmount
// publicMint

// create via recipients requested utxos and subtract amounts from sums
// beforeEach utxo check that no amount is negative

// create change utxos with remaining spl balances and sol balance
// --------------------------------------------------------------------------

export function createOutUtxos({
  inUtxos,
  outUtxos = [],
  publicMint,
  publicAmountSpl,
  publicAmountSol,
  rpcFee,
  changeUtxoAccount,
  action,
  appUtxo,
  numberMaxOutUtxos,
  assetLookupTable,
  separateSolUtxo = false,
  lightWasm,
}: {
  inUtxos?: (Utxo | ProgramUtxo<PlaceHolderTData>)[];
  publicMint?: PublicKey;
  publicAmountSpl?: BN;
  publicAmountSol?: BN;
  rpcFee?: BN;
  changeUtxoAccount: Account;
  outUtxos?: OutUtxo[];
  action: Action;
  appUtxo?: AppUtxoConfig;
  numberMaxOutUtxos: number;
  assetLookupTable: string[];
  verifierProgramLookupTable: string[];
  separateSolUtxo?: boolean;
  lightWasm: LightWasm;
}) {
  if (!lightWasm)
    throw new CreateUtxoError(
      TransactionParametersErrorCode.NO_POSEIDON_HASHER_PROVIDED,
      "createOutUtxos",
      "Poseidon not initialized",
    );

  if (rpcFee) {
    publicAmountSol = publicAmountSol ? publicAmountSol.add(rpcFee) : rpcFee;
  }

  const assetPubkeys =
    !inUtxos && action === Action.COMPRESS
      ? [
          SystemProgram.programId,
          publicMint ? publicMint : SystemProgram.programId,
        ]
      : getAssetPubkeys(inUtxos)?.assetPubkeys;

  if (!assetPubkeys)
    throw new CreateUtxoError(
      TransactionErrorCode.ASSET_PUBKEYS_UNDEFINED,
      "constructor",
    );

  // TODO: enable perfect manual amounts of amounts to recipients
  // check nr outUtxos is leq to nrOuts of verifier
  if (outUtxos.length > numberMaxOutUtxos - 1) {
    throw new CreateUtxoError(
      CreateUtxoErrorCode.INVALID_NUMBER_OF_RECIPIENTS,
      "createOutUtxos",
      `Number of recipients greater than allowed: ${
        outUtxos.length
      } allowed ${1}`,
    );
  }

  outUtxos.map((outUtxo) => {
    if (
      !assetPubkeys.find((x) => x.toBase58() === outUtxo.assets[1]?.toBase58())
    ) {
      throw new CreateUtxoError(
        CreateUtxoErrorCode.INVALID_RECIPIENT_MINT,
        "createOutUtxos",
        `Mint ${outUtxo.assets[1]} does not exist in input utxos mints ${assetPubkeys}`,
      );
    }
  });
  // add public mint if it does not exist in inUtxos
  if (
    publicMint &&
    !assetPubkeys.find((x) => x.toBase58() === publicMint.toBase58())
  ) {
    assetPubkeys.push(publicMint);
  }

  let assets: Asset[] = validateUtxoAmounts({
    assetPubkeys,
    inUtxos,
    outUtxos,
    publicAmountSol,
    publicAmountSpl,
    action,
  });
  const publicSolAssetIndex = assets.findIndex(
    (x) => x.asset.toBase58() === SystemProgram.programId.toBase58(),
  );

  // remove duplicates
  const key = "asset";
  assets = [...new Map(assets.map((item) => [item[key], item])).values()];

  // subtract public amounts from sumIns
  if (action === Action.DECOMPRESS) {
    if (!publicAmountSol && !publicAmountSpl)
      throw new CreateUtxoError(
        CreateUtxoErrorCode.NO_PUBLIC_AMOUNTS_PROVIDED,
        "createOutUtxos",
        "publicAmountSol not initialized for decompress",
      );
    if (!publicAmountSpl) publicAmountSpl = BN_0;
    if (!publicAmountSol)
      throw new CreateUtxoError(
        CreateUtxoErrorCode.PUBLIC_SOL_AMOUNT_UNDEFINED,
        "constructor",
      );

    if (publicAmountSpl && !publicMint)
      throw new CreateUtxoError(
        CreateUtxoErrorCode.NO_PUBLIC_MINT_PROVIDED,
        "createOutUtxos",
        "publicMint not initialized for decompress",
      );

    const publicSplAssetIndex = assets.findIndex(
      (x) => x.asset.toBase58() === publicMint?.toBase58(),
    );

    assets[publicSplAssetIndex].sumIn =
      assets[publicSplAssetIndex].sumIn.sub(publicAmountSpl);
    assets[publicSolAssetIndex].sumIn =
      assets[publicSolAssetIndex].sumIn.sub(publicAmountSol);
    // add public amounts to sumIns
  } else if (action === Action.COMPRESS) {
    if (rpcFee)
      throw new CreateUtxoError(
        CreateUtxoErrorCode.RPC_FEE_DEFINED,
        "createOutUtxos",
        "Compress and rpc fee defined",
      );
    if (!publicAmountSpl) publicAmountSpl = BN_0;
    if (!publicAmountSol) publicAmountSol = BN_0;
    const publicSplAssetIndex = assets.findIndex(
      (x) => x.asset.toBase58() === publicMint?.toBase58(),
    );
    const publicSolAssetIndex = assets.findIndex(
      (x) => x.asset.toBase58() === SystemProgram.programId.toBase58(),
    );
    assets[publicSplAssetIndex].sumIn =
      assets[publicSplAssetIndex].sumIn.add(publicAmountSpl);
    assets[publicSolAssetIndex].sumIn =
      assets[publicSolAssetIndex].sumIn.add(publicAmountSol);
  } else if (action === Action.TRANSFER) {
    if (!publicAmountSol)
      throw new CreateUtxoError(
        CreateUtxoErrorCode.PUBLIC_SOL_AMOUNT_UNDEFINED,
        "constructor",
      );
    const publicSolAssetIndex = assets.findIndex(
      (x) => x.asset.toBase58() === SystemProgram.programId.toBase58(),
    );

    assets[publicSolAssetIndex].sumIn =
      assets[publicSolAssetIndex].sumIn.sub(publicAmountSol);
  }

  const outputUtxos: OutUtxo[] = [...outUtxos];

  // create recipient output utxos, one for each defined recipient
  for (const j in outUtxos) {
    if (outUtxos[j].assets[1] && !outUtxos[j].amounts[1]) {
      throw new CreateUtxoError(
        CreateUtxoErrorCode.SPL_AMOUNT_UNDEFINED,
        "createOutUtxos",
        `Mint defined while splAmount is undefinedfor recipient ${outUtxos[j]}`,
      );
    }

    const solAmount = outUtxos[j].amounts[0] ? outUtxos[j].amounts[0] : BN_0;
    const splAmount = outUtxos[j].amounts[1] ? outUtxos[j].amounts[1] : BN_0;
    const splMint = outUtxos[j].assets[1]
      ? outUtxos[j].assets[1]
      : SystemProgram.programId;

    const publicSplAssetIndex = assets.findIndex(
      (x) => x.asset.toBase58() === splMint?.toBase58(),
    );

    assets[publicSplAssetIndex].sumIn = assets[publicSplAssetIndex].sumIn
      .sub(splAmount)
      .clone();
    assets[publicSolAssetIndex].sumIn = assets[publicSolAssetIndex].sumIn
      .sub(solAmount)
      .clone();
  }
  // create change utxo
  // Also handles case that we have more than one change utxo because we wanted
  // to decompress sol and used utxos with different spl tokens
  // it creates a change utxo for every asset that is non-zero then check that number of utxos is less or equal to verifier.config.outs
  const publicSplAssets = assets.filter(
    (x) =>
      x.sumIn.toString() !== "0" &&
      x.asset.toBase58() !== SystemProgram.programId.toBase58(),
  );

  const nrOutUtxos = publicSplAssets.length ? publicSplAssets.length : 1;

  if (separateSolUtxo && publicSplAssets.length > 0) {
    // nrOutUtxos -= 1;
    /**
     * Problem:
     * - we want to keep the majority of sol holdings in a single sol utxo, but we want to keep a small amount of sol in every spl utxo as well
     * - for example when merging incoming spl utxos we might have no sol in any of these utxos to pay the rpc
     *   -> we need an existing sol utxo but we don't want to merge it into the spl utxos
     * - sol amount should leave a minimum amount in spl utxos if possible
     */
    const preliminarySolAmount = assets[publicSolAssetIndex].sumIn.sub(
      MINIMUM_LAMPORTS.mul(BN_2),
    );
    const solAmount = preliminarySolAmount.isNeg()
      ? assets[publicSolAssetIndex].sumIn
      : preliminarySolAmount;
    assets[publicSolAssetIndex].sumIn =
      assets[publicSolAssetIndex].sumIn.sub(solAmount);
    const solChangeUtxo = createOutUtxo({
      lightWasm,
      assets: [SystemProgram.programId],
      amounts: [solAmount],
      owner: changeUtxoAccount.keypair.publicKey,
      // verifierAddress: appUtxo?.verifierAddress,
    });
    outputUtxos.push(solChangeUtxo);
  }

  for (let x = 0; x < nrOutUtxos; x++) {
    let solAmount = BN_0;
    if (x == 0) {
      solAmount = assets[publicSolAssetIndex].sumIn;
    }
    // catch case of sol compress with undefined spl assets
    const splAmount = publicSplAssets[x]?.sumIn
      ? publicSplAssets[x].sumIn
      : BN_0;
    const splAsset = publicSplAssets[x]?.asset
      ? publicSplAssets[x].asset
      : SystemProgram.programId;

    if (solAmount.isZero() && splAmount.isZero()) continue;

    const changeUtxo = createOutUtxo({
      lightWasm,
      assets: [SystemProgram.programId, splAsset],
      amounts: [solAmount, splAmount],
      owner: changeUtxoAccount.keypair.publicKey,
    });

    outputUtxos.push(changeUtxo);
  }

  if (outputUtxos.length > numberMaxOutUtxos) {
    throw new CreateUtxoError(
      CreateUtxoErrorCode.INVALID_OUTPUT_UTXO_LENGTH,
      "createOutUtxos",
      `Probably too many input assets possibly in combination with an incompatible number of compressed recipients`,
    );
  }
  return outputUtxos;
}

/**
 * @description Creates an array of UTXOs for each recipient based on their specified amounts and assets.
 *
 * @param recipients - Array of Recipient objects containing the recipient's account, SOL and SPL amounts, and mint.
 * @param poseidon - A Poseidon instance for hashing.
 *
 * @throws CreateUtxoError if a recipient has a mint defined but the SPL amount is undefined.
 * @returns An array of Utxos, one for each recipient.
 */
export function createRecipientUtxos({
  recipients,
  assetLookupTable,
  lightWasm,
}: {
  recipients: Recipient[];
  assetLookupTable: string[];
  lightWasm: LightWasm;
}): OutUtxo[] {
  const outputUtxos: OutUtxo[] = [];

  // create recipient output utxos, one for each defined recipient
  for (const j in recipients) {
    if (recipients[j].mint && !recipients[j].splAmount) {
      throw new CreateUtxoError(
        CreateUtxoErrorCode.SPL_AMOUNT_UNDEFINED,
        "createOutUtxos",
        `Mint defined while splAmount is undefined for recipient ${recipients[j]}`,
      );
    }

    const solAmount = recipients[j].solAmount ? recipients[j].solAmount : BN_0;
    const splAmount = recipients[j].splAmount ? recipients[j].splAmount : BN_0;
    const splMint = recipients[j].mint
      ? recipients[j].mint
      : SystemProgram.programId;

    const recipientUtxo = createOutUtxo({
      lightWasm,
      assets: [SystemProgram.programId, splMint],
      amounts: [solAmount, splAmount],
      owner: recipients[j].account.keypair.publicKey,
      encryptionPublicKey: recipients[j].account.encryptionKeypair.publicKey,
    });

    outputUtxos.push(recipientUtxo);
  }
  return outputUtxos;
}

/**
 * @description Validates if the sum of input UTXOs for each asset is less than or equal to the sum of output UTXOs.
 *
 * @param assetPubkeys - Array of PublicKeys representing the asset public keys to be checked.
 * @param inUtxos - Array of input UTXOs containing the asset amounts being spent.
 * @param outUtxos - Array of output UTXOs containing the asset amounts being received.
 *
 * @throws Error if the sum of input UTXOs for an asset is less than the sum of output UTXOs.
 */
export function validateUtxoAmounts({
  assetPubkeys,
  inUtxos,
  outUtxos,
  publicAmountSol,
  publicAmountSpl,
  action,
}: {
  assetPubkeys: PublicKey[];
  inUtxos?: (Utxo | ProgramUtxo<PlaceHolderTData>)[];
  outUtxos: (OutUtxo | ProgramOutUtxo<PlaceHolderTData>)[];
  publicAmountSol?: BN;
  publicAmountSpl?: BN;
  action?: Action;
}): Asset[] {
  const publicAmountMultiplier = action === Action.COMPRESS ? BN_1 : new BN(-1);
  const _publicAmountSol = publicAmountSol
    ? publicAmountSol.mul(publicAmountMultiplier)
    : BN_0;
  const _publicAmountSpl = publicAmountSpl
    ? publicAmountSpl.mul(publicAmountMultiplier)
    : BN_0;

  const assets: Asset[] = [];
  for (const [index, assetPubkey] of assetPubkeys.entries()) {
    const sumIn = inUtxos ? getUtxoArrayAmount(assetPubkey, inUtxos) : BN_0;
    const sumOut =
      action === Action.TRANSFER && outUtxos.length === 0
        ? sumIn
        : getUtxoArrayAmount(assetPubkey, outUtxos);
    let sumInAdd =
      assetPubkey.toBase58() === SystemProgram.programId.toBase58()
        ? sumIn.add(_publicAmountSol)
        : index < 2
        ? sumIn.add(_publicAmountSpl)
        : sumIn;
    let sumOutAdd =
      assetPubkey.toBase58() === SystemProgram.programId.toBase58()
        ? sumOut.add(_publicAmountSol)
        : index < 2
        ? sumOut.add(_publicAmountSpl)
        : sumOut;
    sumInAdd = action === Action.COMPRESS ? sumInAdd : sumIn;
    sumOutAdd = action === Action.COMPRESS ? sumOut : sumOutAdd;

    assets.push({
      asset: assetPubkey,
      sumIn,
      sumOut,
    });
    if (sumInAdd.lt(BN_0))
      throw new CreateUtxoError(
        CreateUtxoErrorCode.RECIPIENTS_SUM_AMOUNT_MISSMATCH,
        "validateUtxoAmounts",
        `utxos don't cover the required amount for asset ${assetPubkey.toBase58()} sumIn ${sumIn}  public amount: ${
          assetPubkey.toBase58() === SystemProgram.programId.toBase58()
            ? publicAmountSol
            : publicAmountSpl
        } action: ${action}`,
      );
    if (!sumInAdd.gte(sumOutAdd)) {
      throw new CreateUtxoError(
        CreateUtxoErrorCode.RECIPIENTS_SUM_AMOUNT_MISSMATCH,
        "validateUtxoAmounts",
        `for asset ${assetPubkey.toBase58()} sumOut ${sumOut} greather than sumIN ${sumIn}`,
      );
    }
  }
  return assets;
}
