import { Args, Command, Flags } from "@oclif/core";
import { PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import {
  ADMIN_AUTH_KEYPAIR,
  MINT,
  convertAndComputeDecimals,
} from "@lightprotocol/zk.js";
import {
  CustomLoader,
  generateSolanaTransactionURL,
  setAnchorProvider,
} from "../../utils/utils";
class AirdropCommand extends Command {
  static description = "Perform a native Solana or SPL airdrop to a user";
  static examples = [
    `$ light airdrop 1.5 <RECIPIENT_ADDRESS>`,
    `$ light airdrop --token USDC 15 <RECIPIENT_ADDRESS> -v`,
  ];

  static flags = {
    token: Flags.string({
      char: "t",
      description: "The SPL token symbol",
      default: "SOL",
      parse: async (token) => token.toUpperCase(), 
      required: false,
    }),
    verbose: Flags.boolean({
      char: "v",
      description: "Show additional information",
      default: false,
      required: false,
    }),
  };

  static args = {
    amount: Args.string({
      name: "AMOUNT",
      description: "The airdrop amount to request",
      required: true,
    }),
    recipient_address: Args.string({
      name: "RECIPIENT_ADDRESS",
      description: "The account address of recipient",
      required: true,
    }),
  };

  async run() {
    const { args, flags } = await this.parse(AirdropCommand);

    const { amount, recipient_address } = args;
    const { token, verbose } = flags;

    const loader = new CustomLoader(`Requesting airdrop of ${amount} ${token}...`);
    loader.start();

    let transactionSignature;
    let transactionInfo;

    try {
      const provider = await setAnchorProvider();

      if (token.toLowerCase() === "sol") {
        transactionSignature = await provider.connection.requestAirdrop(
          new PublicKey(recipient_address), 
          convertAndComputeDecimals(amount, new BN(1e9)).toNumber()
        );
        transactionInfo = await provider.connection.confirmTransaction(
          transactionSignature,
          "confirmed",
        );
      } else {
        let tokenAccount = await getOrCreateAssociatedTokenAccount(
          provider.connection,
          ADMIN_AUTH_KEYPAIR,
          MINT,
          new PublicKey(recipient_address)
        );
        this.log(`Associated recipient token account: ${tokenAccount.address.toBase58()}`);
        transactionSignature = await mintTo(
          provider.connection,
          ADMIN_AUTH_KEYPAIR,
          MINT,
          tokenAccount.address,
          ADMIN_AUTH_KEYPAIR.publicKey,
          parseInt(amount) * 100,
          []
        );
        transactionInfo = await provider.connection.confirmTransaction(
          transactionSignature,
          "confirmed",
        );
      }
     
      if (verbose) {
        this.log(`
        ===========================
        =     \x1b[35mAirdrop Summary\x1b[0m     =
        ===========================
        `);
        this.log(`\x1b[34mRecipient\x1b[0m: ${recipient_address}`);
        this.log(`\x1b[34mToken\x1b[0m:     ${token}`);
        this.log(`\x1b[34mAmount\x1b[0m:    ${amount}`);
        if (token.toLowerCase() !== "sol") {
          this.log(`\x1b[34mMint:\x1b[0m      ${MINT}`);
        }

        this.log(`
        ===========================
        = \x1b[35mTransaction Information\x1b[0m =
        ===========================
        `);
        this.log(`\x1b[34mTransaction signature\x1b[0m: ${transactionSignature}`);
        this.log(`\x1b[34mBlock number\x1b[0m:          ${transactionInfo.context.slot}`);
        this.log(`\x1b[34mTransaction status\x1b[0m:    ${transactionInfo.value.err ? 'failed' : 'success'}`);

        this.log(`\nYou can view more transaction details at:`);
        this.log(`${generateSolanaTransactionURL("tx", transactionSignature!, "custom")}`);
        this.log("\nAirdrop Successful \x1b[32m✔\x1b[0m");
      }
      else {
        this.log(`\n\x1b[1mRecipient:\x1b[0m ${recipient_address}`);
        this.log(`\x1b[1mSignature:\x1b[0m ${transactionSignature}`);
        if (token.toLowerCase() !== "sol") {
          this.log(`\x1b[1mMint:\x1b[0m      ${MINT}`);
        }
        this.log(generateSolanaTransactionURL("tx", transactionSignature!, "custom"));
        this.log("\nAirdrop Successful \x1b[32m✔\x1b[0m");
      }
      
      loader.stop();
    } catch (error) {
      this.logToStderr(`${error}\n`)
      this.exit(2);
      loader.stop();
      //this.error(`${error}`);
      //this.error(`\nAirdrop failed: ${error}`);
    }
  }
}

AirdropCommand.strict = false;

export default AirdropCommand;