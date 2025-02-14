import { t } from "@rbxts/t";
import { Kind, tKind } from "../../kind";
import { KindCommandContext } from "./context";
import { ReadOnlyTokenStream, TokenStream } from "../../token";
import { KindErrors } from "../../messages";

// Kind which represents any string value. Example: "Hello World!"
export class StringKind extends tKind<string> {
	public constructor() {
		super("[string]", t.string);
	}
	public transform(data: string): string {
		return tostring(data);
	}
	public suggestions(): string[] {
		return [];
	}
}

// Kind wich represents any floating point number. Example: 3.1415
export class NumberKind extends tKind<number> {
	public constructor() {
		super("[number]", t.number);
	}
	public transform(data: string) {
		return tonumber(data);
	}
	public suggestions(): string[] {
		return [];
	}
}

// Kind which represents an integer. Example: 255
export class IntegerKind extends tKind<number> {
	public constructor() {
		super("[int]", t.integer);
	}
	public transform(data: string) {
		return tonumber(data)?.idiv(1);
	}
	public suggestions(): string[] {
		return [];
	}
}

// Kind which represents a boolean value. Example: true or off
export class BooleanKind extends tKind<boolean> {
	public constructor() {
		super("[boolean]", t.boolean);
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

// Kind with one possible literal string value. Example: cmds
export class LiteralKind<T extends string> extends tKind<T> {
	public constructor(public readonly literal: T) {
		super(`${literal}`, t.literal(literal));
	}
	public transform(data: string): T | undefined {
		if (this.check(data)) return data;
		return undefined;
	}
	public suggestions(): string[] {
		return [this.literal];
	}
}

// Kind with multiple possible literal string values. Example: True or False
export class LiteralUnionKind<T extends string[]> extends Kind<T[number]> {
	public readonly literal: T;
	public constructor(...literal: T) {
		super(`[${literal.join(" | ")}]`);
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

/**
 * Kind with multiple values split by commas or tokens. Example: "1 2 3" or 1,2,3
 *
 * Value's names are made lowercase automatically.
 *
 * Includes the ability to define macro values.
 * If a value's name is already a macro, it will log a warning and
 * replace the original value's name with that of one with an underscore prefixing it.
 */
export abstract class CSVKind<T extends defined> extends tKind<T[]> {
	public constructor(
		label: string,
		check: t.check<T>,
		public readonly macros: Record<string, (ctx: KindCommandContext) => T[]> = {},
	) {
		super(label, t.array(check));
	}
	public transform<LL extends string[] = string[]>(data: string, ctx: KindCommandContext<LL>): T[] | undefined {
		const tokens = TokenStream.create(data);
		let csvValues: string[] = [];
		const ret: T[] = new Array<T>() as T[];

		while (tokens.inRange()) {
			csvValues.push(tokens.get().lower());
			tokens.next();
		}

		// Reduce down all comma seperated values and space seperated values
		// Allows for behavior such as "1 2 3" and 1,2,3
		csvValues = string.split(csvValues.join(","), ",");

		const values = this.values(ctx, csvValues, tokens);
		const valuesAsNames: Record<string, T> = {};
		const valuesSet = new Set<T>();

		values.forEach((v) => {
			if (valuesSet.has(v.value)) return;
			valuesAsNames[v.name.lower()] = v.value;
			valuesSet.add(v.value);
		});

		for (const [macroName, _] of pairs(this.macros)) {
			if (valuesAsNames[macroName] === undefined) continue;
			ctx.logger.append(
				ctx.warnLevel,
				KindErrors.CSV_KIND_MACRO_COLLISION.format(this.label, macroName, macroName),
			);
			const value = valuesAsNames[macroName];
			delete valuesAsNames[macroName];
			valuesAsNames[`_${macroName}`] = value;
		}

		csvValues.forEach((v) => {
			const value = valuesAsNames[v.lower()];
			if (value !== undefined) {
				if (!ret.includes(value)) ret.push(value);
			}
			const macro = this.macros[v.lower()];
			if (macro === undefined) return;
			macro(ctx as never).forEach((mV) => {
				if (ret.includes(mV)) return;
				ret.push(mV);
			});
		});

		return ret;
	}
	// Value names are made lowercase automatically. You should account for this behavior.
	public abstract values<LL extends string[] = string[]>(
		ctx: KindCommandContext<LL>,
		values: ReadonlyArray<string>,
		token: ReadOnlyTokenStream,
	): { name: string; value: T }[];
}
