import { Command, ux } from "@oclif/core";
import { getWalletConfig, setAnchorProvider } from "../../utils/utils";

class GetCommand extends Command {
  static description = "Get the Merkle Tree Authority";

  static examples = ["light merkle-tree-authority:get"];

  async run() {
    const anchorProvider = await setAnchorProvider();
    const merkleTreeConfig = await getWalletConfig(anchorProvider);

    if (!(await merkleTreeConfig.isMerkleTreeAuthorityInitialized())) {
      this.logToStderr("Merkle Tree Authority is not initialized");
      this.exit(1);
    }

    const merkleTreeAuthorityAccountInfo =
      await merkleTreeConfig.getMerkleTreeAuthorityAccountInfo();
    ux.table(
      [
        {
          merkleTreeSetIndex:
            merkleTreeAuthorityAccountInfo.merkleTreeSetIndex.toString(),
          registeredAssetIndex:
            merkleTreeAuthorityAccountInfo.registeredAssetIndex.toString(),
          enablePermissionlessSplTokens:
            merkleTreeAuthorityAccountInfo.enablePermissionlessSplTokens,
          enablePermissionlessMerkleTreeRegistration:
            merkleTreeAuthorityAccountInfo.enablePermissionlessMerkleTreeRegistration,
        },
      ],
      {
        merkleTreeSetIndex: {
          header: "Merkle Tree Set index",
        },
        registeredAssetIndex: {
          header: "Registered asset index",
        },
        enablePermissionlessSplTokens: {
          header: "Enable permissionless SPL tokens",
        },
        enablePermissionlessMerkleTreeRegistration: {
          header: "Enable permissionless Merkle Tree registration",
        },
      },
    );
  }
}

export default GetCommand;
