import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import axios from "axios";
import { RelayerError, RelayerErrorCode, Provider } from "./index";

export class Relayer {
  accounts: {
    relayerPubkey: PublicKey; // signs the transaction
    relayerRecipientSol: PublicKey; // receives the fees
    lookUpTable: PublicKey;
  };
  relayerFee: BN;
  highRelayerFee: BN;

  /**
   *
   * @param relayerPubkey Signs the transaction
   * @param lookUpTable  The relayer's lookuptable - uniformly used currently
   * @param relayerRecipientSol Recipient account for SOL fees
   * @param relayerFee Fee amount
   */
  constructor(
    relayerPubkey: PublicKey,
    lookUpTable: PublicKey,
    relayerRecipientSol?: PublicKey,
    relayerFee: BN = new BN(0),
    highRelayerFee: BN = new BN(500000),
  ) {
    if (!relayerPubkey) {
      throw new RelayerError(
        RelayerErrorCode.RELAYER_PUBKEY_UNDEFINED,
        "constructor",
      );
    }
    // if (!lookUpTable) {
    //   throw new RelayerError(
    //     RelayerErrorCode.LOOK_UP_TABLE_UNDEFINED,
    //     "constructor",
    //   );
    // }
    if (relayerRecipientSol && relayerFee.toString() === "0") {
      throw new RelayerError(
        RelayerErrorCode.RELAYER_FEE_UNDEFINED,
        "constructor",
      );
    }
    if (relayerFee.toString() !== "0" && !relayerRecipientSol) {
      throw new RelayerError(
        RelayerErrorCode.RELAYER_RECIPIENT_UNDEFINED,
        "constructor",
      );
    }
    if (relayerRecipientSol) {
      this.accounts = {
        relayerPubkey,
        lookUpTable,
        relayerRecipientSol,
      };
    } else {
      this.accounts = {
        relayerPubkey,
        lookUpTable,
        relayerRecipientSol: relayerPubkey,
      };
    }
    this.highRelayerFee = highRelayerFee;
    this.relayerFee = relayerFee;
  }

  async updateMerkleTree(provider: Provider) {
    try {
      const response = await axios.post(
        "http://localhost:3331/updatemerkletree",
      );
      return response;
    } catch (err) {
      console.error({ err });
      throw err;
    }
  }

  async sendTransaction(instructions: any, provider: Provider): Promise<any> {
    try {
      const response = axios.post("http://localhost:3331/relay", {
        instructions,
      });
      return response;
    } catch (err) {
      console.error({ err });
      throw err;
    }
  }

  getRelayerFee(ataCreationFee?: boolean) {
    return ataCreationFee ? this.highRelayerFee : this.relayerFee;
  }
}
