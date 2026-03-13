// {a:1,b:2} -> ["a","b"]
export function strictReverseKeys<T extends string[]>(...strings: T): Record<T[number], number> {
	const result: Record<string, number> = {};
	strings.forEach((v, k) => {
		result[v as string] = k;
	});
	return result as never;
}

// Generic any enum value
export type someEnum = {
	[name: symbol]: number;
	[idx: number]: string;
};

// enum {a,b} -> ["a", "b"]
export function getEnumKeys<T extends someEnum>(enumeration: T): (keyof T)[] {
	const enumKeys: (keyof T)[] = [];
	// eslint-disable-next-line roblox-ts/no-array-pairs
	for (const [k, _] of pairs(enumeration)) {
		// Enums have weird metatables, if the enum has a value which is a number (it should)
		// rawget(enumeration, k) here will always be undefined
		// We need to use rawget since if we directly index a number it will return the name of the value
		// at that number
		if (rawget(enumeration, k) === undefined) continue;
		enumKeys.push(k as never as keyof T);
	}
	return enumKeys;
}
