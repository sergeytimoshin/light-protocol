import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN, BorshAccountsCoder, Idl } from "@coral-xyz/anchor";
import { LightWasm } from "@lightprotocol/account.rs";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { Result } from "../types";
import {
  BN_0,
  COMPRESSED_UTXO_BYTES_LENGTH,
  UNCOMPRESSED_UTXO_BYTES_LENGTH,
} from "../constants";
import { UtxoError, UtxoErrorCode, CreateUtxoErrorCode } from "../errors";
import {
  createAccountObject,
} from "../utils";
import { hashAndTruncateToCircuit } from "../utils/hash-utils";
import { fetchAssetByIdLookUp } from "../utils/fetch-utils";
import {
  encryptOutUtxoInternal,
  decryptOutUtxoInternal,
  CreateUtxoInputs,
  checkAssetAndAmountIntegrity,
  getDefaultUtxoTypeAndVersionV0,
  randomBN,
  getUtxoHashInputs,
  getUtxoHash,
  createNullifierWithAccountSignature,
} from "./utxo";
import { Account } from "../account";
import { BN254, createBN254 } from "./bn254";
import {PlaceHolderTData, ProgramOutUtxo, ProgramUtxo} from "../utxo/program-utxo-types";
import {programOutUtxoToBytes} from "../utxo/program-utxo-utils";

export function createProgramOutUtxo({
  owner,
  amounts,
  assets,
  lightWasm,
  ownerIdl,
  data,
  dataHash,
  type,
  encryptionPublicKey,
  address,
  blinding = new BN(randomBN(), 30, "be"),
  metaHash,
}: {
  owner: PublicKey;
  amounts: BN[];
  assets: PublicKey[];
  lightWasm: LightWasm;
  /** idl of the program owning the utxo */
  ownerIdl: Idl;
  data: PlaceHolderTData;
  dataHash: BN;
  type: string;
  encryptionPublicKey?: Uint8Array;
  address?: BN254;
  blinding?: BN254;
  metaHash?: BN254;
}): ProgramOutUtxo<PlaceHolderTData> {
  const { poolType, version } = getDefaultUtxoTypeAndVersionV0();
  ({ assets, amounts } = checkAssetAndAmountIntegrity(assets, amounts));

  // TODO: enable check
  // checkUtxoData(data, ownerIdl, type + "OutUtxo");

  /// turn programId into BN254
  const programIdCircuitInput = hashAndTruncateToCircuit(owner.toBytes());

  const utxoHashInputs = getUtxoHashInputs(
    programIdCircuitInput,
    amounts,
    assets,
    blinding,
    poolType,
    version,
    dataHash,
    metaHash,
    address,
  );

  const hash = getUtxoHash(lightWasm, utxoHashInputs);

  return {
    hash,
    owner,
    amounts,
    assets,
    blinding,
    type,
    version,
    poolType,
    isFillingUtxo: false,
    isPublic: false, // TODO: make isPublic dynamic
    address,
    metaHash,
    data,
    dataHash,
    encryptionPublicKey,
    ownerIdl,
  };
}

export const checkUtxoData = (
  utxoData: PlaceHolderTData,
  idl: Idl,
  circuitName: string,
) => {
  const circuitIdlObject = idl.accounts!.find(
    (account: any) => account.name === circuitName,
  );

  if (!circuitIdlObject) {
    throw new Error(`${circuitName} does not exist in anchor idl`);
  }

  const fieldNames = circuitIdlObject.type.fields.map(
    (field: { name: string }) => field.name,
  );
  const inputKeys: string[] = [];

  fieldNames.forEach((fieldName: string) => {
    inputKeys.push(fieldName);
  });

  // skip keys which are not utxo data
  let enabled = false;
  inputKeys.forEach((key) => {
    if (enabled) {
      if (!utxoData[key])
        throw new Error(
          `Missing input --> ${key.toString()} in circuit ==> ${circuitName}`,
        );
    } else {
      if (key === "accountEncryptionPublicKey") {
        enabled = true;
      }
    }
  });
};

