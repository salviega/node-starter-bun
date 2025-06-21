import { UltraHonkBackend } from '@aztec/bb.js'
import initACVM from '@noir-lang/acvm_js'
import { Noir } from '@noir-lang/noir_js'
import initNoirC from '@noir-lang/noirc_abi'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { poseidon2, poseidon3 } from 'poseidon-lite'
import { fileURLToPath } from 'url'

import circuit from '@/assets/circuits/zkDAO_circuit.json'
import type { GenerateZkProofParams } from '@/models/generate-proof-params.model'
import { toFieldElement } from '@/utils/to-field-element'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function loadCircuit() {
	try {
		return circuit
	} catch (error) {
		console.log('⚠️ Direct import failed, loading from file...')
		try {
			const circuitPath = join(
				__dirname,
				'assets',
				'circuits',
				'zkDAO_circuit.json'
			)
			const circuitData = readFileSync(circuitPath, 'utf8')
			return JSON.parse(circuitData)
		} catch (fileError) {
			console.error('❌ Could not load circuit:', (fileError as Error).message)
			throw fileError
		}
	}
}

export async function generateZKProof(
	zkProofParams: GenerateZkProofParams
): Promise<{
	proofBytes: string
	publicInputs: string[]
	proof: Uint8Array<ArrayBufferLike>
}> {
	try {
		try {
			await initACVM()
			await initNoirC()
			console.log('✅ WASM initialized')
		} catch (wasmError) {
			console.log('⚠️ WASM error, continuing...')
		}

		const circuitData = await loadCircuit()
		const noir = new Noir(circuitData)
		const backend = new UltraHonkBackend(circuitData.bytecode)

		const secret = BigInt(toFieldElement(zkProofParams._secret))
		const weight = BigInt(zkProofParams._weight)
		const choice = BigInt(zkProofParams._choice)
		const voter = BigInt(toFieldElement(zkProofParams._voter))

		const calculatedNullifier = poseidon2([secret, weight])
		const calculatedLeaf = poseidon3([voter, weight, calculatedNullifier])

		const finalInpunts = {
			_proposalId: toFieldElement(zkProofParams._proposalId),
			_secret: secret.toString(),
			_voter: voter.toString(),
			_weight: weight.toString(),
			_choice: choice.toString(),
			_snapshot_merkle_tree: toFieldElement(
				zkProofParams._snapshot_merkle_tree
			),
			_leaf: calculatedLeaf.toString(),
			_index: zkProofParams._index.toString(),
			_path: zkProofParams._path.map(p => toFieldElement(p)),
			_pub_key_x: zkProofParams._pub_key_x,
			_pub_key_y: zkProofParams._pub_key_y,
			_signature: zkProofParams._signature,
			_hashed_message: zkProofParams._hashed_message
		}

		const { witness } = await noir.execute(finalInpunts)
		const proof = await backend.generateProof(witness, { keccak: true })
		const isValid = await backend.verifyProof(proof, { keccak: true })

		if (!isValid) {
			throw new Error('Generated proof is invalid')
		}

		const proofArray = Array.from(Object.values(proof.proof)) as number[]
		const proofBytes =
			'0x' + proofArray.map(n => n.toString(16).padStart(2, '0')).join('')

		return {
			proofBytes,
			publicInputs: proof.publicInputs,
			proof: proof.proof
		}
	} catch (error) {
		console.error('❌ Error generating ZK proof:', error)
		throw error
	}
}
