import { t } from "@rbxts/t";
import { KindCommandContext } from "./context";
import { Players } from "@rbxts/services";
import { ReadOnlyTokenStream, TokenStream } from "../../token";
import { CSVKind, FixedVectorTransformKind } from "./data";
import { tKind } from "../../kind";

/**
 * Kind which represents Players currently in the game. Example: roblox,@s,builderman "sepiaspinda \@a"
 *
 * This Kind has macros for selecting players, which are:
 * * \@s - The player currently executing this command
 * * \@a - All players currently in the game
 * * \@o - All players currently in the game with the exception of the player executing this command.
 */
export class PlayersKind extends CSVKind<Player> {
	constructor() {
		super("[Players...]", t.instanceIsA("Player"), {
			["@s"]: (ctx: KindCommandContext) => [ctx.executor!],
			["@a"]: () => Players.GetPlayers(),
			["@o"]: (ctx: KindCommandContext) =>
				Players.GetPlayers().mapFiltered((p) => (p === ctx.executor ? undefined : p)),
		});
	}
	public values<LL extends string[] = string[]>(
		ctx: KindCommandContext<LL>,
		values: ReadonlyArray<string>,
		token: ReadOnlyTokenStream,
	): { name: string; value: Player }[] {
		return Players.GetPlayers().map((v) => ({ name: v.Name, value: v }));
	}
	public suggestions(): string[] {
		const playerNames: string[] = [];

		Players.GetPlayers().forEach((p) => {
			// See comment in transform method of CSVKind for why this is done
			if (this.macros[p.Name.lower()] !== undefined) {
				playerNames.push(`_${p.Name.lower()}`);
				return;
			}
			playerNames.push(p.Name.lower());
		});

		return [...PlayersKind.suggestMacros(this), ...playerNames];
	}
}

export class Vector3Kind extends FixedVectorTransformKind<Vector3> {
	public macros: Record<string, (ctx: KindCommandContext) => Vector3> = {
		["@zero"]: () => Vector3.zero,
		["@one"]: () => Vector3.one,
		["@yAxis"]: () => Vector3.yAxis,
		["@xAxis"]: () => Vector3.xAxis,
		["@zAxis"]: () => Vector3.zAxis,
	};
	public constructor() {
		super("[Vector3...]", 3, (d) => new Vector3(...d.mapFiltered((v) => tonumber(v) ?? 0)), t.Vector3);
	}
}

export class Vector2Kind extends FixedVectorTransformKind<Vector2> {
	public macros: Record<string, (ctx: KindCommandContext) => Vector2> = {
		["@zero"]: () => Vector2.zero,
		["@one"]: () => Vector2.one,
		["@yAxis"]: () => Vector2.yAxis,
		["@xAxis"]: () => Vector2.xAxis,
	};
	public constructor() {
		super("[Vector2...]", 3, (d) => new Vector2(...d.mapFiltered((v) => tonumber(v) ?? 0)), t.Vector2);
	}
}

export class Color3Kind extends FixedVectorTransformKind<Color3> {
	public macros: Record<string, (ctx: KindCommandContext) => Color3> = {
		["@red"]: () => Color3.fromRGB(255, 0, 0),
		["@green"]: () => Color3.fromRGB(0, 255, 0),
		["@blue"]: () => Color3.fromRGB(0, 0, 255),
	};
	public constructor() {
		super("[Color3...]", 3, (d) => Color3.fromRGB(...d.mapFiltered((v) => tonumber(v) ?? 0)), t.Color3);
	}
}

export class BrickColorKind extends tKind<BrickColor> {
	public constructor() {
		super("[BrickColor]", t.BrickColor);
	}

	public transform<LL extends string[] = string[]>(
		data: string,
		ctx: KindCommandContext<LL>,
	): BrickColor | undefined {
		if (tostring(data) === "random") return BrickColor.random();
		const num = tonumber(data);
		if (num !== undefined && num === num) return new BrickColor(num);
		return new BrickColor(tostring(data) as BrickColorsByNumber[keyof BrickColorsByNumber]);
	}

	public suggestions(): (BrickColorsByNumber[keyof BrickColorsByNumber] | (string & {}))[] {
		return [
			"random",
			"White",
			"Black",
			"Medium red",
			"Bright blue",
			"Dark green",
			"Bright yellow",
			"Dark stone grey",
			"Medium stone grey",
		];
	}
}
