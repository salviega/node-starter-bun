export interface GenerateZkProofParams {
	[key: string]: string | string[] | number | number[]
	_proposalId: string
	_secret: string
	_voter: string
	_weight: string
	_choice: number
	_snapshot_merkle_tree: string
	_leaf: string
	_index: string
	_path: string[]
	_pub_key_x: number[]
	_pub_key_y: number[]
	_signature: number[]
	_hashed_message: number[]
}
