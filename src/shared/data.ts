export interface CommandSerializable {
	name: string;
	kind: string;
	extraData: string[];
	children: CommandSerializable[];
	permissionSerialized: string;
	impl: boolean;
}
