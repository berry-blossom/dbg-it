export interface CommandSerializable {
	name: string;
	kind: string;
	branches: CommandSerializable[];
}
