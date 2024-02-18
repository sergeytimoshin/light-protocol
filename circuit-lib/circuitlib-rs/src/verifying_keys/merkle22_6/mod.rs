use groth16_solana::groth16::Groth16Verifyingkey;

pub const VERIFYINGKEY: Groth16Verifyingkey =  Groth16Verifyingkey {
	nr_pubinputs: 13,

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
		7,186,218,255,179,94,66,60,180,13,102,156,167,41,74,196,24,143,126,112,2,169,9,60,255,111,247,101,236,70,43,175,
		22,1,52,107,39,173,58,95,59,30,207,209,249,138,2,111,65,69,171,214,11,236,186,223,249,44,25,83,1,229,99,251,
		37,117,132,25,185,230,85,146,160,236,151,191,39,28,98,18,145,99,193,151,154,171,185,107,174,5,39,4,82,17,120,87,
		12,21,141,68,164,9,42,227,64,0,37,138,151,72,182,111,181,82,247,46,58,109,42,133,6,121,147,216,196,172,159,197,
	],

	vk_ic: &[
		[
			40,192,152,20,124,79,51,91,141,206,169,160,202,59,93,160,37,219,17,45,122,168,124,231,206,190,90,35,38,56,162,9,
			47,152,56,148,118,223,195,115,125,252,249,135,179,112,75,141,154,195,68,164,204,79,114,171,204,140,150,143,101,75,168,203,
		],
		[
			10,176,41,7,172,75,29,165,61,112,127,27,94,238,68,86,53,17,242,125,47,44,202,217,111,189,195,149,44,3,41,248,
			14,232,190,238,142,66,200,30,48,184,240,36,206,93,17,108,94,113,180,233,113,27,171,79,225,209,20,220,66,58,2,136,
		],
		[
			12,120,3,12,128,48,206,188,244,44,0,224,221,51,62,185,69,36,208,251,190,133,241,213,93,139,99,110,8,206,138,97,
			27,174,243,184,229,134,231,251,252,206,237,28,35,183,145,158,65,254,126,35,242,165,165,85,248,58,190,181,32,149,22,19,
		],
		[
			45,49,111,199,29,229,186,230,204,198,83,122,115,216,237,148,149,99,103,25,215,10,149,212,246,185,38,121,149,26,248,86,
			27,204,57,52,92,171,205,138,235,208,8,156,136,65,33,22,243,107,102,247,112,15,181,149,140,248,91,134,110,165,234,130,
		],
		[
			34,6,205,133,94,77,29,89,3,16,157,227,106,236,193,221,67,59,88,251,101,247,150,144,154,106,155,146,242,104,13,33,
			4,107,94,13,3,95,201,73,0,182,142,198,85,151,48,221,195,66,208,127,161,9,29,49,116,131,93,43,162,1,111,169,
		],
		[
			4,245,35,244,67,123,5,137,21,172,124,98,155,137,85,219,254,123,16,93,94,51,39,36,174,161,146,160,146,230,105,198,
			18,217,143,62,144,210,28,197,23,51,71,171,151,109,99,240,153,110,25,4,211,73,169,227,97,163,159,190,162,0,15,228,
		],
		[
			6,139,201,103,174,239,46,224,203,245,180,21,209,175,114,65,207,215,197,208,180,164,214,46,121,207,219,84,43,85,99,133,
			43,206,233,90,54,114,21,234,71,22,124,147,214,146,20,108,42,210,148,149,52,30,117,149,153,86,246,86,149,224,211,128,
		],
		[
			24,231,145,200,215,139,226,30,142,166,180,172,29,9,214,225,19,134,237,123,123,206,4,244,192,135,73,185,226,19,150,112,
			14,82,115,104,255,240,52,150,212,38,2,135,125,232,236,106,105,114,221,231,73,224,193,63,235,153,199,164,74,23,39,244,
		],
		[
			41,237,1,245,209,213,175,185,147,212,130,187,230,246,7,62,180,217,150,87,136,230,244,164,125,62,127,110,180,231,244,150,
			35,66,125,81,29,14,46,166,234,236,253,137,106,123,152,143,94,165,35,234,14,105,78,9,168,114,220,226,162,212,229,156,
		],
		[
			7,112,34,86,151,87,235,21,103,194,238,58,121,233,83,76,191,36,32,41,20,248,200,66,206,126,100,46,216,184,224,225,
			41,187,88,144,159,91,233,231,199,133,155,190,219,117,245,136,158,144,52,129,95,224,176,63,31,86,193,119,212,90,91,24,
		],
		[
			36,82,124,238,24,64,109,194,138,226,3,181,122,21,164,242,121,234,126,223,61,90,123,157,56,16,2,222,37,177,250,11,
			24,68,98,35,199,225,102,110,251,20,48,91,203,128,245,176,176,41,224,150,224,74,194,195,236,62,70,113,242,36,252,12,
		],
		[
			35,127,89,172,15,226,53,236,136,184,211,55,153,151,163,110,149,7,62,18,173,42,92,230,149,122,129,233,204,219,223,150,
			7,123,76,228,58,4,228,140,37,162,208,85,67,117,104,20,54,50,124,89,156,142,144,170,214,176,63,227,120,27,120,113,
		],
		[
			27,81,26,126,136,215,66,13,107,44,16,199,94,97,115,80,64,242,36,82,202,118,202,200,156,82,0,192,49,231,148,84,
			9,252,162,181,225,52,170,122,112,113,226,106,149,160,15,125,53,13,91,125,213,164,204,64,59,152,152,27,115,234,221,39,
		],
	]
};