import { Keypair, PublicKey } from "@solana/web3.js";
import {
  Action,
  Provider,
  TestRpc,
  UserTestAssertHelper,
  User,
  TestInputs,
  confirmConfig,
} from "../../src";
import { LightWasm } from "@lightprotocol/account.rs";

export type EnvironmentConfig = {
  rpc?: TestRpc;
  providerSolanaKeypair?: Keypair;
  lightWasm?: LightWasm;
  lookUpTable?: PublicKey;
};

export async function performCompressing({
  numberOfCompressions = 1,
  testInputs,
  environmentConfig,
}: {
  numberOfCompressions: number;
  testInputs: TestInputs;
  environmentConfig: EnvironmentConfig;
}) {
  if (!testInputs.recipientSeed && testInputs.compressToRecipient)
    throw new Error("testinputs recipientSeed is undefined");
  for (let i = 0; i < numberOfCompressions; i++) {
    const provider = await Provider.init({
      wallet: environmentConfig.providerSolanaKeypair!,
      rpc: environmentConfig.rpc,
      confirmConfig,
    });
    const userSender = await User.init({
      provider,
    });
    const userRecipient = testInputs.compressToRecipient
      ? await User.init({
          provider,
          seed: testInputs.recipientSeed,
        })
      : userSender;
    const testStateValidator = new UserTestAssertHelper({
      userSender,
      userRecipient,
      provider,
      testInputs,
    });
    await testStateValidator.fetchAndSaveState();

    if (testInputs.compressToRecipient) {
      await userSender.compress({
        publicAmountSol: testInputs.amountSol,
        publicAmountSpl: testInputs.amountSpl,
        token: testInputs.token,
        recipient: userRecipient.account.getPublicKey(),
      });
    } else {
      await userSender.compress({
        publicAmountSol: testInputs.amountSol,
        publicAmountSpl: testInputs.amountSpl,
        token: testInputs.token,
      });
    }
    if (testInputs.token === "SOL" && testInputs.type === Action.COMPRESS) {
      await testStateValidator.checkSolCompressed();
    } else if (
      testInputs.token !== "SOL" &&
      testInputs.type === Action.COMPRESS
    ) {
      await testStateValidator.checkSplCompressed();
    } else {
      throw new Error(`No test option found for testInputs ${testInputs}`);
    }
    testInputs.expectedUtxoHistoryLength++;
  }
}

export async function performMergeAll({
  testInputs,
  environmentConfig,
}: {
  testInputs: TestInputs;
  environmentConfig: EnvironmentConfig;
}) {
  if (!testInputs.recipientSeed)
    throw new Error("testinputs recipientSeed is undefined");
  const provider = await Provider.init({
    wallet: environmentConfig.providerSolanaKeypair!,
    rpc: environmentConfig.rpc,
    confirmConfig,
  });

  const userSender: User = await User.init({
    provider,
    seed: testInputs.recipientSeed,
  });
  await userSender.getUtxoInbox();

  const testStateValidator = new UserTestAssertHelper({
    userSender,
    userRecipient: userSender,
    provider,
    testInputs,
  });

  await testStateValidator.fetchAndSaveState();
  await userSender.mergeAllUtxos(testStateValidator.tokenCtx.mint);

  /**
   * Test:
   * - if user utxo were less than 10 before, there is only one balance utxo of asset all others have been merged
   * - min(10 - nrPreBalanceUtxos[asset], nrPreBalanceInboxUtxos[asset]) have been merged thus size of utxos is less by that number
   * -
   */
  // TODO: add random amount and amount checks
  await testStateValidator.checkMergedAll();
}

export async function performMergeUtxos({
  testInputs,
  environmentConfig,
}: {
  testInputs: TestInputs;
  environmentConfig: EnvironmentConfig;
}) {
  if (!testInputs.recipientSeed)
    throw new Error("testinputs recipientSeed is undefined");

  const provider = await Provider.init({
    wallet: environmentConfig.providerSolanaKeypair!,
    rpc: environmentConfig.rpc,
    confirmConfig,
  });

  const userSender: User = await User.init({
    provider,
    seed: testInputs.recipientSeed,
  });
  await userSender.getUtxoInbox();

  const testStateValidator = new UserTestAssertHelper({
    userSender,
    userRecipient: userSender,
    provider,
    testInputs,
  });

  await testStateValidator.fetchAndSaveState();
  await userSender.mergeUtxos(
    testInputs.utxoCommitments!,
    testStateValidator.tokenCtx.mint,
  );

  /**
   * Test:
   * - if user utxo were less than 10 before, there is only one balance utxo of asset all others have been merged
   * - min(10 - nrPreBalanceUtxos[asset], nrPreBalanceInboxUtxos[asset]) have been merged thus size of utxos is less by that number
   * -
   */
  // TODO: add random amount and amount checks
  await testStateValidator.checkMerged();
}
