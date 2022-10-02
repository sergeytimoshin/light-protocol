use solana_program::alt_bn128::{
    alt_bn128_addition,
    alt_bn128_pairing,
    alt_bn128_multiplication
};

use crate::errors::Groth16Error;

pub struct Groth16Verifyingkey<'a> {
    pub nr_pubinputs: usize,
    pub vk_alpha_g1: [u8;64],
    pub vk_beta_g2: [u8;128],
    pub vk_gamme_g2: [u8;128],
    pub vk_delta_g2: [u8;128],
    pub vk_ic: &'a [[u8;64]]
}

pub struct Groth16Verifier<'a> {
    proof_a: Vec<u8>,
    proof_b: Vec<u8>,
    proof_c: Vec<u8>,
    public_inputs: Vec<Vec<u8>>,
    prepared_public_inputs: Vec<u8>,
    verifyingkey: &'a Groth16Verifyingkey<'a>
}

impl Groth16Verifier<'_> {

    pub fn new<'a>(
        proof_a: Vec<u8>,
        proof_b: Vec<u8>,
        proof_c: Vec<u8>,
        public_inputs: Vec<Vec<u8>>,
        verifyingkey: &'a Groth16Verifyingkey<'a>
    ) -> Result<Groth16Verifier<'a>,Groth16Error> {

        if proof_a.len() != 64 {
            return Err(Groth16Error::InvalidG1Length);
        }

        if proof_b.len() != 128 {
            return Err(Groth16Error::InvalidG2Length);
        }

        if proof_c.len() != 64 {
            return Err(Groth16Error::InvalidG1Length);
        }

        if public_inputs.len() + 1 != verifyingkey.vk_ic.len() {
            return Err(Groth16Error::InvalidPublicInputsLength);
        }

        Ok(Groth16Verifier {
            proof_a,
            proof_b,
            proof_c,
            public_inputs,
            prepared_public_inputs: Vec::<u8>::new(),
            verifyingkey
        })
    }

    pub fn prepare_inputs(&mut self) -> Result<(),Groth16Error> {

        let mut prepared_public_inputs = self.verifyingkey.vk_ic[0].clone();

        for (i, input) in self.public_inputs.iter().enumerate() {
            let mul_res = alt_bn128_multiplication(&[&self.verifyingkey.vk_ic[i+1][..], &input[..]].concat()).unwrap();
            prepared_public_inputs = alt_bn128_addition(&[&mul_res[..], &prepared_public_inputs[..]].concat()).unwrap().try_into().unwrap();
        }

        self.prepared_public_inputs = prepared_public_inputs.to_vec();
        Ok(())
    }

    pub fn verify(&mut self) -> Result<bool, Groth16Error> {
        self.prepare_inputs()?;
        let pairing_input = [
            self.proof_a.to_vec(),
            self.proof_b.to_vec(),
            self.prepared_public_inputs.to_vec(),
            self.verifyingkey.vk_gamme_g2.to_vec(),
            self.proof_c.to_vec(),
            self.verifyingkey.vk_delta_g2.to_vec(),
            self.verifyingkey.vk_alpha_g1.to_vec(),
            self.verifyingkey.vk_beta_g2.to_vec(),
        ].concat();

        let pairing_res = alt_bn128_pairing(&pairing_input[..]).unwrap();

        if pairing_res[31] != 1 {
            return Err(Groth16Error::ProofVerificationFailed);
        }
        Ok(true)
    }

}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::groth16::{Groth16Verifyingkey, Groth16Verifier};

    pub const verifyingkey: Groth16Verifyingkey =  Groth16Verifyingkey {
        NR_PUBINPUTS: 10,

    	vk_alpha_g1: [
    	45,77,154,167,227,2,217,223,65,116,157,85,7,148,157,5,219,234,51,251,177,108,100,59,34,245,153,162,190,109,242,226,
    	20,190,221,80,60,55,206,176,97,216,236,96,32,159,227,69,206,137,131,10,25,35,3,1,240,118,202,255,0,77,25,38,
    	],

    	vk_beta_g2: [
    	9,103,3,47,203,247,118,209,175,201,133,248,136,119,241,130,211,132,128,166,83,242,222,202,169,121,76,188,59,243,6,12,
    	14,24,120,71,173,76,121,131,116,208,214,115,43,245,1,132,125,214,139,192,224,113,36,30,2,19,188,127,193,61,183,171,
    	48,76,251,209,224,138,112,74,153,245,232,71,217,63,140,60,170,253,222,196,107,122,13,55,157,166,154,77,17,35,70,167,
    	23,57,193,177,164,87,168,199,49,49,35,210,77,47,145,146,248,150,183,198,62,234,5,169,213,127,6,84,122,208,206,200,
    	],

    	vk_gamme_g2: [
    	25,142,147,147,146,13,72,58,114,96,191,183,49,251,93,37,241,170,73,51,53,169,231,18,151,228,133,183,174,243,18,194,
    	24,0,222,239,18,31,30,118,66,106,0,102,94,92,68,121,103,67,34,212,247,94,218,221,70,222,189,92,217,146,246,237,
    	9,6,137,208,88,95,240,117,236,158,153,173,105,12,51,149,188,75,49,51,112,179,142,243,85,172,218,220,209,34,151,91,
    	18,200,94,165,219,140,109,235,74,171,113,128,141,203,64,143,227,209,231,105,12,67,211,123,76,230,204,1,102,250,125,170,
    	],

    	vk_delta_g2: [
    	25,142,147,147,146,13,72,58,114,96,191,183,49,251,93,37,241,170,73,51,53,169,231,18,151,228,133,183,174,243,18,194,
    	24,0,222,239,18,31,30,118,66,106,0,102,94,92,68,121,103,67,34,212,247,94,218,221,70,222,189,92,217,146,246,237,
    	9,6,137,208,88,95,240,117,236,158,153,173,105,12,51,149,188,75,49,51,112,179,142,243,85,172,218,220,209,34,151,91,
    	18,200,94,165,219,140,109,235,74,171,113,128,141,203,64,143,227,209,231,105,12,67,211,123,76,230,204,1,102,250,125,170,
    	],
        // [[u8;64];10]
    	vk_ic: [
    	[
    	3,183,175,189,219,73,183,28,132,200,83,8,65,22,184,81,82,36,181,186,25,216,234,25,151,2,235,194,13,223,32,145,
    	15,37,113,122,93,59,91,25,236,104,227,238,58,154,67,250,186,91,93,141,18,241,150,59,202,48,179,1,53,207,155,199,
    	],
    	[
    	46,253,85,84,166,240,71,175,111,174,244,62,87,96,235,196,208,85,186,47,163,237,53,204,176,190,62,201,189,216,132,71,
    	6,91,228,97,74,5,0,255,147,113,161,152,238,177,78,81,111,13,142,220,24,133,27,149,66,115,34,87,224,237,44,162,
    	],
    	[
    	29,157,232,254,238,178,82,15,152,205,175,129,90,108,114,60,82,162,37,234,115,69,191,125,212,85,176,176,113,41,23,84,
    	8,229,196,41,191,243,112,105,166,75,113,160,140,34,139,179,53,180,245,195,5,24,42,18,82,60,173,192,67,149,211,250,
    	],
    	[
    	18,4,92,105,55,33,222,133,144,185,99,131,167,143,52,120,44,79,164,63,119,223,199,154,26,86,22,208,50,53,159,65,
    	14,171,53,159,255,133,91,30,162,209,152,18,251,112,105,90,65,234,44,4,42,173,31,230,229,137,177,112,241,142,62,176,
    	],
    	[
    	13,117,56,250,131,38,119,205,221,228,32,185,236,82,102,29,198,53,117,151,19,10,255,211,41,210,72,221,79,107,251,150,
    	35,187,30,32,198,17,220,4,68,10,71,51,31,169,4,174,10,38,227,229,193,129,150,76,94,224,182,13,166,65,175,89,
    	],
    	[
    	21,167,160,214,213,132,208,197,115,195,129,111,129,38,56,52,41,57,72,249,50,187,184,49,240,228,142,147,187,96,96,102,
    	34,163,43,218,199,187,250,245,119,151,237,67,231,70,236,67,157,181,216,174,25,82,120,255,191,89,230,165,179,241,188,218,
    	],
    	[
    	4,136,219,130,55,89,21,224,41,30,53,234,66,160,129,174,154,139,151,33,163,221,150,192,171,102,241,161,48,130,31,175,
    	6,47,176,127,13,8,36,228,239,219,6,158,22,31,22,162,91,196,132,188,156,228,30,1,178,246,197,186,236,249,236,147,
    	],
    	[
    	9,41,120,80,67,24,240,221,136,156,137,182,168,17,176,118,119,72,170,188,227,31,15,22,252,37,198,154,195,163,64,125,
    	37,211,235,67,249,133,45,90,162,9,173,19,80,154,208,173,221,203,206,254,81,197,104,26,177,78,86,210,51,116,60,87,
    	],
    	[
    	3,41,86,208,125,147,53,187,213,220,195,141,216,40,92,137,70,210,168,103,105,236,85,37,165,209,246,75,122,251,75,93,
    	28,108,154,181,15,16,35,88,65,211,8,11,123,84,185,187,184,1,83,141,67,46,241,222,232,135,59,44,152,217,237,106,
    	],
    	[
    	34,98,189,118,119,197,102,193,36,150,200,143,226,60,0,239,21,40,5,156,73,7,247,14,249,157,2,241,181,208,144,0,
    	34,45,86,133,116,53,235,160,107,36,195,125,122,10,206,88,85,166,62,150,65,159,130,7,255,224,227,229,206,138,68,71,
    	],
    	]

    };

    #[test]
    fn it_works() {
        let public_inputs: Vec<u8> = vec![34,238,251,182,234,248,214,189,46,67,42,25,71,58,145,58,61,28,116,110,60,17,82,149,178,187,160,211,37,226,174,231,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,59,154,202,0,17,5,192,204,2,243,79,210,29,182,212,226,240,137,53,73,145,50,226,160,164,78,236,246,92,34,161,201,84,83,101,246,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,15,66,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,20,66,157,100,204,79,6,203,25,53,193,48,66,197,84,169,97,31,70,54,150,204,162,133,78,192,152,90,179,50,27,61,35,225,126,79,110,121,27,239,65,55,42,135,141,226,196,86,76,197,43,108,83,141,218,92,206,197,180,6,35,146,190,217,32,237,108,29,147,0,45,108,178,182,216,135,120,162,105,59,219,237,211,2,150,14,241,15,161,182,178,46,42,230,246,12,31,136,211,135,126,239,49,29,239,109,125,103,216,179,48,173,197,154,212,243,94,253,188,114,83,16,116,158,66,237,98,253];
        let mut publicInputs = Vec::new();
        for input in public_inputs.chunks(32) {
            publicInputs.push(input.to_vec());
        }
        let proof: Vec<u8> = vec![32,81,3,142,46,160,165,147,183,128,61,106,49,182,204,176,237,55,160,156,173,44,137,54,51,179,116,55,108,64,62,211,0,16,68,248,207,185,88,210,7,214,155,69,15,254,237,64,101,106,40,44,28,210,14,180,10,238,244,108,159,7,131,183,30,41,7,90,120,134,3,249,13,230,173,46,54,98,96,130,108,78,152,13,166,145,215,118,148,186,82,129,145,194,209,24,13,151,119,20,241,30,150,215,26,211,45,149,73,211,138,90,44,191,70,100,58,1,35,71,158,163,33,66,211,44,179,36,4,217,46,128,69,35,39,220,36,131,96,225,190,122,27,8,151,241,171,144,75,233,13,0,190,37,25,52,65,90,245,79,13,221,252,140,182,101,208,225,172,188,237,80,101,85,148,218,67,247,20,194,253,56,0,192,230,170,15,58,178,240,105,81,43,133,107,239,178,29,180,149,177,37,6,73,162,30,96,33,96,235,249,198,168,51,204,89,94,184,81,198,175,67,173,93,47,116,232,166,155,67,104,125,214,53,75,190,249,119,138,16,134,81,226,217,118,130,81,166,50,31,255,28,96,124,139,10];
        let mut verifier = Groth16Verifier::new(
            proof[0..64].to_vec(),
            proof[64..192].to_vec(),
            proof[192..256].to_vec(),
            publicInputs,
            verifyingkey
        ).unwrap();
        verifier.verify().unwrap();


    }
}