// TODO: generalize for >16 data inputs
/** Creates utxo data hash using a default hashing schema */
export const createDataHashWithDefaultHashingSchema = (
  utxoData: PlaceHolderTData,
  lightWasm: LightWasm,
): BN => {
  let hashArray: any[] = [];
  for (const attribute in utxoData) {
    hashArray.push(utxoData[attribute]);
  }
  hashArray = hashArray.flat();
  hashArray = hashArray.map((val) => val.toString());
  if (hashArray.length > 16) {
    throw new UtxoError(
      UtxoErrorCode.INVALID_APP_DATA,
      "constructor",
      "utxoData length exceeds 16",
    );
  }
  const utxoDataHash = new BN(
    lightWasm.poseidonHash(hashArray),
    undefined,
    "be",
  );
  return utxoDataHash;
};

// TODO: support multiple utxo names, to pick the correct one (we can probably match the name from the discriminator)

/** Reconstruct a program-owned output utxo from bytes */
export function programOutUtxoFromBytes({
  bytes,
  assetLookupTable,
  lightWasm,
  owner,
  ownerIdl,
  type,
  account,
  compressed = false,
}: {
  bytes: Buffer;
  assetLookupTable: string[];
  lightWasm: LightWasm;
  owner: PublicKey;
  ownerIdl: Idl;
  type: string;
  account?: Account;
  compressed?: boolean;
}): ProgramOutUtxo<PlaceHolderTData> {
  // if it is compressed and adds 64 0 bytes padding
  if (compressed) {
    const tmp: Uint8Array = Uint8Array.from([...Array.from(bytes)]);
    bytes = Buffer.from([
      ...tmp,
      ...new Uint8Array(
        UNCOMPRESSED_UTXO_BYTES_LENGTH - COMPRESSED_UTXO_BYTES_LENGTH,
      ).fill(0),
    ]);
    if (!account)
      throw new UtxoError(
        CreateUtxoErrorCode.ACCOUNT_UNDEFINED,
        "fromBytes",
        "For deserializing a compressed utxo an account is required.",
      );
  }
  const coder = new BorshAccountsCoder(ownerIdl);
  /// TODO: decodedUtxoData should have explicit type, inferred by IDL
  const decodedUtxoData = coder.decode(type + "OutUtxo", bytes);

  const assets = [
    SystemProgram.programId,
    fetchAssetByIdLookUp(decodedUtxoData.splAssetIndex, assetLookupTable),
  ];
  if (!ownerIdl.accounts)
    throw new UtxoError(
      UtxoErrorCode.APP_DATA_IDL_DOES_NOT_HAVE_ACCOUNTS,
      "fromBytes",
    );
  const data = createAccountObject(
    decodedUtxoData,
    ownerIdl.accounts,
    "utxoOutUtxoAppData", // TODO: make name flexible
  );

  const programUtxo = createProgramOutUtxo({
    encryptionPublicKey: new BN(decodedUtxoData.accountEncryptionPublicKey).eq(
      BN_0,
    )
      ? undefined
      : decodedUtxoData.accountEncryptionPublicKey,
    amounts: decodedUtxoData.amounts,
    assets,
    blinding: decodedUtxoData.blinding,
    lightWasm,
    owner,
    ownerIdl,
    data,
    type,
    /// TODO: fix idl naming congruence
    /// Currently, system programs assume 'appDataHash' whereas psp-idl uses 'dataHash'
    /** dataHash (can be custom) gets stored in the encrypted message */
    dataHash: decodedUtxoData.appDataHash
      ? createBN254(decodedUtxoData.appDataHash)
      : createBN254(decodedUtxoData.dataHash),
    /// TODO: add encr/decr tests handling metaHash and address
    /// I'm assuming we don't have coverage for these yet
    address: decodedUtxoData.address,
    metaHash: decodedUtxoData.metaHash,
  });
  return programUtxo;
}

