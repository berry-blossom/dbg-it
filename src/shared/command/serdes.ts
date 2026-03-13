import { BufferBuilder } from "@rbxts/berry-buffer";
import { CommandSerializable } from "../data";
import { Kind } from "../kind";

// To add more serialized data, you must update the
// commandSerDesSteps variable with the steps you added (dont forget the explicit type).
// Please only add steps starting from the end of the array.

export const commandSerDesSteps: ["string", "array", "array", "string", "boolean", "string", "string"] = [
	"string",
	"array",
	"array",
	"string",
	"boolean",
	"string",
	"string",
];

export const SerializedArgLabelToKind = new Map<string, Kind<defined> | undefined>();

export function serializeCommand(serializable: CommandSerializable): buffer {
	const [buf, _steps]: [buffer, typeof commandSerDesSteps] = BufferBuilder.create()
		.string(serializable.kind)
		.array(serializable.extraData)
		.array(serializable.children.map((v) => BufferBuilder.display(serializeCommand(v))))
		.string(serializable.permissionSerialized)
		.boolean(serializable.impl)
		.string(serializable.name)
		.string(serializable.description)
		.build();
	return buf;
}

export function deserializeCommand(buf: buffer): CommandSerializable {
	const [kind, extraData, serChildren, permissionSerialized, impl, name, description] = BufferBuilder.steps(
		buf,
		commandSerDesSteps,
	);
	return {
		name,
		kind,
		extraData,
		children: serChildren.map((v) => deserializeCommand(buffer.fromstring(v))),
		permissionSerialized,
		impl,
		description,
	};
}
