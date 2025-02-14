import { t } from "@rbxts/t";
import { KindCommandContext } from "./context";
import { Players } from "@rbxts/services";
import { ReadOnlyTokenStream } from "../../token";
import { CSVKind } from "./data";

// Kind which represents Players currently in the game. Example: roblox,@s,builderman "sepiaspinda @a"
export class PlayersKind extends CSVKind<Player> {
	constructor() {
		super("[Players]", t.instanceIsA("Player"), {
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
		const macroKeys: string[] = [];
		const playerNames: string[] = [];

		for (const [k, _] of pairs(this.macros)) macroKeys.push(k);
		Players.GetPlayers().forEach((p) => {
			// See comment in transform method of CSVKind for why this is done
			if (this.macros[p.Name.lower()] !== undefined) {
				playerNames.push(`_${p.Name.lower()}`);
				return;
			}
			playerNames.push(p.Name.lower());
		});

		return [...macroKeys, ...playerNames];
	}
}