export function programOutUtxoFromString(
  string: string,
  assetLookupTable: string[],
  account: Account,
  lightWasm: LightWasm,
  compressed: boolean = false,
  owner: PublicKey,
  ownerIdl: Idl,
  type: string,
): ProgramOutUtxo<PlaceHolderTData> {
  return programOutUtxoFromBytes({
    bytes: bs58.decode(string),
    assetLookupTable,
    account,
    compressed,
    lightWasm,
    owner,
    ownerIdl,
    type,
  });
}

/**
 * Converts the Utxo instance into a base58 encoded string.
 * @async
 * @returns {Promise<string>} A promise that resolves to the base58 encoded string representation of the Utxo.
 */
export async function programOutUtxoToString(
  utxo: ProgramOutUtxo<PlaceHolderTData>,
  assetLookupTable: string[],
): Promise<string> {
  const bytes = await programOutUtxoToBytes(utxo, assetLookupTable);
  return bs58.encode(bytes);
}

export async function encryptProgramOutUtxo({
  utxo,
  lightWasm,
  account,
  merkleTreePdaPublicKey,
  compressed = false,
  assetLookupTable,
}: {
  utxo: ProgramOutUtxo<PlaceHolderTData>;
  lightWasm: LightWasm;
  account?: Account;
  merkleTreePdaPublicKey?: PublicKey;
  compressed?: boolean;
  assetLookupTable: string[];
}): Promise<Uint8Array> {
  const bytes = await programOutUtxoToBytes(utxo, assetLookupTable, compressed);
  const hash32 = utxo.hash.toArrayLike(Buffer, "be", 32);

  const encryptedUtxo = await encryptOutUtxoInternal({
    bytes,
    hash: hash32,
    lightWasm,
    account,
    merkleTreePdaPublicKey,
    compressed,
    encryptionPublicKey: utxo.encryptionPublicKey,
  });
  return encryptedUtxo;
}

export async function decryptProgramOutUtxo({
  lightWasm,
  encBytes,
  account,
  merkleTreePdaPublicKey,
  aes,
  utxoHash,
  compressed = false,
  assetLookupTable,
  owner,
  ownerIdl,
  type,
}: {
  lightWasm: LightWasm;
  encBytes: Uint8Array;
  account: Account;
  merkleTreePdaPublicKey: PublicKey;
  aes: boolean;
  utxoHash: Uint8Array;
  compressed?: boolean;
  assetLookupTable: string[];
  owner: PublicKey;
  ownerIdl: Idl;
  type: string;
}): Promise<Result<ProgramOutUtxo<PlaceHolderTData> | null, UtxoError>> {
  const cleartext = await decryptOutUtxoInternal({
    encBytes,
    account,
    merkleTreePdaPublicKey,
    aes,
    utxoHash,
    compressed,
  });
  if (!cleartext || cleartext.error || !cleartext.value) return Result.Ok(null);
  const bytes = Buffer.from(cleartext.value);

  return Result.Ok(
    programOutUtxoFromBytes({
      lightWasm,
      bytes,
      account,
      assetLookupTable,
      compressed,
      owner,
      ownerIdl,
      type,
    }),
  );
}

type CreateProgramUtxoInputs = Omit<CreateUtxoInputs, "owner"> & {
  type: string;
  owner: PublicKey;
  ownerIdl: Idl;
  data: PlaceHolderTData;
  dataHash: BN254;
  /// TODO: add dataHash here.
};

