import { t } from "@rbxts/t";
import { Kind, tKind } from "../kind";

export class StringKind extends tKind<string> {
	public constructor() {
		super("string", t.string);
	}
	public transform(data: string): string {
		return tostring(data);
	}
	public suggestions(): string[] {
		return [];
	}
}

export class NumberKind extends tKind<number> {
	public constructor() {
		super("number", t.number);
	}
	public transform(data: string) {
		return tonumber(data);
	}
	public suggestions(): string[] {
		return [];
	}
}

export class BooleanKind extends tKind<boolean> {
	public constructor() {
		super("boolean", t.boolean);
	}
	public transform(data: string) {
		let retrn: boolean | undefined = undefined;
		switch (data) {
			case "1":
			case "on":
			case "true":
				retrn = true;
				break;
			case "0":
			case "off":
			case "false":
				retrn = false;
				break;
			default:
				break;
		}
		return retrn;
	}
	public suggestions(): string[] {
		return ["1", "on", "true", "0", "off", "false"];
	}
}

export class LiteralKind<T extends string> extends tKind<T> {
	public constructor(public readonly literal: T) {
		super(`"${literal}"`, t.literal(literal));
	}
	public transform(data: string): T | undefined {
		if (this.check(data)) return data;
		return undefined;
	}
	public suggestions(): string[] {
		return [this.literal];
	}
}

export class LiteralUnionKind<T extends string[]> extends Kind<T[number]> {
	public readonly literal: T;
	public constructor(...literal: T) {
		super(`[${literal.mapFiltered((v) => `"${v}"`).join(" | ")}]`);
		this.literal = literal;
	}
	public transform(data: string): T[number] | undefined {
		return this.verify(data) ? data : undefined;
	}
	public verify(data: unknown): data is T[number] {
		return this.literal.indexOf(tostring(data)) >= 0;
	}
	public suggestions(): string[] {
		return [...this.literal];
	}
}
