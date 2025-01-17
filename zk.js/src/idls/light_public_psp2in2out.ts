export type LightPublicPsp2in2out = {
  "version": "0.3.1",
  "name": "light_public_psp2in2out",
  "constants": [
    {
      "name": "PROGRAM_ID",
      "type": "string",
      "value": "\"9sixVEthz2kMSKfeApZXHwuboT6DZuT6crAYJTciUCqE\""
    },
    {
      "name": "VERIFYINGKEY_PUBLIC_PROGRAM_TRANSACTION2_IN2_OUT_MAIN",
      "type": {
        "defined": "Groth16Verifyingkey"
      },
      "value": "Groth16Verifyingkey { nr_pubinputs : 14 , vk_alpha_g1 : [45 , 77 , 154 , 167 , 227 , 2 , 217 , 223 , 65 , 116 , 157 , 85 , 7 , 148 , 157 , 5 , 219 , 234 , 51 , 251 , 177 , 108 , 100 , 59 , 34 , 245 , 153 , 162 , 190 , 109 , 242 , 226 , 20 , 190 , 221 , 80 , 60 , 55 , 206 , 176 , 97 , 216 , 236 , 96 , 32 , 159 , 227 , 69 , 206 , 137 , 131 , 10 , 25 , 35 , 3 , 1 , 240 , 118 , 202 , 255 , 0 , 77 , 25 , 38] , vk_beta_g2 : [9 , 103 , 3 , 47 , 203 , 247 , 118 , 209 , 175 , 201 , 133 , 248 , 136 , 119 , 241 , 130 , 211 , 132 , 128 , 166 , 83 , 242 , 222 , 202 , 169 , 121 , 76 , 188 , 59 , 243 , 6 , 12 , 14 , 24 , 120 , 71 , 173 , 76 , 121 , 131 , 116 , 208 , 214 , 115 , 43 , 245 , 1 , 132 , 125 , 214 , 139 , 192 , 224 , 113 , 36 , 30 , 2 , 19 , 188 , 127 , 193 , 61 , 183 , 171 , 48 , 76 , 251 , 209 , 224 , 138 , 112 , 74 , 153 , 245 , 232 , 71 , 217 , 63 , 140 , 60 , 170 , 253 , 222 , 196 , 107 , 122 , 13 , 55 , 157 , 166 , 154 , 77 , 17 , 35 , 70 , 167 , 23 , 57 , 193 , 177 , 164 , 87 , 168 , 199 , 49 , 49 , 35 , 210 , 77 , 47 , 145 , 146 , 248 , 150 , 183 , 198 , 62 , 234 , 5 , 169 , 213 , 127 , 6 , 84 , 122 , 208 , 206 , 200] , vk_gamme_g2 : [25 , 142 , 147 , 147 , 146 , 13 , 72 , 58 , 114 , 96 , 191 , 183 , 49 , 251 , 93 , 37 , 241 , 170 , 73 , 51 , 53 , 169 , 231 , 18 , 151 , 228 , 133 , 183 , 174 , 243 , 18 , 194 , 24 , 0 , 222 , 239 , 18 , 31 , 30 , 118 , 66 , 106 , 0 , 102 , 94 , 92 , 68 , 121 , 103 , 67 , 34 , 212 , 247 , 94 , 218 , 221 , 70 , 222 , 189 , 92 , 217 , 146 , 246 , 237 , 9 , 6 , 137 , 208 , 88 , 95 , 240 , 117 , 236 , 158 , 153 , 173 , 105 , 12 , 51 , 149 , 188 , 75 , 49 , 51 , 112 , 179 , 142 , 243 , 85 , 172 , 218 , 220 , 209 , 34 , 151 , 91 , 18 , 200 , 94 , 165 , 219 , 140 , 109 , 235 , 74 , 171 , 113 , 128 , 141 , 203 , 64 , 143 , 227 , 209 , 231 , 105 , 12 , 67 , 211 , 123 , 76 , 230 , 204 , 1 , 102 , 250 , 125 , 170] , vk_delta_g2 : [41 , 52 , 210 , 87 , 129 , 214 , 82 , 16 , 18 , 119 , 211 , 155 , 222 , 158 , 102 , 80 , 116 , 241 , 79 , 144 , 68 , 156 , 90 , 44 , 197 , 50 , 221 , 59 , 25 , 2 , 126 , 23 , 20 , 251 , 142 , 33 , 150 , 5 , 45 , 237 , 172 , 150 , 198 , 254 , 169 , 153 , 107 , 63 , 154 , 205 , 223 , 41 , 89 , 107 , 68 , 68 , 109 , 106 , 2 , 216 , 153 , 166 , 113 , 218 , 3 , 118 , 86 , 254 , 8 , 22 , 31 , 191 , 159 , 184 , 59 , 129 , 102 , 170 , 124 , 108 , 80 , 37 , 165 , 83 , 56 , 89 , 100 , 132 , 20 , 152 , 203 , 94 , 177 , 217 , 0 , 200 , 32 , 55 , 74 , 117 , 156 , 4 , 149 , 229 , 175 , 242 , 5 , 128 , 187 , 155 , 66 , 229 , 169 , 88 , 8 , 197 , 198 , 10 , 57 , 148 , 206 , 92 , 151 , 30 , 42 , 207 , 4 , 238] , vk_ic : & [[45 , 71 , 48 , 195 , 225 , 65 , 106 , 39 , 175 , 81 , 93 , 222 , 189 , 14 , 44 , 192 , 12 , 215 , 242 , 169 , 16 , 84 , 240 , 131 , 163 , 50 , 51 , 8 , 126 , 81 , 181 , 93 , 18 , 154 , 25 , 187 , 148 , 37 , 235 , 114 , 83 , 53 , 72 , 41 , 44 , 43 , 202 , 161 , 16 , 62 , 184 , 110 , 5 , 179 , 138 , 131 , 36 , 97 , 88 , 45 , 197 , 221 , 170 , 48] , [23 , 138 , 103 , 50 , 71 , 80 , 239 , 207 , 104 , 78 , 191 , 177 , 57 , 0 , 35 , 93 , 236 , 204 , 150 , 164 , 115 , 52 , 135 , 7 , 179 , 200 , 107 , 207 , 67 , 76 , 177 , 193 , 23 , 82 , 193 , 176 , 129 , 215 , 13 , 135 , 153 , 207 , 255 , 90 , 182 , 237 , 169 , 31 , 91 , 110 , 123 , 78 , 77 , 122 , 53 , 50 , 146 , 152 , 190 , 237 , 84 , 211 , 205 , 15] , [41 , 155 , 233 , 174 , 37 , 70 , 130 , 40 , 139 , 248 , 137 , 132 , 7 , 248 , 245 , 51 , 109 , 151 , 18 , 45 , 85 , 98 , 237 , 98 , 235 , 161 , 224 , 49 , 66 , 28 , 20 , 123 , 33 , 237 , 194 , 247 , 251 , 160 , 134 , 8 , 24 , 243 , 101 , 66 , 78 , 228 , 63 , 160 , 83 , 204 , 166 , 142 , 225 , 245 , 14 , 242 , 9 , 183 , 195 , 57 , 111 , 149 , 228 , 118] , [42 , 17 , 89 , 129 , 241 , 199 , 84 , 50 , 183 , 141 , 157 , 47 , 50 , 82 , 103 , 163 , 30 , 82 , 66 , 158 , 137 , 234 , 189 , 244 , 252 , 6 , 86 , 122 , 116 , 246 , 94 , 91 , 33 , 135 , 28 , 25 , 205 , 188 , 109 , 104 , 150 , 13 , 35 , 162 , 91 , 9 , 97 , 254 , 242 , 12 , 65 , 137 , 74 , 138 , 217 , 160 , 97 , 179 , 149 , 243 , 135 , 218 , 162 , 194] , [13 , 29 , 10 , 222 , 14 , 52 , 119 , 105 , 153 , 133 , 16 , 32 , 115 , 184 , 86 , 31 , 24 , 148 , 99 , 5 , 190 , 246 , 255 , 243 , 36 , 189 , 52 , 170 , 241 , 206 , 34 , 195 , 26 , 141 , 57 , 71 , 253 , 53 , 121 , 51 , 228 , 50 , 197 , 6 , 190 , 199 , 194 , 113 , 116 , 251 , 193 , 101 , 88 , 81 , 236 , 105 , 36 , 99 , 158 , 51 , 2 , 190 , 186 , 149] , [25 , 101 , 217 , 154 , 168 , 239 , 2 , 178 , 172 , 29 , 224 , 161 , 100 , 160 , 21 , 118 , 195 , 128 , 58 , 107 , 70 , 14 , 218 , 251 , 73 , 254 , 69 , 155 , 249 , 13 , 230 , 137 , 28 , 95 , 65 , 2 , 239 , 83 , 215 , 217 , 248 , 154 , 78 , 57 , 9 , 53 , 249 , 102 , 97 , 195 , 91 , 152 , 147 , 4 , 93 , 18 , 210 , 15 , 67 , 64 , 170 , 164 , 174 , 1] , [8 , 113 , 151 , 66 , 215 , 193 , 164 , 230 , 84 , 104 , 95 , 89 , 217 , 30 , 250 , 252 , 135 , 225 , 126 , 54 , 234 , 105 , 18 , 169 , 51 , 21 , 252 , 25 , 95 , 113 , 240 , 128 , 46 , 121 , 23 , 45 , 181 , 195 , 126 , 33 , 135 , 176 , 122 , 146 , 32 , 70 , 140 , 103 , 172 , 152 , 19 , 204 , 49 , 211 , 209 , 132 , 244 , 232 , 44 , 46 , 83 , 233 , 84 , 112] , [25 , 81 , 224 , 3 , 220 , 146 , 16 , 19 , 127 , 165 , 3 , 73 , 88 , 138 , 246 , 130 , 193 , 234 , 242 , 105 , 186 , 5 , 28 , 24 , 254 , 148 , 76 , 212 , 225 , 152 , 184 , 180 , 14 , 122 , 160 , 139 , 240 , 104 , 122 , 136 , 157 , 151 , 202 , 185 , 32 , 176 , 44 , 124 , 179 , 111 , 80 , 202 , 235 , 101 , 145 , 169 , 172 , 92 , 136 , 169 , 234 , 174 , 124 , 235] , [12 , 8 , 161 , 237 , 3 , 19 , 68 , 74 , 249 , 56 , 9 , 51 , 151 , 104 , 162 , 155 , 34 , 212 , 65 , 123 , 120 , 255 , 36 , 5 , 146 , 33 , 20 , 89 , 12 , 146 , 111 , 65 , 1 , 60 , 212 , 116 , 213 , 153 , 132 , 96 , 191 , 206 , 202 , 113 , 47 , 245 , 108 , 134 , 99 , 49 , 133 , 221 , 229 , 197 , 141 , 81 , 246 , 27 , 12 , 68 , 241 , 205 , 199 , 206] , [36 , 23 , 78 , 11 , 192 , 136 , 115 , 40 , 145 , 215 , 203 , 127 , 158 , 150 , 213 , 228 , 19 , 101 , 251 , 206 , 119 , 17 , 241 , 122 , 71 , 13 , 249 , 207 , 55 , 24 , 153 , 186 , 37 , 11 , 143 , 217 , 36 , 109 , 196 , 187 , 80 , 168 , 208 , 31 , 140 , 178 , 131 , 221 , 63 , 16 , 51 , 244 , 41 , 85 , 106 , 58 , 114 , 114 , 163 , 211 , 202 , 171 , 64 , 73] , [17 , 241 , 220 , 167 , 0 , 207 , 8 , 162 , 109 , 132 , 136 , 186 , 60 , 80 , 43 , 232 , 174 , 2 , 247 , 234 , 156 , 213 , 31 , 72 , 98 , 0 , 182 , 95 , 150 , 162 , 204 , 7 , 11 , 109 , 147 , 213 , 245 , 191 , 180 , 216 , 167 , 55 , 144 , 116 , 53 , 9 , 30 , 77 , 120 , 209 , 63 , 15 , 45 , 198 , 92 , 34 , 139 , 56 , 52 , 137 , 216 , 240 , 171 , 84] , [28 , 24 , 139 , 74 , 154 , 17 , 195 , 136 , 173 , 198 , 0 , 247 , 124 , 19 , 42 , 120 , 198 , 174 , 122 , 186 , 11 , 24 , 252 , 244 , 127 , 137 , 172 , 17 , 167 , 153 , 220 , 99 , 17 , 96 , 45 , 255 , 248 , 176 , 174 , 246 , 66 , 178 , 94 , 195 , 214 , 90 , 155 , 81 , 16 , 243 , 25 , 82 , 158 , 240 , 183 , 120 , 200 , 229 , 159 , 242 , 52 , 245 , 56 , 133] , [23 , 91 , 126 , 179 , 219 , 143 , 254 , 202 , 198 , 96 , 41 , 154 , 233 , 171 , 60 , 78 , 218 , 204 , 242 , 100 , 80 , 254 , 203 , 214 , 198 , 253 , 24 , 151 , 230 , 116 , 26 , 37 , 16 , 237 , 140 , 89 , 192 , 243 , 124 , 139 , 3 , 63 , 137 , 45 , 230 , 248 , 49 , 65 , 158 , 234 , 106 , 4 , 42 , 3 , 58 , 171 , 82 , 224 , 220 , 161 , 8 , 37 , 186 , 38] , [10 , 47 , 176 , 83 , 92 , 17 , 119 , 12 , 4 , 211 , 135 , 198 , 232 , 24 , 13 , 200 , 190 , 138 , 46 , 141 , 101 , 82 , 113 , 143 , 91 , 179 , 208 , 129 , 144 , 68 , 11 , 215 , 41 , 20 , 166 , 239 , 152 , 113 , 184 , 200 , 7 , 91 , 242 , 65 , 179 , 34 , 113 , 28 , 110 , 158 , 206 , 238 , 220 , 169 , 151 , 199 , 231 , 98 , 11 , 246 , 31 , 123 , 142 , 13] , [31 , 188 , 186 , 92 , 18 , 83 , 209 , 201 , 5 , 159 , 97 , 93 , 111 , 93 , 177 , 82 , 25 , 190 , 207 , 72 , 124 , 11 , 85 , 183 , 217 , 114 , 244 , 247 , 53 , 39 , 188 , 83 , 33 , 27 , 32 , 27 , 11 , 236 , 183 , 107 , 131 , 7 , 19 , 176 , 67 , 247 , 2 , 12 , 230 , 163 , 86 , 250 , 59 , 234 , 54 , 88 , 157 , 15 , 113 , 194 , 192 , 240 , 233 , 79]] , }"
    }
  ],
  "instructions": [
    {
      "name": "shieldedTransferFirst",
      "docs": [
        "This instruction is the first step of a shieled transaction.",
        "It creates and initializes a verifier state account to save state of a verification during",
        "computation verifying the zero-knowledge proof (ZKP). Additionally, it stores other data",
        "such as leaves, amounts, recipients, nullifiers, etc. to execute the protocol logic",
        "in the last transaction after successful ZKP verification. light_verifier_sdk::light_instruction::LightInstruction2"
      ],
      "accounts": [
        {
          "name": "signingAddress",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "programMerkleTree",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "merkleTreeSet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rpcRecipientSol",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "senderSol",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipientSol",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenAuthority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "senderSpl",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipientSpl",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "registeredVerifierPda",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verifier config pda which needs to exist."
          ]
        },
        {
          "name": "logWrapper",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "inputs",
          "type": "bytes"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "instructionDataShieldedTransferFirst",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proofA",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "proofB",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "proofC",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "publicAmountSpl",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "publicNullifier",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "publicOutUtxoHash",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "publicAmountSol",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "rootIndex",
            "type": "u64"
          },
          {
            "name": "rpcFee",
            "type": "u64"
          },
          {
            "name": "encryptedUtxos",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "u256",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "x",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "utxo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amounts",
            "type": {
              "array": [
                "u64",
                2
              ]
            }
          },
          {
            "name": "splAssetIndex",
            "type": "u64"
          },
          {
            "name": "verifierAddressIndex",
            "type": "u64"
          },
          {
            "name": "blinding",
            "type": "u256"
          },
          {
            "name": "dataHash",
            "type": "u256"
          },
          {
            "name": "accountShieldedPublicKey",
            "type": "u256"
          },
          {
            "name": "accountEncryptionPublicKey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "outUtxo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amounts",
            "type": {
              "array": [
                "u64",
                2
              ]
            }
          },
          {
            "name": "splAssetIndex",
            "type": "u64"
          },
          {
            "name": "blinding",
            "type": "u256"
          },
          {
            "name": "utxoDataHash",
            "type": "u256"
          },
          {
            "name": "accountShieldedPublicKey",
            "type": "u256"
          },
          {
            "name": "accountEncryptionPublicKey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "isFillingUtxo",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "zKpublicProgramTransaction2In2OutMainProofInputs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "publicStateRoot",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicAmountSpl",
            "type": "u8"
          },
          {
            "name": "publicDataHash",
            "type": "u8"
          },
          {
            "name": "publicAmountSol",
            "type": "u8"
          },
          {
            "name": "publicMintPublicKey",
            "type": "u8"
          },
          {
            "name": "publicInUtxoHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicOutUtxoHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicNewAddress",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicInUtxoDataHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicProgramId",
            "type": "u8"
          },
          {
            "name": "publicTransactionHash",
            "type": "u8"
          },
          {
            "name": "assetPublicKeys",
            "type": {
              "array": [
                "u8",
                3
              ]
            }
          },
          {
            "name": "privatePublicDataHash",
            "type": "u8"
          },
          {
            "name": "isInProgramUtxo",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "inOwner",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "inAmount",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    2
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "inPrivateKey",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "inBlinding",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "inDataHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "leafIndex",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "merkleProof",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    22
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "inIndices",
            "type": {
              "array": [
                {
                  "array": [
                    {
                      "array": [
                        "u8",
                        3
                      ]
                    },
                    2
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "nullifierLeafIndex",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "nullifierMerkleProof",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    22
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "outAmount",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    2
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "outOwner",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "outBlinding",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "outDataHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "outIndices",
            "type": {
              "array": [
                {
                  "array": [
                    {
                      "array": [
                        "u8",
                        3
                      ]
                    },
                    2
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "metaHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "isMetaHashUtxo",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "inAddress",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "isInAddress",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "isNewAddress",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "isOutProgramUtxo",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          }
        ]
      }
    },
    {
      "name": "zKpublicProgramTransaction2In2OutMainPublicInputs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "publicStateRoot",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicAmountSpl",
            "type": "u8"
          },
          {
            "name": "publicDataHash",
            "type": "u8"
          },
          {
            "name": "publicAmountSol",
            "type": "u8"
          },
          {
            "name": "publicMintPublicKey",
            "type": "u8"
          },
          {
            "name": "publicInUtxoHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicOutUtxoHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicNewAddress",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicInUtxoDataHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          }
        ]
      }
    },
    {
      "name": "instructionDataLightInstructionPublicProgramTransaction2In2OutMainSecond",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "publicStateRoot",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "publicAmountSpl",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "publicDataHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "publicAmountSol",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "publicMintPublicKey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "publicInUtxoHash",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "publicOutUtxoHash",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "publicNewAddress",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "publicInUtxoDataHash",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                2
              ]
            }
          }
        ]
      }
    }
  ]
};