export function createProgramUtxo({
  createProgramUtxoInputs,
  account,
  lightWasm,
}: {
  createProgramUtxoInputs: CreateProgramUtxoInputs;
  account: Account;
  lightWasm: LightWasm;
}): ProgramUtxo<PlaceHolderTData> {
  const { type, owner, ownerIdl, data, dataHash, ...createUtxoInputs } =
    createProgramUtxoInputs;
  const {
    merkleTreeLeafIndex,
    hash,
    blinding,
    amounts,
    assets,
    merkleProof,
    metaHash,
    address,
  } = createUtxoInputs;

  if (merkleTreeLeafIndex === undefined) {
    throw new UtxoError(
      CreateUtxoErrorCode.MERKLE_TREE_INDEX_UNDEFINED,
      "createUtxo",
      "Merkle tree index is undefined",
    );
  }
  const merkleTreeLeafIndexBN = new BN(merkleTreeLeafIndex);

  // FIX: enable check; (doesnt work for non psps)
  // checkUtxoData(data, ownerIdl, type + "OutUtxo");

  const nullifier = createNullifierWithAccountSignature(
    account,
    hash,
    merkleTreeLeafIndexBN,
    lightWasm,
  );

  const { version, poolType } = getDefaultUtxoTypeAndVersionV0();

  const programUtxo: ProgramUtxo<PlaceHolderTData> = {
    hash,
    assets,
    amounts,
    blinding,
    type,
    version,
    poolType,
    nullifier,
    isFillingUtxo: false,
    isPublic: false,
    address,
    metaHash,
    merkleProof,
    merkleTreeLeafIndex,
    merkletreeId: new BN(0).toNumber(), // TODO: make merkletreeId dynamic (support parallel merkle trees)
    owner,
    ownerIdl,
    data,
    dataHash,
  };
  return programUtxo;
}

export interface DecryptProgramUtxoParams {
  encBytes: Uint8Array;
  account: Account;
  merkleTreePdaPublicKey: PublicKey;
  aes: boolean;
  utxoHash: Uint8Array;
  lightWasm: LightWasm;
  compressed?: boolean;
  merkleProof: string[];
  merkleTreeLeafIndex: number;
  assetLookupTable: string[];
  owner: PublicKey;
  ownerIdl: Idl;
  type: string;
}

// TODO: Add a test for encrypting and decrypting program-utxo with standard public key.
export async function decryptProgramUtxo({
  encBytes,
  account,
  merkleTreePdaPublicKey,
  aes,
  utxoHash,
  lightWasm,
  compressed = false,
  merkleProof,
  merkleTreeLeafIndex,
  assetLookupTable,
  owner,
  ownerIdl,
  type,
}: DecryptProgramUtxoParams): Promise<
  Result<ProgramUtxo<PlaceHolderTData> | null, UtxoError>
> {
  const decryptedProgramOutUtxo = await decryptProgramOutUtxo({
    encBytes,
    account,
    merkleTreePdaPublicKey,
    aes,
    utxoHash,
    lightWasm,
    compressed,
    assetLookupTable,
    owner,
    ownerIdl,
    type,
  });

  if (!decryptedProgramOutUtxo.value) {
    return decryptedProgramOutUtxo as Result<
      ProgramUtxo<PlaceHolderTData> | null,
      UtxoError
    >;
  }

  return Result.Ok(
    programOutUtxoToProgramUtxo(
      decryptedProgramOutUtxo.value,
      merkleProof,
      merkleTreeLeafIndex,
      lightWasm,
      account,
    ),
  );
}

export function programOutUtxoToProgramUtxo(
  programOutUtxo: ProgramOutUtxo<PlaceHolderTData>,
  merkleProof: string[],
  merkleTreeLeafIndex: number,
  lightWasm: LightWasm,
  account: Account,
): ProgramUtxo<PlaceHolderTData> {
  const inputs: CreateProgramUtxoInputs = {
    hash: programOutUtxo.hash,
    blinding: programOutUtxo.blinding,
    amounts: programOutUtxo.amounts,
    assets: programOutUtxo.assets,
    merkleProof,
    merkleTreeLeafIndex,
    owner: programOutUtxo.owner,
    data: programOutUtxo.data,
    ownerIdl: programOutUtxo.ownerIdl,
    type: programOutUtxo.type,
    address: programOutUtxo.address,
    metaHash: programOutUtxo.metaHash,
    dataHash: programOutUtxo.dataHash,
  };

  return createProgramUtxo({
    createProgramUtxoInputs: inputs,
    account,
    lightWasm,
  });
}
