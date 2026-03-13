export interface CommandSerializable {
	name: string;
	description: string;
	kind: string;
	extraData: string[];
	children: CommandSerializable[];
	permissionSerialized: string;
	impl: boolean;
}