export const IDL: LightPublicPsp2in2out = {
  "version": "0.3.1",
  "name": "light_public_psp2in2out",
  "constants": [
    {
      "name": "PROGRAM_ID",
      "type": "string",
      "value": "\"9sixVEthz2kMSKfeApZXHwuboT6DZuT6crAYJTciUCqE\""
    },
    {
      "name": "VERIFYINGKEY_PUBLIC_PROGRAM_TRANSACTION2_IN2_OUT_MAIN",
      "type": {
        "defined": "Groth16Verifyingkey"
      },
      "value": "Groth16Verifyingkey { nr_pubinputs : 14 , vk_alpha_g1 : [45 , 77 , 154 , 167 , 227 , 2 , 217 , 223 , 65 , 116 , 157 , 85 , 7 , 148 , 157 , 5 , 219 , 234 , 51 , 251 , 177 , 108 , 100 , 59 , 34 , 245 , 153 , 162 , 190 , 109 , 242 , 226 , 20 , 190 , 221 , 80 , 60 , 55 , 206 , 176 , 97 , 216 , 236 , 96 , 32 , 159 , 227 , 69 , 206 , 137 , 131 , 10 , 25 , 35 , 3 , 1 , 240 , 118 , 202 , 255 , 0 , 77 , 25 , 38] , vk_beta_g2 : [9 , 103 , 3 , 47 , 203 , 247 , 118 , 209 , 175 , 201 , 133 , 248 , 136 , 119 , 241 , 130 , 211 , 132 , 128 , 166 , 83 , 242 , 222 , 202 , 169 , 121 , 76 , 188 , 59 , 243 , 6 , 12 , 14 , 24 , 120 , 71 , 173 , 76 , 121 , 131 , 116 , 208 , 214 , 115 , 43 , 245 , 1 , 132 , 125 , 214 , 139 , 192 , 224 , 113 , 36 , 30 , 2 , 19 , 188 , 127 , 193 , 61 , 183 , 171 , 48 , 76 , 251 , 209 , 224 , 138 , 112 , 74 , 153 , 245 , 232 , 71 , 217 , 63 , 140 , 60 , 170 , 253 , 222 , 196 , 107 , 122 , 13 , 55 , 157 , 166 , 154 , 77 , 17 , 35 , 70 , 167 , 23 , 57 , 193 , 177 , 164 , 87 , 168 , 199 , 49 , 49 , 35 , 210 , 77 , 47 , 145 , 146 , 248 , 150 , 183 , 198 , 62 , 234 , 5 , 169 , 213 , 127 , 6 , 84 , 122 , 208 , 206 , 200] , vk_gamme_g2 : [25 , 142 , 147 , 147 , 146 , 13 , 72 , 58 , 114 , 96 , 191 , 183 , 49 , 251 , 93 , 37 , 241 , 170 , 73 , 51 , 53 , 169 , 231 , 18 , 151 , 228 , 133 , 183 , 174 , 243 , 18 , 194 , 24 , 0 , 222 , 239 , 18 , 31 , 30 , 118 , 66 , 106 , 0 , 102 , 94 , 92 , 68 , 121 , 103 , 67 , 34 , 212 , 247 , 94 , 218 , 221 , 70 , 222 , 189 , 92 , 217 , 146 , 246 , 237 , 9 , 6 , 137 , 208 , 88 , 95 , 240 , 117 , 236 , 158 , 153 , 173 , 105 , 12 , 51 , 149 , 188 , 75 , 49 , 51 , 112 , 179 , 142 , 243 , 85 , 172 , 218 , 220 , 209 , 34 , 151 , 91 , 18 , 200 , 94 , 165 , 219 , 140 , 109 , 235 , 74 , 171 , 113 , 128 , 141 , 203 , 64 , 143 , 227 , 209 , 231 , 105 , 12 , 67 , 211 , 123 , 76 , 230 , 204 , 1 , 102 , 250 , 125 , 170] , vk_delta_g2 : [41 , 52 , 210 , 87 , 129 , 214 , 82 , 16 , 18 , 119 , 211 , 155 , 222 , 158 , 102 , 80 , 116 , 241 , 79 , 144 , 68 , 156 , 90 , 44 , 197 , 50 , 221 , 59 , 25 , 2 , 126 , 23 , 20 , 251 , 142 , 33 , 150 , 5 , 45 , 237 , 172 , 150 , 198 , 254 , 169 , 153 , 107 , 63 , 154 , 205 , 223 , 41 , 89 , 107 , 68 , 68 , 109 , 106 , 2 , 216 , 153 , 166 , 113 , 218 , 3 , 118 , 86 , 254 , 8 , 22 , 31 , 191 , 159 , 184 , 59 , 129 , 102 , 170 , 124 , 108 , 80 , 37 , 165 , 83 , 56 , 89 , 100 , 132 , 20 , 152 , 203 , 94 , 177 , 217 , 0 , 200 , 32 , 55 , 74 , 117 , 156 , 4 , 149 , 229 , 175 , 242 , 5 , 128 , 187 , 155 , 66 , 229 , 169 , 88 , 8 , 197 , 198 , 10 , 57 , 148 , 206 , 92 , 151 , 30 , 42 , 207 , 4 , 238] , vk_ic : & [[45 , 71 , 48 , 195 , 225 , 65 , 106 , 39 , 175 , 81 , 93 , 222 , 189 , 14 , 44 , 192 , 12 , 215 , 242 , 169 , 16 , 84 , 240 , 131 , 163 , 50 , 51 , 8 , 126 , 81 , 181 , 93 , 18 , 154 , 25 , 187 , 148 , 37 , 235 , 114 , 83 , 53 , 72 , 41 , 44 , 43 , 202 , 161 , 16 , 62 , 184 , 110 , 5 , 179 , 138 , 131 , 36 , 97 , 88 , 45 , 197 , 221 , 170 , 48] , [23 , 138 , 103 , 50 , 71 , 80 , 239 , 207 , 104 , 78 , 191 , 177 , 57 , 0 , 35 , 93 , 236 , 204 , 150 , 164 , 115 , 52 , 135 , 7 , 179 , 200 , 107 , 207 , 67 , 76 , 177 , 193 , 23 , 82 , 193 , 176 , 129 , 215 , 13 , 135 , 153 , 207 , 255 , 90 , 182 , 237 , 169 , 31 , 91 , 110 , 123 , 78 , 77 , 122 , 53 , 50 , 146 , 152 , 190 , 237 , 84 , 211 , 205 , 15] , [41 , 155 , 233 , 174 , 37 , 70 , 130 , 40 , 139 , 248 , 137 , 132 , 7 , 248 , 245 , 51 , 109 , 151 , 18 , 45 , 85 , 98 , 237 , 98 , 235 , 161 , 224 , 49 , 66 , 28 , 20 , 123 , 33 , 237 , 194 , 247 , 251 , 160 , 134 , 8 , 24 , 243 , 101 , 66 , 78 , 228 , 63 , 160 , 83 , 204 , 166 , 142 , 225 , 245 , 14 , 242 , 9 , 183 , 195 , 57 , 111 , 149 , 228 , 118] , [42 , 17 , 89 , 129 , 241 , 199 , 84 , 50 , 183 , 141 , 157 , 47 , 50 , 82 , 103 , 163 , 30 , 82 , 66 , 158 , 137 , 234 , 189 , 244 , 252 , 6 , 86 , 122 , 116 , 246 , 94 , 91 , 33 , 135 , 28 , 25 , 205 , 188 , 109 , 104 , 150 , 13 , 35 , 162 , 91 , 9 , 97 , 254 , 242 , 12 , 65 , 137 , 74 , 138 , 217 , 160 , 97 , 179 , 149 , 243 , 135 , 218 , 162 , 194] , [13 , 29 , 10 , 222 , 14 , 52 , 119 , 105 , 153 , 133 , 16 , 32 , 115 , 184 , 86 , 31 , 24 , 148 , 99 , 5 , 190 , 246 , 255 , 243 , 36 , 189 , 52 , 170 , 241 , 206 , 34 , 195 , 26 , 141 , 57 , 71 , 253 , 53 , 121 , 51 , 228 , 50 , 197 , 6 , 190 , 199 , 194 , 113 , 116 , 251 , 193 , 101 , 88 , 81 , 236 , 105 , 36 , 99 , 158 , 51 , 2 , 190 , 186 , 149] , [25 , 101 , 217 , 154 , 168 , 239 , 2 , 178 , 172 , 29 , 224 , 161 , 100 , 160 , 21 , 118 , 195 , 128 , 58 , 107 , 70 , 14 , 218 , 251 , 73 , 254 , 69 , 155 , 249 , 13 , 230 , 137 , 28 , 95 , 65 , 2 , 239 , 83 , 215 , 217 , 248 , 154 , 78 , 57 , 9 , 53 , 249 , 102 , 97 , 195 , 91 , 152 , 147 , 4 , 93 , 18 , 210 , 15 , 67 , 64 , 170 , 164 , 174 , 1] , [8 , 113 , 151 , 66 , 215 , 193 , 164 , 230 , 84 , 104 , 95 , 89 , 217 , 30 , 250 , 252 , 135 , 225 , 126 , 54 , 234 , 105 , 18 , 169 , 51 , 21 , 252 , 25 , 95 , 113 , 240 , 128 , 46 , 121 , 23 , 45 , 181 , 195 , 126 , 33 , 135 , 176 , 122 , 146 , 32 , 70 , 140 , 103 , 172 , 152 , 19 , 204 , 49 , 211 , 209 , 132 , 244 , 232 , 44 , 46 , 83 , 233 , 84 , 112] , [25 , 81 , 224 , 3 , 220 , 146 , 16 , 19 , 127 , 165 , 3 , 73 , 88 , 138 , 246 , 130 , 193 , 234 , 242 , 105 , 186 , 5 , 28 , 24 , 254 , 148 , 76 , 212 , 225 , 152 , 184 , 180 , 14 , 122 , 160 , 139 , 240 , 104 , 122 , 136 , 157 , 151 , 202 , 185 , 32 , 176 , 44 , 124 , 179 , 111 , 80 , 202 , 235 , 101 , 145 , 169 , 172 , 92 , 136 , 169 , 234 , 174 , 124 , 235] , [12 , 8 , 161 , 237 , 3 , 19 , 68 , 74 , 249 , 56 , 9 , 51 , 151 , 104 , 162 , 155 , 34 , 212 , 65 , 123 , 120 , 255 , 36 , 5 , 146 , 33 , 20 , 89 , 12 , 146 , 111 , 65 , 1 , 60 , 212 , 116 , 213 , 153 , 132 , 96 , 191 , 206 , 202 , 113 , 47 , 245 , 108 , 134 , 99 , 49 , 133 , 221 , 229 , 197 , 141 , 81 , 246 , 27 , 12 , 68 , 241 , 205 , 199 , 206] , [36 , 23 , 78 , 11 , 192 , 136 , 115 , 40 , 145 , 215 , 203 , 127 , 158 , 150 , 213 , 228 , 19 , 101 , 251 , 206 , 119 , 17 , 241 , 122 , 71 , 13 , 249 , 207 , 55 , 24 , 153 , 186 , 37 , 11 , 143 , 217 , 36 , 109 , 196 , 187 , 80 , 168 , 208 , 31 , 140 , 178 , 131 , 221 , 63 , 16 , 51 , 244 , 41 , 85 , 106 , 58 , 114 , 114 , 163 , 211 , 202 , 171 , 64 , 73] , [17 , 241 , 220 , 167 , 0 , 207 , 8 , 162 , 109 , 132 , 136 , 186 , 60 , 80 , 43 , 232 , 174 , 2 , 247 , 234 , 156 , 213 , 31 , 72 , 98 , 0 , 182 , 95 , 150 , 162 , 204 , 7 , 11 , 109 , 147 , 213 , 245 , 191 , 180 , 216 , 167 , 55 , 144 , 116 , 53 , 9 , 30 , 77 , 120 , 209 , 63 , 15 , 45 , 198 , 92 , 34 , 139 , 56 , 52 , 137 , 216 , 240 , 171 , 84] , [28 , 24 , 139 , 74 , 154 , 17 , 195 , 136 , 173 , 198 , 0 , 247 , 124 , 19 , 42 , 120 , 198 , 174 , 122 , 186 , 11 , 24 , 252 , 244 , 127 , 137 , 172 , 17 , 167 , 153 , 220 , 99 , 17 , 96 , 45 , 255 , 248 , 176 , 174 , 246 , 66 , 178 , 94 , 195 , 214 , 90 , 155 , 81 , 16 , 243 , 25 , 82 , 158 , 240 , 183 , 120 , 200 , 229 , 159 , 242 , 52 , 245 , 56 , 133] , [23 , 91 , 126 , 179 , 219 , 143 , 254 , 202 , 198 , 96 , 41 , 154 , 233 , 171 , 60 , 78 , 218 , 204 , 242 , 100 , 80 , 254 , 203 , 214 , 198 , 253 , 24 , 151 , 230 , 116 , 26 , 37 , 16 , 237 , 140 , 89 , 192 , 243 , 124 , 139 , 3 , 63 , 137 , 45 , 230 , 248 , 49 , 65 , 158 , 234 , 106 , 4 , 42 , 3 , 58 , 171 , 82 , 224 , 220 , 161 , 8 , 37 , 186 , 38] , [10 , 47 , 176 , 83 , 92 , 17 , 119 , 12 , 4 , 211 , 135 , 198 , 232 , 24 , 13 , 200 , 190 , 138 , 46 , 141 , 101 , 82 , 113 , 143 , 91 , 179 , 208 , 129 , 144 , 68 , 11 , 215 , 41 , 20 , 166 , 239 , 152 , 113 , 184 , 200 , 7 , 91 , 242 , 65 , 179 , 34 , 113 , 28 , 110 , 158 , 206 , 238 , 220 , 169 , 151 , 199 , 231 , 98 , 11 , 246 , 31 , 123 , 142 , 13] , [31 , 188 , 186 , 92 , 18 , 83 , 209 , 201 , 5 , 159 , 97 , 93 , 111 , 93 , 177 , 82 , 25 , 190 , 207 , 72 , 124 , 11 , 85 , 183 , 217 , 114 , 244 , 247 , 53 , 39 , 188 , 83 , 33 , 27 , 32 , 27 , 11 , 236 , 183 , 107 , 131 , 7 , 19 , 176 , 67 , 247 , 2 , 12 , 230 , 163 , 86 , 250 , 59 , 234 , 54 , 88 , 157 , 15 , 113 , 194 , 192 , 240 , 233 , 79]] , }"
    }
  ],
  "instructions": [
    {
      "name": "shieldedTransferFirst",
      "docs": [
        "This instruction is the first step of a shieled transaction.",
        "It creates and initializes a verifier state account to save state of a verification during",
        "computation verifying the zero-knowledge proof (ZKP). Additionally, it stores other data",
        "such as leaves, amounts, recipients, nullifiers, etc. to execute the protocol logic",
        "in the last transaction after successful ZKP verification. light_verifier_sdk::light_instruction::LightInstruction2"
      ],
      "accounts": [
        {
          "name": "signingAddress",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "programMerkleTree",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "merkleTreeSet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rpcRecipientSol",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "senderSol",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipientSol",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenAuthority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "senderSpl",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipientSpl",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "registeredVerifierPda",
          "isMut": true,
          "isSigner": false,
          "docs": [
            "Verifier config pda which needs to exist."
          ]
        },
        {
          "name": "logWrapper",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "inputs",
          "type": "bytes"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "instructionDataShieldedTransferFirst",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "proofA",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "proofB",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "proofC",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "publicAmountSpl",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "publicNullifier",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "publicOutUtxoHash",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "publicAmountSol",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "rootIndex",
            "type": "u64"
          },
          {
            "name": "rpcFee",
            "type": "u64"
          },
          {
            "name": "encryptedUtxos",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "u256",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "x",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "utxo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amounts",
            "type": {
              "array": [
                "u64",
                2
              ]
            }
          },
          {
            "name": "splAssetIndex",
            "type": "u64"
          },
          {
            "name": "verifierAddressIndex",
            "type": "u64"
          },
          {
            "name": "blinding",
            "type": "u256"
          },
          {
            "name": "dataHash",
            "type": "u256"
          },
          {
            "name": "accountShieldedPublicKey",
            "type": "u256"
          },
          {
            "name": "accountEncryptionPublicKey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "outUtxo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amounts",
            "type": {
              "array": [
                "u64",
                2
              ]
            }
          },
          {
            "name": "splAssetIndex",
            "type": "u64"
          },
          {
            "name": "blinding",
            "type": "u256"
          },
          {
            "name": "utxoDataHash",
            "type": "u256"
          },
          {
            "name": "accountShieldedPublicKey",
            "type": "u256"
          },
          {
            "name": "accountEncryptionPublicKey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "isFillingUtxo",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "zKpublicProgramTransaction2In2OutMainProofInputs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "publicStateRoot",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicAmountSpl",
            "type": "u8"
          },
          {
            "name": "publicDataHash",
            "type": "u8"
          },
          {
            "name": "publicAmountSol",
            "type": "u8"
          },
          {
            "name": "publicMintPublicKey",
            "type": "u8"
          },
          {
            "name": "publicInUtxoHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicOutUtxoHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicNewAddress",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicInUtxoDataHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicProgramId",
            "type": "u8"
          },
          {
            "name": "publicTransactionHash",
            "type": "u8"
          },
          {
            "name": "assetPublicKeys",
            "type": {
              "array": [
                "u8",
                3
              ]
            }
          },
          {
            "name": "privatePublicDataHash",
            "type": "u8"
          },
          {
            "name": "isInProgramUtxo",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "inOwner",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "inAmount",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    2
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "inPrivateKey",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "inBlinding",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "inDataHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "leafIndex",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "merkleProof",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    22
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "inIndices",
            "type": {
              "array": [
                {
                  "array": [
                    {
                      "array": [
                        "u8",
                        3
                      ]
                    },
                    2
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "nullifierLeafIndex",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "nullifierMerkleProof",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    22
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "outAmount",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    2
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "outOwner",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "outBlinding",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "outDataHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "outIndices",
            "type": {
              "array": [
                {
                  "array": [
                    {
                      "array": [
                        "u8",
                        3
                      ]
                    },
                    2
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "metaHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "isMetaHashUtxo",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "inAddress",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "isInAddress",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "isNewAddress",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "isOutProgramUtxo",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          }
        ]
      }
    },
    {
      "name": "zKpublicProgramTransaction2In2OutMainPublicInputs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "publicStateRoot",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicAmountSpl",
            "type": "u8"
          },
          {
            "name": "publicDataHash",
            "type": "u8"
          },
          {
            "name": "publicAmountSol",
            "type": "u8"
          },
          {
            "name": "publicMintPublicKey",
            "type": "u8"
          },
          {
            "name": "publicInUtxoHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicOutUtxoHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicNewAddress",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          },
          {
            "name": "publicInUtxoDataHash",
            "type": {
              "array": [
                "u8",
                2
              ]
            }
          }
        ]
      }
    },
    {
      "name": "instructionDataLightInstructionPublicProgramTransaction2In2OutMainSecond",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "publicStateRoot",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "publicAmountSpl",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "publicDataHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "publicAmountSol",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "publicMintPublicKey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "publicInUtxoHash",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "publicOutUtxoHash",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "publicNewAddress",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                2
              ]
            }
          },
          {
            "name": "publicInUtxoDataHash",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                2
              ]
            }
          }
        ]
      }
    }
  ]
};
