/*
	Copied from: https://github.com/iden3/circomlib/pull/60
	Modified to use skypack
*/
const assert = require("assert");

// @ts-ignore
import { Scalar, ZqField, utils } from 'https://cdn.skypack.dev/ffjavascript-browser@0.0.3';
const { unstringifyBigInts } = utils;
const F = new ZqField(Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617"));

const two128 = F.e("340282366920938463463374607431768211456");

export function encrypt(msg, key, nonce) {
	assert(Array.isArray(msg));
	assert(Array.isArray(key));
	assert(key.length === 2);
	msg = msg.map((x) => F.e(x));

	// The nonce must be less than 2 ^ 128
	assert(nonce < two128);

	const message = [...msg];

	// Pad the message if needed
	while (message.length % 3 > 0) {
		message.push(F.zero);
	}

	let cipherLength = message.length;

	// Create the initial state
	let state = [
		F.zero,
		F.e(key[0]),
		F.e(key[1]),
		F.add(
			F.e(nonce),
			F.mul(F.e(msg.length), two128),
		),
	];

	const ciphertext = [];

	for (let i = 0; i < cipherLength / 3; i++) {
		// Iterate Poseidon on the state
		state = poseidonPerm(state);

		// Absorb three elements of message
		state[1] = F.add(state[1], F.e(message[i * 3]));
		state[2] = F.add(state[2], F.e(message[i * 3 + 1]));
		state[3] = F.add(state[3], F.e(message[i * 3 + 2]));

		// Release three elements of the ciphertext
		// @ts-ignore
		ciphertext.push(state[1]);
		// @ts-ignore
		ciphertext.push(state[2]);
		// @ts-ignore
		ciphertext.push(state[3]);
	}

	// Iterate Poseidon on the state one last time
	state = poseidonPerm(state);

	// Release the last ciphertext element
	// @ts-ignore
	ciphertext.push(state[1]);

	return ciphertext;
}

export function decrypt(ciphertext, key, nonce, length) {
	assert(Array.isArray(ciphertext));
	assert(Array.isArray(key));
	assert(key.length === 2);

	// Create the initial state
	let state = [
		F.zero,
		F.e(key[0]),
		F.e(key[1]),
		F.add(
			F.e(nonce),
			F.mul(F.e(length), two128),
		),
	];

	const message = [];

	let n = Math.floor(ciphertext.length / 3);

	for (let i = 0; i < n; i++) {
		// Iterate Poseidon on the state
		state = poseidonPerm(state);

		// Release three elements of the message
		// @ts-ignore
		message.push(F.sub(ciphertext[i * 3], state[1]));
		// @ts-ignore
		message.push(F.sub(ciphertext[i * 3 + 1], state[2]));
		// @ts-ignore
		message.push(F.sub(ciphertext[i * 3 + 2], state[3]));

		// Modify the state
		state[1] = ciphertext[i * 3];
		state[2] = ciphertext[i * 3 + 1];
		state[3] = ciphertext[i * 3 + 2];
	}

	// If length > 3, check if the last (3 - (l mod 3)) elements of the message
	// are 0
	if (length > 3) {
		if (length % 3 === 2) {
			assert(F.eq(message[message.length - 1], F.zero));
		} else if (length % 3 === 1) {
			assert(F.eq(message[message.length - 1], F.zero));
			assert(F.eq(message[message.length - 2], F.zero));
		}
	}

	// Iterate Poseidon on the state one last time
	state = poseidonPerm(state);

	// Check the last ciphertext element
	assert(F.eq(ciphertext[ciphertext.length - 1], state[1]));

	return message.slice(0, length);
}

// Parameters are generated by a reference script https://extgit.iaik.tugraz.at/krypto/hadeshash/-/blob/master/code/generate_parameters_grain.sage
// Used like so: sage generate_parameters_grain.sage 1 0 254 2 8 56 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
const { C, M } = unstringifyBigInts(require("../../util/poseidon_constants.json"));

// Using recommended parameters from whitepaper https://eprint.iacr.org/2019/458.pdf (table 2, table 8)
// Generated by https://extgit.iaik.tugraz.at/krypto/hadeshash/-/blob/master/code/calc_round_numbers.py
// And rounded up to nearest integer that divides by t
const N_ROUNDS_F = 8;
const N_ROUNDS_P = [56, 57, 56, 60, 60, 63, 64, 63];

const pow5 = a => F.mul(a, F.square(F.square(a, a)));

export function poseidonPerm(inputs) {
	assert(inputs.length > 0);
	assert(inputs.length < N_ROUNDS_P.length);

	const t = inputs.length;
	const nRoundsF = N_ROUNDS_F;
	const nRoundsP = N_ROUNDS_P[t - 2];

	let state = inputs.map(a => F.e(a));
	for (let r = 0; r < nRoundsF + nRoundsP; r++) {
		state = state.map((a, i) => F.add(a, C[t - 2][r * t + i]));

		if (r < nRoundsF / 2 || r >= nRoundsF / 2 + nRoundsP) {
			state = state.map(a => pow5(a));
		} else {
			state[0] = pow5(state[0]);
		}

		state = state.map((_, i) =>
			state.reduce((acc, a, j) => F.add(acc, F.mul(M[t - 2][i][j], a)), F.zero)
		);
	}
	return state.map((x) => F.normalize(x));
}
