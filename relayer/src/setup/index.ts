import {
  createTestAccounts,
  initLookUpTableFromFile,
  setUpMerkleTree,
} from "light-sdk";
import { setAnchorProvider } from "../utils/provider";

export const testSetup = async () => {
  const providerAnchor = await setAnchorProvider();
  // TODO: use updated -- buildscript -> add relayer tests
  await initLookUpTableFromFile(providerAnchor);

  try {
    await createTestAccounts(providerAnchor.connection);

    await setUpMerkleTree(providerAnchor);
  } catch (e) {
    console.log("Error in testSetup: ", e);
  }
};
